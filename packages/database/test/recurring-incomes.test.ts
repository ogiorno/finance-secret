import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository, type NewRecurringIncome } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Recurring income ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const account = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 10000 });
    const category = repo.createCategory({ name: "Repasse", type: "income" });
    const wife = repo.createIncomeSource({ name: "Esposa" });
    const input: NewRecurringIncome = {
      name: "Repasse mensal",
      amountCents: 300000,
      frequency: "monthly",
      dueDay: 5,
      sourceId: wife.id,
      categoryId: category.id,
      defaultAccountId: account.id,
      startPeriod: "2026-01",
    };
    return { account, category, wife, input };
  }

  it("registers a recurring income without creating any transaction or touching balances", () => {
    const { account, input } = setup();
    const created = repo.createRecurringIncome(input);

    expect(repo.listRecurringIncomes({ asOfPeriod: "2026-03" })).toEqual([
      expect.objectContaining({ id: created.id, name: "Repasse mensal", amountCents: 300000, isActive: true }),
    ]);
    expect(repo.listTransactions()).toEqual([]);
    expect(repo.getBalance(account.id)).toBe(10000);
  });

  it("uses the default source and Sem categoria when none is chosen", () => {
    const { input } = setup();
    const created = repo.createRecurringIncome({ ...input, sourceId: undefined, categoryId: undefined });

    const [listed] = repo.listRecurringIncomes({ asOfPeriod: "2026-03" });
    expect(listed).toMatchObject({ id: created.id });
    expect(repo.listIncomeSources().find((source) => source.id === listed?.sourceId)?.name).toBe("Eu");
    expect(repo.listCategories().find((category) => category.id === listed?.categoryId)).toMatchObject({ name: "Sem categoria", type: "income" });
  });

  it("validates name, amount, due day, yearly month and category type", () => {
    const { input } = setup();
    const expense = repo.createCategory({ name: "Mercado", type: "expense" });

    expect(() => repo.createRecurringIncome({ ...input, name: " " })).toThrow(/nome/i);
    expect(() => repo.createRecurringIncome({ ...input, amountCents: 0 })).toThrow(/valor/i);
    expect(() => repo.createRecurringIncome({ ...input, dueDay: 32 })).toThrow(/dia/i);
    expect(() => repo.createRecurringIncome({ ...input, frequency: "yearly" })).toThrow(/mês/i);
    expect(() => repo.createRecurringIncome({ ...input, categoryId: expense.id })).toThrow(/receita/i);
  });

  it("edits, archives and deletes (only without receipts)", () => {
    const { account, input } = setup();
    const { id } = repo.createRecurringIncome(input);

    repo.updateRecurringIncome(id, { name: "Repasse da esposa", dueDay: 8 });
    expect(repo.listRecurringIncomes({ asOfPeriod: "2026-03" })[0]).toMatchObject({ name: "Repasse da esposa", dueDay: 8 });

    repo.setRecurringIncomeActive(id, false);
    expect(repo.listRecurringIncomes({ asOfPeriod: "2026-03" })).toEqual([]);
    repo.setRecurringIncomeActive(id, true);

    repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-08" });
    expect(() => repo.deleteRecurringIncome(id)).toThrow(/arquive/i);

    const other = repo.createRecurringIncome({ ...input, name: "Outra" });
    repo.deleteRecurringIncome(other.id);
    expect(repo.listRecurringIncomes({ asOfPeriod: "2026-03", includeArchived: true })).toHaveLength(1);
  });

  it("lists the month's occurrences as to receive, overdue or received", () => {
    const { account, input } = setup();
    const { id } = repo.createRecurringIncome(input);

    expect(repo.listIncomeOccurrences("2026-03", "2026-03-01")[0]).toMatchObject({ status: "pending", dueDate: "2026-03-05", expectedAmountCents: 300000 });
    expect(repo.listIncomeOccurrences("2026-03", "2026-03-06")[0]?.status).toBe("overdue");

    repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-06" });
    expect(repo.listIncomeOccurrences("2026-03", "2026-03-10")[0]).toMatchObject({ status: "paid", paidAmountCents: 300000 });
  });

  it("only lists a yearly income in its due month and not before it started", () => {
    const { input } = setup();
    repo.createRecurringIncome({ ...input, name: "13º", frequency: "yearly", dueMonth: 12, dueDay: 20, startPeriod: "2026-03" });

    expect(repo.listIncomeOccurrences("2026-12", "2026-12-01").map((o) => o.name)).toEqual(["13º"]);
    expect(repo.listIncomeOccurrences("2026-11", "2026-11-01")).toEqual([]);
    expect(repo.listIncomeOccurrences("2025-12", "2025-12-01")).toEqual([]);
  });

  it("receiving creates a posted income with the right source, category and account", () => {
    const { account, category, wife, input } = setup();
    const { id } = repo.createRecurringIncome(input);

    const received = repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-04" });

    expect(repo.getTransaction(received.id)).toMatchObject({
      type: "income",
      status: "posted",
      amountCents: 300000,
      categoryId: category.id,
      sourceId: wife.id,
      sourceName: "Esposa",
      description: "Repasse mensal",
      accountId: account.id,
    });
    expect(repo.getBalance(account.id)).toBe(310000);
    expect(repo.getMonthSummary("2026-03").incomeCents).toBe(300000);
  });

  it("accepts a real amount different from the expected one", () => {
    const { account, input } = setup();
    const { id } = repo.createRecurringIncome(input);

    repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, amountCents: 285000, date: "2026-03-04" });

    expect(repo.listIncomeOccurrences("2026-03", "2026-03-10")[0]).toMatchObject({ expectedAmountCents: 300000, paidAmountCents: 285000 });
  });

  it("refuses to receive the same month twice, an archived account or a month it does not fall in", () => {
    const { account, input } = setup();
    const { id } = repo.createRecurringIncome(input);
    const yearly = repo.createRecurringIncome({ ...input, name: "13º", frequency: "yearly", dueMonth: 12 });
    const old = repo.createAccount({ name: "Antiga", type: "checking" });
    repo.setAccountActive(old.id, false);
    repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-04" });

    expect(() => repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-05" })).toThrow(/já foi recebida/i);
    expect(() => repo.receiveIncome({ incomeId: id, period: "2026-04", accountId: old.id, date: "2026-04-05" })).toThrow(/arquivada/i);
    expect(() => repo.receiveIncome({ incomeId: yearly.id, period: "2026-03", accountId: account.id, date: "2026-03-05" })).toThrow(/não vence|não cai/i);
    expect(repo.listTransactions({ month: "2026-03" })).toHaveLength(1);
  });

  it("unreceiving deletes the transaction; deleting it elsewhere also brings the income back to pending", () => {
    const { account, input } = setup();
    const { id } = repo.createRecurringIncome(input);
    const first = repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-04" });

    repo.unreceiveIncome(id, "2026-03");
    expect(repo.listTransactions()).toEqual([]);
    expect(repo.listIncomeOccurrences("2026-03", "2026-03-01")[0]?.status).toBe("pending");
    expect(() => repo.unreceiveIncome(id, "2026-03")).toThrow(/não foi recebida/i);

    const second = repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-04" });
    repo.deleteTransaction(second.id);
    expect(repo.listIncomeOccurrences("2026-03", "2026-03-01")[0]?.status).toBe("pending");
    expect(second.id).not.toBe(first.id);
  });

  it("changes the expected amount from a month on, never touching a month already received", () => {
    const { account, input } = setup();
    const { id } = repo.createRecurringIncome(input);
    const received = repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-04" });

    repo.setRecurringIncomeAmount(id, { amountCents: 320000, fromPeriod: "2026-01" });

    expect(repo.listIncomeOccurrences("2026-03", "2026-12-31")[0]).toMatchObject({ status: "paid", paidAmountCents: 300000 });
    expect(repo.getTransaction(received.id).amountCents).toBe(300000);
    expect(repo.listIncomeOccurrences("2026-04", "2026-12-31")[0]?.expectedAmountCents).toBe(320000);
    expect(() => repo.setRecurringIncomeAmount(id, { amountCents: 0, fromPeriod: "2026-04" })).toThrow(/valor/i);
  });

  it("totals what is expected, received and still to receive in the month", () => {
    const { account, input } = setup();
    const { id } = repo.createRecurringIncome(input);
    repo.createRecurringIncome({ ...input, name: "Aluguel de sala", amountCents: 80000, dueDay: 20 });
    repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, amountCents: 290000, date: "2026-03-05" });

    expect(repo.getIncomeExpectations("2026-03", "2026-03-10")).toEqual({ expectedCents: 380000, receivedCents: 290000, remainingCents: 80000 });
  });

  it("hides an archived income, keeping the months it was received", () => {
    const { account, input } = setup();
    const { id } = repo.createRecurringIncome(input);
    repo.receiveIncome({ incomeId: id, period: "2026-03", accountId: account.id, date: "2026-03-04" });
    repo.setRecurringIncomeActive(id, false);

    expect(repo.listIncomeOccurrences("2026-03", "2026-03-10").map((o) => o.status)).toEqual(["paid"]);
    expect(repo.listIncomeOccurrences("2026-04", "2026-04-10")).toEqual([]);
  });

  it("does not let a source with recurring incomes be deleted", () => {
    const { wife, input } = setup();
    repo.createRecurringIncome(input);

    expect(() => repo.deleteIncomeSource(wife.id)).toThrow(/arquive/i);
  });
});

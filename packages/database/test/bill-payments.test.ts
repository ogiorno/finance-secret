import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository, type NewRecurringBill } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Paying and unpaying bills ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  const rent: NewRecurringBill = {
    name: "Aluguel",
    amountCents: 180000,
    frequency: "monthly",
    dueDay: 5,
    classification: "fixed",
    startPeriod: "2026-01",
  };

  function setup() {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 500000 });
    const housing = repo.createCategory({ name: "Moradia", type: "expense" });
    const bill = repo.createRecurringBill({ ...rent, categoryId: housing.id });
    return { checking, housing, bill };
  }

  it("creates a posted expense linked to that month's occurrence", () => {
    const { checking, housing, bill } = setup();

    const paid = repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-04" });

    expect(repo.getTransaction(paid.id)).toMatchObject({
      type: "expense",
      status: "posted",
      amountCents: 180000,
      categoryId: housing.id,
      description: "Aluguel",
      date: "2026-03-04",
      accountId: checking.id,
    });
    expect(repo.listBillOccurrences("2026-03", "2026-03-10")[0]).toMatchObject({ status: "paid", paidTransactionId: paid.id, paidAmountCents: 180000 });
  });

  it("changes the balance and the month expenses only after paying", () => {
    const { checking, bill } = setup();
    expect(repo.getBalance(checking.id)).toBe(500000);
    expect(repo.getMonthSummary("2026-03").expenseCents).toBe(0);

    repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-04" });

    expect(repo.getBalance(checking.id)).toBe(320000);
    expect(repo.getMonthSummary("2026-03").expenseCents).toBe(180000);
  });

  it("accepts a real amount different from the expected one without changing the expected", () => {
    const { checking, bill } = setup();

    repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, amountCents: 195050, date: "2026-03-04" });

    expect(repo.listBillOccurrences("2026-03", "2026-03-10")[0]).toMatchObject({ expectedAmountCents: 180000, paidAmountCents: 195050 });
    expect(repo.listBillOccurrences("2026-04", "2026-04-01")[0]?.expectedAmountCents).toBe(180000);
  });

  it("refuses to pay the same month twice", () => {
    const { checking, bill } = setup();
    repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-04" });

    expect(() => repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-05" })).toThrow(/já foi paga/i);
    expect(repo.listTransactions({ month: "2026-03" })).toHaveLength(1);
  });

  it("lets the next month be paid independently", () => {
    const { checking, bill } = setup();
    repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-04" });

    repo.payBill({ billId: bill.id, period: "2026-04", accountId: checking.id, date: "2026-04-04" });

    expect(repo.listTransactions()).toHaveLength(2);
  });

  it("makes a credit card pay increase its debt", () => {
    const { bill } = setup();
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });

    const paid = repo.payBill({ billId: bill.id, period: "2026-03", accountId: card.id, date: "2026-03-04" });

    expect(repo.getBalance(card.id)).toBe(-180000);
    expect(repo.getTransaction(paid.id).paymentMethod).toBe("credit");
  });

  it("refuses an archived account, an invalid amount and a month the bill does not fall in", () => {
    const { checking, bill } = setup();
    const old = repo.createAccount({ name: "Antiga", type: "checking" });
    repo.setAccountActive(old.id, false);
    const yearly = repo.createRecurringBill({ ...rent, name: "IPTU", frequency: "yearly", dueMonth: 3 });

    expect(() => repo.payBill({ billId: bill.id, period: "2026-03", accountId: old.id, date: "2026-03-04" })).toThrow(/arquivada/i);
    expect(() => repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, amountCents: 0, date: "2026-03-04" })).toThrow(/valor/i);
    expect(() => repo.payBill({ billId: yearly.id, period: "2026-04", accountId: checking.id, date: "2026-04-04" })).toThrow(/não vence/i);
    expect(repo.listTransactions()).toEqual([]);
  });

  it("leaves nothing behind when paying fails", () => {
    const { bill } = setup();

    expect(() => repo.payBill({ billId: bill.id, period: "2026-03", accountId: 999, date: "2026-03-04" })).toThrow();

    expect(repo.listTransactions()).toEqual([]);
    expect(repo.listBillOccurrences("2026-03", "2026-03-10")[0]?.status).not.toBe("paid");
  });

  it("unpaying deletes the linked transaction and returns the bill to pending", () => {
    const { checking, bill } = setup();
    const paid = repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-04" });

    repo.unpayBill(bill.id, "2026-03");

    expect(repo.listTransactions()).toEqual([]);
    expect(repo.getBalance(checking.id)).toBe(500000);
    expect(repo.listBillOccurrences("2026-03", "2026-03-01")[0]).toMatchObject({ status: "pending", paidTransactionId: null });
    expect(() => repo.getTransaction(paid.id)).toThrow();
  });

  it("returns the bill to pending when the transaction is deleted somewhere else", () => {
    const { checking, bill } = setup();
    const paid = repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-04" });

    repo.deleteTransaction(paid.id);

    expect(repo.listBillOccurrences("2026-03", "2026-03-01")[0]?.status).toBe("pending");
    expect(repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-06" }).id).not.toBe(paid.id);
  });

  it("refuses to unpay a month that was never paid", () => {
    const { bill } = setup();

    expect(() => repo.unpayBill(bill.id, "2026-03")).toThrow(/não foi paga/i);
  });
});

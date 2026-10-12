import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Recurring bills registry ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  const rent = {
    name: "Aluguel",
    amountCents: 180000,
    frequency: "monthly",
    dueDay: 5,
    classification: "fixed",
    startPeriod: "2026-03",
  } as const;

  it("creates a bill and lists it with its expected amount", () => {
    const created = repo.createRecurringBill(rent);

    expect(repo.listRecurringBills({ asOfPeriod: "2026-03" })).toEqual([
      expect.objectContaining({ id: created.id, name: "Aluguel", amountCents: 180000, frequency: "monthly", dueDay: 5, classification: "fixed", isActive: true }),
    ]);
  });

  it("puts a bill without a category in Sem categoria", () => {
    repo.createRecurringBill(rent);
    const [bill] = repo.listRecurringBills({ asOfPeriod: "2026-03" });

    expect(repo.listCategories().find((category) => category.id === bill?.categoryId)?.name).toBe("Sem categoria");
  });

  it("keeps the category and the default account the user chose", () => {
    const housing = repo.createCategory({ name: "Moradia", type: "expense" });
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    repo.createRecurringBill({ ...rent, categoryId: housing.id, defaultAccountId: account.id });
    const [bill] = repo.listRecurringBills({ asOfPeriod: "2026-03" });

    expect(bill).toMatchObject({ categoryId: housing.id, defaultAccountId: account.id });
  });

  it("requires the due month on a yearly bill", () => {
    expect(() => repo.createRecurringBill({ ...rent, frequency: "yearly" })).toThrow(/mês/i);
    expect(repo.createRecurringBill({ ...rent, name: "IPTU", frequency: "yearly", dueMonth: 2 })).toMatchObject({ dueMonth: 2 });
  });

  it.each([0, 32, 1.5])("rejects due day %s", (dueDay) => {
    expect(() => repo.createRecurringBill({ ...rent, dueDay })).toThrow(/dia/i);
  });

  it.each([0, -1, 12.5])("rejects amount %s", (amountCents) => {
    expect(() => repo.createRecurringBill({ ...rent, amountCents })).toThrow(/valor/i);
  });

  it("rejects an empty name and an income category", () => {
    const salary = repo.createCategory({ name: "Salário", type: "income" });

    expect(() => repo.createRecurringBill({ ...rent, name: "  " })).toThrow(/nome/i);
    expect(() => repo.createRecurringBill({ ...rent, categoryId: salary.id })).toThrow(/despesa/i);
  });

  it("edits the schedule, the category and the classification", () => {
    const leisure = repo.createCategory({ name: "Lazer", type: "expense" });
    const { id } = repo.createRecurringBill(rent);

    repo.updateRecurringBill(id, { name: "Aluguel do apê", dueDay: 10, classification: "discretionary", categoryId: leisure.id });

    expect(repo.listRecurringBills({ asOfPeriod: "2026-03" })[0]).toMatchObject({
      name: "Aluguel do apê",
      dueDay: 10,
      classification: "discretionary",
      categoryId: leisure.id,
    });
  });

  it("archives and reactivates keeping the history", () => {
    const { id } = repo.createRecurringBill(rent);

    repo.setRecurringBillActive(id, false);
    expect(repo.listRecurringBills({ asOfPeriod: "2026-03" })).toEqual([]);
    expect(repo.listRecurringBills({ asOfPeriod: "2026-03", includeArchived: true })[0]).toMatchObject({ isActive: false });

    repo.setRecurringBillActive(id, true);
    expect(repo.listRecurringBills({ asOfPeriod: "2026-03" })).toHaveLength(1);
  });

  it("deletes a bill that never had a payment", () => {
    const { id } = repo.createRecurringBill(rent);

    repo.deleteRecurringBill(id);

    expect(repo.listRecurringBills({ asOfPeriod: "2026-03", includeArchived: true })).toEqual([]);
  });

  it("refuses to delete a bill that has payments, suggesting to archive", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const { id } = repo.createRecurringBill(rent);
    repo.payBill({ billId: id, period: "2026-03", accountId: account.id, date: "2026-03-05" });

    expect(() => repo.deleteRecurringBill(id)).toThrow(/arquive/i);
  });

  it("does not create any transaction or change any balance", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 50000 });
    repo.createRecurringBill(rent);

    expect(repo.listTransactions()).toEqual([]);
    expect(repo.getBalance(account.id)).toBe(50000);
  });

  it("fails clearly for a bill that does not exist", () => {
    expect(() => repo.updateRecurringBill(999, { name: "X" })).toThrow(/não encontrada/i);
    expect(() => repo.setRecurringBillActive(999, false)).toThrow(/não encontrada/i);
    expect(() => repo.deleteRecurringBill(999)).toThrow(/não encontrada/i);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Extra expenses ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    const health = repo.createCategory({ name: "Saúde", type: "expense" });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    return { checking, health, salary };
  }

  it("marks an expense as extra without changing its category", () => {
    const { checking, health } = setup();
    const saved = repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 18000, date: "2026-03-10", isExtra: true });

    const item = repo.getTransaction(saved.id);
    expect(item.isExtra).toBe(true);
    expect(item.categoryName).toBe("Saúde");
  });

  it("is not extra by default", () => {
    const { checking, health } = setup();
    const saved = repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 100, date: "2026-03-10" });

    expect(repo.getTransaction(saved.id).isExtra).toBe(false);
  });

  it("refuses to mark income as extra", () => {
    const { checking, salary } = setup();

    expect(() =>
      repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-10", isExtra: true }),
    ).toThrow(/extra/i);
  });

  it("can toggle an existing expense", () => {
    const { checking, health } = setup();
    const saved = repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 100, date: "2026-03-10" });

    repo.updateTransaction(saved.id, { accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 100, date: "2026-03-10", isExtra: true });

    expect(repo.getTransaction(saved.id).isExtra).toBe(true);
  });

  it("totals the extras of the month: only posted, only expenses, only active accounts", () => {
    const { checking, health } = setup();
    const old = repo.createAccount({ name: "Antiga", type: "checking" });
    const spend = (accountId: number, cents: number, date: string, extra: boolean, status?: "pending") =>
      repo.addTransaction({ accountId, categoryId: health.id, type: "expense", amountCents: cents, date, isExtra: extra, status });
    spend(checking.id, 18000, "2026-03-10", true);
    spend(checking.id, 7000, "2026-03-12", true);
    spend(checking.id, 99999, "2026-03-13", false);
    spend(checking.id, 5000, "2026-03-14", true, "pending");
    spend(checking.id, 3000, "2026-04-02", true);
    spend(old.id, 40000, "2026-03-15", true);
    repo.setAccountActive(old.id, false);

    expect(repo.getMonthExtras("2026-03")).toBe(25000);
    expect(repo.getMonthExtras("2026-05")).toBe(0);
  });

  it("filters the list by extra", () => {
    const { checking, health } = setup();
    repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 100, date: "2026-03-10", isExtra: true });
    repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 200, date: "2026-03-10" });

    expect(repo.listTransactions({ onlyExtra: true }).map((item) => item.amountCents)).toEqual([100]);
  });

  it("never marks transfers as extra", () => {
    const a = repo.createAccount({ name: "A", type: "checking" });
    const b = repo.createAccount({ name: "B", type: "checking" });
    repo.addTransfer({ fromAccountId: a.id, toAccountId: b.id, amountCents: 100, date: "2026-03-10" });

    expect(repo.listTransactions().every((item) => item.isExtra === false)).toBe(true);
  });
});

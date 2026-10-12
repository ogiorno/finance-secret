import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Month totals only count active accounts ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const kept = repo.createAccount({ name: "Conta", type: "checking" });
    const old = repo.createAccount({ name: "Conta antiga", type: "checking" });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    const market = repo.createCategory({ name: "Mercado", type: "expense" });
    repo.addTransaction({ accountId: kept.id, categoryId: salary.id, type: "income", amountCents: 100000, date: "2026-03-05" });
    repo.addTransaction({ accountId: kept.id, categoryId: market.id, type: "expense", amountCents: 20000, date: "2026-03-06" });
    repo.addTransaction({ accountId: old.id, categoryId: salary.id, type: "income", amountCents: 50000, date: "2026-03-07" });
    repo.addTransaction({ accountId: old.id, categoryId: market.id, type: "expense", amountCents: 7000, date: "2026-03-08" });
    return { kept, old };
  }

  it("drops an archived account from income, expenses and result", () => {
    const { old } = setup();
    expect(repo.getMonthSummary("2026-03")).toEqual({ incomeCents: 150000, expenseCents: 27000, resultCents: 123000 });

    repo.setAccountActive(old.id, false);

    expect(repo.getMonthSummary("2026-03")).toEqual({ incomeCents: 100000, expenseCents: 20000, resultCents: 80000 });
  });

  it("drops an archived account from the spending by category", () => {
    const { old } = setup();
    repo.setAccountActive(old.id, false);

    expect(repo.getExpensesByCategory("2026-03")).toEqual([
      expect.objectContaining({ name: "Mercado", totalCents: 20000 }),
    ]);
  });

  it("brings the account back into the totals when it is reactivated", () => {
    const { old } = setup();
    repo.setAccountActive(old.id, false);
    repo.setAccountActive(old.id, true);

    expect(repo.getMonthSummary("2026-03").expenseCents).toBe(27000);
  });

  it("keeps the month result consistent with the change in total balance", () => {
    const { old } = setup();
    repo.setAccountActive(old.id, false);
    const summary = repo.getMonthSummary("2026-03");

    expect(repo.getTotalBalance()).toBe(summary.resultCents);
  });
});

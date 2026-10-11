import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Month summary and deletion ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    const savings = repo.createAccount({ name: "Reserva", type: "savings" });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    const market = repo.createCategory({ name: "Mercado", type: "expense" });
    return { checking, savings, salary, market };
  }

  describe("getMonthSummary", () => {
    it("totals income and expenses of the month and their difference", () => {
      const { checking, salary, market } = setup();
      repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 500000, date: "2026-03-05" });
      repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 80000, date: "2026-03-06" });
      repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 20000, date: "2026-03-20" });

      expect(repo.getMonthSummary("2026-03")).toEqual({ incomeCents: 500000, expenseCents: 100000, resultCents: 400000 });
    });

    it("never counts transfers as income or expense", () => {
      const { checking, savings } = setup();
      repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 90000, date: "2026-03-10" });

      expect(repo.getMonthSummary("2026-03")).toEqual({ incomeCents: 0, expenseCents: 0, resultCents: 0 });
    });

    it("respects month boundaries and ignores pending transactions", () => {
      const { checking, market } = setup();
      const spend = (date: string, status?: "pending") =>
        repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 1000, date, status });
      spend("2026-02-28");
      spend("2026-03-01");
      spend("2026-03-31");
      spend("2026-04-01");
      spend("2026-03-15", "pending");

      expect(repo.getMonthSummary("2026-03").expenseCents).toBe(2000);
    });

    it("rejects a malformed month", () => {
      expect(() => repo.getMonthSummary("2026-3")).toThrow(/mês/i);
    });
  });

  describe("deleteTransaction", () => {
    it("restores the balance when an expense is deleted", () => {
      const { checking, market } = setup();
      const expense = repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 8000, date: "2026-03-06" });

      repo.deleteTransaction(expense.id);

      expect(repo.getBalance(checking.id)).toBe(0);
    });

    it("removes the whole transfer when either leg is deleted", () => {
      const { checking, savings } = setup();
      const transfer = repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 30000, date: "2026-03-10" });

      repo.deleteTransaction(transfer.legs[1].id);

      expect(repo.getBalance(checking.id)).toBe(0);
      expect(repo.getBalance(savings.id)).toBe(0);
    });

    it("fails for a transaction that does not exist", () => {
      expect(() => repo.deleteTransaction(999)).toThrow(/não encontrado/i);
    });
  });
});

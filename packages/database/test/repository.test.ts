import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("FinanceRepository ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  describe("accounts and balance", () => {
    it("starts with the opening balance", () => {
      const account = repo.createAccount({ name: "Nubank", type: "checking", openingBalanceCents: 100000 });
      expect(repo.getBalance(account.id)).toBe(100000);
    });

    it("adds income and subtracts expenses", () => {
      const account = repo.createAccount({ name: "Nubank", type: "checking", openingBalanceCents: 100000 });
      const salary = repo.createCategory({ name: "Salário", type: "income" });
      const market = repo.createCategory({ name: "Mercado", type: "expense" });

      repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 500000, date: "2026-03-05" });
      repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "expense", amountCents: 8000, date: "2026-03-06" });

      expect(repo.getBalance(account.id)).toBe(100000 + 500000 - 8000);
    });

    it("ignores pending transactions in the balance", () => {
      const account = repo.createAccount({ name: "Nubank", type: "checking" });
      const rent = repo.createCategory({ name: "Moradia", type: "expense" });

      repo.addTransaction({ accountId: account.id, categoryId: rent.id, type: "expense", amountCents: 200000, date: "2026-03-10", status: "pending" });

      expect(repo.getBalance(account.id)).toBe(0);
    });

    it("lets a credit card account go negative", () => {
      const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
      const fun = repo.createCategory({ name: "Lazer", type: "expense" });

      repo.addTransaction({ accountId: card.id, categoryId: fun.id, type: "expense", amountCents: 25000, date: "2026-03-10" });

      expect(repo.getBalance(card.id)).toBe(-25000);
    });
  });

  describe("transaction rules", () => {
    it("rejects an income recorded in an expense category", () => {
      const account = repo.createAccount({ name: "Nubank", type: "checking" });
      const market = repo.createCategory({ name: "Mercado", type: "expense" });

      expect(() =>
        repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "income", amountCents: 100, date: "2026-03-10" }),
      ).toThrow(/categoria/i);
    });

    it("rejects a transaction on an account that does not exist", () => {
      const market = repo.createCategory({ name: "Mercado", type: "expense" });

      expect(() =>
        repo.addTransaction({ accountId: 999, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-10" }),
      ).toThrow(/conta/i);
    });
  });

  describe("categories", () => {
    it("allows one level of subcategory but not two", () => {
      const home = repo.createCategory({ name: "Moradia", type: "expense" });
      const rent = repo.createCategory({ name: "Aluguel", type: "expense", parentId: home.id });

      expect(rent.parentId).toBe(home.id);
      expect(() => repo.createCategory({ name: "Condomínio", type: "expense", parentId: rent.id })).toThrow(/subcategoria/i);
    });

    it("requires a subcategory to have the same type as its parent", () => {
      const home = repo.createCategory({ name: "Moradia", type: "expense" });
      expect(() => repo.createCategory({ name: "Aluguel recebido", type: "income", parentId: home.id })).toThrow(/tipo/i);
    });
  });
});

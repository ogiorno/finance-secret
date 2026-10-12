import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("editing ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const checking = repo.createAccount({ name: "Nubank", type: "checking", openingBalanceCents: 100000 });
    const savings = repo.createAccount({ name: "Poupança", type: "savings" });
    const market = repo.createCategory({ name: "Mercado", type: "expense" });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    return { checking, savings, market, salary };
  }

  describe("updateTransaction", () => {
    it("replaces every field of an expense and moves the balance", () => {
      const { checking, savings, market } = setup();
      const added = repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 8000, date: "2026-03-06" });

      repo.updateTransaction(added.id, {
        accountId: savings.id,
        categoryId: market.id,
        type: "expense",
        amountCents: 9550,
        date: "2026-03-07",
        description: "Feira",
        status: "pending",
      });

      expect(repo.getTransaction(added.id)).toMatchObject({
        accountId: savings.id,
        amountCents: 9550,
        date: "2026-03-07",
        description: "Feira",
        status: "pending",
      });
      expect(repo.getBalance(checking.id)).toBe(100000);
      expect(repo.getBalance(savings.id)).toBe(0);
    });

    it("rejects a category whose type differs from the transaction type", () => {
      const { checking, market, salary } = setup();
      const added = repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 8000, date: "2026-03-06" });

      expect(() =>
        repo.updateTransaction(added.id, { accountId: checking.id, categoryId: salary.id, type: "expense", amountCents: 8000, date: "2026-03-06" }),
      ).toThrow(/categoria/i);
      expect(repo.getTransaction(added.id).categoryId).toBe(market.id);
    });

    it("can switch an expense to an income when the category matches", () => {
      const { checking, market, salary } = setup();
      const added = repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 5000, date: "2026-03-06" });

      repo.updateTransaction(added.id, { accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 5000, date: "2026-03-06" });

      expect(repo.getBalance(checking.id)).toBe(105000);
    });

    it("fails for a transaction that does not exist", () => {
      const { checking, market } = setup();
      expect(() =>
        repo.updateTransaction(999, { accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-06" }),
      ).toThrow(/não encontrado/i);
    });

    it("updates both legs of a transfer together and keeps them cancelling out", () => {
      const { checking, savings } = setup();
      const cash = repo.createAccount({ name: "Carteira", type: "wallet" });
      const transfer = repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 20000, date: "2026-03-10" });

      repo.updateTransaction(transfer.legs[1].id, {
        fromAccountId: checking.id,
        toAccountId: cash.id,
        amountCents: 15000,
        date: "2026-03-11",
        description: "Saque",
      });

      const legs = repo.listTransactions().filter((item) => item.transferGroupId === transfer.groupId);
      expect(legs).toHaveLength(2);
      expect(legs.reduce((sum, leg) => sum + leg.amountCents, 0)).toBe(0);
      expect(legs.map((leg) => [leg.accountId, leg.amountCents, leg.date, leg.description]).sort()).toEqual(
        [
          [checking.id, -15000, "2026-03-11", "Saque"],
          [cash.id, 15000, "2026-03-11", "Saque"],
        ].sort(),
      );
      expect(repo.getBalance(savings.id)).toBe(0);
      expect(repo.getBalance(cash.id)).toBe(15000);
    });

    it("does not turn a transfer into an expense or the other way around", () => {
      const { checking, savings, market } = setup();
      const transfer = repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 100, date: "2026-03-10" });
      const expense = repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-10" });

      expect(() =>
        repo.updateTransaction(transfer.legs[0].id, { accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-10" }),
      ).toThrow(/transferência/i);
      expect(() =>
        repo.updateTransaction(expense.id, { fromAccountId: checking.id, toAccountId: savings.id, amountCents: 100, date: "2026-03-10" }),
      ).toThrow(/transferência/i);
    });
  });

  describe("accounts", () => {
    it("renames an account and rejects an empty name", () => {
      const { checking } = setup();
      repo.renameAccount(checking.id, "  Conta principal ");
      expect(repo.listAccounts()[0]?.name).toBe("Conta principal");
      expect(() => repo.renameAccount(checking.id, "   ")).toThrow(/nome/i);
    });

    it("archives an account: history stays, new entries and the total balance do not", () => {
      const { checking, savings, market } = setup();
      repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 1000, date: "2026-03-06" });

      repo.setAccountActive(checking.id, false);

      expect(repo.listAccounts().map((account) => account.id)).toEqual([savings.id]);
      expect(repo.listAccounts({ includeArchived: true }).map((account) => [account.id, account.isActive])).toEqual([
        [checking.id, false],
        [savings.id, true],
      ]);
      expect(repo.listTransactions()).toHaveLength(1);
      expect(repo.getTotalBalance()).toBe(0);
      expect(() =>
        repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-07" }),
      ).toThrow(/arquivada/i);
      expect(() => repo.addTransfer({ fromAccountId: savings.id, toAccountId: checking.id, amountCents: 100, date: "2026-03-07" })).toThrow(/arquivada/i);
    });

    it("still lets an old transaction on an archived account be edited in place", () => {
      const { checking, market } = setup();
      const added = repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 1000, date: "2026-03-06" });
      repo.setAccountActive(checking.id, false);

      repo.updateTransaction(added.id, { accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 1200, date: "2026-03-06" });

      expect(repo.getTransaction(added.id).amountCents).toBe(1200);
    });

    it("reactivates an archived account", () => {
      const { checking } = setup();
      repo.setAccountActive(checking.id, false);
      repo.setAccountActive(checking.id, true);
      expect(repo.listAccounts().map((account) => account.id)).toContain(checking.id);
    });

    it("deletes an unused account but refuses one with history", () => {
      const { checking, savings, market } = setup();
      repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 1000, date: "2026-03-06" });

      repo.deleteAccount(savings.id);
      expect(repo.listAccounts({ includeArchived: true }).map((account) => account.id)).toEqual([checking.id]);
      expect(() => repo.deleteAccount(checking.id)).toThrow(/arquive/i);
    });
  });

  describe("listTransactions filters", () => {
    it("filters by text in the description or the category name", () => {
      const { checking, market, salary } = setup();
      repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-01", description: "Feira de domingo" });
      repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-02", description: "Pagamento" });

      expect(repo.listTransactions({ search: "feira" }).map((item) => item.description)).toEqual(["Feira de domingo"]);
      expect(repo.listTransactions({ search: "SALÁRIO".toLowerCase() }).map((item) => item.description)).toEqual(["Pagamento"]);
      expect(repo.listTransactions({ search: "inexistente" })).toEqual([]);
    });

    it("filters by category and includes the children of a parent category", () => {
      const { checking } = setup();
      const housing = repo.createCategory({ name: "Moradia", type: "expense" });
      const rent = repo.createCategory({ name: "Aluguel", type: "expense", parentId: housing.id });
      const food = repo.createCategory({ name: "Restaurantes", type: "expense" });
      repo.addTransaction({ accountId: checking.id, categoryId: rent.id, type: "expense", amountCents: 100, date: "2026-03-01" });
      repo.addTransaction({ accountId: checking.id, categoryId: food.id, type: "expense", amountCents: 100, date: "2026-03-02" });

      expect(repo.listTransactions({ categoryId: housing.id }).map((item) => item.categoryName)).toEqual(["Aluguel"]);
      expect(repo.listTransactions({ categoryId: rent.id })).toHaveLength(1);
      expect(repo.listTransactions({ categoryId: food.id })).toHaveLength(1);
    });
  });
});

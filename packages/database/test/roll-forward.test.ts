import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Balance by date and month roll-forward ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const savings = repo.createAccount({ name: "Reserva", type: "savings" });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    const market = repo.createCategory({ name: "Mercado", type: "expense" });
    const earn = (cents: number, date: string) =>
      repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: cents, date });
    const spend = (cents: number, date: string) =>
      repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: cents, date });
    return { checking, savings, earn, spend };
  }

  describe("getTotalBalance as of a date", () => {
    it("only counts transactions up to and including that date", () => {
      const { earn, spend } = setup();
      earn(50000, "2026-03-05");
      spend(20000, "2026-03-10");
      spend(5000, "2026-04-01");

      expect(repo.getTotalBalance("2026-03-04")).toBe(100000);
      expect(repo.getTotalBalance("2026-03-05")).toBe(150000);
      expect(repo.getTotalBalance("2026-03-31")).toBe(130000);
      expect(repo.getTotalBalance()).toBe(125000);
    });

    it("ignores pending transactions", () => {
      const { checking } = setup();
      const market = repo.createCategory({ name: "Extra", type: "expense" });
      repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 9000, date: "2026-03-05", status: "pending" });

      expect(repo.getTotalBalance("2026-03-31")).toBe(100000);
    });
  });

  describe("getMonthRollForward", () => {
    it("ties opening plus income minus expenses to the closing balance", () => {
      const { earn, spend } = setup();
      earn(80000, "2026-02-20");
      earn(500000, "2026-03-05");
      spend(120000, "2026-03-10");

      expect(repo.getMonthRollForward("2026-03")).toEqual({
        openingCents: 180000,
        incomeCents: 500000,
        expenseCents: 120000,
        closingCents: 560000,
        cardsCents: 0,
        unexplainedCents: 0,
      });
    });

    it("starts from the opening balances of the accounts when there is no history", () => {
      setup();

      expect(repo.getMonthRollForward("2026-03")).toEqual({
        openingCents: 100000,
        incomeCents: 0,
        expenseCents: 0,
        closingCents: 100000,
        cardsCents: 0,
        unexplainedCents: 0,
      });
    });

    it("ties even with transfers between active accounts", () => {
      const { checking, savings, earn } = setup();
      earn(300000, "2026-03-02");
      repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 90000, date: "2026-03-10" });

      const roll = repo.getMonthRollForward("2026-03");

      expect(roll.unexplainedCents).toBe(0);
      expect(roll.closingCents - roll.openingCents).toBe(roll.incomeCents - roll.expenseCents);
    });

    it("shows a transfer to an archived account as an unexplained difference instead of hiding it", () => {
      const { checking, savings, earn } = setup();
      earn(300000, "2026-03-02");
      repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 90000, date: "2026-03-10" });
      repo.setAccountActive(savings.id, false);

      const roll = repo.getMonthRollForward("2026-03");

      expect(roll.unexplainedCents).toBe(-90000);
      expect(roll.openingCents + roll.incomeCents - roll.expenseCents + roll.unexplainedCents).toBe(roll.closingCents);
    });

    it("counts a card purchase in the month its invoice closes, and the invoice payment against it", () => {
      const { checking, spend } = setup();
      const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
      const feira = repo.createCategory({ name: "Feira", type: "expense" });
      spend(20000, "2026-03-10");
      repo.addTransaction({ accountId: card.id, categoryId: feira.id, type: "expense", amountCents: 57597, date: "2026-03-12" });

      expect(repo.getMonthRollForward("2026-03")).toEqual({
        openingCents: 100000,
        incomeCents: 0,
        expenseCents: 20000,
        closingCents: 80000,
        cardsCents: 0,
        unexplainedCents: 0,
      });

      repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 57597, date: "2026-04-08" });

      expect(repo.getMonthRollForward("2026-04")).toEqual({
        openingCents: 80000,
        incomeCents: 0,
        expenseCents: 57597,
        closingCents: 22403,
        cardsCents: 0,
        unexplainedCents: 0,
      });
    });

    it("rejects a malformed month", () => {
      expect(() => repo.getMonthRollForward("2026-13")).toThrow(/mês inválido/i);
    });
  });
});

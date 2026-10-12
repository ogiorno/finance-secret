import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("A card purchase counts in the month its invoice closes ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup(closingDay?: number) {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const card = repo.createAccount({ name: "Cartão", type: "credit_card", closingDay });
    const lazer = repo.createCategory({ name: "Lazer", type: "expense" });
    const buy = (accountId: number, cents: number, date: string) =>
      repo.addTransaction({ accountId, categoryId: lazer.id, type: "expense", amountCents: cents, date });
    return { checking, card, buy };
  }

  it("with closing day 1, October purchases belong to November", () => {
    const { checking, card, buy } = setup();
    buy(card.id, 57597, "2026-10-12");
    buy(checking.id, 4000, "2026-10-12");

    expect(repo.getMonthSummary("2026-10").expenseCents).toBe(4000);
    expect(repo.getMonthSummary("2026-11").expenseCents).toBe(57597);
  });

  it("a purchase on the closing day itself goes to the next invoice", () => {
    const { card, buy } = setup(15);
    buy(card.id, 1000, "2026-10-14");
    buy(card.id, 2000, "2026-10-15");

    expect(repo.getMonthSummary("2026-10").expenseCents).toBe(1000);
    expect(repo.getMonthSummary("2026-11").expenseCents).toBe(2000);
  });

  it("uses the last day of a short month as the closing day", () => {
    const { card, buy } = setup(31);
    buy(card.id, 1000, "2026-02-27");
    buy(card.id, 2000, "2026-02-28");

    expect(repo.getMonthSummary("2026-02").expenseCents).toBe(1000);
    expect(repo.getMonthSummary("2026-03").expenseCents).toBe(2000);
  });

  it("rolls December purchases into January of the next year", () => {
    const { card, buy } = setup();
    buy(card.id, 3000, "2026-12-20");

    expect(repo.getMonthSummary("2026-12").expenseCents).toBe(0);
    expect(repo.getMonthSummary("2027-01").expenseCents).toBe(3000);
  });

  it("moves the card into the same month in the category totals, extras and money flow", () => {
    const { card, buy } = setup();
    buy(card.id, 5000, "2026-10-05");

    expect(repo.getExpensesByCategory("2026-10")).toEqual([]);
    expect(repo.getExpensesByCategory("2026-11").map((row) => row.totalCents)).toEqual([5000]);
    expect(repo.getMoneyFlow("2026-10").edges).toEqual([]);
    expect(repo.getMoneyFlow("2026-11").edges.map((edge) => edge.cents)).toEqual([5000]);
  });

  it("keeps the transaction list by the date of the purchase", () => {
    const { card, buy } = setup();
    buy(card.id, 5000, "2026-10-05");

    expect(repo.listTransactions({ month: "2026-10" })).toHaveLength(1);
    expect(repo.listTransactions({ month: "2026-11" })).toHaveLength(0);
  });
});

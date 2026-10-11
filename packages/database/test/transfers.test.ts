import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Transfers ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  it("moves money between accounts without changing the total", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const savings = repo.createAccount({ name: "Reserva", type: "savings", openingBalanceCents: 5000 });

    repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 30000, date: "2026-03-10" });

    expect(repo.getBalance(checking.id)).toBe(70000);
    expect(repo.getBalance(savings.id)).toBe(35000);
  });

  it("returns both legs of the group, outflow first", () => {
    const a = repo.createAccount({ name: "A", type: "checking" });
    const b = repo.createAccount({ name: "B", type: "checking" });

    const transfer = repo.addTransfer({ fromAccountId: a.id, toAccountId: b.id, amountCents: 700, date: "2026-03-10" });

    expect(transfer.legs.map((leg) => [leg.accountId, leg.amountCents])).toEqual([
      [a.id, -700],
      [b.id, 700],
    ]);
  });

  it("pays down a credit card", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const fun = repo.createCategory({ name: "Lazer", type: "expense" });
    repo.addTransaction({ accountId: card.id, categoryId: fun.id, type: "expense", amountCents: 25000, date: "2026-03-02" });

    repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 25000, date: "2026-03-20", description: "Fatura" });

    expect(repo.getBalance(card.id)).toBe(0);
    expect(repo.getBalance(checking.id)).toBe(75000);
  });

  it("leaves nothing behind when the destination does not exist", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });

    expect(() =>
      repo.addTransfer({ fromAccountId: checking.id, toAccountId: 999, amountCents: 30000, date: "2026-03-10" }),
    ).toThrow(/conta/i);
    expect(repo.getBalance(checking.id)).toBe(100000);
  });

  it("rejects a transfer to the same account", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    expect(() =>
      repo.addTransfer({ fromAccountId: checking.id, toAccountId: checking.id, amountCents: 100, date: "2026-03-10" }),
    ).toThrow(/mesma conta/i);
  });
});

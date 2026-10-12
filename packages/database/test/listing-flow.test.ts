import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Transaction list knows the other end of a transfer ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  it("gives each transfer leg the name of the account on the other side", () => {
    const checking = repo.createAccount({ name: "Conta corrente", type: "checking" });
    const card = repo.createAccount({ name: "Cartão Roxo", type: "credit_card" });
    repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 30000, date: "2026-03-10" });

    const legs = repo.listTransactions({ month: "2026-03" });
    const outflow = legs.find((leg) => leg.amountCents < 0);
    const inflow = legs.find((leg) => leg.amountCents > 0);

    expect(outflow).toMatchObject({ accountName: "Conta corrente", counterpartAccountName: "Cartão Roxo" });
    expect(inflow).toMatchObject({ accountName: "Cartão Roxo", counterpartAccountName: "Conta corrente" });
  });

  it("leaves the counterpart empty for income and expenses", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 100, date: "2026-03-10" });

    expect(repo.listTransactions()[0]?.counterpartAccountName).toBeNull();
  });
});

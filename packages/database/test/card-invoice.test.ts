import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { migrations } from "../src/migrations";
import { drivers } from "./drivers";

describe.each(drivers)("Credit card invoice ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  const market = () => repo.createCategory({ name: "Mercado", type: "expense" });
  const spend = (accountId: number, categoryId: number, cents: number, date: string, status?: "pending") =>
    repo.addTransaction({ accountId, categoryId, type: "expense", amountCents: cents, date, status });

  it("marks the credit card type as one that has a closing day", () => {
    const types = repo.listAccountTypes();

    expect(types.find((type) => type.key === "credit_card")?.hasClosingDay).toBe(true);
    expect(types.find((type) => type.key === "checking")?.hasClosingDay).toBe(false);
  });

  it("gives a new card the closing day 1, and other accounts none", () => {
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const checking = repo.createAccount({ name: "Conta", type: "checking" });

    expect(repo.listAccounts().find((account) => account.id === card.id)?.closingDay).toBe(1);
    expect(repo.listAccounts().find((account) => account.id === checking.id)?.closingDay).toBeNull();
  });

  it("lets the user choose the closing day of a new card", () => {
    const card = repo.createAccount({ name: "Cartão", type: "credit_card", closingDay: 15 });

    expect(card.closingDay).toBe(15);
    expect(repo.listAccounts()[0]?.closingDay).toBe(15);
  });

  it("changes the closing day of a card", () => {
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });

    repo.setAccountClosingDay(card.id, 10);

    expect(repo.listAccounts()[0]?.closingDay).toBe(10);
  });

  it("rejects a closing day that is not a day of the month, and one on an account that is not a card", () => {
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const checking = repo.createAccount({ name: "Conta", type: "checking" });

    for (const day of [0, 32, 1.5]) expect(() => repo.setAccountClosingDay(card.id, day)).toThrow(/dia/i);
    expect(() => repo.setAccountClosingDay(checking.id, 5)).toThrow(/cartão/i);
    expect(() => repo.createAccount({ name: "Outra", type: "checking", closingDay: 5 })).toThrow(/cartão/i);
    expect(() => repo.setAccountClosingDay(999, 5)).toThrow(/não encontrada/i);
  });

  it("with closing day 1 the open invoice is the month, and the previous one is the month before", () => {
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const { id } = market();
    spend(card.id, id, 100, "2026-03-02");
    spend(card.id, id, 200, "2026-03-14");
    spend(card.id, id, 400, "2026-02-20");
    spend(card.id, id, 800, "2026-01-20");

    expect(repo.getCardInvoice(card.id, "2026-03-15")).toMatchObject({
      closingDay: 1,
      cycleStart: "2026-03-01",
      nextTurn: "2026-04-01",
      daysUntilTurn: 17,
      openInvoiceCents: 300,
      previousInvoiceCents: 400,
    });
  });

  it("starts the new invoice on the closing day itself", () => {
    const card = repo.createAccount({ name: "Cartão", type: "credit_card", closingDay: 10 });
    const { id } = market();
    spend(card.id, id, 100, "2026-03-09");
    spend(card.id, id, 200, "2026-03-10");
    spend(card.id, id, 400, "2026-02-10");

    expect(repo.getCardInvoice(card.id, "2026-03-12")).toMatchObject({
      cycleStart: "2026-03-10",
      nextTurn: "2026-04-10",
      openInvoiceCents: 200,
      previousInvoiceCents: 100 + 400,
    });
  });

  it("counts only posted expenses of that card", () => {
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const other = repo.createAccount({ name: "Outro cartão", type: "credit_card" });
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    const { id } = market();
    spend(card.id, id, 100, "2026-03-02");
    spend(card.id, id, 5000, "2026-03-03", "pending");
    spend(other.id, id, 7000, "2026-03-04");
    spend(checking.id, id, 9000, "2026-03-05");
    repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 3000, date: "2026-03-06" });

    expect(repo.getCardInvoice(card.id, "2026-03-15").openInvoiceCents).toBe(100);
  });

  it("separates what is owed on the card from the money in the checking account", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const card = repo.createAccount({ name: "Cartão", type: "credit_card", openingBalanceCents: -5000 });
    const { id } = market();
    spend(card.id, id, 300, "2026-03-02");

    expect(repo.getCardInvoice(card.id, "2026-03-15").owedCents).toBe(5300);
    expect(repo.getBalance(checking.id)).toBe(100000);

    repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 5300, date: "2026-03-10" });

    expect(repo.getCardInvoice(card.id, "2026-03-15").owedCents).toBe(0);
    expect(repo.getBalance(checking.id)).toBe(94700);
  });

  it("splits the total balance into money in accounts and debt on cards, active accounts only", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    repo.createAccount({ name: "Poupança", type: "savings", openingBalanceCents: 20000 });
    const card = repo.createAccount({ name: "Cartão", type: "credit_card", openingBalanceCents: -5300 });
    const old = repo.createAccount({ name: "Antigo", type: "credit_card", openingBalanceCents: -999 });
    repo.setAccountActive(old.id, false);

    expect(repo.getBalanceBreakdown()).toEqual({ cashCents: 120000, debtCents: -5300 });
    expect(repo.getBalanceBreakdown().cashCents + repo.getBalanceBreakdown().debtCents).toBe(repo.getTotalBalance());
    expect(checking.id).not.toBe(card.id);
  });

  it("refuses an invoice for an account that is not a card", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });

    expect(() => repo.getCardInvoice(checking.id, "2026-03-15")).toThrow(/cartão/i);
    expect(() => repo.getCardInvoice(999, "2026-03-15")).toThrow(/não encontrada/i);
    expect(() => repo.getCardInvoice(checking.id, "15/03/2026")).toThrow(/data/i);
  });

  it("lets a custom account type have a closing day too", () => {
    const type = repo.createAccountType({ name: "Cartão da loja", isLiability: true, hasClosingDay: true });
    const card = repo.createAccount({ name: "Loja", type: type.key });

    expect(repo.listAccounts()[0]).toMatchObject({ id: card.id, closingDay: 1 });
  });
});

describe.each(drivers)("upgrading a database that already has a credit card ($name)", ({ create }) => {
  it("gives the existing card the closing day 1", () => {
    const driver = create();
    driver.exec("PRAGMA foreign_keys = OFF");
    driver.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
    for (const migration of migrations.filter((m) => m.version <= 8)) {
      driver.exec(migration.sql);
      driver.run("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", [migration.version, "2026-01-01T00:00:00Z"]);
    }
    driver.run("INSERT INTO accounts (name, type, created_at) VALUES ('Cartão', 'credit_card', '2026-01-01')");
    driver.run("INSERT INTO accounts (name, type, created_at) VALUES ('Conta', 'checking', '2026-01-01')");
    driver.exec("PRAGMA foreign_keys = ON");

    const repo = createFinanceRepository(openDatabase(driver));

    expect(repo.listAccounts().map((account) => [account.name, account.closingDay])).toEqual([
      ["Cartão", 1],
      ["Conta", null],
    ]);
  });
});

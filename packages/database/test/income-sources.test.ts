import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { migrations } from "../src/migrations";
import { drivers } from "./drivers";

describe.each(drivers)("Income sources ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    const market = repo.createCategory({ name: "Mercado", type: "expense" });
    return { account, salary, market };
  }

  const wife = () => repo.createIncomeSource({ name: "Esposa" });

  it("comes with the default source Eu", () => {
    expect(repo.listIncomeSources()).toEqual([expect.objectContaining({ name: "Eu", isDefault: true, isActive: true })]);
  });

  it("creates, renames and lists sources", () => {
    const created = wife();
    repo.renameIncomeSource(created.id, "Minha esposa");

    expect(repo.listIncomeSources().map((source) => source.name)).toEqual(["Eu", "Minha esposa"]);
  });

  it("rejects an empty or duplicate name", () => {
    wife();

    expect(() => repo.createIncomeSource({ name: "  " })).toThrow(/nome/i);
    expect(() => repo.createIncomeSource({ name: "esposa" })).toThrow(/já existe/i);
  });

  it("archives and reactivates without losing history", () => {
    const { id } = wife();

    repo.setIncomeSourceActive(id, false);
    expect(repo.listIncomeSources().map((source) => source.name)).toEqual(["Eu"]);
    expect(repo.listIncomeSources({ includeArchived: true }).map((source) => source.name)).toEqual(["Eu", "Esposa"]);

    repo.setIncomeSourceActive(id, true);
    expect(repo.listIncomeSources()).toHaveLength(2);
  });

  it("never archives or deletes the default source", () => {
    const eu = repo.listIncomeSources().find((source) => source.isDefault);
    expect(eu).toBeDefined();
    const id = eu?.id ?? 0;

    expect(() => repo.setIncomeSourceActive(id, false)).toThrow(/padrão/i);
    expect(() => repo.deleteIncomeSource(id)).toThrow(/padrão/i);
  });

  it("deletes a source that was never used", () => {
    const { id } = wife();

    repo.deleteIncomeSource(id);

    expect(repo.listIncomeSources({ includeArchived: true }).map((source) => source.name)).toEqual(["Eu"]);
  });

  it("refuses to delete a source with income, suggesting to archive", () => {
    const { account, salary } = setup();
    const { id } = wife();
    repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-05", sourceId: id });

    expect(() => repo.deleteIncomeSource(id)).toThrow(/arquive/i);
  });

  it("gives an income without a source the default one", () => {
    const { account, salary } = setup();
    const saved = repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-05" });

    expect(repo.getTransaction(saved.id)).toMatchObject({ sourceName: "Eu" });
  });

  it("records the source the user picked, or none when asked", () => {
    const { account, salary } = setup();
    const { id } = wife();
    const withSource = repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-05", sourceId: id });
    const without = repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-05", sourceId: null });

    expect(repo.getTransaction(withSource.id)).toMatchObject({ sourceId: id, sourceName: "Esposa" });
    expect(repo.getTransaction(without.id)).toMatchObject({ sourceId: null, sourceName: null });
  });

  it("refuses a source on an expense and an archived source on a new income", () => {
    const { account, salary, market } = setup();
    const { id } = wife();

    expect(() =>
      repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-05", sourceId: id }),
    ).toThrow(/fonte/i);

    repo.setIncomeSourceActive(id, false);
    expect(() =>
      repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-05", sourceId: id }),
    ).toThrow(/arquivada/i);
  });

  it("leaves expenses and transfers without a source", () => {
    const { account, market } = setup();
    const other = repo.createAccount({ name: "Outra", type: "checking" });
    repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-05" });
    repo.addTransfer({ fromAccountId: account.id, toAccountId: other.id, amountCents: 100, date: "2026-03-05" });

    expect(repo.listTransactions().every((item) => item.sourceId === null && item.sourceName === null)).toBe(true);
  });

  it("changes the source of an existing income", () => {
    const { account, salary } = setup();
    const { id } = wife();
    const saved = repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-05" });

    repo.updateTransaction(saved.id, { accountId: account.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-05", sourceId: id });

    expect(repo.getTransaction(saved.id).sourceName).toBe("Esposa");
  });

  it("filters the list by source", () => {
    const { account, salary } = setup();
    const { id } = wife();
    repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 100, date: "2026-03-05" });
    repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 250, date: "2026-03-06", sourceId: id });

    expect(repo.listTransactions({ sourceId: id }).map((item) => item.amountCents)).toEqual([250]);
  });

  it("totals the income by source and month: posted income of active accounts only", () => {
    const { account, salary, market } = setup();
    const old = repo.createAccount({ name: "Antiga", type: "checking" });
    const { id } = wife();
    const earn = (accountId: number, cents: number, date: string, sourceId?: number, status?: "pending") =>
      repo.addTransaction({ accountId, categoryId: salary.id, type: "income", amountCents: cents, date, sourceId, status });
    earn(account.id, 500000, "2026-03-05");
    earn(account.id, 150000, "2026-03-10", id);
    earn(account.id, 150000, "2026-04-10", id);
    earn(account.id, 99999, "2026-03-12", id, "pending");
    earn(old.id, 77777, "2026-03-15", id);
    repo.setAccountActive(old.id, false);
    repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "expense", amountCents: 1000, date: "2026-03-20" });

    expect(repo.getIncomeBySource("2026-03", "2026-04")).toEqual([
      { month: "2026-03", sourceId: expect.any(Number), sourceName: "Eu", totalCents: 500000 },
      { month: "2026-03", sourceId: id, sourceName: "Esposa", totalCents: 150000 },
      { month: "2026-04", sourceId: id, sourceName: "Esposa", totalCents: 150000 },
    ]);
  });

  it("rejects a malformed range", () => {
    expect(() => repo.getIncomeBySource("2026-13", "2026-14")).toThrow(/mês inválido/i);
    expect(() => repo.getIncomeBySource("2026-05", "2026-03")).toThrow(/período/i);
  });
});

describe.each(drivers)("upgrading a database with income to sources ($name)", ({ create }) => {
  it("gives the income that already exists the default source", () => {
    const driver = create();
    driver.exec("PRAGMA foreign_keys = OFF");
    driver.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
    for (const migration of migrations.filter((m) => m.version <= 6)) {
      driver.exec(migration.sql);
      driver.run("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", [migration.version, "2026-01-01T00:00:00Z"]);
    }
    driver.run("INSERT INTO accounts (name, type, created_at) VALUES ('Conta', 'checking', '2026-01-01')");
    driver.run("INSERT INTO categories (name, type) VALUES ('Salário', 'income')");
    driver.run(
      `INSERT INTO transactions (account_id, category_id, type, amount_cents, transaction_date, created_at, updated_at)
       SELECT 1, id, 'income', 5000, '2026-02-01', '2026-02-01', '2026-02-01' FROM categories WHERE name = 'Salário'`,
    );
    driver.exec("PRAGMA foreign_keys = ON");

    const repo = createFinanceRepository(openDatabase(driver));

    expect(repo.listTransactions()[0]).toMatchObject({ type: "income", sourceName: "Eu" });
  });
});

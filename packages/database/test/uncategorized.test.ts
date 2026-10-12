import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { migrations } from "../src/migrations";
import { drivers } from "./drivers";

describe.each(drivers)("Sem categoria ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  const uncategorized = (type: "income" | "expense") =>
    repo.listCategories().find((category) => category.isSystem && category.type === type);

  it("comes with one system category for expenses and one for income", () => {
    expect(uncategorized("expense")?.name).toBe("Sem categoria");
    expect(uncategorized("income")?.name).toBe("Sem categoria");
  });

  it("stores an expense without a category in the expense Sem categoria", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const saved = repo.addTransaction({ accountId: account.id, type: "expense", amountCents: 1500, date: "2026-03-10" });

    expect(saved.categoryId).toBe(uncategorized("expense")?.id);
    expect(repo.getTransaction(saved.id).categoryName).toBe("Sem categoria");
  });

  it("stores an income without a category in the income Sem categoria", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const saved = repo.addTransaction({ accountId: account.id, type: "income", amountCents: 9000, date: "2026-03-10" });

    expect(saved.categoryId).toBe(uncategorized("income")?.id);
  });

  it("keeps an explicitly chosen category", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const market = repo.createCategory({ name: "Mercado", type: "expense" });
    const saved = repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "expense", amountCents: 500, date: "2026-03-10" });

    expect(saved.categoryId).toBe(market.id);
  });

  it("lets an edit drop the category back to Sem categoria", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const market = repo.createCategory({ name: "Mercado", type: "expense" });
    const saved = repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "expense", amountCents: 500, date: "2026-03-10" });

    repo.updateTransaction(saved.id, { accountId: account.id, type: "expense", amountCents: 500, date: "2026-03-10" });

    expect(repo.getTransaction(saved.id).categoryName).toBe("Sem categoria");
  });

  it("shows Sem categoria in the spending by category like any other category", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    repo.addTransaction({ accountId: account.id, type: "expense", amountCents: 2500, date: "2026-03-10" });

    expect(repo.getExpensesByCategory("2026-03")).toEqual([
      { categoryId: uncategorized("expense")?.id, name: "Sem categoria", totalCents: 2500 },
    ]);
  });

  it("still seeds the default categories next to the system ones, once", () => {
    repo.seedDefaultCategories();
    repo.seedDefaultCategories();
    const categories = repo.listCategories();

    expect(categories.filter((category) => category.name === "Mercado")).toHaveLength(1);
    expect(categories.filter((category) => category.name === "Sem categoria")).toHaveLength(2);
  });
});

describe.each(drivers)("upgrading an old database ($name)", ({ create }) => {
  it("adds Sem categoria to a database created before it existed, keeping the user's data", () => {
    const driver = create();
    driver.exec("PRAGMA foreign_keys = OFF");
    driver.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
    for (const migration of migrations.filter((m) => m.version <= 2)) {
      driver.exec(migration.sql);
      driver.run("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", [migration.version, "2026-01-01T00:00:00Z"]);
    }
    driver.run("INSERT INTO categories (name, type) VALUES ('Mercado', 'expense')");
    driver.exec("PRAGMA foreign_keys = ON");

    const repo = createFinanceRepository(openDatabase(driver));
    const categories = repo.listCategories();

    expect(categories.map((c) => c.name)).toContain("Mercado");
    expect(categories.filter((c) => c.name === "Sem categoria" && c.isSystem)).toHaveLength(2);
  });
});

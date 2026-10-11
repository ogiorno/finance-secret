import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Dashboard queries ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  it("sums the balance of all active accounts, credit cards included", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const fun = repo.createCategory({ name: "Lazer", type: "expense" });
    repo.addTransaction({ accountId: card.id, categoryId: fun.id, type: "expense", amountCents: 30000, date: "2026-03-02" });

    expect(repo.getTotalBalance()).toBe(100000 - 30000);
    expect(repo.listAccounts().map((a) => a.id)).toEqual([checking.id, card.id]);
  });

  it("groups the month's expenses by top-level category, largest first", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const home = repo.createCategory({ name: "Moradia", type: "expense" });
    const rent = repo.createCategory({ name: "Aluguel", type: "expense", parentId: home.id });
    const food = repo.createCategory({ name: "Mercado", type: "expense" });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    const spend = (categoryId: number, amountCents: number, date: string) =>
      repo.addTransaction({ accountId: account.id, categoryId, type: "expense", amountCents, date });
    spend(rent.id, 150000, "2026-03-05");
    spend(home.id, 10000, "2026-03-07");
    spend(food.id, 80000, "2026-03-08");
    spend(food.id, 99999, "2026-04-01");
    repo.addTransaction({ accountId: account.id, categoryId: salary.id, type: "income", amountCents: 500000, date: "2026-03-01" });

    expect(repo.getExpensesByCategory("2026-03")).toEqual([
      { categoryId: home.id, name: "Moradia", totalCents: 160000 },
      { categoryId: food.id, name: "Mercado", totalCents: 80000 },
    ]);
  });

  it("lists the latest transactions first, with account and category names", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const other = repo.createAccount({ name: "Reserva", type: "savings" });
    const food = repo.createCategory({ name: "Mercado", type: "expense" });
    repo.addTransaction({ accountId: account.id, categoryId: food.id, type: "expense", amountCents: 500, date: "2026-03-01", description: "Pão" });
    repo.addTransfer({ fromAccountId: account.id, toAccountId: other.id, amountCents: 900, date: "2026-03-03" });
    repo.addTransaction({ accountId: account.id, categoryId: food.id, type: "expense", amountCents: 700, date: "2026-03-02" });

    const items = repo.listTransactions({ limit: 3 });

    expect(items.map((t) => [t.date, t.type, t.accountName, t.categoryName])).toEqual([
      ["2026-03-03", "transfer", "Reserva", null],
      ["2026-03-03", "transfer", "Conta", null],
      ["2026-03-02", "expense", "Conta", "Mercado"],
    ]);
  });

  it("filters the list by month and account", () => {
    const a = repo.createAccount({ name: "A", type: "checking" });
    const b = repo.createAccount({ name: "B", type: "checking" });
    const food = repo.createCategory({ name: "Mercado", type: "expense" });
    const spend = (accountId: number, date: string) =>
      repo.addTransaction({ accountId, categoryId: food.id, type: "expense", amountCents: 100, date });
    spend(a.id, "2026-03-10");
    spend(b.id, "2026-03-11");
    spend(a.id, "2026-04-01");

    expect(repo.listTransactions({ month: "2026-03", accountId: a.id })).toHaveLength(1);
    expect(repo.listTransactions({ month: "2026-03" })).toHaveLength(2);
  });

  it("seeds default categories once", () => {
    repo.seedDefaultCategories();
    repo.seedDefaultCategories();
    const categories = repo.listCategories();

    expect(categories.filter((c) => c.name === "Mercado")).toHaveLength(1);
    expect(categories.some((c) => c.type === "income" && c.parentId === null)).toBe(true);
    expect(categories.some((c) => c.parentId !== null)).toBe(true);
  });
});

describe.each(drivers)("openDatabase on foreign files ($name)", ({ create }) => {
  it("refuses a SQLite file that is not a finance database, leaving it untouched", () => {
    const driver = create();
    driver.exec("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)");

    expect(() => openDatabase(driver)).toThrow(/compatível/i);
    expect(driver.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")).toEqual([{ name: "notes" }]);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { migrations } from "../src/migrations";
import { drivers } from "./drivers";

describe.each(drivers)("account types ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  it("ships the built-in types, including the meal voucher that tracks usage", () => {
    const types = repo.listAccountTypes();
    expect(types.map((type) => type.key)).toEqual(["checking", "savings", "cash", "wallet", "credit_card", "loan", "meal_voucher"]);
    expect(types.filter((type) => type.isLiability).map((type) => type.key)).toEqual(["credit_card", "loan"]);
    expect(types.find((type) => type.key === "meal_voucher")).toMatchObject({ name: "Vale-alimentação", tracksUsage: true, isSystem: true });
  });

  it("creates a custom type, generates a unique key and lets accounts use it", () => {
    const first = repo.createAccountType({ name: "Vale Refeição" });
    const second = repo.createAccountType({ name: "Vale refeição" });
    expect(first.key).toBe("vale_refeicao");
    expect(second.key).toBe("vale_refeicao_2");

    const account = repo.createAccount({ name: "VR Empresa", type: first.key, openingBalanceCents: 30000 });
    expect(repo.getBalance(account.id)).toBe(30000);
    expect(repo.listAccountTypes().map((type) => type.name)).toContain("Vale Refeição");
  });

  it("rejects an account with an unknown or archived type", () => {
    expect(() => repo.createAccount({ name: "X", type: "inexistente" })).toThrow(/tipo de conta/i);
    const custom = repo.createAccountType({ name: "FGTS" });
    repo.setAccountTypeActive(custom.key, false);
    expect(() => repo.createAccount({ name: "X", type: custom.key })).toThrow(/arquivado/i);
  });

  it("renames a type and toggles usage tracking, but not whether it is a liability", () => {
    const custom = repo.createAccountType({ name: "Benefício", isLiability: false });
    repo.updateAccountType(custom.key, { name: "Benefícios", tracksUsage: true });
    expect(repo.listAccountTypes().find((type) => type.key === custom.key)).toMatchObject({
      name: "Benefícios",
      tracksUsage: true,
      isLiability: false,
    });
    expect(() => repo.updateAccountType(custom.key, { name: "  " })).toThrow(/nome/i);
  });

  it("deletes an unused custom type but refuses built-in or used ones", () => {
    const unused = repo.createAccountType({ name: "Temporário" });
    const used = repo.createAccountType({ name: "Em uso" });
    repo.createAccount({ name: "Conta", type: used.key });

    repo.deleteAccountType(unused.key);
    expect(repo.listAccountTypes({ includeArchived: true }).map((type) => type.key)).not.toContain(unused.key);
    expect(() => repo.deleteAccountType(used.key)).toThrow(/arquive/i);
    expect(() => repo.deleteAccountType("checking")).toThrow(/fábrica/i);
  });

  it("hides archived types by default and reports them when asked", () => {
    const custom = repo.createAccountType({ name: "Antigo" });
    repo.setAccountTypeActive(custom.key, false);
    expect(repo.listAccountTypes().map((type) => type.key)).not.toContain(custom.key);
    expect(repo.listAccountTypes({ includeArchived: true }).find((type) => type.key === custom.key)?.isActive).toBe(false);
  });

  describe("usage summary", () => {
    it("reports balance, credited and used for tracked types in the month", () => {
      const voucher = repo.createAccount({ name: "VA Empresa", type: "meal_voucher", openingBalanceCents: 10000 });
      const checking = repo.createAccount({ name: "Nubank", type: "checking", openingBalanceCents: 500000 });
      const credit = repo.createCategory({ name: "Vale-alimentação", type: "income" });
      const market = repo.createCategory({ name: "Mercado", type: "expense" });

      repo.addTransaction({ accountId: voucher.id, categoryId: credit.id, type: "income", amountCents: 90000, date: "2026-03-01" });
      repo.addTransaction({ accountId: voucher.id, categoryId: market.id, type: "expense", amountCents: 25000, date: "2026-03-10" });
      repo.addTransaction({ accountId: voucher.id, categoryId: market.id, type: "expense", amountCents: 7000, date: "2026-03-12", status: "pending" });
      repo.addTransaction({ accountId: voucher.id, categoryId: market.id, type: "expense", amountCents: 4000, date: "2026-02-20" });
      repo.addTransaction({ accountId: checking.id, categoryId: market.id, type: "expense", amountCents: 9999, date: "2026-03-11" });

      expect(repo.getAccountTypeUsage("2026-03")).toEqual([
        { typeKey: "meal_voucher", typeName: "Vale-alimentação", balanceCents: 10000 + 90000 - 25000 - 4000, creditedCents: 90000, usedCents: 25000 },
      ]);
    });

    it("sums several accounts of the same type and ignores archived ones", () => {
      const a = repo.createAccount({ name: "VA A", type: "meal_voucher" });
      const b = repo.createAccount({ name: "VA B", type: "meal_voucher" });
      const old = repo.createAccount({ name: "VA antigo", type: "meal_voucher" });
      const credit = repo.createCategory({ name: "Vale-alimentação", type: "income" });
      for (const account of [a, b, old]) {
        repo.addTransaction({ accountId: account.id, categoryId: credit.id, type: "income", amountCents: 10000, date: "2026-03-01" });
      }
      repo.setAccountActive(old.id, false);

      expect(repo.getAccountTypeUsage("2026-03")[0]).toMatchObject({ balanceCents: 20000, creditedCents: 20000, usedCents: 0 });
    });

    it("lists a tracked type even when it has no accounts yet", () => {
      expect(repo.getAccountTypeUsage("2026-03")).toEqual([
        { typeKey: "meal_voucher", typeName: "Vale-alimentação", balanceCents: 0, creditedCents: 0, usedCents: 0 },
      ]);
    });

    it("includes a custom type once tracking is turned on", () => {
      const custom = repo.createAccountType({ name: "Vale Refeição" });
      expect(repo.getAccountTypeUsage("2026-03").map((row) => row.typeKey)).toEqual(["meal_voucher"]);
      repo.updateAccountType(custom.key, { tracksUsage: true });
      expect(repo.getAccountTypeUsage("2026-03").map((row) => row.typeKey)).toEqual(["meal_voucher", custom.key]);
    });
  });
});

describe.each(drivers)("migration 002 ($name)", ({ create }) => {
  it("upgrades a version 1 database keeping accounts, transactions and their links", () => {
    const driver = create();
    driver.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
    driver.exec(migrations[0]!.sql);
    driver.run("INSERT INTO schema_migrations (version, applied_at) VALUES (1, '2026-01-01T00:00:00Z')");
    driver.run("INSERT INTO accounts (name, type, opening_balance_cents, created_at) VALUES ('Antiga', 'credit_card', -5000, '2026-01-01')");
    driver.run("INSERT INTO categories (name, type) VALUES ('Mercado', 'expense')");
    driver.run(
      "INSERT INTO transactions (account_id, category_id, type, amount_cents, transaction_date, created_at, updated_at) VALUES (1, 1, 'expense', 1000, '2026-01-02', 'x', 'x')",
    );

    const repo = createFinanceRepository(openDatabase(driver));

    expect(repo.listAccounts()).toMatchObject([{ id: 1, name: "Antiga", type: "credit_card", openingBalanceCents: -5000, isActive: true }]);
    expect(repo.listTransactions()).toMatchObject([{ accountName: "Antiga", amountCents: 1000 }]);
    expect(repo.getBalance(1)).toBe(-6000);
    expect(driver.all("PRAGMA foreign_key_check")).toEqual([]);
    expect(() => repo.deleteAccount(1)).toThrow(/arquive/i);
  });
});

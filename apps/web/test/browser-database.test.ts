import initSqlJs from "sql.js";
import { CURRENT_SCHEMA_VERSION, openDatabase } from "@finance/database";
import { sqljsDriver } from "@finance/database/sqljs";
import { describe, expect, it } from "vitest";
import { createEmptyDatabase, openDatabaseFromBytes } from "../src/lib/browser-database";

const SQL = await initSqlJs();

describe("browser database file handling", () => {
  it("creates an empty database with the default categories", () => {
    const db = createEmptyDatabase(SQL);
    expect(db.repo.listCategories().some((c) => c.name === "Mercado")).toBe(true);
    expect(db.repo.listAccounts()).toEqual([]);
  });

  it("keeps changes through export and reopen", () => {
    const db = createEmptyDatabase(SQL);
    const account = db.repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 1000 });
    const market = db.repo.listCategories().find((c) => c.name === "Mercado");
    if (!market) throw new Error("categoria padrão ausente");
    db.repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "expense", amountCents: 250, date: "2026-03-10" });

    const reopened = openDatabaseFromBytes(SQL, db.exportBytes());

    expect(reopened.repo.getTotalBalance()).toBe(750);
    expect(reopened.repo.listTransactions()).toHaveLength(1);
  });

  it("rejects a file that is not SQLite with a friendly message", () => {
    const bytes = new TextEncoder().encode("isto não é um banco de dados");
    expect(() => openDatabaseFromBytes(SQL, bytes)).toThrow(/não é um banco SQLite/i);
  });

  it("rejects a SQLite file from another application", () => {
    const other = new SQL.Database();
    other.run("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)");
    expect(() => openDatabaseFromBytes(SQL, other.export())).toThrow(/compatível/i);
  });

  it("rejects a database created by a newer version of the app", () => {
    const raw = new SQL.Database();
    const driver = sqljsDriver(raw);
    openDatabase(driver);
    driver.run("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", [CURRENT_SCHEMA_VERSION + 1, "2099-01-01T00:00:00Z"]);
    expect(() => openDatabaseFromBytes(SQL, raw.export())).toThrow(/mais nova/i);
  });

  it("rejects a file above the size limit before reading it", () => {
    const big = new Uint8Array(2048);
    expect(() => openDatabaseFromBytes(SQL, big, { maxBytes: 1024 })).toThrow(/limite/i);
  });
});

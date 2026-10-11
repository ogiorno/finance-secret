import Database from "better-sqlite3";
import initSqlJs from "sql.js";
import { betterSqlite3Driver } from "../src/drivers/better-sqlite3";
import { sqljsDriver } from "../src/drivers/sqljs";
import type { Driver } from "../src/driver";

const SQL = await initSqlJs();

/** Mesma suíte, os dois drivers (ADR 0001). */
export const drivers: { name: string; create: () => Driver }[] = [
  { name: "sql.js", create: () => sqljsDriver(new SQL.Database()) },
  { name: "better-sqlite3", create: () => betterSqlite3Driver(new Database(":memory:")) },
];

import type { Database } from "better-sqlite3";
import type { Driver, RunResult, SqlValue } from "../driver";
import { createTransactionRunner } from "./transaction";

/** Adaptador para better-sqlite3 (servidor). Recebe a instância já criada. */
export function betterSqlite3Driver(db: Database): Driver {
  const exec = (sql: string) => void db.exec(sql);
  return {
    exec,
    run(sql: string, params: SqlValue[] = []): RunResult {
      const result = db.prepare(sql).run(...params);
      return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
    },
    all<T extends object>(sql: string, params: SqlValue[] = []): T[] {
      return db.prepare(sql).all(...params) as T[];
    },
    transaction: createTransactionRunner(exec),
  };
}

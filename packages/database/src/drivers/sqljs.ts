import type { Database } from "sql.js";
import type { Driver, RunResult, SqlValue } from "../driver";
import { createTransactionRunner } from "./transaction";

/** Adaptador para sql.js (navegador). Recebe a instância já criada. */
export function sqljsDriver(db: Database): Driver {
  const exec = (sql: string) => void db.exec(sql);
  return {
    exec,
    run(sql: string, params: SqlValue[] = []): RunResult {
      db.run(sql, params);
      const changes = db.getRowsModified();
      const rowid = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0];
      return { changes, lastInsertRowid: Number(rowid ?? 0) };
    },
    all<T extends object>(sql: string, params: SqlValue[] = []): T[] {
      const statement = db.prepare(sql);
      try {
        statement.bind(params);
        const rows: T[] = [];
        while (statement.step()) rows.push(statement.getAsObject() as T);
        return rows;
      } finally {
        statement.free();
      }
    },
    transaction: createTransactionRunner(exec),
  };
}

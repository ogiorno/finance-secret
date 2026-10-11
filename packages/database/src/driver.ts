export type SqlValue = string | number | null | Uint8Array;

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

/**
 * Interface mínima de driver SQLite (ADR 0001). Todo o SQL do projeto é escrito
 * contra ela; sql.js e better-sqlite3 têm um adaptador cada.
 */
export interface Driver {
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): RunResult;
  all<T extends object>(sql: string, params?: SqlValue[]): T[];
  /** Executa `fn` atomicamente; aninhamento usa savepoints. Erro lançado desfaz tudo. */
  transaction<T>(fn: () => T): T;
}

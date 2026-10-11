import { createFinanceRepository, openDatabase, type FinanceRepository } from "@finance/database";
import { sqljsDriver } from "@finance/database/sqljs";
import type { SqlJsStatic } from "sql.js";

/** Limite padrão para importar um .db (configurável pelo chamador). */
export const DEFAULT_MAX_IMPORT_BYTES = 50 * 1024 * 1024;

const SQLITE_HEADER = "SQLite format 3\0";

export interface BrowserDatabase {
  repo: FinanceRepository;
  /** Cópia serializada do banco em memória, pronta para baixar como .db. */
  exportBytes(): Uint8Array;
}

function wrap(SQL: SqlJsStatic, bytes?: Uint8Array): BrowserDatabase {
  const raw = bytes ? new SQL.Database(bytes) : new SQL.Database();
  try {
    const repo = createFinanceRepository(openDatabase(sqljsDriver(raw)));
    return { repo, exportBytes: () => raw.export() };
  } catch (error) {
    raw.close();
    throw error;
  }
}

/** Banco novo, vazio, com as categorias padrão. */
export function createEmptyDatabase(SQL: SqlJsStatic): BrowserDatabase {
  const db = wrap(SQL);
  db.repo.seedDefaultCategories();
  return db;
}

/**
 * Abre um .db escolhido pelo usuário. Qualquer problema vira um erro com mensagem
 * em português; o chamador só troca o banco atual se esta função retornar.
 */
export function openDatabaseFromBytes(
  SQL: SqlJsStatic,
  bytes: Uint8Array,
  options: { maxBytes?: number } = {},
): BrowserDatabase {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_IMPORT_BYTES;
  if (bytes.byteLength > maxBytes) {
    throw new Error(`O arquivo é maior que o limite de importação (${Math.round(maxBytes / (1024 * 1024))} MB).`);
  }
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, SQLITE_HEADER.length));
  if (header !== SQLITE_HEADER) {
    throw new Error("O arquivo não é um banco SQLite válido.");
  }
  return wrap(SQL, bytes);
}

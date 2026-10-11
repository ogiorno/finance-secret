import type { FinanceRepository } from "@finance/database";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { createEmptyDatabase, openDatabaseFromBytes, type BrowserDatabase } from "./browser-database";

/**
 * Estado do banco aberto no navegador (Offline mode).
 * `revision` muda a cada alteração para as telas recalcularem seus dados.
 */
class Session {
  #sql: SqlJsStatic | null = null;
  #db = $state.raw<BrowserDatabase | null>(null);
  revision = $state(0);
  /** Há alterações ainda não exportadas. */
  dirty = $state(false);
  busy = $state(false);
  error = $state<string | null>(null);
  fileName = $state("financas.db");

  get repo(): FinanceRepository | null {
    return this.#db?.repo ?? null;
  }

  get isOpen(): boolean {
    return this.#db !== null;
  }

  async #engine(): Promise<SqlJsStatic> {
    this.#sql ??= await initSqlJs({ locateFile: () => wasmUrl });
    return this.#sql;
  }

  async #replace(open: (SQL: SqlJsStatic) => BrowserDatabase | Promise<BrowserDatabase>, fileName: string) {
    this.busy = true;
    this.error = null;
    try {
      const next = await open(await this.#engine());
      this.#db = next;
      this.fileName = fileName;
      this.dirty = false;
      this.revision++;
    } catch (error) {
      // O banco atual continua intacto: só trocamos quando a abertura dá certo.
      this.error = error instanceof Error ? error.message : "Não foi possível abrir o arquivo.";
    } finally {
      this.busy = false;
    }
  }

  createNew() {
    return this.#replace((SQL) => createEmptyDatabase(SQL), "financas.db");
  }

  async openFile(file: File) {
    await this.#replace(async (SQL) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      return openDatabaseFromBytes(SQL, bytes);
    }, file.name);
  }

  openDemo() {
    return this.#replace(async (SQL) => {
      const response = await fetch("/demo.db");
      if (!response.ok) throw new Error("Não foi possível carregar o banco de demonstração.");
      return openDatabaseFromBytes(SQL, new Uint8Array(await response.arrayBuffer()));
    }, "demo.db");
  }

  /** Executa uma alteração e marca o banco como modificado. */
  change<T>(action: (repo: FinanceRepository) => T): T {
    if (!this.#db) throw new Error("Nenhum banco aberto.");
    const result = action(this.#db.repo);
    this.dirty = true;
    this.revision++;
    return result;
  }

  /** Baixa o banco atual como arquivo .db. */
  exportFile() {
    if (!this.#db) return;
    const bytes = this.#db.exportBytes();
    const blob = new Blob([bytes.slice().buffer], { type: "application/vnd.sqlite3" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = this.fileName.endsWith(".db") ? this.fileName : `${this.fileName}.db`;
    link.click();
    URL.revokeObjectURL(url);
    this.dirty = false;
  }
}

export const session = new Session();

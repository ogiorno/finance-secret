import type { FinanceRepository, TransactionListItem } from "@finance/database";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { toast } from "@finance/ui";
import { createEmptyDatabase, openDatabaseFromBytes, type BrowserDatabase } from "./browser-database";

/** Estado do banco aberto no navegador (Offline mode). */
class Session {
  #sql: SqlJsStatic | null = null;
  #db = $state.raw<BrowserDatabase | null>(null);
  revision = $state(0);
  dirty = $state(false);
  busy = $state(false);
  error = $state<string | null>(null);
  fileName = $state("financas.db");
  pendingDeleteId = $state<number | null>(null);
  pendingDeleteGroupId = $state<number | null>(null);
  #pendingDone: Promise<void> | null = null;
  #finishPending: (() => void) | null = null;

  get repo(): FinanceRepository | null { return this.#db?.repo ?? null; }
  get isOpen(): boolean { return this.#db !== null; }

  async #engine(): Promise<SqlJsStatic> {
    this.#sql ??= await initSqlJs({ locateFile: () => wasmUrl });
    return this.#sql;
  }

  async #replace(open: (SQL: SqlJsStatic) => BrowserDatabase | Promise<BrowserDatabase>, fileName: string) {
    if (this.busy) return;
    this.busy = true;
    if (this.#pendingDone) await this.#pendingDone;
    this.error = null;
    try {
      const next = await open(await this.#engine());
      this.#db = next;
      this.fileName = fileName;
      this.dirty = false;
      this.revision++;
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Não foi possível abrir o arquivo.";
    } finally {
      this.busy = false;
    }
  }

  createNew() { return this.#replace((SQL) => createEmptyDatabase(SQL), "financas.db"); }

  async openFile(file: File) {
    await this.#replace(async (SQL) => openDatabaseFromBytes(SQL, new Uint8Array(await file.arrayBuffer())), file.name);
  }

  openDemo() {
    return this.#replace(async (SQL) => {
      const response = await fetch("/demo.db");
      if (!response.ok) throw new Error("Não foi possível carregar o banco de demonstração.");
      return openDatabaseFromBytes(SQL, new Uint8Array(await response.arrayBuffer()));
    }, "demo.db");
  }

  change<T>(action: (repo: FinanceRepository) => T): T {
    if (!this.#db) throw new Error("Nenhum banco aberto.");
    const result = action(this.#db.repo);
    this.dirty = true;
    this.revision++;
    return result;
  }

  /** Mantém a linha visível por cinco segundos; transferência é excluída como uma unidade. */
  scheduleDelete(item: TransactionListItem) {
    if (this.pendingDeleteId !== null) return;
    this.pendingDeleteId = item.id;
    this.pendingDeleteGroupId = item.transferGroupId;
    this.#pendingDone = new Promise<void>((resolve) => { this.#finishPending = resolve; });
    toast.show({
      message: item.transferGroupId === null ? "Lançamento será excluído." : "Transferência será excluída (as duas pontas).",
      duration: 5000,
      action: { label: "Desfazer", onclick: () => this.#completePending(false) },
      onclose: (reason) => { if (reason !== "action") this.#completePending(true); },
    });
  }

  #completePending(shouldDelete: boolean) {
    const id = this.pendingDeleteId;
    if (id === null) return;
    this.pendingDeleteId = null;
    this.pendingDeleteGroupId = null;
    if (shouldDelete) {
      try { this.change((repo) => repo.deleteTransaction(id)); }
      catch (error) {
        toast.show({ message: error instanceof Error ? error.message : "Não foi possível excluir.", tone: "destructive", duration: 0 });
      }
    }
    this.#finishPending?.();
    this.#finishPending = null;
    this.#pendingDone = null;
  }

  /** Aguarda uma exclusão pendente para que o arquivo reflita exatamente o estado mostrado. */
  async exportFile() {
    if (this.#pendingDone) await this.#pendingDone;
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

import type { FinanceRepository, TransactionListItem } from "@finance/database";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { toast } from "@finance/ui";
import { createEmptyDatabase, openDatabaseFromBytes, type BrowserDatabase } from "./browser-database";
import { compareDatabases, summarizeDatabase, type DatabaseDiff } from "./database-diff";
import { clearDatabase, loadDatabase, saveDatabase } from "./persist";

/** Espera depois da última alteração antes de gravar no navegador, para juntar várias de uma vez. */
const PERSIST_DELAY_MS = 250;

/** Um arquivo escolhido que ainda espera a pessoa confirmar a troca do banco aberto. */
export interface PendingImport {
  fileName: string;
  currentName: string;
  /** O arquivo novo tem o mesmo nome do banco que já está na plataforma. */
  sameName: boolean;
  /** O banco atual tem alterações que nunca viraram arquivo. */
  currentDirty: boolean;
  diff: DatabaseDiff;
  bytes: Uint8Array;
}

/** Estado do banco aberto no navegador (Offline mode). */
class Session {
  #sql: SqlJsStatic | null = null;
  #db = $state.raw<BrowserDatabase | null>(null);
  revision = $state(0);
  dirty = $state(false);
  busy = $state(false);
  error = $state<string | null>(null);
  /** O navegador não deixou guardar o banco (modo privado, sem espaço): atualizar a página perde as alterações. */
  persistFailed = $state(false);
  #persistTimer: ReturnType<typeof setTimeout> | null = null;
  #restored = false;
  pendingImport = $state.raw<PendingImport | null>(null);
  #isDemo = false;
  /** A pessoa apagou a cópia guardada: não grava de novo até abrir outro banco. */
  #savingOff = false;
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

  async #replace(
    open: (SQL: SqlJsStatic) => BrowserDatabase | Promise<BrowserDatabase>,
    fileName: string,
    options: { storage?: "save" | "keep" | "forget"; dirty?: boolean } = {},
  ) {
    if (this.busy) return;
    this.busy = true;
    if (this.#pendingDone) await this.#pendingDone;
    this.error = null;
    try {
      const next = await open(await this.#engine());
      this.#db = next;
      this.fileName = fileName;
      this.dirty = options.dirty ?? false;
      this.revision++;
      this.#isDemo = options.storage === "forget";
      this.#savingOff = false;
      if (options.storage === "keep") this.#cancelPersist();
      else if (options.storage === "forget") await this.#forget();
      else await this.#persist();
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

  /**
   * Escolher um arquivo com um banco já aberto não troca nada de imediato: guarda o arquivo, compara com o que
   * está na plataforma e espera `confirmImport`. Sem banco aberto (ou só a demonstração), abre direto.
   */
  async stageFile(file: File) {
    if (!this.#db || this.#isDemo) return this.openFile(file);
    if (this.busy) return;
    this.error = null;
    let incoming: BrowserDatabase | null = null;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      incoming = openDatabaseFromBytes(await this.#engine(), bytes);
      this.pendingImport = {
        fileName: file.name,
        currentName: this.fileName,
        sameName: file.name === this.fileName,
        currentDirty: this.dirty,
        diff: compareDatabases(summarizeDatabase(this.#db.repo), summarizeDatabase(incoming.repo)),
        bytes,
      };
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : "Não foi possível abrir o arquivo.", tone: "destructive", duration: 0 });
    } finally {
      incoming?.close();
    }
  }

  async confirmImport() {
    const pending = this.pendingImport;
    if (!pending) return;
    this.pendingImport = null;
    await this.#replace((SQL) => openDatabaseFromBytes(SQL, pending.bytes), pending.fileName);
  }

  cancelImport() {
    this.pendingImport = null;
  }

  openDemo() {
    return this.#replace(async (SQL) => {
      const response = await fetch("/demo.db");
      if (!response.ok) throw new Error("Não foi possível carregar o banco de demonstração.");
      return openDatabaseFromBytes(SQL, new Uint8Array(await response.arrayBuffer()));
    }, "demo.db", { storage: "forget" });
  }

  /** Reabre o banco guardado no navegador, se houver. Roda uma vez, quando a página carrega. */
  async restore() {
    if (this.#restored || this.#db) return;
    this.#restored = true;
    try {
      const saved = await loadDatabase();
      if (!saved || this.#db) return;
      await this.#replace((SQL) => openDatabaseFromBytes(SQL, saved.bytes), saved.fileName, { dirty: saved.dirty, storage: "keep" });
    } catch {
      // Sem armazenamento ou cópia ilegível: a pessoa começa pela tela inicial.
    }
  }

  /** Grava já a cópia pendente (a página está sendo fechada ou escondida). */
  flush() {
    if (this.#persistTimer === null) return;
    void this.#persist();
  }

  #schedulePersist() {
    this.#cancelPersist();
    this.#persistTimer = setTimeout(() => void this.#persist(), PERSIST_DELAY_MS);
  }

  #cancelPersist() {
    if (this.#persistTimer !== null) clearTimeout(this.#persistTimer);
    this.#persistTimer = null;
  }

  async #persist() {
    this.#cancelPersist();
    if (!this.#db || this.#savingOff) return;
    try {
      await saveDatabase({ fileName: this.fileName, bytes: this.#db.exportBytes(), dirty: this.dirty });
      this.persistFailed = false;
    } catch {
      this.persistFailed = true;
    }
  }

  /** Apaga a cópia do navegador; o banco aberto segue na tela, mas deixa de ser guardado. */
  async clearSaved() {
    this.#savingOff = true;
    this.persistFailed = false;
    await this.#forget();
  }

  /** A demonstração não é guardada, e abri-la esquece a cópia anterior para a página não voltar a ela. */
  async #forget() {
    this.#cancelPersist();
    try {
      await clearDatabase();
    } catch {
      // Nada guardado a esquecer.
    }
  }

  change<T>(action: (repo: FinanceRepository) => T): T {
    if (!this.#db) throw new Error("Nenhum banco aberto.");
    const result = action(this.#db.repo);
    this.dirty = true;
    this.revision++;
    if (!this.#isDemo) this.#schedulePersist();
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
    if (!this.#isDemo) await this.#persist();
  }
}

export const session = new Session();

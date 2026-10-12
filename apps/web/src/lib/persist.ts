/**
 * Guarda a cópia do banco aberto no IndexedDB do navegador, para a página poder ser atualizada sem perder nada.
 * Um único registro (o arquivo do SQLite, algumas dezenas de KB); localStorage não serve por causa do tamanho e do texto.
 */
const DB_NAME = "finance-secret";
const STORE = "database";
const KEY = "current";

export interface SavedDatabase {
  fileName: string;
  bytes: Uint8Array;
  /** Se havia alterações ainda não exportadas para arquivo. */
  dirty: boolean;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponível."));
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao gravar no navegador."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Gravação cancelada pelo navegador."));
    });
  } finally {
    db.close();
  }
}

export async function saveDatabase(saved: SavedDatabase): Promise<void> {
  await run("readwrite", (store) => store.put(saved, KEY));
}

export async function loadDatabase(): Promise<SavedDatabase | null> {
  const found = await run<SavedDatabase | undefined>("readonly", (store) => store.get(KEY));
  return found && found.bytes instanceof Uint8Array ? found : null;
}

export async function clearDatabase(): Promise<void> {
  await run("readwrite", (store) => store.delete(KEY));
}

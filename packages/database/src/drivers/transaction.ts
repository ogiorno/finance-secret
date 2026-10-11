/** Transação com savepoints, compartilhada pelos adaptadores para terem a mesma semântica. */
export function createTransactionRunner(exec: (sql: string) => void) {
  let depth = 0;
  return function transaction<T>(fn: () => T): T {
    const savepoint = `sp_${depth}`;
    exec(depth === 0 ? "BEGIN" : `SAVEPOINT ${savepoint}`);
    depth++;
    try {
      const result = fn();
      depth--;
      exec(depth === 0 ? "COMMIT" : `RELEASE ${savepoint}`);
      return result;
    } catch (error) {
      depth--;
      exec(depth === 0 ? "ROLLBACK" : `ROLLBACK TO ${savepoint}`);
      if (depth > 0) exec(`RELEASE ${savepoint}`);
      throw error;
    }
  };
}

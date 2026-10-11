import type { Driver } from "./driver";
import { CURRENT_SCHEMA_VERSION, migrations } from "./migrations";

export interface FinanceDatabase {
  driver: Driver;
  schemaVersion: number;
}

/** Abre o banco, aplica migrations pendentes e recusa bancos de uma versão mais nova do app. */
export function openDatabase(driver: Driver): FinanceDatabase {
  const tables = driver
    .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .map((row) => row.name);
  if (tables.length > 0 && !tables.includes("schema_migrations")) {
    throw new Error("Este arquivo SQLite não é um banco compatível com o aplicativo.");
  }

  driver.exec("PRAGMA foreign_keys = ON");
  driver.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");

  const [row] = driver.all<{ version: number | null }>("SELECT MAX(version) AS version FROM schema_migrations");
  const stored = row?.version ?? 0;

  if (stored > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Este banco foi criado por uma versão mais nova do aplicativo (schema ${stored}; esta versão entende até ${CURRENT_SCHEMA_VERSION}). Atualize o aplicativo.`,
    );
  }

  for (const migration of migrations.filter((m) => m.version > stored)) {
    driver.transaction(() => {
      driver.exec(migration.sql);
      driver.run("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", [
        migration.version,
        new Date().toISOString(),
      ]);
    });
  }

  return { driver, schemaVersion: CURRENT_SCHEMA_VERSION };
}

export interface Migration {
  version: number;
  sql: string;
}

/** Migration 001: núcleo financeiro (contas, categorias, lançamentos). Valores em centavos, só BRL. */
const m001 = `
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'cash', 'wallet', 'credit_card', 'loan')),
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT,
  icon TEXT,
  parent_id INTEGER REFERENCES categories (id),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts (id),
  category_id INTEGER REFERENCES categories (id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  transaction_date TEXT NOT NULL CHECK (transaction_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('pending', 'posted')),
  transfer_group_id INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (type IN ('income', 'expense') AND amount_cents > 0 AND category_id IS NOT NULL AND transfer_group_id IS NULL)
    OR (type = 'transfer' AND amount_cents <> 0 AND category_id IS NULL AND transfer_group_id IS NOT NULL)
  )
);

CREATE INDEX idx_transactions_date ON transactions (transaction_date);
CREATE INDEX idx_transactions_account_date ON transactions (account_id, transaction_date);
CREATE INDEX idx_transactions_transfer_group ON transactions (transfer_group_id);
`;

export const migrations: Migration[] = [{ version: 1, sql: m001 }];

export const CURRENT_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

export interface Migration {
  version: number;
  sql: string;
  /** Recria tabelas referenciadas por outras: o runner desliga as chaves estrangeiras durante a migration. */
  rebuildsTables?: boolean;
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

/**
 * Migration 002: tipos de conta editáveis. O CHECK fixo de `accounts.type` vira uma chave estrangeira para
 * `account_types`, que o usuário pode estender (vale-alimentação, vale-refeição...). Recria `accounts`.
 */
const m002 = `
CREATE TABLE account_types (
  key TEXT PRIMARY KEY CHECK (length(trim(key)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  is_liability INTEGER NOT NULL DEFAULT 0 CHECK (is_liability IN (0, 1)),
  tracks_usage INTEGER NOT NULL DEFAULT 0 CHECK (tracks_usage IN (0, 1)),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

INSERT INTO account_types (key, name, is_liability, tracks_usage, is_system) VALUES
  ('checking', 'Conta corrente', 0, 0, 1),
  ('savings', 'Poupança', 0, 0, 1),
  ('cash', 'Dinheiro', 0, 0, 1),
  ('wallet', 'Carteira', 0, 0, 1),
  ('credit_card', 'Cartão de crédito', 1, 0, 1),
  ('loan', 'Empréstimo', 1, 0, 1),
  ('meal_voucher', 'Vale-alimentação', 0, 1, 1);

CREATE TABLE accounts_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  type TEXT NOT NULL REFERENCES account_types (key),
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
);

INSERT INTO accounts_new (id, name, type, opening_balance_cents, currency, is_active, created_at)
  SELECT id, name, type, opening_balance_cents, currency, is_active, created_at FROM accounts;

DROP TABLE accounts;
ALTER TABLE accounts_new RENAME TO accounts;
`;
export const migrations: Migration[] = [{ version: 1, sql: m001 }, { version: 2, sql: m002, rebuildsTables: true }];

export const CURRENT_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

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

/**
 * Migration 003: categoria de sistema "Sem categoria", uma para despesa e outra para receita. Recebe o lançamento
 * quando o usuário não escolhe categoria; não pode ser apagada nem arquivada.
 */
const m003 = `
ALTER TABLE categories ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1));

INSERT INTO categories (name, type, is_system)
  SELECT 'Sem categoria', 'expense', 1
   WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_system = 1 AND type = 'expense');
INSERT INTO categories (name, type, is_system)
  SELECT 'Sem categoria', 'income', 1
   WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_system = 1 AND type = 'income');
`;

/**
 * Migration 004: método de pagamento (opcional, com padrão por tipo de conta) e marca de despesa Extra.
 * O método descreve e filtra; nunca altera saldos.
 */
const m004 = `
ALTER TABLE account_types ADD COLUMN default_payment_method TEXT
  CHECK (default_payment_method IS NULL OR default_payment_method IN ('debit', 'credit', 'pix', 'boleto', 'meal_voucher', 'cash', 'other'));

UPDATE account_types SET default_payment_method = 'debit' WHERE key = 'checking';
UPDATE account_types SET default_payment_method = 'credit' WHERE key = 'credit_card';
UPDATE account_types SET default_payment_method = 'meal_voucher' WHERE key = 'meal_voucher';
UPDATE account_types SET default_payment_method = 'cash' WHERE key = 'cash';

ALTER TABLE transactions ADD COLUMN payment_method TEXT
  CHECK (payment_method IS NULL OR payment_method IN ('debit', 'credit', 'pix', 'boleto', 'meal_voucher', 'cash', 'other'));
ALTER TABLE transactions ADD COLUMN is_extra INTEGER NOT NULL DEFAULT 0 CHECK (is_extra IN (0, 1));
`;

/**
 * Migration 005: contas recorrentes. Uma conta recorrente descreve o que se repete (valor esperado por vigência,
 * vencimento, Category); só vira Transaction quando o usuário a marca como paga (`bill_payments`).
 */
const m005 = `
CREATE TABLE recurring_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  due_month INTEGER CHECK (due_month IS NULL OR due_month BETWEEN 1 AND 12),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  classification TEXT NOT NULL CHECK (classification IN ('fixed', 'discretionary')),
  default_account_id INTEGER REFERENCES accounts (id),
  start_period TEXT NOT NULL CHECK (start_period GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  CHECK ((frequency = 'yearly') = (due_month IS NOT NULL))
);

CREATE TABLE recurring_bill_amounts (
  bill_id INTEGER NOT NULL REFERENCES recurring_bills (id) ON DELETE CASCADE,
  effective_period TEXT NOT NULL CHECK (effective_period GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  PRIMARY KEY (bill_id, effective_period)
);

CREATE TABLE bill_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES recurring_bills (id),
  period TEXT NOT NULL CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions (id) ON DELETE CASCADE,
  UNIQUE (bill_id, period)
);
`;

/**
 * Migration 006: itens de uma Transaction (produto, quantidade, preço). Quantidade em milésimos e valores em
 * centavos, sempre inteiros. Os itens saem junto com a Transaction.
 */
const m006 = `
CREATE TABLE transaction_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  quantity_milli INTEGER NOT NULL CHECK (quantity_milli > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0)
);
CREATE INDEX idx_transaction_items_transaction ON transaction_items (transaction_id, position);
`;

/**
 * Migration 007: fontes de renda e receitas recorrentes. Uma Fonte diz de quem ou de onde vem uma renda (Eu, Esposa...);
 * toda receita aponta para uma. A receita recorrente espelha a conta recorrente: só vira Transaction quando recebida.
 */
const m007 = `
CREATE TABLE income_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);
CREATE UNIQUE INDEX idx_income_sources_name ON income_sources (lower(name));
INSERT INTO income_sources (name, is_default) VALUES ('Eu', 1);

ALTER TABLE transactions ADD COLUMN source_id INTEGER REFERENCES income_sources (id);
UPDATE transactions SET source_id = (SELECT id FROM income_sources WHERE is_default = 1) WHERE type = 'income';
CREATE INDEX idx_transactions_source ON transactions (source_id);

CREATE TABLE recurring_incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  due_month INTEGER CHECK (due_month IS NULL OR due_month BETWEEN 1 AND 12),
  source_id INTEGER NOT NULL REFERENCES income_sources (id),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  default_account_id INTEGER REFERENCES accounts (id),
  start_period TEXT NOT NULL CHECK (start_period GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  CHECK ((frequency = 'yearly') = (due_month IS NOT NULL))
);

CREATE TABLE recurring_income_amounts (
  income_id INTEGER NOT NULL REFERENCES recurring_incomes (id) ON DELETE CASCADE,
  effective_period TEXT NOT NULL CHECK (effective_period GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  PRIMARY KEY (income_id, effective_period)
);

CREATE TABLE income_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  income_id INTEGER NOT NULL REFERENCES recurring_incomes (id),
  period TEXT NOT NULL CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions (id) ON DELETE CASCADE,
  UNIQUE (income_id, period)
);
`;

/**
 * Migration 008: metas (caixinhas). Uma meta reserva dinheiro sem movê-lo: o aporte (`goal_contributions`) não é uma
 * Transaction e não mexe em Account, saldo, receita nem despesa.
 */
const m008 = `
CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  target_cents INTEGER CHECK (target_cents IS NULL OR target_cents > 0),
  target_date TEXT CHECK (target_date IS NULL OR target_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'executed', 'archived')),
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_goals_name ON goals (lower(name));

CREATE TABLE goal_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals (id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  contribution_date TEXT NOT NULL CHECK (contribution_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_goal_contributions_goal ON goal_contributions (goal_id, contribution_date);
`;

/**
 * Migration 009: dia em que a fatura do cartão vira. Tipos de conta que têm fatura (o cartão de crédito de fábrica e os
 * personalizados que o usuário marcar) guardam o dia de fechamento em cada conta; novos e antigos começam no dia 1.
 */
const m009 = `
ALTER TABLE account_types ADD COLUMN has_closing_day INTEGER NOT NULL DEFAULT 0 CHECK (has_closing_day IN (0, 1));
UPDATE account_types SET has_closing_day = 1 WHERE key = 'credit_card';

ALTER TABLE accounts ADD COLUMN closing_day INTEGER CHECK (closing_day IS NULL OR closing_day BETWEEN 1 AND 31);
UPDATE accounts SET closing_day = 1 WHERE type IN (SELECT key FROM account_types WHERE has_closing_day = 1);
`;

export const migrations: Migration[] = [
  { version: 1, sql: m001 },
  { version: 2, sql: m002, rebuildsTables: true },
  { version: 3, sql: m003 },
  { version: 4, sql: m004 },
  { version: 5, sql: m005 },
  { version: 6, sql: m006 },
  { version: 7, sql: m007 },
  { version: 8, sql: m008 },
  { version: 9, sql: m009 },
];

export const CURRENT_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

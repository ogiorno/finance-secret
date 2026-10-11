import { buildTransfer, validateTransaction, type CategoryType } from "@finance/core";
import type { Driver, SqlValue } from "./driver";
import type { FinanceDatabase } from "./open";

export type AccountType = "checking" | "savings" | "cash" | "wallet" | "credit_card" | "loan";
export type TransactionStatus = "pending" | "posted";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  openingBalanceCents: number;
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  parentId: number | null;
}

export interface Transaction {
  id: number;
  accountId: number;
  categoryId: number;
  type: CategoryType;
  amountCents: number;
  description: string;
  date: string;
  status: TransactionStatus;
}

export interface NewAccount {
  name: string;
  type: AccountType;
  openingBalanceCents?: number;
}

export interface NewCategory {
  name: string;
  type: CategoryType;
  parentId?: number;
}

export interface NewIncomeOrExpense {
  accountId: number;
  categoryId: number;
  type: CategoryType;
  amountCents: number;
  /** Data local, YYYY-MM-DD. */
  date: string;
  description?: string;
  status?: TransactionStatus;
}

export interface NewTransfer {
  fromAccountId: number;
  toAccountId: number;
  amountCents: number;
  /** Data local, YYYY-MM-DD. */
  date: string;
  description?: string;
}

export interface TransferLegRecord {
  id: number;
  accountId: number;
  /** Com sinal: saída negativa, entrada positiva. */
  amountCents: number;
}

export interface Transfer {
  groupId: number;
  /** Saída primeiro, entrada depois. */
  legs: [TransferLegRecord, TransferLegRecord];
}

export interface MonthSummary {
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
}

export interface CategorySpend {
  categoryId: number;
  name: string;
  totalCents: number;
}

export interface TransactionListItem {
  id: number;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;
  type: "income" | "expense" | "transfer";
  /** Positivo para receita e despesa; com sinal para pernas de transferência. */
  amountCents: number;
  description: string;
  date: string;
  status: TransactionStatus;
  transferGroupId: number | null;
}

export interface TransactionFilter {
  /** `YYYY-MM`. */
  month?: string;
  accountId?: number;
  limit?: number;
}

export const DEFAULT_CATEGORIES: { name: string; type: CategoryType; children?: string[] }[] = [
  { name: "Moradia", type: "expense", children: ["Aluguel", "Condomínio", "Contas de casa"] },
  { name: "Mercado", type: "expense" },
  { name: "Restaurantes", type: "expense" },
  { name: "Transporte", type: "expense" },
  { name: "Saúde", type: "expense" },
  { name: "Educação", type: "expense" },
  { name: "Lazer", type: "expense" },
  { name: "Outras despesas", type: "expense" },
  { name: "Salário", type: "income" },
  { name: "Rendimentos", type: "income" },
  { name: "Outras receitas", type: "income" },
];

export interface FinanceRepository {
  createAccount(input: NewAccount): Account;
  createCategory(input: NewCategory): Category;
  addTransaction(input: NewIncomeOrExpense): Transaction;
  addTransfer(input: NewTransfer): Transfer;
  /** Remove o lançamento; para transferência, remove as duas pernas. */
  deleteTransaction(id: number): void;
  /** Receitas e despesas `posted` de um mês `YYYY-MM`; transferências nunca entram. */
  getMonthSummary(month: string): MonthSummary;
  /** Contas ativas, na ordem de criação. */
  listAccounts(): Account[];
  /** Categorias ativas. */
  listCategories(): Category[];
  /** Cria as categorias padrão em PT-BR, só se ainda não houver nenhuma. */
  seedDefaultCategories(): void;
  /** Soma dos saldos das contas ativas (cartões e empréstimos entram negativos). */
  getTotalBalance(): number;
  /** Despesas `posted` do mês, agrupadas pela categoria de nível superior, maiores primeiro. */
  getExpensesByCategory(month: string): CategorySpend[];
  /** Lançamentos mais recentes primeiro (data, depois id). */
  listTransactions(filter?: TransactionFilter): TransactionListItem[];
  /** Saldo = saldo inicial + lançamentos `posted` (transferências com sinal). */
  getBalance(accountId: number): number;
}

export function createFinanceRepository({ driver }: FinanceDatabase): FinanceRepository {
  return new SqlFinanceRepository(driver);
}

class SqlFinanceRepository implements FinanceRepository {
  constructor(private readonly db: Driver) {}

  createAccount(input: NewAccount): Account {
    const openingBalanceCents = input.openingBalanceCents ?? 0;
    const { lastInsertRowid } = this.db.run(
      "INSERT INTO accounts (name, type, opening_balance_cents, created_at) VALUES (?, ?, ?, ?)",
      [input.name, input.type, openingBalanceCents, new Date().toISOString()],
    );
    return { id: lastInsertRowid, name: input.name, type: input.type, openingBalanceCents };
  }

  createCategory(input: NewCategory): Category {
    const parentId = input.parentId ?? null;
    if (parentId !== null) {
      const parent = this.db.all<{ type: CategoryType; parent_id: number | null }>(
        "SELECT type, parent_id FROM categories WHERE id = ?",
        [parentId],
      )[0];
      if (!parent) throw new Error("Categoria-pai não encontrada.");
      if (parent.parent_id !== null) throw new Error("Subcategoria não pode ter subcategorias (máximo de dois níveis).");
      if (parent.type !== input.type) throw new Error("O tipo da subcategoria deve ser o mesmo da categoria-pai.");
    }
    const { lastInsertRowid } = this.db.run("INSERT INTO categories (name, type, parent_id) VALUES (?, ?, ?)", [
      input.name,
      input.type,
      parentId,
    ]);
    return { id: lastInsertRowid, name: input.name, type: input.type, parentId };
  }

  addTransaction(input: NewIncomeOrExpense): Transaction {
    const category = this.db.all<{ type: CategoryType }>("SELECT type FROM categories WHERE id = ?", [input.categoryId])[0];
    if (!category) throw new Error("Categoria não encontrada.");
    validateTransaction(input, category.type);
    this.requireAccount(input.accountId);

    const now = new Date().toISOString();
    const description = input.description ?? "";
    const status = input.status ?? "posted";
    const { lastInsertRowid } = this.db.run(
      `INSERT INTO transactions
         (account_id, category_id, type, amount_cents, description, transaction_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.accountId, input.categoryId, input.type, input.amountCents, description, input.date, status, now, now],
    );
    return {
      id: lastInsertRowid,
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amountCents: input.amountCents,
      description,
      date: input.date,
      status,
    };
  }

  addTransfer(input: NewTransfer): Transfer {
    const legs = buildTransfer({ ...input, description: input.description ?? "" });
    return this.db.transaction(() => {
      this.requireAccount(input.fromAccountId);
      this.requireAccount(input.toAccountId);
      const [row] = this.db.all<{ next: number }>("SELECT COALESCE(MAX(transfer_group_id), 0) + 1 AS next FROM transactions");
      const groupId = row?.next ?? 1;
      const now = new Date().toISOString();
      const records = legs.map((leg) => {
        const { lastInsertRowid } = this.db.run(
          `INSERT INTO transactions
             (account_id, type, amount_cents, description, transaction_date, transfer_group_id, created_at, updated_at)
           VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?)`,
          [leg.accountId, leg.amountCents, leg.description, leg.date, groupId, now, now],
        );
        return { id: lastInsertRowid, accountId: leg.accountId, amountCents: leg.amountCents };
      });
      return { groupId, legs: records as [TransferLegRecord, TransferLegRecord] };
    });
  }

  getBalance(accountId: number): number {
    const account = this.requireAccount(accountId);
    const [row] = this.db.all<{ total: number }>(
      `SELECT COALESCE(SUM(CASE type WHEN 'expense' THEN -amount_cents ELSE amount_cents END), 0) AS total
         FROM transactions WHERE account_id = ? AND status = 'posted'`,
      [accountId],
    );
    return account.opening_balance_cents + (row?.total ?? 0);
  }

  deleteTransaction(id: number): void {
    const [row] = this.db.all<{ transfer_group_id: number | null }>(
      "SELECT transfer_group_id FROM transactions WHERE id = ?",
      [id],
    );
    if (!row) throw new Error("Lançamento não encontrado.");
    if (row.transfer_group_id === null) {
      this.db.run("DELETE FROM transactions WHERE id = ?", [id]);
    } else {
      this.db.run("DELETE FROM transactions WHERE transfer_group_id = ?", [row.transfer_group_id]);
    }
  }

  getMonthSummary(month: string): MonthSummary {
    assertMonth(month);
    const [row] = this.db.all<{ income: number; expense: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS expense
       FROM transactions
       WHERE status = 'posted' AND substr(transaction_date, 1, 7) = ?`,
      [month],
    );
    const incomeCents = row?.income ?? 0;
    const expenseCents = row?.expense ?? 0;
    return { incomeCents, expenseCents, resultCents: incomeCents - expenseCents };
  }

  listAccounts(): Account[] {
    return this.db
      .all<{ id: number; name: string; type: AccountType; opening_balance_cents: number }>(
        "SELECT id, name, type, opening_balance_cents FROM accounts WHERE is_active = 1 ORDER BY id",
      )
      .map((row) => ({ id: row.id, name: row.name, type: row.type, openingBalanceCents: row.opening_balance_cents }));
  }

  listCategories(): Category[] {
    return this.db
      .all<{ id: number; name: string; type: CategoryType; parent_id: number | null }>(
        "SELECT id, name, type, parent_id FROM categories WHERE is_active = 1 ORDER BY id",
      )
      .map((row) => ({ id: row.id, name: row.name, type: row.type, parentId: row.parent_id }));
  }

  seedDefaultCategories(): void {
    this.db.transaction(() => {
      const [row] = this.db.all<{ total: number }>("SELECT COUNT(*) AS total FROM categories");
      if ((row?.total ?? 0) > 0) return;
      for (const category of DEFAULT_CATEGORIES) {
        const parent = this.createCategory({ name: category.name, type: category.type });
        for (const child of category.children ?? []) {
          this.createCategory({ name: child, type: category.type, parentId: parent.id });
        }
      }
    });
  }

  getTotalBalance(): number {
    const [row] = this.db.all<{ total: number }>(
      `SELECT
         (SELECT COALESCE(SUM(opening_balance_cents), 0) FROM accounts WHERE is_active = 1)
         + (SELECT COALESCE(SUM(CASE t.type WHEN 'expense' THEN -t.amount_cents ELSE t.amount_cents END), 0)
              FROM transactions t JOIN accounts a ON a.id = t.account_id
             WHERE a.is_active = 1 AND t.status = 'posted') AS total`,
    );
    return row?.total ?? 0;
  }

  getExpensesByCategory(month: string): CategorySpend[] {
    assertMonth(month);
    return this.db.all<CategorySpend>(
      `SELECT COALESCE(p.id, c.id) AS categoryId, COALESCE(p.name, c.name) AS name, SUM(t.amount_cents) AS totalCents
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         LEFT JOIN categories p ON p.id = c.parent_id
        WHERE t.type = 'expense' AND t.status = 'posted' AND substr(t.transaction_date, 1, 7) = ?
        GROUP BY COALESCE(p.id, c.id), COALESCE(p.name, c.name)
        ORDER BY totalCents DESC, name`,
      [month],
    );
  }

  listTransactions(filter: TransactionFilter = {}): TransactionListItem[] {
    const where: string[] = [];
    const params: SqlValue[] = [];
    if (filter.month !== undefined) {
      assertMonth(filter.month);
      where.push("substr(t.transaction_date, 1, 7) = ?");
      params.push(filter.month);
    }
    if (filter.accountId !== undefined) {
      where.push("t.account_id = ?");
      params.push(filter.accountId);
    }
    let limit = "";
    if (filter.limit !== undefined) {
      limit = " LIMIT ?";
      params.push(filter.limit);
    }

    return this.db
      .all<{
        id: number;
        account_id: number;
        account_name: string;
        category_id: number | null;
        category_name: string | null;
        type: TransactionListItem["type"];
        amount_cents: number;
        description: string;
        transaction_date: string;
        status: TransactionStatus;
        transfer_group_id: number | null;
      }>(
        `SELECT t.id, t.account_id, a.name AS account_name, t.category_id, c.name AS category_name, t.type,
                t.amount_cents, t.description, t.transaction_date, t.status, t.transfer_group_id
           FROM transactions t
           JOIN accounts a ON a.id = t.account_id
           LEFT JOIN categories c ON c.id = t.category_id
          ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY t.transaction_date DESC, t.id DESC${limit}`,
        params,
      )
      .map((row) => ({
        id: row.id,
        accountId: row.account_id,
        accountName: row.account_name,
        categoryId: row.category_id,
        categoryName: row.category_name,
        type: row.type,
        amountCents: row.amount_cents,
        description: row.description,
        date: row.transaction_date,
        status: row.status,
        transferGroupId: row.transfer_group_id,
      }));
  }

  private requireAccount(id: number): { opening_balance_cents: number } {
    const account = this.db.all<{ opening_balance_cents: number }>(
      "SELECT opening_balance_cents FROM accounts WHERE id = ?",
      [id],
    )[0];
    if (!account) throw new Error("Conta não encontrada.");
    return account;
  }
}

function assertMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mês inválido: use o formato AAAA-MM.");
}

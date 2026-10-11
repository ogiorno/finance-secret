import { validateTransaction, type CategoryType } from "@finance/core";
import type { Driver } from "./driver";
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

export interface FinanceRepository {
  createAccount(input: NewAccount): Account;
  createCategory(input: NewCategory): Category;
  addTransaction(input: NewIncomeOrExpense): Transaction;
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

  getBalance(accountId: number): number {
    const account = this.requireAccount(accountId);
    const [row] = this.db.all<{ total: number }>(
      `SELECT COALESCE(SUM(CASE type WHEN 'expense' THEN -amount_cents ELSE amount_cents END), 0) AS total
         FROM transactions WHERE account_id = ? AND status = 'posted'`,
      [accountId],
    );
    return account.opening_balance_cents + (row?.total ?? 0);
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

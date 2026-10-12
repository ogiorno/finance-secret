import { buildTransfer, validateTransaction, type CategoryType } from "@finance/core";
import type { Driver, SqlValue } from "./driver";
import type { FinanceDatabase } from "./open";

/** Chave de um tipo de conta (`account_types.key`). Os tipos de fábrica estão em `BUILT_IN_ACCOUNT_TYPES`. */
export type AccountType = string;

export const BUILT_IN_ACCOUNT_TYPES = ["checking", "savings", "cash", "wallet", "credit_card", "loan", "meal_voucher"] as const;
export type TransactionStatus = "pending" | "posted";

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  openingBalanceCents: number;
  /** Falso quando a conta foi arquivada (Archived): fica fora de novos lançamentos e do saldo total. */
  isActive: boolean;
}

export interface AccountTypeRecord {
  key: AccountType;
  name: string;
  /** Contas deste tipo começam devendo (cartão, empréstimo). */
  isLiability: boolean;
  /** Mostra no painel quanto entrou e quanto saiu (vale-alimentação). */
  tracksUsage: boolean;
  /** Tipos de fábrica não podem ser apagados. */
  isSystem: boolean;
  isActive: boolean;
}

export interface NewAccountType {
  name: string;
  isLiability?: boolean;
  tracksUsage?: boolean;
}

export interface AccountTypeUsage {
  typeKey: AccountType;
  typeName: string;
  /** Saldo atual de todas as contas ativas do tipo. */
  balanceCents: number;
  /** Receitas posted do mês nessas contas. */
  creditedCents: number;
  /** Despesas posted do mês nessas contas. */
  usedCents: number;
  /** Quantas contas ativas o tipo tem; zero quando ninguém usa o tipo ainda. */
  accountCount: number;
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
  /** Categoria escolhida; uma categoria-pai inclui as subcategorias. */
  categoryId?: number;
  /** Texto contido na descrição ou no nome da categoria (sem diferenciar maiúsculas de ASCII). */
  search?: string;
  limit?: number;
}

export interface ListAccountsOptions {
  /** Inclui as contas arquivadas (Archived). */
  includeArchived?: boolean;
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
  { name: "Vale-alimentação", type: "income" },
  { name: "Outras receitas", type: "income" },
];

export interface FinanceRepository {
  createAccount(input: NewAccount): Account;
  createCategory(input: NewCategory): Category;
  addTransaction(input: NewIncomeOrExpense): Transaction;
  addTransfer(input: NewTransfer): Transfer;
  /** Um lançamento (ou perna de transferência) como aparece nas listas. */
  getTransaction(id: number): TransactionListItem;
  /**
   * Troca todos os dados do lançamento. Receita e despesa recebem `NewIncomeOrExpense`; uma perna de
   * transferência recebe `NewTransfer` e atualiza as duas pernas juntas. Não converte entre os dois tipos.
   */
  updateTransaction(id: number, input: NewIncomeOrExpense | NewTransfer): void;
  /** Remove o lançamento; para transferência, remove as duas pernas. */
  deleteTransaction(id: number): void;
  /** Tipos de conta ativos (e os arquivados, se pedido), de fábrica primeiro. */
  listAccountTypes(options?: ListAccountsOptions): AccountTypeRecord[];
  createAccountType(input: NewAccountType): AccountTypeRecord;
  /** Renomeia e liga ou desliga o acompanhamento de uso; a natureza (dívida ou não) não muda. */
  updateAccountType(key: AccountType, changes: { name?: string; tracksUsage?: boolean }): void;
  /** Arquiva (`false`) ou reativa (`true`) um tipo, sem mexer nas contas que já o usam. */
  setAccountTypeActive(key: AccountType, active: boolean): void;
  /** Só apaga tipo próprio e sem contas; use `setAccountTypeActive` nos demais. */
  deleteAccountType(key: AccountType): void;
  /** Para cada tipo que acompanha uso, saldo atual e entradas e saídas do mês `YYYY-MM`. */
  getAccountTypeUsage(month: string): AccountTypeUsage[];
  renameAccount(id: number, name: string): void;
  /** Arquiva (`false`) ou reativa (`true`) a conta, sem apagar o histórico. */
  setAccountActive(id: number, active: boolean): void;
  /** Só apaga conta que nunca teve lançamento; use `setAccountActive` nas demais. */
  deleteAccount(id: number): void;
  /** Receitas e despesas `posted` de um mês `YYYY-MM`; transferências nunca entram. */
  getMonthSummary(month: string): MonthSummary;
  /** Contas ativas (e as arquivadas, se pedido), na ordem de criação. */
  listAccounts(options?: ListAccountsOptions): Account[];
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
    const accountType = this.db.all<{ is_active: number }>("SELECT is_active FROM account_types WHERE key = ?", [input.type])[0];
    if (!accountType) throw new Error("Tipo de conta não encontrado.");
    if (accountType.is_active !== 1) throw new Error("Tipo de conta arquivado: escolha outro.");
    const openingBalanceCents = input.openingBalanceCents ?? 0;
    const { lastInsertRowid } = this.db.run(
      "INSERT INTO accounts (name, type, opening_balance_cents, created_at) VALUES (?, ?, ?, ?)",
      [input.name, input.type, openingBalanceCents, new Date().toISOString()],
    );
    return { id: lastInsertRowid, name: input.name, type: input.type, openingBalanceCents, isActive: true };
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
    this.requireActiveAccount(input.accountId);

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
      this.requireActiveAccount(input.fromAccountId);
      this.requireActiveAccount(input.toAccountId);
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

  getTransaction(id: number): TransactionListItem {
    const item = this.listTransactions({ id })[0];
    if (!item) throw new Error("Lançamento não encontrado.");
    return item;
  }

  updateTransaction(id: number, input: NewIncomeOrExpense | NewTransfer): void {
    const current = this.getTransaction(id);
    const now = new Date().toISOString();
    if ("fromAccountId" in input) {
      if (current.transferGroupId === null) throw new Error("Este lançamento não é uma transferência.");
      const groupId = current.transferGroupId;
      const [outflow, inflow] = buildTransfer({ ...input, description: input.description ?? "" });
      this.db.transaction(() => {
        this.requireActiveAccountOrSame(input.fromAccountId, groupId, -1);
        this.requireActiveAccountOrSame(input.toAccountId, groupId, 1);
        for (const leg of [outflow, inflow]) {
          this.db.run(
            `UPDATE transactions SET account_id = ?, amount_cents = ?, description = ?, transaction_date = ?, updated_at = ?
              WHERE transfer_group_id = ? AND (amount_cents < 0) = ?`,
            [leg.accountId, leg.amountCents, leg.description, leg.date, now, groupId, leg.amountCents < 0 ? 1 : 0],
          );
        }
      });
      return;
    }
    if (current.transferGroupId !== null) throw new Error("Uma transferência não pode virar receita ou despesa.");
    const category = this.db.all<{ type: CategoryType }>("SELECT type FROM categories WHERE id = ?", [input.categoryId])[0];
    if (!category) throw new Error("Categoria não encontrada.");
    validateTransaction(input, category.type);
    if (input.accountId === current.accountId) this.requireAccount(input.accountId);
    else this.requireActiveAccount(input.accountId);
    this.db.run(
      `UPDATE transactions SET account_id = ?, category_id = ?, type = ?, amount_cents = ?, description = ?,
              transaction_date = ?, status = ?, updated_at = ? WHERE id = ?`,
      [input.accountId, input.categoryId, input.type, input.amountCents, input.description ?? "", input.date, input.status ?? "posted", now, id],
    );
  }

  listAccountTypes(options: ListAccountsOptions = {}): AccountTypeRecord[] {
    return this.db
      .all<{ key: string; name: string; is_liability: number; tracks_usage: number; is_system: number; is_active: number }>(
        `SELECT key, name, is_liability, tracks_usage, is_system, is_active FROM account_types
          ${options.includeArchived ? "" : "WHERE is_active = 1"} ORDER BY is_system DESC, rowid`,
      )
      .map((row) => ({
        key: row.key,
        name: row.name,
        isLiability: row.is_liability === 1,
        tracksUsage: row.tracks_usage === 1,
        isSystem: row.is_system === 1,
        isActive: row.is_active === 1,
      }));
  }

  createAccountType(input: NewAccountType): AccountTypeRecord {
    const name = input.name.trim();
    if (name.length === 0) throw new Error("O nome do tipo não pode ficar vazio.");
    const taken = new Set(this.db.all<{ key: string }>("SELECT key FROM account_types").map((row) => row.key));
    const base =
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "tipo";
    let key = base;
    for (let n = 2; taken.has(key); n++) key = `${base}_${n}`;
    this.db.run("INSERT INTO account_types (key, name, is_liability, tracks_usage, is_system) VALUES (?, ?, ?, ?, 0)", [
      key,
      name,
      input.isLiability ? 1 : 0,
      input.tracksUsage ? 1 : 0,
    ]);
    return { key, name, isLiability: !!input.isLiability, tracksUsage: !!input.tracksUsage, isSystem: false, isActive: true };
  }

  updateAccountType(key: AccountType, changes: { name?: string; tracksUsage?: boolean }): void {
    this.requireAccountType(key);
    if (changes.name !== undefined) {
      if (changes.name.trim().length === 0) throw new Error("O nome do tipo não pode ficar vazio.");
      this.db.run("UPDATE account_types SET name = ? WHERE key = ?", [changes.name.trim(), key]);
    }
    if (changes.tracksUsage !== undefined) {
      this.db.run("UPDATE account_types SET tracks_usage = ? WHERE key = ?", [changes.tracksUsage ? 1 : 0, key]);
    }
  }

  setAccountTypeActive(key: AccountType, active: boolean): void {
    this.requireAccountType(key);
    this.db.run("UPDATE account_types SET is_active = ? WHERE key = ?", [active ? 1 : 0, key]);
  }

  deleteAccountType(key: AccountType): void {
    const type = this.requireAccountType(key);
    if (type.is_system === 1) throw new Error("Tipos de fábrica não podem ser apagados: arquive-o.");
    const [row] = this.db.all<{ total: number }>("SELECT COUNT(*) AS total FROM accounts WHERE type = ?", [key]);
    if ((row?.total ?? 0) > 0) throw new Error("Há contas deste tipo: arquive-o em vez de apagar.");
    this.db.run("DELETE FROM account_types WHERE key = ?", [key]);
  }

  getAccountTypeUsage(month: string): AccountTypeUsage[] {
    assertMonth(month);
    return this.db.all<AccountTypeUsage>(
      `SELECT ty.key AS typeKey, ty.name AS typeName, COUNT(a.id) AS accountCount,
              COALESCE(SUM(a.opening_balance_cents), 0)
                + COALESCE((SELECT SUM(CASE t.type WHEN 'expense' THEN -t.amount_cents ELSE t.amount_cents END)
                              FROM transactions t JOIN accounts x ON x.id = t.account_id
                             WHERE x.type = ty.key AND x.is_active = 1 AND t.status = 'posted'), 0) AS balanceCents,
              COALESCE((SELECT SUM(t.amount_cents) FROM transactions t JOIN accounts x ON x.id = t.account_id
                         WHERE x.type = ty.key AND x.is_active = 1 AND t.status = 'posted' AND t.type = 'income'
                           AND substr(t.transaction_date, 1, 7) = ?), 0) AS creditedCents,
              COALESCE((SELECT SUM(t.amount_cents) FROM transactions t JOIN accounts x ON x.id = t.account_id
                         WHERE x.type = ty.key AND x.is_active = 1 AND t.status = 'posted' AND t.type = 'expense'
                           AND substr(t.transaction_date, 1, 7) = ?), 0) AS usedCents
         FROM account_types ty
         LEFT JOIN accounts a ON a.type = ty.key AND a.is_active = 1
        WHERE ty.tracks_usage = 1 AND ty.is_active = 1
        GROUP BY ty.key, ty.name
        ORDER BY ty.rowid`,
      [month, month],
    );
  }

  renameAccount(id: number, name: string): void {
    this.requireAccount(id);
    if (name.trim().length === 0) throw new Error("O nome da conta não pode ficar vazio.");
    this.db.run("UPDATE accounts SET name = ? WHERE id = ?", [name.trim(), id]);
  }

  setAccountActive(id: number, active: boolean): void {
    this.requireAccount(id);
    this.db.run("UPDATE accounts SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
  }

  deleteAccount(id: number): void {
    this.requireAccount(id);
    const [row] = this.db.all<{ total: number }>("SELECT COUNT(*) AS total FROM transactions WHERE account_id = ?", [id]);
    if ((row?.total ?? 0) > 0) throw new Error("A conta tem lançamentos: arquive-a em vez de excluir.");
    this.db.run("DELETE FROM accounts WHERE id = ?", [id]);
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

  listAccounts(options: ListAccountsOptions = {}): Account[] {
    return this.db
      .all<{ id: number; name: string; type: AccountType; opening_balance_cents: number; is_active: number }>(
        `SELECT id, name, type, opening_balance_cents, is_active FROM accounts
          ${options.includeArchived ? "" : "WHERE is_active = 1"} ORDER BY id`,
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        openingBalanceCents: row.opening_balance_cents,
        isActive: row.is_active === 1,
      }));
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

  listTransactions(filter: TransactionFilter & { id?: number } = {}): TransactionListItem[] {
    const where: string[] = [];
    const params: SqlValue[] = [];
    if (filter.month !== undefined) {
      assertMonth(filter.month);
      where.push("substr(t.transaction_date, 1, 7) = ?");
      params.push(filter.month);
    }
    if (filter.id !== undefined) {
      where.push("t.id = ?");
      params.push(filter.id);
    }
    if (filter.accountId !== undefined) {
      where.push("t.account_id = ?");
      params.push(filter.accountId);
    }
    if (filter.categoryId !== undefined) {
      where.push("(t.category_id = ? OR c.parent_id = ?)");
      params.push(filter.categoryId, filter.categoryId);
    }
    const search = filter.search?.trim();
    if (search) {
      where.push("(instr(lower(t.description), lower(?)) > 0 OR instr(lower(COALESCE(c.name, '')), lower(?)) > 0)");
      params.push(search, search);
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

  private requireAccountType(key: string): { is_system: number } {
    const type = this.db.all<{ is_system: number }>("SELECT is_system FROM account_types WHERE key = ?", [key])[0];
    if (!type) throw new Error("Tipo de conta não encontrado.");
    return type;
  }

  private requireActiveAccount(id: number): void {
    const account = this.db.all<{ is_active: number }>("SELECT is_active FROM accounts WHERE id = ?", [id])[0];
    if (!account) throw new Error("Conta não encontrada.");
    if (account.is_active !== 1) throw new Error("Conta arquivada: não recebe novos lançamentos.");
  }

  /** Aceita a conta que a perna já usa (mesmo arquivada) ou exige uma conta ativa. */
  private requireActiveAccountOrSame(accountId: number, groupId: number, sign: -1 | 1): void {
    const same = this.db.all<{ id: number }>(
      "SELECT id FROM transactions WHERE transfer_group_id = ? AND account_id = ? AND (amount_cents < 0) = ?",
      [groupId, accountId, sign < 0 ? 1 : 0],
    )[0];
    if (same) this.requireAccount(accountId);
    else this.requireActiveAccount(accountId);
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

import type { FinanceRepository } from "@finance/database";

/** O que se vê de um banco numa comparação: tamanhos, saldos e contas, sem listar lançamento por lançamento. */
export interface DatabaseSummary {
  accounts: { name: string; balanceCents: number; isActive: boolean }[];
  transactions: number;
  categories: number;
  bills: number;
  goals: number;
  cashCents: number;
  debtCents: number;
  /** Datas `YYYY-MM-DD`; `null` sem nenhum lançamento. */
  firstDate: string | null;
  lastDate: string | null;
}

export function summarizeDatabase(repo: FinanceRepository): DatabaseSummary {
  const transactions = repo.listTransactions();
  let firstDate: string | null = null;
  let lastDate: string | null = null;
  for (const { date } of transactions) {
    if (firstDate === null || date < firstDate) firstDate = date;
    if (lastDate === null || date > lastDate) lastDate = date;
  }
  const { cashCents, debtCents } = repo.getBalanceBreakdown();
  return {
    accounts: repo.listAccounts({ includeArchived: true }).map((account) => ({
      name: account.name,
      balanceCents: repo.getBalance(account.id),
      isActive: account.isActive,
    })),
    transactions: transactions.length,
    categories: repo.listCategories().length,
    bills: repo.listRecurringBills({ includeArchived: true }).length,
    goals: repo.listGoals({ includeInactive: true }).length,
    cashCents,
    debtCents,
    firstDate,
    lastDate,
  };
}

export type MetricKind = "count" | "money" | "date";

export interface MetricRow {
  label: string;
  kind: MetricKind;
  current: number | string | null;
  incoming: number | string | null;
  changed: boolean;
}

export type AccountChange = "added" | "removed" | "changed" | "same";

export interface AccountRow {
  name: string;
  currentCents: number | null;
  incomingCents: number | null;
  change: AccountChange;
}

export interface DatabaseDiff {
  metrics: MetricRow[];
  accounts: AccountRow[];
  /** Nada que a comparação mostra mudou. */
  identical: boolean;
}

/** `current` é o que já está na plataforma; `incoming`, o arquivo que se quer subir. */
export function compareDatabases(current: DatabaseSummary, incoming: DatabaseSummary): DatabaseDiff {
  const metric = (label: string, kind: MetricKind, a: number | string | null, b: number | string | null): MetricRow => ({
    label,
    kind,
    current: a,
    incoming: b,
    changed: a !== b,
  });
  const metrics = [
    metric("Contas", "count", current.accounts.length, incoming.accounts.length),
    metric("Lançamentos", "count", current.transactions, incoming.transactions),
    metric("Categorias", "count", current.categories, incoming.categories),
    metric("Contas fixas e recorrentes", "count", current.bills, incoming.bills),
    metric("Metas", "count", current.goals, incoming.goals),
    metric("Dinheiro nas contas", "money", current.cashCents, incoming.cashCents),
    metric("Dívida nos cartões", "money", current.debtCents, incoming.debtCents),
    metric("Primeiro lançamento", "date", current.firstDate, incoming.firstDate),
    metric("Último lançamento", "date", current.lastDate, incoming.lastDate),
  ];

  const byName = new Map(current.accounts.map((account) => [account.name, account]));
  const seen = new Set<string>();
  const accounts: AccountRow[] = [];
  for (const account of incoming.accounts) {
    const before = byName.get(account.name);
    seen.add(account.name);
    accounts.push({
      name: account.name,
      currentCents: before?.balanceCents ?? null,
      incomingCents: account.balanceCents,
      change: !before ? "added" : before.balanceCents === account.balanceCents ? "same" : "changed",
    });
  }
  for (const account of current.accounts) {
    if (!seen.has(account.name)) accounts.push({ name: account.name, currentCents: account.balanceCents, incomingCents: null, change: "removed" });
  }

  return {
    metrics,
    accounts,
    identical: metrics.every((row) => !row.changed) && accounts.every((row) => row.change === "same"),
  };
}

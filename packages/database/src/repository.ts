import {
  billStatus,
  buildTransfer,
  dueDateFor,
  expectedAmountFor,
  averageMonthlyCents,
  estimateCompletionPeriod,
  isPaymentMethod,
  isValidDate,
  itemTotalCents,
  monthlyContributionNeeded,
  progressPercent,
  validateTransaction,
  type BillAmountStep,
  type BillFrequency,
  type BillStatus,
  type CategoryType,
  type PaymentMethod,
} from "@finance/core";
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
  /** Método de pagamento que os lançamentos das contas deste tipo recebem quando o usuário não escolhe um. */
  defaultPaymentMethod: PaymentMethod | null;
}

export interface NewAccountType {
  name: string;
  isLiability?: boolean;
  tracksUsage?: boolean;
  defaultPaymentMethod?: PaymentMethod | null;
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
  /** "Sem categoria": criada pelo app, recebe lançamentos sem categoria e não pode ser apagada nem arquivada. */
  isSystem: boolean;
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
  paymentMethod: PaymentMethod | null;
  isExtra: boolean;
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
  /** Sem categoria, o lançamento vai para a "Sem categoria" do seu tipo. */
  categoryId?: number;
  type: CategoryType;
  amountCents: number;
  /** Data local, YYYY-MM-DD. */
  date: string;
  description?: string;
  status?: TransactionStatus;
  /** Sem valor, usa o padrão do tipo da conta; `null` grava sem método. */
  paymentMethod?: PaymentMethod | null;
  /** Imprevisto do mês; só despesa pode ser Extra. */
  isExtra?: boolean;
  /** Só receita tem fonte. Sem valor, usa a fonte padrão ("Eu"); `null` grava sem fonte. */
  sourceId?: number | null;
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

export interface MonthRollForward {
  /** Saldo total das contas ativas no fim do mês anterior. */
  openingCents: number;
  incomeCents: number;
  expenseCents: number;
  /** Saldo total das contas ativas no fim do mês. */
  closingCents: number;
  /** Quanto do movimento do saldo as receitas e despesas não explicam (ex.: transferência com conta arquivada). */
  unexplainedCents: number;
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
  paymentMethod: PaymentMethod | null;
  isExtra: boolean;
  /** Fonte de renda da receita; nulo em despesa e transferência. */
  sourceId: number | null;
  sourceName: string | null;
  transferGroupId: number | null;
  /** Em perna de transferência, a conta da outra ponta; nulo em receita e despesa. */
  counterpartAccountName: string | null;
}

export interface TransactionFilter {
  /** `YYYY-MM`. */
  month?: string;
  accountId?: number;
  /** Categoria escolhida; uma categoria-pai inclui as subcategorias. */
  categoryId?: number;
  /** Texto contido na descrição ou no nome da categoria (sem diferenciar maiúsculas de ASCII). */
  search?: string;
  paymentMethod?: PaymentMethod;
  /** Só as receitas desta fonte. */
  sourceId?: number;
  /** Só as despesas marcadas como Extra. */
  onlyExtra?: boolean;
  limit?: number;
}

export interface ListAccountsOptions {
  /** Inclui as contas arquivadas (Archived). */
  includeArchived?: boolean;
}

export type BillClassification = "fixed" | "discretionary";

export interface RecurringBill {
  id: number;
  name: string;
  frequency: BillFrequency;
  dueDay: number;
  /** Mês do vencimento (1 a 12) nas contas anuais; nulo nas mensais. */
  dueMonth: number | null;
  categoryId: number;
  classification: BillClassification;
  defaultAccountId: number | null;
  /** Primeiro mês (`YYYY-MM`) em que a conta existe. */
  startPeriod: string;
  isActive: boolean;
  /** Valor esperado no mês pedido em `asOfPeriod`. */
  amountCents: number;
}

export interface NewRecurringBill {
  name: string;
  amountCents: number;
  frequency: BillFrequency;
  dueDay: number;
  dueMonth?: number | null;
  /** Sem categoria, usa a "Sem categoria" de despesa. */
  categoryId?: number;
  classification: BillClassification;
  defaultAccountId?: number | null;
  startPeriod: string;
}

export interface RecurringBillChanges {
  name?: string;
  frequency?: BillFrequency;
  dueDay?: number;
  dueMonth?: number | null;
  categoryId?: number;
  classification?: BillClassification;
  defaultAccountId?: number | null;
}

export interface ListRecurringBillsOptions {
  includeArchived?: boolean;
  /** Mês `YYYY-MM` cujo valor esperado vem em `amountCents`; sem ele, o valor mais recente. */
  asOfPeriod?: string;
}

/** Uma conta recorrente esperada em um mês, paga ou não. */
export interface BillOccurrence {
  billId: number;
  name: string;
  period: string;
  dueDate: string;
  classification: BillClassification;
  categoryId: number;
  categoryName: string;
  defaultAccountId: number | null;
  expectedAmountCents: number;
  status: BillStatus;
  paidTransactionId: number | null;
  paidAmountCents: number | null;
}

export interface BillsSummary {
  /** Soma do esperado de todas as contas do mês. */
  expectedCents: number;
  /** Soma do que já foi pago (valores reais). */
  paidCents: number;
  /** Esperado das contas ainda não pagas (pendentes e atrasadas). */
  remainingCents: number;
  /** Saldo total menos o reservado nas metas menos o que ainda falta pagar; pode ser negativo. */
  freeAfterCents: number;
}

export interface PayBillInput {
  billId: number;
  /** Mês `YYYY-MM` da ocorrência que está sendo paga. */
  period: string;
  accountId: number;
  /** Valor real pago; sem ele, o esperado do mês. */
  amountCents?: number;
  /** Data local em que o dinheiro saiu, YYYY-MM-DD. */
  date: string;
}

export interface TransactionItem {
  id: number;
  transactionId: number;
  /** Ordem na lista, a partir de 1. */
  position: number;
  name: string;
  /** Em milésimos: 1,250 kg = 1250. */
  quantityMilli: number;
  unitPriceCents: number;
  /** `quantidade × preço`, arredondado para o centavo. */
  totalCents: number;
}

export interface NewTransactionItem {
  name: string;
  quantityMilli: number;
  unitPriceCents: number;
}

export interface ItemsTotal {
  itemsCents: number;
  transactionCents: number;
  /** Total da compra menos a soma dos itens (descontos, arredondamentos); pode ser negativo. */
  differenceCents: number;
}

export interface IncomeSource {
  id: number;
  name: string;
  /** A fonte "Eu": recebe as receitas sem fonte e não pode ser apagada nem arquivada. */
  isDefault: boolean;
  isActive: boolean;
}

export interface NewIncomeSource {
  name: string;
}

export interface RecurringIncome {
  id: number;
  name: string;
  frequency: BillFrequency;
  dueDay: number;
  dueMonth: number | null;
  sourceId: number;
  categoryId: number;
  defaultAccountId: number | null;
  startPeriod: string;
  isActive: boolean;
  /** Valor esperado no mês pedido em `asOfPeriod`. */
  amountCents: number;
}

export interface NewRecurringIncome {
  name: string;
  amountCents: number;
  frequency: BillFrequency;
  dueDay: number;
  dueMonth?: number | null;
  /** Sem fonte, usa a fonte padrão. */
  sourceId?: number;
  /** Sem categoria, usa a "Sem categoria" de receita. */
  categoryId?: number;
  defaultAccountId?: number | null;
  startPeriod: string;
}

export interface RecurringIncomeChanges {
  name?: string;
  frequency?: BillFrequency;
  dueDay?: number;
  dueMonth?: number | null;
  sourceId?: number;
  categoryId?: number;
  defaultAccountId?: number | null;
}

export interface ListRecurringIncomesOptions {
  includeArchived?: boolean;
  asOfPeriod?: string;
}

/** Uma receita recorrente esperada em um mês, recebida ou não (`paid` = recebida). */
export interface IncomeOccurrence {
  incomeId: number;
  name: string;
  period: string;
  dueDate: string;
  sourceId: number;
  sourceName: string;
  categoryId: number;
  categoryName: string;
  defaultAccountId: number | null;
  expectedAmountCents: number;
  status: BillStatus;
  paidTransactionId: number | null;
  paidAmountCents: number | null;
}

export interface IncomeExpectations {
  expectedCents: number;
  receivedCents: number;
  /** Esperado das receitas ainda não recebidas (a receber e atrasadas). */
  remainingCents: number;
}

export interface ReceiveIncomeInput {
  incomeId: number;
  period: string;
  accountId: number;
  /** Valor real recebido; sem ele, o esperado do mês. */
  amountCents?: number;
  date: string;
}

export interface IncomeBySourceRow {
  month: string;
  sourceId: number;
  sourceName: string;
  totalCents: number;
}

export type GoalStatus = "active" | "executed" | "archived";

export interface Goal {
  id: number;
  name: string;
  targetCents: number | null;
  /** Prazo `YYYY-MM-DD`, se houver. */
  targetDate: string | null;
  status: GoalStatus;
  /** Soma dos aportes menos os resgates; nunca negativa. */
  savedCents: number;
}

export interface NewGoal {
  name: string;
  targetCents?: number | null;
  targetDate?: string | null;
}

export interface GoalChanges {
  name?: string;
  targetCents?: number | null;
  targetDate?: string | null;
}

export interface Contribution {
  id: number;
  goalId: number;
  /** Positivo coloca dinheiro na meta; negativo retira (resgate). */
  amountCents: number;
  date: string;
  note: string | null;
}

export interface NewContribution {
  amountCents: number;
  /** Data local, YYYY-MM-DD. */
  date: string;
  note?: string | null;
}

export interface ReservedSummary {
  /** Dinheiro separado nas metas ativas. */
  reservedCents: number;
  /** Saldo total menos o reservado; pode ser negativo. */
  freeCents: number;
}

export interface GoalReportMonth {
  month: string;
  /** Aportes menos resgates do mês. */
  netCents: number;
  cumulativeCents: number;
}

export interface GoalReport {
  goal: Goal;
  savedCents: number;
  months: GoalReportMonth[];
  /** Percentual inteiro do alvo já guardado; nulo sem alvo. */
  progressPercent: number | null;
  /** Média mensal líquida de aportes, no ritmo atual. */
  averageMonthlyCents: number;
  /** Mês (`YYYY-MM`) em que o alvo é atingido no ritmo atual; nulo sem alvo ou sem ritmo. */
  estimatedPeriod: string | null;
  /** Quanto aportar por mês para cumprir o prazo; nulo sem alvo, sem prazo ou com o prazo vencido. */
  neededMonthlyCents: number | null;
}

export interface GoalOverviewRow {
  goalId: number;
  goalName: string;
  contributedCents: number;
  withdrawnCents: number;
  netCents: number;
  /** Total guardado hoje, de todo o histórico. */
  savedCents: number;
}

export interface MoneyFlowEdge {
  /** Estável entre chamadas, por exemplo `income:source:1>account:2`. */
  id: string;
  /** `transfer` é movimento entre contas suas: não é gasto nem renda. */
  kind: "income" | "expense" | "transfer";
  fromKey: string;
  fromLabel: string;
  toKey: string;
  toLabel: string;
  cents: number;
  /** As Transactions que formam este trecho. */
  transactionIds: number[];
}

export interface MoneyFlow {
  month: string;
  edges: MoneyFlowEdge[];
  /** Aportes menos resgates das metas no mês: reserva, não gasto, e sem conta de origem. */
  goalsNetCents: number;
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
  updateAccountType(
    key: AccountType,
    changes: { name?: string; tracksUsage?: boolean; defaultPaymentMethod?: PaymentMethod | null },
  ): void;
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
  /** Receitas e despesas `posted` de contas ativas em um mês `YYYY-MM`; transferências nunca entram. */
  getMonthSummary(month: string): MonthSummary;
  /** Contas ativas (e as arquivadas, se pedido), na ordem de criação. */
  listAccounts(options?: ListAccountsOptions): Account[];
  /** Categorias ativas. */
  listCategories(): Category[];
  /** Cria as categorias padrão em PT-BR, só se ainda não houver nenhuma. */
  seedDefaultCategories(): void;
  /**
   * Soma dos saldos das contas ativas (cartões e empréstimos entram negativos). Com `asOfDate` (`YYYY-MM-DD`),
   * conta só os lançamentos até essa data, inclusive.
   */
  getTotalBalance(asOfDate?: string): number;
  /** Itens de uma receita ou despesa, na ordem em que foram incluídos. */
  listTransactionItems(transactionId: number): TransactionItem[];
  addTransactionItem(transactionId: number, input: NewTransactionItem): TransactionItem;
  updateTransactionItem(itemId: number, input: NewTransactionItem): void;
  deleteTransactionItem(itemId: number): void;
  /** Soma dos itens contra o total da compra. Os saldos e totais usam sempre o total da compra. */
  getItemsTotal(transactionId: number): ItemsTotal;
  listIncomeSources(options?: { includeArchived?: boolean }): IncomeSource[];
  createIncomeSource(input: NewIncomeSource): IncomeSource;
  renameIncomeSource(id: number, name: string): void;
  /** Arquiva (`false`) ou reativa (`true`) a fonte; a padrão não pode ser arquivada. */
  setIncomeSourceActive(id: number, active: boolean): void;
  /** Só apaga fonte que nunca teve receita nem receita recorrente; use `setIncomeSourceActive` nas demais. */
  deleteIncomeSource(id: number): void;
  /** Receitas `posted` de contas ativas por mês e fonte, de `fromMonth` a `toMonth` (`YYYY-MM`). */
  getIncomeBySource(fromMonth: string, toMonth: string): IncomeBySourceRow[];
  createRecurringIncome(input: NewRecurringIncome): RecurringIncome;
  listRecurringIncomes(options?: ListRecurringIncomesOptions): RecurringIncome[];
  updateRecurringIncome(id: number, changes: RecurringIncomeChanges): void;
  setRecurringIncomeActive(id: number, active: boolean): void;
  deleteRecurringIncome(id: number): void;
  setRecurringIncomeAmount(id: number, change: { amountCents: number; fromPeriod: string }): void;
  listIncomeOccurrences(period: string, today: string): IncomeOccurrence[];
  getIncomeExpectations(period: string, today: string): IncomeExpectations;
  /** Marca a receita do mês como recebida: cria a receita e o vínculo numa única operação. */
  receiveIncome(input: ReceiveIncomeInput): Transaction;
  /** Desmarca o recebimento apagando a receita vinculada. */
  unreceiveIncome(incomeId: number, period: string): void;
  createGoal(input: NewGoal): Goal;
  /** Metas ativas (e as executadas e arquivadas, se pedido), na ordem de criação. */
  listGoals(options?: { includeInactive?: boolean }): Goal[];
  updateGoal(id: number, changes: GoalChanges): void;
  /** Ativa, marca como executada (libera a reserva) ou arquiva. O histórico fica. */
  setGoalStatus(id: number, status: GoalStatus): void;
  /** Só apaga meta sem aportes; use `setGoalStatus` nas demais. */
  deleteGoal(id: number): void;
  addContribution(goalId: number, input: NewContribution): Contribution;
  updateContribution(id: number, input: NewContribution): void;
  deleteContribution(id: number): void;
  /** Aportes e resgates da meta, os mais recentes primeiro. */
  listContributions(goalId: number): Contribution[];
  /** Um aporte por meta, todos ou nenhum. */
  distributeToGoals(allocations: { goalId: number; amountCents: number }[], date: string, note?: string): void;
  getReservedSummary(): ReservedSummary;
  /** Aportes por mês, progresso, ritmo e estimativa de uma meta; `period` é o mês de hoje (`YYYY-MM`). */
  getGoalReport(goalId: number, period: string): GoalReport;
  /** O que entrou, saiu e ficou em cada meta ativa no intervalo de meses. */
  getGoalsOverview(fromMonth: string, toMonth: string): GoalOverviewRow[];
  /** De onde o dinheiro veio, por onde passou e para onde foi no mês `YYYY-MM` (só contas ativas, só `posted`). */
  getMoneyFlow(month: string): MoneyFlow;
  createRecurringBill(input: NewRecurringBill): RecurringBill;
  /** Contas recorrentes ativas (e as arquivadas, se pedido), na ordem de criação. */
  listRecurringBills(options?: ListRecurringBillsOptions): RecurringBill[];
  /** Edita o cadastro; o valor esperado muda por `setRecurringBillAmount`. */
  updateRecurringBill(id: number, changes: RecurringBillChanges): void;
  /** Arquiva (`false`) ou reativa (`true`) a conta, mantendo os pagamentos. */
  setRecurringBillActive(id: number, active: boolean): void;
  /** Só apaga conta sem pagamentos; use `setRecurringBillActive` nas demais. */
  deleteRecurringBill(id: number): void;
  /** Novo valor esperado a partir do mês `fromPeriod`; meses anteriores seguem com o valor antigo. */
  setRecurringBillAmount(id: number, change: { amountCents: number; fromPeriod: string }): void;
  /** As contas esperadas no mês `period` (`YYYY-MM`), por vencimento. `today` é a data local `YYYY-MM-DD`. */
  listBillOccurrences(period: string, today: string): BillOccurrence[];
  getBillsSummary(period: string, today: string): BillsSummary;
  /** Marca a conta do mês como paga: cria a despesa e o vínculo numa única operação. */
  payBill(input: PayBillInput): Transaction;
  /** Desmarca o pagamento apagando a despesa vinculada. */
  unpayBill(billId: number, period: string): void;
  /** Soma das despesas Extra `posted` de contas ativas no mês `YYYY-MM`. */
  getMonthExtras(month: string): number;
  /** Saldo no início, receitas, despesas e saldo no fim do mês `YYYY-MM`, mostrando o que não fecha. */
  getMonthRollForward(month: string): MonthRollForward;
  /** Despesas `posted` de contas ativas no mês, agrupadas pela categoria de nível superior, maiores primeiro. */
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
    return { id: lastInsertRowid, name: input.name, type: input.type, parentId, isSystem: false };
  }

  addTransaction(input: NewIncomeOrExpense): Transaction {
    const { id: categoryId, type: categoryType } = this.resolveCategory(input);
    validateTransaction(input, categoryType);
    this.requireActiveAccount(input.accountId);
    const paymentMethod = this.resolvePaymentMethod(input.accountId, input.paymentMethod);
    const isExtra = this.resolveExtra(input);
    const sourceId = this.resolveSource(input);

    const now = new Date().toISOString();
    const description = input.description ?? "";
    const status = input.status ?? "posted";
    const { lastInsertRowid } = this.db.run(
      `INSERT INTO transactions
         (account_id, category_id, type, amount_cents, description, transaction_date, status, payment_method, is_extra, source_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.accountId, categoryId, input.type, input.amountCents, description, input.date, status, paymentMethod, isExtra ? 1 : 0, sourceId, now, now],
    );
    return {
      id: lastInsertRowid,
      accountId: input.accountId,
      categoryId,
      type: input.type,
      amountCents: input.amountCents,
      description,
      date: input.date,
      status,
      paymentMethod,
      isExtra,
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
    const { id: categoryId, type: categoryType } = this.resolveCategory(input);
    validateTransaction(input, categoryType);
    if (input.accountId === current.accountId) this.requireAccount(input.accountId);
    else this.requireActiveAccount(input.accountId);
    const paymentMethod = this.resolvePaymentMethod(input.accountId, input.paymentMethod);
    const isExtra = this.resolveExtra(input);
    const sourceId = this.resolveSource(input, current.sourceId);
    this.db.run(
      `UPDATE transactions SET account_id = ?, category_id = ?, type = ?, amount_cents = ?, description = ?,
              transaction_date = ?, status = ?, payment_method = ?, is_extra = ?, source_id = ?, updated_at = ? WHERE id = ?`,
      [input.accountId, categoryId, input.type, input.amountCents, input.description ?? "", input.date, input.status ?? "posted", paymentMethod, isExtra ? 1 : 0, sourceId, now, id],
    );
  }

  listAccountTypes(options: ListAccountsOptions = {}): AccountTypeRecord[] {
    return this.db
      .all<{
        key: string;
        name: string;
        is_liability: number;
        tracks_usage: number;
        is_system: number;
        is_active: number;
        default_payment_method: PaymentMethod | null;
      }>(
        `SELECT key, name, is_liability, tracks_usage, is_system, is_active, default_payment_method FROM account_types
          ${options.includeArchived ? "" : "WHERE is_active = 1"} ORDER BY is_system DESC, rowid`,
      )
      .map((row) => ({
        key: row.key,
        name: row.name,
        isLiability: row.is_liability === 1,
        tracksUsage: row.tracks_usage === 1,
        isSystem: row.is_system === 1,
        isActive: row.is_active === 1,
        defaultPaymentMethod: row.default_payment_method,
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
    const defaultPaymentMethod = input.defaultPaymentMethod ?? null;
    if (defaultPaymentMethod !== null && !isPaymentMethod(defaultPaymentMethod)) throw new Error("Método de pagamento inválido.");
    this.db.run(
      "INSERT INTO account_types (key, name, is_liability, tracks_usage, is_system, default_payment_method) VALUES (?, ?, ?, ?, 0, ?)",
      [key, name, input.isLiability ? 1 : 0, input.tracksUsage ? 1 : 0, defaultPaymentMethod],
    );
    return {
      key,
      name,
      isLiability: !!input.isLiability,
      tracksUsage: !!input.tracksUsage,
      isSystem: false,
      isActive: true,
      defaultPaymentMethod,
    };
  }

  updateAccountType(
    key: AccountType,
    changes: { name?: string; tracksUsage?: boolean; defaultPaymentMethod?: PaymentMethod | null },
  ): void {
    this.requireAccountType(key);
    if (changes.defaultPaymentMethod !== undefined) {
      if (changes.defaultPaymentMethod !== null && !isPaymentMethod(changes.defaultPaymentMethod)) {
        throw new Error("Método de pagamento inválido.");
      }
      this.db.run("UPDATE account_types SET default_payment_method = ? WHERE key = ?", [changes.defaultPaymentMethod, key]);
    }
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
    this.db.run("UPDATE recurring_bills SET default_account_id = NULL WHERE default_account_id = ?", [id]);
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
         COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_cents END), 0) AS income,
         COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents END), 0) AS expense
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       WHERE a.is_active = 1 AND t.status = 'posted' AND substr(t.transaction_date, 1, 7) = ?`,
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
      .all<{ id: number; name: string; type: CategoryType; parent_id: number | null; is_system: number }>(
        "SELECT id, name, type, parent_id, is_system FROM categories WHERE is_active = 1 ORDER BY id",
      )
      .map((row) => ({ id: row.id, name: row.name, type: row.type, parentId: row.parent_id, isSystem: row.is_system === 1 }));
  }

  seedDefaultCategories(): void {
    this.db.transaction(() => {
      const [row] = this.db.all<{ total: number }>("SELECT COUNT(*) AS total FROM categories WHERE is_system = 0");
      if ((row?.total ?? 0) > 0) return;
      for (const category of DEFAULT_CATEGORIES) {
        const parent = this.createCategory({ name: category.name, type: category.type });
        for (const child of category.children ?? []) {
          this.createCategory({ name: child, type: category.type, parentId: parent.id });
        }
      }
    });
  }

  getTotalBalance(asOfDate?: string): number {
    if (asOfDate === undefined) return this.activeBalance("", []);
    if (!isValidDate(asOfDate)) throw new Error("Data inválida: use o formato AAAA-MM-DD.");
    return this.activeBalance("AND t.transaction_date <= ?", [asOfDate]);
  }

  getMonthExtras(month: string): number {
    assertMonth(month);
    const [row] = this.db.all<{ total: number }>(
      `SELECT COALESCE(SUM(t.amount_cents), 0) AS total
         FROM transactions t JOIN accounts a ON a.id = t.account_id
        WHERE a.is_active = 1 AND t.status = 'posted' AND t.type = 'expense' AND t.is_extra = 1
          AND substr(t.transaction_date, 1, 7) = ?`,
      [month],
    );
    return row?.total ?? 0;
  }

  getMonthRollForward(month: string): MonthRollForward {
    assertMonth(month);
    const [year = 0, mon = 1] = month.split("-").map(Number);
    const next = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, "0")}`;
    const openingCents = this.activeBalance("AND t.transaction_date < ?", [`${month}-01`]);
    const closingCents = this.activeBalance("AND t.transaction_date < ?", [`${next}-01`]);
    const { incomeCents, expenseCents } = this.getMonthSummary(month);
    return {
      openingCents,
      incomeCents,
      expenseCents,
      closingCents,
      unexplainedCents: closingCents - openingCents - (incomeCents - expenseCents),
    };
  }

  listTransactionItems(transactionId: number): TransactionItem[] {
    return this.db
      .all<{
        id: number;
        transaction_id: number;
        position: number;
        name: string;
        quantity_milli: number;
        unit_price_cents: number;
        total_cents: number;
      }>(
        `SELECT id, transaction_id, position, name, quantity_milli, unit_price_cents, total_cents
           FROM transaction_items WHERE transaction_id = ? ORDER BY position, id`,
        [transactionId],
      )
      .map((row) => ({
        id: row.id,
        transactionId: row.transaction_id,
        position: row.position,
        name: row.name,
        quantityMilli: row.quantity_milli,
        unitPriceCents: row.unit_price_cents,
        totalCents: row.total_cents,
      }));
  }

  addTransactionItem(transactionId: number, input: NewTransactionItem): TransactionItem {
    const parent = this.db.all<{ transfer_group_id: number | null }>(
      "SELECT transfer_group_id FROM transactions WHERE id = ?",
      [transactionId],
    )[0];
    if (!parent) throw new Error("Lançamento não encontrado.");
    if (parent.transfer_group_id !== null) throw new Error("Uma transferência não tem itens.");
    const totalCents = this.validateItem(input);
    const [last] = this.db.all<{ position: number | null }>(
      "SELECT MAX(position) AS position FROM transaction_items WHERE transaction_id = ?",
      [transactionId],
    );
    const position = (last?.position ?? 0) + 1;
    const name = input.name.trim();
    const { lastInsertRowid } = this.db.run(
      `INSERT INTO transaction_items (transaction_id, position, name, quantity_milli, unit_price_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [transactionId, position, name, input.quantityMilli, input.unitPriceCents, totalCents],
    );
    return {
      id: lastInsertRowid,
      transactionId,
      position,
      name,
      quantityMilli: input.quantityMilli,
      unitPriceCents: input.unitPriceCents,
      totalCents,
    };
  }

  updateTransactionItem(itemId: number, input: NewTransactionItem): void {
    this.requireItem(itemId);
    const totalCents = this.validateItem(input);
    this.db.run("UPDATE transaction_items SET name = ?, quantity_milli = ?, unit_price_cents = ?, total_cents = ? WHERE id = ?", [
      input.name.trim(),
      input.quantityMilli,
      input.unitPriceCents,
      totalCents,
      itemId,
    ]);
  }

  deleteTransactionItem(itemId: number): void {
    this.requireItem(itemId);
    this.db.run("DELETE FROM transaction_items WHERE id = ?", [itemId]);
  }

  getItemsTotal(transactionId: number): ItemsTotal {
    const parent = this.db.all<{ amount_cents: number }>("SELECT amount_cents FROM transactions WHERE id = ?", [transactionId])[0];
    if (!parent) throw new Error("Lançamento não encontrado.");
    const [row] = this.db.all<{ total: number }>(
      "SELECT COALESCE(SUM(total_cents), 0) AS total FROM transaction_items WHERE transaction_id = ?",
      [transactionId],
    );
    const itemsCents = row?.total ?? 0;
    const transactionCents = Math.abs(parent.amount_cents);
    return { itemsCents, transactionCents, differenceCents: transactionCents - itemsCents };
  }

  private requireItem(itemId: number): void {
    if (!this.db.all<{ id: number }>("SELECT id FROM transaction_items WHERE id = ?", [itemId])[0]) {
      throw new Error("Item não encontrado.");
    }
  }

  /** Valida o item e devolve o total dele em centavos, calculado só com inteiros. */
  private validateItem(input: NewTransactionItem): number {
    if (input.name.trim().length === 0) throw new Error("O nome do item não pode ficar vazio.");
    return itemTotalCents(input.quantityMilli, input.unitPriceCents);
  }

  listIncomeSources(options: { includeArchived?: boolean } = {}): IncomeSource[] {
    return this.db
      .all<{ id: number; name: string; is_default: number; is_active: number }>(
        `SELECT id, name, is_default, is_active FROM income_sources ${options.includeArchived ? "" : "WHERE is_active = 1"} ORDER BY id`,
      )
      .map((row) => ({ id: row.id, name: row.name, isDefault: row.is_default === 1, isActive: row.is_active === 1 }));
  }

  createIncomeSource(input: NewIncomeSource): IncomeSource {
    const name = this.validateSourceName(input.name);
    const { lastInsertRowid } = this.db.run("INSERT INTO income_sources (name) VALUES (?)", [name]);
    return { id: lastInsertRowid, name, isDefault: false, isActive: true };
  }

  renameIncomeSource(id: number, name: string): void {
    this.requireSource(id);
    this.db.run("UPDATE income_sources SET name = ? WHERE id = ?", [this.validateSourceName(name, id), id]);
  }

  setIncomeSourceActive(id: number, active: boolean): void {
    const source = this.requireSource(id);
    if (!active && source.is_default === 1) throw new Error("A fonte padrão não pode ser arquivada.");
    this.db.run("UPDATE income_sources SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
  }

  deleteIncomeSource(id: number): void {
    const source = this.requireSource(id);
    if (source.is_default === 1) throw new Error("A fonte padrão não pode ser apagada.");
    const [row] = this.db.all<{ total: number }>(
      `SELECT (SELECT COUNT(*) FROM transactions WHERE source_id = ?) + (SELECT COUNT(*) FROM recurring_incomes WHERE source_id = ?) AS total`,
      [id, id],
    );
    if ((row?.total ?? 0) > 0) throw new Error("A fonte tem receitas: arquive-a em vez de apagar.");
    this.db.run("DELETE FROM income_sources WHERE id = ?", [id]);
  }

  getIncomeBySource(fromMonth: string, toMonth: string): IncomeBySourceRow[] {
    assertMonth(fromMonth);
    assertMonth(toMonth);
    if (fromMonth > toMonth) throw new Error("Período inválido: o mês inicial vem depois do final.");
    return this.db
      .all<{ month: string; source_id: number; source_name: string; total: number }>(
        `SELECT substr(t.transaction_date, 1, 7) AS month, s.id AS source_id, s.name AS source_name, SUM(t.amount_cents) AS total
           FROM transactions t
           JOIN accounts a ON a.id = t.account_id
           JOIN income_sources s ON s.id = t.source_id
          WHERE t.type = 'income' AND t.status = 'posted' AND a.is_active = 1
            AND substr(t.transaction_date, 1, 7) BETWEEN ? AND ?
          GROUP BY month, s.id, s.name
          ORDER BY month, s.id`,
        [fromMonth, toMonth],
      )
      .map((row) => ({ month: row.month, sourceId: row.source_id, sourceName: row.source_name, totalCents: row.total }));
  }

  createRecurringIncome(input: NewRecurringIncome): RecurringIncome {
    assertMonth(input.startPeriod);
    this.validateBill({ ...input, dueMonth: input.dueMonth ?? null });
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("O valor da receita deve ser um número inteiro positivo de centavos.");
    }
    const sourceId = input.sourceId ?? this.defaultSourceId();
    this.requireSource(sourceId);
    const categoryId = this.resolveIncomeCategory(input.categoryId);
    const defaultAccountId = input.defaultAccountId ?? null;
    if (defaultAccountId !== null) this.requireAccount(defaultAccountId);
    const dueMonth = input.frequency === "yearly" ? (input.dueMonth ?? null) : null;
    const id = this.db.transaction(() => {
      const { lastInsertRowid } = this.db.run(
        `INSERT INTO recurring_incomes
           (name, frequency, due_day, due_month, source_id, category_id, default_account_id, start_period, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.name.trim(), input.frequency, input.dueDay, dueMonth, sourceId, categoryId, defaultAccountId, input.startPeriod, new Date().toISOString()],
      );
      this.db.run("INSERT INTO recurring_income_amounts (income_id, effective_period, amount_cents) VALUES (?, ?, ?)", [
        lastInsertRowid,
        input.startPeriod,
        input.amountCents,
      ]);
      return lastInsertRowid;
    });
    return {
      id,
      name: input.name.trim(),
      frequency: input.frequency,
      dueDay: input.dueDay,
      dueMonth,
      sourceId,
      categoryId,
      defaultAccountId,
      startPeriod: input.startPeriod,
      isActive: true,
      amountCents: input.amountCents,
    };
  }

  listRecurringIncomes(options: ListRecurringIncomesOptions = {}): RecurringIncome[] {
    const asOf = options.asOfPeriod ?? "9999-12";
    if (options.asOfPeriod !== undefined) assertMonth(options.asOfPeriod);
    const steps = this.incomeAmountSteps();
    return this.db
      .all<IncomeRow>(
        `SELECT id, name, frequency, due_day, due_month, source_id, category_id, default_account_id, start_period, is_active
           FROM recurring_incomes ${options.includeArchived ? "" : "WHERE is_active = 1"} ORDER BY id`,
      )
      .map((row) => {
        const own = steps.get(row.id) ?? [];
        const earliest = [...own].sort((a, b) => (a.effectivePeriod < b.effectivePeriod ? -1 : 1))[0];
        return {
          id: row.id,
          name: row.name,
          frequency: row.frequency,
          dueDay: row.due_day,
          dueMonth: row.due_month,
          sourceId: row.source_id,
          categoryId: row.category_id,
          defaultAccountId: row.default_account_id,
          startPeriod: row.start_period,
          isActive: row.is_active === 1,
          amountCents: expectedAmountFor(own, asOf) ?? earliest?.amountCents ?? 0,
        };
      });
  }

  updateRecurringIncome(id: number, changes: RecurringIncomeChanges): void {
    const current = this.requireIncome(id);
    const next = {
      name: changes.name ?? current.name,
      frequency: changes.frequency ?? current.frequency,
      dueDay: changes.dueDay ?? current.due_day,
      dueMonth: changes.dueMonth !== undefined ? changes.dueMonth : current.due_month,
    };
    this.validateBill(next);
    const sourceId = changes.sourceId ?? current.source_id;
    this.requireSource(sourceId);
    const categoryId = changes.categoryId !== undefined ? this.resolveIncomeCategory(changes.categoryId) : current.category_id;
    const defaultAccountId = changes.defaultAccountId !== undefined ? changes.defaultAccountId : current.default_account_id;
    if (defaultAccountId !== null) this.requireAccount(defaultAccountId);
    this.db.run(
      `UPDATE recurring_incomes SET name = ?, frequency = ?, due_day = ?, due_month = ?, source_id = ?, category_id = ?,
              default_account_id = ? WHERE id = ?`,
      [next.name.trim(), next.frequency, next.dueDay, next.frequency === "yearly" ? next.dueMonth : null, sourceId, categoryId, defaultAccountId, id],
    );
  }

  setRecurringIncomeActive(id: number, active: boolean): void {
    this.requireIncome(id);
    this.db.run("UPDATE recurring_incomes SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
  }

  deleteRecurringIncome(id: number): void {
    this.requireIncome(id);
    const [row] = this.db.all<{ total: number }>("SELECT COUNT(*) AS total FROM income_receipts WHERE income_id = ?", [id]);
    if ((row?.total ?? 0) > 0) throw new Error("A receita tem recebimentos: arquive-a em vez de excluir.");
    this.db.run("DELETE FROM recurring_incomes WHERE id = ?", [id]);
  }

  setRecurringIncomeAmount(id: number, change: { amountCents: number; fromPeriod: string }): void {
    this.requireIncome(id);
    assertMonth(change.fromPeriod);
    if (!Number.isInteger(change.amountCents) || change.amountCents <= 0) {
      throw new Error("O valor da receita deve ser um número inteiro positivo de centavos.");
    }
    this.db.run(
      `INSERT INTO recurring_income_amounts (income_id, effective_period, amount_cents) VALUES (?, ?, ?)
       ON CONFLICT (income_id, effective_period) DO UPDATE SET amount_cents = excluded.amount_cents`,
      [id, change.fromPeriod, change.amountCents],
    );
  }

  listIncomeOccurrences(period: string, today: string): IncomeOccurrence[] {
    assertMonth(period);
    if (!isValidDate(today)) throw new Error("Data inválida: use o formato AAAA-MM-DD.");
    const steps = this.incomeAmountSteps();
    const receipts = new Map(
      this.db
        .all<{ income_id: number; transaction_id: number; amount_cents: number }>(
          `SELECT r.income_id, r.transaction_id, t.amount_cents
             FROM income_receipts r JOIN transactions t ON t.id = r.transaction_id WHERE r.period = ?`,
          [period],
        )
        .map((row) => [row.income_id, row]),
    );
    const occurrences: IncomeOccurrence[] = [];
    const rows = this.db.all<IncomeRow & { source_name: string; category_name: string }>(
      `SELECT i.id, i.name, i.frequency, i.due_day, i.due_month, i.source_id, i.category_id, i.default_account_id,
              i.start_period, i.is_active, s.name AS source_name, c.name AS category_name
         FROM recurring_incomes i JOIN income_sources s ON s.id = i.source_id JOIN categories c ON c.id = i.category_id`,
    );
    for (const income of rows) {
      const receipt = receipts.get(income.id);
      if (income.is_active !== 1 && !receipt) continue;
      if (period < income.start_period && !receipt) continue;
      const dueDate = dueDateFor({ frequency: income.frequency, dueDay: income.due_day, dueMonth: income.due_month }, period);
      if (dueDate === null) continue;
      const own = steps.get(income.id) ?? [];
      const earliest = [...own].sort((a, b) => (a.effectivePeriod < b.effectivePeriod ? -1 : 1))[0];
      occurrences.push({
        incomeId: income.id,
        name: income.name,
        period,
        dueDate,
        sourceId: income.source_id,
        sourceName: income.source_name,
        categoryId: income.category_id,
        categoryName: income.category_name,
        defaultAccountId: income.default_account_id,
        expectedAmountCents: expectedAmountFor(own, period) ?? earliest?.amountCents ?? 0,
        status: billStatus({ dueDate, paid: receipt !== undefined, today }),
        paidTransactionId: receipt?.transaction_id ?? null,
        paidAmountCents: receipt?.amount_cents ?? null,
      });
    }
    return occurrences.sort((a, b) => (a.dueDate === b.dueDate ? a.name.localeCompare(b.name, "pt-BR") : a.dueDate < b.dueDate ? -1 : 1));
  }

  getIncomeExpectations(period: string, today: string): IncomeExpectations {
    let expectedCents = 0;
    let receivedCents = 0;
    let remainingCents = 0;
    for (const occurrence of this.listIncomeOccurrences(period, today)) {
      expectedCents += occurrence.expectedAmountCents;
      if (occurrence.status === "paid") receivedCents += occurrence.paidAmountCents ?? 0;
      else remainingCents += occurrence.expectedAmountCents;
    }
    return { expectedCents, receivedCents, remainingCents };
  }

  receiveIncome(input: ReceiveIncomeInput): Transaction {
    assertMonth(input.period);
    const income = this.requireIncome(input.incomeId);
    if (income.is_active !== 1) throw new Error("Receita arquivada: reative-a para registrar o recebimento.");
    const dueDate = dueDateFor({ frequency: income.frequency, dueDay: income.due_day, dueMonth: income.due_month }, input.period);
    if (dueDate === null || input.period < income.start_period) throw new Error(`Esta receita não cai em ${input.period}.`);
    const already = this.db.all<{ id: number }>("SELECT id FROM income_receipts WHERE income_id = ? AND period = ?", [input.incomeId, input.period])[0];
    if (already) throw new Error(`Esta receita já foi recebida em ${input.period}.`);
    const expected = expectedAmountFor(this.incomeAmountSteps().get(income.id) ?? [], input.period) ?? 0;
    return this.db.transaction(() => {
      const received = this.addTransaction({
        accountId: input.accountId,
        categoryId: income.category_id,
        type: "income",
        amountCents: input.amountCents ?? expected,
        date: input.date,
        description: income.name,
        sourceId: income.source_id,
      });
      this.db.run("INSERT INTO income_receipts (income_id, period, transaction_id) VALUES (?, ?, ?)", [input.incomeId, input.period, received.id]);
      return received;
    });
  }

  unreceiveIncome(incomeId: number, period: string): void {
    assertMonth(period);
    this.requireIncome(incomeId);
    const receipt = this.db.all<{ transaction_id: number }>("SELECT transaction_id FROM income_receipts WHERE income_id = ? AND period = ?", [incomeId, period])[0];
    if (!receipt) throw new Error(`Esta receita não foi recebida em ${period}.`);
    // O vínculo sai junto (ON DELETE CASCADE).
    this.deleteTransaction(receipt.transaction_id);
  }

  private incomeAmountSteps(): Map<number, BillAmountStep[]> {
    const steps = new Map<number, BillAmountStep[]>();
    for (const row of this.db.all<{ income_id: number; effective_period: string; amount_cents: number }>(
      "SELECT income_id, effective_period, amount_cents FROM recurring_income_amounts",
    )) {
      const list = steps.get(row.income_id) ?? [];
      list.push({ effectivePeriod: row.effective_period, amountCents: row.amount_cents });
      steps.set(row.income_id, list);
    }
    return steps;
  }

  private requireIncome(id: number): IncomeRow {
    const row = this.db.all<IncomeRow>(
      `SELECT id, name, frequency, due_day, due_month, source_id, category_id, default_account_id, start_period, is_active
         FROM recurring_incomes WHERE id = ?`,
      [id],
    )[0];
    if (!row) throw new Error("Receita recorrente não encontrada.");
    return row;
  }

  private requireSource(id: number): { is_default: number; is_active: number } {
    const row = this.db.all<{ is_default: number; is_active: number }>("SELECT is_default, is_active FROM income_sources WHERE id = ?", [id])[0];
    if (!row) throw new Error("Fonte de renda não encontrada.");
    return row;
  }

  private defaultSourceId(): number {
    const row = this.db.all<{ id: number }>("SELECT id FROM income_sources WHERE is_default = 1")[0];
    if (!row) throw new Error("Fonte de renda padrão não encontrada.");
    return row.id;
  }

  private validateSourceName(name: string, ownId?: number): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error("O nome da fonte não pode ficar vazio.");
    const clash = this.db.all<{ id: number }>("SELECT id FROM income_sources WHERE lower(name) = lower(?)", [trimmed])[0];
    if (clash && clash.id !== ownId) throw new Error("Já existe uma fonte com esse nome.");
    return trimmed;
  }

  /** A fonte de uma receita: a escolhida, a padrão quando não vier nada, ou nenhuma (`null`). Despesa nunca tem fonte. */
  private resolveSource(input: { type: CategoryType; sourceId?: number | null }, keep?: number | null): number | null {
    if (input.type === "expense") {
      if (input.sourceId !== undefined && input.sourceId !== null) throw new Error("Só uma receita tem fonte de renda.");
      return null;
    }
    if (input.sourceId === null) return null;
    if (input.sourceId === undefined) return this.defaultSourceId();
    const source = this.requireSource(input.sourceId);
    if (source.is_active !== 1 && input.sourceId !== keep) throw new Error("Fonte de renda arquivada: escolha outra.");
    return input.sourceId;
  }

  private resolveIncomeCategory(categoryId: number | undefined): number {
    if (categoryId === undefined) return this.resolveCategory({ type: "income" }).id;
    const category = this.resolveCategory({ categoryId, type: "income" });
    if (category.type !== "income") throw new Error("A categoria de uma receita recorrente deve ser de receita.");
    return category.id;
  }

  createGoal(input: NewGoal): Goal {
    const name = this.validateGoalName(input.name);
    const targetCents = input.targetCents ?? null;
    const targetDate = input.targetDate ?? null;
    this.validateGoalTarget(targetCents, targetDate);
    const { lastInsertRowid } = this.db.run("INSERT INTO goals (name, target_cents, target_date, created_at) VALUES (?, ?, ?, ?)", [
      name,
      targetCents,
      targetDate,
      new Date().toISOString(),
    ]);
    return { id: lastInsertRowid, name, targetCents, targetDate, status: "active", savedCents: 0 };
  }

  listGoals(options: { includeInactive?: boolean } = {}): Goal[] {
    return this.db
      .all<{ id: number; name: string; target_cents: number | null; target_date: string | null; status: GoalStatus; saved: number }>(
        `SELECT g.id, g.name, g.target_cents, g.target_date, g.status,
                COALESCE((SELECT SUM(c.amount_cents) FROM goal_contributions c WHERE c.goal_id = g.id), 0) AS saved
           FROM goals g ${options.includeInactive ? "" : "WHERE g.status = 'active'"} ORDER BY g.id`,
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        targetCents: row.target_cents,
        targetDate: row.target_date,
        status: row.status,
        savedCents: row.saved,
      }));
  }

  updateGoal(id: number, changes: GoalChanges): void {
    const current = this.requireGoal(id);
    const name = changes.name !== undefined ? this.validateGoalName(changes.name, id) : current.name;
    const targetCents = changes.targetCents !== undefined ? changes.targetCents : current.target_cents;
    const targetDate = changes.targetDate !== undefined ? changes.targetDate : current.target_date;
    this.validateGoalTarget(targetCents, targetDate);
    this.db.run("UPDATE goals SET name = ?, target_cents = ?, target_date = ? WHERE id = ?", [name, targetCents, targetDate, id]);
  }

  setGoalStatus(id: number, status: GoalStatus): void {
    this.requireGoal(id);
    if (status !== "active" && status !== "executed" && status !== "archived") throw new Error("Situação de meta inválida.");
    this.db.run("UPDATE goals SET status = ? WHERE id = ?", [status, id]);
  }

  deleteGoal(id: number): void {
    this.requireGoal(id);
    const [row] = this.db.all<{ total: number }>("SELECT COUNT(*) AS total FROM goal_contributions WHERE goal_id = ?", [id]);
    if ((row?.total ?? 0) > 0) throw new Error("A meta tem aportes: arquive-a em vez de apagar.");
    this.db.run("DELETE FROM goals WHERE id = ?", [id]);
  }

  addContribution(goalId: number, input: NewContribution): Contribution {
    const goal = this.requireGoal(goalId);
    if (goal.status !== "active") throw new Error("Só uma meta ativa recebe aportes: reative a meta (ela está executada ou arquivada).");
    this.validateContribution(input);
    if (this.goalSaved(goalId) + input.amountCents < 0) throw new Error("O resgate passa do que está guardado na meta.");
    const note = input.note?.trim() ? input.note.trim() : null;
    const { lastInsertRowid } = this.db.run(
      "INSERT INTO goal_contributions (goal_id, amount_cents, contribution_date, note, created_at) VALUES (?, ?, ?, ?, ?)",
      [goalId, input.amountCents, input.date, note, new Date().toISOString()],
    );
    return { id: lastInsertRowid, goalId, amountCents: input.amountCents, date: input.date, note };
  }

  updateContribution(id: number, input: NewContribution): void {
    const current = this.requireContribution(id);
    this.validateContribution(input);
    if (this.goalSaved(current.goal_id) - current.amount_cents + input.amountCents < 0) {
      throw new Error("Essa mudança deixaria a meta com valor negativo: o resgate passaria do que está guardado.");
    }
    const note = input.note?.trim() ? input.note.trim() : null;
    this.db.run("UPDATE goal_contributions SET amount_cents = ?, contribution_date = ?, note = ? WHERE id = ?", [
      input.amountCents,
      input.date,
      note,
      id,
    ]);
  }

  deleteContribution(id: number): void {
    const current = this.requireContribution(id);
    if (this.goalSaved(current.goal_id) - current.amount_cents < 0) {
      throw new Error("Apagar esse aporte deixaria a meta com valor negativo: há resgates que dependem dele.");
    }
    this.db.run("DELETE FROM goal_contributions WHERE id = ?", [id]);
  }

  listContributions(goalId: number): Contribution[] {
    return this.db
      .all<{ id: number; goal_id: number; amount_cents: number; contribution_date: string; note: string | null }>(
        `SELECT id, goal_id, amount_cents, contribution_date, note FROM goal_contributions
          WHERE goal_id = ? ORDER BY contribution_date DESC, id DESC`,
        [goalId],
      )
      .map((row) => ({ id: row.id, goalId: row.goal_id, amountCents: row.amount_cents, date: row.contribution_date, note: row.note }));
  }

  distributeToGoals(allocations: { goalId: number; amountCents: number }[], date: string, note?: string): void {
    if (allocations.length === 0) throw new Error("Informe ao menos uma meta para receber o valor.");
    this.db.transaction(() => {
      for (const allocation of allocations) {
        if (!Number.isInteger(allocation.amountCents) || allocation.amountCents <= 0) {
          throw new Error("O valor de cada parte deve ser um número inteiro positivo de centavos.");
        }
        this.addContribution(allocation.goalId, { amountCents: allocation.amountCents, date, note });
      }
    });
  }

  getReservedSummary(): ReservedSummary {
    const reservedCents = this.reservedCents();
    return { reservedCents, freeCents: this.getTotalBalance() - reservedCents };
  }

  getGoalReport(goalId: number, period: string): GoalReport {
    assertMonth(period);
    const row = this.requireGoal(goalId);
    const goal = this.listGoals({ includeInactive: true }).find((candidate) => candidate.id === goalId);
    if (!goal) throw new Error("Meta não encontrada.");
    const nets = new Map(
      this.db
        .all<{ month: string; total: number }>(
          `SELECT substr(contribution_date, 1, 7) AS month, SUM(amount_cents) AS total
             FROM goal_contributions WHERE goal_id = ? GROUP BY month ORDER BY month`,
          [goalId],
        )
        .map((entry) => [entry.month, entry.total]),
    );
    const months: GoalReportMonth[] = [];
    const known = [...nets.keys()].sort();
    const first = known[0];
    if (first !== undefined) {
      const last = known[known.length - 1] ?? first;
      const end = last > period ? last : period;
      let cursor = first;
      let cumulativeCents = 0;
      while (cursor <= end) {
        const netCents = nets.get(cursor) ?? 0;
        cumulativeCents += netCents;
        months.push({ month: cursor, netCents, cumulativeCents });
        const [year = 0, mon = 1] = cursor.split("-").map(Number);
        cursor = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, "0")}`;
      }
    }
    const averageMonthly = averageMonthlyCents(months.map((month) => month.netCents));
    return {
      goal,
      savedCents: goal.savedCents,
      months,
      progressPercent: progressPercent(goal.savedCents, row.target_cents),
      averageMonthlyCents: averageMonthly,
      estimatedPeriod:
        row.target_cents === null
          ? null
          : estimateCompletionPeriod({ remainingCents: row.target_cents - goal.savedCents, perMonthCents: averageMonthly, period }),
      neededMonthlyCents: monthlyContributionNeeded({
        targetCents: row.target_cents,
        savedCents: goal.savedCents,
        period,
        targetDate: row.target_date,
      }),
    };
  }

  getGoalsOverview(fromMonth: string, toMonth: string): GoalOverviewRow[] {
    assertMonth(fromMonth);
    assertMonth(toMonth);
    if (fromMonth > toMonth) throw new Error("Período inválido: o mês inicial vem depois do final.");
    return this.db
      .all<{ id: number; name: string; contributed: number; withdrawn: number; saved: number }>(
        `SELECT g.id, g.name,
                COALESCE((SELECT SUM(c.amount_cents) FROM goal_contributions c
                           WHERE c.goal_id = g.id AND c.amount_cents > 0 AND substr(c.contribution_date, 1, 7) BETWEEN ? AND ?), 0) AS contributed,
                COALESCE((SELECT -SUM(c.amount_cents) FROM goal_contributions c
                           WHERE c.goal_id = g.id AND c.amount_cents < 0 AND substr(c.contribution_date, 1, 7) BETWEEN ? AND ?), 0) AS withdrawn,
                COALESCE((SELECT SUM(c.amount_cents) FROM goal_contributions c WHERE c.goal_id = g.id), 0) AS saved
           FROM goals g WHERE g.status = 'active' ORDER BY g.id`,
        [fromMonth, toMonth, fromMonth, toMonth],
      )
      .map((row) => ({
        goalId: row.id,
        goalName: row.name,
        contributedCents: row.contributed,
        withdrawnCents: row.withdrawn,
        netCents: row.contributed - row.withdrawn,
        savedCents: row.saved,
      }));
  }

  getMoneyFlow(month: string): MoneyFlow {
    assertMonth(month);
    const edges = new Map<string, MoneyFlowEdge>();
    const add = (kind: MoneyFlowEdge["kind"], from: [string, string], to: [string, string], cents: number, transactionIds: number[]) => {
      const id = `${kind}:${from[0]}>${to[0]}`;
      const current = edges.get(id);
      if (current) {
        current.cents += cents;
        current.transactionIds.push(...transactionIds);
      } else {
        edges.set(id, { id, kind, fromKey: from[0], fromLabel: from[1], toKey: to[0], toLabel: to[1], cents, transactionIds: [...transactionIds] });
      }
    };

    const incomes = this.db.all<{ id: number; amount_cents: number; account_id: number; account_name: string; source_id: number | null; source_name: string | null }>(
      `SELECT t.id, t.amount_cents, t.account_id, a.name AS account_name, t.source_id, s.name AS source_name
         FROM transactions t JOIN accounts a ON a.id = t.account_id LEFT JOIN income_sources s ON s.id = t.source_id
        WHERE t.type = 'income' AND t.status = 'posted' AND a.is_active = 1 AND substr(t.transaction_date, 1, 7) = ?`,
      [month],
    );
    for (const row of incomes) {
      add(
        "income",
        row.source_id === null ? ["source:none", "Sem fonte"] : [`source:${row.source_id}`, row.source_name ?? ""],
        [`account:${row.account_id}`, row.account_name],
        row.amount_cents,
        [row.id],
      );
    }

    const expenses = this.db.all<{
      id: number;
      amount_cents: number;
      account_id: number;
      account_name: string;
      is_extra: number;
      is_bill: number;
      category_id: number;
      category_name: string;
    }>(
      `SELECT t.id, t.amount_cents, t.account_id, a.name AS account_name, t.is_extra,
              CASE WHEN bp.transaction_id IS NULL THEN 0 ELSE 1 END AS is_bill,
              COALESCE(p.id, c.id) AS category_id, COALESCE(p.name, c.name) AS category_name
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         JOIN categories c ON c.id = t.category_id
         LEFT JOIN categories p ON p.id = c.parent_id
         LEFT JOIN bill_payments bp ON bp.transaction_id = t.id
        WHERE t.type = 'expense' AND t.status = 'posted' AND a.is_active = 1 AND substr(t.transaction_date, 1, 7) = ?`,
      [month],
    );
    for (const row of expenses) {
      const destination: [string, string] = row.is_extra === 1
        ? ["dest:extra", "Despesas extras"]
        : row.is_bill === 1
          ? ["dest:bills", "Contas a pagar"]
          : [`dest:category:${row.category_id}`, row.category_name];
      add("expense", [`account:${row.account_id}`, row.account_name], destination, row.amount_cents, [row.id]);
    }

    const transfers = this.db.all<{ out_id: number; in_id: number; amount: number; from_id: number; from_name: string; to_id: number; to_name: string }>(
      `SELECT o.id AS out_id, i.id AS in_id, i.amount_cents AS amount, fa.id AS from_id, fa.name AS from_name, ta.id AS to_id, ta.name AS to_name
         FROM transactions o
         JOIN transactions i ON i.transfer_group_id = o.transfer_group_id AND i.amount_cents > 0
         JOIN accounts fa ON fa.id = o.account_id
         JOIN accounts ta ON ta.id = i.account_id
        WHERE o.type = 'transfer' AND o.amount_cents < 0 AND o.status = 'posted' AND fa.is_active = 1 AND ta.is_active = 1
          AND substr(o.transaction_date, 1, 7) = ?`,
      [month],
    );
    for (const row of transfers) {
      add("transfer", [`account:${row.from_id}`, row.from_name], [`account:${row.to_id}`, row.to_name], row.amount, [row.out_id, row.in_id]);
    }

    const [goals] = this.db.all<{ total: number }>(
      `SELECT COALESCE(SUM(c.amount_cents), 0) AS total FROM goal_contributions c JOIN goals g ON g.id = c.goal_id
        WHERE g.status = 'active' AND substr(c.contribution_date, 1, 7) = ?`,
      [month],
    );
    return {
      month,
      edges: [...edges.values()].sort((a, b) => b.cents - a.cents || (a.id < b.id ? -1 : 1)),
      goalsNetCents: goals?.total ?? 0,
    };
  }

  /** Total reservado: o guardado nas metas ativas. Executadas e arquivadas liberam a reserva. */
  private reservedCents(): number {
    const [row] = this.db.all<{ total: number }>(
      `SELECT COALESCE(SUM(c.amount_cents), 0) AS total
         FROM goal_contributions c JOIN goals g ON g.id = c.goal_id WHERE g.status = 'active'`,
    );
    return row?.total ?? 0;
  }

  private goalSaved(goalId: number): number {
    const [row] = this.db.all<{ total: number }>("SELECT COALESCE(SUM(amount_cents), 0) AS total FROM goal_contributions WHERE goal_id = ?", [goalId]);
    return row?.total ?? 0;
  }

  private requireGoal(id: number): { name: string; target_cents: number | null; target_date: string | null; status: GoalStatus } {
    const row = this.db.all<{ name: string; target_cents: number | null; target_date: string | null; status: GoalStatus }>(
      "SELECT name, target_cents, target_date, status FROM goals WHERE id = ?",
      [id],
    )[0];
    if (!row) throw new Error("Meta não encontrada.");
    return row;
  }

  private requireContribution(id: number): { goal_id: number; amount_cents: number } {
    const row = this.db.all<{ goal_id: number; amount_cents: number }>("SELECT goal_id, amount_cents FROM goal_contributions WHERE id = ?", [id])[0];
    if (!row) throw new Error("Aporte não encontrado.");
    return row;
  }

  private validateGoalName(name: string, ownId?: number): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error("O nome da meta não pode ficar vazio.");
    const clash = this.db.all<{ id: number }>("SELECT id FROM goals WHERE lower(name) = lower(?)", [trimmed])[0];
    if (clash && clash.id !== ownId) throw new Error("Já existe uma meta com esse nome.");
    return trimmed;
  }

  private validateGoalTarget(targetCents: number | null, targetDate: string | null): void {
    if (targetCents !== null && (!Number.isInteger(targetCents) || targetCents <= 0)) {
      throw new Error("O alvo deve ser um número inteiro positivo de centavos.");
    }
    if (targetDate !== null && !isValidDate(targetDate)) throw new Error("Prazo inválido: use o formato AAAA-MM-DD.");
  }

  private validateContribution(input: NewContribution): void {
    if (!Number.isInteger(input.amountCents) || input.amountCents === 0) {
      throw new Error("O valor do aporte deve ser um número inteiro de centavos diferente de zero.");
    }
    if (!isValidDate(input.date)) throw new Error("Data inválida: use o formato AAAA-MM-DD.");
  }

  createRecurringBill(input: NewRecurringBill): RecurringBill {
    assertMonth(input.startPeriod);
    this.validateBill({ ...input, dueMonth: input.dueMonth ?? null });
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error("O valor da conta deve ser um número inteiro positivo de centavos.");
    }
    const categoryId = this.resolveBillCategory(input.categoryId);
    const defaultAccountId = input.defaultAccountId ?? null;
    if (defaultAccountId !== null) this.requireAccount(defaultAccountId);
    const dueMonth = input.frequency === "yearly" ? (input.dueMonth ?? null) : null;
    const id = this.db.transaction(() => {
      const { lastInsertRowid } = this.db.run(
        `INSERT INTO recurring_bills
           (name, frequency, due_day, due_month, category_id, classification, default_account_id, start_period, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.name.trim(), input.frequency, input.dueDay, dueMonth, categoryId, input.classification, defaultAccountId, input.startPeriod, new Date().toISOString()],
      );
      this.db.run("INSERT INTO recurring_bill_amounts (bill_id, effective_period, amount_cents) VALUES (?, ?, ?)", [
        lastInsertRowid,
        input.startPeriod,
        input.amountCents,
      ]);
      return lastInsertRowid;
    });
    return {
      id,
      name: input.name.trim(),
      frequency: input.frequency,
      dueDay: input.dueDay,
      dueMonth,
      categoryId,
      classification: input.classification,
      defaultAccountId,
      startPeriod: input.startPeriod,
      isActive: true,
      amountCents: input.amountCents,
    };
  }

  listRecurringBills(options: ListRecurringBillsOptions = {}): RecurringBill[] {
    const asOf = options.asOfPeriod ?? "9999-12";
    if (options.asOfPeriod !== undefined) assertMonth(options.asOfPeriod);
    const steps = this.billAmountSteps();
    return this.db
      .all<BillRow>(
        `SELECT id, name, frequency, due_day, due_month, category_id, classification, default_account_id, start_period, is_active
           FROM recurring_bills ${options.includeArchived ? "" : "WHERE is_active = 1"} ORDER BY id`,
      )
      .map((row) => {
        const own = steps.get(row.id) ?? [];
        const earliest = [...own].sort((a, b) => (a.effectivePeriod < b.effectivePeriod ? -1 : 1))[0];
        return {
          id: row.id,
          name: row.name,
          frequency: row.frequency,
          dueDay: row.due_day,
          dueMonth: row.due_month,
          categoryId: row.category_id,
          classification: row.classification,
          defaultAccountId: row.default_account_id,
          startPeriod: row.start_period,
          isActive: row.is_active === 1,
          amountCents: expectedAmountFor(own, asOf) ?? earliest?.amountCents ?? 0,
        };
      });
  }

  updateRecurringBill(id: number, changes: RecurringBillChanges): void {
    const current = this.requireBill(id);
    const next = {
      name: changes.name ?? current.name,
      frequency: changes.frequency ?? current.frequency,
      dueDay: changes.dueDay ?? current.due_day,
      dueMonth: changes.dueMonth !== undefined ? changes.dueMonth : current.due_month,
    };
    this.validateBill(next);
    const categoryId = changes.categoryId !== undefined ? this.resolveBillCategory(changes.categoryId) : current.category_id;
    const defaultAccountId = changes.defaultAccountId !== undefined ? changes.defaultAccountId : current.default_account_id;
    if (defaultAccountId !== null) this.requireAccount(defaultAccountId);
    this.db.run(
      `UPDATE recurring_bills SET name = ?, frequency = ?, due_day = ?, due_month = ?, category_id = ?, classification = ?,
              default_account_id = ? WHERE id = ?`,
      [
        next.name.trim(),
        next.frequency,
        next.dueDay,
        next.frequency === "yearly" ? next.dueMonth : null,
        categoryId,
        changes.classification ?? current.classification,
        defaultAccountId,
        id,
      ],
    );
  }

  setRecurringBillActive(id: number, active: boolean): void {
    this.requireBill(id);
    this.db.run("UPDATE recurring_bills SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
  }

  deleteRecurringBill(id: number): void {
    this.requireBill(id);
    const [row] = this.db.all<{ total: number }>("SELECT COUNT(*) AS total FROM bill_payments WHERE bill_id = ?", [id]);
    if ((row?.total ?? 0) > 0) throw new Error("A conta tem pagamentos: arquive-a em vez de excluir.");
    this.db.run("DELETE FROM recurring_bills WHERE id = ?", [id]);
  }

  setRecurringBillAmount(id: number, change: { amountCents: number; fromPeriod: string }): void {
    this.requireBill(id);
    assertMonth(change.fromPeriod);
    if (!Number.isInteger(change.amountCents) || change.amountCents <= 0) {
      throw new Error("O valor da conta deve ser um número inteiro positivo de centavos.");
    }
    this.db.run(
      `INSERT INTO recurring_bill_amounts (bill_id, effective_period, amount_cents) VALUES (?, ?, ?)
       ON CONFLICT (bill_id, effective_period) DO UPDATE SET amount_cents = excluded.amount_cents`,
      [id, change.fromPeriod, change.amountCents],
    );
  }

  listBillOccurrences(period: string, today: string): BillOccurrence[] {
    assertMonth(period);
    if (!isValidDate(today)) throw new Error("Data inválida: use o formato AAAA-MM-DD.");
    const steps = this.billAmountSteps();
    const payments = new Map(
      this.db
        .all<{ bill_id: number; transaction_id: number; amount_cents: number }>(
          `SELECT p.bill_id, p.transaction_id, t.amount_cents
             FROM bill_payments p JOIN transactions t ON t.id = p.transaction_id WHERE p.period = ?`,
          [period],
        )
        .map((row) => [row.bill_id, row]),
    );
    const occurrences: BillOccurrence[] = [];
    const bills = this.db.all<BillRow & { category_name: string }>(
      `SELECT b.id, b.name, b.frequency, b.due_day, b.due_month, b.category_id, b.classification, b.default_account_id,
              b.start_period, b.is_active, c.name AS category_name
         FROM recurring_bills b JOIN categories c ON c.id = b.category_id`,
    );
    for (const bill of bills) {
      const payment = payments.get(bill.id);
      if (bill.is_active !== 1 && !payment) continue;
      if (period < bill.start_period && !payment) continue;
      const dueDate = dueDateFor({ frequency: bill.frequency, dueDay: bill.due_day, dueMonth: bill.due_month }, period);
      if (dueDate === null) continue;
      const own = steps.get(bill.id) ?? [];
      const earliest = [...own].sort((a, b) => (a.effectivePeriod < b.effectivePeriod ? -1 : 1))[0];
      occurrences.push({
        billId: bill.id,
        name: bill.name,
        period,
        dueDate,
        classification: bill.classification,
        categoryId: bill.category_id,
        categoryName: bill.category_name,
        defaultAccountId: bill.default_account_id,
        expectedAmountCents: expectedAmountFor(own, period) ?? earliest?.amountCents ?? 0,
        status: billStatus({ dueDate, paid: payment !== undefined, today }),
        paidTransactionId: payment?.transaction_id ?? null,
        paidAmountCents: payment?.amount_cents ?? null,
      });
    }
    return occurrences.sort((a, b) => (a.dueDate === b.dueDate ? a.name.localeCompare(b.name, "pt-BR") : a.dueDate < b.dueDate ? -1 : 1));
  }

  getBillsSummary(period: string, today: string): BillsSummary {
    const occurrences = this.listBillOccurrences(period, today);
    let expectedCents = 0;
    let paidCents = 0;
    let remainingCents = 0;
    for (const occurrence of occurrences) {
      expectedCents += occurrence.expectedAmountCents;
      if (occurrence.status === "paid") paidCents += occurrence.paidAmountCents ?? 0;
      else remainingCents += occurrence.expectedAmountCents;
    }
    return { expectedCents, paidCents, remainingCents, freeAfterCents: this.getTotalBalance() - this.reservedCents() - remainingCents };
  }

  payBill(input: PayBillInput): Transaction {
    assertMonth(input.period);
    const bill = this.requireBill(input.billId);
    if (bill.is_active !== 1) throw new Error("Conta arquivada: reative-a para registrar o pagamento.");
    const dueDate = dueDateFor({ frequency: bill.frequency, dueDay: bill.due_day, dueMonth: bill.due_month }, input.period);
    if (dueDate === null || input.period < bill.start_period) throw new Error(`Esta conta não vence em ${input.period}.`);
    const already = this.db.all<{ id: number }>("SELECT id FROM bill_payments WHERE bill_id = ? AND period = ?", [input.billId, input.period])[0];
    if (already) throw new Error(`Esta conta já foi paga em ${input.period}.`);
    const own = this.billAmountSteps().get(bill.id) ?? [];
    const expected = expectedAmountFor(own, input.period) ?? 0;
    return this.db.transaction(() => {
      const paid = this.addTransaction({
        accountId: input.accountId,
        categoryId: bill.category_id,
        type: "expense",
        amountCents: input.amountCents ?? expected,
        date: input.date,
        description: bill.name,
      });
      this.db.run("INSERT INTO bill_payments (bill_id, period, transaction_id) VALUES (?, ?, ?)", [input.billId, input.period, paid.id]);
      return paid;
    });
  }

  unpayBill(billId: number, period: string): void {
    assertMonth(period);
    this.requireBill(billId);
    const payment = this.db.all<{ transaction_id: number }>("SELECT transaction_id FROM bill_payments WHERE bill_id = ? AND period = ?", [billId, period])[0];
    if (!payment) throw new Error(`Esta conta não foi paga em ${period}.`);
    // O vínculo sai junto (ON DELETE CASCADE).
    this.deleteTransaction(payment.transaction_id);
  }

  private billAmountSteps(): Map<number, BillAmountStep[]> {
    const steps = new Map<number, BillAmountStep[]>();
    for (const row of this.db.all<{ bill_id: number; effective_period: string; amount_cents: number }>(
      "SELECT bill_id, effective_period, amount_cents FROM recurring_bill_amounts",
    )) {
      const list = steps.get(row.bill_id) ?? [];
      list.push({ effectivePeriod: row.effective_period, amountCents: row.amount_cents });
      steps.set(row.bill_id, list);
    }
    return steps;
  }

  private requireBill(id: number): BillRow {
    const row = this.db.all<BillRow>(
      `SELECT id, name, frequency, due_day, due_month, category_id, classification, default_account_id, start_period, is_active
         FROM recurring_bills WHERE id = ?`,
      [id],
    )[0];
    if (!row) throw new Error("Conta recorrente não encontrada.");
    return row;
  }

  private validateBill(bill: { name: string; frequency: BillFrequency; dueDay: number; dueMonth: number | null }): void {
    if (bill.name.trim().length === 0) throw new Error("O nome da conta não pode ficar vazio.");
    if (bill.frequency !== "monthly" && bill.frequency !== "yearly") throw new Error("A periodicidade deve ser mensal ou anual.");
    if (!Number.isInteger(bill.dueDay) || bill.dueDay < 1 || bill.dueDay > 31) throw new Error("O dia do vencimento deve ser de 1 a 31.");
    if (bill.frequency === "yearly" && (bill.dueMonth === null || !Number.isInteger(bill.dueMonth) || bill.dueMonth < 1 || bill.dueMonth > 12)) {
      throw new Error("Informe o mês do vencimento (1 a 12) das contas anuais.");
    }
  }

  private resolveBillCategory(categoryId: number | undefined): number {
    if (categoryId === undefined) return this.resolveCategory({ type: "expense" }).id;
    const category = this.resolveCategory({ categoryId, type: "expense" });
    if (category.type !== "expense") throw new Error("A categoria de uma conta a pagar deve ser de despesa.");
    return category.id;
  }

  /** Saldos iniciais das contas ativas mais os lançamentos `posted` delas, com um filtro extra opcional. */
  private activeBalance(extraWhere: string, params: SqlValue[]): number {
    const [row] = this.db.all<{ total: number }>(
      `SELECT
         (SELECT COALESCE(SUM(opening_balance_cents), 0) FROM accounts WHERE is_active = 1)
         + (SELECT COALESCE(SUM(CASE t.type WHEN 'expense' THEN -t.amount_cents ELSE t.amount_cents END), 0)
              FROM transactions t JOIN accounts a ON a.id = t.account_id
             WHERE a.is_active = 1 AND t.status = 'posted' ${extraWhere}) AS total`,
      params,
    );
    return row?.total ?? 0;
  }

  getExpensesByCategory(month: string): CategorySpend[] {
    assertMonth(month);
    return this.db.all<CategorySpend>(
      `SELECT COALESCE(p.id, c.id) AS categoryId, COALESCE(p.name, c.name) AS name, SUM(t.amount_cents) AS totalCents
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         JOIN categories c ON c.id = t.category_id
         LEFT JOIN categories p ON p.id = c.parent_id
        WHERE a.is_active = 1 AND t.type = 'expense' AND t.status = 'posted' AND substr(t.transaction_date, 1, 7) = ?
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
    if (filter.paymentMethod !== undefined) {
      where.push("t.payment_method = ?");
      params.push(filter.paymentMethod);
    }
    if (filter.sourceId !== undefined) {
      where.push("t.source_id = ?");
      params.push(filter.sourceId);
    }
    if (filter.onlyExtra) where.push("t.is_extra = 1");
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
        payment_method: PaymentMethod | null;
        is_extra: number;
        source_id: number | null;
        source_name: string | null;
        transfer_group_id: number | null;
        counterpart_name: string | null;
      }>(
        `SELECT t.id, t.account_id, a.name AS account_name, t.category_id, c.name AS category_name, t.type,
                t.amount_cents, t.description, t.transaction_date, t.status, t.payment_method, t.is_extra, t.source_id,
                src.name AS source_name, t.transfer_group_id,
                (SELECT x.name FROM transactions o JOIN accounts x ON x.id = o.account_id
                  WHERE o.transfer_group_id = t.transfer_group_id AND o.id <> t.id) AS counterpart_name
           FROM transactions t
           JOIN accounts a ON a.id = t.account_id
           LEFT JOIN categories c ON c.id = t.category_id
           LEFT JOIN income_sources src ON src.id = t.source_id
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
        paymentMethod: row.payment_method,
        isExtra: row.is_extra === 1,
        sourceId: row.source_id,
        sourceName: row.source_name,
        transferGroupId: row.transfer_group_id,
        counterpartAccountName: row.counterpart_name,
      }));
  }

  /** O método pedido, o padrão do tipo da conta quando não vier nada, ou nenhum (`null`). */
  private resolvePaymentMethod(accountId: number, requested: PaymentMethod | null | undefined): PaymentMethod | null {
    if (requested === null) return null;
    if (requested !== undefined) {
      if (!isPaymentMethod(requested)) throw new Error("Método de pagamento inválido.");
      return requested;
    }
    const row = this.db.all<{ default_payment_method: PaymentMethod | null }>(
      "SELECT ty.default_payment_method FROM accounts a JOIN account_types ty ON ty.key = a.type WHERE a.id = ?",
      [accountId],
    )[0];
    return row?.default_payment_method ?? null;
  }

  private resolveExtra(input: { type: CategoryType; isExtra?: boolean }): boolean {
    if (input.isExtra && input.type !== "expense") throw new Error("Só uma despesa pode ser marcada como extra.");
    return input.isExtra === true;
  }

  /** A categoria escolhida ou, sem escolha, a "Sem categoria" do tipo do lançamento. */
  private resolveCategory(input: { categoryId?: number; type: CategoryType }): { id: number; type: CategoryType } {
    const row =
      input.categoryId !== undefined
        ? this.db.all<{ id: number; type: CategoryType }>("SELECT id, type FROM categories WHERE id = ?", [input.categoryId])[0]
        : this.db.all<{ id: number; type: CategoryType }>(
            "SELECT id, type FROM categories WHERE is_system = 1 AND type = ?",
            [input.type],
          )[0];
    if (!row) throw new Error("Categoria não encontrada.");
    return row;
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

interface IncomeRow {
  id: number;
  name: string;
  frequency: BillFrequency;
  due_day: number;
  due_month: number | null;
  source_id: number;
  category_id: number;
  default_account_id: number | null;
  start_period: string;
  is_active: number;
}

interface BillRow {
  id: number;
  name: string;
  frequency: BillFrequency;
  due_day: number;
  due_month: number | null;
  category_id: number;
  classification: BillClassification;
  default_account_id: number | null;
  start_period: string;
  is_active: number;
}

function assertMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mês inválido: use o formato AAAA-MM.");
}

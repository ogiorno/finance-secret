import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository, type MoneyFlowEdge } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Money flow of a month ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const checking = repo.createAccount({ name: "Conta corrente", type: "checking", openingBalanceCents: 100000 });
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const wife = repo.createIncomeSource({ name: "Esposa" });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    const food = repo.createCategory({ name: "Alimentação", type: "expense" });
    const market = repo.createCategory({ name: "Mercado", type: "expense", parentId: food.id });
    const health = repo.createCategory({ name: "Saúde", type: "expense" });
    return { checking, card, wife, salary, food, market, health };
  }

  const edge = (edges: MoneyFlowEdge[], kind: MoneyFlowEdge["kind"], from: string, to: string) =>
    edges.find((candidate) => candidate.kind === kind && candidate.fromLabel === from && candidate.toLabel === to);

  it("goes from the sources into the accounts, summing the income of each pair", () => {
    const { checking, wife, salary } = setup();
    repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 500000, date: "2026-03-05" });
    repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 20000, date: "2026-03-06" });
    repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 250000, date: "2026-03-10", sourceId: wife.id });

    const { edges } = repo.getMoneyFlow("2026-03");

    expect(edge(edges, "income", "Eu", "Conta corrente")).toMatchObject({ cents: 520000, transactionIds: expect.any(Array) });
    expect(edge(edges, "income", "Eu", "Conta corrente")?.transactionIds).toHaveLength(2);
    expect(edge(edges, "income", "Esposa", "Conta corrente")?.cents).toBe(250000);
  });

  it("goes from the accounts to the top-level category, joining the subcategories", () => {
    const { checking, card, market, food, health } = setup();
    repo.addTransaction({ accountId: card.id, categoryId: market.id, type: "expense", amountCents: 52200, date: "2026-03-10" });
    repo.addTransaction({ accountId: card.id, categoryId: food.id, type: "expense", amountCents: 1000, date: "2026-03-11" });
    repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 17500, date: "2026-03-12" });

    // A fatura do cartão fecha em 1º de abril: as compras de março entram no fluxo de abril.
    expect(edge(repo.getMoneyFlow("2026-04").edges, "expense", "Cartão", "Alimentação")?.cents).toBe(53200);
    expect(edge(repo.getMoneyFlow("2026-03").edges, "expense", "Conta corrente", "Saúde")?.cents).toBe(17500);
  });

  it("sends extra expenses to Despesas extras and bills paid to Contas a pagar", () => {
    const { checking, health } = setup();
    repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 18000, date: "2026-03-10", isExtra: true });
    const bill = repo.createRecurringBill({ name: "Aluguel", amountCents: 180000, frequency: "monthly", dueDay: 5, classification: "fixed", startPeriod: "2026-03" });
    repo.payBill({ billId: bill.id, period: "2026-03", accountId: checking.id, date: "2026-03-05" });

    const { edges } = repo.getMoneyFlow("2026-03");

    expect(edge(edges, "expense", "Conta corrente", "Despesas extras")?.cents).toBe(18000);
    expect(edge(edges, "expense", "Conta corrente", "Contas a pagar")?.cents).toBe(180000);
    expect(edge(edges, "expense", "Conta corrente", "Saúde")).toBeUndefined();
  });

  it("shows transfers between accounts apart from spending, with both ends active", () => {
    const { checking, card } = setup();
    const other = repo.createAccount({ name: "Antiga", type: "checking" });
    repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 65000, date: "2026-03-28" });
    repo.addTransfer({ fromAccountId: checking.id, toAccountId: other.id, amountCents: 1000, date: "2026-03-29" });
    repo.setAccountActive(other.id, false);

    const { edges } = repo.getMoneyFlow("2026-03");

    expect(edge(edges, "transfer", "Conta corrente", "Cartão")?.cents).toBe(65000);
    expect(edges.filter((candidate) => candidate.kind === "transfer")).toHaveLength(1);
  });

  it("adds up to the month's income and expenses, so it agrees with the dashboard", () => {
    const { checking, card, wife, salary, market, health } = setup();
    repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 500000, date: "2026-03-05" });
    repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 250000, date: "2026-03-10", sourceId: wife.id });
    repo.addTransaction({ accountId: card.id, categoryId: market.id, type: "expense", amountCents: 52200, date: "2026-03-10" });
    repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 17500, date: "2026-03-12", isExtra: true });
    repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 65000, date: "2026-03-28" });

    const { edges } = repo.getMoneyFlow("2026-03");
    const summary = repo.getMonthSummary("2026-03");
    const sum = (kind: MoneyFlowEdge["kind"]) => edges.filter((candidate) => candidate.kind === kind).reduce((total, candidate) => total + candidate.cents, 0);

    expect(sum("income")).toBe(summary.incomeCents);
    expect(sum("expense")).toBe(summary.expenseCents);
  });

  it("leaves out pending transactions, other months and archived accounts", () => {
    const { checking, salary, health } = setup();
    const old = repo.createAccount({ name: "Antiga", type: "checking" });
    repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 100, date: "2026-03-10", status: "pending" });
    repo.addTransaction({ accountId: checking.id, categoryId: health.id, type: "expense", amountCents: 200, date: "2026-04-10" });
    repo.addTransaction({ accountId: old.id, categoryId: salary.id, type: "income", amountCents: 300, date: "2026-03-10" });
    repo.setAccountActive(old.id, false);

    expect(repo.getMoneyFlow("2026-03").edges).toEqual([]);
  });

  it("reports what the goals kept in the month without drawing it as spending", () => {
    const goal = repo.createGoal({ name: "Viagem" });
    repo.addContribution(goal.id, { amountCents: 50000, date: "2026-03-05" });
    repo.addContribution(goal.id, { amountCents: -10000, date: "2026-03-20" });
    repo.addContribution(goal.id, { amountCents: 99999, date: "2026-04-05" });

    const flow = repo.getMoneyFlow("2026-03");

    expect(flow.goalsNetCents).toBe(40000);
    expect(flow.edges).toEqual([]);
  });

  it("says how much went into each goal in the month, split into put in and taken out", () => {
    const trip = repo.createGoal({ name: "Viagem" });
    const reserve = repo.createGoal({ name: "Reserva" });
    repo.addContribution(trip.id, { amountCents: 50000, date: "2026-03-05" });
    repo.addContribution(trip.id, { amountCents: -10000, date: "2026-03-20" });
    repo.addContribution(trip.id, { amountCents: 99999, date: "2026-04-05" });
    repo.addContribution(reserve.id, { amountCents: 20000, date: "2026-03-28" });

    expect(repo.getMoneyFlow("2026-03").goals).toEqual([
      { goalId: trip.id, goalName: "Viagem", contributedCents: 50000, withdrawnCents: 10000, netCents: 40000 },
      { goalId: reserve.id, goalName: "Reserva", contributedCents: 20000, withdrawnCents: 0, netCents: 20000 },
    ]);
  });

  it("leaves out goals without activity in the month and goals that are not active", () => {
    const quiet = repo.createGoal({ name: "Parada" });
    const done = repo.createGoal({ name: "Executada" });
    repo.addContribution(quiet.id, { amountCents: 1000, date: "2026-02-05" });
    repo.addContribution(done.id, { amountCents: 1000, date: "2026-03-05" });
    repo.setGoalStatus(done.id, "executed");

    expect(repo.getMoneyFlow("2026-03").goals).toEqual([]);
  });

  it("returns an empty flow for a month without activity and rejects a malformed month", () => {
    expect(repo.getMoneyFlow("2026-03")).toEqual({ month: "2026-03", edges: [], goalsNetCents: 0, goals: [] });
    expect(() => repo.getMoneyFlow("2026-13")).toThrow(/mês inválido/i);
  });

  it("lists the transactions behind each edge, so a click can show them", () => {
    const { card, market } = setup();
    const first = repo.addTransaction({ accountId: card.id, categoryId: market.id, type: "expense", amountCents: 100, date: "2026-03-10" });
    const second = repo.addTransaction({ accountId: card.id, categoryId: market.id, type: "expense", amountCents: 200, date: "2026-03-11" });

    const edges = repo.getMoneyFlow("2026-04").edges;
    const found = edge(edges, "expense", "Cartão", "Alimentação") ?? edge(edges, "expense", "Cartão", "Mercado");

    expect([...(found?.transactionIds ?? [])].sort()).toEqual([first.id, second.id].sort());
  });
});

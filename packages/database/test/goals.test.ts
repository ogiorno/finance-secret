import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Goals ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  const trip = () => repo.createGoal({ name: "Viagem", targetCents: 600000, targetDate: "2026-08-31" });

  it("creates a goal with an optional target and deadline", () => {
    repo.createGoal({ name: "Reserva" });
    trip();

    expect(repo.listGoals()).toEqual([
      expect.objectContaining({ name: "Reserva", targetCents: null, targetDate: null, savedCents: 0, status: "active" }),
      expect.objectContaining({ name: "Viagem", targetCents: 600000, targetDate: "2026-08-31", savedCents: 0, status: "active" }),
    ]);
  });

  it("validates name, target and deadline", () => {
    expect(() => repo.createGoal({ name: "  " })).toThrow(/nome/i);
    expect(() => repo.createGoal({ name: "A", targetCents: 0 })).toThrow(/alvo/i);
    expect(() => repo.createGoal({ name: "A", targetCents: 10.5 })).toThrow(/alvo/i);
    expect(() => repo.createGoal({ name: "A", targetDate: "2026-02-30" })).toThrow(/prazo/i);
  });

  it("refuses two goals with the same name", () => {
    trip();

    expect(() => repo.createGoal({ name: "viagem" })).toThrow(/já existe/i);
  });

  it("edits the goal, including clearing the target and the deadline", () => {
    const { id } = trip();

    repo.updateGoal(id, { name: "Viagem à Itália", targetCents: 800000, targetDate: "2026-12-31" });
    expect(repo.listGoals()[0]).toMatchObject({ name: "Viagem à Itália", targetCents: 800000, targetDate: "2026-12-31" });

    repo.updateGoal(id, { targetCents: null, targetDate: null });
    expect(repo.listGoals()[0]).toMatchObject({ targetCents: null, targetDate: null });
  });

  it("adds contributions that sum up in the goal, in whole cents", () => {
    const { id } = trip();
    repo.addContribution(id, { amountCents: 10000, date: "2026-03-05" });
    repo.addContribution(id, { amountCents: 5050, date: "2026-03-20", note: "Bônus" });

    expect(repo.listGoals()[0]?.savedCents).toBe(15050);
    expect(repo.listContributions(id)).toEqual([
      expect.objectContaining({ amountCents: 5050, date: "2026-03-20", note: "Bônus" }),
      expect.objectContaining({ amountCents: 10000, date: "2026-03-05", note: null }),
    ]);
  });

  it("rejects a zero or fractional amount and an invalid date", () => {
    const { id } = trip();

    expect(() => repo.addContribution(id, { amountCents: 0, date: "2026-03-05" })).toThrow(/valor/i);
    expect(() => repo.addContribution(id, { amountCents: 10.5, date: "2026-03-05" })).toThrow(/valor/i);
    expect(() => repo.addContribution(id, { amountCents: 100, date: "05/03/2026" })).toThrow(/data/i);
  });

  it("withdraws part of what is saved but never more than that", () => {
    const { id } = trip();
    repo.addContribution(id, { amountCents: 10000, date: "2026-03-05" });

    repo.addContribution(id, { amountCents: -4000, date: "2026-03-06" });
    expect(repo.listGoals()[0]?.savedCents).toBe(6000);

    expect(() => repo.addContribution(id, { amountCents: -6001, date: "2026-03-07" })).toThrow(/negativ|guardado/i);
    expect(repo.listGoals()[0]?.savedCents).toBe(6000);
  });

  it("refuses to delete or edit a contribution when that would leave the goal negative", () => {
    const { id } = trip();
    const deposit = repo.addContribution(id, { amountCents: 10000, date: "2026-03-05" });
    repo.addContribution(id, { amountCents: -8000, date: "2026-03-06" });

    expect(() => repo.deleteContribution(deposit.id)).toThrow(/negativ|guardado/i);
    expect(() => repo.updateContribution(deposit.id, { amountCents: 5000, date: "2026-03-05" })).toThrow(/negativ|guardado/i);
    repo.updateContribution(deposit.id, { amountCents: 12000, date: "2026-03-05", note: "Ajuste" });
    expect(repo.listGoals()[0]?.savedCents).toBe(4000);
  });

  it("deletes a contribution that is not needed to keep the total non-negative", () => {
    const { id } = trip();
    const first = repo.addContribution(id, { amountCents: 10000, date: "2026-03-05" });
    repo.addContribution(id, { amountCents: 2000, date: "2026-03-06" });

    repo.deleteContribution(first.id);

    expect(repo.listGoals()[0]?.savedCents).toBe(2000);
  });

  it("does not touch accounts, balances or the month results", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const { id } = trip();
    repo.addContribution(id, { amountCents: 30000, date: "2026-03-05" });

    expect(repo.getBalance(account.id)).toBe(100000);
    expect(repo.getTotalBalance()).toBe(100000);
    expect(repo.getMonthSummary("2026-03")).toEqual({ incomeCents: 0, expenseCents: 0, resultCents: 0 });
    expect(repo.listTransactions()).toEqual([]);
  });

  it("splits reserved and free money: free is the total balance minus what the goals hold", () => {
    repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const { id } = trip();
    const other = repo.createGoal({ name: "Reserva" });
    repo.addContribution(id, { amountCents: 30000, date: "2026-03-05" });
    repo.addContribution(other.id, { amountCents: 20000, date: "2026-03-05" });

    expect(repo.getReservedSummary()).toEqual({ reservedCents: 50000, freeCents: 50000 });
  });

  it("shows a negative free amount instead of blocking when the balance falls below what is reserved", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 10000 });
    const { id } = trip();
    repo.addContribution(id, { amountCents: 30000, date: "2026-03-05" });

    expect(repo.getReservedSummary()).toEqual({ reservedCents: 30000, freeCents: -20000 });
    expect(repo.getBalance(account.id)).toBe(10000);
  });

  it("keeps a goal reserved after reaching its target, until it is marked as executed", () => {
    repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 1000000 });
    const { id } = trip();
    repo.addContribution(id, { amountCents: 600000, date: "2026-03-05" });
    expect(repo.getReservedSummary().reservedCents).toBe(600000);

    repo.setGoalStatus(id, "executed");

    expect(repo.getReservedSummary()).toEqual({ reservedCents: 0, freeCents: 1000000 });
    expect(repo.listGoals()).toEqual([]);
    expect(repo.listGoals({ includeInactive: true })[0]).toMatchObject({ status: "executed", savedCents: 600000 });
    expect(repo.listContributions(id)).toHaveLength(1);
  });

  it("does not reserve archived goals and lets them come back", () => {
    repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const { id } = trip();
    repo.addContribution(id, { amountCents: 20000, date: "2026-03-05" });

    repo.setGoalStatus(id, "archived");
    expect(repo.getReservedSummary().reservedCents).toBe(0);

    repo.setGoalStatus(id, "active");
    expect(repo.getReservedSummary().reservedCents).toBe(20000);
  });

  it("refuses contributions to an executed or archived goal", () => {
    const { id } = trip();
    repo.setGoalStatus(id, "executed");

    expect(() => repo.addContribution(id, { amountCents: 100, date: "2026-03-05" })).toThrow(/executada|arquivada|ativa/i);
  });

  it("deletes a goal only when it never had a contribution", () => {
    const { id } = trip();
    const used = repo.createGoal({ name: "Usada" });
    repo.addContribution(used.id, { amountCents: 100, date: "2026-03-05" });

    repo.deleteGoal(id);
    expect(repo.listGoals({ includeInactive: true }).map((goal) => goal.name)).toEqual(["Usada"]);
    expect(() => repo.deleteGoal(used.id)).toThrow(/arquive/i);
  });

  it("fails clearly for a goal or contribution that does not exist", () => {
    expect(() => repo.updateGoal(999, { name: "X" })).toThrow(/não encontrada/i);
    expect(() => repo.addContribution(999, { amountCents: 100, date: "2026-03-05" })).toThrow(/não encontrada/i);
    expect(() => repo.deleteContribution(999)).toThrow(/não encontrad/i);
  });

  it("makes the bills' free-after-bills also discount what is reserved", () => {
    repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 500000 });
    repo.createRecurringBill({ name: "Aluguel", amountCents: 100000, frequency: "monthly", dueDay: 5, classification: "fixed", startPeriod: "2026-03" });
    const { id } = trip();
    repo.addContribution(id, { amountCents: 50000, date: "2026-03-01" });

    expect(repo.getBillsSummary("2026-03", "2026-03-01").freeAfterCents).toBe(500000 - 50000 - 100000);
  });
});

describe.each(drivers)("Spreading the month's leftover ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  it("records one contribution per goal, all or nothing", () => {
    const trip = repo.createGoal({ name: "Viagem" });
    const reserve = repo.createGoal({ name: "Reserva" });

    repo.distributeToGoals([{ goalId: trip.id, amountCents: 10000 }, { goalId: reserve.id, amountCents: 10000 }], "2026-03-31", "Sobra de março");

    expect(repo.listGoals().map((goal) => goal.savedCents)).toEqual([10000, 10000]);
    expect(repo.listContributions(trip.id)[0]).toMatchObject({ date: "2026-03-31", note: "Sobra de março" });
  });

  it("writes nothing when one of the parts is invalid", () => {
    const trip = repo.createGoal({ name: "Viagem" });

    expect(() => repo.distributeToGoals([{ goalId: trip.id, amountCents: 10000 }, { goalId: 999, amountCents: 100 }], "2026-03-31")).toThrow();
    expect(() => repo.distributeToGoals([{ goalId: trip.id, amountCents: 10000 }, { goalId: trip.id, amountCents: -5 }], "2026-03-31")).toThrow(/valor/i);

    expect(repo.listGoals()[0]?.savedCents).toBe(0);
  });

  it("rejects an empty distribution", () => {
    expect(() => repo.distributeToGoals([], "2026-03-31")).toThrow(/ao menos uma/i);
  });
});

describe.each(drivers)("Goal reports ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const trip = repo.createGoal({ name: "Viagem", targetCents: 100000, targetDate: "2026-08-31" });
    repo.addContribution(trip.id, { amountCents: 20000, date: "2026-01-10" });
    repo.addContribution(trip.id, { amountCents: 10000, date: "2026-01-25" });
    repo.addContribution(trip.id, { amountCents: -5000, date: "2026-02-03" });
    repo.addContribution(trip.id, { amountCents: 15000, date: "2026-03-10" });
    return trip;
  }

  it("reports net contributions by month with the running total, including quiet months", () => {
    const { id } = setup();

    expect(repo.getGoalReport(id, "2026-03").months).toEqual([
      { month: "2026-01", netCents: 30000, cumulativeCents: 30000 },
      { month: "2026-02", netCents: -5000, cumulativeCents: 25000 },
      { month: "2026-03", netCents: 15000, cumulativeCents: 40000 },
    ]);
  });

  it("shows progress, the pace, the estimated month and the monthly amount needed for the deadline", () => {
    const { id } = setup();

    const report = repo.getGoalReport(id, "2026-03");

    expect(report).toMatchObject({
      savedCents: 40000,
      progressPercent: 40,
      averageMonthlyCents: 13333, // (30000 - 5000 + 15000) / 3
      estimatedPeriod: "2026-07", // 60000 left at 13333/month: 5 months counting March
      neededMonthlyCents: 10000, // 60000 over March..August (6 months)
    });
  });

  it("has no estimate or needed amount for a goal without target or without contributions", () => {
    const open = repo.createGoal({ name: "Reserva" });

    expect(repo.getGoalReport(open.id, "2026-03")).toMatchObject({
      months: [],
      progressPercent: null,
      averageMonthlyCents: 0,
      estimatedPeriod: null,
      neededMonthlyCents: null,
    });
  });

  it("compares all goals in a period: put in, taken out and kept", () => {
    const trip = setup();
    const reserve = repo.createGoal({ name: "Reserva" });
    repo.addContribution(reserve.id, { amountCents: 7000, date: "2026-03-15" });
    repo.addContribution(reserve.id, { amountCents: 3000, date: "2025-12-15" });

    expect(repo.getGoalsOverview("2026-01", "2026-03")).toEqual([
      { goalId: trip.id, goalName: "Viagem", contributedCents: 45000, withdrawnCents: 5000, netCents: 40000, savedCents: 40000 },
      { goalId: reserve.id, goalName: "Reserva", contributedCents: 7000, withdrawnCents: 0, netCents: 7000, savedCents: 10000 },
    ]);
  });

  it("rejects a malformed range", () => {
    expect(() => repo.getGoalsOverview("2026-13", "2026-14")).toThrow(/mês inválido/i);
    expect(() => repo.getGoalsOverview("2026-05", "2026-03")).toThrow(/período/i);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Cash projection ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  /** Conta com R$ 1.000,00, cartão (vira dia 1), um aluguel por pagar e um salário por receber. */
  function setup() {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 100000 });
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const lazer = repo.createCategory({ name: "Lazer", type: "expense" });
    repo.createRecurringBill({ name: "Aluguel", amountCents: 70000, frequency: "monthly", dueDay: 20, classification: "fixed", startPeriod: "2026-10" });
    repo.createRecurringIncome({ name: "Salário", amountCents: 250000, frequency: "monthly", dueDay: 28, startPeriod: "2026-10" });
    const spend = (accountId: number, cents: number, date: string) =>
      repo.addTransaction({ accountId, categoryId: lazer.id, type: "expense", amountCents: cents, date });
    return { checking, card, spend };
  }

  it("starts from today's cash and rolls month to month, with the card paid the month after the purchase", () => {
    const { card, spend } = setup();
    spend(card.id, 57597, "2026-10-05");

    const projection = repo.getCashProjection("2026-10-12", 2);

    expect(projection.startCashCents).toBe(100000);
    expect(projection.foots).toBe(true);
    const [october, november, december] = projection.months;
    expect(october).toMatchObject({ month: "2026-10", openingCents: 100000, incomeCents: 250000, billsCents: 70000, cardInvoiceCents: 0, closingCents: 280000 });
    // A compra de outubro no cartão é a fatura de novembro.
    expect(november).toMatchObject({ month: "2026-11", openingCents: 280000, cardInvoiceCents: 57597, cardPaymentCents: 57597, closingCents: 280000 + 250000 - 70000 - 57597 });
    expect(december).toMatchObject({ month: "2026-12", cardInvoiceCents: 0 });
  });

  it("does not ask to pay again an invoice that was already paid", () => {
    const { checking, card, spend } = setup();
    spend(card.id, 172283, "2026-09-30");
    repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 172283, date: "2026-10-05" });

    const [october] = repo.getCashProjection("2026-10-12", 0).months;

    expect(october).toMatchObject({ cardInvoiceCents: 172283, cardPaidCents: 172283, cardPaymentCents: 0 });
  });

  it("shows how much more can go on the card before the balance goes below zero", () => {
    const { card, spend } = setup();
    spend(card.id, 57597, "2026-10-05");

    const november = repo.getCashProjection("2026-10-12", 1).months[1];

    // Teto = o que o mês gera (250.000 − 70.000); o saldo que já existe não aumenta o teto. Já há 57.597 na fatura.
    expect(november).toMatchObject({ cardAllowanceCents: 180000, cardRoomCents: 180000 - 57597 });
  });

  it("estimates day-to-day spending from past months, leaving out bills and the card", () => {
    const { checking, card, spend } = setup();
    spend(checking.id, 30000, "2026-08-10");
    spend(checking.id, 50000, "2026-09-10");
    spend(card.id, 999999, "2026-09-15");
    const bill = repo.listRecurringBills()[0];
    if (!bill) throw new Error("conta fixa ausente");
    repo.payBill({ billId: bill.id, period: "2026-10", accountId: checking.id, date: "2026-10-05" });

    const projection = repo.getCashProjection("2026-10-12", 1);

    expect(projection.variableAverageCents).toBe(40000);
    expect(projection.variableMonthsUsed).toBe(2);
    // Outubro conta só os dias que faltam (19 de 31); novembro, o mês inteiro.
    expect(projection.months[0]?.variableCents).toBe(Math.round((40000 * 19) / 31));
    expect(projection.months[1]?.variableCents).toBe(40000);
  });

  it("tells which invoice still takes purchases: the one that closes first", () => {
    const { card } = setup();

    expect(repo.getCashProjection("2026-10-12", 1).firstOpenInvoiceMonth).toBe("2026-11");
    repo.setAccountClosingDay(card.id, 15);
    expect(repo.getCashProjection("2026-10-12", 1).firstOpenInvoiceMonth).toBe("2026-10");
    repo.setAccountActive(card.id, false);
    expect(repo.getCashProjection("2026-10-12", 1).firstOpenInvoiceMonth).toBeNull();
  });

  it("supposes the last month's income repeats when no recurring income is registered", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 0 });
    const salary = repo.createCategory({ name: "Salário", type: "income" });
    repo.addTransaction({ accountId: checking.id, categoryId: salary.id, type: "income", amountCents: 400000, date: "2026-10-05" });
    repo.createRecurringBill({ name: "Aluguel", amountCents: 70000, frequency: "monthly", dueDay: 20, classification: "fixed", startPeriod: "2026-10" });

    const projection = repo.getCashProjection("2026-10-12", 2);

    expect(projection.lastIncomeCents).toBe(400000);
    expect(projection.lastIncomeMonth).toBe("2026-10");
    const [october, november, december] = projection.months;
    expect(october).toMatchObject({ incomeCents: 0, incomeAssumed: false, billsCents: 70000 });
    expect(november).toMatchObject({ incomeCents: 400000, incomeAssumed: true, openingCents: 330000 });
    expect(december).toMatchObject({ incomeCents: 400000, incomeAssumed: true });
  });

  it("does not suppose income when there is none to repeat, and prefers the registered one", () => {
    setup();

    const projection = repo.getCashProjection("2026-10-12", 1);

    expect(projection.months[1]).toMatchObject({ incomeCents: 250000, incomeAssumed: false });
    const empty = createFinanceRepository(openDatabase(create()));
    empty.createAccount({ name: "Conta", type: "checking" });
    expect(empty.getCashProjection("2026-10-12", 1)).toMatchObject({ lastIncomeCents: 0, lastIncomeMonth: null });
    expect(empty.getCashProjection("2026-10-12", 1).months[1]).toMatchObject({ incomeCents: 0, incomeAssumed: false });
  });

  it("has no estimate without history", () => {
    setup();

    const projection = repo.getCashProjection("2026-10-12", 0);

    expect(projection.variableAverageCents).toBe(0);
    expect(projection.variableMonthsUsed).toBe(0);
  });

  it("flags the first month that ends below zero", () => {
    setup();
    repo.createRecurringBill({ name: "Seguro anual", amountCents: 400000, frequency: "monthly", dueDay: 25, classification: "fixed", startPeriod: "2026-10" });

    const projection = repo.getCashProjection("2026-10-12", 1);

    // 1.000 + 2.500 − 700 − 4.000 = −1.200 em outubro; novembro começa de lá.
    expect(projection.months[0]).toMatchObject({ closingCents: -120000, negative: true });
    expect(projection.firstNegativeMonth).toBe("2026-10");
  });

  it("only looks at active accounts and rejects a bad date or horizon", () => {
    const { card, spend } = setup();
    spend(card.id, 10000, "2026-10-05");
    repo.setAccountActive(card.id, false);

    expect(repo.getCashProjection("2026-10-12", 1).months[1]?.cardInvoiceCents).toBe(0);
    expect(() => repo.getCashProjection("2026-13-01")).toThrow(/data inválida/i);
    expect(() => repo.getCashProjection("2026-10-12", 25)).toThrow(/horizonte/i);
  });
});

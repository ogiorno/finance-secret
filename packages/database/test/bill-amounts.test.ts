import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Changing the expected amount of a bill ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const bill = repo.createRecurringBill({
      name: "Aluguel",
      amountCents: 100000,
      frequency: "monthly",
      dueDay: 5,
      classification: "fixed",
      startPeriod: "2026-01",
    });
    return { account, bill };
  }

  const expected = (period: string) => repo.listBillOccurrences(period, "2026-12-31").find(() => true)?.expectedAmountCents;

  it("applies the new amount from the chosen month on, leaving earlier months alone", () => {
    const { bill } = setup();

    repo.setRecurringBillAmount(bill.id, { amountCents: 110000, fromPeriod: "2026-06" });

    expect(expected("2026-05")).toBe(100000);
    expect(expected("2026-06")).toBe(110000);
    expect(expected("2026-09")).toBe(110000);
  });

  it("can start the new amount in the current month, changing past pending months only when asked", () => {
    const { bill } = setup();

    repo.setRecurringBillAmount(bill.id, { amountCents: 130000, fromPeriod: "2026-01" });

    expect(expected("2026-01")).toBe(130000);
    expect(expected("2026-03")).toBe(130000);
  });

  it("never changes a month that was already paid", () => {
    const { account, bill } = setup();
    const paid = repo.payBill({ billId: bill.id, period: "2026-03", accountId: account.id, date: "2026-03-05" });

    repo.setRecurringBillAmount(bill.id, { amountCents: 150000, fromPeriod: "2026-01" });

    const march = repo.listBillOccurrences("2026-03", "2026-12-31")[0];
    expect(march).toMatchObject({ status: "paid", paidAmountCents: 100000 });
    expect(repo.getTransaction(paid.id).amountCents).toBe(100000);
    expect(expected("2026-04")).toBe(150000);
  });

  it("keeps the paid amount in the summary even if the expected changed afterwards", () => {
    const { account, bill } = setup();
    repo.payBill({ billId: bill.id, period: "2026-03", accountId: account.id, date: "2026-03-05" });
    repo.setRecurringBillAmount(bill.id, { amountCents: 150000, fromPeriod: "2026-01" });

    expect(repo.getBillsSummary("2026-03", "2026-12-31")).toMatchObject({ paidCents: 100000, remainingCents: 0 });
  });

  it("replaces a previous change that starts in the same month", () => {
    const { bill } = setup();
    repo.setRecurringBillAmount(bill.id, { amountCents: 110000, fromPeriod: "2026-06" });
    repo.setRecurringBillAmount(bill.id, { amountCents: 115000, fromPeriod: "2026-06" });

    expect(expected("2026-06")).toBe(115000);
  });

  it("lists the bill with the amount valid for the month asked", () => {
    const { bill } = setup();
    repo.setRecurringBillAmount(bill.id, { amountCents: 110000, fromPeriod: "2026-06" });

    expect(repo.listRecurringBills({ asOfPeriod: "2026-05" })[0]?.amountCents).toBe(100000);
    expect(repo.listRecurringBills({ asOfPeriod: "2026-06" })[0]?.amountCents).toBe(110000);
  });

  it("rejects an invalid amount or month", () => {
    const { bill } = setup();

    expect(() => repo.setRecurringBillAmount(bill.id, { amountCents: 0, fromPeriod: "2026-06" })).toThrow(/valor/i);
    expect(() => repo.setRecurringBillAmount(bill.id, { amountCents: 100, fromPeriod: "2026-13" })).toThrow(/mês inválido/i);
    expect(() => repo.setRecurringBillAmount(999, { amountCents: 100, fromPeriod: "2026-06" })).toThrow(/não encontrada/i);
  });
});

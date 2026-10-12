import { describe, expect, it } from "vitest";
import { averageSpendCents, buildProjection, remainingMonthShare, type ProjectionMonthInput } from "../src/index";

const month = (overrides: Partial<ProjectionMonthInput> & { month: string }): ProjectionMonthInput => ({
  incomeCents: 0,
  billsCents: 0,
  cardInvoiceCents: 0,
  cardPaidCents: 0,
  variableCents: 0,
  ...overrides,
});

describe("buildProjection", () => {
  it("rolls the closing balance of a month into the opening of the next", () => {
    const projection = buildProjection(64433, [
      month({ month: "2026-10", billsCents: 70000, cardInvoiceCents: 172283, cardPaidCents: 172283 }),
      month({ month: "2026-11", incomeCents: 409976, billsCents: 150000, cardInvoiceCents: 57597 }),
    ]);

    const [october, november] = projection.months;
    expect(october).toMatchObject({ openingCents: 64433, cardPaymentCents: 0, closingCents: -5567, negative: true });
    expect(november).toMatchObject({ openingCents: -5567, cardPaymentCents: 57597, closingCents: 196812, negative: false });
    expect(projection.firstNegativeMonth).toBe("2026-10");
    expect(projection.foots).toBe(true);
  });

  it("only counts what is still unpaid of the invoice", () => {
    const projection = buildProjection(100000, [month({ month: "2026-11", cardInvoiceCents: 60000, cardPaidCents: 25000 })]);

    expect(projection.months[0]).toMatchObject({ cardPaymentCents: 35000, closingCents: 65000 });
  });

  it("never asks for a negative payment when the invoice was overpaid", () => {
    const projection = buildProjection(100000, [month({ month: "2026-11", cardInvoiceCents: 10000, cardPaidCents: 12000 })]);

    expect(projection.months[0]?.cardPaymentCents).toBe(0);
    expect(projection.months[0]?.closingCents).toBe(100000);
  });

  it("tells how much more can go on the card without ending below zero", () => {
    const projection = buildProjection(50000, [
      month({ month: "2026-11", incomeCents: 400000, billsCents: 150000, variableCents: 80000, cardInvoiceCents: 57597 }),
    ]);

    const [november] = projection.months;
    // 500.000 + 400.000 − 150.000 − 80.000 = 220.000 de teto; 57.597 já estão na fatura.
    expect(november).toMatchObject({ cardAllowanceCents: 220000, cardRoomCents: 220000 - 57597, closingCents: 220000 - 57597 });
  });

  it("counts what was already paid of the invoice as part of the room it used", () => {
    const projection = buildProjection(75000, [month({ month: "2026-10", cardInvoiceCents: 100000, cardPaidCents: 25000 })]);

    // O caixa de hoje (75.000) já saiu dos 25.000 pagos; o teto da fatura volta a contar com eles.
    expect(projection.months[0]).toMatchObject({ cardAllowanceCents: 100000, cardRoomCents: 0, closingCents: 0 });
  });

  it("gives the same allowance every month when the income and the bills are the same, however much cash piles up", () => {
    const same = { incomeCents: 409976, billsCents: 212920 };
    const projection = buildProjection(100000, [
      month({ month: "2026-10" }),
      month({ month: "2026-11", ...same }),
      month({ month: "2026-12", ...same }),
      month({ month: "2027-01", ...same }),
    ]);

    const allowances = projection.months.slice(1).map((entry) => entry.cardAllowanceCents);
    expect(allowances).toEqual([197056, 197056, 197056]);
    // O caixa acumula, mas o teto não cresce com ele.
    expect(projection.months[3]?.openingCents).toBeGreaterThan(projection.months[1]?.openingCents ?? 0);
  });

  it("lowers the allowance by a hole that came from the month before, but never raises it for money that is left", () => {
    const projection = buildProjection(-5567, [
      month({ month: "2026-11", incomeCents: 409976, billsCents: 212920 }),
      month({ month: "2026-12", incomeCents: 409976, billsCents: 212920 }),
    ]);

    // O primeiro mês parte do caixa de hoje; o seguinte só do que o mês gera.
    expect(projection.months[0]?.cardAllowanceCents).toBe(409976 - 212920 - 5567);
    expect(projection.months[1]?.cardAllowanceCents).toBe(409976 - 212920);
  });

  it("has no negative month when everything fits", () => {
    const projection = buildProjection(1000, [month({ month: "2026-11", incomeCents: 5000 })]);

    expect(projection.firstNegativeMonth).toBeNull();
    expect(projection.months[0]?.cardAllowanceCents).toBe(6000);
  });

  it("clamps the allowance at zero when the month is already short", () => {
    const projection = buildProjection(0, [month({ month: "2026-11", billsCents: 70000 })]);

    expect(projection.months[0]).toMatchObject({ cardAllowanceCents: 0, cardRoomCents: 0, closingCents: -70000 });
  });
});

describe("remainingMonthShare", () => {
  it("counts the days after today over the days of the month", () => {
    expect(remainingMonthShare("2026-10-12")).toEqual({ days: 19, of: 31 });
    expect(remainingMonthShare("2026-02-28")).toEqual({ days: 0, of: 28 });
  });
});

describe("averageSpendCents", () => {
  it("averages only the months that had spending, rounding half up", () => {
    expect(averageSpendCents([10000, 20000, 0])).toBe(15000);
    expect(averageSpendCents([1, 2])).toBe(2);
  });

  it("is zero without history", () => {
    expect(averageSpendCents([])).toBe(0);
    expect(averageSpendCents([0, 0])).toBe(0);
  });
});

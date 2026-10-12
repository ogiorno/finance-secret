import { describe, expect, it } from "vitest";
import {
  averageMonthlyCents,
  estimateCompletionPeriod,
  monthlyContributionNeeded,
  monthsUntil,
  progressPercent,
} from "../src/index";

describe("monthsUntil", () => {
  it("counts the months left including the current one", () => {
    expect(monthsUntil("2026-03", "2026-03-31")).toBe(1);
    expect(monthsUntil("2026-03", "2026-08-15")).toBe(6);
    expect(monthsUntil("2026-11", "2027-02-01")).toBe(4);
  });

  it("is zero once the target month has passed", () => {
    expect(monthsUntil("2026-09", "2026-08-31")).toBe(0);
  });
});

describe("monthlyContributionNeeded", () => {
  it("spreads what is left over the months left, rounding up to the cent", () => {
    expect(monthlyContributionNeeded({ targetCents: 600000, savedCents: 0, period: "2026-03", targetDate: "2026-08-31" })).toBe(100000);
    expect(monthlyContributionNeeded({ targetCents: 100000, savedCents: 0, period: "2026-03", targetDate: "2026-05-31" })).toBe(33334);
  });

  it("subtracts what is already saved", () => {
    expect(monthlyContributionNeeded({ targetCents: 600000, savedCents: 300000, period: "2026-03", targetDate: "2026-08-31" })).toBe(50000);
  });

  it("is zero when the goal is already reached", () => {
    expect(monthlyContributionNeeded({ targetCents: 100000, savedCents: 100000, period: "2026-03", targetDate: "2026-08-31" })).toBe(0);
    expect(monthlyContributionNeeded({ targetCents: 100000, savedCents: 150000, period: "2026-03", targetDate: "2026-08-31" })).toBe(0);
  });

  it("is null when there is no target or no deadline, or the deadline has passed with money missing", () => {
    expect(monthlyContributionNeeded({ targetCents: null, savedCents: 0, period: "2026-03", targetDate: "2026-08-31" })).toBeNull();
    expect(monthlyContributionNeeded({ targetCents: 100000, savedCents: 0, period: "2026-03", targetDate: null })).toBeNull();
    expect(monthlyContributionNeeded({ targetCents: 100000, savedCents: 0, period: "2026-09", targetDate: "2026-08-31" })).toBeNull();
  });
});

describe("averageMonthlyCents", () => {
  it("averages the monthly net amounts, rounding to the nearest cent", () => {
    expect(averageMonthlyCents([10000, 20000, 30000])).toBe(20000);
    expect(averageMonthlyCents([10000, 10001])).toBe(10001); // 10000,5 rounds half up
    expect(averageMonthlyCents([1, 1, 2])).toBe(1); // 1,33
  });

  it("is zero without months", () => {
    expect(averageMonthlyCents([])).toBe(0);
  });
});

describe("estimateCompletionPeriod", () => {
  it("finds the month the goal is reached at the current pace, counting the current month as the first contribution", () => {
    expect(estimateCompletionPeriod({ remainingCents: 100000, perMonthCents: 25000, period: "2026-03" })).toBe("2026-06");
    expect(estimateCompletionPeriod({ remainingCents: 100001, perMonthCents: 25000, period: "2026-03" })).toBe("2026-07");
  });

  it("rolls over the year", () => {
    expect(estimateCompletionPeriod({ remainingCents: 50000, perMonthCents: 10000, period: "2026-11" })).toBe("2027-03");
  });

  it("is the current month when nothing is left, and null when the pace is zero", () => {
    expect(estimateCompletionPeriod({ remainingCents: 0, perMonthCents: 0, period: "2026-03" })).toBe("2026-03");
    expect(estimateCompletionPeriod({ remainingCents: 1000, perMonthCents: 0, period: "2026-03" })).toBeNull();
  });
});

describe("progressPercent", () => {
  it("is the whole percent saved, capped at 100", () => {
    expect(progressPercent(25000, 100000)).toBe(25);
    expect(progressPercent(99999, 100000)).toBe(99);
    expect(progressPercent(250000, 100000)).toBe(100);
    expect(progressPercent(0, 100000)).toBe(0);
  });

  it("is null without a target", () => {
    expect(progressPercent(5000, null)).toBeNull();
  });
});

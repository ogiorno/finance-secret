import { describe, expect, it } from "vitest";
import { currentCycle, daysUntil, previousCycle, shiftPeriod, turnDate } from "../src/index";

describe("shiftPeriod", () => {
  it("moves a month forward and back, across years", () => {
    expect(shiftPeriod("2026-03", 1)).toBe("2026-04");
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2026-03", -14)).toBe("2025-01");
  });
});

describe("turnDate", () => {
  it("is the closing day of the month", () => {
    expect(turnDate("2026-03", 10)).toBe("2026-03-10");
    expect(turnDate("2026-03", 1)).toBe("2026-03-01");
  });

  it("falls on the last day of a short month", () => {
    expect(turnDate("2026-02", 31)).toBe("2026-02-28");
    expect(turnDate("2028-02", 30)).toBe("2028-02-29");
    expect(turnDate("2026-04", 31)).toBe("2026-04-30");
  });
});

describe("currentCycle", () => {
  it("with closing day 1 the invoice is the calendar month", () => {
    expect(currentCycle("2026-03-15", 1)).toEqual({ start: "2026-03-01", nextTurn: "2026-04-01" });
    expect(currentCycle("2026-03-01", 1)).toEqual({ start: "2026-03-01", nextTurn: "2026-04-01" });
    expect(currentCycle("2026-12-31", 1)).toEqual({ start: "2026-12-01", nextTurn: "2027-01-01" });
  });

  it("starts the new invoice on the closing day itself", () => {
    expect(currentCycle("2026-03-10", 10)).toEqual({ start: "2026-03-10", nextTurn: "2026-04-10" });
    expect(currentCycle("2026-03-09", 10)).toEqual({ start: "2026-02-10", nextTurn: "2026-03-10" });
    expect(currentCycle("2026-03-05", 10)).toEqual({ start: "2026-02-10", nextTurn: "2026-03-10" });
  });

  it("goes back across the year", () => {
    expect(currentCycle("2026-01-05", 10)).toEqual({ start: "2025-12-10", nextTurn: "2026-01-10" });
  });

  it("clamps a closing day that does not exist in a short month", () => {
    expect(currentCycle("2026-03-01", 31)).toEqual({ start: "2026-02-28", nextTurn: "2026-03-31" });
    expect(currentCycle("2026-02-28", 31)).toEqual({ start: "2026-02-28", nextTurn: "2026-03-31" });
  });
});

describe("previousCycle", () => {
  it("is the invoice right before the current one", () => {
    expect(previousCycle("2026-03-15", 1)).toEqual({ start: "2026-02-01", end: "2026-03-01" });
    expect(previousCycle("2026-03-12", 10)).toEqual({ start: "2026-02-10", end: "2026-03-10" });
  });
});

describe("daysUntil", () => {
  it("counts whole days, never negative", () => {
    expect(daysUntil("2026-04-01", "2026-03-15")).toBe(17);
    expect(daysUntil("2026-03-15", "2026-03-15")).toBe(0);
    expect(daysUntil("2026-03-01", "2026-03-15")).toBe(0);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });
});

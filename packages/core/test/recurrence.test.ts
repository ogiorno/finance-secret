import { describe, expect, it } from "vitest";
import { billStatus, dueDateFor, expectedAmountFor, lastDayOfMonth } from "../src/index";

describe("lastDayOfMonth", () => {
  it.each([
    ["2026-01", 31],
    ["2026-02", 28],
    ["2028-02", 29],
    ["2100-02", 28],
    ["2000-02", 29],
    ["2026-04", 30],
    ["2026-12", 31],
  ])("%s has %i days", (period, days) => {
    expect(lastDayOfMonth(period)).toBe(days);
  });
});

describe("dueDateFor", () => {
  it("puts a monthly bill on its due day in every month", () => {
    expect(dueDateFor({ frequency: "monthly", dueDay: 10, dueMonth: null }, "2026-03")).toBe("2026-03-10");
    expect(dueDateFor({ frequency: "monthly", dueDay: 10, dueMonth: null }, "2026-12")).toBe("2026-12-10");
  });

  it("moves day 31 to the last day of a short month", () => {
    const bill = { frequency: "monthly", dueDay: 31, dueMonth: null } as const;
    expect(dueDateFor(bill, "2026-02")).toBe("2026-02-28");
    expect(dueDateFor(bill, "2028-02")).toBe("2028-02-29");
    expect(dueDateFor(bill, "2026-04")).toBe("2026-04-30");
    expect(dueDateFor(bill, "2026-05")).toBe("2026-05-31");
  });

  it("only shows a yearly bill in its due month", () => {
    const bill = { frequency: "yearly", dueDay: 15, dueMonth: 3 } as const;
    expect(dueDateFor(bill, "2026-03")).toBe("2026-03-15");
    expect(dueDateFor(bill, "2026-04")).toBeNull();
    expect(dueDateFor(bill, "2027-03")).toBe("2027-03-15");
  });

  it("clamps a yearly bill due on the 29th of February", () => {
    expect(dueDateFor({ frequency: "yearly", dueDay: 29, dueMonth: 2 }, "2026-02")).toBe("2026-02-28");
    expect(dueDateFor({ frequency: "yearly", dueDay: 29, dueMonth: 2 }, "2028-02")).toBe("2028-02-29");
  });
});

describe("billStatus", () => {
  it("is paid whenever a payment exists, even long after the due date", () => {
    expect(billStatus({ dueDate: "2026-01-05", paid: true, today: "2026-06-01" })).toBe("paid");
  });

  it("is pending on the due date itself and before it", () => {
    expect(billStatus({ dueDate: "2026-03-10", paid: false, today: "2026-03-10" })).toBe("pending");
    expect(billStatus({ dueDate: "2026-03-10", paid: false, today: "2026-03-01" })).toBe("pending");
  });

  it("is overdue from the day after the due date", () => {
    expect(billStatus({ dueDate: "2026-03-10", paid: false, today: "2026-03-11" })).toBe("overdue");
  });
});

describe("expectedAmountFor", () => {
  const amounts = [
    { effectivePeriod: "0000-01", amountCents: 100000 },
    { effectivePeriod: "2026-06", amountCents: 110000 },
    { effectivePeriod: "2027-01", amountCents: 120000 },
  ];

  it("uses the latest amount that already started", () => {
    expect(expectedAmountFor(amounts, "2026-05")).toBe(100000);
    expect(expectedAmountFor(amounts, "2026-06")).toBe(110000);
    expect(expectedAmountFor(amounts, "2026-12")).toBe(110000);
    expect(expectedAmountFor(amounts, "2027-01")).toBe(120000);
  });

  it("does not depend on the order of the list", () => {
    expect(expectedAmountFor([...amounts].reverse(), "2026-07")).toBe(110000);
  });

  it("returns null when no amount has started yet", () => {
    expect(expectedAmountFor([{ effectivePeriod: "2026-06", amountCents: 1 }], "2026-05")).toBeNull();
    expect(expectedAmountFor([], "2026-05")).toBeNull();
  });
});

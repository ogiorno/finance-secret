import { describe, expect, it } from "vitest";
import { validateTransaction } from "../src/index";

const valid = { type: "expense", amountCents: 8000, date: "2026-03-10" } as const;

describe("validateTransaction", () => {
  it("accepts an expense in an expense category", () => {
    expect(() => validateTransaction(valid, "expense")).not.toThrow();
  });

  it("rejects a transaction whose type differs from its category's type", () => {
    expect(() => validateTransaction({ ...valid, type: "income" }, "expense")).toThrow(/categoria/i);
  });

  it.each([0, -1, 12.5])("rejects amount %s", (amountCents) => {
    expect(() => validateTransaction({ ...valid, amountCents }, "expense")).toThrow(/valor/i);
  });

  it("rejects an invalid date", () => {
    expect(() => validateTransaction({ ...valid, date: "2026-13-01" }, "expense")).toThrow(/data/i);
  });
});

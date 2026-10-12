import { describe, expect, it } from "vitest";
import { compareDatabases, type DatabaseSummary } from "../src/lib/database-diff";

const base: DatabaseSummary = {
  accounts: [
    { name: "Conta", balanceCents: 100000, isActive: true },
    { name: "Cartão", balanceCents: -5000, isActive: true },
  ],
  transactions: 10,
  categories: 12,
  bills: 2,
  goals: 1,
  cashCents: 100000,
  debtCents: -5000,
  firstDate: "2026-01-02",
  lastDate: "2026-10-05",
};

describe("compareDatabases", () => {
  it("sees two equal summaries as identical", () => {
    const diff = compareDatabases(base, structuredClone(base));

    expect(diff.identical).toBe(true);
    expect(diff.metrics.every((row) => !row.changed)).toBe(true);
    expect(diff.accounts.every((row) => row.change === "same")).toBe(true);
  });

  it("marks the metrics that changed, keeping the current value on the left", () => {
    const incoming = { ...base, transactions: 14, cashCents: 90000, lastDate: "2026-10-12" };

    const diff = compareDatabases(base, incoming);

    expect(diff.identical).toBe(false);
    const row = (label: string) => diff.metrics.find((metric) => metric.label === label);
    expect(row("Lançamentos")).toMatchObject({ current: 10, incoming: 14, changed: true });
    expect(row("Dinheiro nas contas")).toMatchObject({ current: 100000, incoming: 90000, changed: true });
    expect(row("Último lançamento")).toMatchObject({ current: "2026-10-05", incoming: "2026-10-12", changed: true });
    expect(row("Contas")?.changed).toBe(false);
  });

  it("matches accounts by name and tells added, removed and changed balances apart", () => {
    const incoming: DatabaseSummary = {
      ...base,
      accounts: [
        { name: "Conta", balanceCents: 64433, isActive: true },
        { name: "Reserva", balanceCents: 403976, isActive: true },
      ],
    };

    const diff = compareDatabases(base, incoming);

    expect(diff.accounts).toEqual([
      { name: "Conta", currentCents: 100000, incomingCents: 64433, change: "changed" },
      { name: "Reserva", currentCents: null, incomingCents: 403976, change: "added" },
      { name: "Cartão", currentCents: -5000, incomingCents: null, change: "removed" },
    ]);
  });

  it("handles a database with no transactions", () => {
    const empty: DatabaseSummary = { ...base, accounts: [], transactions: 0, cashCents: 0, debtCents: 0, firstDate: null, lastDate: null };

    const diff = compareDatabases(base, empty);

    expect(diff.metrics.find((metric) => metric.label === "Primeiro lançamento")).toMatchObject({ current: "2026-01-02", incoming: null, changed: true });
    expect(diff.accounts.map((row) => row.change)).toEqual(["removed", "removed"]);
  });
});

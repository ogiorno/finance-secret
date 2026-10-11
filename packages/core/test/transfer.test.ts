import { describe, expect, it } from "vitest";
import { buildTransfer } from "../src/index";

describe("buildTransfer", () => {
  it("makes an outflow on the source and an inflow on the destination that cancel out", () => {
    const [out, into] = buildTransfer({
      fromAccountId: 1,
      toAccountId: 2,
      amountCents: 15000,
      date: "2026-03-10",
      description: "Reserva",
    });

    expect(out).toMatchObject({ accountId: 1, type: "transfer", amountCents: -15000, date: "2026-03-10" });
    expect(into).toMatchObject({ accountId: 2, type: "transfer", amountCents: 15000, date: "2026-03-10" });
    expect(out.amountCents + into.amountCents).toBe(0);
  });

  it("rejects a transfer to the same account", () => {
    expect(() =>
      buildTransfer({ fromAccountId: 1, toAccountId: 1, amountCents: 100, date: "2026-03-10", description: "" }),
    ).toThrow(/mesma conta/i);
  });

  it.each([0, -50, 10.5, Number.NaN])("rejects amount %s (must be a positive integer of cents)", (amountCents) => {
    expect(() =>
      buildTransfer({ fromAccountId: 1, toAccountId: 2, amountCents, date: "2026-03-10", description: "" }),
    ).toThrow(/valor/i);
  });

  it.each(["2026-3-10", "10/03/2026", "2026-02-30", ""])("rejects invalid date %j", (date) => {
    expect(() =>
      buildTransfer({ fromAccountId: 1, toAccountId: 2, amountCents: 100, date, description: "" }),
    ).toThrow(/data/i);
  });
});

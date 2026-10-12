import { describe, expect, it } from "vitest";
import { formatQuantityMilli, itemTotalCents, parseDecimalTextToCents, parseQuantityToMilli, splitCents } from "../src/index";

describe("itemTotalCents", () => {
  it("multiplies whole quantities exactly", () => {
    expect(itemTotalCents(2000, 599)).toBe(1198);
    expect(itemTotalCents(1000, 1250)).toBe(1250);
  });

  it("handles fractional quantities, rounding half up to the cent", () => {
    expect(itemTotalCents(1250, 1000)).toBe(1250); // 1,250 kg x R$ 10,00
    expect(itemTotalCents(333, 100)).toBe(33); // 33,3 -> 33
    expect(itemTotalCents(335, 100)).toBe(34); // 33,5 -> 34 (half up)
    expect(itemTotalCents(1500, 333)).toBe(500); // 499,5 -> 500
  });

  it("never drifts with floats: 0.1 + 0.2 style sums stay exact", () => {
    expect(itemTotalCents(3000, 10) + itemTotalCents(1000, 20)).toBe(50);
  });

  it("stays exact for large values that would overflow a double", () => {
    expect(itemTotalCents(3_000_000_000, 3_000_000_000)).toBe(9_000_000_000_000_000);
    expect(() => itemTotalCents(9_000_000_000, 9_000_000_000)).toThrow(/grande/i);
  });

  it.each([
    [0, 100],
    [-1000, 100],
    [1000, -1],
    [1.5, 100],
    [1000, 1.5],
  ])("rejects quantity %s with price %s", (quantityMilli, unitPriceCents) => {
    expect(() => itemTotalCents(quantityMilli, unitPriceCents)).toThrow();
  });
});

describe("parseQuantityToMilli", () => {
  it.each([
    ["1", 1000],
    ["2", 2000],
    ["1,25", 1250],
    ["1,250", 1250],
    ["0,5", 500],
    ["0,005", 5],
    ["10", 10000],
    [" 3,5 ", 3500],
  ])("reads %j as %i thousandths", (text, expected) => {
    expect(parseQuantityToMilli(text)).toBe(expected);
  });

  it.each(["", "abc", "-1", "0", "0,000", "1,2345", "1.5", "1,", ",5", "1 2"])("rejects %j", (text) => {
    expect(parseQuantityToMilli(text)).toBeNull();
  });
});

describe("formatQuantityMilli", () => {
  it.each([
    [1000, "1"],
    [1250, "1,25"],
    [500, "0,5"],
    [5, "0,005"],
    [12000, "12"],
    [1001, "1,001"],
  ])("shows %i as %s", (milli, text) => {
    expect(formatQuantityMilli(milli)).toBe(text);
  });
});

describe("splitCents", () => {
  it("splits evenly when it can", () => {
    expect(splitCents(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it("hands the leftover cents out one by one so the parts always add up", () => {
    const parts = splitCents(1000, 3);
    expect(parts).toEqual([334, 333, 333]);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(1000);
  });

  it("works for any total and number of parts", () => {
    for (const total of [1, 7, 99, 100, 12345, 100000001]) {
      for (const n of [1, 2, 3, 7, 10]) {
        const parts = splitCents(total, n);
        expect(parts).toHaveLength(n);
        expect(parts.reduce((sum, part) => sum + part, 0)).toBe(total);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("rejects a non-integer total or a non-positive number of parts", () => {
    expect(() => splitCents(10.5, 2)).toThrow();
    expect(() => splitCents(100, 0)).toThrow();
    expect(() => splitCents(-100, 2)).toThrow();
  });
});

describe("parseDecimalTextToCents", () => {
  it.each([
    ["12.34", 1234],
    ["12.3", 1230],
    ["12", 1200],
    ["0.05", 5],
    ["1000.00", 100000],
  ])("reads %j as %i cents", (text, cents) => {
    expect(parseDecimalTextToCents(text)).toBe(cents);
  });

  it.each(["", "12,34", "12.345", "-1", "1e3", "abc", ".5", "1.", " 12.34 "])("rejects %j", (text) => {
    expect(parseDecimalTextToCents(text)).toBeNull();
  });

  it("refuses a real number: values must arrive as text so no float is involved", () => {
    expect(parseDecimalTextToCents(12.34 as unknown as string)).toBeNull();
  });
});

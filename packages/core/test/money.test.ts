import { describe, expect, it } from "vitest";
import { parseBRLToCents } from "../src/index";

describe("parseBRLToCents", () => {
  it.each([
    ["80", 8000],
    ["80,5", 8050],
    ["80,50", 8050],
    ["1.234,56", 123456],
    ["R$ 1.234,56", 123456],
    ["0,99", 99],
    [" 12 ", 1200],
  ])("reads %j as %i cents", (text, cents) => {
    expect(parseBRLToCents(text)).toBe(cents);
  });

  it.each(["", "abc", "-5", "0,001", "1,2,3", "12.5.6", "1.23", ","])("returns null for %j", (text) => {
    expect(parseBRLToCents(text)).toBeNull();
  });
});

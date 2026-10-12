import { describe, expect, it } from "vitest";
import type { TransactionListItem } from "@finance/database";
import { describeFlow } from "../src/lib/flow";

const base: TransactionListItem = {
  id: 1,
  accountId: 1,
  accountName: "Cartão Roxo",
  categoryId: 10,
  categoryName: "Mercado",
  type: "expense",
  amountCents: 5200,
  description: "",
  date: "2026-03-10",
  status: "posted",
  paymentMethod: null,
  isExtra: false,
  sourceId: null,
  sourceName: null,
  transferGroupId: null,
  counterpartAccountName: null,
};

describe("describeFlow", () => {
  it("shows an expense as account to category", () => {
    expect(describeFlow(base)).toEqual({ from: "Cartão Roxo", to: "Mercado", spoken: "de Cartão Roxo para Mercado" });
  });

  it("shows an expense without a category as going to Sem categoria", () => {
    expect(describeFlow({ ...base, categoryName: "Sem categoria" }).to).toBe("Sem categoria");
  });

  it("shows an income from its source to the account, when it has one", () => {
    const flow = describeFlow({ ...base, type: "income", accountName: "Conta corrente", categoryName: "Salário", sourceId: 2, sourceName: "Esposa" });
    expect(flow).toEqual({ from: "Esposa", to: "Conta corrente", spoken: "de Esposa para Conta corrente" });
  });

  it("shows an income as category to account", () => {
    const flow = describeFlow({ ...base, type: "income", accountName: "Conta corrente", categoryName: "Salário" });
    expect(flow).toEqual({ from: "Salário", to: "Conta corrente", spoken: "de Salário para Conta corrente" });
  });

  it("shows a transfer outflow from this account to the counterpart", () => {
    const flow = describeFlow({
      ...base,
      type: "transfer",
      categoryName: null,
      amountCents: -30000,
      accountName: "Conta corrente",
      counterpartAccountName: "Cartão Roxo",
      transferGroupId: 1,
    });
    expect(flow).toEqual({ from: "Conta corrente", to: "Cartão Roxo", spoken: "de Conta corrente para Cartão Roxo" });
  });

  it("shows a transfer inflow from the counterpart to this account", () => {
    const flow = describeFlow({
      ...base,
      type: "transfer",
      categoryName: null,
      amountCents: 30000,
      accountName: "Cartão Roxo",
      counterpartAccountName: "Conta corrente",
      transferGroupId: 1,
    });
    expect(flow).toEqual({ from: "Conta corrente", to: "Cartão Roxo", spoken: "de Conta corrente para Cartão Roxo" });
  });
});

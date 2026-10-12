import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Transaction items ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  function setup() {
    const account = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const market = repo.createCategory({ name: "Mercado", type: "expense" });
    const purchase = repo.addTransaction({ accountId: account.id, categoryId: market.id, type: "expense", amountCents: 52200, date: "2026-03-10" });
    return { account, purchase };
  }

  it("starts without items: a transaction with none is perfectly valid", () => {
    const { purchase } = setup();

    expect(repo.listTransactionItems(purchase.id)).toEqual([]);
    expect(repo.getItemsTotal(purchase.id)).toEqual({ itemsCents: 0, transactionCents: 52200, differenceCents: 52200 });
  });

  it("adds items in order, each with its total computed in cents", () => {
    const { purchase } = setup();
    repo.addTransactionItem(purchase.id, { name: "Arroz", quantityMilli: 2000, unitPriceCents: 2599 });
    repo.addTransactionItem(purchase.id, { name: "Queijo", quantityMilli: 350, unitPriceCents: 5990 });

    expect(repo.listTransactionItems(purchase.id)).toEqual([
      expect.objectContaining({ name: "Arroz", quantityMilli: 2000, unitPriceCents: 2599, totalCents: 5198, position: 1 }),
      expect.objectContaining({ name: "Queijo", quantityMilli: 350, unitPriceCents: 5990, totalCents: 2097, position: 2 }), // 2096,5 -> 2097
    ]);
  });

  it("shows the difference between the items and the purchase total without blocking anything", () => {
    const { account, purchase } = setup();
    repo.addTransactionItem(purchase.id, { name: "Arroz", quantityMilli: 2000, unitPriceCents: 2599 });

    expect(repo.getItemsTotal(purchase.id)).toEqual({ itemsCents: 5198, transactionCents: 52200, differenceCents: 47002 });
    // A conta e os totais seguem pelo valor da compra, nunca pela soma dos itens.
    expect(repo.getBalance(account.id)).toBe(-52200);
    // Compra no cartão conta no mês em que a fatura fecha (abril, com a virada no dia 1).
    expect(repo.getMonthSummary("2026-04").expenseCents).toBe(52200);
  });

  it("can have items worth more than the purchase (a discount was applied)", () => {
    const { purchase } = setup();
    repo.addTransactionItem(purchase.id, { name: "Tudo", quantityMilli: 1000, unitPriceCents: 60000 });

    expect(repo.getItemsTotal(purchase.id).differenceCents).toBe(-7800);
  });

  it("edits an item and recomputes its total", () => {
    const { purchase } = setup();
    const item = repo.addTransactionItem(purchase.id, { name: "Arroz", quantityMilli: 1000, unitPriceCents: 1000 });

    repo.updateTransactionItem(item.id, { name: "Arroz integral", quantityMilli: 3000, unitPriceCents: 1250 });

    expect(repo.listTransactionItems(purchase.id)[0]).toMatchObject({ name: "Arroz integral", totalCents: 3750 });
  });

  it("removes an item and keeps the positions in order", () => {
    const { purchase } = setup();
    const first = repo.addTransactionItem(purchase.id, { name: "A", quantityMilli: 1000, unitPriceCents: 100 });
    repo.addTransactionItem(purchase.id, { name: "B", quantityMilli: 1000, unitPriceCents: 200 });

    repo.deleteTransactionItem(first.id);

    expect(repo.listTransactionItems(purchase.id).map((item) => item.name)).toEqual(["B"]);
  });

  it("deletes the items together with their transaction", () => {
    const { purchase } = setup();
    repo.addTransactionItem(purchase.id, { name: "Arroz", quantityMilli: 1000, unitPriceCents: 100 });

    repo.deleteTransaction(purchase.id);

    expect(repo.listTransactionItems(purchase.id)).toEqual([]);
  });

  it("rejects an empty name, a non-positive quantity and fractional cents", () => {
    const { purchase } = setup();

    expect(() => repo.addTransactionItem(purchase.id, { name: " ", quantityMilli: 1000, unitPriceCents: 100 })).toThrow(/nome/i);
    expect(() => repo.addTransactionItem(purchase.id, { name: "A", quantityMilli: 0, unitPriceCents: 100 })).toThrow(/quantidade/i);
    expect(() => repo.addTransactionItem(purchase.id, { name: "A", quantityMilli: 1000, unitPriceCents: 10.5 })).toThrow(/preço/i);
    expect(() => repo.addTransactionItem(purchase.id, { name: "A", quantityMilli: 1.5, unitPriceCents: 100 })).toThrow(/quantidade/i);
    expect(repo.listTransactionItems(purchase.id)).toEqual([]);
  });

  it("refuses items on a transfer and on a transaction that does not exist", () => {
    const a = repo.createAccount({ name: "A", type: "checking" });
    const b = repo.createAccount({ name: "B", type: "checking" });
    const transfer = repo.addTransfer({ fromAccountId: a.id, toAccountId: b.id, amountCents: 100, date: "2026-03-10" });

    expect(() => repo.addTransactionItem(transfer.legs[0].id, { name: "A", quantityMilli: 1000, unitPriceCents: 100 })).toThrow(/transferência/i);
    expect(() => repo.addTransactionItem(999, { name: "A", quantityMilli: 1000, unitPriceCents: 100 })).toThrow(/não encontrado/i);
  });

  it("fails clearly when editing or deleting an item that does not exist", () => {
    expect(() => repo.updateTransactionItem(999, { name: "A", quantityMilli: 1000, unitPriceCents: 100 })).toThrow(/não encontrado/i);
    expect(() => repo.deleteTransactionItem(999)).toThrow(/não encontrado/i);
  });
});

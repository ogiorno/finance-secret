import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Payment method ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  const typeDefault = (key: string) => repo.listAccountTypes({ includeArchived: true }).find((type) => type.key === key)?.defaultPaymentMethod;

  it("gives the built-in account types a default method", () => {
    expect(typeDefault("checking")).toBe("debit");
    expect(typeDefault("credit_card")).toBe("credit");
    expect(typeDefault("meal_voucher")).toBe("meal_voucher");
    expect(typeDefault("cash")).toBe("cash");
    expect(typeDefault("savings")).toBeNull();
  });

  it("fills the method from the account type when none is given", () => {
    const card = repo.createAccount({ name: "Cartão", type: "credit_card" });
    const saved = repo.addTransaction({ accountId: card.id, type: "expense", amountCents: 500, date: "2026-03-10" });

    expect(repo.getTransaction(saved.id).paymentMethod).toBe("credit");
  });

  it("keeps a method chosen by the user over the account type default", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    const saved = repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 500, date: "2026-03-10", paymentMethod: "pix" });

    expect(repo.getTransaction(saved.id).paymentMethod).toBe("pix");
  });

  it("lets the user record a transaction with no method at all", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    const saved = repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 500, date: "2026-03-10", paymentMethod: null });

    expect(repo.getTransaction(saved.id).paymentMethod).toBeNull();
  });

  it("uses the default of a custom account type, which can be edited", () => {
    const type = repo.createAccountType({ name: "Vale-alimentação extra", defaultPaymentMethod: "meal_voucher" });
    const account = repo.createAccount({ name: "VA", type: type.key });
    const first = repo.addTransaction({ accountId: account.id, type: "expense", amountCents: 100, date: "2026-03-10" });
    expect(repo.getTransaction(first.id).paymentMethod).toBe("meal_voucher");

    repo.updateAccountType(type.key, { defaultPaymentMethod: "other" });
    const second = repo.addTransaction({ accountId: account.id, type: "expense", amountCents: 100, date: "2026-03-11" });
    expect(repo.getTransaction(second.id).paymentMethod).toBe("other");

    repo.updateAccountType(type.key, { defaultPaymentMethod: null });
    const third = repo.addTransaction({ accountId: account.id, type: "expense", amountCents: 100, date: "2026-03-12" });
    expect(repo.getTransaction(third.id).paymentMethod).toBeNull();
  });

  it("rejects an unknown method", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    expect(() =>
      repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 500, date: "2026-03-10", paymentMethod: "bitcoin" as never }),
    ).toThrow(/método/i);
  });

  it("never changes balances", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 10000 });
    repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 2500, date: "2026-03-10", paymentMethod: "pix" });
    repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 2500, date: "2026-03-10", paymentMethod: null });

    expect(repo.getBalance(checking.id)).toBe(5000);
  });

  it("filters the list by method", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 100, date: "2026-03-10", paymentMethod: "pix" });
    repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 200, date: "2026-03-10", paymentMethod: "boleto" });

    expect(repo.listTransactions({ paymentMethod: "pix" }).map((item) => item.amountCents)).toEqual([100]);
  });

  it("can change the method of an existing transaction", () => {
    const checking = repo.createAccount({ name: "Conta", type: "checking" });
    const saved = repo.addTransaction({ accountId: checking.id, type: "expense", amountCents: 100, date: "2026-03-10" });

    repo.updateTransaction(saved.id, { accountId: checking.id, type: "expense", amountCents: 100, date: "2026-03-10", paymentMethod: "cash" });

    expect(repo.getTransaction(saved.id).paymentMethod).toBe("cash");
  });

  it("gives transfers no method", () => {
    const a = repo.createAccount({ name: "A", type: "checking" });
    const b = repo.createAccount({ name: "B", type: "checking" });
    repo.addTransfer({ fromAccountId: a.id, toAccountId: b.id, amountCents: 100, date: "2026-03-10" });

    expect(repo.listTransactions().every((item) => item.paymentMethod === null)).toBe(true);
  });
});

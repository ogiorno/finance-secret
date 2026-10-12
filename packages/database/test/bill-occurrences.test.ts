import { beforeEach, describe, expect, it } from "vitest";
import { createFinanceRepository, openDatabase, type FinanceRepository, type NewRecurringBill } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("Bill occurrences of a month ($name)", ({ create }) => {
  let repo: FinanceRepository;

  beforeEach(() => {
    repo = createFinanceRepository(openDatabase(create()));
  });

  const bill = (overrides: Partial<NewRecurringBill> = {}): NewRecurringBill => ({
    name: "Aluguel",
    amountCents: 180000,
    frequency: "monthly",
    dueDay: 5,
    classification: "fixed",
    startPeriod: "2026-01",
    ...overrides,
  });

  it("lists a monthly bill as pending before its due date", () => {
    repo.createRecurringBill(bill());

    expect(repo.listBillOccurrences("2026-03", "2026-03-01")).toEqual([
      expect.objectContaining({ name: "Aluguel", dueDate: "2026-03-05", expectedAmountCents: 180000, status: "pending", paidTransactionId: null }),
    ]);
  });

  it("flags a bill as overdue after the due date", () => {
    repo.createRecurringBill(bill());

    expect(repo.listBillOccurrences("2026-03", "2026-03-06")[0]?.status).toBe("overdue");
  });

  it("only lists a yearly bill in its due month", () => {
    repo.createRecurringBill(bill({ name: "IPTU", frequency: "yearly", dueMonth: 3, dueDay: 20 }));

    expect(repo.listBillOccurrences("2026-03", "2026-03-01").map((o) => o.name)).toEqual(["IPTU"]);
    expect(repo.listBillOccurrences("2026-04", "2026-04-01")).toEqual([]);
  });

  it("does not list months before the bill started", () => {
    repo.createRecurringBill(bill({ startPeriod: "2026-03" }));

    expect(repo.listBillOccurrences("2026-02", "2026-03-01")).toEqual([]);
    expect(repo.listBillOccurrences("2026-03", "2026-03-01")).toHaveLength(1);
  });

  it("clamps day 31 to the last day of February", () => {
    repo.createRecurringBill(bill({ dueDay: 31 }));

    expect(repo.listBillOccurrences("2026-02", "2026-02-01")[0]?.dueDate).toBe("2026-02-28");
    expect(repo.listBillOccurrences("2028-02", "2028-02-01")[0]?.dueDate).toBe("2028-02-29");
  });

  it("orders by due date, then name", () => {
    repo.createRecurringBill(bill({ name: "Internet", dueDay: 15 }));
    repo.createRecurringBill(bill({ name: "Aluguel", dueDay: 5 }));
    repo.createRecurringBill(bill({ name: "Água", dueDay: 5 }));

    expect(repo.listBillOccurrences("2026-03", "2026-03-01").map((o) => o.name)).toEqual(["Água", "Aluguel", "Internet"]);
  });

  it("hides an archived bill, but keeps its paid month", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking" });
    const { id } = repo.createRecurringBill(bill());
    repo.payBill({ billId: id, period: "2026-03", accountId: account.id, date: "2026-03-05" });
    repo.setRecurringBillActive(id, false);

    expect(repo.listBillOccurrences("2026-03", "2026-03-10").map((o) => o.status)).toEqual(["paid"]);
    expect(repo.listBillOccurrences("2026-04", "2026-04-10")).toEqual([]);
  });

  it("totals expected, paid and remaining for the month", () => {
    const account = repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 500000 });
    const rent = repo.createRecurringBill(bill());
    repo.createRecurringBill(bill({ name: "Internet", amountCents: 12000, dueDay: 15 }));
    repo.createRecurringBill(bill({ name: "Luz", amountCents: 20000, dueDay: 20 }));
    repo.payBill({ billId: rent.id, period: "2026-03", accountId: account.id, amountCents: 181000, date: "2026-03-05" });

    expect(repo.getBillsSummary("2026-03", "2026-03-10")).toEqual({
      expectedCents: 212000,
      paidCents: 181000,
      remainingCents: 32000,
      freeAfterCents: 500000 - 181000 - 32000,
    });
  });

  it("lets free-after go negative instead of blocking", () => {
    repo.createAccount({ name: "Conta", type: "checking", openingBalanceCents: 1000 });
    repo.createRecurringBill(bill());

    expect(repo.getBillsSummary("2026-03", "2026-03-01").freeAfterCents).toBe(1000 - 180000);
  });

  it("returns zeros for a month with no bills", () => {
    expect(repo.getBillsSummary("2026-03", "2026-03-01")).toEqual({ expectedCents: 0, paidCents: 0, remainingCents: 0, freeAfterCents: 0 });
  });
});

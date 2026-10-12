// Gera static/demo.db com dados inteiramente fictícios (nenhuma informação real).
import Database from "better-sqlite3";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFinanceRepository, openDatabase } from "@finance/database";
import { betterSqlite3Driver } from "@finance/database/better-sqlite3";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../static/demo.db");
mkdirSync(dirname(out), { recursive: true });
rmSync(out, { force: true });

const db = new Database(out);
const repo = createFinanceRepository(openDatabase(betterSqlite3Driver(db)));
repo.seedDefaultCategories();

const category = (name: string) => {
  const found = repo.listCategories().find((c) => c.name === name);
  if (!found) throw new Error(`Categoria padrão ausente: ${name}`);
  return found.id;
};

const checking = repo.createAccount({ name: "Conta Corrente (demo)", type: "checking", openingBalanceCents: 350000 });
const savings = repo.createAccount({ name: "Reserva (demo)", type: "savings", openingBalanceCents: 1200000 });
const card = repo.createAccount({ name: "Cartão (demo)", type: "credit_card" });

// Contas recorrentes: o aluguel foi pago nos três meses; o resto mostra pendente, atrasada e supérflua.
const rent = repo.createRecurringBill({
  name: "Aluguel",
  amountCents: 180000,
  frequency: "monthly",
  dueDay: 6,
  classification: "fixed",
  categoryId: category("Aluguel"),
  defaultAccountId: checking.id,
  startPeriod: "2026-08",
});
const internet = repo.createRecurringBill({
  name: "Internet",
  amountCents: 11990,
  frequency: "monthly",
  dueDay: 15,
  classification: "fixed",
  categoryId: category("Contas de casa"),
  defaultAccountId: checking.id,
  startPeriod: "2026-08",
});
const condo = repo.createRecurringBill({
  name: "Condomínio",
  amountCents: 42000,
  frequency: "monthly",
  dueDay: 10,
  classification: "fixed",
  categoryId: category("Condomínio"),
  startPeriod: "2026-08",
});
const streaming = repo.createRecurringBill({
  name: "Streaming de vídeo",
  amountCents: 5590,
  frequency: "monthly",
  dueDay: 20,
  classification: "discretionary",
  categoryId: category("Lazer"),
  defaultAccountId: card.id,
  startPeriod: "2026-08",
});
repo.createRecurringBill({
  name: "IPTU",
  amountCents: 98000,
  frequency: "yearly",
  dueMonth: 11,
  dueDay: 25,
  classification: "fixed",
  categoryId: category("Moradia"),
  startPeriod: "2026-08",
});

// Fontes de renda: a esposa repassa um valor todo mês (pago em agosto e setembro; o de outubro ainda não chegou).
const wife = repo.createIncomeSource({ name: "Esposa" });
const transfer = repo.createRecurringIncome({
  name: "Repasse mensal",
  amountCents: 250000,
  frequency: "monthly",
  dueDay: 10,
  sourceId: wife.id,
  categoryId: category("Outras receitas"),
  defaultAccountId: checking.id,
  startPeriod: "2026-08",
});

const months = ["2026-08", "2026-09", "2026-10"];
months.forEach((month, i) => {
  const income = (day: string, cents: number, name: string, description: string) =>
    repo.addTransaction({ accountId: checking.id, categoryId: category(name), type: "income", amountCents: cents, date: `${month}-${day}`, description });
  const expense = (accountId: number, day: string, cents: number, name: string, description: string) =>
    repo.addTransaction({ accountId, categoryId: category(name), type: "expense", amountCents: cents, date: `${month}-${day}`, description });

  income("05", 650000, "Salário", "Salário");
  expense(checking.id, "08", 32000 + i * 1500, "Contas de casa", "Luz e internet");
  expense(card.id, "10", 41000 + i * 3000, "Mercado", "Compras do mês");
  expense(card.id, "14", 9800, "Restaurantes", "Jantar");
  expense(card.id, "17", 14500 + i * 2000, "Lazer", "Cinema e passeios");
  expense(checking.id, "19", 21000, "Transporte", "Combustível");
  expense(checking.id, "22", 17500, "Saúde", "Farmácia");
  if (month !== "2026-10") repo.receiveIncome({ incomeId: transfer.id, period: month, accountId: checking.id, date: `${month}-10` });
  repo.payBill({ billId: rent.id, period: month, accountId: checking.id, date: `${month}-06` });
  if (month !== "2026-10") {
    repo.payBill({ billId: internet.id, period: month, accountId: checking.id, date: `${month}-15` });
    repo.payBill({ billId: condo.id, period: month, accountId: checking.id, date: `${month}-10` });
    repo.payBill({ billId: streaming.id, period: month, accountId: card.id, date: `${month}-20` });
  }
  repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 100000, date: `${month}-25`, description: "Aporte na reserva" });
  repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 65000 + i * 5000, date: `${month}-28`, description: "Pagamento da fatura" });
});

// Metas: separam dinheiro sem tirá-lo das contas.
const trip = repo.createGoal({ name: "Viagem", targetCents: 600000, targetDate: "2026-12-31" });
const emergency = repo.createGoal({ name: "Reserva de emergência" });
repo.addContribution(trip.id, { amountCents: 50000, date: "2026-08-28", note: "Sobra de agosto" });
repo.addContribution(trip.id, { amountCents: 80000, date: "2026-09-28", note: "Sobra de setembro" });
repo.addContribution(trip.id, { amountCents: -15000, date: "2026-10-02", note: "Passagem comprada" });
repo.addContribution(emergency.id, { amountCents: 100000, date: "2026-09-28" });

db.close();
console.log(`demo.db gerado em ${out}`);

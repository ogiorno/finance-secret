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

const months = ["2026-08", "2026-09", "2026-10"];
months.forEach((month, i) => {
  const income = (day: string, cents: number, name: string, description: string) =>
    repo.addTransaction({ accountId: checking.id, categoryId: category(name), type: "income", amountCents: cents, date: `${month}-${day}`, description });
  const expense = (accountId: number, day: string, cents: number, name: string, description: string) =>
    repo.addTransaction({ accountId, categoryId: category(name), type: "expense", amountCents: cents, date: `${month}-${day}`, description });

  income("05", 650000, "Salário", "Salário");
  expense(checking.id, "06", 180000, "Aluguel", "Aluguel");
  expense(checking.id, "08", 32000 + i * 1500, "Contas de casa", "Luz e internet");
  expense(card.id, "10", 41000 + i * 3000, "Mercado", "Compras do mês");
  expense(card.id, "14", 9800, "Restaurantes", "Jantar");
  expense(card.id, "17", 14500 + i * 2000, "Lazer", "Cinema e passeios");
  expense(checking.id, "19", 21000, "Transporte", "Combustível");
  expense(checking.id, "22", 17500, "Saúde", "Farmácia");
  repo.addTransfer({ fromAccountId: checking.id, toAccountId: savings.id, amountCents: 100000, date: `${month}-25`, description: "Aporte na reserva" });
  repo.addTransfer({ fromAccountId: checking.id, toAccountId: card.id, amountCents: 65000 + i * 5000, date: `${month}-28`, description: "Pagamento da fatura" });
});

db.close();
console.log(`demo.db gerado em ${out}`);

import { lastDayOfMonth } from "./recurrence";

/**
 * Ciclo da fatura de um cartão. O cartão "vira" no dia de fechamento: a compra feita nesse dia (ou depois) entra na
 * fatura nova. Com fechamento no dia 1, a fatura é o mês do calendário.
 */

/** O mês `period` (`YYYY-MM`) deslocado em `delta` meses. */
export function shiftPeriod(period: string, delta: number): string {
  const [year = 0, month = 1] = period.split("-").map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** O dia em que o cartão vira no mês `period`; em mês curto, o último dia. */
export function turnDate(period: string, closingDay: number): string {
  const day = Math.min(closingDay, lastDayOfMonth(period));
  return `${period}-${String(day).padStart(2, "0")}`;
}

/** A fatura em aberto hoje: do último dia de virada (inclusive) até o próximo (exclusive). Datas `YYYY-MM-DD`. */
export function currentCycle(today: string, closingDay: number): { start: string; nextTurn: string } {
  const period = today.slice(0, 7);
  const thisMonth = turnDate(period, closingDay);
  if (today >= thisMonth) return { start: thisMonth, nextTurn: turnDate(shiftPeriod(period, 1), closingDay) };
  return { start: turnDate(shiftPeriod(period, -1), closingDay), nextTurn: thisMonth };
}

/** A fatura anterior à que está aberta: de `start` (inclusive) até `end` (exclusive). */
export function previousCycle(today: string, closingDay: number): { start: string; end: string } {
  const { start } = currentCycle(today, closingDay);
  return { start: turnDate(shiftPeriod(start.slice(0, 7), -1), closingDay), end: start };
}

/** Dias inteiros de `today` até `date`; nunca negativo. */
export function daysUntil(date: string, today: string): number {
  const parse = (value: string) => {
    const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.max(0, Math.round((parse(date) - parse(today)) / 86_400_000));
}

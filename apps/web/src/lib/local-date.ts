/** Hoje na data local do dispositivo, `YYYY-MM-DD` (o app não usa hora nem fuso). */
export function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** O mês `YYYY-MM` de hoje. */
export function currentPeriod(): string {
  return todayLocal().slice(0, 7);
}

/** O mês seguinte a `period` (`YYYY-MM`). */
export function nextPeriod(period: string): string {
  const [year = 0, month = 1] = period.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** `2026-03-10` vira `10/03`. */
export function shortDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

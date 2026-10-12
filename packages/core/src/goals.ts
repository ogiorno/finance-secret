/**
 * Contas das metas, só com inteiros (centavos e meses). Nada passa por número com vírgula.
 */

function monthIndex(period: string): number {
  const [year = 0, month = 1] = period.split("-").map(Number);
  return year * 12 + (month - 1);
}

/** Quantos meses faltam até o mês de `targetDate`, contando o mês de `period`; 0 se esse mês já passou. */
export function monthsUntil(period: string, targetDate: string): number {
  return Math.max(0, monthIndex(targetDate.slice(0, 7)) - monthIndex(period) + 1);
}

/**
 * Quanto aportar por mês para atingir o alvo no prazo, arredondando para cima. `null` sem alvo, sem prazo ou com o
 * prazo vencido e dinheiro faltando; 0 se o alvo já foi atingido.
 */
export function monthlyContributionNeeded(input: {
  targetCents: number | null;
  savedCents: number;
  period: string;
  targetDate: string | null;
}): number | null {
  if (input.targetCents === null || input.targetDate === null) return null;
  const remaining = input.targetCents - input.savedCents;
  if (remaining <= 0) return 0;
  const months = monthsUntil(input.period, input.targetDate);
  if (months === 0) return null;
  return Math.ceil(remaining / months);
}

/** Média dos totais mensais, em centavos, arredondando meio centavo para cima; 0 sem meses. */
export function averageMonthlyCents(monthlyCents: number[]): number {
  if (monthlyCents.length === 0) return 0;
  const total = monthlyCents.reduce((sum, cents) => sum + cents, 0);
  return Math.floor((2 * total + monthlyCents.length) / (2 * monthlyCents.length));
}

/** O mês em que a meta é atingida no ritmo atual (`YYYY-MM`), ou `null` se o ritmo é zero. */
export function estimateCompletionPeriod(input: { remainingCents: number; perMonthCents: number; period: string }): string | null {
  if (input.remainingCents <= 0) return input.period;
  if (input.perMonthCents <= 0) return null;
  const months = Math.ceil(input.remainingCents / input.perMonthCents);
  const index = monthIndex(input.period) + months - 1;
  const year = Math.floor(index / 12);
  return `${year}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Percentual inteiro guardado (no máximo 100), ou `null` sem alvo. */
export function progressPercent(savedCents: number, targetCents: number | null): number | null {
  if (targetCents === null || targetCents <= 0) return null;
  return Math.min(100, Math.max(0, Math.floor((savedCents * 100) / targetCents)));
}

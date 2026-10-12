export type BillFrequency = "monthly" | "yearly";
export type BillStatus = "pending" | "overdue" | "paid";

export interface BillSchedule {
  frequency: BillFrequency;
  /** Dia do vencimento, 1 a 31. Em mês mais curto vale o último dia. */
  dueDay: number;
  /** Mês do vencimento (1 a 12); só conta nas contas anuais. */
  dueMonth: number | null;
}

/** Quantos dias tem o mês `YYYY-MM` (fevereiro de ano bissexto tem 29). */
export function lastDayOfMonth(period: string): number {
  const [year = 0, month = 1] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Data de vencimento (`YYYY-MM-DD`) da conta no mês `period`, ou `null` se a conta não vence nesse mês. */
export function dueDateFor(schedule: BillSchedule, period: string): string | null {
  const month = Number(period.slice(5, 7));
  if (schedule.frequency === "yearly" && schedule.dueMonth !== month) return null;
  const day = Math.min(schedule.dueDay, lastDayOfMonth(period));
  return `${period}-${String(day).padStart(2, "0")}`;
}

/** Paga se há pagamento; atrasada a partir do dia seguinte ao vencimento; senão pendente. Datas locais `YYYY-MM-DD`. */
export function billStatus(input: { dueDate: string; paid: boolean; today: string }): BillStatus {
  if (input.paid) return "paid";
  return input.today > input.dueDate ? "overdue" : "pending";
}

export interface BillAmountStep {
  /** Primeiro mês (`YYYY-MM`) em que o valor vale. */
  effectivePeriod: string;
  amountCents: number;
}

/** O valor esperado no mês: o da vigência mais recente que já começou, ou `null` se nenhuma começou. */
export function expectedAmountFor(steps: BillAmountStep[], period: string): number | null {
  let best: BillAmountStep | null = null;
  for (const step of steps) {
    if (step.effectivePeriod <= period && (best === null || step.effectivePeriod > best.effectivePeriod)) best = step;
  }
  return best?.amountCents ?? null;
}

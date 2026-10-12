import { lastDayOfMonth } from "./recurrence";

/**
 * Projeção do caixa mês a mês, montada como um roll-forward: saldo no início, mais o que entra, menos o que sai,
 * igual ao saldo no fim, e o fim de um mês é o início do seguinte. Tudo em centavos inteiros.
 */

/** O que se sabe de um mês futuro (ou do que resta do mês atual). */
export interface ProjectionMonthInput {
  /** `YYYY-MM`. */
  month: string;
  /** Receitas que ainda vão entrar: as recorrentes cadastradas ou, sem elas, a repetição da receita do último mês. */
  incomeCents: number;
  /** A receita acima é uma suposição (repetir o último mês), não receitas cadastradas. */
  incomeAssumed?: boolean;
  /** Contas fixas que ainda vão ser pagas. */
  billsCents: number;
  /** Fatura do cartão que fecha neste mês (compras do ciclo anterior), já com tudo o que foi lançado. */
  cardInvoiceCents: number;
  /** Quanto dessa fatura já foi pago por transferência. */
  cardPaidCents: number;
  /** Gastos do dia a dia fora do cartão e das contas fixas, estimados. */
  variableCents: number;
}

export interface ProjectionMonth extends ProjectionMonthInput {
  /** Saldo em dinheiro no início (no mês atual, o de hoje). */
  openingCents: number;
  /** O que falta pagar da fatura: nunca negativo. */
  cardPaymentCents: number;
  /** Saldo em dinheiro no fim do mês. */
  closingCents: number;
  /**
   * O máximo que a fatura pode chegar sem o mês terminar no vermelho (nunca negativo). Nos meses seguintes ao atual
   * conta só o que o próprio mês gera (receita − contas fixas − gastos do dia a dia), igual em todo mês de mesma receita:
   * o dinheiro que sobrou de meses anteriores não aumenta o teto, mas um buraco que veio de trás o diminui. No mês atual,
   * parte do dinheiro que existe hoje.
   */
  cardAllowanceCents: number;
  /** Quanto ainda cabe em compras no cartão nesta fatura: teto menos o que já está nela; negativo se já passou. */
  cardRoomCents: number;
  /** O saldo no fim fica abaixo de zero. */
  negative: boolean;
}

export interface Projection {
  months: ProjectionMonth[];
  /** O primeiro mês em que o saldo no fim fica negativo, se algum. */
  firstNegativeMonth: string | null;
  /** Início + entradas − saídas de cada mês confere com o saldo no fim; se não conferir, algo está errado. */
  foots: boolean;
}

export function buildProjection(startCashCents: number, inputs: ProjectionMonthInput[]): Projection {
  let opening = startCashCents;
  let foots = true;
  const months: ProjectionMonth[] = inputs.map((input, index) => {
    const cardPaymentCents = Math.max(0, input.cardInvoiceCents - input.cardPaidCents);
    const closingCents = opening + input.incomeCents - input.billsCents - cardPaymentCents - input.variableCents;
    const monthFlow = input.incomeCents - input.billsCents - input.variableCents;
    const isFirst = index === 0;
    const capacity = isFirst ? opening + monthFlow + input.cardPaidCents : monthFlow - Math.max(0, -opening);
    const cardAllowanceCents = Math.max(0, capacity);
    const month: ProjectionMonth = {
      ...input,
      openingCents: opening,
      cardPaymentCents,
      closingCents,
      cardAllowanceCents,
      cardRoomCents: cardAllowanceCents - input.cardInvoiceCents,
      negative: closingCents < 0,
    };
    if (month.openingCents + month.incomeCents - month.billsCents - month.cardPaymentCents - month.variableCents !== month.closingCents) foots = false;
    opening = closingCents;
    return month;
  });
  return { months, firstNegativeMonth: months.find((month) => month.negative)?.month ?? null, foots };
}

/**
 * Parte do gasto mensal que ainda falta no mês atual: dias depois de hoje sobre os dias do mês.
 * Em meses futuros, use o gasto inteiro.
 */
export function remainingMonthShare(today: string): { days: number; of: number } {
  const month = today.slice(0, 7);
  const of = lastDayOfMonth(month);
  return { days: of - Number(today.slice(8, 10)), of };
}

/** Média por mês dos meses que tiveram gasto; zero sem nenhum. Arredonda para o centavo mais próximo. */
export function averageSpendCents(totals: number[]): number {
  const used = totals.filter((total) => total > 0);
  if (used.length === 0) return 0;
  const sum = used.reduce((a, b) => a + b, 0);
  return Math.floor((sum * 2 + used.length) / (used.length * 2));
}

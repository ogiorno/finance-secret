/** Como o dinheiro saiu: descreve e filtra, nunca altera saldos. */
export const PAYMENT_METHODS = ["debit", "credit", "pix", "boleto", "meal_voucher", "cash", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  debit: "Débito",
  credit: "Crédito",
  pix: "Pix",
  boleto: "Boleto",
  meal_voucher: "Vale-refeição",
  cash: "Dinheiro",
  other: "Outro",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

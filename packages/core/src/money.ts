const BRL_AMOUNT = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/**
 * Lê um valor digitado em formato brasileiro ("1.234,56", "R$ 80") e devolve centavos inteiros.
 * Retorna null se o texto não for um valor positivo válido.
 */
export function parseBRLToCents(text: string): number | null {
  const match = BRL_AMOUNT.exec(text.replace(/^\s*R\$\s*/i, "").trim());
  if (!match) return null;
  const reais = Number((match[1] ?? "").replaceAll(".", ""));
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  return reais * 100 + cents;
}

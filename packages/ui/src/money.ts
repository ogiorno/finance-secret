const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos inteiros como moeda BRL. */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

import type { TransactionListItem } from "@finance/database";

/** `2026-03-10` vira `10/03/2026`. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export interface Flow {
  from: string;
  to: string;
  /** A mesma informação em texto corrido, para leitores de tela. */
  spoken: string;
}

/** De onde o dinheiro saiu e para onde foi, a partir de como a lista mostra o lançamento. */
export function describeFlow(item: TransactionListItem): Flow {
  let from: string;
  let to: string;
  if (item.type === "expense") {
    from = item.accountName;
    to = item.categoryName ?? "Sem categoria";
  } else if (item.type === "income") {
    from = item.sourceName ?? item.categoryName ?? "Sem categoria";
    to = item.accountName;
  } else if (item.amountCents < 0) {
    from = item.accountName;
    to = item.counterpartAccountName ?? "outra conta";
  } else {
    from = item.counterpartAccountName ?? "outra conta";
    to = item.accountName;
  }
  return { from, to, spoken: `de ${from} para ${to}` };
}

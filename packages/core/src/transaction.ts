import { isValidDate } from "./date";

export type CategoryType = "income" | "expense";

export interface NewTransaction {
  type: CategoryType;
  /** Valor positivo em centavos; o sentido vem de `type`. */
  amountCents: number;
  /** Data local, YYYY-MM-DD. */
  date: string;
}

/** Valida receita ou despesa antes de gravar. `categoryType` é o tipo da categoria escolhida. */
export function validateTransaction(input: NewTransaction, categoryType: CategoryType): void {
  if (input.type !== categoryType) {
    throw new Error("O tipo do lançamento deve ser o mesmo da categoria.");
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("O valor deve ser um número inteiro positivo de centavos.");
  }
  if (!isValidDate(input.date)) {
    throw new Error("Data inválida: use o formato AAAA-MM-DD.");
  }
}

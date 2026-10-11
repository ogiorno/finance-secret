import { isValidDate } from "./date";

export interface TransferInput {
  fromAccountId: number;
  toAccountId: number;
  /** Valor positivo em centavos. */
  amountCents: number;
  /** Data local, YYYY-MM-DD. */
  date: string;
  description: string;
}

export interface TransferLeg {
  accountId: number;
  type: "transfer";
  /** Com sinal: saída negativa, entrada positiva. */
  amountCents: number;
  date: string;
  description: string;
}

/** Monta as duas pernas de uma transferência (ADR 0002). */
export function buildTransfer(input: TransferInput): [TransferLeg, TransferLeg] {
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Origem e destino não podem ser a mesma conta.");
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("O valor deve ser um número inteiro positivo de centavos.");
  }
  if (!isValidDate(input.date)) {
    throw new Error("Data inválida: use o formato AAAA-MM-DD.");
  }
  const base = { type: "transfer" as const, date: input.date, description: input.description };
  return [
    { ...base, accountId: input.fromAccountId, amountCents: -input.amountCents },
    { ...base, accountId: input.toAccountId, amountCents: input.amountCents },
  ];
}

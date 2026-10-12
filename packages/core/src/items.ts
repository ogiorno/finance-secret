/**
 * Contas dos itens de uma compra, só com inteiros: a quantidade vai em milésimos (1,250 kg = 1250) e os valores em
 * centavos. Nenhuma conta passa por número com vírgula (ponto flutuante).
 */

function assertSafeInt(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) throw new Error(`${name} deve ser um número inteiro.`);
}

/** `quantidade × preço unitário`, em centavos, arredondando meio centavo para cima. */
export function itemTotalCents(quantityMilli: number, unitPriceCents: number): number {
  assertSafeInt(quantityMilli, "A quantidade");
  assertSafeInt(unitPriceCents, "O preço");
  if (quantityMilli <= 0) throw new Error("A quantidade deve ser maior que zero.");
  if (unitPriceCents < 0) throw new Error("O preço não pode ser negativo.");
  // floor((2·q·p + 1000) / 2000) = q·p / 1000 arredondado para cima na metade. BigInt evita estourar os 53 bits.
  const total = (BigInt(quantityMilli) * BigInt(unitPriceCents) * 2n + 1000n) / 2000n;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("O valor do item é grande demais.");
  return Number(total);
}

const QUANTITY = /^(\d+)(?:,(\d{1,3}))?$/;

/** Lê "1,250", "2", "0,5" (formato brasileiro, até 3 casas) em milésimos; `null` se não for uma quantidade positiva. */
export function parseQuantityToMilli(text: string): number | null {
  const match = QUANTITY.exec(text.trim());
  if (!match) return null;
  const milli = Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
  return Number.isSafeInteger(milli) && milli > 0 ? milli : null;
}

/** Mostra milésimos como quantidade, sem zeros à direita: 1250 vira "1,25", 1000 vira "1". */
export function formatQuantityMilli(quantityMilli: number): string {
  const whole = Math.trunc(quantityMilli / 1000);
  const fraction = String(quantityMilli % 1000)
    .padStart(3, "0")
    .replace(/0+$/, "");
  return fraction === "" ? String(whole) : `${whole},${fraction}`;
}

/** Divide `totalCents` em `parts` partes inteiras que somam exatamente o total (o resto vai uma a uma para as primeiras). */
export function splitCents(totalCents: number, parts: number): number[] {
  assertSafeInt(totalCents, "O total");
  assertSafeInt(parts, "O número de partes");
  if (totalCents < 0) throw new Error("O total não pode ser negativo.");
  if (parts < 1) throw new Error("É preciso ao menos uma parte.");
  const base = Math.floor(totalCents / parts);
  const extra = totalCents - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < extra ? 1 : 0));
}

const DECIMAL_TEXT = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Lê um valor em texto decimal com ponto ("12.34", como uma IA devolveria) em centavos. Só aceita texto: um número
 * (já em ponto flutuante) é recusado, para nunca passar float por dinheiro.
 */
export function parseDecimalTextToCents(text: string): number | null {
  if (typeof text !== "string") return null;
  const match = DECIMAL_TEXT.exec(text);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

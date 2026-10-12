<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";
  import { formatBRL } from "../money";

  type Tone = "auto" | "income" | "expense" | "neutral";

  let {
    class: className,
    cents,
    tone = "neutral",
    showSign = false,
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & {
    /** Valor em centavos. Para tone "income"/"expense", passe o valor absoluto. */
    cents: number;
    /** "auto" colore pelo sinal de `cents`. */
    tone?: Tone;
    /** Mostra +/− explícito, para o sentido não depender só da cor. */
    showSign?: boolean;
  } = $props();

  const resolved = $derived(tone === "auto" ? (cents > 0 ? "income" : cents < 0 ? "expense" : "neutral") : tone);
  const negative = $derived(resolved === "expense" || (tone !== "income" && cents < 0));
  const sign = $derived(cents === 0 ? "" : (showSign || resolved !== "neutral" ? (negative ? "−" : "+") : ""));
</script>

<span
  data-slot="money"
  class={cn(
    "tabular-nums",
    resolved === "income" && "text-income",
    resolved === "expense" && "text-expense",
    className,
  )}
  {...rest}
>{sign}{formatBRL(Math.abs(cents))}</span>

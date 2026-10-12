<script lang="ts">
  import { TrendingDown, TrendingUp } from "@lucide/svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let {
    class: className,
    percent,
    goodWhen = "up",
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & {
    /** Variação em pontos percentuais; positiva sobe, negativa desce. */
    percent: number;
    /** Qual sentido é bom: receita sobe, despesa desce. */
    goodWhen?: "up" | "down";
  } = $props();

  const up = $derived(percent >= 0);
  const good = $derived((goodWhen === "up") === up);
  const label = $derived(`${up ? "+" : "−"}${Math.abs(percent).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
</script>

<span
  data-slot="trend-badge"
  class={cn(
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
    good ? "border-income/30 bg-income/10 text-income" : "border-expense/30 bg-expense/10 text-expense",
    className,
  )}
  {...rest}
>
  {#if up}<TrendingUp class="size-3" aria-hidden="true" />{:else}<TrendingDown class="size-3" aria-hidden="true" />{/if}
  {label}
</span>
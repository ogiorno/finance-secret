<script lang="ts">
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";
  import { cn } from "../cn";
  import Button from "./Button.svelte";

  let {
    class: className,
    value = $bindable(),
    onchange,
  }: {
    class?: string;
    /** Mês no formato YYYY-MM. */
    value: string;
    onchange?: (month: string) => void;
  } = $props();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function shift(month: string, delta: number): string {
    const [year = 0, mon = 1] = month.split("-").map(Number);
    const date = new Date(year, mon - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function label(month: string): string {
    const [year = 0, mon = 1] = month.split("-").map(Number);
    const text = new Date(year, mon - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function go(month: string) {
    value = month;
    onchange?.(month);
  }
</script>

<div data-slot="month-stepper" class={cn("flex items-center gap-1", className)} role="group" aria-label="Mês">
  <Button variant="outline" size="icon" aria-label="Mês anterior" onclick={() => go(shift(value, -1))}>
    <ChevronLeft aria-hidden="true" />
  </Button>
  <span class="min-w-36 text-center text-sm font-medium" aria-live="polite">{label(value)}</span>
  <Button variant="outline" size="icon" aria-label="Próximo mês" onclick={() => go(shift(value, 1))}>
    <ChevronRight aria-hidden="true" />
  </Button>
  <Button variant="ghost" size="sm" disabled={value === currentMonth} onclick={() => go(currentMonth)}>Hoje</Button>
</div>
<script lang="ts">
  import { parseBRLToCents, splitCents } from "@finance/core";
  import type { Goal } from "@finance/database";
  import { Alert, Button, Dialog, Disclosure, Field, Input, Money, formatBRL } from "@finance/ui";
  import { todayLocal } from "./local-date";

  let {
    open = $bindable(false),
    goals,
    availableCents,
    monthLabel,
    onsave,
  }: {
    open?: boolean;
    goals: Goal[];
    /** O Resultado do mês: o que sobrou (pode ser zero ou negativo). */
    availableCents: number;
    monthLabel: string;
    /** Devolve uma mensagem de erro, ou `null` quando salvou. */
    onsave: (values: { allocations: { goalId: number; amountCents: number }[]; date: string; note: string }) => string | null;
  } = $props();

  let amounts = $state<Record<number, string>>({});
  let date = $state(todayLocal());
  let error = $state<string | null>(null);

  $effect(() => {
    if (!open) return;
    amounts = Object.fromEntries(goals.map((goal) => [goal.id, ""]));
    date = todayLocal();
    error = null;
  });

  const parsed = $derived(goals.map((goal) => ({ goal, cents: (amounts[goal.id] ?? "").trim() === "" ? 0 : parseBRLToCents(amounts[goal.id] ?? "") })));
  const hasInvalid = $derived(parsed.some((entry) => entry.cents === null));
  const total = $derived(parsed.reduce((sum, entry) => sum + (entry.cents ?? 0), 0));

  const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function splitEvenly() {
    if (availableCents <= 0 || goals.length === 0) return;
    const parts = splitCents(availableCents, goals.length);
    amounts = Object.fromEntries(goals.map((goal, index) => [goal.id, money(parts[index] ?? 0)]));
  }

  function submit(event: Event) {
    event.preventDefault();
    error = null;
    if (hasInvalid) {
      error = "Há um valor inválido. Exemplo: 100,00";
      return;
    }
    const allocations = parsed.filter((entry) => (entry.cents ?? 0) > 0).map((entry) => ({ goalId: entry.goal.id, amountCents: entry.cents ?? 0 }));
    if (allocations.length === 0) {
      error = "Informe quanto vai para pelo menos uma meta.";
      return;
    }
    error = onsave({ allocations, date, note: `Sobra de ${monthLabel}` });
    if (error === null) open = false;
  }
</script>

<Dialog bind:open title="Distribuir a sobra do mês" description={`Resultado de ${monthLabel}. O dinheiro continua nas suas contas; ele só fica reservado em cada meta.`}>
  <form class="grid gap-4" onsubmit={submit}>
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
      <span class="text-muted-foreground">Sobrou no mês</span>
      <Money class="font-semibold" cents={availableCents} tone="auto" />
    </div>
    {#each goals as goal (goal.id)}
      <Field label={goal.name}>
        {#snippet control(field)}
          <Input {...field} value={amounts[goal.id] ?? ""} oninput={(event) => (amounts[goal.id] = event.currentTarget.value)} inputmode="decimal" placeholder="0,00" />
        {/snippet}
      </Field>
    {/each}
    <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>Distribuído: <Money class="font-medium" cents={total} /></span>
      {#if availableCents > 0 && goals.length > 1}<Button type="button" variant="outline" size="sm" onclick={splitEvenly}>Dividir igualmente</Button>{/if}
    </div>
    {#if total > availableCents}
      <Alert variant="warning">
        Você está distribuindo {formatBRL(total)}, mais do que sobrou neste mês ({formatBRL(Math.max(0, availableCents))}). Tudo bem se a sobra estiver em outro mês.
      </Alert>
    {/if}
    <Disclosure label="Opções avançadas">
      <Field label="Data">
        {#snippet control(field)}<Input {...field} type="date" bind:value={date} required />{/snippet}
      </Field>
    </Disclosure>
    {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
    <div class="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" onclick={() => (open = false)}>Cancelar</Button>
      <Button type="submit">Distribuir</Button>
    </div>
  </form>
</Dialog>

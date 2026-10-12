<script lang="ts">
  import { parseBRLToCents } from "@finance/core";
  import type { Goal } from "@finance/database";
  import { Alert, Button, Dialog, Disclosure, Field, Input, NativeSelect } from "@finance/ui";
  import { todayLocal } from "./local-date";

  let {
    open = $bindable(false),
    goals,
    goalId,
    mode = "add",
    onsave,
  }: {
    open?: boolean;
    goals: Goal[];
    /** Meta já escolhida ao abrir (a do cartão em que o usuário clicou). */
    goalId: number | null;
    /** `withdraw`: tira dinheiro da meta (resgate). */
    mode?: "add" | "withdraw";
    /** Valor já com sinal (negativo no resgate). Devolve uma mensagem de erro, ou `null` quando salvou. */
    onsave: (values: { goalId: number; amountCents: number; date: string; note: string }) => string | null;
  } = $props();

  let chosen = $state("");
  let amount = $state("");
  let date = $state(todayLocal());
  let note = $state("");
  let error = $state<string | null>(null);
  let amountError = $state<string | null>(null);

  // A cada abertura volta aos padrões.
  $effect(() => {
    if (!open) return;
    chosen = goalId !== null ? String(goalId) : goals.length === 1 ? String(goals[0]?.id) : "";
    amount = "";
    date = todayLocal();
    note = "";
    error = null;
    amountError = null;
  });

  const selected = $derived(goals.find((goal) => String(goal.id) === chosen));

  function submit(event: Event) {
    event.preventDefault();
    error = null;
    amountError = null;
    const cents = parseBRLToCents(amount);
    if (cents === null || cents <= 0) {
      amountError = "Valor inválido. Exemplo: 100,00";
      return;
    }
    error = onsave({ goalId: Number(chosen), amountCents: mode === "withdraw" ? -cents : cents, date, note });
    if (error === null) open = false;
  }
</script>

<Dialog
  bind:open
  title={mode === "withdraw" ? "Retirar da meta" : "Colocar na meta"}
  description={mode === "withdraw"
    ? "O dinheiro continua na sua conta; ele só deixa de estar reservado para esta meta."
    : "O dinheiro continua na sua conta; ele só fica reservado para esta meta."}
>
  <form class="grid gap-4" onsubmit={submit}>
    <Field label="Valor (R$)" error={amountError}>
      {#snippet control(field)}<Input {...field} bind:value={amount} inputmode="decimal" placeholder="0,00" required />{/snippet}
    </Field>
    {#if goals.length > 1 || goalId === null}
      <Field label="Meta">
        {#snippet control(field)}
          <NativeSelect {...field} bind:value={chosen} required>
            <option value="" disabled>Selecione</option>
            {#each goals as goal (goal.id)}<option value={String(goal.id)}>{goal.name}</option>{/each}
          </NativeSelect>
        {/snippet}
      </Field>
    {:else if selected}
      <p class="text-sm text-muted-foreground">Meta: <strong class="text-foreground">{selected.name}</strong></p>
    {/if}
    <Disclosure label="Opções avançadas">
      <Field label="Data">
        {#snippet control(field)}<Input {...field} type="date" bind:value={date} required />{/snippet}
      </Field>
      <Field label="Observação">
        {#snippet control(field)}<Input {...field} bind:value={note} placeholder="Opcional" />{/snippet}
      </Field>
    </Disclosure>
    {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
    <div class="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" onclick={() => (open = false)}>Cancelar</Button>
      <Button type="submit">{mode === "withdraw" ? "Retirar" : "Colocar"}</Button>
    </div>
  </form>
</Dialog>

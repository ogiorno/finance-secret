<script lang="ts" module>
  export interface GoalFormValues {
    name: string;
    targetCents: number | null;
    targetDate: string | null;
  }

  export interface GoalFormInitial {
    name: string;
    target: string;
    targetDate: string;
  }
</script>

<script lang="ts">
  import { parseBRLToCents } from "@finance/core";
  import { Alert, Button, Field, Input } from "@finance/ui";

  let {
    initial,
    onsubmit,
    oncancel,
  }: {
    initial: GoalFormInitial;
    /** Devolve uma mensagem de erro, ou `null` quando salvou. */
    onsubmit: (values: GoalFormValues) => string | null;
    oncancel: () => void;
  } = $props();

  /* svelte-ignore state_referenced_locally */
  let name = $state(initial.name);
  /* svelte-ignore state_referenced_locally */
  let target = $state(initial.target);
  /* svelte-ignore state_referenced_locally */
  let targetDate = $state(initial.targetDate);
  let error = $state<string | null>(null);
  let targetError = $state<string | null>(null);

  function formatTarget() {
    const cents = parseBRLToCents(target);
    if (cents !== null) target = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function save(event: Event) {
    event.preventDefault();
    error = null;
    targetError = null;
    let targetCents: number | null = null;
    if (target.trim() !== "") {
      targetCents = parseBRLToCents(target);
      if (targetCents === null || targetCents <= 0) {
        targetError = "Valor inválido. Exemplo: 6.000,00";
        return;
      }
    }
    error = onsubmit({ name, targetCents, targetDate: targetDate === "" ? null : targetDate });
  }
</script>

<form class="grid gap-4" onsubmit={save}>
  <Field label="Nome">
    {#snippet control(field)}<Input {...field} bind:value={name} required placeholder="Ex.: Viagem" />{/snippet}
  </Field>
  <Field label="Valor alvo (R$), se tiver" error={targetError}>
    {#snippet control(field)}<Input {...field} bind:value={target} inputmode="decimal" placeholder="Sem alvo" onblur={formatTarget} />{/snippet}
  </Field>
  <Field label="Prazo, se tiver">
    {#snippet control(field)}<Input {...field} type="date" bind:value={targetDate} />{/snippet}
  </Field>
  {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
  <div class="flex flex-wrap justify-end gap-2">
    <Button type="button" variant="ghost" onclick={oncancel}>Cancelar</Button>
    <Button type="submit">Salvar</Button>
  </div>
</form>

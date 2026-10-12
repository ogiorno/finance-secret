<script lang="ts" module>
  import type { BillClassification, IncomeSource } from "@finance/database";
  import type { BillFrequency } from "@finance/core";

  export interface BillFormValues {
    name: string;
    amountCents: number;
    frequency: BillFrequency;
    dueDay: number;
    dueMonth: number | null;
    /** Sem categoria, a conta fica em "Sem categoria". */
    categoryId: number | undefined;
    classification: BillClassification;
    /** Só nas receitas recorrentes. */
    sourceId: number | undefined;
    defaultAccountId: number | null;
    startPeriod: string;
  }

  export interface BillFormInitial {
    name: string;
    amount: string;
    frequency: BillFrequency;
    dueDay: string;
    dueMonth: string;
    categoryId: string;
    classification: BillClassification;
    sourceId: string;
    defaultAccountId: string;
    startPeriod: string;
  }

  const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
</script>

<script lang="ts">
  import { parseBRLToCents } from "@finance/core";
  import type { Account, Category } from "@finance/database";
  import { Alert, Button, Disclosure, Field, Input, NativeSelect, SegmentedControl } from "@finance/ui";

  let {
    accounts,
    categories,
    initial,
    editing = false,
    mode = "bill",
    sources = [],
    onsubmit,
    oncancel,
  }: {
    accounts: Account[];
    /** Categorias de despesa (conta a pagar) ou de receita (receita recorrente). */
    categories: (Category & { label: string })[];
    initial: BillFormInitial;
    /** Na edição, o valor esperado muda por outro caminho (ele pergunta desde quando). */
    editing?: boolean;
    /** `income`: receita recorrente, com fonte de renda no lugar do tipo Fixa/Supérflua. */
    mode?: "bill" | "income";
    sources?: IncomeSource[];
    /** Devolve uma mensagem de erro, ou `null` quando salvou. */
    onsubmit: (values: BillFormValues) => string | null;
    oncancel: () => void;
  } = $props();

  /* svelte-ignore state_referenced_locally */
  let name = $state(initial.name);
  /* svelte-ignore state_referenced_locally */
  let amount = $state(initial.amount);
  /* svelte-ignore state_referenced_locally */
  let frequency = $state<BillFrequency>(initial.frequency);
  /* svelte-ignore state_referenced_locally */
  let dueDay = $state(initial.dueDay);
  /* svelte-ignore state_referenced_locally */
  let dueMonth = $state(initial.dueMonth);
  /* svelte-ignore state_referenced_locally */
  let categoryId = $state(initial.categoryId);
  /* svelte-ignore state_referenced_locally */
  let classification = $state<BillClassification>(initial.classification);
  /* svelte-ignore state_referenced_locally */
  let sourceId = $state(initial.sourceId);
  /* svelte-ignore state_referenced_locally */
  let defaultAccountId = $state(initial.defaultAccountId);
  /* svelte-ignore state_referenced_locally */
  let startPeriod = $state(initial.startPeriod);
  let error = $state<string | null>(null);
  let amountError = $state<string | null>(null);

  function formatAmount() {
    const cents = parseBRLToCents(amount);
    if (cents !== null) amount = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function save(event: Event) {
    event.preventDefault();
    error = null;
    amountError = null;
    const cents = parseBRLToCents(amount);
    if (cents === null || cents <= 0) {
      amountError = "Valor inválido. Exemplo: 1.800,00";
      return;
    }
    error = onsubmit({
      name,
      amountCents: cents,
      frequency,
      dueDay: Number(dueDay),
      dueMonth: frequency === "yearly" ? Number(dueMonth) : null,
      categoryId: categoryId === "" ? undefined : Number(categoryId),
      classification,
      sourceId: sourceId === "" ? undefined : Number(sourceId),
      defaultAccountId: defaultAccountId === "" ? null : Number(defaultAccountId),
      startPeriod,
    });
  }
</script>

<form class="grid gap-4" onsubmit={save}>
  <Field label="Nome">
    {#snippet control(field)}<Input {...field} bind:value={name} required placeholder={mode === "income" ? "Ex.: Repasse mensal" : "Ex.: Aluguel"} />{/snippet}
  </Field>
  <Field label="Valor esperado (R$)" error={amountError}>
    {#snippet control(field)}
      <Input {...field} bind:value={amount} inputmode="decimal" placeholder="0,00" required onblur={formatAmount} />
    {/snippet}
  </Field>
  <SegmentedControl
    label="Periodicidade"
    bind:value={frequency}
    options={[
      { value: "monthly", label: "Todo mês" },
      { value: "yearly", label: "Uma vez por ano" },
    ]}
  />
  <div class="grid gap-4 sm:grid-cols-2">
    <Field label="Dia do vencimento">
      {#snippet control(field)}<Input {...field} bind:value={dueDay} type="number" min="1" max="31" inputmode="numeric" required />{/snippet}
    </Field>
    {#if frequency === "yearly"}
      <Field label="Mês do vencimento">
        {#snippet control(field)}
          <NativeSelect {...field} bind:value={dueMonth} required>
            <option value="" disabled>Selecione</option>
            {#each MONTHS as label, index (label)}<option value={String(index + 1)}>{label}</option>{/each}
          </NativeSelect>
        {/snippet}
      </Field>
    {/if}
  </div>
  {#if mode === "income"}
    <Field label="Fonte da renda">
      {#snippet control(field)}
        <NativeSelect {...field} bind:value={sourceId} required>
          {#each sources as source (source.id)}<option value={String(source.id)}>{source.name}</option>{/each}
        </NativeSelect>
      {/snippet}
    </Field>
  {:else}
    <SegmentedControl
      label="Tipo da conta"
      bind:value={classification}
      options={[
        { value: "fixed", label: "Fixa" },
        { value: "discretionary", label: "Supérflua" },
      ]}
    />
  {/if}
  <Field label="Categoria">
    {#snippet control(field)}
      <NativeSelect {...field} bind:value={categoryId}>
        <option value="">Sem categoria</option>
        {#each categories as category (category.id)}<option value={String(category.id)}>{category.label}</option>{/each}
      </NativeSelect>
    {/snippet}
  </Field>
  <Disclosure label="Opções avançadas" open={initial.defaultAccountId !== ""}>
    <Field label={mode === "income" ? "Conta padrão para receber" : "Conta padrão para pagar"}>
      {#snippet control(field)}
        <NativeSelect {...field} bind:value={defaultAccountId}>
          <option value="">Escolher na hora de pagar</option>
          {#each accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
        </NativeSelect>
      {/snippet}
    </Field>
    {#if !editing}
      <Field label="Começa em">
        {#snippet control(field)}<Input {...field} type="month" bind:value={startPeriod} required />{/snippet}
      </Field>
    {/if}
  </Disclosure>
  {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
  <div class="flex flex-wrap justify-end gap-2">
    <Button type="button" variant="ghost" onclick={oncancel}>Cancelar</Button>
    <Button type="submit">Salvar</Button>
  </div>
</form>

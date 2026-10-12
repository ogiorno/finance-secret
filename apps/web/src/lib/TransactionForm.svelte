<script lang="ts" module>
  export type TransactionKind = "expense" | "income" | "transfer";

  export interface TransactionFormValues {
    kind: TransactionKind;
    accountId: number;
    toAccountId: number;
    categoryId: number;
    amountCents: number;
    date: string;
    description: string;
    pending: boolean;
  }

  export interface TransactionFormInitial {
    kind: TransactionKind;
    accountId: string;
    toAccountId: string;
    categoryId: string;
    amount: string;
    date: string;
    description: string;
    pending: boolean;
  }
</script>

<script lang="ts">
  import { parseBRLToCents } from "@finance/core";
  import type { Account, Category } from "@finance/database";
  import { Alert, Button, Checkbox, Field, Input, Label, NativeSelect, SegmentedControl } from "@finance/ui";

  let {
    accounts,
    categories,
    initial,
    editing = false,
    onsubmit,
    oncancel,
  }: {
    accounts: Account[];
    categories: (Category & { label: string })[];
    initial: TransactionFormInitial;
    /** Edição não oferece "Salvar e adicionar outro". */
    editing?: boolean;
    /** Devolve uma mensagem de erro, ou `null` quando salvou. */
    onsubmit: (values: TransactionFormValues, addAnother: boolean) => string | null;
    oncancel: () => void;
  } = $props();

  // Os valores iniciais só valem na abertura do formulário; depois o usuário edita.
  /* svelte-ignore state_referenced_locally */
  let kind = $state<TransactionKind>(initial.kind);
  /* svelte-ignore state_referenced_locally */
  let accountId = $state(initial.accountId);
  /* svelte-ignore state_referenced_locally */
  let toAccountId = $state(initial.toAccountId);
  /* svelte-ignore state_referenced_locally */
  let categoryId = $state(initial.categoryId);
  /* svelte-ignore state_referenced_locally */
  let amount = $state(initial.amount);
  /* svelte-ignore state_referenced_locally */
  let date = $state(initial.date);
  /* svelte-ignore state_referenced_locally */
  let description = $state(initial.description);
  /* svelte-ignore state_referenced_locally */
  let pending = $state(initial.pending);
  let error = $state<string | null>(null);
  let amountError = $state<string | null>(null);

  const categoryOptions = $derived(categories.filter((category) => category.type === kind));

  function formatAmount() {
    const cents = parseBRLToCents(amount);
    if (cents !== null) amount = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function save(event: Event, addAnother: boolean) {
    event.preventDefault();
    error = null;
    amountError = null;
    const cents = parseBRLToCents(amount);
    if (cents === null || cents <= 0) {
      amountError = "Valor inválido. Exemplo: 80,50";
      return;
    }
    error = onsubmit(
      {
        kind,
        accountId: Number(accountId),
        toAccountId: Number(toAccountId),
        categoryId: Number(categoryId),
        amountCents: cents,
        date,
        description,
        pending,
      },
      addAnother,
    );
    if (error === null && addAnother) {
      amount = "";
      description = "";
    }
  }
</script>

<form class="grid gap-4" onsubmit={(event) => save(event, false)}>
  <SegmentedControl
    label="Tipo do lançamento"
    bind:value={kind}
    options={[
      { value: "expense", label: "Despesa" },
      { value: "income", label: "Receita" },
      { value: "transfer", label: "Transferência" },
    ]}
    onchange={() => (categoryId = "")}
  />
  <Field label="Valor (R$)" error={amountError}>
    {#snippet control(field)}
      <Input {...field} bind:value={amount} inputmode="decimal" placeholder="0,00" required onblur={formatAmount} />
    {/snippet}
  </Field>
  <div class="grid gap-4 sm:grid-cols-2">
    <Field label={kind === "transfer" ? "De" : "Conta"}>
      {#snippet control(field)}
        <NativeSelect {...field} bind:value={accountId} required>
          <option value="" disabled>Selecione</option>
          {#each accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
        </NativeSelect>
      {/snippet}
    </Field>
    {#if kind === "transfer"}
      <Field label="Para">
        {#snippet control(field)}
          <NativeSelect {...field} bind:value={toAccountId} required>
            <option value="" disabled>Selecione</option>
            {#each accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
          </NativeSelect>
        {/snippet}
      </Field>
    {:else}
      <Field label="Categoria">
        {#snippet control(field)}
          <NativeSelect {...field} bind:value={categoryId} required>
            <option value="" disabled>Selecione</option>
            {#each categoryOptions as category (category.id)}<option value={String(category.id)}>{category.label}</option>{/each}
          </NativeSelect>
        {/snippet}
      </Field>
    {/if}
  </div>
  <div class="grid gap-4 sm:grid-cols-2">
    <Field label="Data">
      {#snippet control(field)}<Input {...field} type="date" bind:value={date} required />{/snippet}
    </Field>
    <Field label="Descrição">
      {#snippet control(field)}<Input {...field} bind:value={description} placeholder="Opcional" />{/snippet}
    </Field>
  </div>
  {#if kind !== "transfer"}
    <Label class="font-normal"><Checkbox bind:checked={pending} /> Ainda não aconteceu (pendente)</Label>
  {/if}
  {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
  <div class="flex flex-wrap justify-end gap-2">
    <Button type="button" variant="ghost" onclick={oncancel}>Cancelar</Button>
    {#if !editing}
      <Button type="button" variant="outline" onclick={(event) => save(event, true)}>Salvar e adicionar outro</Button>
    {/if}
    <Button type="submit">Salvar</Button>
  </div>
</form>
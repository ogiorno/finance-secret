<script lang="ts" module>
  export type TransactionKind = "expense" | "income" | "transfer";

  export interface TransactionFormValues {
    kind: TransactionKind;
    accountId: number;
    toAccountId: number;
    /** Sem categoria, o lançamento fica em "Sem categoria". */
    categoryId: number | undefined;
    amountCents: number;
    date: string;
    description: string;
    pending: boolean;
    /** `undefined` = padrão do tipo da conta; `null` = sem método. */
    paymentMethod: PaymentMethod | null | undefined;
    isExtra: boolean;
    /** Só receita: `undefined` = fonte padrão; `null` = sem fonte. */
    sourceId: number | null | undefined;
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
    /** `auto` (padrão da conta), `none` (sem método) ou um método. */
    paymentMethod: string;
    isExtra: boolean;
    /** `auto` (fonte padrão), `none` (sem fonte) ou o id da fonte. */
    sourceId: string;
  }
</script>

<script lang="ts">
  import { isPaymentMethod, parseBRLToCents, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@finance/core";
  import type { Account, Category, IncomeSource } from "@finance/database";
  import { Alert, Button, Checkbox, Disclosure, Field, Input, Label, NativeSelect, SegmentedControl } from "@finance/ui";

  let {
    accounts,
    categories,
    sources = [],
    initial,
    editing = false,
    onsubmit,
    oncancel,
  }: {
    accounts: Account[];
    /** Fontes de renda ativas, para as receitas. */
    sources?: IncomeSource[];
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
  let categoryId = $state(categories.find((category) => String(category.id) === initial.categoryId)?.isSystem ? "" : initial.categoryId);
  /* svelte-ignore state_referenced_locally */
  let amount = $state(initial.amount);
  /* svelte-ignore state_referenced_locally */
  let date = $state(initial.date);
  /* svelte-ignore state_referenced_locally */
  let description = $state(initial.description);
  /* svelte-ignore state_referenced_locally */
  let pending = $state(initial.pending);
  /* svelte-ignore state_referenced_locally */
  let paymentMethod = $state(initial.paymentMethod);
  /* svelte-ignore state_referenced_locally */
  let isExtra = $state(initial.isExtra);
  /* svelte-ignore state_referenced_locally */
  let sourceId = $state(initial.sourceId);
  const today = new Date();
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // As opções avançadas já abrem quando o lançamento tem algo fora do padrão.
  /* svelte-ignore state_referenced_locally */
  let advancedOpen = $state(
    initial.date !== todayText || initial.description !== "" || initial.pending || initial.isExtra || initial.paymentMethod !== "auto" || initial.sourceId !== "auto",
  );
  let error = $state<string | null>(null);
  let amountError = $state<string | null>(null);

  const categoryOptions = $derived(categories.filter((category) => category.type === kind && !category.isSystem));

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
        categoryId: categoryId === "" ? undefined : Number(categoryId),
        amountCents: cents,
        date,
        description,
        pending,
        paymentMethod: paymentMethod === "auto" ? undefined : isPaymentMethod(paymentMethod) ? paymentMethod : null,
        isExtra: kind === "expense" && isExtra,
        sourceId: kind !== "income" || sourceId === "auto" ? undefined : sourceId === "none" ? null : Number(sourceId),
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
          <NativeSelect {...field} bind:value={categoryId}>
            <option value="">Sem categoria</option>
            {#each categoryOptions as category (category.id)}<option value={String(category.id)}>{category.label}</option>{/each}
          </NativeSelect>
        {/snippet}
      </Field>
    {/if}
  </div>
  {#if kind === "income" && sources.length > 1}
    <Field label="Fonte da renda">
      {#snippet control(field)}
        <NativeSelect {...field} bind:value={sourceId}>
          <option value="auto">Padrão (Eu)</option>
          {#each sources.filter((source) => !source.isDefault) as source (source.id)}<option value={String(source.id)}>{source.name}</option>{/each}
          <option value="none">Sem fonte</option>
        </NativeSelect>
      {/snippet}
    </Field>
  {/if}
  <Disclosure label="Opções avançadas" bind:open={advancedOpen}>
    <div class="grid gap-4 sm:grid-cols-2">
      <Field label="Data">
        {#snippet control(field)}<Input {...field} type="date" bind:value={date} required />{/snippet}
      </Field>
      <Field label="Descrição">
        {#snippet control(field)}<Input {...field} bind:value={description} placeholder="Opcional" />{/snippet}
      </Field>
    </div>
    {#if kind !== "transfer"}
      <Field label="Método de pagamento">
        {#snippet control(field)}
          <NativeSelect {...field} bind:value={paymentMethod}>
            <option value="auto">Automático (conforme a conta)</option>
            <option value="none">Sem método</option>
            {#each PAYMENT_METHODS as method (method)}<option value={method}>{PAYMENT_METHOD_LABELS[method]}</option>{/each}
          </NativeSelect>
        {/snippet}
      </Field>
      <Label class="font-normal"><Checkbox bind:checked={pending} /> Ainda não aconteceu (pendente)</Label>
    {/if}
    {#if kind === "expense"}
      <Label class="font-normal"><Checkbox bind:checked={isExtra} /> Despesa extra (imprevisto)</Label>
    {/if}
  </Disclosure>
  {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
  <div class="flex flex-wrap justify-end gap-2">
    <Button type="button" variant="ghost" onclick={oncancel}>Cancelar</Button>
    {#if !editing}
      <Button type="button" variant="outline" onclick={(event) => save(event, true)}>Salvar e adicionar outro</Button>
    {/if}
    <Button type="submit">Salvar</Button>
  </div>
</form>
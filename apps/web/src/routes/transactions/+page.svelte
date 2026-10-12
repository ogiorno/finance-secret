<script lang="ts">
  import { parseBRLToCents } from "@finance/core";
  import type { TransactionListItem } from "@finance/database";
  import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Dialog, Field, Input, Link, Money, MonthStepper, NativeSelect, PageHeader, SegmentedControl, toast } from "@finance/ui";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import TransactionTable from "$lib/TransactionTable.svelte";
  import { session } from "$lib/session.svelte";

  type Kind = "expense" | "income" | "transfer";
  const today = new Date();
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentMonth = todayText.slice(0, 7);
  const typeOptions = [
    { value: "expense", label: "Despesa" }, { value: "income", label: "Receita" }, { value: "transfer", label: "Transferência" },
  ];

  let dialogOpen = $state(false);
  let transactionForm: HTMLFormElement;
  let editing = $state<TransactionListItem | null>(null);
  let kind = $state<Kind>("expense");
  let accountId = $state("");
  let toAccountId = $state("");
  let categoryId = $state("");
  let amount = $state("");
  let date = $state(todayText);
  let description = $state("");
  let pending = $state(false);
  let error = $state<string | null>(null);
  let amountError = $state<string | null>(null);

  let search = $state("");
  let filterMonth = $state(currentMonth);
  let allMonths = $state(true);
  let filterAccount = $state("");
  let filterCategory = $state("");
  let filtersOpen = $state(false);
  let visibleLimit = $state(50);

  const data = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const categories = repo.listCategories();
    const byId = new Map(categories.map((c) => [c.id, c]));
    const matches = repo.listTransactions({
      month: allMonths ? undefined : filterMonth,
      accountId: filterAccount ? Number(filterAccount) : undefined,
      categoryId: filterCategory ? Number(filterCategory) : undefined,
      search: search || undefined,
      limit: visibleLimit + 1,
    });
    return {
      accounts: repo.listAccounts(),
      allAccounts: repo.listAccounts({ includeArchived: true }),
      categories: categories.map((c) => ({ ...c, label: c.parentId ? `${byId.get(c.parentId)?.name ?? ""} › ${c.name}` : c.name })),
      items: matches.slice(0, visibleLimit),
      hasMore: matches.length > visibleLimit,
    };
  });
  const categoryOptions = $derived(data?.categories.filter((c) => c.type === kind) ?? []);
  const formAccounts = $derived(data?.allAccounts.filter((a) => a.isActive || a.id === Number(accountId) || a.id === Number(toAccountId)) ?? []);
  const previewCents = $derived(parseBRLToCents(amount));
  const previewAccount = $derived(data?.allAccounts.find((a) => String(a.id) === accountId)?.name);
  const previewDestination = $derived(data?.allAccounts.find((a) => String(a.id) === toAccountId)?.name);
  const previewCategory = $derived(data?.categories.find((c) => String(c.id) === categoryId)?.label);

  function resetLimit() { visibleLimit = 50; }
  function clearFilters() { search = ""; allMonths = true; filterAccount = ""; filterCategory = ""; resetLimit(); }
  function formatAmount() {
    const cents = parseBRLToCents(amount);
    if (cents !== null) amount = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function openCreate() {
    editing = null; kind = "expense"; categoryId = ""; toAccountId = ""; amount = ""; date = todayText;
    description = ""; pending = false; error = null; amountError = null;
    dialogOpen = true;
  }
  function openEdit(item: TransactionListItem) {
    const repo = session.repo;
    if (!repo) return;
    editing = item;
    kind = item.type;
    accountId = String(item.accountId);
    toAccountId = "";
    if (item.transferGroupId !== null) {
      const legs = repo.listTransactions().filter((row) => row.transferGroupId === item.transferGroupId);
      accountId = String(legs.find((row) => row.amountCents < 0)?.accountId ?? item.accountId);
      toAccountId = String(legs.find((row) => row.amountCents > 0)?.accountId ?? "");
    }
    categoryId = item.categoryId === null ? "" : String(item.categoryId);
    amount = (Math.abs(item.amountCents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    date = item.date; description = item.description; pending = item.status === "pending";
    error = null; amountError = null; dialogOpen = true;
  }
  function submit(event: SubmitEvent) {
    event.preventDefault(); error = null; amountError = null;
    const cents = parseBRLToCents(amount);
    if (cents === null || cents <= 0) { amountError = "Informe um valor maior que zero. Ex.: 80,50"; transactionForm.querySelector<HTMLInputElement>('[inputmode="decimal"]')?.focus(); return; }
    if (kind === "transfer" && accountId === toAccountId) { error = "Escolha contas diferentes para a transferência."; return; }
    try {
      session.change((repo) => {
        if (kind === "transfer") {
          const input = { fromAccountId: Number(accountId), toAccountId: Number(toAccountId), amountCents: cents, date, description };
          if (editing) repo.updateTransaction(editing.id, input); else repo.addTransfer(input);
        } else {
          const input = { accountId: Number(accountId), categoryId: Number(categoryId), type: kind, amountCents: cents, date, description, status: pending ? "pending" as const : "posted" as const };
          if (editing) repo.updateTransaction(editing.id, input); else repo.addTransaction(input);
        }
      });
      dialogOpen = false;
      toast.show({ message: editing ? "Lançamento atualizado." : "Lançamento salvo.", tone: "success" });
    } catch (e) { error = e instanceof Error ? e.message : "Não foi possível salvar o lançamento."; }
  }
  function remove(item: TransactionListItem) { session.scheduleDelete(item); }
</script>

<svelte:head><title>Transações · Finanças</title></svelte:head>

<PageHeader title="Transações" description="Consulte, filtre e registre seus lançamentos.">
  {#snippet actions()}<Button onclick={openCreate} disabled={!data || data.accounts.length === 0}>Novo lançamento</Button>{/snippet}
</PageHeader>

{#if !data}
  <OpenDatabasePanel />
{:else if data.accounts.length === 0}
  <Card><CardContent>Crie uma conta em <Link href="/accounts">Contas</Link> antes de lançar.</CardContent></Card>
{:else}
  <Card>
    <CardHeader>
      <CardTitle>Lançamentos</CardTitle>
      <div class="grid gap-3 pt-2">
        <Field label="Buscar" hint="Descrição ou categoria">
          {#snippet control(field)}<Input {...field} type="search" bind:value={search} oninput={resetLimit} placeholder="Buscar lançamento" />{/snippet}
        </Field>
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="outline" onclick={() => (filtersOpen = !filtersOpen)} aria-expanded={filtersOpen}>Filtros</Button>
          {#if search || !allMonths || filterAccount || filterCategory}<Button variant="ghost" onclick={clearFilters}>Limpar filtros</Button>{/if}
          <span class="text-sm text-muted-foreground" role="status">{data.items.length}{data.hasMore ? "+" : ""} lançamento{data.items.length === 1 ? "" : "s"}</span>
        </div>
        {#if filtersOpen}
          <div class="grid gap-3 border-t pt-3 md:grid-cols-3">
            <div class="grid gap-2">
              <span class="text-sm font-medium">Período</span>
              <Button variant={allMonths ? "secondary" : "outline"} size="sm" onclick={() => { allMonths = true; resetLimit(); }}>Todos os meses</Button>
              <MonthStepper bind:value={filterMonth} onchange={() => { allMonths = false; resetLimit(); }} />
            </div>
            <Field label="Conta">
              {#snippet control(field)}
                <NativeSelect {...field} bind:value={filterAccount} onchange={resetLimit}>
                  <option value="">Todas as contas</option>
                  {#each data.allAccounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
                </NativeSelect>
              {/snippet}
            </Field>
            <Field label="Categoria">
              {#snippet control(field)}
                <NativeSelect {...field} bind:value={filterCategory} onchange={resetLimit}>
                  <option value="">Todas as categorias</option>
                  {#each data.categories as category (category.id)}<option value={String(category.id)}>{category.label}</option>{/each}
                </NativeSelect>
              {/snippet}
            </Field>
          </div>
        {/if}
        {#if !allMonths || filterAccount || filterCategory}
          <div class="flex flex-wrap gap-2" aria-label="Filtros ativos">
            {#if !allMonths}<Button variant="outline" size="sm" onclick={() => { allMonths = true; resetLimit(); }}>Mês: {filterMonth} ×</Button>{/if}
            {#if filterAccount}<Button variant="outline" size="sm" onclick={() => { filterAccount = ""; resetLimit(); }}>Conta: {data.allAccounts.find((a) => String(a.id) === filterAccount)?.name} ×</Button>{/if}
            {#if filterCategory}<Button variant="outline" size="sm" onclick={() => { filterCategory = ""; resetLimit(); }}>Categoria: {data.categories.find((c) => String(c.id) === filterCategory)?.name} ×</Button>{/if}
          </div>
        {/if}
      </div>
    </CardHeader>
    <CardContent class="px-0">
      <TransactionTable items={data.items} onEdit={openEdit} onDelete={remove} pendingDeleteId={session.pendingDeleteId} pendingDeleteGroupId={session.pendingDeleteGroupId} />
      {#if data.hasMore}<div class="flex justify-center px-4 pt-4"><Button variant="outline" onclick={() => (visibleLimit += 50)}>Carregar mais</Button></div>{/if}
    </CardContent>
  </Card>
{/if}

<Dialog bind:open={dialogOpen} title={editing ? "Editar lançamento" : "Novo lançamento"} description={editing?.type === "transfer" ? "As duas pontas da transferência serão atualizadas." : undefined}>
  <form bind:this={transactionForm} id="transaction-form" class="grid gap-3" onsubmit={submit}>
    {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
    <Field label="Valor (R$)" error={amountError}>
      {#snippet control(field)}<Input {...field} bind:value={amount} inputmode="decimal" placeholder="0,00" required onblur={formatAmount} />{/snippet}
    </Field>
    <div class="grid gap-1.5">
      <span class="text-sm font-medium">Tipo</span>
      <SegmentedControl label="Tipo do lançamento" options={editing ? typeOptions.filter((option) => editing?.type === "transfer" ? option.value === "transfer" : option.value !== "transfer") : typeOptions} bind:value={kind} onchange={() => (categoryId = "")} />
    </div>
    <Field label={kind === "transfer" ? "De" : "Conta"}>
      {#snippet control(field)}
        <NativeSelect {...field} bind:value={accountId} required>
          <option value="" disabled>Selecione</option>
          {#each formAccounts as account (account.id)}<option value={String(account.id)}>{account.name}{account.isActive ? "" : " (arquivada)"}</option>{/each}
        </NativeSelect>
      {/snippet}
    </Field>
    {#if kind === "transfer"}
      <Field label="Para">
        {#snippet control(field)}
          <NativeSelect {...field} bind:value={toAccountId} required>
            <option value="" disabled>Selecione</option>
            {#each formAccounts as account (account.id)}<option value={String(account.id)}>{account.name}{account.isActive ? "" : " (arquivada)"}</option>{/each}
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
    <Field label="Data">
      {#snippet control(field)}<Input {...field} type="date" bind:value={date} required />{/snippet}
    </Field>
    <Field label="Descrição">
      {#snippet control(field)}<Input {...field} bind:value={description} placeholder="Opcional" />{/snippet}
    </Field>
    {#if kind !== "transfer"}<label class="flex items-center gap-2 text-sm"><Checkbox bind:checked={pending} aria-label="Ainda não aconteceu" />Ainda não aconteceu (pendente)</label>{/if}
    {#if previewCents !== null && previewCents > 0}
      <Card class="gap-0 py-3" aria-label="Prévia do lançamento">
        <CardContent class="grid gap-1">
          <span class="text-sm text-muted-foreground">Prévia · ainda não salva</span>
          <strong class="text-xl"><Money cents={previewCents} tone={kind === "transfer" ? "neutral" : kind} /></strong>
          <span class="text-sm">
            {#if kind === "transfer"}
              Transferência{previewAccount ? ` de ${previewAccount}` : ""}{previewDestination ? ` para ${previewDestination}` : ""}
            {:else}
              {kind === "income" ? "Receita" : "Despesa"}{previewAccount ? ` · ${previewAccount}` : ""}{previewCategory ? ` · ${previewCategory}` : ""}
            {/if}
            {pending && kind !== "transfer" ? " · Pendente" : ""}
          </span>
        </CardContent>
      </Card>
    {/if}
  </form>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (dialogOpen = false)}>Cancelar</Button>
    <Button type="submit" form="transaction-form">{editing ? "Salvar alterações" : "Salvar"}</Button>
  {/snippet}
</Dialog>

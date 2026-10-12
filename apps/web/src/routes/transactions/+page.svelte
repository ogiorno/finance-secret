<script lang="ts">
  import { Plus, Search, X } from "@lucide/svelte";
  import { isPaymentMethod, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@finance/core";
  import type { TransactionListItem } from "@finance/database";
  import {
    Button,
    Card,
    CardContent,
    Checkbox,
    ConfirmDialog,
    Dialog,
    EmptyState,
    IconButton,
    Input,
    Label,
    Link,
    NativeSelect,
    PageHeader,
    formatBRL,
    toast,
  } from "@finance/ui";
  import { onDestroy } from "svelte";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { period } from "$lib/period.svelte";
  import { session } from "$lib/session.svelte";
  import TransactionDetail from "$lib/TransactionDetail.svelte";
  import TransactionForm, { type TransactionFormInitial, type TransactionFormValues } from "$lib/TransactionForm.svelte";
  import TransactionList from "$lib/TransactionList.svelte";

  const PAGE_SIZE = 100;

  const today = new Date();
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  /** Última conta usada: o próximo lançamento já vem com ela. */
  let lastAccount = "";

  let filterAccount = $state("");
  let filterCategory = $state("");
  let filterMethod = $state("");
  let filterSource = $state("");
  let onlyExtra = $state(false);
  let search = $state("");
  let limit = $state(PAGE_SIZE);

  let formOpen = $state(false);
  let detailOpen = $state(false);
  let detail = $state<TransactionListItem | null>(null);
  let editing = $state<TransactionListItem | null>(null);
  let formInitial = $state<TransactionFormInitial>(blank());

  // Exclusões aguardam alguns segundos para o "Desfazer"; até lá a linha fica escondida.
  let pendingDeletes = $state<Record<string, TransactionListItem>>({});

  const deleteKey = (item: TransactionListItem) => (item.transferGroupId !== null ? `g${item.transferGroupId}` : `t${item.id}`);

  const data = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const categories = repo.listCategories();
    const byId = new Map(categories.map((category) => [category.id, category]));
    const found = repo.listTransactions({
      month: period.month,
      accountId: filterAccount ? Number(filterAccount) : undefined,
      categoryId: filterCategory ? Number(filterCategory) : undefined,
      paymentMethod: isPaymentMethod(filterMethod) ? filterMethod : undefined,
      sourceId: filterSource ? Number(filterSource) : undefined,
      onlyExtra: onlyExtra || undefined,
      search: search || undefined,
      limit: limit + 1,
    });
    return {
      sources: repo.listIncomeSources(),
      accounts: repo.listAccounts(),
      categories: categories.map((category) => ({
        ...category,
        label: category.isSystem
          ? `${category.name} (${category.type === "expense" ? "despesa" : "receita"})`
          : category.parentId
            ? `${byId.get(category.parentId)?.name ?? ""} › ${category.name}`
            : category.name,
      })),
      items: found.slice(0, limit),
      hasMore: found.length > limit,
    };
  });

  const visible = $derived(data?.items.filter((item) => !(deleteKey(item) in pendingDeletes)) ?? []);
  const hasFilters = $derived(filterAccount !== "" || filterCategory !== "" || filterMethod !== "" || filterSource !== "" || onlyExtra || search !== "");

  function blank(): TransactionFormInitial {
    return {
      kind: "expense",
      accountId: lastAccount,
      toAccountId: "",
      categoryId: "",
      amount: "",
      date: todayText,
      description: "",
      pending: false,
      paymentMethod: "auto",
      isExtra: false,
      sourceId: "auto",
    };
  }

  function openNew() {
    editing = null;
    formInitial = blank();
    formOpen = true;
  }

  function openDetail(item: TransactionListItem) {
    detail = item;
    detailOpen = true;
  }

  function openEdit(item: TransactionListItem) {
    const repo = session.repo;
    if (!repo) return;
    let initial: TransactionFormInitial;
    if (item.type === "transfer") {
      const legs = repo.listTransactions({ limit: 100000 }).filter((leg) => leg.transferGroupId === item.transferGroupId);
      const out = legs.find((leg) => leg.amountCents < 0);
      const into = legs.find((leg) => leg.amountCents > 0);
      initial = {
        kind: "transfer",
        accountId: String(out?.accountId ?? ""),
        toAccountId: String(into?.accountId ?? ""),
        categoryId: "",
        amount: (Math.abs(item.amountCents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        date: item.date,
        description: item.description,
        pending: false,
        paymentMethod: "auto",
        isExtra: false,
        sourceId: "auto",
      };
    } else {
      initial = {
        kind: item.type,
        accountId: String(item.accountId),
        toAccountId: "",
        categoryId: String(item.categoryId ?? ""),
        amount: (item.amountCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        date: item.date,
        description: item.description,
        pending: item.status === "pending",
        paymentMethod: item.paymentMethod ?? "none",
        isExtra: item.isExtra,
        sourceId: item.type !== "income" ? "auto" : item.sourceId === null ? "none" : String(item.sourceId),
      };
    }
    editing = item;
    formInitial = initial;
    formOpen = true;
  }

  function save(values: TransactionFormValues, addAnother: boolean): string | null {
    try {
      session.change((repo) => {
        if (values.kind === "transfer") {
          const transfer = {
            fromAccountId: values.accountId,
            toAccountId: values.toAccountId,
            amountCents: values.amountCents,
            date: values.date,
            description: values.description,
          };
          if (editing) repo.updateTransaction(editing.id, transfer);
          else repo.addTransfer(transfer);
        } else {
          const entry = {
            accountId: values.accountId,
            categoryId: values.categoryId,
            type: values.kind,
            amountCents: values.amountCents,
            date: values.date,
            description: values.description,
            status: values.pending ? ("pending" as const) : ("posted" as const),
            paymentMethod: values.paymentMethod,
            isExtra: values.isExtra,
            sourceId: values.sourceId,
          };
          if (editing) repo.updateTransaction(editing.id, entry);
          else repo.addTransaction(entry);
        }
      });
    } catch (error) {
      return error instanceof Error ? error.message : "Não foi possível salvar o lançamento.";
    }
    lastAccount = String(values.accountId);
    toast.show({ message: editing ? "Lançamento atualizado" : "Lançamento salvo", tone: "success" });
    if (!addAnother) formOpen = false;
    else formInitial = { ...blank(), kind: values.kind, accountId: String(values.accountId), date: values.date };
    return null;
  }

  function commitDelete(key: string, item: TransactionListItem) {
    if (!(key in pendingDeletes)) return;
    const { [key]: _removed, ...rest } = pendingDeletes;
    pendingDeletes = rest;
    session.change((repo) => repo.deleteTransaction(item.id));
  }

  // Excluir sempre pede confirmação; depois dela ainda há alguns segundos para desfazer.
  let confirmOpen = $state(false);
  let confirming = $state<TransactionListItem | null>(null);

  function askDelete(item: TransactionListItem) {
    confirming = item;
    confirmOpen = true;
  }

  function confirmDelete() {
    if (confirming) remove(confirming);
    confirming = null;
  }

  function remove(item: TransactionListItem) {
    const key = deleteKey(item);
    pendingDeletes = { ...pendingDeletes, [key]: item };
    toast.show({
      message: item.type === "transfer" ? "Transferência excluída (as duas pontas)" : "Lançamento excluído",
      duration: 5000,
      action: { label: "Desfazer", onclick: () => undefined },
      onclose: (reason) => {
        if (reason === "action") {
          const { [key]: _restored, ...rest } = pendingDeletes;
          pendingDeletes = rest;
        } else commitDelete(key, item);
      },
    });
  }

  // Ao sair da tela, o que está esperando o "Desfazer" é gravado de uma vez.
  onDestroy(() => {
    for (const [key, item] of Object.entries(pendingDeletes)) commitDelete(key, item);
  });

  function clearFilters() {
    filterAccount = "";
    filterCategory = "";
    filterMethod = "";
    filterSource = "";
    onlyExtra = false;
    search = "";
    limit = PAGE_SIZE;
  }
</script>

<svelte:head><title>Lançamentos · Finanças</title></svelte:head>

{#if !data}
  <PageHeader title="Lançamentos" />
  <OpenDatabasePanel />
{:else if data.accounts.length === 0}
  <PageHeader title="Lançamentos" />
  <Card><CardContent>Crie uma conta em <Link href="/accounts">Contas</Link> antes de lançar.</CardContent></Card>
{:else}
  <PageHeader title="Lançamentos" description="Tudo o que entrou e saiu no mês.">
    {#snippet actions()}
      <Button onclick={openNew}><Plus aria-hidden="true" />Novo lançamento</Button>
    {/snippet}
  </PageHeader>

  <div class="mb-4 flex flex-wrap items-center gap-2">
    <div class="relative min-w-52 flex-1">
      <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input class="pl-9" placeholder="Buscar" aria-label="Buscar lançamentos" bind:value={search} oninput={() => (limit = PAGE_SIZE)} />
    </div>
    <NativeSelect class="w-44" aria-label="Filtrar por conta" bind:value={filterAccount} onchange={() => (limit = PAGE_SIZE)}>
      <option value="">Todas as contas</option>
      {#each data.accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
    </NativeSelect>
    <NativeSelect class="w-52" aria-label="Filtrar por categoria" bind:value={filterCategory} onchange={() => (limit = PAGE_SIZE)}>
      <option value="">Todas as categorias</option>
      {#each data.categories as category (category.id)}<option value={String(category.id)}>{category.label}</option>{/each}
    </NativeSelect>
    <NativeSelect class="w-44" aria-label="Filtrar por método de pagamento" bind:value={filterMethod} onchange={() => (limit = PAGE_SIZE)}>
      <option value="">Todos os métodos</option>
      {#each PAYMENT_METHODS as method (method)}<option value={method}>{PAYMENT_METHOD_LABELS[method]}</option>{/each}
    </NativeSelect>
    {#if data.sources.length > 1}
      <NativeSelect class="w-44" aria-label="Filtrar por fonte de renda" bind:value={filterSource} onchange={() => (limit = PAGE_SIZE)}>
        <option value="">Todas as fontes</option>
        {#each data.sources as source (source.id)}<option value={String(source.id)}>{source.name}</option>{/each}
      </NativeSelect>
    {/if}
    <Label class="font-normal"><Checkbox bind:checked={onlyExtra} onCheckedChange={() => (limit = PAGE_SIZE)} /> Só extras</Label>
    {#if hasFilters}<IconButton icon={X} label="Limpar filtros" onclick={clearFilters} />{/if}
  </div>

  <Card>
    <CardContent class="px-0">
      {#if visible.length === 0 && hasFilters}
        <EmptyState title="Nada encontrado." description="Nenhum lançamento combina com os filtros deste mês." />
      {:else}
        <TransactionList items={visible} onOpen={openDetail} onEdit={openEdit} onDelete={askDelete} emptyTitle="Nada lançado neste mês." />
      {/if}
      {#if data.hasMore}
        <div class="flex justify-center px-5 pt-4"><Button variant="outline" onclick={() => (limit += PAGE_SIZE)}>Carregar mais</Button></div>
      {/if}
    </CardContent>
  </Card>

  <TransactionDetail bind:open={detailOpen} item={detail} onEdit={openEdit} onDelete={askDelete} />

  <ConfirmDialog
    bind:open={confirmOpen}
    title={confirming?.type === "transfer" ? "Excluir esta transferência?" : "Excluir este lançamento?"}
    description={confirming
      ? confirming.type === "transfer"
        ? `${confirming.description || "Transferência"}: as duas pontas serão apagadas e os saldos das duas contas voltam ao que eram.`
        : `${confirming.description || confirming.categoryName || "Lançamento"} de ${formatBRL(confirming.amountCents)} em ${confirming.accountName} será apagado e o saldo da conta volta ao que era.`
      : undefined}
    confirmLabel="Excluir"
    destructive
    onconfirm={confirmDelete}
  />

  <Dialog bind:open={formOpen} title={editing ? "Editar lançamento" : "Novo lançamento"}>
    {#key `${editing?.id ?? "new"}-${formOpen}`}
      <TransactionForm
        accounts={data.accounts}
        categories={data.categories}
        sources={data.sources}
        initial={formInitial}
        editing={editing !== null}
        onsubmit={save}
        oncancel={() => (formOpen = false)}
      />
    {/key}
  </Dialog>
{/if}
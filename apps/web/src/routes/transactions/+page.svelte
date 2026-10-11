<script lang="ts">
  import { parseBRLToCents } from "@finance/core";
  import type { TransactionListItem } from "@finance/database";
  import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, NativeSelect } from "@finance/ui";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import TransactionTable from "$lib/TransactionTable.svelte";
  import { session } from "$lib/session.svelte";

  type Kind = "expense" | "income" | "transfer";

  const today = new Date();
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  let kind = $state<Kind>("expense");
  let accountId = $state("");
  let toAccountId = $state("");
  let categoryId = $state("");
  let amount = $state("");
  let date = $state(todayText);
  let description = $state("");
  let pending = $state(false);
  let error = $state<string | null>(null);
  let saved = $state(false);

  let filterMonth = $state("");
  let filterAccount = $state("");

  const data = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const categories = repo.listCategories();
    const byId = new Map(categories.map((c) => [c.id, c]));
    return {
      accounts: repo.listAccounts(),
      categories: categories.map((c) => ({
        ...c,
        label: c.parentId ? `${byId.get(c.parentId)?.name ?? ""} › ${c.name}` : c.name,
      })),
      items: repo.listTransactions({
        month: filterMonth || undefined,
        accountId: filterAccount ? Number(filterAccount) : undefined,
        limit: 200,
      }),
    };
  });

  const categoryOptions = $derived(data?.categories.filter((c) => c.type === kind) ?? []);

  function submit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    saved = false;
    const cents = parseBRLToCents(amount);
    if (cents === null) {
      error = "Valor inválido. Exemplo: 80,50";
      return;
    }
    try {
      session.change((repo) => {
        if (kind === "transfer") {
          repo.addTransfer({ fromAccountId: Number(accountId), toAccountId: Number(toAccountId), amountCents: cents, date, description });
        } else {
          repo.addTransaction({
            accountId: Number(accountId),
            categoryId: Number(categoryId),
            type: kind,
            amountCents: cents,
            date,
            description,
            status: pending ? "pending" : "posted",
          });
        }
      });
      amount = "";
      description = "";
      saved = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "Não foi possível salvar o lançamento.";
    }
  }

  function remove(item: TransactionListItem) {
    const what = item.type === "transfer" ? "esta transferência (as duas pontas)" : "este lançamento";
    if (confirm(`Excluir ${what}?`)) session.change((repo) => repo.deleteTransaction(item.id));
  }
</script>

<svelte:head><title>Transações · Finanças</title></svelte:head>

<h1 class="mb-6 text-2xl font-semibold">Transações</h1>

{#if !data}
  <OpenDatabasePanel />
{:else if data.accounts.length === 0}
  <Card><CardContent>Crie uma conta em <a class="font-medium text-primary underline" href="/accounts">Contas</a> antes de lançar.</CardContent></Card>
{:else}
  <Card class="mb-4">
    <CardHeader><CardTitle>Novo lançamento</CardTitle></CardHeader>
    <CardContent>
      <form class="grid grid-cols-1 gap-3 md:grid-cols-3" onsubmit={submit}>
        <div class="grid gap-1.5">
          <Label for="kind">Tipo</Label>
          <NativeSelect id="kind" bind:value={kind} onchange={() => (categoryId = "")}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
            <option value="transfer">Transferência</option>
          </NativeSelect>
        </div>
        <div class="grid gap-1.5">
          <Label for="account">{kind === "transfer" ? "De" : "Conta"}</Label>
          <NativeSelect id="account" bind:value={accountId} required>
            <option value="" disabled>Selecione</option>
            {#each data.accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
          </NativeSelect>
        </div>
        {#if kind === "transfer"}
          <div class="grid gap-1.5">
            <Label for="to-account">Para</Label>
            <NativeSelect id="to-account" bind:value={toAccountId} required>
              <option value="" disabled>Selecione</option>
              {#each data.accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
            </NativeSelect>
          </div>
        {:else}
          <div class="grid gap-1.5">
            <Label for="category">Categoria</Label>
            <NativeSelect id="category" bind:value={categoryId} required>
              <option value="" disabled>Selecione</option>
              {#each categoryOptions as category (category.id)}<option value={String(category.id)}>{category.label}</option>{/each}
            </NativeSelect>
          </div>
        {/if}
        <div class="grid gap-1.5">
          <Label for="amount">Valor (R$)</Label>
          <Input id="amount" bind:value={amount} inputmode="decimal" placeholder="0,00" required />
        </div>
        <div class="grid gap-1.5">
          <Label for="date">Data</Label>
          <Input id="date" type="date" bind:value={date} required />
        </div>
        <div class="grid gap-1.5">
          <Label for="description">Descrição</Label>
          <Input id="description" bind:value={description} placeholder="Opcional" />
        </div>
        <div class="flex items-center gap-4 md:col-span-3">
          {#if kind !== "transfer"}
            <Label class="font-normal"><input type="checkbox" bind:checked={pending} /> Ainda não aconteceu (pendente)</Label>
          {/if}
          <Button type="submit" class="ml-auto">Salvar</Button>
        </div>
      </form>
      {#if error}<Alert variant="destructive" role="alert" class="mt-3">{error}</Alert>{/if}
      {#if saved}<Alert variant="success" class="mt-3">Lançamento salvo.</Alert>{/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Lançamentos</CardTitle>
      <div class="flex flex-wrap gap-3 pt-2">
        <div class="grid gap-1.5">
          <Label for="filter-month">Mês</Label>
          <Input id="filter-month" type="month" bind:value={filterMonth} class="w-44" />
        </div>
        <div class="grid gap-1.5">
          <Label for="filter-account">Conta</Label>
          <NativeSelect id="filter-account" bind:value={filterAccount} class="w-48">
            <option value="">Todas</option>
            {#each data.accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
          </NativeSelect>
        </div>
      </div>
    </CardHeader>
    <CardContent class="px-0"><TransactionTable items={data.items} onDelete={remove} /></CardContent>
  </Card>
{/if}

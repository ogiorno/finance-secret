<script lang="ts">
  import { parseBRLToCents } from "@finance/core";
  import type { TransactionListItem } from "@finance/database";
  import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Label, Link, NativeSelect, PageHeader } from "@finance/ui";
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

<PageHeader title="Transações" />

{#if !data}
  <OpenDatabasePanel />
{:else if data.accounts.length === 0}
  <Card><CardContent>Crie uma conta em <Link href="/accounts">Contas</Link> antes de lançar.</CardContent></Card>
{:else}
  <Card class="mb-4">
    <CardHeader><CardTitle>Novo lançamento</CardTitle></CardHeader>
    <CardContent>
      <form class="grid grid-cols-1 gap-3 md:grid-cols-3" onsubmit={submit}>
        <Field label="Tipo">
          {#snippet control(field)}
            <NativeSelect {...field} bind:value={kind} onchange={() => (categoryId = "")}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
            <option value="transfer">Transferência</option>
          </NativeSelect>
          {/snippet}
        </Field>
        <Field label={kind === "transfer" ? "De" : "Conta"}>
          {#snippet control(field)}
            <NativeSelect {...field} bind:value={accountId} required>
            <option value="" disabled>Selecione</option>
            {#each data.accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
          </NativeSelect>
          {/snippet}
        </Field>
        {#if kind === "transfer"}
          <Field label="Para">
            {#snippet control(field)}
              <NativeSelect {...field} bind:value={toAccountId} required>
              <option value="" disabled>Selecione</option>
              {#each data.accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
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
        <Field label="Valor (R$)">
          {#snippet control(field)}
            <Input {...field} bind:value={amount} inputmode="decimal" placeholder="0,00" required />
          {/snippet}
        </Field>
        <Field label="Data">
          {#snippet control(field)}
            <Input {...field} type="date" bind:value={date} required />
          {/snippet}
        </Field>
        <Field label="Descrição">
          {#snippet control(field)}
            <Input {...field} bind:value={description} placeholder="Opcional" />
          {/snippet}
        </Field>
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
        <Field label="Mês">
          {#snippet control(field)}
            <Input {...field} type="month" bind:value={filterMonth} class="w-44" />
          {/snippet}
        </Field>
        <Field label="Conta">
          {#snippet control(field)}
            <NativeSelect {...field} bind:value={filterAccount} class="w-48">
            <option value="">Todas</option>
            {#each data.accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
          </NativeSelect>
          {/snippet}
        </Field>
      </div>
    </CardHeader>
    <CardContent class="px-0"><TransactionTable items={data.items} onDelete={remove} /></CardContent>
  </Card>
{/if}

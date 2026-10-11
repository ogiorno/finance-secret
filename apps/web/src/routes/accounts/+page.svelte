<script lang="ts">
  import type { AccountType } from "@finance/database";
  import { parseBRLToCents } from "@finance/core";
  import {
    Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Money, NativeSelect,
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  } from "@finance/ui";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { session } from "$lib/session.svelte";

  const typeLabels: Record<AccountType, string> = {
    checking: "Conta corrente",
    savings: "Poupança",
    cash: "Dinheiro",
    wallet: "Carteira",
    credit_card: "Cartão de crédito",
    loan: "Empréstimo",
  };

  let name = $state("");
  let type = $state<AccountType>("checking");
  let opening = $state("");
  let error = $state<string | null>(null);

  const accounts = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    return repo ? repo.listAccounts().map((account) => ({ ...account, balance: repo.getBalance(account.id) })) : null;
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    const openingText = opening.trim().replace(/^-/, "");
    const cents = openingText === "" ? 0 : parseBRLToCents(openingText);
    if (cents === null) {
      error = "Saldo inicial inválido. Exemplo: 1.250,00";
      return;
    }
    // Cartão e empréstimo começam devendo: o saldo inicial informado vira negativo.
    const signed = type === "credit_card" || type === "loan" ? -cents : opening.trim().startsWith("-") ? -cents : cents;
    try {
      session.change((repo) => repo.createAccount({ name: name.trim(), type, openingBalanceCents: signed }));
      name = "";
      opening = "";
    } catch (e) {
      error = e instanceof Error ? e.message : "Não foi possível criar a conta.";
    }
  }
</script>

<svelte:head><title>Contas · Finanças</title></svelte:head>

<h1 class="mb-6 text-2xl font-semibold">Contas</h1>

{#if !accounts}
  <OpenDatabasePanel />
{:else}
  <Card class="mb-4">
    <CardHeader><CardTitle>Nova conta</CardTitle></CardHeader>
    <CardContent>
      <form class="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end" onsubmit={submit}>
        <div class="grid gap-1.5">
          <Label for="account-name">Nome</Label>
          <Input id="account-name" bind:value={name} required placeholder="Ex.: Nubank" />
        </div>
        <div class="grid gap-1.5">
          <Label for="account-type">Tipo</Label>
          <NativeSelect id="account-type" bind:value={type}>
            {#each Object.entries(typeLabels) as [value, label] (value)}
              <option {value}>{label}</option>
            {/each}
          </NativeSelect>
        </div>
        <div class="grid gap-1.5">
          <Label for="account-opening">{type === "credit_card" || type === "loan" ? "Valor devido hoje" : "Saldo inicial"}</Label>
          <Input id="account-opening" bind:value={opening} inputmode="decimal" placeholder="0,00" />
        </div>
        <Button type="submit">Criar conta</Button>
      </form>
      {#if error}<Alert variant="destructive" role="alert" class="mt-3">{error}</Alert>{/if}
    </CardContent>
  </Card>

  <Card>
    <CardContent class="px-0">
      {#if accounts.length === 0}
        <p class="px-5 py-6 text-sm text-muted-foreground">Nenhuma conta ainda.</p>
      {:else}
        <Table>
          <TableHeader>
            <TableRow><TableHead>Conta</TableHead><TableHead>Tipo</TableHead><TableHead class="text-right">Saldo</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {#each accounts as account (account.id)}
              <TableRow>
                <TableCell>{account.name}</TableCell>
                <TableCell>{typeLabels[account.type]}</TableCell>
                <TableCell class="text-right"><Money cents={account.balance} /></TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </CardContent>
  </Card>
{/if}

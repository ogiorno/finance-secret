<script lang="ts">
  import type { Account, AccountType } from "@finance/database";
  import { parseBRLToCents } from "@finance/core";
  import { Alert, Badge, Button, Card, CardContent, ConfirmDialog, Dialog, EmptyState, Field, Input, Money, NativeSelect, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@finance/ui";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { session } from "$lib/session.svelte";

  const typeLabels: Record<AccountType, string> = {
    checking: "Conta corrente", savings: "Poupança", cash: "Dinheiro", wallet: "Carteira", credit_card: "Cartão de crédito", loan: "Empréstimo",
  };
  type AccountView = Account & { balance: number };
  let dialogOpen = $state(false);
  let editing = $state<AccountView | null>(null);
  let archiveTarget = $state<AccountView | null>(null);
  let archiveOpen = $state(false);
  let name = $state("");
  let type = $state<AccountType>("checking");
  let opening = $state("");
  let error = $state<string | null>(null);

  const accounts = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    return repo ? repo.listAccounts({ includeArchived: true }).map((account) => ({ ...account, balance: repo.getBalance(account.id) })) : null;
  });
  const activeAccounts = $derived(accounts?.filter((account) => account.isActive) ?? []);
  const archivedAccounts = $derived(accounts?.filter((account) => !account.isActive) ?? []);

  function openCreate() { editing = null; name = ""; type = "checking"; opening = ""; error = null; dialogOpen = true; }
  function openEdit(account: AccountView) { editing = account; name = account.name; error = null; dialogOpen = true; }
  function submit(event: SubmitEvent) {
    event.preventDefault(); error = null;
    try {
      if (editing) {
        session.change((repo) => repo.renameAccount(editing!.id, name));
        toast.show({ message: "Conta renomeada.", tone: "success" });
      } else {
        const openingText = opening.trim().replace(/^-/, "");
        const cents = openingText === "" ? 0 : parseBRLToCents(openingText);
        if (cents === null) { error = "Saldo inicial inválido. Exemplo: 1.250,00"; return; }
        const signed = type === "credit_card" || type === "loan" ? -cents : opening.trim().startsWith("-") ? -cents : cents;
        session.change((repo) => repo.createAccount({ name: name.trim(), type, openingBalanceCents: signed }));
        toast.show({ message: "Conta criada.", tone: "success" });
      }
      dialogOpen = false;
    } catch (e) { error = e instanceof Error ? e.message : "Não foi possível salvar a conta."; }
  }
  function archive() {
    if (!archiveTarget) return;
    try {
      session.change((repo) => repo.setAccountActive(archiveTarget!.id, false));
      toast.show({ message: "Conta arquivada. Ela saiu do saldo total.", tone: "success" });
    } catch (e) { toast.show({ message: e instanceof Error ? e.message : "Não foi possível arquivar.", tone: "destructive", duration: 0 }); }
    archiveTarget = null;
    archiveOpen = false;
  }
  function reactivate(account: AccountView) {
    try {
      session.change((repo) => repo.setAccountActive(account.id, true));
      toast.show({ message: "Conta reativada.", tone: "success" });
    } catch (e) { toast.show({ message: e instanceof Error ? e.message : "Não foi possível reativar.", tone: "destructive", duration: 0 }); }
  }
</script>

<svelte:head><title>Contas · Finanças</title></svelte:head>
<PageHeader title="Contas" description="Acompanhe saldos e organize suas contas.">
  {#snippet actions()}<Button onclick={openCreate} disabled={!accounts}>Nova conta</Button>{/snippet}
</PageHeader>

{#if !accounts}
  <OpenDatabasePanel />
{:else}
  <Card>
    <CardContent class="px-0">
      {#if activeAccounts.length === 0}
        <EmptyState title="Nenhuma conta ativa." description="Crie uma conta ou reative uma conta arquivada." />
      {:else}
        <div class="grid gap-2 px-4 md:hidden">
          {#each activeAccounts as account (account.id)}
            <Card class="gap-2 px-4 py-3">
              <div class="flex items-start justify-between gap-3"><div><div class="font-medium">{account.name}</div><div class="text-xs text-muted-foreground">{typeLabels[account.type]}</div></div><Money cents={account.balance} /></div>
              <div class="flex justify-end gap-1"><Button variant="ghost" size="sm" onclick={() => openEdit(account)}>Renomear</Button><Button variant="ghost" size="sm" onclick={() => (archiveTarget = account, archiveOpen = true)}>Arquivar</Button></div>
            </Card>
          {/each}
        </div>
        <div class="hidden md:block"><Table><TableHeader><TableRow><TableHead>Conta</TableHead><TableHead>Tipo</TableHead><TableHead class="text-right">Saldo</TableHead><TableHead><span class="sr-only">Ações</span></TableHead></TableRow></TableHeader><TableBody>
          {#each activeAccounts as account (account.id)}
            <TableRow><TableCell>{account.name}</TableCell><TableCell>{typeLabels[account.type]}</TableCell><TableCell class="text-right"><Money cents={account.balance} /></TableCell><TableCell class="text-right"><Button variant="ghost" size="sm" onclick={() => openEdit(account)}>Renomear</Button><Button variant="ghost" size="sm" onclick={() => (archiveTarget = account, archiveOpen = true)}>Arquivar</Button></TableCell></TableRow>
          {/each}
        </TableBody></Table></div>
      {/if}
    </CardContent>
  </Card>
  {#if archivedAccounts.length > 0}
    <Card class="mt-4"><CardContent>
      <h2 class="text-section-title font-semibold">Arquivadas</h2>
      <p class="text-sm text-muted-foreground">O histórico permanece. O saldo destas contas não entra no total do painel.</p>
      <div class="grid gap-2">
        {#each archivedAccounts as account (account.id)}
          <div class="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><div><strong>{account.name}</strong> <Badge variant="secondary">Arquivada</Badge><div class="text-sm text-muted-foreground">{typeLabels[account.type]} · <Money cents={account.balance} /></div></div><Button variant="outline" onclick={() => reactivate(account)}>Reativar</Button></div>
        {/each}
      </div>
    </CardContent></Card>
  {/if}
{/if}

<Dialog bind:open={dialogOpen} title={editing ? "Renomear conta" : "Nova conta"}>
  <form id="account-form" class="grid gap-3" onsubmit={submit}>
    {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
    <Field label="Nome">{#snippet control(field)}<Input {...field} bind:value={name} required placeholder="Ex.: Nubank" />{/snippet}</Field>
    {#if !editing}
      <Field label="Tipo">{#snippet control(field)}<NativeSelect {...field} bind:value={type}>{#each Object.entries(typeLabels) as [value, label] (value)}<option {value}>{label}</option>{/each}</NativeSelect>{/snippet}</Field>
      <Field label={type === "credit_card" || type === "loan" ? "Valor devido hoje" : "Saldo inicial"}>{#snippet control(field)}<Input {...field} bind:value={opening} inputmode="decimal" placeholder="0,00" />{/snippet}</Field>
    {/if}
  </form>
  {#snippet footer()}<Button variant="outline" onclick={() => (dialogOpen = false)}>Cancelar</Button><Button type="submit" form="account-form">{editing ? "Salvar nome" : "Criar conta"}</Button>{/snippet}
</Dialog>
<ConfirmDialog bind:open={archiveOpen} title="Arquivar conta?" description="O histórico será mantido, mas o saldo desta conta deixará de compor o saldo total do painel. Você poderá reativá-la." confirmLabel="Arquivar conta" destructive onconfirm={archive} />

<script lang="ts">
  import { Archive, ArchiveRestore, Pencil, Plus, Trash } from "@lucide/svelte";
  import { parseBRLToCents } from "@finance/core";
  import type { Account } from "@finance/database";
  import {
    Alert,
    Button,
    Card,
    CardContent,
    Checkbox,
    ConfirmDialog,
    Dialog,
    EmptyState,
    Field,
    IconButton,
    IconChip,
    Input,
    Label,
    Money,
    NativeSelect,
    PageHeader,
    toast,
  } from "@finance/ui";
  import { accountTypeStyle } from "$lib/category-style";
  import { todayLocal } from "$lib/local-date";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { session } from "$lib/session.svelte";

  let showArchived = $state(false);

  const data = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const types = repo.listAccountTypes();
    const typeByKey = new Map(repo.listAccountTypes({ includeArchived: true }).map((type) => [type.key, type]));
    const accounts = repo.listAccounts({ includeArchived: showArchived }).map((account) => {
      const type = typeByKey.get(account.type);
      return {
        ...account,
        balance: repo.getBalance(account.id),
        typeName: type?.name ?? account.type,
        isLiability: type?.isLiability ?? false,
        invoice: type?.hasClosingDay ? repo.getCardInvoice(account.id, todayLocal()) : null,
      };
    });
    return { types, typeByKey, accounts, archivedCount: repo.listAccounts({ includeArchived: true }).length - repo.listAccounts().length };
  });

  let createOpen = $state(false);
  let name = $state("");
  let type = $state("checking");
  let opening = $state("");
  let closingDay = $state("1");
  let error = $state<string | null>(null);

  let renaming = $state<Account | null>(null);
  let renameOpen = $state(false);
  let renameValue = $state("");
  let renameClosingDay = $state("1");
  let deleting = $state<Account | null>(null);
  let confirmOpen = $state(false);

  const creatingLiability = $derived(data?.typeByKey.get(type)?.isLiability ?? false);
  const creatingCard = $derived(data?.typeByKey.get(type)?.hasClosingDay ?? false);

  function openCreate() {
    name = "";
    type = "checking";
    opening = "";
    closingDay = "1";
    error = null;
    createOpen = true;
  }

  function create(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    const openingText = opening.trim().replace(/^-/, "");
    const cents = openingText === "" ? 0 : parseBRLToCents(openingText);
    if (cents === null) {
      error = "Saldo inicial inválido. Exemplo: 1.250,00";
      return;
    }
    // Dívidas (cartão, empréstimo) começam devendo: o valor informado vira negativo.
    const signed = creatingLiability ? -cents : opening.trim().startsWith("-") ? -cents : cents;
    try {
      session.change((repo) =>
        repo.createAccount({ name: name.trim(), type, openingBalanceCents: signed, closingDay: creatingCard ? Number(closingDay) : undefined }),
      );
      createOpen = false;
      toast.show({ message: "Conta criada", tone: "success" });
    } catch (e) {
      error = e instanceof Error ? e.message : "Não foi possível criar a conta.";
    }
  }

  function startRename(account: Account) {
    renaming = account;
    renameValue = account.name;
    renameClosingDay = String(account.closingDay ?? 1);
    renameOpen = true;
  }

  function rename(event: SubmitEvent) {
    event.preventDefault();
    if (!renaming) return;
    const target = renaming;
    try {
      session.change((repo) => {
        repo.renameAccount(target.id, renameValue);
        if (target.closingDay !== null && Number(renameClosingDay) !== target.closingDay) repo.setAccountClosingDay(target.id, Number(renameClosingDay));
      });
      renameOpen = false;
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : "Não foi possível renomear.", tone: "destructive", duration: 0 });
    }
  }

  function archive(account: Account) {
    session.change((repo) => repo.setAccountActive(account.id, false));
    toast.show({
      message: `${account.name} arquivada`,
      duration: 5000,
      action: { label: "Desfazer", onclick: () => session.change((repo) => repo.setAccountActive(account.id, true)) },
    });
  }

  function restore(account: Account) {
    session.change((repo) => repo.setAccountActive(account.id, true));
  }

  function askDelete(account: Account) {
    deleting = account;
    confirmOpen = true;
  }

  function confirmDelete() {
    const target = deleting;
    if (!target) return;
    try {
      session.change((repo) => repo.deleteAccount(target.id));
      toast.show({ message: `${target.name} excluída` });
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : "Não foi possível excluir.", tone: "destructive", duration: 0 });
    }
  }
</script>

<svelte:head><title>Contas · Finanças</title></svelte:head>

{#if !data}
  <PageHeader title="Contas" />
  <OpenDatabasePanel />
{:else}
  <PageHeader title="Contas" description="Onde o seu dinheiro está, e o que você deve.">
    {#snippet actions()}
      <Button onclick={openCreate}><Plus aria-hidden="true" />Nova conta</Button>
    {/snippet}
  </PageHeader>

  {#if data.archivedCount > 0}
    <Label class="mb-4 font-normal"><Checkbox bind:checked={showArchived} /> Mostrar arquivadas ({data.archivedCount})</Label>
  {/if}

  {#if data.accounts.length === 0}
    <Card>
      <EmptyState title="Nenhuma conta ainda." description="Crie a primeira para começar a lançar.">
        {#snippet action()}<Button onclick={openCreate}><Plus aria-hidden="true" />Nova conta</Button>{/snippet}
      </EmptyState>
    </Card>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#each data.accounts as account, index (account.id)}
        {@const style = accountTypeStyle(account.type, account.typeName)}
        <Card class={`group animate-rise transition-shadow hover:shadow-md ${account.isActive ? "" : "opacity-60"}`} style={`animation-delay: ${Math.min(index, 9) * 50}ms`}>
          <CardContent class="grid gap-3">
            <div class="flex items-center gap-3">
              <IconChip icon={style.icon} tone={style.tone} size="lg" title={account.typeName} />
              <div class="min-w-0 flex-1">
                <div class="truncate font-medium">{account.name}</div>
                <div class="text-xs text-muted-foreground">{account.typeName}{account.isActive ? "" : " · arquivada"}</div>
              </div>
              <div class="flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
                <IconButton icon={Pencil} label={`Editar ${account.name}`} onclick={() => startRename(account)} />
                {#if account.isActive}
                  <IconButton icon={Archive} label={`Arquivar ${account.name}`} onclick={() => archive(account)} />
                {:else}
                  <IconButton icon={ArchiveRestore} label={`Reativar ${account.name}`} onclick={() => restore(account)} />
                {/if}
                <IconButton icon={Trash} label={`Excluir ${account.name}`} onclick={() => askDelete(account)} />
              </div>
            </div>
            <Money class="text-2xl font-semibold" cents={account.balance} tone="auto" />
            {#if account.invoice}
              {@const invoice = account.invoice}
              <dl class="grid gap-1 border-t pt-3 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-muted-foreground">Fatura em aberto</dt>
                  <dd><Money class="font-medium" cents={invoice.openInvoiceCents} /></dd>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-muted-foreground">Fatura anterior</dt>
                  <dd><Money class="font-medium" cents={invoice.previousInvoiceCents} /></dd>
                </div>
                <p class="text-xs text-muted-foreground">
                  Vira dia {invoice.closingDay}{invoice.daysUntilTurn === 0 ? " (hoje)" : ` (em ${invoice.daysUntilTurn} ${invoice.daysUntilTurn === 1 ? "dia" : "dias"})`}
                </p>
              </dl>
            {/if}
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}

  <Dialog bind:open={createOpen} title="Nova conta">
    <form class="grid gap-4" onsubmit={create}>
      <Field label="Nome">
        {#snippet control(field)}<Input {...field} bind:value={name} required placeholder="Ex.: Nubank" />{/snippet}
      </Field>
      <Field label="Tipo">
        {#snippet control(field)}
          <NativeSelect {...field} bind:value={type}>
            {#each data.types as option (option.key)}<option value={option.key}>{option.name}</option>{/each}
          </NativeSelect>
        {/snippet}
      </Field>
      <Field label={creatingLiability ? "Valor devido hoje" : "Saldo inicial"}>
        {#snippet control(field)}<Input {...field} bind:value={opening} inputmode="decimal" placeholder="0,00" />{/snippet}
      </Field>
      {#if creatingCard}
        <Field label="A fatura vira no dia">
          {#snippet control(field)}<Input {...field} bind:value={closingDay} type="number" min="1" max="31" inputmode="numeric" required />{/snippet}
        </Field>
      {/if}
      {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
      <div class="flex justify-end gap-2">
        <Button type="button" variant="ghost" onclick={() => (createOpen = false)}>Cancelar</Button>
        <Button type="submit">Criar conta</Button>
      </div>
    </form>
  </Dialog>

  <Dialog bind:open={renameOpen} title="Editar conta">
    <form class="grid gap-4" onsubmit={rename}>
      <Field label="Nome">
        {#snippet control(field)}<Input {...field} bind:value={renameValue} required />{/snippet}
      </Field>
      {#if renaming?.closingDay !== null && renaming?.closingDay !== undefined}
        <Field label="A fatura vira no dia">
          {#snippet control(field)}<Input {...field} bind:value={renameClosingDay} type="number" min="1" max="31" inputmode="numeric" required />{/snippet}
        </Field>
      {/if}
      <div class="flex justify-end gap-2">
        <Button type="button" variant="ghost" onclick={() => (renameOpen = false)}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  </Dialog>

  <ConfirmDialog
    bind:open={confirmOpen}
    title={`Excluir ${deleting?.name ?? "conta"}?`}
    description="Só contas sem nenhum lançamento podem ser excluídas. Se ela já tem histórico, arquive-a."
    confirmLabel="Excluir"
    destructive
    onconfirm={confirmDelete}
  />
{/if}
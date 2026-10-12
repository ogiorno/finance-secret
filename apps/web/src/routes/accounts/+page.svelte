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
  import AccountTypesCard from "$lib/AccountTypesCard.svelte";
  import IncomeSourcesCard from "$lib/IncomeSourcesCard.svelte";
  import { accountTypeStyle } from "$lib/category-style";
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
      };
    });
    return { types, typeByKey, accounts, archivedCount: repo.listAccounts({ includeArchived: true }).length - repo.listAccounts().length };
  });

  let createOpen = $state(false);
  let name = $state("");
  let type = $state("checking");
  let opening = $state("");
  let error = $state<string | null>(null);

  let renaming = $state<Account | null>(null);
  let renameOpen = $state(false);
  let renameValue = $state("");
  let deleting = $state<Account | null>(null);
  let confirmOpen = $state(false);

  const creatingLiability = $derived(data?.typeByKey.get(type)?.isLiability ?? false);

  function openCreate() {
    name = "";
    type = "checking";
    opening = "";
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
      session.change((repo) => repo.createAccount({ name: name.trim(), type, openingBalanceCents: signed }));
      createOpen = false;
      toast.show({ message: "Conta criada", tone: "success" });
    } catch (e) {
      error = e instanceof Error ? e.message : "Não foi possível criar a conta.";
    }
  }

  function startRename(account: Account) {
    renaming = account;
    renameValue = account.name;
    renameOpen = true;
  }

  function rename(event: SubmitEvent) {
    event.preventDefault();
    if (!renaming) return;
    const target = renaming;
    try {
      session.change((repo) => repo.renameAccount(target.id, renameValue));
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
                <IconButton icon={Pencil} label={`Renomear ${account.name}`} onclick={() => startRename(account)} />
                {#if account.isActive}
                  <IconButton icon={Archive} label={`Arquivar ${account.name}`} onclick={() => archive(account)} />
                {:else}
                  <IconButton icon={ArchiveRestore} label={`Reativar ${account.name}`} onclick={() => restore(account)} />
                {/if}
                <IconButton icon={Trash} label={`Excluir ${account.name}`} onclick={() => askDelete(account)} />
              </div>
            </div>
            <Money class="text-2xl font-semibold" cents={account.balance} tone="auto" />
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}

  <IncomeSourcesCard />

  <AccountTypesCard />

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
      {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
      <div class="flex justify-end gap-2">
        <Button type="button" variant="ghost" onclick={() => (createOpen = false)}>Cancelar</Button>
        <Button type="submit">Criar conta</Button>
      </div>
    </form>
  </Dialog>

  <Dialog bind:open={renameOpen} title="Renomear conta">
    <form class="grid gap-4" onsubmit={rename}>
      <Field label="Nome">
        {#snippet control(field)}<Input {...field} bind:value={renameValue} required />{/snippet}
      </Field>
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
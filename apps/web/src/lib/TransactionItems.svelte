<script lang="ts">
  import { Pencil, Plus, Trash } from "@lucide/svelte";
  import { formatQuantityMilli, itemTotalCents, parseBRLToCents, parseQuantityToMilli } from "@finance/core";
  import type { TransactionItem } from "@finance/database";
  import { Alert, Button, ConfirmDialog, Field, IconButton, Input, Money, formatBRL, toast } from "@finance/ui";
  import { session } from "./session.svelte";

  let { transactionId }: { transactionId: number } = $props();

  const view = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    return { items: repo.listTransactionItems(transactionId), total: repo.getItemsTotal(transactionId) };
  });

  let formOpen = $state(false);
  let editing = $state<TransactionItem | null>(null);
  let name = $state("");
  let quantity = $state("1");
  let price = $state("");
  let error = $state<string | null>(null);

  const preview = $derived.by(() => {
    const milli = parseQuantityToMilli(quantity);
    const cents = parseBRLToCents(price);
    if (milli === null || cents === null) return null;
    try {
      return itemTotalCents(milli, cents);
    } catch {
      return null;
    }
  });

  function startNew() {
    editing = null;
    name = "";
    quantity = "1";
    price = "";
    error = null;
    formOpen = true;
  }

  function startEdit(item: TransactionItem) {
    editing = item;
    name = item.name;
    quantity = formatQuantityMilli(item.quantityMilli);
    price = (item.unitPriceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    error = null;
    formOpen = true;
  }

  function save(event: Event) {
    event.preventDefault();
    error = null;
    const quantityMilli = parseQuantityToMilli(quantity);
    const unitPriceCents = price.trim() === "" ? null : parseBRLToCents(price);
    if (quantityMilli === null) {
      error = "Quantidade inválida. Exemplos: 2 ou 1,250";
      return;
    }
    if (unitPriceCents === null) {
      error = "Preço inválido. Exemplo: 25,99";
      return;
    }
    const target = editing;
    try {
      session.change((repo) => {
        const input = { name, quantityMilli, unitPriceCents };
        if (target) repo.updateTransactionItem(target.id, input);
        else repo.addTransactionItem(transactionId, input);
      });
    } catch (e) {
      error = e instanceof Error ? e.message : "Não foi possível salvar o item.";
      return;
    }
    if (target) formOpen = false;
    else {
      // Pronto para o próximo item da mesma compra.
      name = "";
      quantity = "1";
      price = "";
    }
  }

  let deleteOpen = $state(false);
  let deleting = $state<TransactionItem | null>(null);

  function askDelete(item: TransactionItem) {
    deleting = item;
    deleteOpen = true;
  }

  function confirmDelete() {
    const target = deleting;
    if (!target) return;
    try {
      session.change((repo) => repo.deleteTransactionItem(target.id));
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : "Não foi possível remover.", tone: "destructive", duration: 0 });
    }
  }
</script>

{#if view}
  <section aria-labelledby="items-heading" class="mt-5 grid gap-3">
    <div class="flex items-center justify-between gap-2">
      <h3 id="items-heading" class="text-sm font-semibold">Itens da compra</h3>
      {#if !formOpen}
        <Button size="sm" variant="outline" onclick={startNew}><Plus aria-hidden="true" />Adicionar item</Button>
      {/if}
    </div>

    {#if view.items.length === 0 && !formOpen}
      <p class="text-sm text-muted-foreground">Sem itens. Adicione se quiser detalhar o que foi comprado.</p>
    {/if}

    {#if view.items.length > 0}
      <ul class="divide-y rounded-lg border">
        {#each view.items as item (item.id)}
          <li class="flex items-center gap-2 px-3 py-2 text-sm">
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{item.name}</div>
              <div class="text-xs text-muted-foreground">{formatQuantityMilli(item.quantityMilli)} × {formatBRL(item.unitPriceCents)}</div>
            </div>
            <Money class="font-medium whitespace-nowrap" cents={item.totalCents} />
            <IconButton icon={Pencil} label={`Editar ${item.name}`} onclick={() => startEdit(item)} />
            <IconButton icon={Trash} label={`Remover ${item.name}`} onclick={() => askDelete(item)} />
          </li>
        {/each}
      </ul>
      <dl class="grid gap-1 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-muted-foreground">Soma dos itens</dt>
          <dd><Money cents={view.total.itemsCents} /></dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted-foreground">Total da compra</dt>
          <dd><Money cents={view.total.transactionCents} /></dd>
        </div>
        {#if view.total.differenceCents !== 0}
          <div class="flex justify-between gap-4">
            <dt class="text-muted-foreground">Ajustes e descontos</dt>
            <dd><Money cents={view.total.differenceCents} tone="auto" showSign /></dd>
          </div>
        {/if}
      </dl>
      <p class="text-xs text-muted-foreground">O saldo e os totais usam sempre o total da compra, não a soma dos itens.</p>
    {/if}

    {#if formOpen}
      <form class="grid gap-3 rounded-lg border p-3" onsubmit={save}>
        <Field label="Produto">
          {#snippet control(field)}<Input {...field} bind:value={name} required placeholder="Ex.: Arroz 5 kg" />{/snippet}
        </Field>
        <div class="grid gap-3 sm:grid-cols-2">
          <Field label="Quantidade">
            {#snippet control(field)}<Input {...field} bind:value={quantity} inputmode="decimal" required />{/snippet}
          </Field>
          <Field label="Preço unitário (R$)">
            {#snippet control(field)}<Input {...field} bind:value={price} inputmode="decimal" placeholder="0,00" required />{/snippet}
          </Field>
        </div>
        {#if preview !== null}<p class="text-sm text-muted-foreground">Total do item: <Money cents={preview} class="font-medium" /></p>{/if}
        {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
        <div class="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onclick={() => (formOpen = false)}>{editing ? "Cancelar" : "Fechar"}</Button>
          <Button type="submit">{editing ? "Salvar item" : "Adicionar"}</Button>
        </div>
      </form>
    {/if}
  </section>

  <ConfirmDialog
    bind:open={deleteOpen}
    title="Remover este item?"
    description={deleting ? `${deleting.name} (${formatBRL(deleting.totalCents)}) sai da lista de itens. O total da compra não muda.` : undefined}
    confirmLabel="Remover"
    destructive
    onconfirm={confirmDelete}
  />
{/if}

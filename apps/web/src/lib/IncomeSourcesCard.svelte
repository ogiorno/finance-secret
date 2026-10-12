<script lang="ts">
  import { Archive, ArchiveRestore, Pencil, Plus, Trash } from "@lucide/svelte";
  import type { IncomeSource } from "@finance/database";
  import {
    Alert,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    ConfirmDialog,
    Dialog,
    Field,
    IconButton,
    Input,
    toast,
  } from "@finance/ui";
  import { session } from "./session.svelte";

  const sources = $derived.by(() => {
    void session.revision;
    return session.repo?.listIncomeSources({ includeArchived: true }) ?? [];
  });

  let formOpen = $state(false);
  let editing = $state<IncomeSource | null>(null);
  let name = $state("");
  let error = $state<string | null>(null);

  function openNew() {
    editing = null;
    name = "";
    error = null;
    formOpen = true;
  }

  function openRename(source: IncomeSource) {
    editing = source;
    name = source.name;
    error = null;
    formOpen = true;
  }

  function save(event: Event) {
    event.preventDefault();
    error = null;
    const target = editing;
    try {
      session.change((repo) => (target ? repo.renameIncomeSource(target.id, name) : repo.createIncomeSource({ name })));
    } catch (e) {
      error = e instanceof Error ? e.message : "Não foi possível salvar a fonte.";
      return;
    }
    formOpen = false;
    toast.show({ message: target ? "Fonte renomeada" : "Fonte criada", tone: "success" });
  }

  function setActive(source: IncomeSource, active: boolean) {
    try {
      session.change((repo) => repo.setIncomeSourceActive(source.id, active));
      if (!active) {
        toast.show({
          message: `${source.name} arquivada`,
          duration: 5000,
          action: { label: "Desfazer", onclick: () => session.change((repo) => repo.setIncomeSourceActive(source.id, true)) },
        });
      }
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : "Não foi possível arquivar.", tone: "destructive", duration: 0 });
    }
  }

  let deleteOpen = $state(false);
  let deleting = $state<IncomeSource | null>(null);

  function askDelete(source: IncomeSource) {
    deleting = source;
    deleteOpen = true;
  }

  function confirmDelete() {
    const target = deleting;
    if (!target) return;
    try {
      session.change((repo) => repo.deleteIncomeSource(target.id));
      toast.show({ message: `${target.name} excluída` });
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : "Não foi possível excluir.", tone: "destructive", duration: 0 });
    }
  }
</script>

<Card class="mt-6">
  <CardHeader>
    <CardTitle>Fontes de renda</CardTitle>
    <CardDescription>De quem ou de onde o dinheiro vem: você, sua esposa, um aluguel. Cada receita aponta para uma fonte.</CardDescription>
  </CardHeader>
  <CardContent class="grid gap-3">
    {#each sources as source (source.id)}
      <div class={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0 ${source.isActive ? "" : "opacity-60"}`}>
        <div class="flex items-center gap-2">
          <span class="font-medium">{source.name}</span>
          {#if source.isDefault}<Badge variant="secondary">Padrão</Badge>{/if}
          {#if !source.isActive}<Badge variant="outline">Arquivada</Badge>{/if}
        </div>
        <div class="flex gap-0.5">
          <IconButton icon={Pencil} label={`Renomear ${source.name}`} onclick={() => openRename(source)} />
          {#if !source.isDefault}
            {#if source.isActive}
              <IconButton icon={Archive} label={`Arquivar ${source.name}`} onclick={() => setActive(source, false)} />
            {:else}
              <IconButton icon={ArchiveRestore} label={`Reativar ${source.name}`} onclick={() => setActive(source, true)} />
            {/if}
            <IconButton icon={Trash} label={`Excluir ${source.name}`} onclick={() => askDelete(source)} />
          {/if}
        </div>
      </div>
    {/each}
    <div><Button variant="outline" size="sm" onclick={openNew}><Plus aria-hidden="true" />Nova fonte</Button></div>
  </CardContent>
</Card>

<Dialog bind:open={formOpen} title={editing ? "Renomear fonte" : "Nova fonte"}>
  <form class="grid gap-4" onsubmit={save}>
    <Field label="Nome">
      {#snippet control(field)}<Input {...field} bind:value={name} required placeholder="Ex.: Esposa" />{/snippet}
    </Field>
    {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
    <div class="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" onclick={() => (formOpen = false)}>Cancelar</Button>
      <Button type="submit">Salvar</Button>
    </div>
  </form>
</Dialog>

<ConfirmDialog
  bind:open={deleteOpen}
  title={`Excluir ${deleting?.name ?? "fonte"}?`}
  description="Só dá para excluir fontes que nunca tiveram receita; para as outras, use Arquivar."
  confirmLabel="Excluir"
  destructive
  onconfirm={confirmDelete}
/>

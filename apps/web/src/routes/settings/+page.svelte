<script lang="ts">
  import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, PageHeader, SegmentedControl, toast } from "@finance/ui";
  import AccountTypesCard from "$lib/AccountTypesCard.svelte";
  import IncomeSourcesCard from "$lib/IncomeSourcesCard.svelte";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { session } from "$lib/session.svelte";
  import { appTheme } from "$lib/theme.svelte";

  let confirmOpen = $state(false);

  async function forgetSaved() {
    await session.clearSaved();
    toast.show({ message: "Cópia guardada neste navegador apagada." });
  }
</script>

<svelte:head><title>Configurações · Finanças</title></svelte:head>

<PageHeader title="Configurações" description="Aparência, dados guardados neste navegador e os cadastros que moldam o app." />

<div class="grid gap-6">
  <Card>
    <CardHeader>
      <CardTitle>Aparência</CardTitle>
      <CardDescription>O tema fica salvo neste navegador.</CardDescription>
    </CardHeader>
    <CardContent>
      <SegmentedControl
        label="Tema"
        value={appTheme.value}
        options={[
          { value: "light", label: "Claro" },
          { value: "dark", label: "Escuro" },
        ]}
        onchange={(next) => appTheme.set(next === "dark" ? "dark" : "light")}
      />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Dados neste navegador</CardTitle>
      <CardDescription>
        O banco aberto é guardado aqui para sobreviver a atualizar a página. Nada é enviado a servidor algum. Apagar a cópia não mexe em arquivos exportados.
      </CardDescription>
    </CardHeader>
    <CardContent class="flex flex-wrap items-center gap-3">
      <Button variant="outline" onclick={() => (confirmOpen = true)}>Apagar a cópia guardada</Button>
      {#if session.persistFailed}
        <span class="text-sm text-warning">O navegador não está conseguindo guardar o banco.</span>
      {/if}
    </CardContent>
  </Card>

  {#if session.isOpen}
    <div class="grid gap-6 [&>*]:mt-0">
      <IncomeSourcesCard />
      <AccountTypesCard />
    </div>
  {:else}
    <OpenDatabasePanel />
  {/if}
</div>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Apagar a cópia guardada neste navegador?"
  description="O banco aberto continua na tela até você fechar ou atualizar a página, e depois disso não volta sozinho. Exporte antes se ainda não tem um arquivo."
  confirmLabel="Apagar"
  destructive
  onconfirm={forgetSaved}
/>

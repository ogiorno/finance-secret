<script lang="ts">
  import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@finance/ui";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { session } from "$lib/session.svelte";
</script>

<svelte:head><title>Importar e exportar · Finanças</title></svelte:head>

<PageHeader title="Importar e exportar" />

<div class="grid gap-4">
  <OpenDatabasePanel />

  <Card>
    <CardHeader>
      <CardTitle>Exportar</CardTitle>
      <CardDescription>
        As alterações ficam guardadas neste navegador e sobrevivem a atualizar a página. Exporte o arquivo para ter uma cópia fora dele: limpar os dados do site apaga o que está aqui.
      </CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      {#if session.dirty}
        <Alert variant="warning">Há alterações ainda não exportadas.</Alert>
      {/if}
      {#if session.pendingDeleteId !== null}
        <Alert variant="warning">A exportação aguardará o fim do prazo para desfazer a exclusão.</Alert>
      {/if}
      <div>
        <Button onclick={() => session.exportFile()} disabled={!session.isOpen}>Baixar {session.fileName}</Button>
      </div>
    </CardContent>
  </Card>
</div>

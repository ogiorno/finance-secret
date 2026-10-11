<script lang="ts">
  import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@finance/ui";
  import { session } from "./session.svelte";

  let { onOpened }: { onOpened?: () => void } = $props();

  let input: HTMLInputElement;

  async function pick(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    await session.openFile(file);
    event.currentTarget.value = "";
    if (session.isOpen && !session.error) onOpened?.();
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Abrir seus dados</CardTitle>
    <CardDescription>
      Tudo acontece neste navegador: o arquivo não é enviado para nenhum servidor.
    </CardDescription>
  </CardHeader>
  <CardContent class="flex flex-col gap-3">
    {#if session.error}
      <Alert variant="destructive" role="alert">{session.error}</Alert>
    {/if}
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => input.click()} disabled={session.busy}>Abrir arquivo .db</Button>
      <Button variant="outline" onclick={() => session.createNew().then(() => onOpened?.())} disabled={session.busy}>
        Criar banco vazio
      </Button>
      <Button variant="ghost" onclick={() => session.openDemo().then(() => onOpened?.())} disabled={session.busy}>
        Ver demonstração
      </Button>
    </div>
    <input bind:this={input} type="file" accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3" class="hidden" onchange={pick} data-testid="file-input" />
  </CardContent>
</Card>

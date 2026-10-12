<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import { Alert, Badge, Button, Dialog, Money, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@finance/ui";
  import type { AccountChange } from "./database-diff";
  import { session } from "./session.svelte";

  const pending = $derived(session.pendingImport);

  const accountLabel: Record<AccountChange, string> = { added: "Nova", removed: "Some", changed: "Muda", same: "Igual" };

  function date(value: number | string | null): string {
    if (typeof value !== "string") return "—";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
</script>

<Dialog
  bind:open={() => pending !== null, (value) => { if (!value) session.cancelImport(); }}
  title={pending?.sameName ? "Substituir o banco que já está aqui?" : "Substituir o banco aberto?"}
  description={pending ? `Compare o que já está na plataforma (${pending.currentName}) com o arquivo novo (${pending.fileName}).` : undefined}
  class="md:max-w-2xl"
>
  {#if pending}
    <div class="grid gap-4">
      {#if pending.diff.identical}
        <Alert>Os dois bancos têm o mesmo conteúdo nesta comparação. Substituir não muda nada do que aparece abaixo.</Alert>
      {/if}
      {#if pending.currentDirty}
        <Alert variant="warning">
          O banco atual tem alterações que você nunca exportou. Se substituir, elas se perdem: cancele e exporte antes se quiser guardá-las.
        </Alert>
      {/if}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>O que se compara</TableHead>
            <TableHead class="text-right">Já na plataforma</TableHead>
            <TableHead class="text-right">Arquivo novo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each pending.diff.metrics as row (row.label)}
            <TableRow class={row.changed ? "bg-accent/50" : ""}>
              <TableCell>{row.label}{#if row.changed}<span class="sr-only"> (muda)</span>{/if}</TableCell>
              {#each [row.current, row.incoming] as value, index (index)}
                <TableCell class={`text-right tabular-nums ${index === 1 && row.changed ? "font-semibold" : ""}`}>
                  {#if row.kind === "money" && typeof value === "number"}
                    <Money cents={value} tone="auto" />
                  {:else if row.kind === "date"}
                    {date(value)}
                  {:else}
                    {value ?? "—"}
                  {/if}
                </TableCell>
              {/each}
            </TableRow>
          {/each}
        </TableBody>
      </Table>

      {#if pending.diff.accounts.length > 0}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead class="text-right">Saldo na plataforma</TableHead>
              <TableHead class="text-right">Saldo no arquivo</TableHead>
              <TableHead class="w-0"><span class="sr-only">Situação</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each pending.diff.accounts as row (row.name)}
              <TableRow class={row.change === "same" ? "" : "bg-accent/50"}>
                <TableCell>{row.name}</TableCell>
                <TableCell class="text-right tabular-nums">
                  {#if row.currentCents === null}—{:else}<Money cents={row.currentCents} tone="auto" />{/if}
                </TableCell>
                <TableCell class="text-right tabular-nums">
                  {#if row.incomingCents === null}—{:else}<Money cents={row.incomingCents} tone="auto" />{/if}
                </TableCell>
                <TableCell><Badge variant={row.change === "same" ? "outline" : "secondary"}>{accountLabel[row.change]}</Badge></TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    <p class="mr-auto flex items-center gap-1.5 text-sm text-muted-foreground">
      <ArrowRight class="size-4" aria-hidden="true" />Você tem certeza que deseja substituir?
    </p>
    <Button variant="outline" onclick={() => session.cancelImport()}>Cancelar</Button>
    <Button variant="destructive" onclick={() => void session.confirmImport()}>Substituir</Button>
  {/snippet}
</Dialog>

<script lang="ts">
  import { ArrowRight, PiggyBank } from "@lucide/svelte";
  import {
    Alert,
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    EmptyState,
    InfoTip,
    Money,
    PageHeader,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@finance/ui";
  import { buildFlowGraph, transactionIdsOf, type FlowSelection } from "$lib/flow-graph";
  import MoneyFlowDiagram from "$lib/MoneyFlowDiagram.svelte";
  import MoneyFlowStack from "$lib/MoneyFlowStack.svelte";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { period } from "$lib/period.svelte";
  import { session } from "$lib/session.svelte";
  import TransactionList from "$lib/TransactionList.svelte";

  const kindLabel = { income: "Entrou", expense: "Saiu", transfer: "Transferência" } as const;

  let selection = $state<FlowSelection | null>(null);

  // Trocar de mês ou de banco limpa a escolha, que apontaria para trechos que não existem mais.
  $effect(() => {
    void period.month;
    void session.fileName;
    selection = null;
  });

  const data = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const flow = repo.getMoneyFlow(period.month);
    const graph = buildFlowGraph(flow.edges);
    const all = repo.listTransactions({ month: period.month, limit: 5000 });
    return { flow, graph, all };
  });

  const selectedIds = $derived(data && selection ? new Set(transactionIdsOf(data.graph, selection)) : null);
  const selectedItems = $derived(data && selectedIds ? data.all.filter((item) => selectedIds.has(item.id)) : []);

  const selectionTitle = $derived.by(() => {
    const current = selection;
    if (!data || !current) return "";
    if (current.type === "edge") {
      const edge = data.graph.edges.find((candidate) => candidate.id === current.id);
      return edge ? `${edge.fromLabel} → ${edge.toLabel}` : "";
    }
    const node = [...data.graph.sources, ...data.graph.accounts, ...data.graph.destinations].find((candidate) => candidate.key === current.key);
    return node?.label ?? "";
  });
</script>

<svelte:head><title>Fluxo do dinheiro · Finanças</title></svelte:head>

{#if !data}
  <PageHeader title="Fluxo do dinheiro" />
  <OpenDatabasePanel />
{:else}
  <PageHeader title="Fluxo do dinheiro" description="De onde o dinheiro veio, por onde passou e para onde foi no mês. Compras no cartão aparecem no mês em que a fatura fecha. Toque ou clique numa caixa, linha ou item para ver os lançamentos." />

  {#if data.graph.edges.length === 0}
    <Card>
      <CardContent class="px-0">
        <EmptyState title="Nada para mostrar neste mês." description="Quando houver receitas, despesas ou transferências, o caminho do dinheiro aparece aqui." />
      </CardContent>
    </Card>
  {:else}
    <div class="mb-2 hidden grid-cols-3 gap-2 text-center md:grid">
      <div class="flex items-center justify-center gap-1">
        <Badge variant="warning">Quem trouxe</Badge>
        <InfoTip text="As fontes de renda: você, sua esposa, outras. Só conta o que já foi recebido." label="Sobre as fontes" />
      </div>
      <div class="flex items-center justify-center gap-1">
        <Badge variant="warning">Onde passou</Badge>
        <InfoTip text="As contas por onde o dinheiro entrou e saiu: corrente, cartão, vale-refeição. Cada conta tem a sua cor, e a origem de cada gasto é a conta." label="Sobre as contas" />
      </div>
      <div class="flex items-center justify-center gap-1">
        <Badge variant="warning">Para onde foi</Badge>
        <InfoTip
          text="As categorias das despesas, mais Contas a pagar (as recorrentes) e Despesas extras (os imprevistos), com a parte de cada uma no total gasto. Embaixo, o que foi guardado nas metas."
          label="Sobre os destinos"
        />
      </div>
    </div>

    <!-- Telas largas: o diagrama de caixas e curvas. Telas estreitas: um cartão por conta, sem linhas para seguir. -->
    <Card class="mb-4 hidden md:block">
      <CardContent><MoneyFlowDiagram graph={data.graph} goals={data.flow.goals} bind:selection /></CardContent>
    </Card>
    <div class="mb-4 md:hidden">
      <MoneyFlowStack graph={data.graph} goals={data.flow.goals} bind:selection />
    </div>

    {#if data.graph.transfers.length > 0}
      <div class="mb-4">
        <p class="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
          Entre suas contas (não é gasto)
          <InfoTip text="Transferências entre as suas contas, como pagar a fatura do cartão ou guardar na poupança. O dinheiro só muda de lugar." label="Sobre as transferências" />
        </p>
        <ul class="flex flex-wrap gap-2">
          {#each data.graph.transfers as transfer (transfer.id)}
            <li>
              <Button
                variant="outline"
                size="sm"
                class="border-dashed"
                aria-pressed={selection?.type === "edge" && selection.id === transfer.id}
                onclick={() => (selection = { type: "edge", id: transfer.id })}
              >
                {transfer.fromLabel}
                <ArrowRight aria-hidden="true" />
                {transfer.toLabel}
                <Money class="font-semibold" cents={transfer.cents} />
              </Button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if data.flow.goals.length > 0}
      <p class="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <PiggyBank class="size-4" aria-hidden="true" />
        Nas metas, o dinheiro guardado variou <Money class="font-medium" cents={data.flow.goalsNetCents} tone="auto" showSign /> neste mês. Esse dinheiro não saiu das suas contas, por isso a caixa das metas não tem seta.
      </p>
    {/if}

    {#if selection}
      <Card class="mb-4">
        <CardHeader>
          <CardTitle class="flex flex-wrap items-center justify-between gap-2">
            <span>Lançamentos de {selectionTitle}</span>
            <Button size="sm" variant="ghost" onclick={() => (selection = null)}>Limpar escolha</Button>
          </CardTitle>
        </CardHeader>
        <CardContent class="px-0"><TransactionList items={selectedItems} emptyTitle="Nenhum lançamento neste trecho." /></CardContent>
      </Card>
    {/if}

    <Card>
      <CardHeader><CardTitle>Os mesmos trechos em tabela</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>De → Para</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead class="text-right">Valor</TableHead>
              <TableHead><span class="sr-only">Ver lançamentos</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.graph.edges as edge (edge.id)}
              <TableRow>
                <TableCell>
                  <span class="flex flex-wrap items-center gap-1">
                    {edge.fromLabel}
                    <ArrowRight class="size-3.5 shrink-0" aria-hidden="true" />
                    {edge.toLabel}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={edge.kind === "income" ? "income" : edge.kind === "expense" ? "expense" : "transfer"}>{kindLabel[edge.kind]}</Badge>
                </TableCell>
                <TableCell class="text-right"><Money cents={edge.cents} /></TableCell>
                <TableCell class="text-right">
                  <Button size="sm" variant="ghost" onclick={() => (selection = { type: "edge", id: edge.id })}>
                    Ver<span class="sr-only"> lançamentos de {edge.fromLabel} para {edge.toLabel}</span>
                  </Button>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  {/if}
{/if}

<script lang="ts">
  import { ArrowDownToLine, ArrowUpFromLine } from "@lucide/svelte";
  import type { GoalFlow } from "@finance/database";
  import { Button, Money } from "@finance/ui";
  import type { FlowGraph, FlowSelection } from "./flow-graph";

  let {
    graph,
    goals = [],
    selection = $bindable(null),
  }: {
    graph: FlowGraph;
    goals?: GoalFlow[];
    selection?: FlowSelection | null;
  } = $props();

  // A mesma cor por conta do diagrama largo, aqui na borda do cartão. Classes completas para o Tailwind enxergá-las.
  const BORDERS = ["border-l-cat-1", "border-l-cat-2", "border-l-cat-3", "border-l-cat-4"] as const;

  const cards = $derived(
    graph.accounts.map((account, index) => ({
      account,
      border: BORDERS[index % BORDERS.length] ?? BORDERS[0],
      incomes: graph.edges.filter((edge) => edge.kind === "income" && edge.toKey === account.key),
      spending: graph.edges.filter((edge) => edge.kind === "expense" && edge.fromKey === account.key).sort((a, b) => b.cents - a.cents),
    })),
  );

  const isEdge = (id: string) => selection?.type === "edge" && selection.id === id;
  const isNode = (key: string) => selection?.type === "node" && selection.key === key;

  function choose(next: FlowSelection) {
    const same = selection && JSON.stringify(selection) === JSON.stringify(next);
    selection = same ? null : next;
  }

  const rowClass = "h-auto w-full justify-between gap-x-3 gap-y-2 rounded-lg px-3 py-3 text-left font-normal whitespace-normal";
</script>

<div class="grid gap-3">
  {#each cards as card (card.account.key)}
    <section class={`rounded-xl border border-l-4 bg-card p-4 ${card.border}`} aria-label={`Conta ${card.account.label}`}>
      <Button
        variant="ghost"
        class={`${rowClass} ${isNode(card.account.key) ? "bg-accent" : ""}`}
        aria-pressed={isNode(card.account.key)}
        onclick={() => choose({ type: "node", key: card.account.key })}
      >
        <span class="font-semibold">{card.account.label}</span>
      </Button>

      {#if card.incomes.length > 0}
        <p class="mt-4 mb-1 flex items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground">
          <ArrowDownToLine class="size-3.5" aria-hidden="true" />Entrou
        </p>
        <ul class="grid gap-1">
          {#each card.incomes as edge (edge.id)}
            <li>
              <Button variant="ghost" class={`${rowClass} ${isEdge(edge.id) ? "bg-accent" : ""}`} aria-pressed={isEdge(edge.id)} onclick={() => choose({ type: "edge", id: edge.id })}>
                <span class="min-w-0 flex-1 truncate">{edge.fromLabel}</span>
                <Money class="font-semibold" cents={edge.cents} tone="income" />
              </Button>
            </li>
          {/each}
        </ul>
      {/if}

      <p class="mt-4 mb-1 flex items-center gap-1.5 px-3 text-xs font-medium text-muted-foreground">
        <ArrowUpFromLine class="size-3.5" aria-hidden="true" />Gastou <Money class="font-medium" cents={card.account.outCents} />
      </p>
      <ul class="grid gap-1">
        {#each card.spending as edge (edge.id)}
          {@const share = card.account.outCents > 0 ? Math.round((edge.cents * 100) / card.account.outCents) : 0}
          <li>
            <Button variant="ghost" class={`${rowClass} flex-wrap ${isEdge(edge.id) ? "bg-accent" : ""}`} aria-pressed={isEdge(edge.id)} onclick={() => choose({ type: "edge", id: edge.id })}>
              <span class="min-w-0 flex-1 truncate">{edge.toLabel}</span>
              <span class="text-xs text-muted-foreground">{share}%</span>
              <Money class="font-semibold" cents={edge.cents} />
              <span class="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span class="block h-full rounded-full bg-expense" style={`width: ${Math.max(2, share)}%`}></span>
              </span>
            </Button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}

  {#if goals.length > 0}
    <section class="rounded-xl border border-dashed p-4" aria-label="Guardado nas metas">
      <p class="mb-1 px-3 text-xs font-medium text-muted-foreground">Guardado nas metas (não saiu das contas)</p>
      <ul>
        {#each goals as goal (goal.goalId)}
          <li class="flex items-center justify-between gap-3 px-3 py-2.5">
            <span class="min-w-0 flex-1 truncate">{goal.goalName}</span>
            <Money class="font-semibold" cents={goal.netCents} tone="auto" showSign />
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

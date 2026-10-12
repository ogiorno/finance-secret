<script lang="ts">
  import { formatBRL } from "@finance/ui";
  import { edgeWidth, type FlowGraph, type FlowNode, type FlowSelection } from "./flow-graph";

  let {
    graph,
    selection = $bindable(null),
  }: {
    graph: FlowGraph;
    /** O trecho ou a caixa escolhidos; `null` mostra tudo igual. */
    selection?: FlowSelection | null;
  } = $props();

  const NODE_W = 150;
  const NODE_H = 52;
  const GAP = 14;
  const TOP = 24;
  const COLUMN_X = [20, 265, 510] as const;

  type Placed = FlowNode & { x: number; y: number; column: 0 | 1 | 2 };

  const layout = $derived.by(() => {
    const placed = new Map<string, Placed>();
    ([graph.sources, graph.accounts, graph.destinations] as const).forEach((nodes, column) => {
      nodes.forEach((node, index) => {
        placed.set(node.key, { ...node, x: COLUMN_X[column as 0 | 1 | 2], y: TOP + index * (NODE_H + GAP), column: column as 0 | 1 | 2 });
      });
    });
    const rows = Math.max(1, graph.sources.length, graph.accounts.length, graph.destinations.length);
    return { placed, height: TOP + rows * (NODE_H + GAP) + 8 };
  });

  const maxCents = $derived(Math.max(0, ...graph.edges.map((edge) => edge.cents)));

  // Cada ponta de seta ocupa um lugar próprio na lateral da caixa, para as setas não se empilharem no mesmo ponto.
  const slots = $derived.by(() => {
    const out = new Map<string, number>();
    const into = new Map<string, number>();
    const outCount = new Map<string, number>();
    const inCount = new Map<string, number>();
    for (const edge of graph.edges) {
      outCount.set(edge.fromKey, (outCount.get(edge.fromKey) ?? 0) + 1);
      inCount.set(edge.toKey, (inCount.get(edge.toKey) ?? 0) + 1);
    }
    const outSeen = new Map<string, number>();
    const inSeen = new Map<string, number>();
    for (const edge of graph.edges) {
      const o = outSeen.get(edge.fromKey) ?? 0;
      outSeen.set(edge.fromKey, o + 1);
      const i = inSeen.get(edge.toKey) ?? 0;
      inSeen.set(edge.toKey, i + 1);
      const spread = (index: number, count: number) => 10 + (count <= 1 ? (NODE_H - 20) / 2 : (index * (NODE_H - 20)) / (count - 1));
      out.set(edge.id, spread(o, outCount.get(edge.fromKey) ?? 1));
      into.set(edge.id, spread(i, inCount.get(edge.toKey) ?? 1));
    }
    return { out, into };
  });

  const paths = $derived(
    graph.edges.flatMap((edge) => {
      const from = layout.placed.get(edge.fromKey);
      const to = layout.placed.get(edge.toKey);
      if (!from || !to) return [];
      const fromY = from.y + (slots.out.get(edge.id) ?? NODE_H / 2);
      const toY = to.y + (slots.into.get(edge.id) ?? NODE_H / 2);
      let d: string;
      if (edge.kind === "transfer") {
        // Entre duas contas da mesma coluna: a seta faz uma curva pela esquerda.
        d = `M ${from.x} ${fromY} C ${from.x - 70} ${fromY}, ${to.x - 70} ${toY}, ${to.x} ${toY}`;
      } else {
        const x1 = from.x + NODE_W;
        const x2 = to.x;
        const mid = (x1 + x2) / 2;
        d = `M ${x1} ${fromY} C ${mid} ${fromY}, ${mid} ${toY}, ${x2} ${toY}`;
      }
      return [{ edge, d, width: edgeWidth(edge.cents, maxCents) }];
    }),
  );

  const touchedKeys = $derived.by(() => {
    const current = selection;
    if (!current) return null;
    if (current.type === "node") {
      const keys = new Set<string>([current.key]);
      for (const edge of graph.edges) {
        if (edge.fromKey === current.key || edge.toKey === current.key) {
          keys.add(edge.fromKey);
          keys.add(edge.toKey);
        }
      }
      return keys;
    }
    const edge = graph.edges.find((candidate) => candidate.id === current.id);
    return edge ? new Set([edge.fromKey, edge.toKey]) : null;
  });

  const edgeActive = (id: string, fromKey: string, toKey: string): boolean => {
    if (!selection) return true;
    if (selection.type === "edge") return selection.id === id;
    return selection.key === fromKey || selection.key === toKey;
  };

  const nodeActive = (key: string): boolean => touchedKeys === null || touchedKeys.has(key);

  function select(next: FlowSelection) {
    const same = selection && JSON.stringify(selection) === JSON.stringify(next);
    selection = same ? null : next;
  }

  function onKey(event: KeyboardEvent, next: FlowSelection) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(next);
    }
  }

  const edgeLabel = (edge: { kind: string; fromLabel: string; toLabel: string; cents: number }) =>
    `${edge.kind === "transfer" ? "Transferência" : edge.kind === "income" ? "Entrou" : "Saiu"} de ${edge.fromLabel} para ${edge.toLabel}: ${formatBRL(edge.cents)}`;

  const nodeAmount = (node: Placed) => (node.column === 0 ? node.outCents : node.column === 2 ? node.inCents : node.inCents);
</script>

<svg viewBox={`0 0 680 ${layout.height}`} width="100%" role="group" aria-label="Diagrama do fluxo do dinheiro: fontes, contas e destinos" class="block">
  <defs>
    <pattern id="flow-dots" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" class="fill-border" />
    </pattern>
    <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </marker>
  </defs>
  <rect x="0" y="0" width="680" height={layout.height} rx="12" fill="url(#flow-dots)" />

  {#each paths as item (item.edge.id)}
    {@const active = edgeActive(item.edge.id, item.edge.fromKey, item.edge.toKey)}
    <g
      role="button"
      tabindex="0"
      aria-label={edgeLabel(item.edge)}
      aria-pressed={selection?.type === "edge" && selection.id === item.edge.id}
      class="cursor-pointer outline-none"
      onclick={() => select({ type: "edge", id: item.edge.id })}
      onkeydown={(event) => onKey(event, { type: "edge", id: item.edge.id })}
    >
      <path d={item.d} fill="none" stroke-width={Math.max(item.width, 12)} class="stroke-transparent" />
      <path
        d={item.d}
        fill="none"
        stroke-width={item.width}
        stroke-linecap="round"
        stroke-dasharray={item.edge.kind === "transfer" ? "6 5" : undefined}
        marker-end="url(#flow-arrow)"
        class={`transition-opacity ${item.edge.kind === "income" ? "stroke-income" : item.edge.kind === "expense" ? "stroke-expense" : "stroke-muted-foreground"} ${active ? "opacity-70" : "opacity-15"}`}
      />
    </g>
  {/each}

  {#each [...layout.placed.values()] as node (node.key)}
    {@const active = nodeActive(node.key)}
    <g
      role="button"
      tabindex="0"
      aria-label={`${node.label}: ${formatBRL(nodeAmount(node))}`}
      aria-pressed={selection?.type === "node" && selection.key === node.key}
      class={`cursor-pointer outline-none transition-opacity ${active ? "opacity-100" : "opacity-40"}`}
      onclick={() => select({ type: "node", key: node.key })}
      onkeydown={(event) => onKey(event, { type: "node", key: node.key })}
    >
      <rect
        x={node.x}
        y={node.y}
        width={NODE_W}
        height={NODE_H}
        rx="8"
        stroke-width="1"
        class={node.column === 0 ? "fill-income/10 stroke-income" : node.column === 2 ? "fill-expense/10 stroke-expense" : "fill-card stroke-border"}
      />
      <text x={node.x + 12} y={node.y + 21} class="fill-foreground text-xs font-medium">{node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}</text>
      <text x={node.x + 12} y={node.y + 39} class="fill-muted-foreground text-xs">{formatBRL(nodeAmount(node))}</text>
    </g>
  {/each}
</svg>

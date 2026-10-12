<script lang="ts">
  import type { GoalFlow } from "@finance/database";
  import { formatBRL } from "@finance/ui";
  import type { FlowGraph, FlowNode, FlowSelection } from "./flow-graph";

  let {
    graph,
    goals = [],
    selection = $bindable(null),
  }: {
    graph: FlowGraph;
    /** O que foi para cada meta no mês: aparece à parte, sem seta, porque não saiu das contas. */
    goals?: GoalFlow[];
    /** O trecho ou a caixa escolhidos; `null` mostra tudo igual. */
    selection?: FlowSelection | null;
  } = $props();

  const SRC_X = 20;
  const SRC_W = 150;
  const SRC_H = 60;
  const ACC_X = 250;
  const ACC_W = 170;
  const DST_X = 500;
  const DST_W = 160;
  const DST_H = 52;
  const DST_GAP = 8;
  const TOP = 8;
  const GOAL_HEAD = 30;

  // Uma cor por conta, na caixa e nas linhas que saem dela. Classes completas para o Tailwind enxergá-las.
  const ACCOUNT_TONES = [
    { line: "stroke-cat-1", box: "fill-cat-1/10 stroke-cat-1" },
    { line: "stroke-cat-2", box: "fill-cat-2/10 stroke-cat-2" },
    { line: "stroke-cat-3", box: "fill-cat-3/10 stroke-cat-3" },
    { line: "stroke-cat-4", box: "fill-cat-4/10 stroke-cat-4" },
  ] as const;

  type Box = FlowNode & { x: number; y: number; w: number; h: number; cy: number };

  /** Coloca as caixas de uma coluna perto do centro dos pontos a que se ligam, sem se sobrepor. */
  function place(nodes: FlowNode[], x: number, w: number, heightOf: (node: FlowNode) => number, wanted: (node: FlowNode) => number | null): Box[] {
    const items = nodes
      .map((node, index) => ({ node, index, h: heightOf(node), want: wanted(node) }))
      .sort((a, b) => (a.want ?? a.index * 1000) - (b.want ?? b.index * 1000));
    const boxes: Box[] = [];
    let bottom = TOP - 16;
    for (const item of items) {
      const desired = item.want === null ? bottom + 16 : item.want - item.h / 2;
      const y = Math.max(bottom + 16, desired);
      boxes.push({ ...item.node, x, y, w, h: item.h, cy: y + item.h / 2 });
      bottom = y + item.h;
    }
    return boxes;
  }

  const layout = $derived.by(() => {
    const destinations: Box[] = graph.destinations.map((node, index) => {
      const y = TOP + index * (DST_H + DST_GAP);
      return { ...node, x: DST_X, y, w: DST_W, h: DST_H, cy: y + DST_H / 2 };
    });
    const destByKey = new Map(destinations.map((box) => [box.key, box]));
    const spending = graph.edges.filter((edge) => edge.kind === "expense");
    const mean = (values: number[]) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);

    const accounts = place(
      graph.accounts,
      ACC_X,
      ACC_W,
      (node) => (node.inCents > 0 ? 84 : 62),
      (node) => mean(spending.filter((edge) => edge.fromKey === node.key).map((edge) => destByKey.get(edge.toKey)?.cy ?? 0)),
    );
    const accByKey = new Map(accounts.map((box) => [box.key, box]));
    const incomes = graph.edges.filter((edge) => edge.kind === "income");
    const sources = place(
      graph.sources,
      SRC_X,
      SRC_W,
      () => SRC_H,
      (node) => mean(incomes.filter((edge) => edge.fromKey === node.key).map((edge) => accByKey.get(edge.toKey)?.cy ?? 0)),
    );

    const destBottom = destinations.length === 0 ? TOP : TOP + destinations.length * (DST_H + DST_GAP) - DST_GAP;
    const goalsTop = destBottom + (destinations.length === 0 ? 0 : 20);
    const goalBoxes = goals.map((goal, index) => ({ goal, y: goalsTop + GOAL_HEAD + index * (DST_H + DST_GAP) }));
    const goalsBottom = goals.length === 0 ? destBottom : goalsTop + GOAL_HEAD + goals.length * (DST_H + DST_GAP) - DST_GAP;
    const bottoms = [destBottom, goalsBottom, ...accounts.map((box) => box.y + box.h), ...sources.map((box) => box.y + box.h)];
    return { destinations, accounts, sources, goalBoxes, goalsTop, height: Math.max(...bottoms) + 12 };
  });

  const destByKey = $derived(new Map(layout.destinations.map((box) => [box.key, box])));
  const accByKey = $derived(new Map(layout.accounts.map((box) => [box.key, box])));
  const srcByKey = $derived(new Map(layout.sources.map((box) => [box.key, box])));

  /** Cada ponta de seta tem o seu lugar na lateral da caixa, para não se empilharem no mesmo ponto. */
  function spread(index: number, count: number): number {
    return (index - (count - 1) / 2) * 10;
  }

  const curve = (x0: number, y0: number, x1: number, y1: number) => {
    const mid = (x0 + x1) / 2;
    return `M ${x0} ${y0} C ${mid} ${y0}, ${mid} ${y1}, ${x1} ${y1}`;
  };

  const drawn = $derived.by(() => {
    const inbound = new Map<string, number>();
    const inboundSeen = new Map<string, number>();
    const outbound = new Map<string, number>();
    const outboundSeen = new Map<string, number>();
    for (const edge of graph.edges) {
      if (edge.kind === "transfer") continue;
      inbound.set(edge.toKey, (inbound.get(edge.toKey) ?? 0) + 1);
      if (edge.kind === "expense") outbound.set(edge.fromKey, (outbound.get(edge.fromKey) ?? 0) + 1);
    }
    const accountIndex = new Map(graph.accounts.map((node, index) => [node.key, index]));
    const items: { edge: (typeof graph.edges)[number]; d: string; stroke: string; pill: { x: number; y: number; text: string } | null }[] = [];

    for (const edge of graph.edges) {
      if (edge.kind === "transfer") continue;
      const seen = inboundSeen.get(edge.toKey) ?? 0;
      inboundSeen.set(edge.toKey, seen + 1);
      const slot = spread(seen, inbound.get(edge.toKey) ?? 1);

      if (edge.kind === "income") {
        const from = srcByKey.get(edge.fromKey);
        const to = accByKey.get(edge.toKey);
        if (!from || !to) continue;
        const x0 = from.x + from.w;
        const x1 = to.x - 2;
        const y0 = from.cy;
        const y1 = to.cy + slot;
        items.push({
          edge,
          d: curve(x0, y0, x1, y1),
          stroke: "stroke-income",
          pill: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, text: formatBRL(edge.cents).replace(",00", "") },
        });
        continue;
      }

      const from = accByKey.get(edge.fromKey);
      const to = destByKey.get(edge.toKey);
      if (!from || !to) continue;
      const out = outboundSeen.get(edge.fromKey) ?? 0;
      outboundSeen.set(edge.fromKey, out + 1);
      const tone = ACCOUNT_TONES[(accountIndex.get(edge.fromKey) ?? 0) % ACCOUNT_TONES.length] ?? ACCOUNT_TONES[0];
      items.push({
        edge,
        d: curve(from.x + from.w, from.cy + spread(out, outbound.get(edge.fromKey) ?? 1), to.x - 2, to.cy + slot),
        stroke: tone.line,
        pill: null,
      });
    }
    return { items };
  });

  const touchesSelection = (fromKey: string, toKey: string, id: string): boolean => {
    const current = selection;
    if (!current) return true;
    return current.type === "edge" ? current.id === id : current.key === fromKey || current.key === toKey;
  };

  const nodeActive = (key: string): boolean => {
    const current = selection;
    if (!current) return true;
    if (current.type === "node") {
      return (
        current.key === key ||
        graph.edges.some((edge) => (edge.fromKey === current.key && edge.toKey === key) || (edge.toKey === current.key && edge.fromKey === key))
      );
    }
    const edge = graph.edges.find((candidate) => candidate.id === current.id);
    return edge ? edge.fromKey === key || edge.toKey === key : true;
  };

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

  const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
  const edgeLabel = (edge: { kind: string; fromLabel: string; toLabel: string; cents: number }) =>
    `${edge.kind === "income" ? "Entrou" : "Saiu"} de ${edge.fromLabel} para ${edge.toLabel}: ${formatBRL(edge.cents)}`;
  const pillWidth = (text: string) => Math.max(52, text.length * 7 + 16);
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

  {#each drawn.items as item (item.edge.id)}
    {@const active = touchesSelection(item.edge.fromKey, item.edge.toKey, item.edge.id)}
    {@const picked = selection?.type === "edge" && selection.id === item.edge.id}
    <g
      role="button"
      tabindex="0"
      aria-label={edgeLabel(item.edge)}
      aria-pressed={picked}
      class="cursor-pointer outline-none"
      onclick={() => select({ type: "edge", id: item.edge.id })}
      onkeydown={(event) => onKey(event, { type: "edge", id: item.edge.id })}
    >
      <path d={item.d} fill="none" stroke-width="14" class="stroke-transparent" />
      <path
        d={item.d}
        fill="none"
        stroke-width={picked ? 3.5 : 2}
        stroke-linecap="round"
        marker-end="url(#flow-arrow)"
        class={`transition-opacity ${item.stroke} ${active ? "opacity-100" : "opacity-20"}`}
      />
      {#if item.pill}
        <g class={`transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
          <rect x={item.pill.x - pillWidth(item.pill.text) / 2} y={item.pill.y - 11} width={pillWidth(item.pill.text)} height="22" rx="11" class="fill-card stroke-border" stroke-width="1" />
          <text x={item.pill.x} y={item.pill.y + 4} text-anchor="middle" class="fill-foreground text-xs font-medium">{item.pill.text}</text>
        </g>
      {/if}
    </g>
  {/each}

  <!-- fontes -->
  {#each layout.sources as box (box.key)}
    <g
      role="button"
      tabindex="0"
      aria-label={`${box.label}: ${formatBRL(box.outCents)}`}
      aria-pressed={selection?.type === "node" && selection.key === box.key}
      class={`cursor-pointer outline-none transition-opacity ${nodeActive(box.key) ? "opacity-100" : "opacity-40"}`}
      onclick={() => select({ type: "node", key: box.key })}
      onkeydown={(event) => onKey(event, { type: "node", key: box.key })}
    >
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" stroke-width="1" class="fill-income/10 stroke-income" />
      <text x={box.x + 14} y={box.y + 24} class="fill-foreground text-xs font-medium">{cut(box.label, 22)}</text>
      <text x={box.x + 14} y={box.y + 44} class="fill-muted-foreground text-xs">{formatBRL(box.outCents)}</text>
    </g>
  {/each}

  <!-- contas -->
  {#each layout.accounts as box, index (box.key)}
    {@const tone = ACCOUNT_TONES[index % ACCOUNT_TONES.length] ?? ACCOUNT_TONES[0]}
    <g
      role="button"
      tabindex="0"
      aria-label={`${box.label}: entrou ${formatBRL(box.inCents)}, gastou ${formatBRL(box.outCents)}`}
      aria-pressed={selection?.type === "node" && selection.key === box.key}
      class={`cursor-pointer outline-none transition-opacity ${nodeActive(box.key) ? "opacity-100" : "opacity-40"}`}
      onclick={() => select({ type: "node", key: box.key })}
      onkeydown={(event) => onKey(event, { type: "node", key: box.key })}
    >
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" stroke-width="1" class={tone.box} />
      <text x={box.x + 14} y={box.y + 24} class="fill-foreground text-xs font-medium">{cut(box.label, 24)}</text>
      {#if box.inCents > 0}
        <text x={box.x + 14} y={box.y + 46} class="fill-muted-foreground text-xs">Entrou {formatBRL(box.inCents)}</text>
        <text x={box.x + 14} y={box.y + 66} class="fill-muted-foreground text-xs">Gastou {formatBRL(box.outCents)}</text>
      {:else}
        <text x={box.x + 14} y={box.y + 46} class="fill-muted-foreground text-xs">Gastou {formatBRL(box.outCents)}</text>
      {/if}
    </g>
  {/each}

  <!-- destinos -->
  {#each layout.destinations as box (box.key)}
    <g
      role="button"
      tabindex="0"
      aria-label={`${box.label}: ${formatBRL(box.inCents)}, ${box.percent}% dos gastos`}
      aria-pressed={selection?.type === "node" && selection.key === box.key}
      class={`cursor-pointer outline-none transition-opacity ${nodeActive(box.key) ? "opacity-100" : "opacity-40"}`}
      onclick={() => select({ type: "node", key: box.key })}
      onkeydown={(event) => onKey(event, { type: "node", key: box.key })}
    >
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="8" stroke-width="1" class="fill-card stroke-border" />
      <rect x={box.x} y={box.y + 6} width="4" height={box.h - 12} rx="2" class="fill-expense" />
      <text x={box.x + 18} y={box.y + 20} class="fill-foreground text-xs font-medium">{cut(box.label, 20)}</text>
      <text x={box.x + 18} y={box.y + 36} class="fill-muted-foreground text-xs">{formatBRL(box.inCents)} · {box.percent}%</text>
      <rect x={box.x + 18} y={box.y + 42} width={DST_W - 34} height="3" rx="1.5" class="fill-muted" />
      <rect x={box.x + 18} y={box.y + 42} width={Math.max(2, ((DST_W - 34) * box.percent) / 100)} height="3" rx="1.5" class="fill-expense" />
    </g>
  {/each}

  <!-- metas: quanto foi guardado no mês; não saiu das contas, por isso sem seta -->
  {#if layout.goalBoxes.length > 0}
    <text x={DST_X} y={layout.goalsTop + 14} class="fill-muted-foreground text-xs">Guardado nas metas</text>
    {#each layout.goalBoxes as item (item.goal.goalId)}
      {@const net = item.goal.netCents}
      <g role="img" aria-label={`Meta ${item.goal.goalName}: ${net >= 0 ? "guardou" : "retirou"} ${formatBRL(Math.abs(net))} no mês`}>
        <rect x={DST_X} y={item.y} width={DST_W} height={DST_H} rx="8" stroke-width="1" stroke-dasharray="4 3" class="fill-card stroke-muted-foreground" />
        <text x={DST_X + 18} y={item.y + 20} class="fill-foreground text-xs font-medium">{cut(item.goal.goalName, 20)}</text>
        <text x={DST_X + 18} y={item.y + 38} class={`text-xs ${net >= 0 ? "fill-income" : "fill-expense"}`}>
          {net >= 0 ? "+" : "−"}{formatBRL(Math.abs(net))} no mês
        </text>
      </g>
    {/each}
  {/if}
</svg>

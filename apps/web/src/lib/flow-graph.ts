import type { MoneyFlowEdge } from "@finance/database";

export interface FlowNode {
  key: string;
  label: string;
  /** O que chegou a este ponto. */
  inCents: number;
  /** O que saiu deste ponto. */
  outCents: number;
  /** Só nos destinos: a parte de todo o gasto do mês, em percentual inteiro. */
  percent: number;
}

export interface FlowGraph {
  sources: FlowNode[];
  accounts: FlowNode[];
  destinations: FlowNode[];
  /** Movimento entre contas suas: não é gasto e não entra nas caixas. */
  transfers: MoneyFlowEdge[];
  /** Todos os trechos, inclusive transferências, para poder escolher qualquer um. */
  edges: MoneyFlowEdge[];
}

export type FlowSelection = { type: "edge"; id: string } | { type: "node"; key: string };

const FIXED_DESTINATIONS = new Set(["dest:extra", "dest:bills"]);
const OTHERS_KEY = "dest:other";

/**
 * Monta o grafo a partir dos trechos do mês: fontes à esquerda, contas no meio, destinos à direita. Com mais destinos
 * que `maxDestinations`, os menores viram "Outros" (Despesas extras e Contas a pagar nunca se juntam).
 */
export function buildFlowGraph(input: MoneyFlowEdge[], options: { maxDestinations?: number } = {}): FlowGraph {
  const edges = groupSmallDestinations(input, options.maxDestinations ?? 6);
  const nodes = new Map<string, FlowNode>();
  const touch = (key: string, label: string): FlowNode => {
    let node = nodes.get(key);
    if (!node) {
      node = { key, label, inCents: 0, outCents: 0, percent: 0 };
      nodes.set(key, node);
    }
    return node;
  };
  for (const edge of edges) {
    if (edge.kind === "transfer") continue;
    touch(edge.fromKey, edge.fromLabel).outCents += edge.cents;
    touch(edge.toKey, edge.toLabel).inCents += edge.cents;
  }
  const column = (prefix: string) =>
    [...nodes.values()]
      .filter((node) => node.key.startsWith(prefix))
      .sort((a, b) => b.inCents + b.outCents - (a.inCents + a.outCents) || a.label.localeCompare(b.label, "pt-BR"));
  const accounts = column("account:");
  const destinations = orderDestinations(column("dest:"), edges, accounts);
  const spending = destinations.reduce((total, node) => total + node.inCents, 0);
  for (const node of destinations) node.percent = spending > 0 ? Math.round((node.inCents * 100) / spending) : 0;
  return {
    sources: column("source:"),
    accounts,
    destinations,
    transfers: edges.filter((edge) => edge.kind === "transfer"),
    edges,
  };
}

/**
 * Agrupa os destinos pela conta que mais os alimenta (na ordem das contas) e, dentro de cada conta, do maior para o
 * menor. Assim as linhas de uma mesma conta ficam juntas e se cruzam menos.
 */
function orderDestinations(destinations: FlowNode[], edges: MoneyFlowEdge[], accounts: FlowNode[]): FlowNode[] {
  const rank = new Map(accounts.map((account, index) => [account.key, index]));
  const owner = new Map<string, number>();
  for (const node of destinations) {
    let best = -1;
    let bestRank = Number.MAX_SAFE_INTEGER;
    for (const edge of edges) {
      if (edge.kind !== "expense" || edge.toKey !== node.key) continue;
      if (edge.cents > best || (edge.cents === best && (rank.get(edge.fromKey) ?? 0) < bestRank)) {
        best = edge.cents;
        bestRank = rank.get(edge.fromKey) ?? 0;
      }
    }
    owner.set(node.key, bestRank);
  }
  return [...destinations].sort(
    (a, b) => (owner.get(a.key) ?? 0) - (owner.get(b.key) ?? 0) || b.inCents - a.inCents || a.label.localeCompare(b.label, "pt-BR"),
  );
}

function groupSmallDestinations(edges: MoneyFlowEdge[], maxDestinations: number): MoneyFlowEdge[] {
  const totals = new Map<string, number>();
  for (const edge of edges) if (edge.toKey.startsWith("dest:")) totals.set(edge.toKey, (totals.get(edge.toKey) ?? 0) + edge.cents);
  const fixed = [...totals.keys()].filter((key) => FIXED_DESTINATIONS.has(key));
  const regular = [...totals.entries()].filter(([key]) => !FIXED_DESTINATIONS.has(key)).sort((a, b) => b[1] - a[1]);
  const slots = Math.max(1, maxDestinations - fixed.length);
  if (regular.length <= slots) return edges;

  const grouped = new Set(regular.slice(slots - 1).map(([key]) => key));
  const merged = new Map<string, MoneyFlowEdge>();
  const result: MoneyFlowEdge[] = [];
  for (const edge of edges) {
    if (!grouped.has(edge.toKey)) {
      result.push(edge);
      continue;
    }
    const id = `${edge.kind}:${edge.fromKey}>${OTHERS_KEY}`;
    const current = merged.get(id);
    if (current) {
      current.cents += edge.cents;
      current.transactionIds = [...current.transactionIds, ...edge.transactionIds];
    } else {
      const created: MoneyFlowEdge = { ...edge, id, toKey: OTHERS_KEY, toLabel: "Outros", transactionIds: [...edge.transactionIds] };
      merged.set(id, created);
      result.push(created);
    }
  }
  return result;
}

/** As Transactions por trás de um trecho ou de uma caixa (sem repetir). */
export function transactionIdsOf(graph: FlowGraph, selection: FlowSelection): number[] {
  if (selection.type === "edge") return graph.edges.find((edge) => edge.id === selection.id)?.transactionIds ?? [];
  const ids = new Set<number>();
  for (const edge of graph.edges) {
    if (edge.fromKey === selection.key || edge.toKey === selection.key) for (const id of edge.transactionIds) ids.add(id);
  }
  return [...ids];
}

/** Espessura da seta, de 2 a 14, proporcional ao maior trecho (conta em inteiros). */
export function edgeWidth(cents: number, maxCents: number): number {
  if (cents <= 0 || maxCents <= 0) return 2;
  return 2 + Math.round((12 * Math.min(cents, maxCents)) / maxCents);
}

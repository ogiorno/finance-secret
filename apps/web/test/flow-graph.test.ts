import { describe, expect, it } from "vitest";
import type { MoneyFlowEdge } from "@finance/database";
import { buildFlowGraph, edgeWidth, transactionIdsOf } from "../src/lib/flow-graph";

let nextId = 1;
const edge = (kind: MoneyFlowEdge["kind"], from: [string, string], to: [string, string], cents: number): MoneyFlowEdge => ({
  id: `${kind}:${from[0]}>${to[0]}`,
  kind,
  fromKey: from[0],
  fromLabel: from[1],
  toKey: to[0],
  toLabel: to[1],
  cents,
  transactionIds: [nextId++],
});

const me: [string, string] = ["source:1", "Eu"];
const wife: [string, string] = ["source:2", "Esposa"];
const checking: [string, string] = ["account:1", "Conta corrente"];
const card: [string, string] = ["account:2", "Cartão"];
const dest = (id: number, name: string): [string, string] => [`dest:category:${id}`, name];

describe("buildFlowGraph", () => {
  const edges = [
    edge("income", me, checking, 500000),
    edge("income", wife, checking, 250000),
    edge("expense", checking, ["dest:bills", "Contas a pagar"], 180000),
    edge("expense", card, dest(1, "Mercado"), 52200),
    edge("expense", checking, dest(2, "Saúde"), 17500),
    edge("transfer", checking, card, 65000),
  ];

  it("splits the nodes into sources, accounts and destinations, biggest first", () => {
    const graph = buildFlowGraph(edges);

    expect(graph.sources.map((node) => node.label)).toEqual(["Eu", "Esposa"]);
    expect(graph.accounts.map((node) => node.label)).toEqual(["Conta corrente", "Cartão"]);
    expect(graph.destinations.map((node) => node.label)).toEqual(["Contas a pagar", "Mercado", "Saúde"]);
  });

  it("totals what each node received and sent, in whole cents", () => {
    const graph = buildFlowGraph(edges);
    const account = (label: string) => graph.accounts.find((node) => node.label === label);

    expect(graph.sources[0]).toMatchObject({ inCents: 0, outCents: 500000 });
    expect(account("Conta corrente")).toMatchObject({ inCents: 750000, outCents: 180000 + 17500 + 65000 });
    expect(account("Cartão")).toMatchObject({ inCents: 65000, outCents: 52200 });
    expect(graph.destinations.find((node) => node.label === "Mercado")).toMatchObject({ inCents: 52200, outCents: 0 });
  });

  it("keeps transfers as their own kind of edge, not as spending", () => {
    const graph = buildFlowGraph(edges);

    expect(graph.edges.filter((candidate) => candidate.kind === "transfer")).toHaveLength(1);
    expect(graph.destinations.some((node) => node.label === "Cartão")).toBe(false);
  });

  it("groups the smallest destinations into Outros once there are too many, keeping extras and bills", () => {
    const many = [
      edge("expense", checking, ["dest:extra", "Despesas extras"], 100),
      edge("expense", checking, ["dest:bills", "Contas a pagar"], 200),
      ...Array.from({ length: 6 }, (_, index) => edge("expense", checking, dest(index + 1, `Categoria ${index + 1}`), (index + 1) * 1000)),
    ];

    const graph = buildFlowGraph(many, { maxDestinations: 5 });
    const labels = graph.destinations.map((node) => node.label);

    expect(labels).toContain("Despesas extras");
    expect(labels).toContain("Contas a pagar");
    expect(labels).toContain("Outros");
    expect(graph.destinations).toHaveLength(5);
    const others = graph.destinations.find((node) => node.label === "Outros");
    const total = many.reduce((sum, candidate) => sum + candidate.cents, 0);
    expect(graph.destinations.reduce((sum, node) => sum + node.inCents, 0)).toBe(total);
    expect(others?.inCents).toBe(1000 + 2000 + 3000 + 4000);
    expect(transactionIdsOf(graph, { type: "node", key: "dest:other" })).toHaveLength(4);
  });

  it("does not group when everything fits", () => {
    expect(buildFlowGraph(edges, { maxDestinations: 6 }).destinations.some((node) => node.label === "Outros")).toBe(false);
  });

  it("handles a month with nothing", () => {
    expect(buildFlowGraph([])).toEqual({ sources: [], accounts: [], destinations: [], edges: [] });
  });
});

describe("transactionIdsOf", () => {
  const edges = [
    edge("income", me, checking, 500000),
    edge("expense", checking, dest(1, "Mercado"), 100),
    edge("expense", card, dest(1, "Mercado"), 200),
  ];

  it("returns the transactions of one edge", () => {
    const graph = buildFlowGraph(edges);
    const target = graph.edges.find((candidate) => candidate.fromKey === "account:2");

    expect(transactionIdsOf(graph, { type: "edge", id: target?.id ?? "" })).toEqual(target?.transactionIds);
  });

  it("returns every transaction touching a node, without repeats", () => {
    const graph = buildFlowGraph(edges);

    expect(transactionIdsOf(graph, { type: "node", key: "dest:category:1" })).toHaveLength(2);
    expect(new Set(transactionIdsOf(graph, { type: "node", key: "account:1" })).size).toBe(2);
  });

  it("returns nothing for an unknown selection", () => {
    expect(transactionIdsOf(buildFlowGraph(edges), { type: "node", key: "nope" })).toEqual([]);
  });
});

describe("edgeWidth", () => {
  it("grows with the amount but stays within the bounds", () => {
    expect(edgeWidth(100, 1000)).toBeGreaterThan(edgeWidth(10, 1000));
    expect(edgeWidth(0, 1000)).toBe(2);
    expect(edgeWidth(1000, 1000)).toBe(14);
    expect(edgeWidth(5, 0)).toBe(2);
  });
});

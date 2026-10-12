<script lang="ts">
  import { BarChart } from "echarts/charts";
  import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
  import * as echarts from "echarts/core";
  import { CanvasRenderer } from "echarts/renderers";
  import { formatBRL } from "@finance/ui";
  import { onMount } from "svelte";
  import { tokenColor } from "./chart-colors";

  export type CashFlowMonth = {
    month: string;
    label: string;
    incomeCents: number;
    expenseCents: number;
  };

  let { data }: { data: CashFlowMonth[] } = $props();
  let element: HTMLDivElement;
  let chart: echarts.ECharts | undefined;
  const description = $derived(`Receitas e despesas por mês. ${data.map((item) =>
    `${item.label}: receitas ${formatBRL(item.incomeCents)}, despesas ${formatBRL(item.expenseCents)}`,
  ).join("; ")}. Os mesmos valores estão na tabela abaixo.`);

  echarts.use([BarChart, GridComponent, LegendComponent, TooltipComponent, AriaComponent, CanvasRenderer]);

  function render() {
    if (!chart) return;
    const income = tokenColor("--income");
    const expense = tokenColor("--expense");
    const foreground = tokenColor("--foreground");
    const muted = tokenColor("--muted-foreground");
    const border = tokenColor("--border");

    chart.setOption({
      color: [income, expense],
      aria: { enabled: true, description, decal: { show: true } },
      grid: { left: 8, right: 8, top: 38, bottom: 22, containLabel: true },
      legend: { top: 0, textStyle: { color: foreground }, data: ["Receitas", "Despesas"] },
      tooltip: {
        trigger: "axis",
        formatter: (params: Array<{ axisValue: string; seriesName: string; value: number }>) =>
          params.length ? [params[0]?.axisValue ?? "", ...params.map((part) => `${part.seriesName}: ${formatBRL(part.value)}`)].join("<br/>") : "",
      },
      xAxis: { type: "category", data: data.map((item) => item.label), axisLabel: { color: muted }, axisLine: { lineStyle: { color: border } }, axisTick: { show: false } },
      yAxis: {
        type: "value",
        min: 0,
        splitLine: { lineStyle: { color: border } },
        axisLabel: { color: muted, formatter: (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(cents / 100) },
      },
      series: [
        { name: "Receitas", type: "bar", barMaxWidth: 28, data: data.map((item) => item.incomeCents) },
        { name: "Despesas", type: "bar", barMaxWidth: 28, data: data.map((item) => item.expenseCents) },
      ],
    }, true);
  }

  onMount(() => {
    chart = echarts.init(element);
    render();
    const resize = new ResizeObserver(() => chart?.resize());
    resize.observe(element);
    const theme = new MutationObserver(render);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      resize.disconnect();
      theme.disconnect();
      chart?.dispose();
    };
  });

  $effect(() => {
    void data;
    render();
  });
</script>

<div bind:this={element} class="h-64 w-full" role="img" aria-label={description}></div>

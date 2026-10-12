<script lang="ts">
  import { LineChart } from "echarts/charts";
  import { AriaComponent, GridComponent, TooltipComponent } from "echarts/components";
  import * as echarts from "echarts/core";
  import { CanvasRenderer } from "echarts/renderers";
  import { formatBRL } from "@finance/ui";
  import { onMount } from "svelte";
  import { tokenColor } from "./chart-colors";

  echarts.use([LineChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer]);

  /** Acumulados por dia, a partir de zero no dia 1; `null` depois de hoje, no mês corrente. */
  let { days, income, expense }: { days: number[]; income: (number | null)[]; expense: (number | null)[] } = $props();

  let element: HTMLDivElement;
  let chart: echarts.ECharts | undefined;

  const summary = $derived(
    `Receitas e despesas acumuladas por dia. Receitas: ${formatBRL(income.findLast((v) => v !== null) ?? 0)}. Despesas: ${formatBRL(expense.findLast((v) => v !== null) ?? 0)}.`,
  );

  function render() {
    if (!chart) return;
    const incomeColor = tokenColor("--income");
    const expenseColor = tokenColor("--expense");
    const muted = tokenColor("--muted-foreground");
    const grid = tokenColor("--border");
    const area = (color: string) => ({
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: color.replace(/[\d.]+\)$/, "0.22)") },
        { offset: 1, color: color.replace(/[\d.]+\)$/, "0)") },
      ]),
    });
    chart.setOption(
      {
        aria: { enabled: true },
        animationDuration: 1100,
        animationEasing: "cubicOut",
        grid: { left: 8, right: 12, top: 12, bottom: 4, containLabel: true },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "line", lineStyle: { color: grid } },
          backgroundColor: tokenColor("--popover"),
          borderColor: grid,
          textStyle: { color: tokenColor("--foreground") },
          formatter: (params: { seriesName: string; value: number | null; marker: string; axisValue: string }[]) =>
            `Dia ${params[0]?.axisValue}<br/>` +
            params.map((p) => `${p.marker} ${p.seriesName}: ${formatBRL(p.value ?? 0)}`).join("<br/>"),
        },
        xAxis: {
          type: "category",
          data: days,
          boundaryGap: false,
          axisLine: { lineStyle: { color: grid } },
          axisTick: { show: false },
          axisLabel: { color: muted, interval: "auto" },
        },
        yAxis: {
          type: "value",
          min: 0,
          splitNumber: 4,
          axisLabel: { color: muted, formatter: (v: number) => (v === 0 ? "0" : `${Math.round(v / 10000) / 10} mil`) },
          splitLine: { lineStyle: { color: grid, type: "dashed" } },
        },
        series: [
          {
            name: "Receitas",
            type: "line",
            data: income,
            smooth: 0.3,
            showSymbol: false,
            lineStyle: { width: 2.5, color: incomeColor },
            itemStyle: { color: incomeColor },
            areaStyle: area(incomeColor),
          },
          {
            name: "Despesas",
            type: "line",
            data: expense,
            smooth: 0.3,
            showSymbol: false,
            lineStyle: { width: 2.5, color: expenseColor, type: "dashed" },
            itemStyle: { color: expenseColor },
            areaStyle: area(expenseColor),
          },
        ],
      },
      true,
    );
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
    void days;
    void income;
    void expense;
    render();
  });
</script>

<div bind:this={element} class="h-72 w-full" role="img" aria-label={summary}></div>
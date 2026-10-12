<script lang="ts">
  import { PieChart } from "echarts/charts";
  import { AriaComponent, TooltipComponent } from "echarts/components";
  import * as echarts from "echarts/core";
  import { CanvasRenderer } from "echarts/renderers";
  import { formatBRL } from "@finance/ui";
  import { onMount } from "svelte";
  import { CHART_TOKENS, tokenColor } from "./chart-colors";

  echarts.use([PieChart, TooltipComponent, AriaComponent, CanvasRenderer]);

  let { data }: { data: { name: string; totalCents: number }[] } = $props();

  let element: HTMLDivElement;
  let chart: echarts.ECharts | undefined;
  const description = $derived(`Despesas por categoria. ${data.map((item) => `${item.name}: ${formatBRL(item.totalCents)}`).join("; ")}. Os mesmos valores estão na tabela ao lado.`);

  function render() {
    if (!chart) return;
    const foreground = tokenColor("--foreground");
    chart.setOption(
      {
        color: CHART_TOKENS.map(tokenColor),
        // Padrões (decal) além da cor: o gráfico não depende só de cor para ser lido.
        aria: {
          enabled: true,
          description,
          decal: { show: true },
        },
        tooltip: { trigger: "item", formatter: (p: { name: string; value: number }) => `${p.name}: ${formatBRL(p.value)}` },
        series: [
          {
            type: "pie",
            radius: ["50%", "78%"],
            label: { show: false },
            itemStyle: { borderColor: tokenColor("--card"), borderWidth: 2 },
            data: data.map((item) => ({ name: item.name, value: item.totalCents })),
            emphasis: { label: { show: true, color: foreground } },
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
    // Reaplica as cores quando o tema claro/escuro muda.
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

<div bind:this={element} class="h-56 w-full" role="img" aria-label={description}></div>

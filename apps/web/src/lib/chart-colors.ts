/**
 * Resolve um token do tema (ex.: "--chart-1") para uma cor que o ECharts entende.
 * Os tokens são oklch(); o canvas converte para sRGB ao desenhar um pixel.
 */
export function tokenColor(token: string): string {
  const css = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return css;
  context.fillStyle = css;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${(a ?? 255) / 255})`;
}

export const CHART_TOKENS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6"] as const;

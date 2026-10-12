<script lang="ts">
  import Money from "./Money.svelte";

  let {
    cents,
    duration = 900,
    ...rest
  }: Omit<import("svelte/elements").HTMLAttributes<HTMLSpanElement>, "children"> & {
    cents: number;
    /** Milissegundos da contagem; sem animação quando o sistema pede menos movimento. */
    duration?: number;
    tone?: "auto" | "income" | "expense" | "neutral";
    showSign?: boolean;
  } = $props();

  let shown = $state(0);

  $effect(() => {
    const target = cents;
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || duration <= 0) {
      shown = target;
      return;
    }
    const from = shown;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      shown = Math.round(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

<Money cents={shown} {...rest} />
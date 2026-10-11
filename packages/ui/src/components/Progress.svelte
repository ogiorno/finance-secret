<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let {
    class: className,
    value,
    max = 100,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & { value: number; max?: number } = $props();

  const percent = $derived(max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0);
</script>

<div
  data-slot="progress"
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuenow={value}
  class={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
  {...rest}
>
  <div class="h-full bg-primary transition-all" style:width="{percent}%"></div>
</div>

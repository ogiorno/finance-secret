<script lang="ts">
  import type { HTMLSelectAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, value = $bindable(), children, ...rest }: HTMLSelectAttributes = $props();
</script>

<select
  data-slot="native-select"
  class={cn(
    "h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive",
    className,
  )}
  bind:value
  {...rest}
>
  {@render children?.()}
</select>

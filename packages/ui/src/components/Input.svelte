<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, value = $bindable(), ...rest }: HTMLInputAttributes = $props();
</script>

<input
  data-slot="input"
  class={cn(
    "h-control w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive",
    className,
  )}
  bind:value
  {...rest}
/>

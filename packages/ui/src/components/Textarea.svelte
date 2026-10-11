<script lang="ts">
  import type { HTMLTextareaAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, value = $bindable(), ...rest }: HTMLTextareaAttributes = $props();
</script>

<textarea
  data-slot="textarea"
  class={cn(
    "min-h-16 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive",
    className,
  )}
  bind:value
  {...rest}
></textarea>

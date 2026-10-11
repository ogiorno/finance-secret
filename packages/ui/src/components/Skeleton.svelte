<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div data-slot="skeleton" aria-hidden="true" class={cn("animate-pulse rounded-md bg-muted", className)} {...rest}></div>

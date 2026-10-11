<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";
  import Card from "./Card.svelte";

  let {
    class: className,
    label,
    children,
    hint,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    label: string;
    /** O valor principal (normalmente um <Money />). */
    children: Snippet;
    /** Texto de apoio abaixo do valor. */
    hint?: Snippet;
  } = $props();
</script>

<Card class={cn("gap-1", className)} data-slot="kpi" {...rest}>
  <div class="px-5 text-sm text-muted-foreground">{label}</div>
  <div class="px-5 text-lg font-semibold sm:text-2xl">{@render children()}</div>
  {#if hint}
    <div class="px-5 text-xs text-muted-foreground">{@render hint()}</div>
  {/if}
</Card>

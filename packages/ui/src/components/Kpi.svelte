<script lang="ts">
  import type { Component, Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";
  import Card from "./Card.svelte";
  import IconChip, { type IconChipTone } from "./IconChip.svelte";

  type Icon = Component<{ class?: string; "aria-hidden"?: boolean | "true" | "false" }>;

  let {
    class: className,
    label,
    icon,
    tone = "muted",
    children,
    trend,
    hint,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    label: string;
    /** Ícone ao lado do rótulo. */
    icon?: Icon;
    tone?: IconChipTone;
    /** O valor principal (normalmente um <Money /> ou <CountUp />). */
    children: Snippet;
    /** Etiqueta de variação, por exemplo "+12%". */
    trend?: Snippet;
    /** Texto de apoio abaixo do valor. */
    hint?: Snippet;
  } = $props();
</script>

<Card class={cn("gap-1 transition-shadow hover:shadow-md", className)} data-slot="kpi" {...rest}>
  <div class="flex items-center justify-between gap-2 px-5 text-sm text-muted-foreground">
    <span class="flex items-center gap-2">
      {#if icon}<IconChip {icon} {tone} size="sm" />{/if}
      {label}
    </span>
    {#if trend}{@render trend()}{/if}
  </div>
  <div class="px-5 pt-1 text-xl font-semibold tabular-nums sm:text-2xl">{@render children()}</div>
  {#if hint}
    <div class="px-5 text-xs text-muted-foreground">{@render hint()}</div>
  {/if}
</Card>
<script lang="ts">
  import type { Component } from "svelte";
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let {
    class: className,
    label,
    icon: Icon,
    active = false,
    layout = "side",
    badge,
    ...rest
  }: Omit<HTMLAnchorAttributes, "children"> & {
    label: string;
    icon?: Component<{ class?: string; "aria-hidden"?: boolean | "true" | "false" }>;
    active?: boolean;
    /** "side" é o item do menu lateral; "bottom" é o item da barra do celular. */
    layout?: "side" | "bottom";
    /** Texto de apoio que marca o item com um ponto (por exemplo, alterações pendentes). */
    badge?: string;
  } = $props();
</script>

<a
  data-slot="nav-link"
  aria-current={active ? "page" : undefined}
  class={cn(
    "relative flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring",
    layout === "side"
      ? "gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
      : "min-h-control flex-1 flex-col justify-center gap-0.5 px-1 py-2 text-center text-xs font-medium text-muted-foreground aria-[current=page]:text-primary",
    className,
  )}
  {...rest}
>
  {#if Icon}<Icon class="size-4 shrink-0" aria-hidden="true" />{/if}
  <span>{label}</span>
  {#if badge}
    <span class="size-2 rounded-full bg-warning" aria-hidden="true"></span>
    <span class="sr-only">{badge}</span>
  {/if}
</a>
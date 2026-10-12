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
    disabledHint,
    ...rest
  }: Omit<HTMLAnchorAttributes, "children"> & {
    label: string;
    icon?: Component<{ class?: string; "aria-hidden"?: boolean | "true" | "false" }>;
    active?: boolean;
    /** "side" é o item do menu lateral; "bottom" é o item da barra do celular. */
    layout?: "side" | "bottom";
    /** Texto de apoio que marca o item com um ponto (por exemplo, alterações pendentes). */
    badge?: string;
    /** Quando informado, o item aparece desabilitado e esta é a explicação ("Em breve"). */
    disabledHint?: string;
  } = $props();

  const base = "relative flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const side =
    "gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground";
  const bottom =
    "min-h-control flex-1 flex-col justify-center gap-0.5 px-1 py-2 text-center text-xs font-medium text-muted-foreground aria-[current=page]:text-primary";
</script>

{#if disabledHint}
  <span
    data-slot="nav-link"
    aria-disabled="true"
    title={disabledHint}
    class={cn(base, layout === "side" ? side : bottom, "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground", className)}
  >
    {#if Icon}<Icon class="size-4.5 shrink-0" aria-hidden="true" />{/if}
    <span class="truncate">{label}</span>
    <span class="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs leading-none font-medium whitespace-nowrap">{disabledHint}</span>
  </span>
{:else}
  <a
    data-slot="nav-link"
    aria-current={active ? "page" : undefined}
    title={label}
    class={cn(base, layout === "side" ? side : bottom, className)}
    {...rest}
  >
    {#if Icon}<Icon class="size-4.5 shrink-0" aria-hidden="true" />{/if}
    <span>{label}</span>
    {#if badge}
      <span class="size-2 rounded-full bg-warning" aria-hidden="true"></span>
      <span class="sr-only">{badge}</span>
    {/if}
  </a>
{/if}
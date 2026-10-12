<script lang="ts" module>
  import type { Component } from "svelte";

  export type AppNavItem = {
    href: string;
    label: string;
    /** Rótulo curto da barra do celular. */
    shortLabel?: string;
    icon?: Component<{ class?: string; "aria-hidden"?: boolean | "true" | "false" }>;
    /** Marca o item com um ponto e este texto para leitores de tela. */
    badge?: string;
    /** Item ainda indisponível: aparece desabilitado com esta explicação ("Em breve"). */
    disabledHint?: string;
  };

  export type AppNavSection = { title?: string; items: AppNavItem[] };
</script>

<script lang="ts">
  import { Coins } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import NavLink from "./NavLink.svelte";

  let {
    brand,
    sections,
    pathname,
    topbar,
    sidebarBottom,
    banner,
    children,
  }: {
    brand: string;
    sections: AppNavSection[];
    /** Caminho atual, para marcar o item ativo. */
    pathname: string;
    /** Barra fixa no topo da área de conteúdo (seletor de banco, mês...). */
    topbar?: Snippet;
    sidebarBottom?: Snippet;
    /** Faixa de aviso acima do conteúdo. */
    banner?: Snippet;
    children: Snippet;
  } = $props();

  function isActive(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  /** A barra do celular mostra só os itens disponíveis, no máximo cinco. */
  const mobileItems = $derived(sections.flatMap((section) => section.items).filter((item) => !item.disabledHint).slice(0, 5));
</script>

<div data-slot="app-shell" class="min-h-screen md:flex">
  <aside class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r bg-sidebar p-4 md:flex">
    <div class="mb-4 flex items-center gap-2.5 px-2">
      <span class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Coins class="size-4.5" aria-hidden="true" />
      </span>
      <span class="text-base font-semibold">{brand}</span>
    </div>
    {#each sections as section, index (section.title ?? index)}
      <nav aria-label={section.title ?? "Principal"} class="flex flex-col gap-0.5">
        {#if section.title}
          <div class="px-3 pt-4 pb-1 text-xs font-medium text-muted-foreground">{section.title}</div>
        {/if}
        {#each section.items as item (item.href)}
          <NavLink
            href={item.disabledHint ? undefined : item.href}
            label={item.label}
            icon={item.icon}
            badge={item.badge}
            disabledHint={item.disabledHint}
            active={isActive(item.href)}
          />
        {/each}
      </nav>
    {/each}
    {#if sidebarBottom}<div class="mt-auto pt-4">{@render sidebarBottom()}</div>{/if}
  </aside>

  <div class="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
    {#if topbar}
      <header class="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur md:px-8">
        {@render topbar()}
      </header>
    {/if}
    {#if banner}{@render banner()}{/if}
    <main class="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">
      {@render children()}
    </main>
  </div>

  <nav aria-label="Principal (celular)" class="fixed inset-x-0 bottom-0 z-40 flex border-t bg-sidebar md:hidden">
    {#each mobileItems as item (item.href)}
      <NavLink
        layout="bottom"
        href={item.href}
        label={item.shortLabel ?? item.label}
        icon={item.icon}
        badge={item.badge}
        active={isActive(item.href)}
      />
    {/each}
  </nav>
</div>
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
  };
</script>

<script lang="ts">
  import type { Snippet } from "svelte";
  import NavLink from "./NavLink.svelte";

  let {
    brand,
    items,
    pathname,
    sidebarTop,
    sidebarBottom,
    banner,
    children,
  }: {
    brand: string;
    items: AppNavItem[];
    /** Caminho atual, para marcar o item ativo. */
    pathname: string;
    /** Abaixo do nome do app: modo, banco ativo. */
    sidebarTop?: Snippet;
    sidebarBottom?: Snippet;
    /** Faixa de aviso acima do conteúdo. */
    banner?: Snippet;
    children: Snippet;
  } = $props();

  function isActive(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }
</script>

<div data-slot="app-shell" class="min-h-screen md:flex">
  <aside class="hidden w-56 shrink-0 flex-col gap-1 border-r bg-card p-4 md:flex">
    <div class="px-2 text-section-title font-semibold">{brand}</div>
    {#if sidebarTop}<div class="mb-3 px-2">{@render sidebarTop()}</div>{/if}
    <nav aria-label="Principal" class="flex flex-col gap-1">
      {#each items as item (item.href)}
        <NavLink href={item.href} label={item.label} icon={item.icon} badge={item.badge} active={isActive(item.href)} />
      {/each}
    </nav>
    {#if sidebarBottom}<div class="mt-auto">{@render sidebarBottom()}</div>{/if}
  </aside>

  <div class="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
    {#if banner}{@render banner()}{/if}
    <main class="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">
      {@render children()}
    </main>
  </div>

  <nav aria-label="Principal (celular)" class="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card md:hidden">
    {#each items as item (item.href)}
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
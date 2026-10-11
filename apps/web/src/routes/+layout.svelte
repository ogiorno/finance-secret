<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { Alert, Button, getStoredTheme, setTheme } from "@finance/ui";
  import { session } from "$lib/session.svelte";

  let { children } = $props();

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/transactions", label: "Transações" },
    { href: "/accounts", label: "Contas" },
    { href: "/backup", label: "Importar e exportar" },
  ];

  let theme = $state<"light" | "dark">("light");
  $effect(() => {
    theme = (document.documentElement.getAttribute("data-theme") as "light" | "dark" | null) ?? getStoredTheme() ?? "light";
  });

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    setTheme(theme);
  }

  function isActive(href: string): boolean {
    return href === "/" ? page.url.pathname === "/" : page.url.pathname.startsWith(href);
  }
</script>

<svelte:window
  onbeforeunload={(event) => {
    if (session.dirty) event.preventDefault();
  }}
/>

<div class="min-h-screen md:flex">
  <aside class="hidden w-56 shrink-0 flex-col gap-1 border-r bg-card p-4 md:flex">
    <div class="mb-4 px-2 text-lg font-semibold">Finanças</div>
    <nav aria-label="Principal" class="flex flex-col gap-1">
      {#each links as link (link.href)}
        <a
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          class="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
          >{link.label}</a
        >
      {/each}
    </nav>
    <div class="mt-auto">
      <Button variant="ghost" size="sm" onclick={toggleTheme} aria-label="Alternar tema claro e escuro">
        Tema: {theme === "dark" ? "escuro" : "claro"}
      </Button>
    </div>
  </aside>

  <div class="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
    {#if session.dirty}
      <Alert variant="warning" class="rounded-none border-x-0 border-t-0">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span>Há alterações que ainda não foram exportadas. Se você fechar a página, elas serão perdidas.</span>
          <Button size="sm" onclick={() => session.exportFile()}>Exportar agora</Button>
        </div>
      </Alert>
    {/if}
    <main class="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">
      {@render children()}
    </main>
  </div>

  <nav aria-label="Principal (celular)" class="fixed inset-x-0 bottom-0 flex border-t bg-card md:hidden">
    {#each links as link (link.href)}
      <a
        href={link.href}
        aria-current={isActive(link.href) ? "page" : undefined}
        class="flex-1 px-1 py-3 text-center text-xs font-medium text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:text-primary"
        >{link.label}</a
      >
    {/each}
  </nav>
</div>

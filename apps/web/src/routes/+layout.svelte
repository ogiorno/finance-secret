<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { ArrowLeftRight, FileDown, LayoutDashboard, Wallet } from "@lucide/svelte";
  import { Alert, AppShell, Badge, Button, Toaster, getStoredTheme, setTheme, type AppNavItem } from "@finance/ui";
  import { session } from "$lib/session.svelte";

  let { children } = $props();

  const links = $derived<AppNavItem[]>([
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
    { href: "/accounts", label: "Contas", icon: Wallet },
    {
      href: "/backup",
      label: "Importar e exportar",
      shortLabel: "Arquivo",
      icon: FileDown,
      badge: session.dirty ? "alterações não exportadas" : undefined,
    },
  ]);

  let theme = $state<"light" | "dark">("light");
  $effect(() => {
    theme = (document.documentElement.getAttribute("data-theme") as "light" | "dark" | null) ?? getStoredTheme() ?? "light";
  });

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    setTheme(theme);
  }
</script>

<svelte:window
  onbeforeunload={(event) => {
    if (session.dirty) event.preventDefault();
  }}
/>

<AppShell brand="Finanças" items={links} pathname={page.url.pathname}>
  {#snippet sidebarTop()}
    <Badge variant="secondary">Modo offline</Badge>
  {/snippet}
  {#snippet sidebarBottom()}
    <Button variant="ghost" size="sm" onclick={toggleTheme} aria-label="Alternar tema claro e escuro">
      Tema: {theme === "dark" ? "escuro" : "claro"}
    </Button>
  {/snippet}
  {#snippet banner()}
    {#if session.dirty}
      <Alert variant="warning" class="rounded-none border-x-0 border-t-0">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span>Há alterações que ainda não foram exportadas. Se você fechar a página, elas serão perdidas.</span>
          <Button size="sm" onclick={() => session.exportFile()}>Exportar agora</Button>
        </div>
      </Alert>
    {/if}
  {/snippet}
  {@render children()}
</AppShell>

<Toaster />
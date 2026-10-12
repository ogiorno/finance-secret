<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import {
    ArrowLeftRight,
    ChevronDown,
    Database,
    DatabaseZap,
    FilePlus,
    FolderOpen,
    LayoutDashboard,
    Moon,
    Receipt,
    Repeat,
    Save,
    Sparkles,
    Sun,
    TableProperties,
    Target,
    Waypoints,
    Wallet,
  } from "@lucide/svelte";
  import { Alert, AppShell, Button, IconButton, Menu, MonthStepper, Toaster, getStoredTheme, setTheme, type AppNavSection } from "@finance/ui";
  import { period } from "$lib/period.svelte";
  import { session } from "$lib/session.svelte";

  let { children } = $props();

  const sections = $derived<AppNavSection[]>([
    {
      title: "Finanças",
      items: [
        { href: "/", label: "Painel", icon: LayoutDashboard },
        { href: "/transactions", label: "Lançamentos", shortLabel: "Lançar", icon: ArrowLeftRight },
        { href: "/accounts", label: "Contas", icon: Wallet },
        { href: "/bills", label: "A pagar e receber", shortLabel: "Fixas", icon: Repeat },
        { href: "/goals", label: "Metas", icon: Target },
        { href: "/flow", label: "Fluxo do dinheiro", shortLabel: "Fluxo", icon: Waypoints },
        { href: "/receipts", label: "Cupons", icon: Receipt, disabledHint: "Em breve" },
      ],
    },
    {
      title: "Banco de dados",
      items: [
        {
          href: "/backup",
          label: "Importar e exportar",
          shortLabel: "Arquivo",
          icon: Save,
          badge: session.dirty ? "alterações não exportadas" : undefined,
        },
        { href: "/editor", label: "Editor SQLite", icon: TableProperties, disabledHint: "Em breve" },
      ],
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

  let fileInput: HTMLInputElement;

  async function pick(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    await session.openFile(file);
    event.currentTarget.value = "";
  }

  const databaseItems = $derived([
    { label: "Abrir arquivo .db", icon: FolderOpen, onselect: () => fileInput.click() },
    { label: "Criar banco vazio", icon: FilePlus, onselect: () => void session.createNew() },
    { label: "Ver demonstração", icon: Sparkles, onselect: () => void session.openDemo() },
    ...(session.isOpen ? [{ label: "Exportar este banco", icon: Save, onselect: () => session.exportFile(), separated: true }] : []),
  ]);

  const showPeriod = $derived(session.isOpen && (page.url.pathname === "/" || page.url.pathname.startsWith("/transactions") || page.url.pathname.startsWith("/bills") || page.url.pathname.startsWith("/flow")));
</script>

<svelte:window
  onbeforeunload={(event) => {
    if (session.dirty) event.preventDefault();
  }}
/>

<AppShell brand="Finanças" {sections} pathname={page.url.pathname}>
  {#snippet topbar()}
    <Menu heading="Banco de dados" items={databaseItems}>
      {#snippet trigger()}
        <Database class="size-4 text-primary" aria-hidden="true" />
        <span class="max-w-40 truncate">{session.isOpen ? session.fileName : "Nenhum banco aberto"}</span>
        <ChevronDown class="size-4 text-muted-foreground" aria-hidden="true" />
      {/snippet}
    </Menu>
    {#if session.dirty}
      <span class="flex items-center gap-1.5 text-xs text-warning">
        <DatabaseZap class="size-3.5" aria-hidden="true" />
        Não exportado
      </span>
    {/if}
    <div class="ml-auto flex items-center gap-2">
      {#if showPeriod}<MonthStepper bind:value={period.month} />{/if}
      <IconButton icon={theme === "dark" ? Sun : Moon} label="Alternar tema claro e escuro" onclick={toggleTheme} />
    </div>
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

<input bind:this={fileInput} type="file" accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3" class="hidden" onchange={pick} data-testid="file-input-menu" />

<Toaster />
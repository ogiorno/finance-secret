<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
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
    Repeat,
    Save,
    Settings,
    Sparkles,
    Sun,
    TableProperties,
    Target,
    TrendingUp,
    Waypoints,
    Wallet,
  } from "@lucide/svelte";
  import { Alert, AppShell, Button, IconButton, Menu, MonthStepper, NavLink, Toaster, type AppNavSection } from "@finance/ui";
  import ImportCompareDialog from "$lib/ImportCompareDialog.svelte";
  import { period } from "$lib/period.svelte";
  import { session } from "$lib/session.svelte";
  import { appTheme } from "$lib/theme.svelte";

  let { children } = $props();

  // Reabre o banco guardado neste navegador, para atualizar a página não perder nada.
  onMount(() => void session.restore());

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
        { href: "/projections", label: "Projeções", shortLabel: "Projeção", icon: TrendingUp },
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
          badge: session.dirty ? "só neste navegador" : undefined,
        },
        { href: "/editor", label: "Editor SQLite", icon: TableProperties, disabledHint: "Em breve" },
      ],
    },
  ]);

  onMount(() => appTheme.sync());

  let fileInput: HTMLInputElement;

  async function pick(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    await session.stageFile(file);
    input.value = "";
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
  onpagehide={() => session.flush()}
  onbeforeunload={(event) => {
    // Só avisa quando o navegador não conseguiu guardar o banco: aí fechar ou atualizar perde as alterações.
    if (session.dirty && session.persistFailed) event.preventDefault();
  }}
/>

<AppShell brand="Finanças" {sections} pathname={page.url.pathname}>
  {#snippet sidebarBottom()}
    <NavLink href="/settings" label="Configurações" icon={Settings} active={page.url.pathname.startsWith("/settings")} />
  {/snippet}
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
        {session.persistFailed ? "Não salvo" : "Só neste navegador"}
      </span>
    {/if}
    <div class="ml-auto flex items-center gap-2">
      {#if showPeriod}<MonthStepper bind:value={period.month} />{/if}
      <IconButton icon={appTheme.value === "dark" ? Sun : Moon} label="Alternar tema claro e escuro" onclick={() => appTheme.toggle()} />
      <IconButton class="md:hidden" icon={Settings} label="Configurações" href="/settings" />
    </div>
  {/snippet}
  {#snippet banner()}
    {#if session.dirty}
      <Alert variant="warning" class="rounded-none border-x-0 border-t-0">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span>
            {#if session.persistFailed}
              O navegador não conseguiu guardar o banco. Se você fechar ou atualizar a página, as alterações serão perdidas: exporte um arquivo.
            {:else}
              Suas alterações ficam guardadas neste navegador e sobrevivem a atualizar a página, mas ainda não existe um arquivo. Exporte para ter uma cópia.
            {/if}
          </span>
          <Button size="sm" onclick={() => session.exportFile()}>Exportar agora</Button>
        </div>
      </Alert>
    {/if}
  {/snippet}
  {@render children()}
</AppShell>

<input bind:this={fileInput} type="file" accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3" class="hidden" onchange={pick} data-testid="file-input-menu" />

<ImportCompareDialog />

<Toaster />
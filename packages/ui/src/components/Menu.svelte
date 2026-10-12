<script lang="ts" module>
  import type { Component } from "svelte";

  export type MenuItem = {
    label: string;
    icon?: Component<{ class?: string; "aria-hidden"?: boolean | "true" | "false" }>;
    onselect: () => void;
    disabled?: boolean;
    /** Linha separadora antes deste item. */
    separated?: boolean;
  };
</script>

<script lang="ts">
  import { DropdownMenu } from "bits-ui";
  import type { Snippet } from "svelte";
  import { cn } from "../cn";

  let {
    class: className,
    trigger,
    heading,
    items,
    align = "start",
  }: {
    class?: string;
    /** O conteúdo do botão que abre o menu. */
    trigger: Snippet;
    /** Título pequeno no topo do menu. */
    heading?: string;
    items: MenuItem[];
    align?: "start" | "center" | "end";
  } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    data-slot="menu-trigger"
    class={cn(
      "flex items-center gap-2 rounded-full border border-input bg-card px-3 py-1.5 text-sm font-medium shadow-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
  >
    {@render trigger()}
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      {align}
      sideOffset={6}
      class="z-50 min-w-52 rounded-xl border bg-popover p-1 text-popover-foreground shadow-md animate-fade"
    >
      {#if heading}
        <div class="px-2.5 py-1.5 text-xs text-muted-foreground">{heading}</div>
      {/if}
      {#each items as item (item.label)}
        {#if item.separated}<DropdownMenu.Separator class="my-1 h-px bg-border" />{/if}
        <DropdownMenu.Item
          disabled={item.disabled}
          onSelect={item.onselect}
          class="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
        >
          {#if item.icon}{@const Glyph = item.icon}<Glyph class="size-4 shrink-0" aria-hidden="true" />{/if}
          {item.label}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
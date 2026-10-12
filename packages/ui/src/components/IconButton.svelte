<script lang="ts">
  import type { Component } from "svelte";
  import Button, { type ButtonVariant } from "./Button.svelte";

  type Icon = Component<{ class?: string; "aria-hidden"?: boolean | "true" | "false" }>;

  let {
    icon: Glyph,
    label,
    variant = "ghost",
    class: className,
    disabled = false,
    href,
    onclick,
  }: {
    icon: Icon;
    /** Nome da ação: vira o rótulo para leitores de tela e a dica ao passar o mouse. */
    label: string;
    variant?: ButtonVariant;
    class?: string;
    disabled?: boolean;
    href?: string;
    onclick?: (event: MouseEvent) => void;
  } = $props();
</script>

<Button size="icon" {variant} {href} {disabled} {onclick} class={className} aria-label={label} title={label}>
  <Glyph aria-hidden="true" />
</Button>
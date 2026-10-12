<script lang="ts">
  import { AlertDialog } from "bits-ui";
  import { cn } from "../cn";
  import { buttonVariants } from "./Button.svelte";
  import Input from "./Input.svelte";

  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    destructive = false,
    requireText,
    onconfirm,
  }: {
    open?: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    /** Se informado, o usuário precisa digitar exatamente este texto para liberar o botão. */
    requireText?: string;
    onconfirm: () => void;
  } = $props();

  let typed = $state("");
  const blocked = $derived(requireText !== undefined && typed !== requireText);

  $effect(() => {
    if (!open) typed = "";
  });
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Portal>
    <AlertDialog.Overlay data-slot="dialog-overlay" class="fixed inset-0 z-50 bg-foreground/50" />
    <AlertDialog.Content
      data-slot="confirm-dialog"
      class="fixed inset-x-4 top-1/2 z-50 mx-auto grid max-w-md -translate-y-1/2 gap-4 rounded-xl border bg-popover p-5 text-popover-foreground shadow-md"
    >
      <div class="grid gap-1">
        <AlertDialog.Title class="text-section-title font-semibold">{title}</AlertDialog.Title>
        {#if description}
          <AlertDialog.Description class="text-sm text-muted-foreground">{description}</AlertDialog.Description>
        {/if}
      </div>
      {#if requireText !== undefined}
        <div class="grid gap-1.5">
          <label for="confirm-text" class="text-sm">Digite <strong>{requireText}</strong> para confirmar</label>
          <Input id="confirm-text" bind:value={typed} autocomplete="off" />
        </div>
      {/if}
      <div class="flex flex-wrap justify-end gap-2">
        <AlertDialog.Cancel class={buttonVariants({ variant: "outline" })}>{cancelLabel}</AlertDialog.Cancel>
        <AlertDialog.Action
          disabled={blocked}
          class={cn(buttonVariants({ variant: destructive ? "destructive" : "default" }))}
          onclick={onconfirm}>{confirmLabel}</AlertDialog.Action
        >
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
<script lang="ts">
  import { X } from "@lucide/svelte";
  import { Dialog as DialogPrimitive } from "bits-ui";
  import type { Snippet } from "svelte";
  import { cn } from "../cn";
  import { buttonVariants } from "./Button.svelte";

  let {
    open = $bindable(false),
    title,
    description,
    children,
    footer,
    class: className,
  }: {
    open?: boolean;
    title: string;
    description?: string;
    children?: Snippet;
    /** Botões de ação, alinhados à direita. */
    footer?: Snippet;
    class?: string;
  } = $props();
</script>

<!-- No celular abre como folha colada embaixo; a partir de md, como diálogo centralizado. -->
<DialogPrimitive.Root bind:open>
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay data-slot="dialog-overlay" class="fixed inset-0 z-50 bg-foreground/50" />
    <DialogPrimitive.Content
      data-slot="dialog"
      class={cn(
        "fixed inset-x-0 bottom-0 z-50 grid max-h-screen gap-4 overflow-y-auto rounded-t-xl border bg-popover p-5 text-popover-foreground shadow-md md:inset-x-4 md:top-1/2 md:bottom-auto md:mx-auto md:max-w-lg md:-translate-y-1/2 md:rounded-xl",
        className,
      )}
    >
      <div class="grid gap-1 pr-8">
        <DialogPrimitive.Title class="text-section-title font-semibold">{title}</DialogPrimitive.Title>
        {#if description}
          <DialogPrimitive.Description class="text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
        {/if}
      </div>
      {@render children?.()}
      {#if footer}<div class="flex flex-wrap justify-end gap-2">{@render footer()}</div>{/if}
      <DialogPrimitive.Close class={cn(buttonVariants({ variant: "ghost", size: "icon" }), "absolute top-3 right-3")} aria-label="Fechar">
        <X aria-hidden="true" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>
<script lang="ts">
  import { X } from "@lucide/svelte";
  import { Dialog as DialogPrimitive } from "bits-ui";
  import type { Snippet } from "svelte";
  import { cn } from "../cn";
  import { buttonVariants } from "./Button.svelte";

  let {
    open = $bindable(false), title, description, children, footer, class: className,
  }: {
    open?: boolean;
    title: string;
    description?: string;
    children?: Snippet;
    footer?: Snippet;
    class?: string;
  } = $props();
</script>

<DialogPrimitive.Root bind:open>
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay data-slot="dialog-overlay" class="fixed inset-0 z-50 bg-foreground/50" />
    <DialogPrimitive.Content
      data-slot="dialog"
      class={cn(
        "fixed inset-0 z-50 flex max-h-screen flex-col gap-4 overflow-hidden border bg-popover p-5 text-popover-foreground shadow-md md:inset-x-4 md:top-1/2 md:bottom-auto md:mx-auto md:h-auto md:max-w-lg md:-translate-y-1/2 md:rounded-xl",
        className,
      )}
    >
      <div class="grid shrink-0 gap-1 pr-8">
        <DialogPrimitive.Title class="text-section-title font-semibold">{title}</DialogPrimitive.Title>
        {#if description}<DialogPrimitive.Description class="text-sm text-muted-foreground">{description}</DialogPrimitive.Description>{/if}
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">{@render children?.()}</div>
      {#if footer}<div class="flex shrink-0 flex-wrap justify-end gap-2 border-t pt-4">{@render footer()}</div>{/if}
      <DialogPrimitive.Close class={cn(buttonVariants({ variant: "ghost", size: "icon" }), "absolute top-3 right-3")} aria-label="Fechar">
        <X aria-hidden="true" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>

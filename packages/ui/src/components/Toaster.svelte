<script lang="ts">
  import { X } from "@lucide/svelte";
  import { cn } from "../cn";
  import { toast } from "../toast.svelte";
  import Button from "./Button.svelte";
</script>

<!-- Fica acima da barra de navegação do celular. -->
<div
  data-slot="toaster"
  role="status"
  aria-live="polite"
  class="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-4 md:bottom-4 md:items-end"
>
  {#each toast.items as item (item.id)}
    <div
      class={cn(
        "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-md",
        item.tone === "success" && "border-success",
        item.tone === "destructive" && "border-destructive",
      )}
    >
      <span class="flex-1">{item.message}</span>
      {#if item.action}
        <Button size="sm" variant="outline" onclick={() => toast.act(item.id)}>{item.action.label}</Button>
      {/if}
      {#if !item.action}
        <Button size="icon" variant="ghost" aria-label="Fechar aviso" onclick={() => toast.close(item.id)}>
          <X aria-hidden="true" />
        </Button>
      {/if}
    </div>
  {/each}
</div>
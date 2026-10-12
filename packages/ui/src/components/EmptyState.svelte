<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let {
    class: className,
    title,
    description,
    action,
    ...rest
  }: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    title: string;
    description?: string;
    /** Uma ação clara para sair do vazio (normalmente um Button). */
    action?: Snippet;
  } = $props();
</script>

<div data-slot="empty-state" class={cn("flex flex-col items-center gap-2 px-5 py-10 text-center", className)} {...rest}>
  <p class="font-medium">{title}</p>
  {#if description}<p class="max-w-sm text-sm text-muted-foreground">{description}</p>{/if}
  {#if action}<div class="mt-2">{@render action()}</div>{/if}
</div>
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let {
    class: className,
    title,
    description,
    actions,
    ...rest
  }: Omit<HTMLAttributes<HTMLElement>, "title"> & {
    title: string;
    description?: string;
    /** Botões da página, alinhados à direita. */
    actions?: Snippet;
  } = $props();
</script>

<header data-slot="page-header" class={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)} {...rest}>
  <div class="grid gap-1">
    <h1 class="text-page-title font-semibold">{title}</h1>
    {#if description}<p class="text-sm text-muted-foreground">{description}</p>{/if}
  </div>
  {#if actions}<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>{/if}
</header>
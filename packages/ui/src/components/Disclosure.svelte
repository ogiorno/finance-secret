<script lang="ts">
  import { ChevronRight } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import { cn } from "../cn";

  let {
    class: className,
    label,
    open = $bindable(false),
    children,
  }: {
    class?: string;
    /** Texto do gatilho, por exemplo "Opções avançadas". */
    label: string;
    open?: boolean;
    children: Snippet;
  } = $props();
</script>

<details data-slot="disclosure" class={cn("group grid gap-4", className)} bind:open>
  <summary
    class="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
  >
    <ChevronRight class="size-4 transition-transform group-open:rotate-90" aria-hidden="true" />
    {label}
  </summary>
  <div class="grid gap-4">{@render children()}</div>
</details>

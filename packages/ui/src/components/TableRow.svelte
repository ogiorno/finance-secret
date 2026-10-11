<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLAttributes<HTMLTableRowElement> = $props();
</script>

<tr data-slot="table-row" class={cn("border-b transition-colors hover:bg-muted/50", className)} {...rest}>
  {@render children?.()}
</tr>

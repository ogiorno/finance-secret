<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement> = $props();
</script>

<tbody data-slot="table-body" class={cn("[&_tr:last-child]:border-0", className)} {...rest}>
  {@render children?.()}
</tbody>

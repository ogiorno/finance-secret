<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLAttributes<HTMLTableSectionElement> = $props();
</script>

<thead data-slot="table-header" class={cn("[&_tr]:border-b", className)} {...rest}>
  {@render children?.()}
</thead>

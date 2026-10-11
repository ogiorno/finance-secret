<script lang="ts">
  import type { HTMLThAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, scope = "col", children, ...rest }: HTMLThAttributes = $props();
</script>

<th data-slot="table-head" {scope} class={cn("h-10 px-3 text-left align-middle font-medium whitespace-nowrap text-muted-foreground", className)} {...rest}>
  {@render children?.()}
</th>

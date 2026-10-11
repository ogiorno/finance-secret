<script lang="ts">
  import type { HTMLTdAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLTdAttributes = $props();
</script>

<td data-slot="table-cell" class={cn("p-3 align-middle", className)} {...rest}>
  {@render children?.()}
</td>

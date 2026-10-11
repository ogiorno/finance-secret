<script lang="ts">
  import type { HTMLTableAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLTableAttributes = $props();
</script>

<div data-slot="table-container" class="relative w-full overflow-x-auto">
  <table data-slot="table" class={cn("w-full caption-bottom text-sm", className)} {...rest}>
    {@render children?.()}
  </table>
</div>

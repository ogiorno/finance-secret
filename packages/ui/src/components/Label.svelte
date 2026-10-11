<script lang="ts">
  import type { HTMLLabelAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLLabelAttributes = $props();
</script>

<label data-slot="label" class={cn("flex items-center gap-2 text-sm leading-none font-medium select-none", className)} {...rest}>
  {@render children?.()}
</label>

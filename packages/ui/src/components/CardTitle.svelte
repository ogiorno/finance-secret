<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLAttributes<HTMLHeadingElement> = $props();
</script>

<h3 data-slot="card-title" class={cn("leading-none font-semibold", className)} {...rest}>
  {@render children?.()}
</h3>

<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div data-slot="card-footer" class={cn("flex items-center px-5", className)} {...rest}>
  {@render children?.()}
</div>

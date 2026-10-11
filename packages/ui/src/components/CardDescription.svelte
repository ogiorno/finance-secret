<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLAttributes<HTMLParagraphElement> = $props();
</script>

<p data-slot="card-description" class={cn("text-sm text-muted-foreground", className)} {...rest}>
  {@render children?.()}
</p>

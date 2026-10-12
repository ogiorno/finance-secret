<script lang="ts">
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLAnchorAttributes = $props();
</script>

<a
  data-slot="link"
  class={cn(
    "rounded-sm font-medium text-primary underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</a>
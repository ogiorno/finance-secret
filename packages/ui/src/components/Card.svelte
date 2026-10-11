<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div data-slot="card" class={cn("flex flex-col gap-4 rounded-xl border bg-card py-5 text-card-foreground shadow-sm", className)} {...rest}>
  {@render children?.()}
</div>

<script lang="ts">
  import { Check } from "@lucide/svelte";
  import { Checkbox as CheckboxPrimitive, type WithoutChildrenOrChild } from "bits-ui";
  import { cn } from "../cn";

  let {
    class: className,
    checked = $bindable(false),
    ref = $bindable(null),
    ...rest
  }: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<CheckboxPrimitive.Root
  bind:ref
  bind:checked
  data-slot="checkbox"
  class={cn(
    "flex size-5 shrink-0 items-center justify-center rounded-sm border border-input bg-card text-primary-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
    className,
  )}
  {...rest}
>
  {#snippet children({ checked })}
    {#if checked}<Check class="size-4" aria-hidden="true" />{/if}
  {/snippet}
</CheckboxPrimitive.Root>
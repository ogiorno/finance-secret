<script lang="ts" module>
  import { tv, type VariantProps } from "tailwind-variants";

  export const badgeVariants = tv({
    base: "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        income: "bg-income/15 text-income",
        expense: "bg-expense/15 text-expense",
        transfer: "bg-transfer/15 text-transfer",
        warning: "bg-warning/15 text-warning",
        destructive: "bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  });

  export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
</script>

<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let {
    class: className,
    variant = "default",
    children,
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant } = $props();
</script>

<span data-slot="badge" class={cn(badgeVariants({ variant }), className)} {...rest}>
  {@render children?.()}
</span>

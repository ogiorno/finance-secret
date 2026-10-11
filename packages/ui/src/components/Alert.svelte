<script lang="ts" module>
  import { tv, type VariantProps } from "tailwind-variants";

  export const alertVariants = tv({
    base: "relative w-full rounded-lg border px-4 py-3 text-sm",
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        warning: "border-warning bg-warning/10 text-foreground",
        destructive: "border-destructive bg-destructive/10 text-foreground",
        success: "border-success bg-success/10 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  });

  export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
</script>

<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  let {
    class: className,
    variant = "default",
    role = "status",
    children,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant } = $props();
</script>

<div data-slot="alert" {role} class={cn(alertVariants({ variant }), className)} {...rest}>
  {@render children?.()}
</div>

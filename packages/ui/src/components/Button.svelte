<script lang="ts" module>
  import { tv, type VariantProps } from "tailwind-variants";

  export const buttonVariants = tv({
    base: "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-card text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 gap-1.5 px-3",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  });

  export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
  export type ButtonSize = VariantProps<typeof buttonVariants>["size"];
</script>

<script lang="ts">
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
  import { cn } from "../cn";

  type Props = (HTMLButtonAttributes & HTMLAnchorAttributes) & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  };

  let {
    class: className,
    variant = "default",
    size = "default",
    href = undefined,
    type = "button",
    disabled = false,
    children,
    ...rest
  }: Props = $props();
</script>

{#if href}
  <a
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    href={disabled ? undefined : href}
    aria-disabled={disabled ? "true" : undefined}
    role={disabled ? "link" : undefined}
    tabindex={disabled ? -1 : undefined}
    {...rest}
  >
    {@render children?.()}
  </a>
{:else}
  <button data-slot="button" class={cn(buttonVariants({ variant, size }), className)} {type} {disabled} {...rest}>
    {@render children?.()}
  </button>
{/if}

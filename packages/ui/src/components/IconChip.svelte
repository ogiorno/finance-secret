<script lang="ts" module>
  import { tv, type VariantProps } from "tailwind-variants";

  export const iconChipVariants = tv({
    base: "inline-flex shrink-0 items-center justify-center rounded-lg",
    variants: {
      tone: {
        "cat-1": "bg-cat-1/15 text-cat-1",
        "cat-2": "bg-cat-2/15 text-cat-2",
        "cat-3": "bg-cat-3/15 text-cat-3",
        "cat-4": "bg-cat-4/15 text-cat-4",
        "cat-5": "bg-cat-5/15 text-cat-5",
        "cat-6": "bg-cat-6/15 text-cat-6",
        "cat-7": "bg-cat-7/15 text-cat-7",
        income: "bg-income/15 text-income",
        expense: "bg-expense/15 text-expense",
        transfer: "bg-transfer/15 text-transfer",
        benefit: "bg-benefit/20 text-benefit",
        primary: "bg-primary/15 text-primary",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "size-7 [&_svg]:size-4",
        md: "size-9 [&_svg]:size-4.5",
        lg: "size-11 [&_svg]:size-5",
      },
    },
    defaultVariants: { tone: "muted", size: "md" },
  });

  export type IconChipTone = NonNullable<VariantProps<typeof iconChipVariants>["tone"]>;
  export type IconChipSize = NonNullable<VariantProps<typeof iconChipVariants>["size"]>;

  /** As sete cores de categoria, na ordem do tema. */
  export const CATEGORY_TONES: IconChipTone[] = ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6", "cat-7"];

  /** Cor estável para um nome (a mesma categoria tem sempre a mesma cor, em qualquer banco). */
  export function toneForName(name: string): IconChipTone {
    let hash = 0;
    for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return CATEGORY_TONES[hash % CATEGORY_TONES.length] ?? "cat-7";
  }
</script>

<script lang="ts">
  import type { Component } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";

  type Icon = Component<{ class?: string; "aria-hidden"?: boolean | "true" | "false" }>;

  let {
    class: className,
    icon: Glyph,
    tone = "muted",
    size = "md",
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & { icon: Icon; tone?: IconChipTone; size?: IconChipSize } = $props();
</script>

<span data-slot="icon-chip" class={cn(iconChipVariants({ tone, size }), className)} {...rest}>
  <Glyph aria-hidden="true" />
</span>
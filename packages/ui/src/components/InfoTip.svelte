<script lang="ts">
  import { Info } from "@lucide/svelte";
  import { Popover } from "bits-ui";
  import { cn } from "../cn";

  let {
    class: className,
    text,
    label = "O que é isto?",
  }: {
    class?: string;
    /** Uma ou duas frases dizendo o que o número considera. */
    text: string;
    /** Nome do botão para leitores de tela. */
    label?: string;
  } = $props();

  const uid = $props.id();
  const descriptionId = `infotip-${uid}`;
  let open = $state(false);
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    data-slot="info-tip"
    aria-label={label}
    aria-describedby={descriptionId}
    onmouseenter={() => (open = true)}
    onmouseleave={() => (open = false)}
    class={cn(
      "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-8",
      className,
    )}
  >
    <Info class="size-4" aria-hidden="true" />
  </Popover.Trigger>
  <span id={descriptionId} class="sr-only">{text}</span>
  <Popover.Portal>
    <Popover.Content
      sideOffset={6}
      align="start"
      class="z-50 max-w-64 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md animate-fade"
    >
      {text}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

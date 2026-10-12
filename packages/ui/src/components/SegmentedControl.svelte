<script lang="ts">
  import { ToggleGroup } from "bits-ui";
  import { cn } from "../cn";

  type Option = { value: string; label: string };

  let {
    class: className,
    value = $bindable(""),
    options,
    label,
    onchange,
  }: {
    class?: string;
    value?: string;
    options: Option[];
    /** Nome acessível do grupo, por exemplo "Tipo do lançamento". */
    label: string;
    onchange?: (value: string) => void;
  } = $props();
</script>

<ToggleGroup.Root
  type="single"
  bind:value
  aria-label={label}
  onValueChange={(next) => {
    // Um segmento escolhido não pode ser desmarcado: sempre há uma opção ativa.
    if (!next) value = value || options[0]?.value || "";
    else onchange?.(next);
  }}
  data-slot="segmented-control"
  class={cn("inline-flex w-full rounded-md border border-input bg-muted p-0.5", className)}
>
  {#each options as option (option.value)}
    <ToggleGroup.Item
      value={option.value}
      class="h-control-sm flex-1 rounded-sm px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs"
    >
      {option.label}
    </ToggleGroup.Item>
  {/each}
</ToggleGroup.Root>
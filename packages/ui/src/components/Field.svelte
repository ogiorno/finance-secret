<script lang="ts" module>
  /** Atributos que o controle dentro do Field precisa receber (use `{...field}`). */
  export type FieldControl = { id: string; "aria-describedby": string | undefined; "aria-invalid": true | undefined };
</script>

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "../cn";
  import Label from "./Label.svelte";

  let {
    class: className,
    label,
    hint,
    error,
    control,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & {
    label: string;
    hint?: string;
    /** Mensagem de erro do campo; quando presente, o controle é marcado como inválido. */
    error?: string | null;
    /** O controle (Input, NativeSelect...), que recebe os atributos de acessibilidade do campo. */
    control: Snippet<[FieldControl]>;
  } = $props();

  const id = $props.id();
  const hintId = $derived(hint ? `${id}-hint` : undefined);
  const errorId = $derived(error ? `${id}-error` : undefined);
  const attrs = $derived<FieldControl>({
    id,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? true : undefined,
  });
</script>

<div data-slot="field" class={cn("grid gap-1.5", className)} {...rest}>
  <Label for={id}>{label}</Label>
  {@render control(attrs)}
  {#if hint}<p id={hintId} class="text-xs text-muted-foreground">{hint}</p>{/if}
  {#if error}<p id={errorId} role="alert" class="text-xs text-destructive">{error}</p>{/if}
</div>
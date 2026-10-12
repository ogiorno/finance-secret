<script lang="ts">
  import { Button, Dialog, formatBRL } from "@finance/ui";

  let {
    open = $bindable(false),
    billName,
    fromCents,
    toCents,
    onchoose,
  }: {
    open?: boolean;
    billName: string;
    fromCents: number;
    toCents: number;
    /** Escolha de quando o novo valor passa a valer. */
    onchoose: (when: "this-month" | "next-month" | "pending-months") => void;
  } = $props();

  function choose(when: "this-month" | "next-month" | "pending-months") {
    open = false;
    onchoose(when);
  }
</script>

<Dialog
  bind:open
  title="Quando o novo valor passa a valer?"
  description={`${billName}: de ${formatBRL(fromCents)} para ${formatBRL(toCents)}. Meses já pagos não mudam.`}
>
  <div class="grid gap-2">
    <Button variant="outline" class="h-auto justify-start py-3 text-left whitespace-normal" onclick={() => choose("this-month")}>
      <span class="grid gap-0.5">
        <span class="font-medium">Este mês em diante</span>
        <span class="text-xs font-normal text-muted-foreground">Os meses anteriores continuam com o valor antigo.</span>
      </span>
    </Button>
    <Button variant="outline" class="h-auto justify-start py-3 text-left whitespace-normal" onclick={() => choose("next-month")}>
      <span class="grid gap-0.5">
        <span class="font-medium">Só a partir do próximo mês</span>
        <span class="text-xs font-normal text-muted-foreground">Este mês fica com o valor antigo.</span>
      </span>
    </Button>
    <Button variant="outline" class="h-auto justify-start py-3 text-left whitespace-normal" onclick={() => choose("pending-months")}>
      <span class="grid gap-0.5">
        <span class="font-medium">Recalcular também os meses pendentes e atrasados</span>
        <span class="text-xs font-normal text-muted-foreground">Todos os meses ainda não pagos passam a esperar o novo valor.</span>
      </span>
    </Button>
    <Button variant="ghost" onclick={() => (open = false)}>Cancelar</Button>
  </div>
</Dialog>

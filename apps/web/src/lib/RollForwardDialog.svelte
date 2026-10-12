<script lang="ts">
  import type { MonthRollForward } from "@finance/database";
  import { Alert, Dialog, Money } from "@finance/ui";

  let {
    open = $bindable(false),
    roll,
    monthLabel,
  }: {
    open?: boolean;
    roll: MonthRollForward;
    /** Mês por extenso, por exemplo "outubro de 2026". */
    monthLabel: string;
  } = $props();
</script>

<Dialog bind:open title="Como chegamos neste saldo" description={`Dinheiro nas suas contas ativas em ${monthLabel}, sem cartões e empréstimos.`}>
  <dl class="grid text-sm">
    <div class="flex items-center justify-between gap-4 border-b py-2.5">
      <dt>Saldo no início do mês</dt>
      <dd><Money class="font-medium" cents={roll.openingCents} /></dd>
    </div>
    <div class="flex items-center justify-between gap-4 border-b py-2.5">
      <dt>+ Receitas</dt>
      <dd><Money class="font-medium" cents={roll.incomeCents} tone="income" /></dd>
    </div>
    <div class="flex items-center justify-between gap-4 border-b py-2.5">
      <dt>− Despesas</dt>
      <dd><Money class="font-medium" cents={roll.expenseCents} tone="expense" /></dd>
    </div>
    {#if roll.cardsCents !== 0}
      <div class="flex items-center justify-between gap-4 border-b py-2.5">
        <dt>± Cartões: compras que entram no mês − fatura paga</dt>
        <dd><Money class="font-medium" cents={roll.cardsCents} tone="auto" showSign /></dd>
      </div>
    {/if}
    {#if roll.unexplainedCents !== 0}
      <div class="flex items-center justify-between gap-4 border-b py-2.5">
        <dt>± Diferença sem explicação</dt>
        <dd><Money class="font-medium" cents={roll.unexplainedCents} tone="auto" showSign /></dd>
      </div>
    {/if}
    <div class="flex items-center justify-between gap-4 py-2.5 font-semibold">
      <dt>= Saldo no fim do mês</dt>
      <dd><Money cents={roll.closingCents} /></dd>
    </div>
  </dl>
  {#if roll.unexplainedCents !== 0}
    <Alert class="mt-2" variant="warning">
      Receitas e despesas não explicam todo o movimento do saldo. O provável motivo é uma transferência com uma conta arquivada: a outra ponta não entra no saldo total.
    </Alert>
  {/if}
</Dialog>

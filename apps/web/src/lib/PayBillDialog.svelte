<script lang="ts">
  import { parseBRLToCents } from "@finance/core";
  import type { Account } from "@finance/database";
  import { Alert, Button, Dialog, Disclosure, Field, Input, NativeSelect } from "@finance/ui";
  import { todayLocal } from "./local-date";

  let {
    open = $bindable(false),
    occurrence,
    accounts,
    mode = "pay",
    onpay,
  }: {
    open?: boolean;
    occurrence: { name: string; defaultAccountId: number | null; expectedAmountCents: number } | null;
    accounts: Account[];
    /** `receive`: registra uma receita em vez de uma despesa. */
    mode?: "pay" | "receive";
    /** Devolve uma mensagem de erro, ou `null` quando pagou. */
    onpay: (values: { accountId: number; amountCents: number; date: string }) => string | null;
  } = $props();

  let accountId = $state("");
  let amount = $state("");
  let date = $state(todayLocal());
  let error = $state<string | null>(null);
  let amountError = $state<string | null>(null);

  // A cada abertura volta aos padrões da conta que está sendo paga.
  $effect(() => {
    if (!open || !occurrence) return;
    accountId = occurrence.defaultAccountId !== null ? String(occurrence.defaultAccountId) : "";
    amount = (occurrence.expectedAmountCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    date = todayLocal();
    error = null;
    amountError = null;
  });

  function submit(event: Event) {
    event.preventDefault();
    error = null;
    amountError = null;
    const cents = parseBRLToCents(amount);
    if (cents === null || cents <= 0) {
      amountError = "Valor inválido. Exemplo: 1.800,00";
      return;
    }
    error = onpay({ accountId: Number(accountId), amountCents: cents, date });
    if (error === null) open = false;
  }
</script>

<Dialog
  bind:open
  title={mode === "receive" ? `Receber ${occurrence?.name ?? "receita"}` : `Pagar ${occurrence?.name ?? "conta"}`}
  description={mode === "receive" ? "Isso registra a receita na conta que você escolher." : "Isso registra a despesa na conta que você escolher."}
>
  <form class="grid gap-4" onsubmit={submit}>
    <Field label={mode === "receive" ? "Valor recebido (R$)" : "Valor pago (R$)"} error={amountError}>
      {#snippet control(field)}<Input {...field} bind:value={amount} inputmode="decimal" required />{/snippet}
    </Field>
    <Field label={mode === "receive" ? "Conta onde entrou o dinheiro" : "Conta de onde saiu o dinheiro"}>
      {#snippet control(field)}
        <NativeSelect {...field} bind:value={accountId} required>
          <option value="" disabled>Selecione</option>
          {#each accounts as account (account.id)}<option value={String(account.id)}>{account.name}</option>{/each}
        </NativeSelect>
      {/snippet}
    </Field>
    <Disclosure label="Opções avançadas">
      <Field label={mode === "receive" ? "Data do recebimento" : "Data do pagamento"}>
        {#snippet control(field)}<Input {...field} type="date" bind:value={date} required />{/snippet}
      </Field>
    </Disclosure>
    {#if error}<Alert variant="destructive" role="alert">{error}</Alert>{/if}
    <div class="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" onclick={() => (open = false)}>Cancelar</Button>
      <Button type="submit">{mode === "receive" ? "Registrar recebimento" : "Registrar pagamento"}</Button>
    </div>
  </form>
</Dialog>

<script lang="ts">
  import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, isPaymentMethod } from "@finance/core";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle, NativeSelect, toast } from "@finance/ui";
  import { session } from "./session.svelte";

  const types = $derived.by(() => {
    void session.revision;
    return session.repo?.listAccountTypes() ?? [];
  });

  function changeDefault(key: string, value: string) {
    try {
      session.change((repo) => repo.updateAccountType(key, { defaultPaymentMethod: isPaymentMethod(value) ? value : null }));
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : "Não foi possível salvar.", tone: "destructive", duration: 0 });
    }
  }
</script>

<Card class="mt-6">
  <CardHeader>
    <CardTitle>Tipos de conta</CardTitle>
    <CardDescription>
      O método de pagamento escolhido aqui já vem preenchido nos lançamentos das contas de cada tipo. Dá para trocá-lo em cada lançamento.
    </CardDescription>
  </CardHeader>
  <CardContent class="grid gap-3">
    {#each types as type (type.key)}
      <div class="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
        <span class="font-medium">{type.name}</span>
        <NativeSelect
          class="w-48"
          aria-label={`Método padrão de ${type.name}`}
          value={type.defaultPaymentMethod ?? ""}
          onchange={(event) => changeDefault(type.key, event.currentTarget.value)}
        >
          <option value="">Sem método padrão</option>
          {#each PAYMENT_METHODS as method (method)}<option value={method}>{PAYMENT_METHOD_LABELS[method]}</option>{/each}
        </NativeSelect>
      </div>
    {/each}
  </CardContent>
</Card>

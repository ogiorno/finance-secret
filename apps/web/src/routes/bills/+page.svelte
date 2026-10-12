<script lang="ts">
  import { Archive, ArchiveRestore, Pencil, Plus, Trash, Undo2, Wallet } from "@lucide/svelte";
  import type { BillOccurrence, IncomeOccurrence, RecurringBill, RecurringIncome } from "@finance/database";
  import {
    Alert,
    Badge,
    Button,
    Card,
    CardContent,
    Checkbox,
    ConfirmDialog,
    CountUp,
    Dialog,
    EmptyState,
    IconButton,
    IconChip,
    Kpi,
    Label,
    Money,
    NativeSelect,
    PageHeader,
    SegmentedControl,
    formatBRL,
    toast,
  } from "@finance/ui";
  import AmountChangeDialog from "$lib/AmountChangeDialog.svelte";
  import BillForm, { type BillFormInitial, type BillFormValues } from "$lib/BillForm.svelte";
  import { categoryStyle } from "$lib/category-style";
  import { currentPeriod, nextPeriod, shortDate, todayLocal } from "$lib/local-date";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import PayBillDialog from "$lib/PayBillDialog.svelte";
  import { period } from "$lib/period.svelte";
  import { session } from "$lib/session.svelte";

  const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const classificationLabel = { fixed: "Fixa", discretionary: "Supérflua" } as const;
  const billStatusLabel = { paid: "Paga", overdue: "Atrasada", pending: "Pendente" } as const;
  const incomeStatusLabel = { paid: "Recebida", overdue: "Atrasada", pending: "A receber" } as const;
  const statusVariant = { paid: "income", overdue: "destructive", pending: "outline" } as const;

  let view = $state("pay");
  let filterCategory = $state("");
  let filterClass = $state("");
  let filterSource = $state("");
  let showArchived = $state(false);

  const data = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const month = period.month;
    const today = todayLocal();
    const categories = repo.listCategories();
    const byId = new Map(categories.map((category) => [category.id, category]));
    const labelled = (type: "expense" | "income") =>
      categories
        .filter((category) => category.type === type && !category.isSystem)
        .map((category) => ({
          ...category,
          label: category.parentId ? `${byId.get(category.parentId)?.name ?? ""} › ${category.name}` : category.name,
        }));
    return {
      occurrences: repo.listBillOccurrences(month, today),
      summary: repo.getBillsSummary(month, today),
      bills: repo.listRecurringBills({ includeArchived: showArchived, asOfPeriod: month }),
      incomeOccurrences: repo.listIncomeOccurrences(month, today),
      incomeSummary: repo.getIncomeExpectations(month, today),
      incomes: repo.listRecurringIncomes({ includeArchived: showArchived, asOfPeriod: month }),
      sources: repo.listIncomeSources(),
      accounts: repo.listAccounts(),
      expenseCategories: labelled("expense"),
      incomeCategories: labelled("income"),
      categoryName: (id: number) => byId.get(id)?.name ?? "Sem categoria",
      sourceName: (id: number) => repo.listIncomeSources({ includeArchived: true }).find((source) => source.id === id)?.name ?? "",
      uncategorized: (type: "expense" | "income") => categories.find((category) => category.isSystem && category.type === type)?.id,
      monthLabel: (() => {
        const [year = 0, mon = 1] = month.split("-").map(Number);
        return `${MONTHS[mon - 1]} de ${year}`;
      })(),
    };
  });

  const matches = (categoryId: number, classification: string) =>
    (filterCategory === "" || String(categoryId) === filterCategory) && (filterClass === "" || classification === filterClass);

  const occurrences = $derived((data?.occurrences ?? []).filter((item) => matches(item.categoryId, item.classification)));
  const incomeOccurrences = $derived(
    (data?.incomeOccurrences ?? []).filter((item) => filterSource === "" || String(item.sourceId) === filterSource),
  );
  const bills = $derived(data?.bills ?? []);
  const incomes = $derived(data?.incomes ?? []);
  const hasFilters = $derived(view === "receive" ? filterSource !== "" : filterCategory !== "" || filterClass !== "");

  // --- cadastro: criar e editar (conta a pagar ou receita recorrente) ---------------------------------------------
  let formOpen = $state(false);
  let formKind = $state<"bill" | "income">("bill");
  let editingBill = $state<RecurringBill | null>(null);
  let editingIncome = $state<RecurringIncome | null>(null);
  let formInitial = $state<BillFormInitial>(blankForm());

  function blankForm(): BillFormInitial {
    return {
      name: "",
      amount: "",
      frequency: "monthly",
      dueDay: "5",
      dueMonth: "",
      categoryId: "",
      classification: "fixed",
      sourceId: String(data?.sources.find((source) => source.isDefault)?.id ?? ""),
      defaultAccountId: "",
      startPeriod: currentPeriod(),
    };
  }

  const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function openNew(kind: "bill" | "income") {
    formKind = kind;
    editingBill = null;
    editingIncome = null;
    formInitial = blankForm();
    formOpen = true;
  }

  function openEditBill(bill: RecurringBill) {
    formKind = "bill";
    editingBill = bill;
    editingIncome = null;
    formInitial = {
      ...blankForm(),
      name: bill.name,
      amount: money(bill.amountCents),
      frequency: bill.frequency,
      dueDay: String(bill.dueDay),
      dueMonth: bill.dueMonth === null ? "" : String(bill.dueMonth),
      categoryId: data?.expenseCategories.some((category) => category.id === bill.categoryId) ? String(bill.categoryId) : "",
      classification: bill.classification,
      defaultAccountId: bill.defaultAccountId === null ? "" : String(bill.defaultAccountId),
      startPeriod: bill.startPeriod,
    };
    formOpen = true;
  }

  function openEditIncome(income: RecurringIncome) {
    formKind = "income";
    editingBill = null;
    editingIncome = income;
    formInitial = {
      ...blankForm(),
      name: income.name,
      amount: money(income.amountCents),
      frequency: income.frequency,
      dueDay: String(income.dueDay),
      dueMonth: income.dueMonth === null ? "" : String(income.dueMonth),
      categoryId: data?.incomeCategories.some((category) => category.id === income.categoryId) ? String(income.categoryId) : "",
      sourceId: String(income.sourceId),
      defaultAccountId: income.defaultAccountId === null ? "" : String(income.defaultAccountId),
      startPeriod: income.startPeriod,
    };
    formOpen = true;
  }

  let amountOpen = $state(false);
  let amountChange = $state<{ kind: "bill" | "income"; id: number; name: string; startPeriod: string; fromCents: number; cents: number } | null>(null);

  function saveForm(values: BillFormValues): string | null {
    try {
      if (formKind === "bill") {
        const bill = editingBill;
        if (bill) {
          session.change((repo) =>
            repo.updateRecurringBill(bill.id, {
              name: values.name,
              frequency: values.frequency,
              dueDay: values.dueDay,
              dueMonth: values.dueMonth,
              categoryId: values.categoryId ?? data?.uncategorized("expense"),
              classification: values.classification,
              defaultAccountId: values.defaultAccountId,
            }),
          );
          if (values.amountCents !== bill.amountCents) {
            amountChange = { kind: "bill", id: bill.id, name: bill.name, startPeriod: bill.startPeriod, fromCents: bill.amountCents, cents: values.amountCents };
            amountOpen = true;
          }
          toast.show({ message: "Conta atualizada", tone: "success" });
        } else {
          session.change((repo) =>
            repo.createRecurringBill({
              name: values.name,
              amountCents: values.amountCents,
              frequency: values.frequency,
              dueDay: values.dueDay,
              dueMonth: values.dueMonth,
              categoryId: values.categoryId,
              classification: values.classification,
              defaultAccountId: values.defaultAccountId,
              startPeriod: values.startPeriod,
            }),
          );
          toast.show({ message: "Conta cadastrada", tone: "success" });
        }
      } else {
        const income = editingIncome;
        if (income) {
          session.change((repo) =>
            repo.updateRecurringIncome(income.id, {
              name: values.name,
              frequency: values.frequency,
              dueDay: values.dueDay,
              dueMonth: values.dueMonth,
              sourceId: values.sourceId,
              categoryId: values.categoryId ?? data?.uncategorized("income"),
              defaultAccountId: values.defaultAccountId,
            }),
          );
          if (values.amountCents !== income.amountCents) {
            amountChange = { kind: "income", id: income.id, name: income.name, startPeriod: income.startPeriod, fromCents: income.amountCents, cents: values.amountCents };
            amountOpen = true;
          }
          toast.show({ message: "Receita atualizada", tone: "success" });
        } else {
          session.change((repo) =>
            repo.createRecurringIncome({
              name: values.name,
              amountCents: values.amountCents,
              frequency: values.frequency,
              dueDay: values.dueDay,
              dueMonth: values.dueMonth,
              sourceId: values.sourceId,
              categoryId: values.categoryId,
              defaultAccountId: values.defaultAccountId,
              startPeriod: values.startPeriod,
            }),
          );
          toast.show({ message: "Receita cadastrada", tone: "success" });
        }
      }
    } catch (error) {
      return error instanceof Error ? error.message : "Não foi possível salvar.";
    }
    formOpen = false;
    return null;
  }

  function applyAmount(when: "this-month" | "next-month" | "pending-months") {
    const change = amountChange;
    if (!change) return;
    const fromPeriod = when === "this-month" ? currentPeriod() : when === "next-month" ? nextPeriod(currentPeriod()) : change.startPeriod;
    try {
      session.change((repo) =>
        change.kind === "bill"
          ? repo.setRecurringBillAmount(change.id, { amountCents: change.cents, fromPeriod })
          : repo.setRecurringIncomeAmount(change.id, { amountCents: change.cents, fromPeriod }),
      );
      toast.show({ message: `Novo valor de ${change.name} salvo`, tone: "success" });
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : "Não foi possível mudar o valor.", tone: "destructive", duration: 0 });
    }
    amountChange = null;
  }

  // --- arquivar e excluir ----------------------------------------------------------------------------------------
  function setActive(kind: "bill" | "income", id: number, name: string, active: boolean) {
    const apply = (value: boolean) =>
      session.change((repo) => (kind === "bill" ? repo.setRecurringBillActive(id, value) : repo.setRecurringIncomeActive(id, value)));
    apply(active);
    if (!active) toast.show({ message: `${name} arquivada`, duration: 5000, action: { label: "Desfazer", onclick: () => apply(true) } });
  }

  let deleting = $state<{ kind: "bill" | "income"; id: number; name: string } | null>(null);
  let deleteOpen = $state(false);

  function askDelete(kind: "bill" | "income", id: number, name: string) {
    deleting = { kind, id, name };
    deleteOpen = true;
  }

  function confirmDelete() {
    const target = deleting;
    if (!target) return;
    try {
      session.change((repo) => (target.kind === "bill" ? repo.deleteRecurringBill(target.id) : repo.deleteRecurringIncome(target.id)));
      toast.show({ message: `${target.name} excluída` });
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : "Não foi possível excluir.", tone: "destructive", duration: 0 });
    }
  }

  // --- pagar / receber e desmarcar -------------------------------------------------------------------------------
  let payOpen = $state(false);
  let payTarget = $state<{ mode: "pay" | "receive"; id: number; period: string; name: string; defaultAccountId: number | null; expectedAmountCents: number } | null>(null);

  function askPay(occurrence: BillOccurrence) {
    payTarget = { mode: "pay", id: occurrence.billId, period: occurrence.period, name: occurrence.name, defaultAccountId: occurrence.defaultAccountId, expectedAmountCents: occurrence.expectedAmountCents };
    payOpen = true;
  }

  function askReceive(occurrence: IncomeOccurrence) {
    payTarget = { mode: "receive", id: occurrence.incomeId, period: occurrence.period, name: occurrence.name, defaultAccountId: occurrence.defaultAccountId, expectedAmountCents: occurrence.expectedAmountCents };
    payOpen = true;
  }

  function pay(values: { accountId: number; amountCents: number; date: string }): string | null {
    const target = payTarget;
    if (!target) return "Escolha uma conta.";
    try {
      session.change((repo) =>
        target.mode === "pay"
          ? repo.payBill({ billId: target.id, period: target.period, ...values })
          : repo.receiveIncome({ incomeId: target.id, period: target.period, ...values }),
      );
    } catch (error) {
      return error instanceof Error ? error.message : "Não foi possível registrar.";
    }
    toast.show({ message: target.mode === "pay" ? `${target.name} paga` : `${target.name} recebida`, tone: "success" });
    return null;
  }

  let undoOpen = $state(false);
  let undoTarget = $state<{ mode: "pay" | "receive"; id: number; period: string; name: string; cents: number } | null>(null);

  function askUndo(mode: "pay" | "receive", id: number, name: string, periodText: string, cents: number) {
    undoTarget = { mode, id, period: periodText, name, cents };
    undoOpen = true;
  }

  function confirmUndo() {
    const target = undoTarget;
    if (!target) return;
    try {
      session.change((repo) => (target.mode === "pay" ? repo.unpayBill(target.id, target.period) : repo.unreceiveIncome(target.id, target.period)));
      toast.show({ message: target.mode === "pay" ? `Pagamento de ${target.name} desmarcado` : `Recebimento de ${target.name} desmarcado` });
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : "Não foi possível desmarcar.", tone: "destructive", duration: 0 });
    }
  }

  function scheduleText(item: { frequency: "monthly" | "yearly"; dueDay: number; dueMonth: number | null }): string {
    return item.frequency === "monthly" ? `todo dia ${item.dueDay}` : `todo ano, ${item.dueDay} de ${MONTHS[(item.dueMonth ?? 1) - 1]}`;
  }
</script>

<svelte:head><title>A pagar e a receber · Finanças</title></svelte:head>

{#if !data}
  <PageHeader title="A pagar e a receber" />
  <OpenDatabasePanel />
{:else}
  <PageHeader title="A pagar e a receber" description="O que você paga e recebe todo mês ou todo ano, e o que já aconteceu.">
    {#snippet actions()}
      {#if view === "receive"}
        <Button onclick={() => openNew("income")}><Plus aria-hidden="true" />Nova receita</Button>
      {:else}
        <Button onclick={() => openNew("bill")}><Plus aria-hidden="true" />Nova conta</Button>
      {/if}
    {/snippet}
  </PageHeader>

  <div class="mb-4 flex flex-wrap items-center gap-2">
    <SegmentedControl
      label="O que ver"
      bind:value={view}
      options={[
        { value: "pay", label: "A pagar" },
        { value: "receive", label: "A receber" },
        { value: "registry", label: "Cadastro" },
      ]}
    />
    {#if view === "pay"}
      <NativeSelect class="w-52" aria-label="Filtrar por categoria" bind:value={filterCategory}>
        <option value="">Todas as categorias</option>
        {#each data.expenseCategories as category (category.id)}<option value={String(category.id)}>{category.label}</option>{/each}
      </NativeSelect>
      <NativeSelect class="w-40" aria-label="Filtrar por tipo" bind:value={filterClass}>
        <option value="">Fixas e supérfluas</option>
        <option value="fixed">Só fixas</option>
        <option value="discretionary">Só supérfluas</option>
      </NativeSelect>
    {:else if view === "receive" && data.sources.length > 1}
      <NativeSelect class="w-48" aria-label="Filtrar por fonte" bind:value={filterSource}>
        <option value="">Todas as fontes</option>
        {#each data.sources as source (source.id)}<option value={String(source.id)}>{source.name}</option>{/each}
      </NativeSelect>
    {:else if view === "registry"}
      <Label class="font-normal"><Checkbox bind:checked={showArchived} /> Mostrar arquivadas</Label>
    {/if}
  </div>

  {#if view === "pay"}
    <div class="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi label="Esperado" icon={Wallet} tone="primary" info="Soma das contas que vencem em {data.monthLabel}, pelo valor esperado de cada uma.">
        <CountUp cents={data.summary.expectedCents} tone="neutral" />
      </Kpi>
      <Kpi
        label="Pago"
        tone="income"
        info="O que você já pagou neste mês nessas contas, pelos valores reais. A despesa só entra nas Despesas do mês quando a conta é paga."
      >
        <CountUp cents={data.summary.paidCents} tone="neutral" />
      </Kpi>
      <Kpi label="Falta pagar" tone="expense" info="Valor esperado das contas ainda não pagas, pendentes e atrasadas.">
        <CountUp cents={data.summary.remainingCents} tone="expense" />
      </Kpi>
      <Kpi
        label="Livre depois das contas"
        tone="transfer"
        info="Seu saldo total menos o que ainda falta pagar neste mês. Se ficar negativo, o saldo não cobre as contas que faltam."
      >
        <CountUp cents={data.summary.freeAfterCents} tone="auto" />
      </Kpi>
    </div>
    {#if data.summary.freeAfterCents < 0}
      <Alert class="mb-4" variant="warning">
        O saldo atual não cobre o que falta pagar em {data.monthLabel}: faltam {formatBRL(-data.summary.freeAfterCents)}.
      </Alert>
    {/if}

    <Card>
      <CardContent class="px-0">
        {#if occurrences.length === 0}
          {#if hasFilters && data.occurrences.length > 0}
            <EmptyState title="Nada encontrado." description="Nenhuma conta deste mês combina com os filtros." />
          {:else}
            <EmptyState
              title="Nenhuma conta para este mês."
              description="Cadastre o aluguel, a internet ou qualquer conta que se repete para acompanhar o que já foi pago."
            >
              {#snippet action()}<Button onclick={() => openNew("bill")}><Plus aria-hidden="true" />Cadastrar a primeira conta</Button>{/snippet}
            </EmptyState>
          {/if}
        {:else}
          <ul class="divide-y">
            {#each occurrences as occurrence (occurrence.billId)}
              {@const style = categoryStyle(occurrence.categoryName, "expense")}
              <li class="flex items-center gap-3 px-5 py-3">
                <IconChip icon={style.icon} tone={style.tone} title={occurrence.categoryName} />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="truncate font-medium">{occurrence.name}</span>
                    <Badge variant={statusVariant[occurrence.status]}>{billStatusLabel[occurrence.status]}</Badge>
                    <Badge variant="secondary">{classificationLabel[occurrence.classification]}</Badge>
                  </div>
                  <div class="truncate text-xs text-muted-foreground">
                    Vence {shortDate(occurrence.dueDate)} · {occurrence.categoryName}
                    {#if occurrence.status === "paid" && occurrence.paidAmountCents !== occurrence.expectedAmountCents}
                      · esperado {formatBRL(occurrence.expectedAmountCents)}
                    {/if}
                  </div>
                </div>
                <Money
                  class="font-semibold whitespace-nowrap"
                  cents={occurrence.paidAmountCents ?? occurrence.expectedAmountCents}
                  tone={occurrence.status === "paid" ? "expense" : "neutral"}
                />
                {#if occurrence.status === "paid"}
                  <IconButton
                    icon={Undo2}
                    label={`Desmarcar pagamento de ${occurrence.name}`}
                    onclick={() => askUndo("pay", occurrence.billId, occurrence.name, occurrence.period, occurrence.paidAmountCents ?? 0)}
                  />
                {:else}
                  <Button size="sm" variant="outline" onclick={() => askPay(occurrence)}>Pagar</Button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </CardContent>
    </Card>
  {:else if view === "receive"}
    <div class="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
      <Kpi label="Esperado" icon={Wallet} tone="primary" info="Soma das receitas que caem em {data.monthLabel}, pelo valor esperado de cada uma.">
        <CountUp cents={data.incomeSummary.expectedCents} tone="neutral" />
      </Kpi>
      <Kpi
        label="Recebido"
        tone="income"
        info="O que você já recebeu neste mês nessas receitas, pelos valores reais. A receita só entra nas Receitas do mês quando é recebida."
      >
        <CountUp cents={data.incomeSummary.receivedCents} tone="income" />
      </Kpi>
      <Kpi label="Falta receber" tone="transfer" info="Valor esperado das receitas ainda não recebidas, a receber e atrasadas.">
        <CountUp cents={data.incomeSummary.remainingCents} tone="neutral" />
      </Kpi>
    </div>

    <Card>
      <CardContent class="px-0">
        {#if incomeOccurrences.length === 0}
          {#if hasFilters && data.incomeOccurrences.length > 0}
            <EmptyState title="Nada encontrado." description="Nenhuma receita deste mês combina com o filtro." />
          {:else}
            <EmptyState
              title="Nenhuma receita esperada neste mês."
              description="Cadastre o salário ou o repasse que chega todo mês para acompanhar se já foi recebido."
            >
              {#snippet action()}<Button onclick={() => openNew("income")}><Plus aria-hidden="true" />Cadastrar a primeira receita</Button>{/snippet}
            </EmptyState>
          {/if}
        {:else}
          <ul class="divide-y">
            {#each incomeOccurrences as occurrence (occurrence.incomeId)}
              {@const style = categoryStyle(occurrence.categoryName, "income")}
              <li class="flex items-center gap-3 px-5 py-3">
                <IconChip icon={style.icon} tone={style.tone} title={occurrence.categoryName} />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="truncate font-medium">{occurrence.name}</span>
                    <Badge variant={statusVariant[occurrence.status]}>{incomeStatusLabel[occurrence.status]}</Badge>
                    <Badge variant="secondary">{occurrence.sourceName}</Badge>
                  </div>
                  <div class="truncate text-xs text-muted-foreground">
                    Cai {shortDate(occurrence.dueDate)} · {occurrence.categoryName}
                    {#if occurrence.status === "paid" && occurrence.paidAmountCents !== occurrence.expectedAmountCents}
                      · esperado {formatBRL(occurrence.expectedAmountCents)}
                    {/if}
                  </div>
                </div>
                <Money
                  class="font-semibold whitespace-nowrap"
                  cents={occurrence.paidAmountCents ?? occurrence.expectedAmountCents}
                  tone={occurrence.status === "paid" ? "income" : "neutral"}
                />
                {#if occurrence.status === "paid"}
                  <IconButton
                    icon={Undo2}
                    label={`Desmarcar recebimento de ${occurrence.name}`}
                    onclick={() => askUndo("receive", occurrence.incomeId, occurrence.name, occurrence.period, occurrence.paidAmountCents ?? 0)}
                  />
                {:else}
                  <Button size="sm" variant="outline" onclick={() => askReceive(occurrence)}>Receber</Button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </CardContent>
    </Card>
  {:else}
    <Alert class="mb-4">
      Estas contas e receitas são só o cadastro do que se repete: elas não criam lançamentos nem mexem nos saldos até você marcar cada mês como pago ou recebido.
    </Alert>

    <h2 class="mb-2 text-sm font-semibold">Contas a pagar</h2>
    <Card class="mb-6">
      <CardContent class="px-0">
        {#if bills.length === 0}
          <EmptyState title="Nenhuma conta cadastrada." description="Cadastre o que você paga todo mês ou todo ano." />
        {:else}
          <ul class="divide-y">
            {#each bills as bill (bill.id)}
              {@const style = categoryStyle(data.categoryName(bill.categoryId), "expense")}
              <li class={`flex items-center gap-3 px-5 py-3 ${bill.isActive ? "" : "opacity-60"}`}>
                <IconChip icon={style.icon} tone={style.tone} title={data.categoryName(bill.categoryId)} />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="truncate font-medium">{bill.name}</span>
                    <Badge variant="secondary">{classificationLabel[bill.classification]}</Badge>
                    {#if !bill.isActive}<Badge variant="outline">Arquivada</Badge>{/if}
                  </div>
                  <div class="truncate text-xs text-muted-foreground">{scheduleText(bill)} · {data.categoryName(bill.categoryId)}</div>
                </div>
                <Money class="font-semibold whitespace-nowrap" cents={bill.amountCents} />
                <div class="flex gap-0.5">
                  <IconButton icon={Pencil} label={`Editar ${bill.name}`} onclick={() => openEditBill(bill)} />
                  {#if bill.isActive}
                    <IconButton icon={Archive} label={`Arquivar ${bill.name}`} onclick={() => setActive("bill", bill.id, bill.name, false)} />
                  {:else}
                    <IconButton icon={ArchiveRestore} label={`Reativar ${bill.name}`} onclick={() => setActive("bill", bill.id, bill.name, true)} />
                  {/if}
                  <IconButton icon={Trash} label={`Excluir ${bill.name}`} onclick={() => askDelete("bill", bill.id, bill.name)} />
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </CardContent>
    </Card>

    <h2 class="mb-2 text-sm font-semibold">Receitas recorrentes</h2>
    <Card>
      <CardContent class="px-0">
        {#if incomes.length === 0}
          <EmptyState title="Nenhuma receita cadastrada." description="Cadastre o salário ou o repasse que chega sempre." />
        {:else}
          <ul class="divide-y">
            {#each incomes as income (income.id)}
              {@const style = categoryStyle(data.categoryName(income.categoryId), "income")}
              <li class={`flex items-center gap-3 px-5 py-3 ${income.isActive ? "" : "opacity-60"}`}>
                <IconChip icon={style.icon} tone={style.tone} title={data.categoryName(income.categoryId)} />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="truncate font-medium">{income.name}</span>
                    <Badge variant="secondary">{data.sourceName(income.sourceId)}</Badge>
                    {#if !income.isActive}<Badge variant="outline">Arquivada</Badge>{/if}
                  </div>
                  <div class="truncate text-xs text-muted-foreground">{scheduleText(income)} · {data.categoryName(income.categoryId)}</div>
                </div>
                <Money class="font-semibold whitespace-nowrap" cents={income.amountCents} tone="income" />
                <div class="flex gap-0.5">
                  <IconButton icon={Pencil} label={`Editar ${income.name}`} onclick={() => openEditIncome(income)} />
                  {#if income.isActive}
                    <IconButton icon={Archive} label={`Arquivar ${income.name}`} onclick={() => setActive("income", income.id, income.name, false)} />
                  {:else}
                    <IconButton icon={ArchiveRestore} label={`Reativar ${income.name}`} onclick={() => setActive("income", income.id, income.name, true)} />
                  {/if}
                  <IconButton icon={Trash} label={`Excluir ${income.name}`} onclick={() => askDelete("income", income.id, income.name)} />
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <Dialog bind:open={formOpen} title={formKind === "income" ? (editingIncome ? "Editar receita" : "Nova receita") : editingBill ? "Editar conta" : "Nova conta"}>
    {#key `${formKind}-${editingBill?.id ?? editingIncome?.id ?? "new"}-${formOpen}`}
      <BillForm
        accounts={data.accounts}
        categories={formKind === "income" ? data.incomeCategories : data.expenseCategories}
        sources={data.sources}
        mode={formKind}
        initial={formInitial}
        editing={editingBill !== null || editingIncome !== null}
        onsubmit={saveForm}
        oncancel={() => (formOpen = false)}
      />
    {/key}
  </Dialog>

  <AmountChangeDialog
    bind:open={amountOpen}
    billName={amountChange?.name ?? ""}
    fromCents={amountChange?.fromCents ?? 0}
    toCents={amountChange?.cents ?? 0}
    onchoose={applyAmount}
  />

  <PayBillDialog bind:open={payOpen} occurrence={payTarget} mode={payTarget?.mode ?? "pay"} accounts={data.accounts} onpay={pay} />

  <ConfirmDialog
    bind:open={undoOpen}
    title={undoTarget?.mode === "receive" ? "Desmarcar este recebimento?" : "Desmarcar este pagamento?"}
    description={undoTarget
      ? undoTarget.mode === "receive"
        ? `A receita de ${formatBRL(undoTarget.cents)} de ${undoTarget.name} será apagada e o saldo da conta volta ao que era.`
        : `A despesa de ${formatBRL(undoTarget.cents)} de ${undoTarget.name} será apagada e o saldo da conta volta ao que era.`
      : undefined}
    confirmLabel="Desmarcar"
    destructive
    onconfirm={confirmUndo}
  />

  <ConfirmDialog
    bind:open={deleteOpen}
    title={`Excluir ${deleting?.name ?? "item"}?`}
    description="Sai do cadastro. Só dá para excluir o que nunca foi pago ou recebido; para o resto, use Arquivar."
    confirmLabel="Excluir"
    destructive
    onconfirm={confirmDelete}
  />
{/if}

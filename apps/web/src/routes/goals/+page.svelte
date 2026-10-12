<script lang="ts">
  import { Archive, ArchiveRestore, ChartLine, CheckCheck, Minus, Pencil, Plus, Split, Target, Trash } from "@lucide/svelte";
  import type { Goal } from "@finance/database";
  import { progressPercent } from "@finance/core";
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
    Kpi,
    Label,
    Money,
    PageHeader,
    Progress,
    formatBRL,
    toast,
  } from "@finance/ui";
  import ContributionDialog from "$lib/ContributionDialog.svelte";
  import DistributeDialog from "$lib/DistributeDialog.svelte";
  import { formatDate } from "$lib/flow";
  import GoalForm, { type GoalFormInitial, type GoalFormValues } from "$lib/GoalForm.svelte";
  import GoalReportDialog from "$lib/GoalReportDialog.svelte";
  import { currentPeriod } from "$lib/local-date";
  import OpenDatabasePanel from "$lib/OpenDatabasePanel.svelte";
  import { session } from "$lib/session.svelte";

  const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const statusLabel = { active: "Ativa", executed: "Executada", archived: "Arquivada" } as const;

  let showInactive = $state(false);

  const data = $derived.by(() => {
    void session.revision;
    const repo = session.repo;
    if (!repo) return null;
    const period = currentPeriod();
    const [year = 0, mon = 1] = period.split("-").map(Number);
    return {
      goals: repo.listGoals({ includeInactive: showInactive }),
      active: repo.listGoals(),
      reserved: repo.getReservedSummary(),
      leftover: repo.getMonthSummary(period).resultCents,
      monthLabel: `${MONTHS[mon - 1]} de ${year}`,
    };
  });

  // --- criar e editar --------------------------------------------------------------------------------------------
  let formOpen = $state(false);
  let editing = $state<Goal | null>(null);
  let formInitial = $state<GoalFormInitial>({ name: "", target: "", targetDate: "" });

  function openNew() {
    editing = null;
    formInitial = { name: "", target: "", targetDate: "" };
    formOpen = true;
  }

  function openEdit(goal: Goal) {
    editing = goal;
    formInitial = {
      name: goal.name,
      target: goal.targetCents === null ? "" : (goal.targetCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      targetDate: goal.targetDate ?? "",
    };
    formOpen = true;
  }

  function saveGoal(values: GoalFormValues): string | null {
    const target = editing;
    try {
      session.change((repo) => (target ? repo.updateGoal(target.id, values) : repo.createGoal(values)));
    } catch (error) {
      return error instanceof Error ? error.message : "Não foi possível salvar a meta.";
    }
    formOpen = false;
    toast.show({ message: target ? "Meta atualizada" : "Meta criada", tone: "success" });
    return null;
  }

  // --- aportes e resgates ------------------------------------------------------------------------------------------
  let contributionOpen = $state(false);
  let contributionMode = $state<"add" | "withdraw">("add");
  let contributionGoal = $state<number | null>(null);

  function openContribution(mode: "add" | "withdraw", goal: Goal | null) {
    contributionMode = mode;
    contributionGoal = goal?.id ?? null;
    contributionOpen = true;
  }

  function saveContribution(values: { goalId: number; amountCents: number; date: string; note: string }): string | null {
    try {
      session.change((repo) => repo.addContribution(values.goalId, { amountCents: values.amountCents, date: values.date, note: values.note }));
    } catch (error) {
      return error instanceof Error ? error.message : "Não foi possível registrar.";
    }
    toast.show({ message: values.amountCents < 0 ? "Valor retirado da meta" : "Valor colocado na meta", tone: "success" });
    return null;
  }

  let distributeOpen = $state(false);

  function saveDistribution(values: { allocations: { goalId: number; amountCents: number }[]; date: string; note: string }): string | null {
    try {
      session.change((repo) => repo.distributeToGoals(values.allocations, values.date, values.note));
    } catch (error) {
      return error instanceof Error ? error.message : "Não foi possível distribuir.";
    }
    toast.show({ message: "Sobra distribuída", tone: "success" });
    return null;
  }

  // --- relatório, situação e exclusão --------------------------------------------------------------------------------
  let reportOpen = $state(false);
  let reportGoal = $state<number | null>(null);

  function openReport(goal: Goal) {
    reportGoal = goal.id;
    reportOpen = true;
  }

  let executeOpen = $state(false);
  let executing = $state<Goal | null>(null);

  function askExecute(goal: Goal) {
    executing = goal;
    executeOpen = true;
  }

  function confirmExecute() {
    const target = executing;
    if (!target) return;
    session.change((repo) => repo.setGoalStatus(target.id, "executed"));
    toast.show({ message: `${target.name} marcada como executada` });
  }

  function setStatus(goal: Goal, status: "active" | "archived") {
    session.change((repo) => repo.setGoalStatus(goal.id, status));
    if (status === "archived") {
      toast.show({
        message: `${goal.name} arquivada`,
        duration: 5000,
        action: { label: "Desfazer", onclick: () => session.change((repo) => repo.setGoalStatus(goal.id, "active")) },
      });
    }
  }

  let deleteOpen = $state(false);
  let deleting = $state<Goal | null>(null);

  function askDelete(goal: Goal) {
    deleting = goal;
    deleteOpen = true;
  }

  function confirmDelete() {
    const target = deleting;
    if (!target) return;
    try {
      session.change((repo) => repo.deleteGoal(target.id));
      toast.show({ message: `${target.name} excluída` });
    } catch (error) {
      toast.show({ message: error instanceof Error ? error.message : "Não foi possível excluir.", tone: "destructive", duration: 0 });
    }
  }
</script>

<svelte:head><title>Metas · Finanças</title></svelte:head>

{#if !data}
  <PageHeader title="Metas" />
  <OpenDatabasePanel />
{:else}
  <PageHeader title="Metas" description="Caixinhas para separar dinheiro de um objetivo, sem tirá-lo das suas contas.">
    {#snippet actions()}
      {#if data.active.length > 0}
        <Button variant="outline" onclick={() => (distributeOpen = true)}><Split aria-hidden="true" />Distribuir a sobra</Button>
      {/if}
      <Button onclick={openNew}><Plus aria-hidden="true" />Nova meta</Button>
    {/snippet}
  </PageHeader>

  <div class="mb-4 grid grid-cols-2 gap-3">
    <Kpi
      label="Reservado"
      icon={Target}
      tone="primary"
      info="Dinheiro que você separou nas metas ativas. Ele continua nas suas contas; o saldo total não muda."
    >
      <CountUp cents={data.reserved.reservedCents} tone="neutral" />
    </Kpi>
    <Kpi
      label="Livre"
      tone="income"
      info="Seu saldo total menos o que está reservado nas metas. É o que você pode gastar sem mexer no que separou."
    >
      <CountUp cents={data.reserved.freeCents} tone="auto" />
    </Kpi>
  </div>
  {#if data.reserved.freeCents < 0}
    <Alert class="mb-4" variant="warning">O saldo das suas contas está abaixo do que você reservou nas metas.</Alert>
  {/if}

  <Label class="mb-4 font-normal"><Checkbox bind:checked={showInactive} /> Mostrar executadas e arquivadas</Label>

  {#if data.goals.length === 0}
    <Card>
      <CardContent class="px-0">
        <EmptyState title="Nenhuma meta ainda." description="Crie uma meta, como uma viagem ou uma reserva, e vá colocando valores nela.">
          {#snippet action()}<Button onclick={openNew}><Plus aria-hidden="true" />Criar a primeira meta</Button>{/snippet}
        </EmptyState>
      </CardContent>
    </Card>
  {:else}
    <div class="grid gap-3 lg:grid-cols-2">
      {#each data.goals as goal (goal.id)}
        {@const percent = progressPercent(goal.savedCents, goal.targetCents)}
        <Card class={`min-w-0 ${goal.status === "active" ? "" : "opacity-70"}`}>
          <CardContent class="grid gap-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate font-medium">{goal.name}</span>
                  {#if goal.status !== "active"}<Badge variant="outline">{statusLabel[goal.status]}</Badge>{/if}
                </div>
                {#if goal.targetDate}<div class="text-xs text-muted-foreground">Prazo: {formatDate(goal.targetDate)}</div>{/if}
              </div>
              <div class="flex shrink-0 gap-0.5">
                <IconButton icon={ChartLine} label={`Ver relatório de ${goal.name}`} onclick={() => openReport(goal)} />
                <IconButton icon={Pencil} label={`Editar ${goal.name}`} onclick={() => openEdit(goal)} />
                {#if goal.status === "active"}
                  <IconButton icon={CheckCheck} label={`Marcar ${goal.name} como executada`} onclick={() => askExecute(goal)} />
                  <IconButton icon={Archive} label={`Arquivar ${goal.name}`} onclick={() => setStatus(goal, "archived")} />
                {:else}
                  <IconButton icon={ArchiveRestore} label={`Reativar ${goal.name}`} onclick={() => setStatus(goal, "active")} />
                {/if}
                <IconButton icon={Trash} label={`Excluir ${goal.name}`} onclick={() => askDelete(goal)} />
              </div>
            </div>
            <div>
              <div class="flex items-baseline justify-between gap-2">
                <Money class="text-xl font-semibold" cents={goal.savedCents} />
                {#if goal.targetCents !== null}<span class="text-sm text-muted-foreground">de {formatBRL(goal.targetCents)}</span>{/if}
              </div>
              {#if percent !== null}
                <Progress class="mt-2" value={percent} aria-label={`${percent}% do alvo de ${goal.name}`} />
              {/if}
            </div>
            {#if goal.status === "active"}
              <div class="flex flex-wrap gap-2">
                <Button size="sm" onclick={() => openContribution("add", goal)}><Plus aria-hidden="true" />Colocar</Button>
                <Button size="sm" variant="outline" onclick={() => openContribution("withdraw", goal)}><Minus aria-hidden="true" />Retirar</Button>
              </div>
            {/if}
          </CardContent>
        </Card>
      {/each}
    </div>
  {/if}

  <Dialog bind:open={formOpen} title={editing ? "Editar meta" : "Nova meta"}>
    {#key `${editing?.id ?? "new"}-${formOpen}`}
      <GoalForm initial={formInitial} onsubmit={saveGoal} oncancel={() => (formOpen = false)} />
    {/key}
  </Dialog>

  <ContributionDialog bind:open={contributionOpen} goals={data.active} goalId={contributionGoal} mode={contributionMode} onsave={saveContribution} />

  <DistributeDialog bind:open={distributeOpen} goals={data.active} availableCents={data.leftover} monthLabel={data.monthLabel} onsave={saveDistribution} />

  <GoalReportDialog bind:open={reportOpen} goalId={reportGoal} />

  <ConfirmDialog
    bind:open={executeOpen}
    title={`Marcar ${executing?.name ?? "a meta"} como executada?`}
    description="Use quando o dinheiro da meta já foi gasto no objetivo. A reserva é liberada e volta para o Livre; o histórico continua no relatório."
    confirmLabel="Marcar como executada"
    onconfirm={confirmExecute}
  />

  <ConfirmDialog
    bind:open={deleteOpen}
    title={`Excluir ${deleting?.name ?? "meta"}?`}
    description="Só dá para excluir metas que nunca receberam aportes; para as outras, use Arquivar."
    confirmLabel="Excluir"
    destructive
    onconfirm={confirmDelete}
  />
{/if}

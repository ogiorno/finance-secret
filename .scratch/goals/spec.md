Status: done (implementada e verificada em 2026-10-12, exceto a história 16, do Assistant, que depende do servidor da Fase 3 ainda inexistente; o teste E2E foi escrito mas não executado, por falta do navegador do Playwright)

# Metas (caixinhas)

## Problem Statement

Quando o mês fecha e sobra dinheiro, não tenho onde separar essa sobra para objetivos (viagem, reserva de emergência). Anoto de cabeça ou em outro lugar, e não sei quanto já guardei para cada objetivo nem como isso evoluiu ao longo dos meses.

## Solution

Crio **Goals** (metas), como caixinhas. Recebi R$ 1.000, paguei tudo, sobraram R$ 200: coloco R$ 100 na meta "Viagem" e R$ 100 na "Reserva". Cada valor colocado é uma **Contribution** com data. O dinheiro continua na Account de sempre (o Saldo total não muda); a meta apenas **reserva** esse valor, e o app mostra quanto do saldo está reservado e quanto está livre. Um relatório por meta mostra quanto foi colocado mês a mês, o acumulado, o progresso e, se houver prazo, o ritmo necessário.

## User Stories

1. Como usuário, quero criar uma Goal com nome, valor alvo opcional e prazo opcional, para ter um objetivo a perseguir.
2. Como usuário, quero adicionar uma Contribution a uma Goal informando só o valor, para o registro levar poucos segundos.
3. Como usuário, quero trocar a data da Contribution em "Opções avançadas" (padrão hoje) e acrescentar uma observação, para registrar aportes de dias anteriores sem poluir o fluxo rápido.
4. Como usuário, quero retirar valor de uma Goal (resgate), para usar o que guardei sem apagar o histórico.
5. Como usuário, quero impedir que o resgate deixe o total da Goal negativo, para os números fazerem sentido.
6. Como usuário, quero ver a lista de Goals com valor guardado, alvo e progresso, para saber onde estou.
7. Como usuário, quero ver o total reservado em todas as Goals e quanto do meu saldo está livre, para não gastar o que separei.
8. Como usuário, quero um atalho "Distribuir a sobra do mês" que mostra o "Resultado do mês" e deixa repartir o valor entre as Goals, para fazer a divisão de uma vez.
9. Como usuário, quero que a repartição não perca nem crie centavo (a soma das partes é a soma escolhida), para as contas fecharem.
10. Como usuário, quero um relatório por Goal com aportes por mês, acumulado e progresso, para ver quanto fui colocando na viagem.
11. Como usuário, quero ver no relatório a estimativa de quando a Goal será atingida no ritmo atual, e quanto aportar por mês para cumprir o prazo, para planejar.
12. Como usuário, quero um relatório geral comparando todas as Goals no período, para ver para onde a sobra foi.
13. Como usuário, quero editar, concluir e arquivar uma Goal, mantendo o histórico, para refletir mudanças.
14. Como usuário, quero que excluir uma Contribution ou uma Goal sempre peça confirmação, para não perder dados por engano.
15. Como usuário, quero um "i" explicando "Reservado" e "Livre", para não me perder.
16. Como usuário, quero pedir ao Assistant "coloca 100 na viagem" e aprovar a Proposal, para registrar por conversa; se o nome da Goal for ambíguo ou não existir, ele pergunta.
17. Como usuário, quero usar tudo isso também no Offline mode, para consultar e editar fora do servidor.

## Implementation Decisions

- **Vocabulário (atualizar `GLOSSARY.md`):**
  - **Goal**: caixinha com nome, alvo opcional e prazo opcional. Não é Account e não tem saldo bancário.
  - **Contribution**: valor colocado (positivo) ou retirado (negativo) de uma Goal numa data. **Não é uma Transaction**: não move dinheiro entre Accounts, não é receita nem despesa e não entra em Receitas, Despesas, Resultado nem Saldo total.
  - **Reserved**: soma das Contributions de todas as Goals não executadas (dinheiro já separado, como "caixa restrito"). **Free**: Saldo total menos Reserved. A aba Contas a pagar (spec `bills-and-transaction-details`) subtrai ainda as contas pendentes do mês, chamando o resultado de "Livre depois das contas".
  - Evitar: "Transaction-aporte", "Account da meta".
- **Decisão de modelo:** meta é reserva, não transferência. Motivo: manter Transaction = movimento real em uma Account, e o Saldo total refletir o banco. Isso **substitui** "metas com `account_id` opcional, senão `current_amount_cents` manual" de `docs/spec-decisions.md` (Fase 5); atualizar lá ao implementar. Migração: as tabelas de metas ainda não existem no código.
- **Modelo de dados (migration nova, nos dois drivers, ADR 0001):**
  - `goals`: `id`, `name`, `target_cents` nulo (> 0), `target_date` nulo (`YYYY-MM-DD`), `status` (`active` | `executed` | `archived`; "executada" = o usuário já usou o dinheiro da meta e a marcou), `created_at`.
  - `goal_contributions`: `id`, `goal_id`, `amount_cents` (inteiro, diferente de zero; negativo = resgate), `contribution_date` (`YYYY-MM-DD`, data local, padrão hoje), `note` nula, `created_at`.
  - Regra: a soma de `amount_cents` de uma Goal nunca é negativa, validada no repositório a cada gravação, edição e exclusão (apagar um aporte antigo que deixaria o total negativo é recusado).
  - Goal com Contributions só é arquivada; sem Contributions pode ser excluída (mesma regra de Account e Category).
- **Dinheiro:** centavos inteiros, como no resto do app. Repartição e projeções em `packages/core` só com inteiros: a repartição distribui o resto em centavos; o ritmo mensal necessário é `ceil(restante_cents / meses_restantes)` e o prazo estimado usa a média mensal de aportes em centavos, sem float.
- **Distribuir a sobra:** sugere o "Resultado do mês" (Receitas − Despesas, quando positivo) como valor disponível; o usuário informa quanto vai para cada Goal. Se a soma passar do disponível, mostra um aviso, sem bloquear (a sobra pode estar em outro mês). Grava uma Contribution por Goal, todas numa única transação de banco.
- **Registro rápido:** só valor (e a Goal, quando houver mais de uma). Data e observação em Opções avançadas.
- **Relatório (tela "Metas"):** por Goal, tabela e gráfico (ECharts, com tabela equivalente acessível) de aportes por mês e acumulado, progresso (% quando há alvo), estimativa de conclusão e aporte mensal necessário até o prazo. Visão geral comparando as Goals no período. Os totais por mês saem de uma consulta de repositório, não de cálculo na tela.
- **Dashboard:** um cartão compacto com Reservado e Livre, e o atalho para Metas.
- **Confirmar exclusão:** reutiliza o diálogo único do `@finance/ui` (spec `bills-and-transaction-details`).
- **Assistant:** só por Proposal (ADR 0003), com operações fixas do repositório: criar Goal, adicionar Contribution. Nome ambíguo ou inexistente gera pergunta, não suposição.
- **Interface:** segue `docs/ui-spec.md` e o design system (`@finance/ui`, só tokens, skill `finance-ui`), texto em PT-BR. Tela "Metas" (rota `/goals`) com Reservado e Livre, cartões de meta, aporte rápido, resgate, "Distribuir a sobra" e relatório por meta; cartão compacto "Metas" no painel. Meta arquivada também libera a reserva (só as ativas reservam). O relatório geral entre metas (`getGoalsOverview`) existe no repositório, mas ainda não tem tela.
- **Offline mode:** tudo disponível (SQL puro). Só o Assistant exige servidor.

## Testing Decisions

- Testar comportamento visível pelo repositório e pela tela.
- **Core (unit):** repartição sem perder centavo, aporte mensal necessário (arredondando para cima), estimativa de conclusão, Goal sem alvo e sem prazo.
- **Repositório (nos dois drivers):** soma por Goal e por mês; resgate acima do guardado recusado; apagar aporte que negativaria a Goal recusado; Goal com histórico só arquiva; Reserved e Free corretos e Saldo total inalterado; distribuição grava tudo ou nada.
- **E2E:** criar "Viagem" com alvo, distribuir a sobra de R$ 200 em duas Goals, ver Reservado/Livre no dashboard, abrir o relatório da viagem, resgatar, excluir com confirmação.
- **Assistant (provedor falso):** "coloca 100 na viagem" gera Proposal; nome ambíguo gera pergunta e nada é gravado.
- Prior art: suítes de repositório de transferências e exclusão; `money.test.ts` em `packages/core/test`.

## Out of Scope

- Mover dinheiro de verdade para uma conta-caixinha (Transfer) ou integração com cofrinhos de bancos.
- Aportes automáticos ou recorrentes.
- Juros e rendimento sobre a meta.
- Metas compartilhadas e sincronização (V2).
- Orçamento por Category (outra feature da Fase 5).

## Further Notes

- Decidido: a reserva pertence ao banco (`.db`) onde a Goal foi criada; cada banco tem suas Goals e não há reserva entre bancos. Dentro do banco ela é global, sem vínculo com uma Account. Se o saldo real ficar abaixo do reservado, o app só mostra Livre negativo, sem bloquear.
- Decidido: uma Goal continua contando em Reserved mesmo depois de atingir o alvo, até o usuário marcá-la como **executada** (ação explícita, com confirmação). Ao executar, a reserva é liberada (deixa de contar em Reserved e volta para Livre), e o histórico e o relatório permanecem.
- Ordem sugerida: (1) `core` de repartição e projeções, (2) tabelas e repositório, (3) lista de Goals e aporte rápido, (4) Reservado/Livre no dashboard, (5) distribuir a sobra, (6) relatório, (7) Assistant.

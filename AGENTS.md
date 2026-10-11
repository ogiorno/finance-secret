# AGENTS.md

Projeto `finance-secret`. Skills instaladas em `.claude/skills/`:
- Serviços financeiros (origem: https://github.com/anthropics/financial-services)
- Engenharia e produtividade (origem: https://github.com/mattpocock/skills, MIT — licença em `.claude/MATTPOCOCK-SKILLS-LICENSE`)

**Regra para o agente:** antes de executar qualquer tarefa, verifique a tabela abaixo. Se a tarefa casar com alguma skill, USE a skill (invoque-a / leia `.claude/skills/<nome>/SKILL.md`) em vez de improvisar.

## Mapa de skills

### equity-research

| Skill | Quando usar | Arquivo |
|---|---|---|
| `catalyst-calendar` | Build and maintain a calendar of upcoming catalysts across a coverage universe — earnings dates, conferences, product launches, regulatory decisions, and macro events. Helps prioritize attention and position ahead of events. Triggers on "catalyst calendar", "upcoming events", "what's coming up", "ea | `.claude/skills/catalyst-calendar/SKILL.md` |
| `earnings-analysis` | Create professional equity research earnings update reports (8-12 pages, 3,000-5,000 words) analyzing quarterly results for companies already under coverage. Fast-turnaround format focusing on beat/miss analysis, key metrics, updated estimates, and revised thesis. Includes 1-3 summary tables and 8-1 | `.claude/skills/earnings-analysis/SKILL.md` |
| `earnings-preview` | Build pre-earnings analysis with estimate models, scenario frameworks, and key metrics to watch. Use before a company reports quarterly earnings to prepare positioning notes, set up bull/bear scenarios, and identify what will move the stock. Triggers on "earnings preview", "what to watch for [compan | `.claude/skills/earnings-preview/SKILL.md` |
| `idea-generation` | Systematic stock screening and investment idea sourcing. Combines quantitative screens, thematic research, and pattern recognition to surface new long and short ideas. Use when looking for new ideas, running screens, or conducting thematic sweeps. Triggers on "idea generation", "stock screen", "find | `.claude/skills/idea-generation/SKILL.md` |
| `initiating-coverage` | Create institutional-quality equity research initiation reports through a 5-task workflow. Tasks must be executed individually with verified prerequisites - (1) company research, (2) financial modeling, (3) valuation analysis, (4) chart generation, (5) final report assembly. Each task produces speci | `.claude/skills/initiating-coverage/SKILL.md` |
| `model-update` | Update financial models with new data — quarterly earnings, management guidance, macro changes, or revised assumptions. Adjusts estimates, recalculates valuation, and flags material changes. Use after earnings, guidance updates, or when assumptions need refreshing. Triggers on "update model", "plug  | `.claude/skills/model-update/SKILL.md` |
| `morning-note` | Draft concise morning meeting notes summarizing overnight developments, trade ideas, and key events for coverage stocks. Designed for the 7am morning meeting format — tight, opinionated, actionable. Triggers on "morning note", "morning meeting", "what happened overnight", "trade idea", "morning call | `.claude/skills/morning-note/SKILL.md` |
| `sector-overview` | Create comprehensive industry and sector landscape reports covering market dynamics, competitive positioning, key players, and thematic trends. Use for client requests, sector initiations, thematic research pieces, or internal knowledge building. Triggers on "sector overview", "industry report", "ma | `.claude/skills/sector-overview/SKILL.md` |
| `thesis-tracker` | Maintain and update investment theses for portfolio positions and watchlist names. Track key data points, catalysts, and thesis milestones over time. Use when updating a thesis with new information, reviewing position rationale, or checking if a thesis is still intact. Triggers on "update thesis for | `.claude/skills/thesis-tracker/SKILL.md` |

### financial-analysis

| Skill | Quando usar | Arquivo |
|---|---|---|
| `3-statement-model` | Complete, populate and fill out 3-statement financial model templates (Income Statement, Balance Sheet, Cash Flow Statement) . Use when asked to fill out model templates, complete existing model frameworks, populate financial models with data, complete a partially filled IS/BS/CF framework, or link  | `.claude/skills/3-statement-model/SKILL.md` |
| `audit-xls` | Audit a spreadsheet for formula accuracy, errors, and common mistakes. Scopes to a selected range, a single sheet, or the entire model (including financial-model integrity checks like BS balance, cash tie-out, and logic sanity). Triggers on "audit this sheet", "check my formulas", "find formula erro | `.claude/skills/audit-xls/SKILL.md` |
| `clean-data-xls` | Clean up messy spreadsheet data — trim whitespace, fix inconsistent casing, convert numbers-stored-as-text, standardize dates, remove duplicates, and flag mixed-type columns. Use when data is messy, inconsistent, or needs prep before analysis. Triggers on "clean this data", "clean up this sheet", "n | `.claude/skills/clean-data-xls/SKILL.md` |
| `competitive-analysis` | Framework for building competitive landscape decks — market positioning, competitor deep-dives, comparative analysis, strategic synthesis. Use when the user asks for a competitive landscape, competitor analysis, peer comparison, market positioning assessment, strategic review, or investment memo dec | `.claude/skills/competitive-analysis/SKILL.md` |
| `comps-analysis` | Build institutional-grade comparable company analyses with operating metrics, valuation multiples, and statistical benchmarking in Excel/spreadsheet format. **Perfect for:** - Public company valuation (M&A, investment analysis) - Benchmarking performance vs. industry peers - Pricing IPOs or funding  | `.claude/skills/comps-analysis/SKILL.md` |
| `dcf-model` | Real DCF (Discounted Cash Flow) model creation for equity valuation. Retrieves financial data from SEC filings and analyst reports, builds comprehensive cash flow projections with proper WACC calculations, performs sensitivity analysis, and outputs professional Excel models with executive summaries. | `.claude/skills/dcf-model/SKILL.md` |
| `deck-refresh` | Updates a presentation with new numbers — quarterly refreshes, earnings updates, comp rolls, rebased market data. Use whenever the user asks to "update the deck with Q4 numbers", "refresh the comps", "roll this forward", "swap in the new earnings", "change all the $485M to $512M", or any request to  | `.claude/skills/deck-refresh/SKILL.md` |
| `ib-check-deck` | Investment banking presentation quality checker. Reviews a pitch deck or client-ready presentation for (1) number consistency across slides, (2) data-narrative alignment, (3) language polish against IB standards, (4) visual and formatting QC. Use whenever the user asks to review, check, QC, proof, o | `.claude/skills/ib-check-deck/SKILL.md` |
| `lbo-model` | This skill should be used when completing LBO (Leveraged Buyout) model templates in Excel for private equity transactions, deal materials, or investment committee presentations. The skill fills in formulas, validates calculations, and ensures professional formatting standards that adapt to any templ | `.claude/skills/lbo-model/SKILL.md` |
| `ppt-template-creator` | Creates self-contained PPT template SKILLS (not presentations) from user-provided PowerPoint templates. Use ONLY when a user wants to create a reusable skill from their template. For creating actual presentations, use the pptx skill instead. | `.claude/skills/ppt-template-creator/SKILL.md` |
| `pptx-author` | Produce a .pptx file on disk (headless) instead of driving a live PowerPoint document — for managed-agent sessions with no open Office app. | `.claude/skills/pptx-author/SKILL.md` |
| `skill-creator` | Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations. | `.claude/skills/skill-creator/SKILL.md` |
| `xlsx-author` | Produce a .xlsx file on disk (headless) instead of driving a live Excel workbook — for managed-agent sessions with no open Office app. | `.claude/skills/xlsx-author/SKILL.md` |

### fund-admin

| Skill | Quando usar | Arquivo |
|---|---|---|
| `accrual-schedule` | Build the period-end accrual schedule — for each accrual, compute the entry, cite the support, and draft the JE. Use during month-end close; the JE is a draft for controller approval, not a posting. | `.claude/skills/accrual-schedule/SKILL.md` |
| `break-trace` | Root-cause a reconciliation break to its source transaction or posting — follow the audit trail from the break row back to the originating entry on each side and state what differs and why. Use after gl-recon has classified a break. | `.claude/skills/break-trace/SKILL.md` |
| `gl-recon` | Reconcile general ledger to subledger for a trade date or period — match at the position or transaction level, surface breaks, and classify each break by likely cause. Use for daily or month-end recon runs across asset classes. | `.claude/skills/gl-recon/SKILL.md` |
| `nav-tieout` | Tie an LP statement to the fund's NAV pack — recompute the LP's capital account from the NAV components and flag any line that doesn't agree. Use before LP statements are distributed. | `.claude/skills/nav-tieout/SKILL.md` |
| `roll-forward` | Build a roll-forward schedule for a balance-sheet account — beginning balance plus activity less reversals equals ending balance, with each component tied to GL. Use for month-end close packages and audit support. | `.claude/skills/roll-forward/SKILL.md` |
| `variance-commentary` | Write flux commentary for every P&L and balance-sheet line over threshold — current vs prior period and vs budget, with the driver explained from underlying activity. Use for the month-end close package and management reporting. | `.claude/skills/variance-commentary/SKILL.md` |

### investment-banking

| Skill | Quando usar | Arquivo |
|---|---|---|
| `buyer-list` | Build and organize a universe of potential acquirers for sell-side M&A processes. Identifies strategic and financial buyers, assesses fit, and prioritizes outreach. Use when preparing for a sell-side mandate, building a buyer universe, or evaluating potential partners. Triggers on "buyer list", "buy | `.claude/skills/buyer-list/SKILL.md` |
| `cim-builder` | Structure and draft a Confidential Information Memorandum for sell-side M&A processes. Organizes company information into a professional, investor-ready document with consistent formatting and narrative flow. Use when preparing sell-side materials, drafting a CIM, or organizing company data for a sa | `.claude/skills/cim-builder/SKILL.md` |
| `datapack-builder` | Build professional financial services data packs from various sources including CIMs, offering memorandums, SEC filings, web search, or MCP servers. Extract, normalize, and standardize financial data into investment committee-ready Excel workbooks with consistent structure, proper formatting, and do | `.claude/skills/datapack-builder/SKILL.md` |
| `deal-tracker` | Track multiple live deals with milestones, deadlines, action items, and status updates. Maintains a deal pipeline view and surfaces upcoming deadlines and overdue items. Use when managing a book of business, tracking process milestones, or preparing for weekly deal reviews. Triggers on "deal tracker | `.claude/skills/deal-tracker/SKILL.md` |
| `merger-model` | Build accretion/dilution analysis for M&A transactions. Models pro forma EPS impact, synergy sensitivities, and purchase price allocation. Use when evaluating a potential acquisition, preparing merger consequences analysis for a pitch, or advising on deal terms. Triggers on "merger model", "accretio | `.claude/skills/merger-model/SKILL.md` |
| `pitch-deck` | "Populates investment banking pitch deck templates with data from source files. Use when: user provides a PowerPoint template to fill in, user has source data (Excel/CSV) to populate into slides, user mentions populating or filling a pitch deck template, or user needs to transfer data into existing  | `.claude/skills/pitch-deck/SKILL.md` |
| `process-letter` | Draft process letters and bid instructions for sell-side M&A processes. Covers initial indication of interest (IOI) instructions, final bid procedures, and management meeting logistics. Triggers on "process letter", "bid instructions", "IOI letter", "bid procedures", "final round letter", or "manage | `.claude/skills/process-letter/SKILL.md` |
| `strip-profile` | Creates professional investment banking strip profiles (company profiles) for pitch books, deal materials, and client presentations. Generates 1-4 information-dense slides with quadrant layouts, charts, and tables. | `.claude/skills/strip-profile/SKILL.md` |
| `teaser` | Draft anonymous one-page company teasers for sell-side M&A processes. Creates a compelling summary without revealing the company's identity, designed to gauge buyer interest before NDA execution. Triggers on "teaser", "blind teaser", "anonymous profile", "one-pager for process", or "draft teaser for | `.claude/skills/teaser/SKILL.md` |

### operations

| Skill | Quando usar | Arquivo |
|---|---|---|
| `kyc-doc-parse` | Parse an investor or client onboarding packet into structured KYC fields — identity, ownership, control, source of funds, and document inventory. Use as the first step of KYC screening; output feeds the rules engine. | `.claude/skills/kyc-doc-parse/SKILL.md` |
| `kyc-rules` | Apply the firm's KYC/AML rules grid to a parsed onboarding record — assign a risk rating, list every rule outcome with the rule cited, and flag what's missing or escalation-worthy. Use after kyc-doc-parse; this skill decides nothing, it scores and routes. | `.claude/skills/kyc-rules/SKILL.md` |

### private-equity

| Skill | Quando usar | Arquivo |
|---|---|---|
| `ai-readiness` | Scan the portfolio for the highest-leverage AI opportunities and rank where to deploy operating-partner time. Ingests quarterly updates and financials across multiple portfolio companies, identifies quick wins at each, and stacks them into a single ranked action list. Use during quarterly portfolio  | `.claude/skills/ai-readiness/SKILL.md` |
| `dd-checklist` | Generate and track comprehensive due diligence checklists tailored to the target company's sector, deal type, and complexity. Covers all major workstreams with request lists, status tracking, and red flag escalation. Use when kicking off diligence, organizing a data room review, or tracking outstand | `.claude/skills/dd-checklist/SKILL.md` |
| `dd-meeting-prep` | Prepare for due diligence meetings — management presentations, expert network calls, customer references, and advisor sessions. Generates targeted question lists, benchmarks to reference, and red flags to probe. Use before any diligence meeting or call. Triggers on "prep for management meeting", "di | `.claude/skills/dd-meeting-prep/SKILL.md` |
| `deal-screening` | Quickly screen inbound deal flow — CIMs, teasers, and broker materials — against the fund's investment criteria. Extracts key deal metrics, runs a pass/fail framework, and outputs a one-page screening memo. Use when reviewing new deal flow, triaging inbound materials, or deciding whether to take a f | `.claude/skills/deal-screening/SKILL.md` |
| `deal-sourcing` | PE deal sourcing workflow — discover target companies, check CRM for existing relationships, and draft personalized founder outreach emails. Use when sourcing new deals, prospecting companies in a sector, or reaching out to founders. Triggers on "find companies", "source deals", "draft founder email | `.claude/skills/deal-sourcing/SKILL.md` |
| `ic-memo` | Draft a structured investment committee memo for PE deal approval. Synthesizes due diligence findings, financial analysis, and deal terms into a professional IC-ready document. Use when preparing for investment committee, writing up a deal, or creating a formal recommendation. Triggers on "write IC  | `.claude/skills/ic-memo/SKILL.md` |
| `portfolio-monitoring` | Track and analyze portfolio company performance against plan. Ingests monthly/quarterly financial packages (Excel, PDF), extracts KPIs, flags variances to budget, and produces summary dashboards. Use when reviewing portfolio company financials, preparing board materials, or monitoring covenant compl | `.claude/skills/portfolio-monitoring/SKILL.md` |
| `returns-analysis` | Build quick IRR/MOIC sensitivity tables for PE deal evaluation. Models returns across entry multiple, leverage, exit multiple, growth, and hold period scenarios. Use when sizing up a deal, stress-testing assumptions, or preparing IC returns exhibits. Triggers on "returns analysis", "IRR sensitivity" | `.claude/skills/returns-analysis/SKILL.md` |
| `unit-economics` | Analyze unit economics for PE targets — ARR cohorts, LTV/CAC, net retention, payback periods, revenue quality, and margin waterfall. Essential for software/SaaS, recurring revenue, and subscription businesses. Use when evaluating revenue quality, building a cohort analysis, or assessing customer eco | `.claude/skills/unit-economics/SKILL.md` |
| `value-creation-plan` | Structure post-acquisition value creation plans with revenue, cost, and operational levers mapped to an EBITDA bridge. Includes 100-day priorities, KPI targets, and accountability frameworks. Use when planning post-close execution, preparing operating partner materials, or building a board-ready val | `.claude/skills/value-creation-plan/SKILL.md` |

## Skills de engenharia e produtividade (mattpocock/skills)

Valem para qualquer trabalho de código, planejamento ou documentação do projeto. Antes de começar, case a tarefa com a tabela; se casar, USE a skill.

Skills marcadas como **manual** têm `disable-model-invocation`: só rodam quando o usuário digitar `/<nome>`. Não as invoque por conta própria; se a tarefa casar, sugira o comando ao usuário.

Antes de usar as skills de issue tracker (`to-spec`, `to-tickets`, `triage`, `wayfinder`, `implement*`), rode uma vez `/setup-matt-pocock-skills` para configurar tracker, labels e layout de docs. Se não estiver configurado, rode o setup antes.

### engineering

| Skill | Quando usar | Arquivo |
|---|---|---|
| `tdd` | Construir feature ou corrigir bug test-first (red-green-refactor), ou quando pedirem testes de integração. | `.claude/skills/tdd/SKILL.md` |
| `diagnosing-bugs` | Algo quebrado, lançando erro, falhando ou lento; "diagnose" / "debug this". Use antes de tentar correções no escuro. | `.claude/skills/diagnosing-bugs/SKILL.md` |
| `code-review` | Revisar branch, PR ou mudanças em andamento ("review since X") contra os padrões do repo e o spec/issue de origem. | `.claude/skills/code-review/SKILL.md` |
| `pr` | Escrever o corpo de um Pull Request. | `.claude/skills/pr/SKILL.md` |
| `codebase-design` | Desenhar ou melhorar interface de módulo, decidir onde fica um seam, tornar código mais testável ou navegável por IA (vocabulário de deep modules). | `.claude/skills/codebase-design/SKILL.md` |
| `domain-modeling` | Discutir terminologia do domínio, escrever/editar `GLOSSARY.md` ou registrar/editar um ADR. | `.claude/skills/domain-modeling/SKILL.md` |
| `prototype` | Protótipo descartável para responder dúvida de design: validar modelo de estado/lógica ou explorar como a UI deve ser. | `.claude/skills/prototype/SKILL.md` |
| `research` | Pesquisar um tema/API/documentação em fontes primárias e salvar os achados em Markdown no repo. | `.claude/skills/research/SKILL.md` |
| `wizard` | Gerar wizard bash interativo para passos que só um humano pode fazer (credenciais, segredos de CI, dashboards de terceiros, migração/cutover). Não usar para passos que o agente executa sozinho. | `.claude/skills/wizard/SKILL.md` |
| `ask-matt` (manual) | Descobrir qual skill/fluxo deste conjunto serve à situação (roteador). | `.claude/skills/ask-matt/SKILL.md` |
| `setup-matt-pocock-skills` (manual) | Configuração única: issue tracker, vocabulário de labels de triagem e layout de docs. | `.claude/skills/setup-matt-pocock-skills/SKILL.md` |
| `grill-with-docs` (manual) | Entrevista implacável para afiar um plano/design, criando ADRs e glossário no processo. | `.claude/skills/grill-with-docs/SKILL.md` |
| `to-spec` (manual) | Transformar a conversa atual em spec e publicar no issue tracker (sem entrevista). | `.claude/skills/to-spec/SKILL.md` |
| `to-tickets` (manual) | Quebrar plano/spec em tickets tracer-bullet com dependências, publicados no tracker. | `.claude/skills/to-tickets/SKILL.md` |
| `implement` (manual) | Implementar trabalho a partir de spec ou conjunto de tickets. | `.claude/skills/implement/SKILL.md` |
| `implement-spec` (manual) | Implementar em código o resultado de `/to-spec` + `/to-tickets`. | `.claude/skills/implement-spec/SKILL.md` |
| `wayfinder` (manual) | Planejar trabalho grande demais para uma sessão, como mapa de tickets de decisão no tracker. | `.claude/skills/wayfinder/SKILL.md` |
| `triage` (manual) | Mover issues/PRs externos por estados de triagem, verificar e escrever briefs prontos para agente. | `.claude/skills/triage/SKILL.md` |
| `improve-codebase-architecture` (manual) | Varrer o código atrás de oportunidades de aprofundar módulos e apresentar relatório HTML. | `.claude/skills/improve-codebase-architecture/SKILL.md` |
| `retro` (manual) | Retrospectiva de uma sessão de código. | `.claude/skills/retro/SKILL.md` |

### productivity

| Skill | Quando usar | Arquivo |
|---|---|---|
| `grilling` | Stress-test de plano, decisão ou ideia; quando o usuário usar frases de "grill". | `.claude/skills/grilling/SKILL.md` |
| `writing-for-agents` | Criar/editar skills ou modificar `AGENTS.md` / `CLAUDE.md` (inclui este arquivo). | `.claude/skills/writing-for-agents/SKILL.md` |
| `grill-me` (manual) | Entrevista implacável para afiar um plano ou design. | `.claude/skills/grill-me/SKILL.md` |
| `handoff` (manual) | Compactar a conversa em documento de handoff para outro agente. | `.claude/skills/handoff/SKILL.md` |
| `teach` (manual) | Ensinar ao usuário uma nova habilidade ou conceito neste workspace. | `.claude/skills/teach/SKILL.md` |
| `to-questionnaire` (manual) | Transformar uma decisão que o usuário não consegue responder sozinho em questionário para outra pessoa. | `.claude/skills/to-questionnaire/SKILL.md` |
| `wait-what` (manual) | A última mensagem não foi compreendida: reapresentar. | `.claude/skills/wait-what/SKILL.md` |

## Agent skills

### Issue tracker

Issues e specs vivem no GitHub Issues (`ogiorno/finance-secret`), via CLI `gh`. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulário padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Ver `docs/agents/triage-labels.md`.

### Domain docs

Single-context: um `GLOSSARY.md` + `docs/adr/` na raiz. Ver `docs/agents/domain.md`.

## Design system

Toda UI usa `@finance/ui` (`packages/ui`). Cores, raios, sombras e fontes só existem em `packages/ui/src/theme.css`; componentes e telas usam tokens (`bg-primary`, `text-income`), nunca valores literais. Rode `npm run check:tokens -w @finance/ui` após mexer em UI. Detalhes em `docs/design-system.md`.

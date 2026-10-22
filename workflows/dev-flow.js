export const meta = {
  name: 'dev-flow',
  description: 'Fluxo de desenvolvimento: implementação do plano → code review com 5 revisores (code-review-flow) → correções no PR → auditoria de docs',
  whenToUse: 'Quando existir um plano de implementação em markdown pronto para executar de ponta a ponta. Uso: Workflow({name: "dev-flow", args: "/path/do/plano.md"})',
  phases: [
    { title: 'Development', detail: 'implementa o plano, commita e abre PR para a branch dev', model: 'sonnet' },
    { title: 'Code Review', detail: 'roda o code-review-flow sobre o PR, com o plano e a issue: 5 revisores, consolidação, Final Review (vereditos) e avaliação dos revisores' },
    { title: 'PR Fixes', detail: 'aplica as correções procedentes do relatório final do code review e atualiza o PR', model: 'opus' },
    { title: 'Docs Audit', detail: 'auditoria de documentação da branch com a skill docs-generator (sincronia /docs + ADRs/guides)', model: 'opus' },
  ],
}

// O input é o path do plano de implementação (string ou {plan: "..."}).
const planPath = typeof args === 'string' ? args.trim() : args?.plan
if (!planPath) {
  throw new Error('Informe o path do plano de implementação em args, ex.: args: "/path/do/plano.md"')
}

// ── Etapa 1: Development ────────────────────────────────────────────────────
phase('Development')
log(`Implementando o plano: ${planPath}`)

const dev = await agent(
  `Execute a implementação usando as skills e plano detalhados no arquivo: ${planPath}. ` +
    'Use a abordagem Subagent-Driven com a skill subagent-driven-development seguindo as skills `karpathy-guidelines` e `tdd`. ' +
    'Siga as convenções de commit do repositório (referencie issue apenas se o plano indicar uma) e ao final crie um PR para a branch "dev". ' +
    'Como resultado, retorne o link do Pull Request criado, a branch de origem dele e o ID da issue que o plano indica.',
  {
    label: 'development',
    phase: 'Development',
    model: 'sonnet',
    schema: {
      type: 'object',
      properties: {
        pr_url: { type: 'string', description: 'URL do Pull Request criado' },
        branch: { type: 'string', description: 'Branch de origem do PR' },
        summary: { type: 'string', description: 'Resumo curto do que foi implementado' },
        issue: { type: 'string', description: 'ID da issue que o plano indica (ex.: DEV-322), ou "" quando o plano não indica' },
      },
      required: ['pr_url', 'branch', 'issue'],
    },
  },
)
if (!dev?.pr_url) throw new Error('A etapa Development não retornou o link do PR.')
log(`PR criado: ${dev.pr_url}`)

// Cadeia de autorização explícita: cada subagente é avaliado pelo prompt que recebe, isolado —
// sem esta ligação PR ↔ pedido original do usuário, o push autônomo das etapas seguintes é
// classificado como escrita externa não autorizada e o subagente é bloqueado.
const contextoAutorizado = (etapa) =>
  `Você executa a etapa "${etapa}" do workflow dev-flow, que o usuário pediu para rodar de ` +
  `ponta a ponta sobre o plano de implementação em ${planPath}. O PR ${dev.pr_url} ` +
  `(branch de origem: ${dev.branch}) foi criado pela etapa Development deste mesmo workflow, a ` +
  `partir desse plano — commits e push NESSA branch fazem parte do escopo já autorizado. ` +
  `Fora de escopo (não faça): merge do PR, push para qualquer outra branch, criar novos PRs, ` +
  `alterar outros repositórios, commitar os relatórios pr-review-* que o code review deixa na raiz do projeto. `

// ── Etapa 2: Code Review ────────────────────────────────────────────────────
// O code review é o code-review-flow inteiro, rodado como sub-workflow: os mesmos
// revisores, a mesma Final Review e a mesma avaliação dos revisores nos dois fluxos.
// Ele não altera o PR; quem aplica as correções é a etapa PR Fixes. Sem issue
// informada, o Setup dele procura a issue no PR.
phase('Code Review')

const review = await workflow('code-review-flow', {
  pr: dev.pr_url,
  issue: dev.issue ?? '',
  plan: planPath,
  called_by: 'dev-flow',
})
const finalReport = review.final_review?.markdown_path

// ── Etapa 3: PR Fixes ───────────────────────────────────────────────────────
phase('PR Fixes')

// A Final Review do code-review-flow já julgou cada achado contra o código, e o
// relatório final lista só os procedentes. Se ela não concluiu, esta etapa julga o
// relatório consolidado, como fazia antes do sub-workflow.
const fixesTask = finalReport
  ? `O code review do PR ${dev.pr_url} já julgou os achados dos revisores contra o código: o relatório final em ${finalReport} ` +
    'lista só os procedentes, a corrigir. Aplique cada correção dele. Se, ao aplicar, uma correção se mostrar errada ou quebrar ' +
    'funcionalidade existente, não a aplique e registre-a entre as rejeitadas, com o motivo. ' +
    'Não aplique os itens das seções "Não verificáveis" e "Decisões a rever": registre-os entre os rejeitados, com a seção de origem. '
  : `A Final Review do code review não concluiu. Julgue você os achados do relatório consolidado em ${review.consolidated_report}, ` +
    'verificando cada um contra o código real do PR antes de aceitar: premissa que não procede no código, correção que quebraria ' +
    'funcionalidade existente, overengineering (grep no codebase: se nada usa, é YAGNI) e item fora do escopo do plano são improcedentes; ' +
    'o que não der para verificar não é aplicado. Aplique as procedentes. '

const fixes = await agent(
  contextoAutorizado('PR Fixes') +
    fixesTask +
    'Pode usar subagents, um foco por subagent. Rode os validadores do repositório, commite e faça push ' +
    `para a branch ${dev.branch}, e comente no PR listando somente os fixes aplicados e suas ` +
    'justificativas (não precisa mencionar os rejeitados).',
  {
    label: 'pr-fixes',
    phase: 'PR Fixes',
    model: 'opus',
    schema: {
      type: 'object',
      properties: {
        applied: { type: 'array', items: { type: 'string' }, description: 'Fixes aplicados' },
        rejected: { type: 'array', items: { type: 'string' }, description: 'Itens não aplicados e o motivo' },
        summary: { type: 'string', description: 'Resumo do fechamento do ciclo' },
      },
      required: ['summary'],
    },
  },
)
if (!fixes) log(`⚠️ Etapa PR Fixes não concluiu (bloqueio ou erro) — aplicar manualmente as correções de ${finalReport ?? review.consolidated_report}.`)

// ── Etapa 4: Docs Audit ─────────────────────────────────────────────────────
phase('Docs Audit')

const docsAudit = await agent(
  contextoAutorizado('Docs Audit') +
    'Invoque a skill docs-generator (via Skill tool) e realize a auditoria de documentação desta branch. ' +
    `Contexto: as etapas anteriores de code review e correção já rodaram. Resumo dos fixes aplicados no PR: ${fixes?.summary ?? 'n/d'}. ` +
    `Fixes aplicados: ${fixes?.applied?.length ? fixes.applied.join('; ') : 'nenhum registrado'}. ` +
    'Realize uma auditoria minuciosa nas alterações desta branch seguindo estas diretrizes:\n' +
    '- Verificação de Sincronia: Analise todos os arquivos alterados no PR e verifique se a pasta /docs foi atualizada ' +
    "corretamente em conformidade com as diretrizes e padrões da skill 'docs-generator'.\n" +
    '- Extração de Conhecimento: Identifique decisões arquiteturais, mudanças de lógica complexa ou trade-offs importantes ' +
    'que não estejam documentados. Transfira esses achados para um formato de documentação oficial, preferencialmente ' +
    'seguindo o modelo de ADR (Architecture Decision Records) ou atualizando os guias técnicos existentes.\n' +
    '- Lista de verificação: Confirmação de que o docs-generator foi aplicado corretamente em todos os módulos impactados. ' +
    'Seja criterioso, focando na manutenibilidade e na clareza para futuros desenvolvedores.\n' +
    '- Considere que arquivos git-ignored em `docs` não entrarão na versão final do projeto (são temporários), então ' +
    'achados importantes têm que virar documentação (ex: ADRs, README, Guides, References, etc.).\n' +
    '- Ao promover uma solution para ADR (quando a investigação revelar uma decisão arquitetural), o ADR deve ser **self-contained**.\n' +
    '- Também não faça referências a Issues do Linear ou Plane no Código (ex: "feito de acordo com DEV-88", "EVABOT-XX"), ' +
    'pois não serão acessíveis após a entrega do software. Somente docs versionadas (ADRs, guides, etc.) devem ser referenciadas.\n' +
    '\n' +
    `Ao final, commite e faça push das atualizações de documentação para a branch ${dev.branch}. ` +
    'Se um achado exigir mudança fora dessa branch, registre-o no resumo em vez de aplicar.',
  {
    label: 'docs-audit',
    phase: 'Docs Audit',
    model: 'opus',
    schema: {
      type: 'object',
      properties: {
        docs_updated: { type: 'array', items: { type: 'string' }, description: 'Arquivos de documentação criados ou atualizados' },
        adrs_created: { type: 'array', items: { type: 'string' }, description: 'ADRs promovidos a partir de achados da auditoria' },
        summary: { type: 'string', description: 'Resumo da auditoria de documentação' },
      },
      required: ['summary'],
    },
  },
)
if (!docsAudit) log('⚠️ Etapa Docs Audit não concluiu (bloqueio ou erro) — rodar docs-generator manualmente sobre a branch.')

return {
  pr_url: dev.pr_url,
  code_review: review,
  fixes,
  docs_audit: docsAudit,
}

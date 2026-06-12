export const meta = {
  name: 'dev-flow',
  description: 'Fluxo de desenvolvimento: implementação do plano → code review duplo → correções no PR',
  whenToUse: 'Quando existir um plano de implementação em markdown pronto para executar de ponta a ponta. Uso: Workflow({name: "dev-flow", args: "/path/do/plano.md"})',
  phases: [
    { title: 'Development', detail: 'implementa o plano, commita e abre PR para a branch dev', model: 'sonnet' },
    { title: 'Code Review', detail: '2 revisores em paralelo (thermos + ce-code-review, ambos Opus) e consolidação dos relatórios' },
    { title: 'PR Fixes', detail: 'julga cada achado, aplica as correções procedentes e atualiza o PR', model: 'sonnet' },
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
    'Use a abordagem Subagent-Driven com a skill subagent-driven-development seguindo as skills `karpathy-guidelines` e `tdd`' +
    'Faça todos os commits referenciando a Issue e ao final crie um PR para a branch "dev". ' +
    'Como resultado, retorne o link do Pull Request criado.',
  {
    label: 'development',
    phase: 'Development',
    model: 'sonnet',
    schema: {
      type: 'object',
      properties: {
        pr_url: { type: 'string', description: 'URL do Pull Request criado' },
        summary: { type: 'string', description: 'Resumo curto do que foi implementado' },
      },
      required: ['pr_url'],
    },
  },
)
if (!dev?.pr_url) throw new Error('A etapa Development não retornou o link do PR.')
log(`PR criado: ${dev.pr_url}`)

// ── Etapa 2: Code Review ────────────────────────────────────────────────────
phase('Code Review')

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    report_path: { type: 'string', description: 'Path absoluto do relatório gerado em /tmp' },
  },
  required: ['report_path'],
}

const REVIEWERS = [
  { key: 'thermos', skill: 'thermos:thermos' },
  { key: 'ce-code-review', skill: 'compound-engineering:ce-code-review' },
]

// Barreira proposital: a consolidação precisa dos DOIS relatórios juntos.
const reviews = (
  await parallel(
    REVIEWERS.map((r) => () =>
      agent(
        `Invoque a skill "${r.skill}" (via Skill tool) com a seguinte tarefa: ` +
          `revise o PR ${dev.pr_url} e gere um relatório em /tmp detalhando os achados e possíveis correções. ` +
          'Como resultado, retorne o path do relatório gerado.',
        { label: `review:${r.key}`, phase: 'Code Review', model: 'opus', schema: REPORT_SCHEMA },
      ),
    ),
  )
).filter(Boolean)

if (reviews.length === 0) throw new Error('Nenhum revisor retornou relatório.')
if (reviews.length < REVIEWERS.length) log(`Atenção: apenas ${reviews.length}/${REVIEWERS.length} revisores concluíram.`)

const reportPaths = reviews.map((r) => r.report_path)
log(`Relatórios de revisão: ${reportPaths.join(' | ')}`)

const consolidated = await agent(
  `Consolide em um único relatório os relatórios de code review do PR ${dev.pr_url}: ${reportPaths.join(' e ')}. ` +
    'Preserve todos os achados, agrupe os duplicados (citando que ambos os revisores apontaram) e mantenha as correções sugeridas. ' +
    'Salve o relatório consolidado em /tmp e, como resultado, retorne o path dele.',
  { label: 'consolidate', phase: 'Code Review', model: 'sonnet', schema: REPORT_SCHEMA },
)
if (!consolidated?.report_path) throw new Error('A consolidação não retornou o path do relatório.')
log(`Relatório consolidado: ${consolidated.report_path}`)

// ── Etapa 3: PR Fixes ───────────────────────────────────────────────────────
phase('PR Fixes')

const fixes = await agent(
  `Utilizei 2 agentes externos para fazer a revisão da implementação e PR ${dev.pr_url}. ` +
    `O resultado da revisão está em ${consolidated.report_path}. ` +
    'Use a skill superpowers:brainstorming e analise cada item da revisão, veja o que faz sentido corrigir ' +
    'e o que não faz sentido (e.g. overengineering, premissa incorreta, falsos positivos, etc.). ' +
    'Após julgar o que deve ser corrigido, planeje e aplique as alterações (usando subagents), faça os commits ' +
    'e atualize o PR (adicionando comentários com os fixes aplicados e suas justificativas).',
  {
    label: 'pr-fixes',
    phase: 'PR Fixes',
    model: 'sonnet',
    schema: {
      type: 'object',
      properties: {
        applied: { type: 'array', items: { type: 'string' }, description: 'Fixes aplicados' },
        rejected: { type: 'array', items: { type: 'string' }, description: 'Achados descartados e o motivo' },
        summary: { type: 'string', description: 'Resumo do fechamento do ciclo' },
      },
      required: ['summary'],
    },
  },
)

return {
  pr_url: dev.pr_url,
  review_reports: reportPaths,
  consolidated_report: consolidated.report_path,
  fixes,
}

export const meta = {
  name: 'dev-flow',
  description: 'Fluxo de desenvolvimento: implementação do plano → code review quádruplo → correções no PR',
  whenToUse: 'Quando existir um plano de implementação em markdown pronto para executar de ponta a ponta. Uso: Workflow({name: "dev-flow", args: "/path/do/plano.md"})',
  phases: [
    { title: 'Development', detail: 'implementa o plano, commita e abre PR para a branch dev', model: 'sonnet' },
    { title: 'Code Review', detail: '4 revisores em paralelo (thermos + ce-code-review + matt-code-review + /code-review embutida do Claude Code, todos Opus), consolidação dos relatórios e relatório de avaliação dos revisores' },
    { title: 'PR Fixes', detail: 'verifica cada achado contra o código do PR, aplica as correções procedentes e atualiza o PR', model: 'opus' },
    { title: 'Review Eval', detail: 'cruza os vereditos com os achados de cada revisor e fecha o relatório de avaliação (eficácia das skills de review)', model: 'sonnet' },
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
    'Como resultado, retorne o link do Pull Request criado e a branch de origem dele.',
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
      },
      required: ['pr_url', 'branch'],
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
  `alterar outros repositórios. `

// ── Etapa 2: Code Review ────────────────────────────────────────────────────
phase('Code Review')

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    report_path: { type: 'string', description: 'Path absoluto do relatório gerado' },
  },
  required: ['report_path'],
}

// Sufixo dos relatórios: número do PR — Azure DevOps (.../pullrequest/1234),
// GitHub (.../pull/1234) ou o número solto. Fallback: última sequência de dígitos.
const prId =
  String(dev.pr_url).match(/\/(?:pullrequest|pull)\/(\d+)/i)?.[1] ?? String(dev.pr_url).match(/\d+/g)?.pop() ?? 'pr'

// A skill /code-review embutida no Claude Code tem o mesmo nome da skill do plugin
// mattpocock, por isso a do plugin é referenciada com o namespace. A embutida não
// aceita uma "tarefa": recebe só nível de esforço + alvo e devolve os achados; o
// agente que a invoca grava o relatório. Sem --fix, quem aplica é a etapa PR Fixes.
// Nível "high" amplia a cobertura; os falsos positivos caem nos vereditos.
const REVIEWERS = [
  { key: 'thermos', skill: 'thermos:thermos' },
  { key: 'ce-code-review', skill: 'ce-code-review' },
  { key: 'matt-code-review', skill: 'mattpocock-skills:code-review' },
  { key: 'code-review', skill: 'code-review', args: `high origin/dev...origin/${dev.branch}` },
]
const REVIEWER_KEYS = REVIEWERS.map((r) => r.key)

// Relatórios de avaliação dos revisores ficam fora do projeto e fora de /tmp: são
// dados sobre as skills de review (Dev-OS), acumulados entre projetos para medir
// no longo prazo quais revisores realmente acertam.
const EVAL_DIR = '~/.claude/review-evals'

const reviewPrompt = (r) => {
  const reportPath = `/tmp/relatorio-${r.key}-${prId}.md`
  const invoke = r.args
    ? `Invoque a skill "${r.skill}" (via Skill tool) com os argumentos exatamente "${r.args}" para revisar ` +
      `o PR ${dev.pr_url} (branch ${dev.branch} → dev). Ela apenas devolve a lista de achados, sem gravar arquivo: ` +
      `escreva-os em "${reportPath}" detalhando, para cada um, arquivo, trecho, problema e correção sugerida. ` +
      'Não altere o código nem comente no PR — apenas gere o relatório. '
    : `Invoque a skill "${r.skill}" (via Skill tool) com a seguinte tarefa: ` +
      `revise o PR ${dev.pr_url} e gere um relatório detalhando os achados e possíveis correções ` +
      `em "${reportPath}". `
  return (
    invoke +
    `Além da revisão de qualidade, verifique se o código implementa fielmente o plano de ` +
    `implementação ou spec em ${planPath}: registre no relatório, como achados, itens do plano não ` +
    'implementados, implementados parcialmente ou que divergiram do especificado. ' +
    'Como resultado, retorne o path do relatório gerado.'
  )
}

// Barreira proposital: a consolidação precisa de TODOS os relatórios juntos.
const reviews = (
  await parallel(
    REVIEWERS.map((r) => () =>
      agent(
        reviewPrompt(r),
        { label: `review:${r.key}`, phase: 'Code Review', model: 'opus', schema: REPORT_SCHEMA },
      ),
    ),
  )
).filter(Boolean)

if (reviews.length === 0) throw new Error('Nenhum revisor retornou relatório.')
if (reviews.length < REVIEWERS.length) log(`Atenção: apenas ${reviews.length}/${REVIEWERS.length} revisores concluíram.`)

const reportPaths = reviews.map((r) => r.report_path)
log(`Relatórios de revisão: ${reportPaths.join(' | ')}`)

const CONSOLIDATED_SCHEMA = {
  type: 'object',
  properties: {
    report_path: { type: 'string', description: 'Path absoluto do relatório consolidado' },
    evaluation_path: { type: 'string', description: 'Path absoluto do relatório de avaliação dos revisores' },
    findings: {
      type: 'array',
      description: 'Um item por achado do relatório consolidado, com os mesmos IDs usados no relatório',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID do achado no relatório consolidado, ex.: F01' },
          title: { type: 'string', description: 'Título curto do achado' },
          reviewers: {
            type: 'array',
            description: 'Revisores que apontaram este achado',
            items: { type: 'string', enum: REVIEWER_KEYS },
          },
        },
        required: ['id', 'title', 'reviewers'],
      },
    },
  },
  required: ['report_path', 'evaluation_path', 'findings'],
}

const consolidated = await agent(
  `Consolide em um único relatório os relatórios de code review do PR ${dev.pr_url}: ${reportPaths.join(' e ')}. ` +
    'Preserve todos os achados, agrupe os duplicados (citando quais revisores apontaram) e mantenha as correções sugeridas. ' +
    'Atribua a cada achado consolidado um ID sequencial (F01, F02, ...) e registre em cada um quais revisores o apontaram ' +
    `(use as chaves ${REVIEWER_KEYS.join(', ')} — os relatórios de origem estão nomeados por elas). ` +
    `Salve o relatório consolidado em "/tmp/relatorio-consolidado-${prId}.md". ` +
    'Em seguida crie um breve relatório de avaliação dos revisores em markdown, usado para medir no longo prazo a eficácia de cada skill de review, ' +
    `salvo em "${EVAL_DIR}/<repo>-pr-${prId}.md" (<repo> = basename de \`git rev-parse --show-toplevel\`; crie o diretório se não existir), contendo: ` +
    '(1) cabeçalho com PR, data (`date +%Y-%m-%d`), workflow (dev-flow), plano de implementação, revisores e paths dos relatórios de origem; ' +
    '(2) tabela com todos os achados: ID, título curto, severidade, arquivo, revisores e tipo (comum = apontado por 2+ revisores; único = por 1); ' +
    '(3) seção "Achados em comum" com os achados apontados por mais de um revisor; ' +
    '(4) seção "Achados únicos" agrupada por revisor. ' +
    'Não julgue a procedência dos achados: as seções "Julgamento" e "Eficácia por revisor" serão acrescentadas ao final desse arquivo pelo workflow após a etapa PR Fixes. ' +
    'Como resultado, retorne os paths dos dois arquivos e a lista de achados (id, título e revisores) com os mesmos IDs do relatório consolidado.',
  { label: 'consolidate', phase: 'Code Review', model: 'sonnet', schema: CONSOLIDATED_SCHEMA },
)
if (!consolidated?.report_path) throw new Error('A consolidação não retornou o path do relatório.')
log(`Relatório consolidado: ${consolidated.report_path} | avaliação dos revisores: ${consolidated.evaluation_path} (${consolidated.findings.length} achados)`)

// ── Etapa 3: PR Fixes ───────────────────────────────────────────────────────
phase('PR Fixes')

const VERDICTS_SCHEMA = {
  type: 'array',
  description: 'Veredito de cada achado do relatório consolidado, identificado pelo ID (F01, F02, ...)',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID do achado no relatório consolidado' },
      verdict: { type: 'string', enum: ['procedente', 'improcedente', 'nao_verificavel'] },
      reason: {
        type: 'string',
        description: 'Motivo curto; para improcedentes, comece pela categoria: falso positivo, premissa incorreta, overengineering ou fora do escopo',
      },
    },
    required: ['id', 'verdict'],
  },
}

const fixes = await agent(
  contextoAutorizado('PR Fixes') +
    `${REVIEWERS.length} revisores independentes revisaram o PR ${dev.pr_url} e produziram o relatório de code review consolidado em ${consolidated.report_path}. ` +
    'Julgue cada achado como procedente ou improcedente, verificando-o contra o código real antes de aceitar. Para cada achado: ' +
    '(1) abra o diff/arquivos do PR referenciados e verifique se a premissa procede no código real; ' +
    '(2) verifique se a correção sugerida quebraria funcionalidade existente ou ignora uma razão legítima da implementação atual; ' +
    '(3) para sugestões de "implementar direito"/generalizar, grep no codebase — se nada usa, marque como overengineering (YAGNI); ' +
    '(4) se não for possível verificar um achado com o código disponível, não aplique a correção — ' +
    'registre-o entre os rejeitados com o motivo "não verificável". ' +
    'São improcedentes: falsos positivos, premissas incorretas, overengineering e itens fora do escopo do plano. ' +
    'Aplique as correções procedentes (pode usar ' +
    'subagents, um foco por subagent), rode os validadores do repositório, commite e faça push ' +
    `para a branch ${dev.branch}, e comente no PR listando somente os fixes aplicados e suas ` +
    'justificativas (não precisa mencionar os rejeitados). ' +
    'Cada achado do relatório consolidado tem um ID (F01, F02, ...): retorne em "verdicts" o veredito de TODOS eles ' +
    '(procedente, improcedente ou nao_verificavel) com um motivo curto — esses vereditos alimentam a avaliação de eficácia dos revisores.',
  {
    label: 'pr-fixes',
    phase: 'PR Fixes',
    model: 'opus',
    schema: {
      type: 'object',
      properties: {
        applied: { type: 'array', items: { type: 'string' }, description: 'Fixes aplicados' },
        rejected: { type: 'array', items: { type: 'string' }, description: 'Achados descartados e o motivo' },
        summary: { type: 'string', description: 'Resumo do fechamento do ciclo' },
        verdicts: VERDICTS_SCHEMA,
      },
      required: ['summary', 'verdicts'],
    },
  },
)
if (!fixes) log('⚠️ Etapa PR Fixes não concluiu (bloqueio ou erro) — os achados do relatório consolidado precisam de julgamento manual.')

// ── Etapa 4: Review Eval ────────────────────────────────────────────────────
// Cruza os achados (e quem os apontou) com os vereditos da etapa PR Fixes. As
// contas são feitas aqui, em JS, para o relatório de avaliação ser determinístico;
// o agente só acrescenta o texto pronto ao arquivo.
phase('Review Eval')

const VERDICT_LABEL = { procedente: 'Procedente', improcedente: 'Improcedente', nao_verificavel: 'Não verificável' }
const normId = (id) => String(id).trim().toUpperCase().replace(/^F0+(\d)/, 'F$1')
const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')

function buildEvalSections(findings, verdicts, stageTitle) {
  const byId = new Map(verdicts.map((v) => [normId(v.id), v]))
  const stats = Object.fromEntries(
    REVIEWERS.map((r) => [r.key, { total: 0, common: 0, unique: 0, uniqueAccepted: 0, procedente: 0, improcedente: 0, nao_verificavel: 0 }]),
  )
  const rows = findings.map((f) => {
    const v = byId.get(normId(f.id))
    const unique = f.reviewers.length === 1
    for (const key of f.reviewers) {
      const s = stats[key]
      if (!s) continue
      s.total++
      if (unique) s.unique++
      else s.common++
      if (v && v.verdict in VERDICT_LABEL) s[v.verdict]++
      if (unique && v?.verdict === 'procedente') s.uniqueAccepted++
    }
    const verdict = v ? VERDICT_LABEL[v.verdict] ?? v.verdict : 'sem veredito'
    return `| ${cell(f.id)} | ${cell(f.title)} | ${f.reviewers.join(', ')} | ${unique ? 'único' : 'comum'} | ${verdict} | ${cell(v?.reason)} |`
  })
  const missing = findings.filter((f) => !byId.has(normId(f.id))).map((f) => f.id)
  const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : 'n/d')
  const statRows = REVIEWERS.map((r) => {
    const s = stats[r.key]
    return `| ${r.key} | ${s.total} | ${s.common} | ${s.unique} | ${s.procedente} | ${s.improcedente} | ${s.nao_verificavel} | ${pct(s.procedente, s.procedente + s.improcedente)} | ${s.uniqueAccepted} |`
  })
  const markdown = [
    '',
    `## Julgamento (etapa ${stageTitle})`,
    '',
    '| ID | Achado | Revisores | Tipo | Veredito | Motivo |',
    '|---|---|---|---|---|---|',
    ...rows,
    ...(missing.length ? ['', `Sem veredito registrado: ${missing.join(', ')}.`] : []),
    '',
    '## Eficácia por revisor',
    '',
    'Precisão = procedentes / (procedentes + improcedentes); não verificáveis ficam fora da conta. ' +
      '"Únicos procedentes" = achados que só esse revisor apontou e foram aceitos (o que se perderia sem ele).',
    '',
    '| Revisor | Achados | Em comum | Únicos | Procedentes | Improcedentes | Não verificáveis | Precisão | Únicos procedentes |',
    '|---|---|---|---|---|---|---|---|---|',
    ...statRows,
    '',
  ].join('\n')
  return { markdown, stats, missing }
}

const evaluation = buildEvalSections(consolidated.findings, fixes?.verdicts ?? [], 'PR Fixes')
if (evaluation.missing.length) log(`⚠️ Achados sem veredito: ${evaluation.missing.join(', ')}`)

const evalReport = await agent(
  `Acrescente ao FINAL do arquivo ${consolidated.evaluation_path} o conteúdo markdown abaixo, exatamente como está ` +
    '(sem reformatar, resumir ou alterar o restante do arquivo). Como resultado, retorne o path do arquivo.\n\n' +
    evaluation.markdown,
  { label: 'review-eval', phase: 'Review Eval', model: 'sonnet', effort: 'low', schema: REPORT_SCHEMA },
)
if (!evalReport?.report_path) {
  log(`⚠️ Não foi possível fechar o relatório de avaliação em ${consolidated.evaluation_path} — seções de julgamento pendentes.`)
} else {
  log(`Avaliação dos revisores: ${evalReport.report_path}`)
  log(
    'Eficácia: ' +
      REVIEWERS.map((r) => {
        const s = evaluation.stats[r.key]
        return `${r.key} ${s.procedente}/${s.total} procedentes (${s.unique} únicos, ${s.uniqueAccepted} únicos procedentes)`
      }).join(' | '),
  )
}

// ── Etapa 5: Docs Audit ─────────────────────────────────────────────────────
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
  review_reports: reportPaths,
  consolidated_report: consolidated.report_path,
  fixes,
  reviewers_evaluation: evalReport?.report_path ?? consolidated.evaluation_path,
  reviewers_stats: evaluation.stats,
  docs_audit: docsAudit,
}

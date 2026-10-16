export const meta = {
  name: 'code-review-flow',
  description: 'Code review com 5 revisores (thermos + ce-code-review + matt-code-review + /code-review + pr-security-review, todos Opus) de um PR e consolidação dos relatórios',
  whenToUse:
    'Quando quiser revisar um PR existente sem implementar nada. Uso: Workflow({name: "code-review-flow", args: "<PR url ou número>"})',
  phases: [
    { title: 'Setup', detail: 'resolve o PR uma única vez: branches, commits base/head fixados e diff salvo, compartilhados com todos os revisores', model: 'sonnet' },
    { title: 'Code Review', detail: '5 revisores em paralelo (thermos + ce-code-review + matt-code-review + /code-review embutida + pr-security-review do Dev-OS, todos Opus), consolidação dos relatórios e relatório de avaliação dos revisores' },
    { title: 'Final Review', detail: 'verifica cada achado contra o código do PR e gera o relatório final em markdown + HTML (html-it) na raiz do projeto', model: 'opus' },
    { title: 'Review Eval', detail: 'cruza os vereditos com os achados de cada revisor e fecha o relatório de avaliação (eficácia das skills de review)', model: 'sonnet' },
  ],
}

// O input é o PR a ser revisado (string com a URL/número ou {pr: "..."}).
const prRef = typeof args === 'string' ? args.trim() : args?.pr
if (!prRef) {
  throw new Error('Informe o PR a revisar em args, ex.: args: "https://github.com/org/repo/pull/123" ou args: "123"')
}

// Sufixo dos relatórios: número do PR — Azure DevOps (.../pullrequest/1234),
// GitHub (.../pull/1234) ou o número solto. Fallback: última sequência de dígitos.
const prId = String(prRef).match(/\/(?:pullrequest|pull)\/(\d+)/i)?.[1] ?? String(prRef).match(/\d+/g)?.pop() ?? 'pr'

// ── Setup ────────────────────────────────────────────────────────────────────
// Fixa o snapshot do PR uma única vez. Sem isso, cada revisor resolvia o PR por
// conta própria (refs diferentes, 5x o mesmo fetch) e o autor podia publicar
// commits no meio da revisão: os achados ficavam presos a um head antigo.
phase('Setup')
log(`Revisando o PR: ${prRef}`)

const SETUP_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Título do PR' },
    base_branch: { type: 'string', description: 'Branch alvo, sem refs/heads/' },
    head_branch: { type: 'string', description: 'Branch de origem, sem refs/heads/' },
    base_sha: { type: 'string', description: 'SHA completo de origin/<base_branch>' },
    head_sha: { type: 'string', description: 'SHA completo do head do PR' },
    merge_base: { type: 'string', description: 'SHA completo de git merge-base base_sha head_sha' },
    diff_path: { type: 'string', description: 'Path absoluto do diff salvo' },
  },
  required: ['title', 'base_branch', 'head_branch', 'base_sha', 'head_sha', 'merge_base', 'diff_path'],
}

const diffPath = `/tmp/pr-${prId}/diff.patch`
const pr = await agent(
  `Fixe o escopo da revisão do PR ${prRef}, a partir do repositório atual. ` +
    '(1) Leia os metadados do PR: no GitHub `gh pr view <PR> --json title,baseRefName,headRefName,headRefOid`; ' +
    'no Azure DevOps `az repos pr show --id <número> --org <org da URL> --query ' +
    '"{title:title,base:targetRefName,head:sourceRefName,headSha:lastMergeSourceCommit.commitId}"` (tire o prefixo refs/heads/ das branches). ' +
    '(2) Rode `git fetch --no-tags origin <base> <head>`: atualiza origin/<base> e origin/<head> sem trocar de branch nem tocar no working tree. ' +
    '(3) head_sha = o commit de head informado pelo PR (confirme com `git cat-file -t <sha>`); base_sha = `git rev-parse origin/<base>`; ' +
    'merge_base = `git merge-base <base_sha> <head_sha>`. ' +
    `(4) Salve \`git diff <merge_base> <head_sha>\` em "${diffPath}" (crie o diretório). ` +
    'Use SHAs completos (40 caracteres). Não troque de branch, não altere o working tree e não comente no PR. Retorne os campos pedidos.',
  { label: 'pr-setup', phase: 'Setup', model: 'sonnet', effort: 'low', schema: SETUP_SCHEMA },
)

const SHA_RE = /^[0-9a-f]{40}$/
if (!pr || ![pr.base_sha, pr.head_sha, pr.merge_base].every((sha) => SHA_RE.test(String(sha)))) {
  throw new Error(`Setup não fixou os commits do PR ${prRef}: ${JSON.stringify(pr)}`)
}
const short = (sha) => sha.slice(0, 7)
const reviewRange = `${pr.base_sha}...${pr.head_sha}`
log(`Escopo fixado: ${pr.head_branch} → ${pr.base_branch} | head ${short(pr.head_sha)} | merge-base ${short(pr.merge_base)} | diff ${pr.diff_path}`)

// Contexto comum a todos os revisores: o mesmo commit, o mesmo diff.
const scopeContext =
  `Escopo fixo desta revisão: PR ${prRef} ("${pr.title}"), ${pr.head_branch} → ${pr.base_branch}. ` +
  `Revise exatamente o commit ${pr.head_sha} contra o merge-base ${pr.merge_base}. ` +
  `O diff completo está em "${pr.diff_path}" e os commits já estão no repositório local, então não é preciso consultar o PR nem rodar fetch. ` +
  `Leia os arquivos do PR com \`git show ${pr.head_sha}:<path>\`: o working tree não está no PR. ` +
  'Commits publicados depois desse head são tratados na etapa Final Review. '

// ── Code Review ──────────────────────────────────────────────────────────────
phase('Code Review')

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    report_path: { type: 'string', description: 'Path absoluto do relatório gerado' },
  },
  required: ['report_path'],
}

// /code-review (embutida no Claude Code) e pr-security-review (skill do Dev-OS,
// instalada globalmente) não aceitam uma "tarefa": recebem só argumentos (nível de
// esforço, alvo) e devolvem os achados; o agente que as invoca recebe o range
// fixado no Setup e grava o relatório. Sem --fix. Nível "high" amplia a cobertura;
// os falsos positivos caem nos vereditos.
// A /security-review embutida NÃO serve aqui: ela injeta `git diff origin/HEAD...`
// fixo e ignora argumentos, ou seja, revisa a branch atual contra a branch default
// do origin — fora do PR quando a base é outra ou a branch não está no checkout.
// A pr-security-review usa a mesma rubrica com o range explícito.
// A /code-review embutida tem o mesmo nome da skill do plugin mattpocock, por isso
// a do plugin é referenciada com o namespace.
const REVIEWERS = [
  { key: 'thermos', skill: 'thermos:thermos' },
  { key: 'ce-code-review', skill: 'ce-code-review' },
  { key: 'matt-code-review', skill: 'mattpocock-skills:code-review' },
  { key: 'code-review', skill: 'code-review', args: `high ${reviewRange}` },
  { key: 'security-review', skill: 'pr-security-review', args: reviewRange },
]
const REVIEWER_KEYS = REVIEWERS.map((r) => r.key)

// Relatórios de avaliação dos revisores ficam fora do projeto e fora de /tmp: são
// dados sobre as skills de review (Dev-OS), acumulados entre projetos para medir
// no longo prazo quais revisores realmente acertam.
const EVAL_DIR = '~/.claude/review-evals'

const reviewPrompt = (r) => {
  const reportPath = `/tmp/relatorio-${r.key}-${prId}.md`
  const invoke = r.args
    ? `Invoque a skill "${r.skill}" (via Skill tool) com os argumentos "${r.args}". ` +
      `Ela apenas devolve a lista de achados, sem gravar arquivo: escreva-os em "${reportPath}" detalhando, ` +
      'para cada um, arquivo, trecho, problema e correção sugerida. ' +
      'Não altere o código nem comente no PR — apenas gere o relatório. '
    : `Invoque a skill "${r.skill}" (via Skill tool) com a seguinte tarefa: ` +
      `revise o PR ${prRef} no commit ${pr.head_sha} (merge-base ${pr.merge_base}, diff em "${pr.diff_path}") ` +
      `e gere um relatório detalhando os achados e possíveis correções em "${reportPath}". `
  return (
    scopeContext +
    invoke +
    'Não troque de branch nem altere o working tree: outros revisores rodam em paralelo no mesmo checkout. ' +
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
  `Consolide em um único relatório os relatórios de code review do PR ${prRef}: ${reportPaths.join(' e ')}. ` +
    'Preserve todos os achados, agrupe os duplicados (citando quais revisores apontaram) e mantenha as correções sugeridas. ' +
    'Atribua a cada achado consolidado um ID sequencial (F01, F02, ...) e registre em cada um quais revisores o apontaram ' +
    `(use as chaves ${REVIEWER_KEYS.join(', ')} — os relatórios de origem estão nomeados por elas). ` +
    `Salve o relatório consolidado em "/tmp/relatorio-consolidado-${prId}.md", com o commit revisado (head ${short(pr.head_sha)}, merge-base ${short(pr.merge_base)}) no cabeçalho. ` +
    'Em seguida crie um breve relatório de avaliação dos revisores em markdown, usado para medir no longo prazo a eficácia de cada skill de review, ' +
    `salvo em "${EVAL_DIR}/<repo>-pr-${prId}.md" (<repo> = basename de \`git rev-parse --show-toplevel\`; crie o diretório se não existir), contendo: ` +
    `(1) cabeçalho com PR, commit revisado (${short(pr.head_sha)}), data (\`date +%Y-%m-%d\`), workflow (code-review-flow), revisores e paths dos relatórios de origem; ` +
    '(2) tabela com todos os achados: ID, título curto, severidade, arquivo, revisores e tipo (comum = apontado por 2+ revisores; único = por 1); ' +
    '(3) seção "Achados em comum" com os achados apontados por mais de um revisor; ' +
    '(4) seção "Achados únicos" agrupada por revisor. ' +
    'Não julgue a procedência dos achados: as seções "Julgamento" e "Eficácia por revisor" serão acrescentadas ao final desse arquivo pelo workflow após a etapa Final Review. ' +
    'Como resultado, retorne os paths dos dois arquivos e a lista de achados (id, título e revisores) com os mesmos IDs do relatório consolidado.',
  { label: 'consolidate', phase: 'Code Review', model: 'sonnet', schema: CONSOLIDATED_SCHEMA },
)
if (!consolidated?.report_path) throw new Error('A consolidação não retornou o path do relatório.')
log(`Relatório consolidado: ${consolidated.report_path} | avaliação dos revisores: ${consolidated.evaluation_path} (${consolidated.findings.length} achados)`)

// ── Final Review ─────────────────────────────────────────────────────────────
phase('Final Review')

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

const finalReview = await agent(
  `Você executa a etapa "Final Review" do workflow code-review-flow, que o usuário pediu para ` +
    `rodar sobre o PR ${prRef}. ${REVIEWERS.length} revisores independentes produziram o relatório consolidado ` +
    `em ${consolidated.report_path}. ` +
    `Os revisores analisaram o commit ${pr.head_sha} (merge-base ${pr.merge_base}; diff em "${pr.diff_path}"). ` +
    'Antes de julgar, consulte o head atual do PR (`gh pr view --json headRefOid` ou `az repos pr show`, campo lastMergeSourceCommit.commitId). ' +
    `Se ainda for ${short(pr.head_sha)}, julgue contra ele, lendo os arquivos com \`git show ${pr.head_sha}:<path>\`. ` +
    `Se o PR avançou, rode \`git fetch --no-tags origin ${pr.head_branch}\`, liste os commits novos (\`git log ${short(pr.head_sha)}..<novo head>\`) ` +
    'e julgue cada achado contra o head novo: o achado que um commit novo resolveu é procedente, com o motivo "já corrigido em <commit>". ' +
    'Informe no cabeçalho do relatório final o commit revisado e, se diferente, o commit julgado. ' +
    'Julgue cada achado como procedente ou improcedente, verificando-o contra o código real antes de aceitar. Para cada achado: ' +
    '(1) abra o diff/arquivos do PR referenciados e verifique se a premissa procede no código real; ' +
    '(2) verifique se a correção sugerida quebraria funcionalidade existente ou ignora uma razão legítima da implementação atual; ' +
    '(3) para sugestões de "implementar direito"/generalizar, grep no codebase — se nada usa, marque como overengineering (YAGNI); ' +
    '(4) se não for possível verificar um achado com o código disponível, registre-o em uma seção "Não verificáveis" do relatório ' +
    'em vez de aceitá-lo ou descartá-lo. ' +
    `Após o julgamento, gere o relatório final em markdown na raiz do projeto, com o nome "pr-review-${prId}.md". ` +
    'IMPORTANTE: o documento final deve conter os itens que devem ser corrigidos (os achados procedentes) e, se houver, a seção "Não verificáveis"; ' +
    'não inclua os achados descartados/rejeitados (overengineering, premissas incorretas, falsos positivos, etc.). ' +
    `Em seguida use a skill /html-it para gerar uma versão HTML do "pr-review-${prId}.md" (para melhor legibilidade) também na raiz do projeto. ` +
    'Este workflow não altera o PR: nenhum commit, push ou comentário — apenas os dois arquivos de relatório. ' +
    'Cada achado do relatório consolidado tem um ID (F01, F02, ...): retorne em "verdicts" o veredito de TODOS eles ' +
    '(procedente, improcedente ou nao_verificavel) com um motivo curto — esses vereditos alimentam a avaliação de eficácia dos revisores. ' +
    'ultrathink.',
  {
    label: 'final-review',
    phase: 'Final Review',
    model: 'opus',
    schema: {
      type: 'object',
      properties: {
        markdown_path: { type: 'string', description: 'Path do relatório final em markdown na raiz do projeto' },
        html_path: { type: 'string', description: 'Path da versão HTML gerada pela skill html-it' },
        summary: { type: 'string', description: 'Resumo do julgamento dos achados (procedentes vs. descartados)' },
        judged_sha: { type: 'string', description: 'SHA completo do commit contra o qual os achados foram julgados' },
        verdicts: VERDICTS_SCHEMA,
      },
      required: ['markdown_path', 'verdicts'],
    },
  },
)
// Sem throw: se a Final Review falhar, os relatórios já produzidos continuam no resultado.
if (!finalReview?.markdown_path) {
  log('⚠️ Etapa Final Review não concluiu (bloqueio ou erro) — julgar o relatório consolidado manualmente.')
} else {
  log(`Relatório final: ${finalReview.markdown_path}${finalReview.html_path ? ` | HTML: ${finalReview.html_path}` : ''}`)
}

// ── Review Eval ──────────────────────────────────────────────────────────────
// Cruza os achados (e quem os apontou) com os vereditos da Final Review. As contas
// são feitas aqui, em JS, para o relatório de avaliação ser determinístico; o
// agente só acrescenta o texto pronto ao arquivo.
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

const evaluation = buildEvalSections(consolidated.findings, finalReview?.verdicts ?? [], 'Final Review')
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

return {
  pr: prRef,
  pr_snapshot: {
    base_branch: pr.base_branch,
    head_branch: pr.head_branch,
    base_sha: pr.base_sha,
    head_sha: pr.head_sha,
    merge_base: pr.merge_base,
    diff_path: pr.diff_path,
    judged_sha: finalReview?.judged_sha ?? null,
  },
  review_reports: reportPaths,
  consolidated_report: consolidated.report_path,
  final_review: finalReview,
  reviewers_evaluation: evalReport?.report_path ?? consolidated.evaluation_path,
  reviewers_stats: evaluation.stats,
}

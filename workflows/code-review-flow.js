export const meta = {
  name: 'code-review-flow',
  description: 'Code review com 4 revisores (thermos + ce-code-review + matt-code-review + /code-review, todos Opus) de um PR, com a issue do PR (e o plano da feature, se houver) como contexto, e consolidação dos relatórios',
  whenToUse:
    'Quando quiser revisar um PR existente sem implementar nada. A issue do PR e o tracker são descobertos sozinhos; para fixar a issue ou passar o plano: args: {pr, issue, plan}. Para PRs feitos com tlc-spec-lean, use tlc-code-review-flow. Uso: Workflow({name: "code-review-flow", args: "<PR url ou número>"})',
  phases: [
    { title: 'Setup', detail: 'resolve o PR uma única vez: branches, commits base/head fixados, diff salvo, a issue (com os comentários) lida do tracker do projeto e o plano da feature, compartilhados com todos os revisores', model: 'sonnet' },
    { title: 'Code Review', detail: '4 revisores em paralelo (thermos + ce-code-review + matt-code-review + /code-review embutida, todos Opus), consolidação dos relatórios e relatório de avaliação dos revisores' },
    { title: 'Final Review', detail: 'verifica cada achado contra o código do PR e gera o relatório final em markdown + HTML (show-me) na raiz do projeto', model: 'opus' },
    { title: 'Review Eval', detail: 'cruza os vereditos com os achados de cada revisor e fecha o relatório de avaliação (eficácia das skills de review)', model: 'sonnet' },
  ],
}

// O input é o PR a ser revisado: string com a URL/número, ou {pr, issue?, plan?, called_by?}.
// - issue: ID da issue do PR (ex.: "DEV-322", "#45"). Sem ele, o Setup procura no PR.
// - plan: path do plano da feature, ou "auto" para procurar em .specs/features/*/plan.md
//   (tlc-spec-lean). Sem ele, a revisão segue sem plano.
// - called_by: nome do workflow que chamou este, registrado no relatório de avaliação.
// O dev-flow e o tlc-code-review-flow chamam este workflow com workflow(). O aninhamento
// só vai até um nível, então este script não pode chamar workflow().
const input = typeof args === 'string' ? { pr: args } : args ?? {}
const prRef = String(input.pr ?? '').trim()
if (!prRef) {
  throw new Error('Informe o PR a revisar em args, ex.: args: "https://github.com/org/repo/pull/123" ou args: {pr: "123", issue: "DEV-322"}')
}
const issueArg = String(input.issue ?? '').trim()
const planArg = String(input.plan ?? '').trim()
const findPlan = planArg === 'auto'
const workflowName = input.called_by ? `code-review-flow (chamado pelo ${input.called_by})` : 'code-review-flow'

// Sufixo dos relatórios: número do PR — Azure DevOps (.../pullrequest/1234),
// GitHub (.../pull/1234) ou o número solto. Fallback: última sequência de dígitos.
const prId = prRef.match(/\/(?:pullrequest|pull)\/(\d+)/i)?.[1] ?? prRef.match(/\d+/g)?.pop() ?? 'pr'

// ── Setup ────────────────────────────────────────────────────────────────────
// Fixa o snapshot do PR uma única vez. Sem isso, cada revisor resolvia o PR por
// conta própria (refs diferentes, 5x o mesmo fetch) e o autor podia publicar
// commits no meio da revisão: os achados ficavam presos a um head antigo.
// A issue entra no snapshot pelo mesmo motivo: lida uma vez, igual para todos.
phase('Setup')
log(`Revisando o PR: ${prRef}`)

const diffPath = `/tmp/pr-${prId}/diff.patch`
const issuePath = `/tmp/pr-${prId}/issue.md`

const PLAN_PROPERTIES = {
  plan_path: { type: 'string', description: 'Path absoluto do plan.md da feature, ou "" quando nenhum corresponde ao PR' },
  plan_match: { type: 'string', description: 'Como o plano foi associado ao PR (ex.: "DEV-322 no título do plano"), ou o motivo de não haver plano' },
}

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
    issue_id: { type: 'string', description: 'ID da issue do PR (ex.: DEV-322, #45), ou "" quando não há' },
    issue_tracker: { type: 'string', description: 'Tracker da issue (ex.: Linear, Plane, GitHub Issues, Jira, Azure Boards), ou "" quando não foi identificado' },
    issue_url: { type: 'string', description: 'URL da issue, ou ""' },
    issue_path: { type: 'string', description: 'Path absoluto da issue salva com os comentários, ou "" quando não foi possível lê-la' },
    issue_note: { type: 'string', description: 'Como a issue e o tracker foram identificados, ou o motivo de não haver issue' },
    ...(findPlan ? PLAN_PROPERTIES : {}),
  },
  required: [
    'title', 'base_branch', 'head_branch', 'base_sha', 'head_sha', 'merge_base', 'diff_path',
    'issue_id', 'issue_tracker', 'issue_path', 'issue_note',
    ...(findPlan ? Object.keys(PLAN_PROPERTIES) : []),
  ],
}

const pr = await agent(
  `Fixe o escopo da revisão do PR ${prRef}, a partir do repositório atual. ` +
    '(1) Leia os metadados do PR: no GitHub `gh pr view <PR> --json title,body,baseRefName,headRefName,headRefOid`; ' +
    'no Azure DevOps `az repos pr show --id <número> --org <org da URL> --query ' +
    '"{title:title,body:description,base:targetRefName,head:sourceRefName,headSha:lastMergeSourceCommit.commitId}"` (tire o prefixo refs/heads/ das branches). ' +
    '(2) Rode `git fetch --no-tags origin <base> <head>`: atualiza origin/<base> e origin/<head> sem trocar de branch nem tocar no working tree. ' +
    '(3) head_sha = o commit de head informado pelo PR (confirme com `git cat-file -t <sha>`); base_sha = `git rev-parse origin/<base>`; ' +
    'merge_base = `git merge-base <base_sha> <head_sha>`. ' +
    `(4) Salve \`git diff <merge_base> <head_sha>\` em "${diffPath}" (crie o diretório). ` +
    '(5) Identifique a issue que originou o PR. ' +
    (issueArg
      ? `O ID foi informado: "${issueArg}". `
      : 'Procure o ID (ex.: DEV-322, #45, AB#123) ou o link da issue no título, na branch, no corpo do PR e nas mensagens dos commits (`git log --format=%B <merge_base>..<head_sha>`). ') +
    'Descubra qual tracker o projeto usa. Um link no PR já diz (linear.app, github.com/<org>/<repo>/issues, dev.azure.com/.../_workitems, atlassian.net, Plane). ' +
    'Sem link, cruze o formato do ID com os sinais do projeto: CLAUDE.md, AGENTS.md e docs que citem o tracker, .mcp.json, o remote do git e as ferramentas MCP disponíveis ' +
    '(procure com ToolSearch por "linear", "plane", "jira" e "github"). "#45" num repositório GitHub é GitHub Issues (`gh issue view 45 --comments`); "AB#123" é Azure Boards; ' +
    '"ABC-123" pode ser Linear, Plane ou Jira: consulte o ID nos trackers acessíveis e fique com o que o encontrar. ' +
    `Leia a issue e TODOS os comentários e salve em "${issuePath}": cabeçalho com ID, tracker, URL, título e status; a descrição completa; ` +
    'e os comentários em ordem cronológica, com autor e data. Liste os links de anexos e de issues relacionadas, sem baixá-los. ' +
    'Sem issue, ou com o tracker inacessível, retorne issue_path = "" e explique em issue_note (informe o ID e o tracker se os encontrou). ' +
    (findPlan
      ? '(6) Localize o plano da feature (tlc-spec-lean) em `.specs/features/*/plan.md` na raiz do repositório. ' +
        '`.specs/` costuma estar no .gitignore: procure no working tree, não no git. ' +
        'Associe pelo ID da issue do passo (5): `grep -l "<ID>" .specs/features/*/plan.md`. ' +
        'Sem ID, ou com 0 ou 2+ candidatos, compare o nome da pasta da feature com a branch e o título. ' +
        'Retorne o path absoluto em plan_path só quando a associação for inequívoca; senão plan_path = "" e explique em plan_match. '
      : '') +
    'Use SHAs completos (40 caracteres). Não troque de branch, não altere o working tree e não comente no PR nem na issue. Retorne os campos pedidos.',
  { label: 'pr-setup', phase: 'Setup', model: 'sonnet', effort: 'low', schema: SETUP_SCHEMA },
)

const SHA_RE = /^[0-9a-f]{40}$/
if (!pr || ![pr.base_sha, pr.head_sha, pr.merge_base].every((sha) => SHA_RE.test(String(sha)))) {
  throw new Error(`Setup não fixou os commits do PR ${prRef}: ${JSON.stringify(pr)}`)
}
const short = (sha) => sha.slice(0, 7)
const reviewRange = `${pr.base_sha}...${pr.head_sha}`
log(`Escopo fixado: ${pr.head_branch} → ${pr.base_branch} | head ${short(pr.head_sha)} | merge-base ${short(pr.merge_base)} | diff ${pr.diff_path}`)
log(pr.issue_path ? `Issue: ${pr.issue_id} (${pr.issue_tracker}) em ${pr.issue_path}` : `⚠️ Sem issue: ${pr.issue_note}. Os revisores trabalham sem o pedido original.`)

const plan = findPlan
  ? { path: pr.plan_path, match: pr.plan_match }
  : { path: planArg, match: planArg ? 'informado em args' : '' }
if (plan.path) log(`Plano da feature: ${plan.path} (${plan.match})`)
else if (findPlan) log(`⚠️ Sem plano da feature: ${plan.match}. Os revisores trabalham sem o contrato.`)

// A issue (com os comentários) é o pedido original: diz o que o PR precisa entregar
// e registra as mudanças de escopo combinadas depois da descrição. O ID e o tracker
// vão junto do arquivo para o revisor que precisar de algo além dele.
const issueContext = pr.issue_path
  ? `O PR atende a issue ${pr.issue_id} (${pr.issue_tracker}${pr.issue_url ? `, ${pr.issue_url}` : ''}). ` +
    `Antes de revisar, leia INTEIRA a issue e todos os comentários, salvos em "${pr.issue_path}" (leia do disco). ` +
    'Os comentários podem mudar o escopo da descrição: quando divergirem, vale o mais recente. ' +
    'Requisito ou critério de aceite da issue não atendido, ou atendido em parte, é achado, citando o trecho da issue; ' +
    'o que a issue ou um comentário deixou para depois não é achado. ' +
    `Se precisar de algo que não está no arquivo (anexo, issue relacionada), consulte a issue ${pr.issue_id} direto no ${pr.issue_tracker}, só para leitura. `
  : ''

// O plano é o contrato da feature: o que ela precisa garantir, as decisões já tomadas
// (com a alternativa rejeitada) e o que ficou fora do escopo. Sem ele, os revisores
// reabrem decisões tomadas e reportam trabalho de outras issues, ruído que a Final
// Review depois descarta (no PR #12 do setur-observatorio-turismo, 23 de 28).
// Issue e plano vão por path, e não inline: o script não lê arquivos, e os dois são lidos inteiros.
const planContext = plan.path
  ? `Antes de revisar, leia INTEIRO o plano da feature em "${plan.path}" (leia do disco, não com git show: o plano pode estar fora do git). ` +
    'Ele é o contrato do PR: o que precisa valer, as decisões já tomadas (cada uma com a alternativa rejeitada) e o que fica fora do escopo. ' +
    'Num plano tlc-spec-lean, são as seções Criteria, Landing (portas de mão única), Out of scope, Assumptions e os ajustes "Settled mid-build". ' +
    'Use o plano para classificar cada achado antes de reportá-lo: ' +
    '(a) o código diverge do plano, ou um item ou critério do plano não está implementado (ou está só em parte): achado, citando o item; ' +
    '(b) bug, falha de segurança ou risco que o plano não decidiu: achado; ' +
    '(c) a correção sugerida é a alternativa que o plano rejeitou, ou o item está fora do escopo do plano: não reporte; ' +
    'se você discordar de uma decisão, reporte UM achado "decisão do plano a rever", citando a decisão e o argumento novo que o plano não considerou. '
  : ''

// Contexto comum a todos os revisores: a mesma issue, o mesmo plano, o mesmo commit, o mesmo diff.
const scopeContext =
  issueContext +
  planContext +
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

// A /code-review embutida no Claude Code não aceita uma "tarefa": recebe só argumentos
// (nível de esforço, alvo) e devolve os achados; o agente que a invoca recebe o range
// fixado no Setup e grava o relatório. Sem --fix. Nível "high" amplia a cobertura;
// os falsos positivos caem nos vereditos.
// Sem revisor só de segurança: em 22 PRs (set–out/2026) a claude-security-review não
// trouxe nenhum achado procedente que os outros revisores não tivessem apontado
// (~/.claude/review-evals/analise-revisores-2026-10-26.md).
// A key é a identidade do revisor na série histórica de ~/.claude/review-evals:
// trocar a skill não muda a key.
// A /code-review embutida tem o mesmo nome da skill do plugin mattpocock, por isso
// a do plugin é referenciada com o namespace.
const REVIEWERS = [
  { key: 'thermos', skill: 'thermos:thermos' },
  { key: 'ce-code-review', skill: 'ce-code-review' },
  { key: 'matt-code-review', skill: 'mattpocock-skills:code-review' },
  { key: 'claude-code-review', skill: 'code-review', args: `high ${reviewRange}` },
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
      (pr.issue_path || plan.path ? 'A skill não recebe a issue nem o plano: antes de gravar, filtre os achados dela pelo contexto acima. ' : '') +
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
    `(1) cabeçalho com PR, commit revisado (${short(pr.head_sha)}), data (\`date +%Y-%m-%d\`), workflow (${workflowName}), issue (${pr.issue_id || 'nenhuma'}), plano (${plan.path || 'nenhum'}), revisores e paths dos relatórios de origem; ` +
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

// A show-me tem disable-model-invocation (só roda como /show-me), então o agente
// não consegue invocá-la pelo Skill tool: lê o SKILL.md e segue a orientação.
const finalReview = await agent(
  `Você executa a etapa "Final Review" do workflow ${workflowName}, que o usuário pediu para ` +
    `rodar sobre o PR ${prRef}. ${REVIEWERS.length} revisores independentes produziram o relatório consolidado ` +
    `em ${consolidated.report_path}. ` +
    `Os revisores analisaram o commit ${pr.head_sha} (merge-base ${pr.merge_base}; diff em "${pr.diff_path}"). ` +
    (pr.issue_path
      ? `Leia INTEIRA a issue ${pr.issue_id} com os comentários em "${pr.issue_path}" antes de julgar: requisito da issue não atendido é procedente; ` +
        'o que a issue ou um comentário deixou para depois é improcedente (fora do escopo); quando os comentários divergirem da descrição, vale o mais recente. '
      : '') +
    (plan.path
      ? `Leia INTEIRO o plano da feature em "${plan.path}" antes de julgar: a alternativa que o plano rejeitou ou um item fora do escopo do plano é improcedente (fora do escopo); ` +
        'código que diverge do plano é procedente. Um achado "decisão do plano a rever" vai para a seção "Decisões a rever" do relatório final, com o argumento, e não entra como item a corrigir. '
      : '') +
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
    `Em seguida gere uma versão HTML do "pr-review-${prId}.md" (para melhor legibilidade), "pr-review-${prId}.html", também na raiz do projeto, ` +
    'seguindo a skill show-me: leia ~/.claude/skills/show-me/SKILL.md e aplique a orientação de arquivo HTML dela (sem rodar `open`). ' +
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
        html_path: { type: 'string', description: 'Path da versão HTML gerada seguindo a skill show-me' },
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
    issue_id: pr.issue_id || null,
    issue_tracker: pr.issue_tracker || null,
    issue_url: pr.issue_url || null,
    issue_path: pr.issue_path || null,
    plan_path: plan.path || null,
    judged_sha: finalReview?.judged_sha ?? null,
  },
  review_reports: reportPaths,
  consolidated_report: consolidated.report_path,
  final_review: finalReview,
  reviewers_evaluation: evalReport?.report_path ?? consolidated.evaluation_path,
  reviewers_stats: evaluation.stats,
}

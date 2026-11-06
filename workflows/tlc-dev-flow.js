export const meta = {
  name: 'tlc-dev-flow',
  description: 'Fluxo de desenvolvimento a partir de um plano aprovado da tlc-plan: tlc-implement → PR → code review com o plano → correções pela tlc-implement → auditoria de docs → gate final',
  whenToUse:
    'Quando existir um .specs/features/<feature>/plan.md aprovado pela tlc-plan (linha **Approved**) para executar de ponta a ponta. Sem plano tlc, use dev-flow. Uso: Workflow({name: "tlc-dev-flow", args: "/path/.specs/features/<feature>/plan.md"}) ou args: {plan, issue?, base?}',
  phases: [
    { title: 'Implement', detail: 'tlc-implement sobre o plano aprovado: checks, build, Verifier; só commits locais', model: 'opus' },
    { title: 'PR', detail: 'confere o gate com validate_verification.py, faz push e abre o PR (draft e para aqui se o gate estiver vermelho)', model: 'sonnet' },
    { title: 'Code Review', detail: 'roda o code-review-flow sobre o PR, com o plano e a issue' },
    { title: 'PR Fixes', detail: 'a tlc-implement retoma a feature e aplica os achados procedentes do relatório final', model: 'opus' },
    { title: 'Docs Audit', detail: 'auditoria de documentação da branch com a skill docs-generator', model: 'opus' },
    { title: 'Gate', detail: 'check_proofs.py e validate_verification.py no HEAD final, resultado comentado no PR', model: 'sonnet' },
  ],
}

// O input é o path do plan.md aprovado (string) ou {plan, issue?, base?}.
// - issue: ID da issue (ex.: "DEV-322"). Sem ele, a fase Implement procura no plano.
// - base: branch alvo do PR. Padrão: "dev".
const input = typeof args === 'string' ? { plan: args } : args ?? {}
const planPath = String(input.plan ?? '').trim()
if (!planPath) {
  throw new Error('Informe o path do plan.md aprovado em args, ex.: args: ".specs/features/minha-feature/plan.md"')
}
const issueArg = String(input.issue ?? '').trim()
const base = String(input.base ?? '').trim() || 'dev'

// Os scripts da tlc-implement ficam no diretório da skill. O agente resolve o path,
// porque a skill pode estar instalada no projeto ou no home.
const scripts =
  'Os scripts citados são os da skill tlc-implement: rode `python3 <skill-dir>/scripts/<nome>.py`, ' +
  'onde <skill-dir> é o diretório do SKILL.md da tlc-implement instalada. '

// ── Etapa 1: Implement ──────────────────────────────────────────────────────
// A tlc-implement roda sem exceção à regra 8: o plano aprovado autoriza só
// edições e commits locais. Push e PR são da etapa PR, depois do gate.
phase('Implement')
log(`Implementando o plano: ${planPath}`)

const IMPLEMENT_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['done', 'gate_red', 'refused'],
      description: 'done: o gate passou; gate_red: o build terminou e o gate falhou; refused: a tlc-implement recusou o plano (sem **Approved**, pergunta blocks em aberto, ou trabalho que precisa voltar para a tlc-plan)',
    },
    feature: { type: 'string', description: 'Nome da pasta em .specs/features/' },
    branch: { type: 'string', description: 'Branch local com os commits da feature' },
    issue: { type: 'string', description: 'ID da issue (do args ou do plano), ou "" quando não há' },
    self_verified: { type: 'boolean', description: 'true quando o Verifier não rodou como sub-agente e o relatório diz self-verified' },
    summary: { type: 'string', description: 'Resumo curto do que foi implementado, ou o motivo da recusa' },
  },
  required: ['status', 'feature', 'branch', 'issue', 'summary'],
}

const impl = await agent(
  `Invoque a skill tlc-implement (via Skill tool) e implemente o plano aprovado em ${planPath}. ` +
    'Siga a skill inteira: checks, build e Verify, com o Verifier e o sub-agente de telas como sub-agentes, como ela manda. ' +
    `Antes do primeiro commit, se a branch atual for "${base}" ou a branch padrão do repositório, crie uma branch de feature a partir de "${base}" ` +
    'seguindo a convenção de nomes do repositório. ' +
    'Faça só commits locais: não faça push nem crie PR, porque a próxima etapa do workflow faz isso depois de conferir o gate. ' +
    (issueArg ? `A issue é ${issueArg}. ` : 'Se o plano citar o ID de uma issue, retorne-o; senão retorne "". ') +
    'Se a skill recusar o plano, pare e retorne status "refused" com o motivo em summary. ' +
    scripts,
  { label: 'implement', phase: 'Implement', model: 'opus', schema: IMPLEMENT_SCHEMA },
)
if (!impl) throw new Error('A etapa Implement não concluiu (bloqueio ou erro).')
if (impl.status === 'refused') {
  throw new Error(`A tlc-implement recusou o plano: ${impl.summary}. Volte para a tlc-plan.`)
}
const issue = issueArg || impl.issue || ''
const feature = impl.feature
log(`Feature ${feature} na branch ${impl.branch} (status: ${impl.status})`)

// Cadeia de autorização explícita: cada subagente é avaliado pelo prompt que recebe, isolado.
// Sem esta ligação branch ↔ pedido original do usuário, o push autônomo é classificado
// como escrita externa não autorizada e o subagente é bloqueado.
const contextoAutorizado = (etapa, prUrl) =>
  `Você executa a etapa "${etapa}" do workflow tlc-dev-flow, que o usuário pediu para rodar de ` +
  `ponta a ponta sobre o plano aprovado em ${planPath} (feature "${feature}"). A branch ${impl.branch} ` +
  'foi criada pela etapa Implement deste mesmo workflow, a partir desse plano. Push NESSA branch' +
  (prUrl ? ` e comentários no PR ${prUrl} fazem` : ` e a criação de um PR dela para "${base}" fazem`) +
  ' parte do escopo já autorizado pelo usuário, inclusive para a regra 8 da tlc-implement. ' +
  'Fora de escopo (não faça): merge do PR, push para qualquer outra branch, criar outros PRs, ' +
  'alterar outros repositórios, commitar os relatórios pr-review-* que o code review deixa em .claude/reviews/, ' +
  'commitar .specs/ quando o repositório não rastreia essa pasta. '

// ── Etapa 2: PR ─────────────────────────────────────────────────────────────
// O gate decide o tipo do PR pelo exit code do script, não pelo relato da etapa Implement.
// validate_verification.py só lê arquivos e já falha quando proofs.md não é do HEAD atual,
// então check_proofs.py não roda de novo aqui.
phase('PR')

const PR_SCHEMA = {
  type: 'object',
  properties: {
    pr_url: { type: 'string', description: 'URL do PR criado' },
    gate_ok: { type: 'boolean', description: 'true quando validate_verification.py saiu com 0' },
    gate_last_line: { type: 'string', description: 'Última linha da saída de validate_verification.py' },
  },
  required: ['pr_url', 'gate_ok', 'gate_last_line'],
}

const pr = await agent(
  contextoAutorizado('PR') +
    scripts +
    `Na raiz do repositório, rode \`validate_verification.py ${feature}\` e guarde a saída e o exit code. ` +
    `Faça push da branch ${impl.branch} e crie um PR dela para "${base}", seguindo as convenções de PR do repositório ` +
    (issue ? `e referenciando a issue ${issue}. ` : 'sem referenciar issue. ') +
    `O corpo do PR resume a feature (resumo da implementação: ${impl.summary}), cita o plano ${planPath} ` +
    'e abre com a última linha da saída de validate_verification.py. ' +
    (impl.self_verified ? 'Diga no corpo que o Verifier rodou como self-verified, sem sub-agente independente. ' : '') +
    'Se o exit code não for 0, crie o PR como draft e coloque a saída inteira do script no corpo.',
  { label: 'pr', phase: 'PR', model: 'sonnet', schema: PR_SCHEMA },
)
if (!pr?.pr_url) throw new Error('A etapa PR não retornou o link do PR.')
log(`PR criado: ${pr.pr_url}`)
if (!pr.gate_ok) {
  log(`⚠️ Gate vermelho: ${pr.gate_last_line}. PR aberto como draft; o code review não roda sobre trabalho incompleto.`)
  return { pr_url: pr.pr_url, implement: impl, gate: pr }
}

// ── Etapa 3: Code Review ────────────────────────────────────────────────────
// O tlc-code-review-flow não roda aqui: workflow() aninha só um nível, e ele já chama o
// code-review-flow. Passar o plano direto dá o mesmo resultado, sem a busca "auto".
phase('Code Review')

const review = await workflow('code-review-flow', {
  pr: pr.pr_url,
  issue,
  plan: planPath,
  called_by: 'tlc-dev-flow',
})
const finalReport = review.final_review?.markdown_path

// ── Etapa 4: PR Fixes ───────────────────────────────────────────────────────
// A tlc-implement retoma a mesma feature: o ciclo dela para achados do Verifier serve para
// os achados do code review. A tlc-plan não roda aqui, porque ela para à espera da aprovação
// do usuário. Não há segundo Verifier: check_proofs.py mostra as provas no HEAD novo.
phase('PR Fixes')

const fixesSource = finalReport
  ? `O relatório final do code review em ${finalReport} lista só os achados procedentes, já julgados contra o código. ` +
    'Os itens das seções "Não verificáveis" e "Decisões a rever" não são aplicados: registre-os entre os rejeitados, com a seção de origem. '
  : `A Final Review do code review não concluiu. Julgue você os achados do relatório consolidado em ${review.consolidated_report}, ` +
    'verificando cada um contra o código antes de aceitar: premissa que não procede, correção que quebraria funcionalidade existente, ' +
    'overengineering e item fora do escopo do plano são improcedentes. '

const fixes = await agent(
  contextoAutorizado('PR Fixes', pr.pr_url) +
    `Invoque a skill tlc-implement (via Skill tool) e retome a feature "${feature}" a partir dos arquivos em .specs/features/${feature}/. ` +
    fixesSource +
    'Para cada achado procedente: se ele aponta uma obrigação que nenhum check cobre, acrescente um check com teste (regra 4 da skill); ' +
    'se ele corrige código que um check existente já cobre, corrija sem mudar o teste. ' +
    'Um achado que contradiz uma decisão do plano, ou que pede uma decisão de produto, não é aplicado: registre-o entre os rejeitados. ' +
    'Na dúvida entre correção e decisão de produto, não aplique. ' +
    `Commite cada correção, rode \`check_proofs.py ${feature}\` até ficar verde, faça push para a branch ${impl.branch} ` +
    'e comente no PR listando somente as correções aplicadas e suas justificativas. ' +
    scripts,
  {
    label: 'pr-fixes',
    phase: 'PR Fixes',
    model: 'opus',
    schema: {
      type: 'object',
      properties: {
        applied: { type: 'array', items: { type: 'string' }, description: 'Correções aplicadas' },
        checks_added: { type: 'array', items: { type: 'string' }, description: 'Checks acrescentados em checks.md' },
        rejected: { type: 'array', items: { type: 'string' }, description: 'Itens não aplicados e o motivo' },
        summary: { type: 'string', description: 'Resumo do ciclo de correção' },
      },
      required: ['summary'],
    },
  },
)
if (!fixes) log(`⚠️ Etapa PR Fixes não concluiu (bloqueio ou erro) — aplicar manualmente as correções de ${finalReport ?? review.consolidated_report}.`)

// ── Etapa 5: Docs Audit ─────────────────────────────────────────────────────
phase('Docs Audit')

const docsAudit = await agent(
  contextoAutorizado('Docs Audit', pr.pr_url) +
    'Invoque a skill docs-generator (via Skill tool) e realize a auditoria de documentação desta branch. ' +
    `Contexto: as etapas anteriores de code review e correção já rodaram. Resumo das correções aplicadas no PR: ${fixes?.summary ?? 'n/d'}. ` +
    `Correções aplicadas: ${fixes?.applied?.length ? fixes.applied.join('; ') : 'nenhuma registrada'}. ` +
    'Realize uma auditoria minuciosa nas alterações desta branch seguindo estas diretrizes:\n' +
    '- Verificação de Sincronia: Analise todos os arquivos alterados no PR e verifique se a pasta /docs foi atualizada ' +
    "corretamente em conformidade com as diretrizes e padrões da skill 'docs-generator'.\n" +
    '- Extração de Conhecimento: Identifique decisões arquiteturais, mudanças de lógica complexa ou trade-offs importantes ' +
    'que não estejam documentados. Transfira esses achados para um formato de documentação oficial, preferencialmente ' +
    'seguindo o modelo de ADR (Architecture Decision Records) ou atualizando os guias técnicos existentes. ' +
    `As decisões do plano (${planPath}) e de .specs/STATE.md que o código passou a seguir também contam: .specs/ pode estar fora do git.\n` +
    '- Lista de verificação: Confirmação de que o docs-generator foi aplicado corretamente em todos os módulos impactados. ' +
    'Seja criterioso, focando na manutenibilidade e na clareza para futuros desenvolvedores.\n' +
    '- Considere que arquivos git-ignored em `docs` não entrarão na versão final do projeto (são temporários), então ' +
    'achados importantes têm que virar documentação (ex: ADRs, README, Guides, References, etc.).\n' +
    '- Ao promover uma solution para ADR (quando a investigação revelar uma decisão arquitetural), o ADR deve ser **self-contained**.\n' +
    '- Também não faça referências a Issues do Linear ou Plane no Código (ex: "feito de acordo com DEV-88", "EVABOT-XX"), ' +
    'pois não serão acessíveis após a entrega do software. Somente docs versionadas (ADRs, guides, etc.) devem ser referenciadas.\n' +
    '- Não altere código nem testes: esta etapa só mexe em documentação.\n' +
    '\n' +
    `Ao final, commite e faça push das atualizações de documentação para a branch ${impl.branch}. ` +
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

// ── Etapa 6: Gate ───────────────────────────────────────────────────────────
// Os commits do PR Fixes e do Docs Audit mudam o HEAD, e validate_verification.py falha
// quando proofs.md não é do HEAD atual. Só o HEAD final interessa ao merge.
phase('Gate')

const gate = await agent(
  contextoAutorizado('Gate', pr.pr_url) +
    scripts +
    `Na branch ${impl.branch}, com a árvore limpa fora de .specs/, rode \`check_proofs.py ${feature}\` e depois ` +
    `\`validate_verification.py ${feature}\`, e guarde a saída e o exit code de cada um. Não altere código, testes nem checks. ` +
    `Se houver commit local sem push, faça push para ${impl.branch}. ` +
    'Comente no PR o resultado: o commit verificado, a última linha de cada script e, se algum falhou, a saída dele. ' +
    'Se a falha vier do sub-agente de telas (código mudou depois do HEAD que ele julgou, e as 2 rodadas já foram usadas), ' +
    'diga no comentário que a revisão das telas vai para o usuário.',
  {
    label: 'gate',
    phase: 'Gate',
    model: 'sonnet',
    schema: {
      type: 'object',
      properties: {
        head: { type: 'string', description: 'SHA curto do HEAD verificado' },
        gate_ok: { type: 'boolean', description: 'true quando os dois scripts saíram com 0' },
        gate_last_line: { type: 'string', description: 'Última linha da saída de validate_verification.py' },
      },
      required: ['gate_ok', 'gate_last_line'],
    },
  },
)
if (!gate) log('⚠️ Etapa Gate não concluiu — rodar check_proofs.py e validate_verification.py manualmente.')
else if (!gate.gate_ok) log(`⚠️ Gate final vermelho: ${gate.gate_last_line}`)

return {
  pr_url: pr.pr_url,
  implement: impl,
  code_review: review,
  fixes,
  docs_audit: docsAudit,
  gate,
}

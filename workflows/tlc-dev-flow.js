export const meta = {
  name: 'tlc-dev-flow',
  version: '1.1.0',
  description: 'Fluxo de desenvolvimento a partir de um plano aprovado da tlc-plan: tlc-implement → Verifier independente → PR → code review com o plano → correções pela tlc-implement → Verifier dos checks novos → auditoria de docs → gate final',
  whenToUse:
    'Quando existir um .specs/features/<feature>/plan.md aprovado pela tlc-plan (linha **Approved**) para executar de ponta a ponta. Sem plano tlc, use dev-flow. Uso: Workflow({name: "tlc-dev-flow", args: "/path/.specs/features/<feature>/plan.md"}) ou args: {plan, issue?, base?}',
  phases: [
    { title: 'Implement', detail: 'tlc-implement sobre o plano aprovado: checks, build e check_proofs.py verde; só commits locais', model: 'opus' },
    { title: 'Verify', detail: 'Verifier (verify.md) e, quando um critério cita uma captura, o sub-agente de telas (verify-screens.md), como agentes novos do workflow', model: 'opus' },
    { title: 'Verify Fixes', detail: 'a tlc-implement fecha os achados com o commit em Closed; round 2 das telas quando o código mudou', model: 'opus' },
    { title: 'PR', detail: 'confere o gate com validate_verification.py, faz push e abre o PR com as capturas que o repo pede (draft e para aqui se o gate estiver vermelho)', model: 'sonnet' },
    { title: 'Code Review', detail: 'roda o code-review-flow sobre o PR, com o plano e a issue' },
    { title: 'PR Fixes', detail: 'a tlc-implement retoma a feature e aplica os achados procedentes do relatório final', model: 'opus' },
    { title: 'Re-verify', detail: 'um Verifier novo julga só os checks que a PR Fixes acrescentou; a tlc-implement fecha o que ele achar', model: 'opus' },
    { title: 'Docs Audit', detail: 'auditoria de documentação da branch com a skill docs-generator', model: 'opus' },
    { title: 'Gate', detail: 'check_proofs.py e validate_verification.py no HEAD final, resultado comentado no PR', model: 'sonnet' },
  ],
}

// O input é o path do plan.md aprovado (string) ou {plan, issue?, base?}.
// - issue: ID da issue (ex.: "DEV-322"). Sem ele, a fase Implement procura no plano.
// - base: branch alvo do PR. Padrão: a branch padrão do repositório (origin/HEAD).
const input = typeof args === 'string' ? { plan: args } : args ?? {}
const planPath = String(input.plan ?? '').trim()
if (!planPath) {
  throw new Error('Informe o path do plan.md aprovado em args, ex.: args: ".specs/features/minha-feature/plan.md"')
}
const issueArg = String(input.issue ?? '').trim()
const base = String(input.base ?? '').trim()
// O script não roda git: sem base, o agente lê a branch padrão no repositório.
const baseRef = base
  ? `"${base}"`
  : 'a branch padrão do repositório (`git symbolic-ref --short refs/remotes/origin/HEAD`, sem o prefixo `origin/`)'

// Os scripts da tlc-implement ficam no diretório da skill. O agente resolve o path,
// porque a skill pode estar instalada no projeto ou no home.
const scripts =
  'Os scripts citados são os da skill tlc-implement: rode `python3 <skill-dir>/scripts/<nome>.py`, ' +
  'onde <skill-dir> é o diretório do SKILL.md da tlc-implement instalada. '

// ── Etapa 1: Implement ──────────────────────────────────────────────────────
// A tlc-implement roda sem exceção à regra 8: o plano aprovado autoriza só
// edições e commits locais. Push e PR são da etapa PR, depois do gate.
// Os agentes de um workflow não têm a ferramenta Agent (nem com agentType), então a
// tlc-implement não consegue despachar o Verifier e o sub-agente de telas: sem aviso,
// ela cai no modo degradado e grava self-verified. Por isso ela para no check_proofs.py
// verde, e o Verifier e as telas são etapas agent() deste script, que já começam sem o
// contexto do autor, como a regra 5 pede.
phase('Implement')
log(`Implementando o plano: ${planPath}`)

const IMPLEMENT_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['built', 'proofs_red', 'refused'],
      description: 'built: o build terminou e check_proofs.py saiu com 0; proofs_red: o build terminou e check_proofs.py não ficou verde; refused: a tlc-implement recusou o plano (sem **Approved**, pergunta blocks em aberto, ou trabalho que precisa voltar para a tlc-plan)',
    },
    feature: { type: 'string', description: 'Nome da pasta em .specs/features/' },
    branch: { type: 'string', description: 'Branch local com os commits da feature' },
    base_sha: { type: 'string', description: 'SHA do commit de onde a feature partiu (git merge-base da branch com a base)' },
    head: { type: 'string', description: 'SHA curto do HEAD em que check_proofs.py rodou' },
    screens_owed: { type: 'boolean', description: 'true quando algum critério do plano cita uma captura (o sub-agente de telas é devido)' },
    issue: { type: 'string', description: 'ID da issue (do args ou do plano), ou "" quando não há' },
    summary: { type: 'string', description: 'Resumo curto do que foi implementado, ou o motivo da recusa' },
  },
  required: ['status', 'feature', 'branch', 'base_sha', 'head', 'screens_owed', 'issue', 'summary'],
}

const impl = await agent(
  `Invoque a skill tlc-implement (via Skill tool) e implemente o plano aprovado em ${planPath}. ` +
    'Siga as fases Checks e Build da skill inteiras, até rodar `check_proofs.py <feature>` no HEAD final do build. ' +
    'A fase Verify não é sua: este workflow manda o Verifier e o sub-agente de telas como etapas próprias, logo depois desta, ' +
    'porque aqui você não tem como criar sub-agentes. Não rode verify.md nem verify-screens.md, não escreva verification.md nem screens.md, ' +
    'não grave self-verified e não rode validate_verification.py. ' +
    'Quando um critério cita uma captura, salve os `<capture>.running.png` como a regra 9 manda antes de retornar. ' +
    'Na linha `**Dispatched:**` do `## Handoff` de checks.md, escreva que o Verifier' +
    ' (e o sub-agente de telas, round 1, quando devido) é despachado pela etapa Verify do workflow tlc-dev-flow no HEAD em que check_proofs.py rodou. ' +
    (base
      ? `Antes do primeiro commit, se a branch atual for "${base}" ou a branch padrão do repositório, crie uma branch de feature a partir de "${base}" `
      : 'Antes do primeiro commit, se a branch atual for a branch padrão do repositório, crie uma branch de feature a partir dela ') +
    'seguindo a convenção de nomes do repositório. ' +
    'Faça só commits locais: não faça push nem crie PR, porque uma etapa seguinte do workflow faz isso depois de conferir o gate. ' +
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
log(`Feature ${feature} na branch ${impl.branch} em ${impl.head} (status: ${impl.status})`)

// Cadeia de autorização explícita: cada subagente é avaliado pelo prompt que recebe, isolado.
// Sem esta ligação branch ↔ pedido original do usuário, o push autônomo é classificado
// como escrita externa não autorizada e o subagente é bloqueado.
const contextoAutorizado = (etapa, prUrl) =>
  `Você executa a etapa "${etapa}" do workflow tlc-dev-flow, que o usuário pediu para rodar de ` +
  `ponta a ponta sobre o plano aprovado em ${planPath} (feature "${feature}"). A branch ${impl.branch} ` +
  'foi criada pela etapa Implement deste mesmo workflow, a partir desse plano. ' +
  'Fazem parte do escopo já autorizado pelo usuário, inclusive para a regra 8 da tlc-implement: push NESSA branch; ' +
  (prUrl ? `edição do corpo e comentários no PR ${prUrl}; ` : `a criação de um PR dela para ${baseRef}; `) +
  'e o push de capturas de tela para a branch que as convenções de PR do repositório reservam a elas, quando reservam. ' +
  'Fora de escopo (não faça): merge do PR, push para qualquer outra branch, criar outros PRs, ' +
  'alterar outros repositórios, commitar os relatórios pr-review-* que o code review deixa em .claude/reviews/, ' +
  'commitar .specs/ quando o repositório não rastreia essa pasta. '

// ── Verifier, telas e fechamento dos achados ────────────────────────────────
// Os prompts do Verifier e das telas nomeiam a feature, os arquivos e o intervalo do diff,
// e nada sobre o que aceitar (verify.md, "The round", passo 2). Nenhum dos dois lê o
// `## Handoff`: ele carrega o raciocínio do autor.
const featureDir = `.specs/features/${feature}`

const VERIFIER_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'], description: 'O **Verdict** escrito em verification.md' },
    head: { type: 'string', description: 'SHA curto do HEAD julgado' },
    checks_judged: { type: 'array', items: { type: 'string' }, description: 'IDs dos checks que ganharam linha em ## Checks nesta rodada' },
    findings: {
      type: 'array',
      description: 'Achados desta rodada, como em ## Findings; vazio com PASS',
      items: {
        type: 'object',
        properties: { finding: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } },
        required: ['finding', 'evidence', 'fix'],
      },
    },
  },
  required: ['verdict', 'head', 'checks_judged', 'findings'],
}

const SCREENS_SCHEMA = {
  type: 'object',
  properties: {
    round: { type: 'integer', description: 'O **Round** escrito em screens.md' },
    head: { type: 'string', description: 'SHA curto do HEAD julgado' },
    diverges: { type: 'boolean', description: 'true quando alguma imagem tem uma linha differs' },
    differs: { type: 'array', items: { type: 'string' }, description: 'Cada linha differs, com a imagem e o que ela desenha' },
  },
  required: ['round', 'head', 'diverges', 'differs'],
}

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    closed: { type: 'array', items: { type: 'string' }, description: 'Cada achado fechado, com o commit e o check que agora o prova' },
    code_changed: { type: 'boolean', description: 'true quando algum commit desta etapa mudou código fora de .specs/' },
    proofs_green: { type: 'boolean', description: 'true quando check_proofs.py saiu com 0 no HEAD final' },
    head: { type: 'string', description: 'SHA curto do HEAD final' },
    summary: { type: 'string' },
  },
  required: ['closed', 'code_changed', 'proofs_green', 'head', 'summary'],
}

// O Verifier e as telas não corrigem nada; a árvore tem que voltar limpa fora de .specs/,
// porque check_proofs.py e o gate leem o HEAD.
const naoCorrige =
  'Você não corrige nada, não commita e não faz push. Exemplos descartáveis que você criar ficam fora do git e são apagados ' +
  'antes de você terminar: a árvore fica como estava, fora de .specs/. '

const verifierPrompt = (range, newChecks) =>
  'Você é o Verifier da skill tlc-implement: um agente novo, que não escreveu este código. ' +
  scripts +
  `Leia <skill-dir>/references/verify.md e faça o que as seções "What the Verifier does" e "Report" mandam, para a feature "${feature}". ` +
  `Arquivos: ${featureDir}/plan.md, ${featureDir}/checks.md (sem ler o \`## Handoff\`) e ${featureDir}/proofs.md. ` +
  `Intervalo do diff: ${range}. ` +
  (newChecks
    ? `Os checks ${newChecks.join(', ')} entraram depois que outro Verifier julgou os demais em ${featureDir}/verification.md. ` +
      'Julgue só esses checks: acrescente uma linha de cada um ao `## Checks` e os seus achados ao `## Findings`, ' +
      'sem mudar as linhas que já estão lá, e atualize **Verdict** e **Proofs**. Seus exemplos próprios vão nas regras que esse intervalo tocou. '
    : `Escreva ${featureDir}/verification.md. `) +
  naoCorrige

const screensPrompt = round =>
  'Você é o sub-agente de telas da skill tlc-implement: um agente novo, que não construiu estas telas. ' +
  scripts +
  `Leia <skill-dir>/references/verify-screens.md e julgue as imagens da feature "${feature}" como ele manda: ` +
  `${featureDir}/plan.md, cada captura em ${featureDir}/captures/ e o \`<capture>.running.png\` ao lado dela. ` +
  (round === 1
    ? `Este é o round 1: escreva ${featureDir}/screens.md com o HEAD atual. `
    : `Este é o round 2, o último ("The second round"): parta do ${featureDir}/screens.md do round 1 e reabra só as linhas differs ` +
      'nas imagens salvas de novo, com o HEAD atual. ') +
  naoCorrige

// Agentes novos são baratos de repetir; um Verifier que caiu por erro de API ganha mais uma tentativa.
const fresh = async (prompt, opts) =>
  (await agent(prompt, opts)) ?? (await agent(prompt, { ...opts, label: `${opts.label} (2ª tentativa)` }))

// A tlc-implement fecha o que o Verifier e as telas acharam, numa passada (build.md, "Then stop").
const fixFindings = (contexto, phaseTitle, label, verifier, screens) =>
  agent(
    contexto +
      `Invoque a skill tlc-implement (via Skill tool) e retome a feature "${feature}" a partir dos arquivos em ${featureDir}/. ` +
      'Você é o autor: o Verifier e o sub-agente de telas, agentes novos deste workflow, já devolveram os relatórios. ' +
      (verifier?.findings?.length
        ? `Achados do Verifier, também em ${featureDir}/verification.md: ${JSON.stringify(verifier.findings)}. `
        : '') +
      (screens?.differs?.length ? `Linhas differs das telas, também em ${featureDir}/screens.md: ${JSON.stringify(screens.differs)}. ` : '') +
      'Corrija tudo isso numa passada, como a skill manda, e commite cada correção. ' +
      'Um achado que mostra uma obrigação que nenhum check cobre ganha um check com teste (regra 4). ' +
      'Rode `check_proofs.py <feature>` até ficar verde e escreva em `Closed` de cada achado do verification.md o commit que o fecha e o check que agora o prova. ' +
      'Quando a correção mudou código e a feature tem telas, salve de novo cada `<capture>.running.png` no HEAD novo; ' +
      'não julgue as telas você mesmo: o workflow manda o round 2. ' +
      'Não rode validate_verification.py: o gate é de uma etapa seguinte. ' +
      scripts,
    { label, phase: phaseTitle, model: 'opus', schema: FIX_SCHEMA },
  )

let screensRound = 0
let head = impl.head
const unverified = []

// Uma rodada de verificação: Verifier e/ou telas em paralelo no mesmo HEAD, depois o autor
// fecha o que eles acharam, depois o round 2 das telas se o código mudou e ainda há round.
// Devolve o HEAD final; `fixContext` é o prefixo do prompt do autor (autorização de push ou não).
const verifyRound = async ({ phaseTitle, fixPhase, labelPrefix, range, newChecks, withVerifier, withScreens, fixContext }) => {
  const wantScreens = withScreens && impl.screens_owed && screensRound < 2
  const [verifier, screens] = await parallel([
    () =>
      withVerifier
        ? fresh(verifierPrompt(range, newChecks), {
            label: `${labelPrefix}verifier`,
            phase: phaseTitle,
            model: 'opus',
            schema: VERIFIER_SCHEMA,
          })
        : Promise.resolve(null),
    () =>
      wantScreens
        ? fresh(screensPrompt(screensRound + 1), {
            label: `${labelPrefix}screens-r${screensRound + 1}`,
            phase: phaseTitle,
            model: 'opus',
            schema: SCREENS_SCHEMA,
          })
        : Promise.resolve(null),
  ])
  if (withVerifier && !verifier) {
    unverified.push(newChecks ? newChecks.join(', ') : 'todos os checks')
    log(`⚠️ O Verifier não concluiu em duas tentativas (${range}); o gate vai acusar e o PR fica draft.`)
  } else if (verifier) {
    log(`Verifier: ${verifier.verdict}, ${verifier.findings.length} achado(s) em ${verifier.head}`)
  }
  if (screens) {
    screensRound = screens.round
    log(`Telas, round ${screens.round}: ${screens.diverges ? `${screens.differs.length} linha(s) differs` : 'matches'}`)
  } else if (wantScreens) {
    log('⚠️ O sub-agente de telas não concluiu em duas tentativas; o gate vai acusar falta de screens.md.')
  }

  const open = (verifier?.findings?.length ?? 0) + (screens?.differs?.length ?? 0)
  if (!open) return verifier?.head ?? head

  if (fixPhase !== phaseTitle) phase(fixPhase)
  const fix = await fixFindings(fixContext, fixPhase, `${labelPrefix}fix`, verifier, screens)
  if (!fix) {
    log(`⚠️ O fechamento dos achados não concluiu: ${open} item(ns) abertos em ${featureDir}/.`)
    return head
  }
  log(`Achados fechados: ${fix.closed.length}, check_proofs.py ${fix.proofs_green ? 'verde' : 'vermelho'} em ${fix.head}`)

  // O round 2 julga o HEAD novo quando o código mudou, mesmo sem linha differs no round 1.
  if (fix.code_changed && screensRound === 1) {
    const r2 = await fresh(screensPrompt(2), {
      label: `${labelPrefix}screens-r2`,
      phase: fixPhase,
      model: 'opus',
      schema: SCREENS_SCHEMA,
    })
    if (r2) {
      screensRound = 2
      if (r2.diverges) log(`⚠️ Telas, round 2 (o último): ${r2.differs.length} linha(s) ainda differs; a revisão vai para o usuário.`)
    } else {
      log('⚠️ O round 2 das telas não concluiu; o gate vai acusar que o código mudou depois do HEAD julgado.')
    }
  } else if (fix.code_changed && screensRound === 2 && impl.screens_owed) {
    log('⚠️ O código mudou depois do round 2 das telas: não há round 3, a revisão das telas vai para o usuário.')
  }
  return fix.head
}

// ── Etapas 2 e 3: Verify e Verify Fixes ────────────────────────────────────────────────────
// Sem proofs verdes o Verifier não tem o que julgar: verify.md manda o autor corrigir antes.
// O PR sai como draft com a saída do gate.
if (impl.status === 'built') {
  phase('Verify')
  head = await verifyRound({
    phaseTitle: 'Verify',
    fixPhase: 'Verify Fixes',
    labelPrefix: '',
    range: `${impl.base_sha}..HEAD`,
    newChecks: null,
    withVerifier: true,
    withScreens: true,
    fixContext:
      'Você executa a etapa "Verify Fixes" do workflow tlc-dev-flow, que o usuário pediu para rodar sobre o plano aprovado em ' +
      `${planPath}, na branch ${impl.branch}. Faça só commits locais: o push é de uma etapa seguinte. `,
  })
} else {
  log(`⚠️ check_proofs.py vermelho em ${impl.head}: o Verifier não roda e o PR sai como draft.`)
}

// ── Etapa 4: PR ─────────────────────────────────────────────────────────────
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
    captures: { type: 'string', description: 'Capturas publicadas no corpo, ou por que o PR não leva capturas' },
  },
  required: ['pr_url', 'gate_ok', 'gate_last_line'],
}

const pr = await agent(
  contextoAutorizado('PR') +
    scripts +
    `Na raiz do repositório, rode \`validate_verification.py ${feature}\` e guarde a saída e o exit code. ` +
    `Faça push da branch ${impl.branch} e crie um PR dela para ${baseRef}, seguindo as convenções de PR do repositório ` +
    (issue ? `e referenciando a issue ${issue}. ` : 'sem referenciar issue. ') +
    `O corpo do PR é texto para quem revisa: resume a feature (resumo da implementação: ${impl.summary}) e cita o plano ${planPath}. ` +
    'Com o exit code 0, o resultado do gate volta só em gate_last_line; com outro exit code, crie o PR como draft e coloque a saída inteira do script no corpo. ' +
    'Se as convenções de PR do repositório pedem capturas de tela e o diff muda a interface, gere e publique as capturas como elas mandam e ponha-as no corpo. ' +
    (unverified.length
      ? `Diga no corpo que o Verifier independente não concluiu (${unverified.join('; ')}) e que por isso o gate está vermelho. `
      : ''),
  { label: 'pr', phase: 'PR', model: 'sonnet', schema: PR_SCHEMA },
)
if (!pr?.pr_url) throw new Error('A etapa PR não retornou o link do PR.')
log(`PR criado: ${pr.pr_url}`)
if (pr.captures) log(`Capturas: ${pr.captures}`)
if (!pr.gate_ok) {
  log(`⚠️ Gate vermelho: ${pr.gate_last_line}. PR aberto como draft; o code review não roda sobre trabalho incompleto.`)
  return { pr_url: pr.pr_url, implement: impl, verified_head: head, unverified, gate: pr }
}

// ── Etapa 5: Code Review ────────────────────────────────────────────────────
// O plano vai direto para o code-review-flow, sem a busca "auto": o path já é conhecido.
phase('Code Review')

const review = await workflow('code-review-flow', {
  pr: pr.pr_url,
  issue,
  plan: planPath,
  called_by: 'tlc-dev-flow',
})
const finalReport = review.final_review?.markdown_path

// ── Etapa 6: PR Fixes ───────────────────────────────────────────────────────
// A tlc-implement retoma a mesma feature: o ciclo dela para achados do Verifier serve para
// os achados do code review. A tlc-plan não roda aqui, porque ela para à espera da aprovação
// do usuário. O "There is no second Verifier" do verify.md não vale para os checks que esta
// etapa acrescenta: nenhum Verifier os julgou, e o gate exige uma linha de cada um em
// `## Checks`. Eles vão para a etapa Re-verify.
const headBeforeFixes = head
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
    'Se uma correção muda uma tela que aparece nas capturas do corpo do PR, publique capturas novas como as convenções de PR do repositório mandam e atualize o corpo. ' +
    'Quando uma correção muda código e a feature tem telas, salve de novo cada `<capture>.running.png` no HEAD novo, sem julgá-las. ' +
    'Não escreva no verification.md nem no screens.md, e não julgue os checks novos: uma etapa seguinte manda um Verifier novo para eles. ' +
    scripts,
  {
    label: 'pr-fixes',
    phase: 'PR Fixes',
    model: 'opus',
    schema: {
      type: 'object',
      properties: {
        applied: { type: 'array', items: { type: 'string' }, description: 'Correções aplicadas' },
        checks_added: { type: 'array', items: { type: 'string' }, description: 'Só os IDs dos checks acrescentados em checks.md (ex.: "C42"), ou vazio' },
        rejected: { type: 'array', items: { type: 'string' }, description: 'Itens não aplicados e o motivo' },
        code_changed: { type: 'boolean', description: 'true quando algum commit desta etapa mudou código fora de .specs/' },
        head: { type: 'string', description: 'SHA curto do HEAD final' },
        summary: { type: 'string', description: 'Resumo do ciclo de correção' },
      },
      required: ['checks_added', 'code_changed', 'head', 'summary'],
    },
  },
)
if (!fixes) log(`⚠️ Etapa PR Fixes não concluiu (bloqueio ou erro) — aplicar manualmente as correções de ${finalReport ?? review.consolidated_report}.`)

// ── Etapa 7: Re-verify ──────────────────────────────────────────────────────
// Um Verifier novo julga só os checks que a PR Fixes acrescentou, no intervalo que ela
// commitou. As telas têm round 2 quando a PR Fixes mudou código e o round 2 ainda não rodou.
if (fixes) {
  head = fixes.head
  const added = fixes.checks_added ?? []
  const screensAgain = impl.screens_owed && fixes.code_changed && screensRound === 1
  if (added.length || screensAgain) {
    phase('Re-verify')
    head = await verifyRound({
      phaseTitle: 'Re-verify',
      fixPhase: 'Re-verify',
      labelPrefix: 're-',
      range: `${headBeforeFixes}..HEAD`,
      newChecks: added,
      withVerifier: added.length > 0,
      withScreens: screensAgain,
      fixContext: contextoAutorizado('Re-verify', pr.pr_url) + `Ao final, faça push para a branch ${impl.branch}. `,
    })
  } else if (impl.screens_owed && fixes.code_changed && screensRound === 2) {
    log('⚠️ A PR Fixes mudou código depois do round 2 das telas: não há round 3, a revisão das telas vai para o usuário.')
  }
}

// ── Etapa 8: Docs Audit ─────────────────────────────────────────────────────
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

// ── Etapa 9: Gate ───────────────────────────────────────────────────────────
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
    'diga no comentário que a revisão das telas vai para o usuário. ' +
    (unverified.length
      ? `Diga também no comentário que o Verifier independente não concluiu para: ${unverified.join('; ')}. `
      : '') +
    'Com os dois scripts em 0, transforme cada achado do verification.md numa lição com `lessons.py`, como ' +
    '<skill-dir>/references/memory.md manda; uma feature sem achado não registra nada.',
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
  verified_head: head,
  unverified,
  code_review: review,
  fixes,
  docs_audit: docsAudit,
  gate,
}

export const meta = {
  name: 'tlc-code-review-flow',
  description: 'Atalho do code-review-flow para PRs feitos com tlc-spec-lean: os 5 revisores leem o plano da feature (.specs/features/*/plan.md) e a issue do PR',
  whenToUse:
    'Quando quiser revisar um PR cuja feature tem plano tlc-spec-lean, sem implementar nada. Sem plano, use code-review-flow. ' +
    'Uso: Workflow({name: "tlc-code-review-flow", args: {pr: "<PR url ou número>", plan: "<path do plan.md>", issue: "<ID da issue>"}}). ' +
    'Só pr é obrigatório: sem plan, o plano é procurado em .specs/features/*/plan.md pelo ID da issue; sem issue, o ID é procurado no PR.',
  phases: [
    { title: 'Code Review', detail: 'roda o code-review-flow com o plano da feature (informado ou localizado em .specs/) e a issue do PR' },
  ],
}

// Atalho: o code-review-flow faz a revisão inteira; este script só garante que ela
// tenha o plano da feature. O input é {pr, plan?, issue?} (ou o PR como string):
// - plan: path do plan.md da feature. Sem ele, o Setup do code-review-flow procura
//   em .specs/features/*/plan.md pelo ID da issue (plan: "auto").
// - issue: ID da issue do PR (ex.: "DEV-322"). Sem ele, o Setup procura no PR.
// O aninhamento de workflow() é de um nível, então este atalho não roda dentro de
// outro workflow: lá, chame o code-review-flow com plan: "auto".
const input = typeof args === 'string' ? { pr: args } : args ?? {}
const pr = String(input.pr ?? '').trim()
if (!pr) {
  throw new Error(
    'Informe o PR a revisar em args, ex.: args: {pr: "https://github.com/org/repo/pull/123", plan: ".specs/features/minha-feature/plan.md", issue: "DEV-322"}',
  )
}
const plan = String(input.plan ?? '').trim()
const issue = String(input.issue ?? '').trim()
if (!plan) log('Plano não informado: o Setup vai procurá-lo em .specs/features/*/plan.md pelo ID da issue.')

phase('Code Review')
return await workflow('code-review-flow', { pr, issue, plan: plan || 'auto', called_by: 'tlc-code-review-flow' })

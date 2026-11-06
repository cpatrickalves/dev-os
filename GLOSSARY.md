# Dev-OS

Skills, agentes e workflows que levam uma feature do plano ao PR revisado.

## Language

**Plano aprovado**:
Um `.specs/features/<feature>/plan.md` escrito pela tlc-plan, com a linha `**Approved**` nas palavras do usuário e sem pergunta `blocks` em aberto.
_Avoid_: spec, design doc

**Gate de conclusão**:
O estado em que `validate_verification.py` sai com 0 e `proofs.md` está verde no HEAD atual.
_Avoid_: done, testes passando

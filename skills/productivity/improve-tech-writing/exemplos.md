# Exemplos antes/depois

Catálogo de reescritas reais com a regra aplicada. Use para calibrar o tom esperado.

---

## Regra 1 — Metáfora econômica

**Antes:**

> PR1 paga upfront o custo de 4 tabelas + helpers que ninguém ainda chama. Esse pagamento upfront é o que torna B2-B5 (signup, login, password recovery, SMTP) tratáveis sem revisitar a foundation.

**Depois:**

> O PR1 cria 4 tabelas e helpers que ainda não têm chamador. Esse trabalho adiantado é o que permite implementar signup, login, recuperação de senha e SMTP (PRs B2 a B5) sem mexer na base de novo.

**Por quê.** "Paga upfront o custo" e "pagamento upfront" são metáforas econômicas que substituem o verbo direto ("cria", "adiciona"). Em vez de esclarecer, fazem o leitor decodificar antes de entender.

---

## Regra 4 — Antropomorfismo

**Antes:**

> O risco material é o oposto: PR1 que se entusiasme e quebre Logto (a base produtiva atual) por refactor lateral.

**Depois:**

> O risco real é o oposto: o autor extrapolar o escopo e quebrar o Logto, que ainda é a auth de produção, ao mexer em código adjacente.

**Por quê.** PR não se entusiasma. O sujeito real é o autor; a metáfora esconde isso. "Refactor lateral" também não é termo padrão — o leitor precisa adivinhar.

---

## Regra 5 — Parênteses-compostagem

**Antes:**

> Pilar técnico **dormente** da migração Logto → auth nativo (ADR-0017). Adiciona, sem ativar nenhum fluxo: helpers de hash e JWT (`app/core/security.py` com `pwdlib` Argon2id + PyJWT HS256 `algorithms=["HS256"]` explícito + `secrets.token_urlsafe(48)` para opaque tokens), quatro modelos SQLAlchemy 2.0 async (`refresh_tokens`, `email_verifications`, `password_resets`, `audit_logs`), uma migration aditiva única, repositórios CRUD assíncronos como funções livres, e um filter loguru que mascara token/senha em qualquer log estruturado.

**Depois:**

> Primeiro passo, dormente, da migração Logto → auth nativo (ADR-0017). Esta PR adiciona as peças que B2-B5 vão precisar, mas nenhuma é chamada ainda:
> - helpers de hash, JWT e geração de token opaco em `app/core/security.py`;
> - quatro modelos SQLAlchemy (`refresh_tokens`, `email_verifications`, `password_resets`, `audit_logs`) com uma migration aditiva;
> - repositórios CRUD para cada um;
> - um filter no loguru que mascara senha e token em qualquer log.

Detalhes técnicos (`pwdlib` Argon2id, `algorithms=["HS256"]` literal, `secrets.token_urlsafe(48)`) descem para a seção de Requirements.

**Por quê.** O parêntese após "helpers de hash e JWT" tinha 5 detalhes técnicos colados. Quando o leitor chega no fim, perdeu o fio. Bullets + descer detalhes pra onde o leitor procura por eles.

---

## Regra 2 + 7 — Anglicismo e bold performático

**Antes:**

> qualquer filter precisa fluir por esse path. Sink separado quebraria idempotência.
> torna trivial para o reviewer verificar que joserfc não foi tocado, e prepara o terreno para o cutover da PR4 que deleta `core/auth/` inteiro.

**Depois:**

> qualquer filter precisa passar por esse caminho. Adicionar um sink separado quebraria a idempotência.
> deixa óbvio para quem revisa que o `joserfc` continua intacto, e simplifica a remoção do `core/auth/` na PR4.

**Por quê.** "Fluir por esse path", "prepara o terreno", "cutover" — anglicismos + clichês que somam ruído sem ganho de precisão.

---

## Regra 7 — Bold como sinalizador de atenção

**Antes:**

> **Importante** — prova que o índice está correto na migration (assertiva de defesa).
> **Zero comportamental**.
> **Zero**. `pytest -k logto` verde, `dependencies/auth.py` byte-idêntico…

**Depois:**

> Este teste prova que o índice está correto na migration.
> Sem mudança comportamental.
> Logto continua funcionando: `pytest -k logto` passa, `dependencies/auth.py` não foi modificado.

**Por quê.** Se a estrutura da frase já diz "isto é importante", o bold é redundante. "Byte-idêntico" é hipérbole técnica — o que importa é "não foi modificado".

---

## Regra 8 — Justificativa defensiva

**Antes:**

> **KD6.** `JWT_SECRET_KEY: str | None = None` sem whitelist em prod/staging.
> **Decisão.** Em `app/core/config.py`, adicionar `JWT_SECRET_KEY: str | None = None`. **Não** adicionar regra `@model_validator`.
> **Rationale.** PR1 é dormente — nenhum chamador de produção invoca `create_access_token` ainda. (...)
> **Trade-off.** Aceita-se o risco minúsculo de alguém adicionar um chamador entre PR1 e PR4 sem secret configurado — mitigado pelo fail-loud no helper.

**Depois:**

> `JWT_SECRET_KEY: str | None = None` em `app/core/config.py`, sem validator que exija o secret em prod/staging.
>
> A whitelist `prod/staging` entra na PR4, junto com o cutover de `dependencies/auth.py`. Até lá, nenhum chamador de produção existe — se alguém adicionar um sem o secret configurado, o helper levanta `RuntimeError` no primeiro uso.

**Por quê.** A estrutura "Decisão / Rationale / Trade-off" cria um tom de tribunal — cada decisão é argumentada como se enfrentasse um questionamento. Quando alinha com o default, a defesa antecipada triplica o tamanho e sugere fragilidade. Anuncie a decisão e o seu gatilho de mudança; só justifique se contraria convenção do projeto.

---

## Regra 10 — Tabela usada como prosa

**Antes:**

> | `JWT_SECRET_KEY=None` em staging por configuração errada | Baixa em PR1, Alta em PR4 | PR1: nenhum chamador → `RuntimeError` no único path que chamaria. PR4 introduz whitelist. Documentar em `docs/04-guias/configuracao.md` quando PR4 for cutar. |

**Depois (vira parágrafo direto):**

> Se `JWT_SECRET_KEY` estiver vazio em staging por erro de configuração, na PR1 o impacto é zero (sem chamador). Na PR4, quando o cutover acontece, a whitelist em `config.py` previne. Documentar no guia de configuração junto com o cutover.

**Por quê.** Tabela é pra dados comparáveis em ≤10 palavras por célula. Quando uma célula vira microparágrafo, o olho não consegue mais varrer a coluna — vira prosa quebrada em colunas, perdendo as duas vantagens (varredura visual e fluxo).

---

## Regra 11 — Negação como modo padrão

**Antes:**

> Não há teste exercitando `family_id` nesta PR (não há rotação ainda).
> **NÃO** test-first aqui — alembic autogenerate é a fonte; teste é smoke up/down.

**Depois:**

> O teste de `family_id` entra na PR3, com a rotação.
> Aqui o alembic autogenerate é a fonte; o teste é só smoke up/down.

**Por quê.** Negação cabe quando contradiz expectativa real. "Não fazer test-first" comunica algo se a convenção do projeto fosse test-first — mas como afirmação isolada, força o leitor a montar o positivo por subtração.

---

## Quando *não* aplicar uma regra

- **Frases curtas demais para uma audiência técnica.** Se você está escrevendo para devs experientes e o tópico é denso, ~25 palavras por frase é OK. Não force frases telegráficas só pela métrica.
- **Anglicismo que é nome de coisa.** `JWT`, `hash`, `webhook`, `endpoint`, `claim`, `token`, `header` — nomes consagrados ficam.
- **Negação quando contradiz expectativa real.** "**Não** dropar schema `logto`" faz sentido se a PR adjacente dropa. A regra 11 ataca a negação *gratuita*, não a negação *informativa*.
- **Bold em entradas de tabela / glossário.** O nome do termo em bold ajuda a varredura. A regra 7 ataca o bold *performático* ("Importante", "Atenção"), não o bold *estrutural*.

## Regra meta — Releia uma vez depois de pronto

Toda escrita densa é primeira-versão não-revisada. Antes de entregar:

1. Releia do começo ao fim.
2. Em cada frase, pergunte: "se eu cortar metade das palavras, perco informação?". Se não, corte.
3. Em cada parágrafo, pergunte: "qual a frase principal?". Se não souber responder, o parágrafo precisa ser quebrado.

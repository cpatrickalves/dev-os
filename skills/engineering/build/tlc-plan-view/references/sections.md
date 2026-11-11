# Sections of a tlc-plan plan

For each section of `plan.md`: the purpose line the page prints under the heading (copy it in the
plan's language), and what the explanation boxes in that section owe the reader.

| Section | Purpose line (pt) | Purpose line (en) |
| --- | --- | --- |
| Problem | O que está errado hoje, quem é afetado e quanto custa. A última frase diz o que muda para o usuário quando a entrega sair. | What is wrong today, who pays for it and what it costs. The last sentence says what changes for a user when this ships. |
| Criteria | O que o sistema precisa fazer, em critérios testáveis. Cada critério vira um teste na tlc-implement. | What the system must do, as testable criteria. Each one becomes a check in tlc-implement. |
| Shape | O caminho que a mudança percorre no código e o que ela altera no que já existe. | The path the change takes through the code and what it changes in what already exists. |
| Changes underneath | O que já existe e muda de comportamento: termos do domínio, dados gravados e quem lê esses dados. | What already exists and changes: domain terms, stored data and who reads that data. |
| Surface | As interfaces externas que mudam: rotas, entradas, saídas e quem pode chamar. | The external interfaces that change: routes, inputs, outputs and who may call them. |
| Landing | As decisões caras de desfazer, com o formato exato e a alternativa rejeitada. | The decisions that are expensive to reverse, with their exact shape and the alternative rejected. |
| Out of scope | O que fica fora desta entrega e por quê. | What this delivery leaves out, and why. |
| Assumptions | Decisões tomadas sem pergunta explícita. `n` significa que ninguém confirmou ainda. | Decisions taken without an explicit question. `n` means nobody has confirmed it yet. |
| Differences from the source | Onde o produto se afasta do design ou da captura de origem, com a decisão que aprovou cada diferença. | Where the product departs from the source design or capture, with the decision that approved each departure. |
| Sources | De onde vem cada informação do plano, e se ela obriga (binding) ou só informa. | Where each part of the plan comes from, and whether it binds or only informs. |

## What each explanation owes

**Criterion.** Say in plain words what a user or a caller observes when the criterion holds. Name
the EARS pattern only when it changes the meaning (`WHILE` is a state that must hold, `IF` is an
error path). Walk one example through the rule when the criterion has examples; when it has none
and the rule is abstract, give one and mark it inferred. Link the Shape step that implements it.

**Shape step.** Say what the module does today (from the plan's own words) and what this change
adds to it. `(exists)`, `(new)` and `(door N)` are markers of the plan; explain them once, in the
section's first box.

**Landing door.** Say what becomes hard to change once it ships and why the rejected alternative
lost, in one sentence each. Say what a reviewer should check: usually whether the literal shape is
the one they want to live with.

**Assumption.** Say what was assumed, what happens if it is wrong, and whether a human confirmed it
(`y`) or not (`n`). Every `n` row is also a pending decision at the end of the page.

**Table box** (Changes underneath, Out of scope, Sources, Surface). One box under the whole table:
what the table is for and the row a reviewer should look at first, with the reason.

## Attention points

An attention point is something in the plan that does not add up, found by reading the plan
against itself. Look for:

- a cross-reference that points at the wrong item (a row naming "critério 21" for a behaviour
  criterion 15 creates);
- a reader in `Changes underneath` with neither a criterion nor an `Out of scope` row;
- a sentence of `Problem` that no criterion covers;
- a criterion with no concrete value, or one that no single run can settle;
- a door in `Landing` that no criterion or Shape step uses;
- an `Assumptions` row with `y` whose rationale does not quote a person.

Each one names the passages it compares, with links to both, and says what to ask the planner.
Write none when none is found: an invented problem costs the reviewer more than a missed one.

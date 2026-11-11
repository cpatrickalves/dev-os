# Plano de migração para o Postgres 17

## Objetivos

- Atualizar o banco de produção do Postgres 14 para o 17 sem perder dados.
- Manter a janela de indisponibilidade abaixo de 15 minutos.

## Etapas

1. Subir uma réplica lógica no Postgres 17.
2. Validar contagens de linhas por tabela entre origem e réplica.
3. Congelar escritas, promover a réplica e trocar a string de conexão.
4. Monitorar erros por 48 horas e desligar o banco antigo.

## Riscos

| Risco | Mitigação |
| --- | --- |
| Extensões sem versão para o 17 | Testar `pg_trgm` e `postgis` na réplica antes |
| Sequências dessincronizadas | Rodar `setval` para cada sequência após a promoção |

## Responsáveis

- Infra: Ana
- Aplicação: Bruno

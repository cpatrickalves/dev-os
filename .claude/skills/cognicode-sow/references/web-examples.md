# Capabilities Web/Mobile — Exemplos Prontos

Este arquivo contém capabilities prontas para copiar em fases de projetos web/mobile tradicionais (sem componente AI/LLM). **Critérios de aceite são sempre objetivos e mensuráveis**, mesmo para capabilities "qualitativas" como UX.

Leia este arquivo SOMENTE quando o projeto for web/mobile tradicional. Para projetos AI/LLM, use `ai-examples.md`. Para projetos mix, use ambos.

## 1. Marketplace (bilateral: produtor/vendedor + consumidor)

Projetos típicos: Raízes Femininas, marketplaces de artesãos, B2B de insumos, plataformas de serviços.

### Fase fundacional (Núcleo técnico)

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Autenticação multi-perfil | Fluxos de cadastro, login, recuperação para cada perfil (ex: vendedor, comprador); RBAC configurado | Testes E2E (Playwright) |
| C-X.2 | Modelo de dados versionado | Schema completo com migrations reversíveis; cobertura das entidades transacionais (Pedido, Item, Pagamento, Endereço) | Revisão DDL + Alembic/Prisma migrate |
| C-X.3 | Armazenamento de mídias | Upload com limites configurados; geração de thumbnails; URLs assinadas | Testes de integração |
| C-X.4 | CI/CD + ambiente de homologação | Pipeline com lint, testes, build e deploy automático; URL de homologação acessível ao cliente | Pipeline verde + URL funcional |

### Fase painel do vendedor

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Cadastro completo de vendedor | Formulário multi-etapa com validações server-side; salvamento incremental | Testes E2E + validação com vendedor-piloto |
| C-X.2 | CRUD de produtos/serviços | Criar, editar, pausar, remover; suporte a categorias, variações, estoque, múltiplas imagens | Testes E2E + revisão funcional |
| C-X.3 | Gestão de pedidos | Listagem por status, mudança de status, notificações por e-mail | Testes E2E + envio real em staging |
| C-X.4 | Dashboard de métricas | Pedidos do período, faturamento, top produtos, estoque baixo | Revisão com dataset de teste |
| C-X.5 | Acessibilidade WCAG 2.1 AA | axe-core sem violações críticas; navegação por teclado funcional | axe-core CI + revisão manual |

### Fase storefront e checkout

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Storefront público SSR | Home, listagem por categoria, busca textual, página de produto; indexável (SSR + sitemap) | Lighthouse SEO ≥ 90 |
| C-X.2 | Carrinho e checkout | Fluxo completo; suporte a guest checkout se definido | Testes E2E + compra real em staging |
| C-X.3 | Integração com provedor de pagamento | Métodos definidos no Discovery operacionais; webhooks idempotentes | Testes com sandbox + revisão de logs |
| C-X.4 | Cálculo de frete | Integração com provedor ou frete fixo conforme ADR da Fase 0 | Testes de integração |
| C-X.5 | Performance p95 ≤ 2s | Lighthouse Performance ≥ 80 mobile nas páginas-chave | Lighthouse CI |

### Exclusões típicas de marketplace (adicionar em §4.2)

- Aplicativo mobile nativo — entrega é web responsivo + PWA.
- Gateway de pagamento próprio — integração com provedor comercial.
- Módulo de logística própria (tracking de entregadores, roteirização).
- Emissão de nota fiscal eletrônica — integração futura com emissor.
- Credenciamento jurídico dos vendedores (CNPJ, MEI, regularização fiscal).
- Programa de fidelidade, cupons, promoções condicionais.
- Chat em tempo real entre vendedor e comprador (versão inicial usa e-mail).
- Avaliação/reputação de vendedores (pode ser fase futura).
- Marketing digital, SEO avançado, campanhas pagas.
- Suporte a múltiplos idiomas.

### Premissas típicas de marketplace (adicionar em §6.1)

- Contratação e pagamento do provedor de pagamento, provedor de e-mail transacional e hospedagem são responsabilidade do cliente.
- Identidade visual (logo, cores, tipografia) fornecida até o início da Fase 2; ausência implica uso temporário de design system neutro.
- Vendedores/produtoras-piloto (mínimo 3) disponibilizados pelo cliente para sessões de validação.
- Base de dados inicial (categorias, regiões, configurações) fornecida pelo cliente no início da Fase 1.

## 2. Dashboard / Portal BI

Projetos típicos: BI para MaxxCard, dashboards operacionais, portais analíticos para gestores.

### Fase de ingestão e modelagem

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Pipeline de ingestão | Pipeline Kestra/Airflow rodando com schedule definido; monitoramento de falhas; retry automático | Logs + dashboard operacional |
| C-X.2 | Modelo dimensional no data warehouse | Schema star/snowflake documentado; dbt ou SQL versionado; testes de qualidade de dados | dbt test / Great Expectations |
| C-X.3 | Camada semântica | Métricas de negócio centralizadas (ex: Metabase models, dbt metrics); documentação de definições | Revisão de métricas com cliente |
| C-X.4 | Atualização incremental | Refresh incremental configurado; fresh data garantido conforme SLA (ex: D-1) | Monitoramento de freshness |

### Fase de visualização

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Dashboards principais | N dashboards cobrindo as N perguntas de negócio priorizadas no Discovery | Revisão com stakeholders |
| C-X.2 | Filtros e drill-down | Filtros dinâmicos (período, segmento, unidade); drill-down funcional em hierarquias definidas | Testes manuais + feedback de usuário |
| C-X.3 | Export e compartilhamento | Export CSV/XLSX em todos os dashboards; compartilhamento via link com controle de acesso | Testes E2E |
| C-X.4 | Performance de queries | Queries analíticas com p95 ≤ 5s em dataset de produção | Monitoramento de queries |
| C-X.5 | Governança de acesso | RBAC configurado; segregação por área/setor do cliente; logs de acesso auditáveis | Revisão de permissões + logs |

### Exclusões típicas de dashboard (adicionar em §4.2)

- Migração de relatórios legados — plataforma nasce com dashboards definidos no Discovery.
- Captura/coleta de dados não-disponíveis (fora dos sistemas-fonte mapeados).
- Dashboards ad-hoc solicitados após o TAP da fase correspondente — tratados via CR.
- Modelos preditivos / ML / forecasting — projeto separado.
- Integração com fontes de dados não identificadas no Discovery.
- Licenças comerciais de ferramentas (Metabase Pro, Tableau, etc.) — responsabilidade do cliente.

### Premissas típicas de dashboard (adicionar em §6.1)

- Acesso a todos os sistemas-fonte com credenciais de leitura fornecido pelo cliente em até 5 dias úteis.
- Volumetria dos sistemas-fonte compatível com a estratégia de ingestão definida no Discovery; aumentos substanciais exigem revisão da arquitetura.
- Qualidade mínima dos dados nos sistemas-fonte; limpeza profunda de dados legados fora do escopo sem aditivo.

## 3. SaaS / Plataforma multi-tenant

Projetos típicos: produtos próprios Cognicode, plataformas para vários clientes finais sob o mesmo software.

### Fase fundacional multi-tenant

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Estratégia de isolamento de tenants | Tenant isolation implementado conforme ADR (shared DB / schema por tenant / DB por tenant); testes de vazamento entre tenants | Testes de segurança + revisão |
| C-X.2 | Autenticação e autorização multi-tenant | Fluxo de onboarding de novo tenant funcional; usuários associados a tenant; RBAC por tenant | Testes E2E |
| C-X.3 | Billing / Planos | Planos configurados com limites (usuários, requisições, storage); enforcement funcional; integração com gateway de cobrança se aplicável | Testes + revisão manual |
| C-X.4 | Admin interno (backoffice) | Interface para operação da Cognicode: criar/suspender tenants, visualizar métricas, intervir em tickets | Revisão funcional |

### Exclusões típicas de SaaS (adicionar em §4.2)

- Compliance certificada (SOC 2, ISO 27001) — projeto separado com escopo próprio.
- Marketplace de integrações/plugins de terceiros.
- White-label total (customização profunda de UI por tenant) — versão inicial usa identidade única.
- Automação de onboarding self-service de ponta a ponta — versão inicial tem etapa de aprovação humana.

## 4. Portal corporativo / Site institucional com área logada

Projetos típicos: portais de órgãos públicos, áreas do cliente/beneficiário, sites institucionais com login.

### Fase pública (institucional)

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Site institucional SSR | Páginas institucionais (home, sobre, serviços, contato, notícias); Lighthouse SEO ≥ 90 | Lighthouse CI |
| C-X.2 | CMS headless para conteúdo editorial | Editores do cliente conseguem publicar notícias/páginas sem intervenção técnica | Validação com editor-piloto |
| C-X.3 | Acessibilidade WCAG 2.1 AA | axe-core sem violações críticas; conformidade com e-MAG se setor público | axe-core CI + auditoria manual |
| C-X.4 | Busca no conteúdo institucional | Busca textual funcional nas páginas e notícias publicadas | Testes E2E |

### Fase área logada

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Autenticação | Fluxos funcionais conforme ADR (SSO do órgão? login próprio? gov.br?) | Testes E2E |
| C-X.2 | Consulta de dados do usuário | Usuário logado visualiza seus próprios dados conforme casos de uso priorizados | Testes E2E + validação funcional |
| C-X.3 | Ações disponíveis | N ações priorizadas funcionais (ex: solicitar serviço, atualizar dados, acompanhar processo) | Testes E2E |
| C-X.4 | Notificações | E-mail transacional em eventos-chave; preferências de notificação gerenciáveis pelo usuário | Testes + envio real em staging |

### Exclusões típicas de portal (adicionar em §4.2)

- Integração com sistemas legados sem API — integrações requerem API documentada.
- Migração de conteúdo de portal antigo — cliente fornece conteúdo em formato estruturado ou migração fica em aditivo.
- Chat/atendimento online — fora do escopo inicial.
- Aplicativo mobile nativo — web responsivo apenas.
- Integração com gov.br, SSO corporativo, ADFS — ADR define qual é suportado; adicionais ficam em aditivo.

## 5. Mobile (React Native / Flutter)

Projetos típicos: app companion de plataforma web, app dedicado mobile-first.

### Fase base mobile

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Autenticação e deep linking | Login, logout, refresh de sessão, deep links funcionais em iOS e Android | Testes em dispositivo real |
| C-X.2 | Navegação e layout base | Estrutura de navegação (stack/tab/drawer) implementada; design system inicial | Revisão + screenshots em dispositivos-alvo |
| C-X.3 | Gestão de estado e cache offline | Dados essenciais disponíveis offline; sincronização ao voltar online | Testes de modo avião |
| C-X.4 | Push notifications | FCM/APNS configurados; recebimento funcional em iOS e Android | Envio real em staging |
| C-X.5 | Build e distribuição | Pipeline de build para TestFlight e Internal Testing (Google Play); cliente consegue instalar builds de homologação | Build executado com sucesso + distribuição verificada |

### Exclusões típicas de mobile (adicionar em §4.2)

- Publicação nas lojas (App Store Review, Google Play Review) — cliente é responsável pela submissão; Cognicode apoia com metadados.
- Assinatura de certificados e provisionamento Apple — requer conta Apple Developer do cliente.
- Versões para tablets/iPad/foldables — entrega é smartphone; outras telas em aditivo.
- Versões legadas de OS — suporte definido no Discovery (default: últimas 2 versões majors de iOS/Android).
- Acessibilidade nativa avançada (VoiceOver/TalkBack) — versão inicial cobre apenas casos de uso críticos.

### Premissas típicas de mobile (adicionar em §6.1)

- Cliente possui (ou providencia até o final da Fase 1) conta Apple Developer (US$ 99/ano) e Google Play Developer (US$ 25 único) em seu nome.
- Cliente é responsável pela submissão final nas lojas e comunicação com revisão das lojas.
- Backend já disponível ou entregue em fase paralela — app mobile consome API existente.

## 6. Notas gerais sobre projetos web/mobile tradicionais

### Fazer

- **Critérios objetivos mesmo em UX**: "Lighthouse Performance ≥ 80" em vez de "rápido"; "axe-core sem violações críticas" em vez de "acessível".
- **Validação com usuários reais** como instrumento em capabilities de UX: "revisão funcional com 3 vendedores-piloto".
- **Testes E2E (Playwright/Cypress)** como instrumento padrão para fluxos transacionais.
- **Lighthouse CI** no pipeline para garantir regressão de performance.
- **Provedores externos** (pagamento, e-mail, hospedagem) sempre como responsabilidade do cliente em RACI.

### Não fazer

- Não prometer "100% dos navegadores" — sempre delimitar (últimas N versões de Chrome/Edge/Firefox/Safari).
- Não deixar "responsivo" como critério de aceite — trocar por "funcional em breakpoints 360px, 768px, 1024px, 1440px validado em dispositivos reais".
- Não omitir PWA/acessibilidade como capabilities explícitas se o cliente espera isso — ficar no escopo implícito gera disputa.
- Não garantir SEO orgânico ("primeira página no Google") — apenas SEO técnico (SSR, sitemap, meta tags, Lighthouse SEO ≥ 90).
- Não incluir design/identidade visual como responsabilidade da Cognicode sem ressalva — se for incluído, virar capability própria com deliverable claro (ex: "C-X.X: Sistema de design com N componentes e guideline em Figma").

### Thresholds de referência para web/mobile

| Métrica | Conservador | Default | Ambicioso |
|---------|-------------|---------|-----------|
| Lighthouse Performance (mobile) | 70 | 80 | 90 |
| Lighthouse Performance (desktop) | 80 | 90 | 95 |
| Lighthouse SEO | 85 | 90 | 95 |
| Lighthouse Accessibility | 85 | 90 | 100 |
| p95 de páginas-chave | ≤ 3s | ≤ 2s | ≤ 1s |
| Uptime / SLA | 99% | 99,5% | 99,9% |
| Cobertura de testes unitários | 60% | 70% | 85% |
| axe-core violações críticas | 0 | 0 | 0 |

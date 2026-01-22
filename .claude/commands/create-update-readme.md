# Crie ou atualize o README.md do projeto

Crie ou atualize o conteúdo para um arquivo README.md file para este projeto. 

O README deve funcionar como ponto de entrada do projeto, não como documentação completa. Mantenha-o conciso e direcione para documentos mais detalhados quando necessário. READMEs muito longos desencorajam a leitura e dificultam a navegação

O README deve seguir a estrutura abaixo:
- Visão Geral: descrição geral do projeto, 1-3 parágrafos explicando o propósito, problema resolvido e principais benefícios.
- Funcionalidades: Principais funcionalidades do projeto
- Estrutura do Projeto: estrutura de arquivos e diretórios do projeto (pode ser obtida usando o comando: `tree -L 2 -I '*.pyc|__pycache__' `)
- Pré-requisitos: Principais dependências e requisitos do sistema com versões específicas
- Tecnologias utilizadas: Lista não exaustiva de tecnologias (stack) utilizadas, somente as principais
- Instalação: descreve o processo de instalação e execução do projeto
- Executando o projeto: Exemplo prático de como usar o projeto
- Observações e Restrições: liste qualquer restrição ou fato importante sobre este projeto
- Problemas Comuns que podem ocorrer
- Contato/Responsáveis: Informações para suporte e manutenção
- Responsáveis: descreve os responsáveis pelo projeto (pode ser obtido no arquivo pyproject.toml)

Formate todo o conteúdo e seções usando markdown.
Segue um <exemplo> de documentação.

<exemplo>
````
# DADO - Download Automático do Diário Oficial

## Visão Geral
DADO é um script desenvolvido para automatizar o download dos arquivos do Diário Oficial do Estado (DOE). Ele é executado em um ambiente orquestrado pelo [Prefect](https://prefect.sistemas.tce.pa/dashboard) e está agendado para rodar de segunda a sexta-feira, às 7:30 da manhã. O script verifica a disponibilidade dos DOEs e realiza o download dos arquivos pendentes, notificando a equipe responsável em caso de sucesso ou erro.

## Funcionalidades
* **Execução Automática**: Baixa diariamente os arquivos do Diário Oficial.
* **Agendamento**: Executa de segunda a sexta-feira às 7:30 da manhã.
* **Notificação**: Envia uma notificação para o canal do Slack #datascience quando o download é concluído ou ocorre um erro.

## Estrutura do Projeto
```bash
├── Dockerfile               # Arquivo de configuração para criação da imagem Docker do projeto.
├── files                    # Diretório onde os arquivos baixados serão armazenados.
├── poetry.lock              # Arquivo de bloqueio de dependências gerado pelo Poetry.
├── pyproject.toml           # Arquivo de configuração do Poetry, contendo as dependências e configurações do projeto.
├── README.md                # Documentação do projeto.
├── tce_utils/               # Utilitários gerais do projeto.
│   ├── notifications.py     # Funções para envio de notificações, como mensagens no Slack.
│   ├── security.py          # Funções relacionadas à segurança, como autenticação.
│   └── tools.py             # Ferramentas diversas utilizadas pelo projeto.
└── workflows/               # Fluxos de trabalho do projeto.
    ├── deploy.py            # Script para deploy do projeto.
    ├── download_doe         # Scripts específicos para o download do Diário Oficial.
    └── settings.py          # Configurações gerais do projeto.
```

## Pré-requisitos
- `Python 3.8+`
- `Poetry`: Gerenciador de dependências e ambientes virtuais.
* `Docker`: Utilizado para containerização do projeto.
- Acesso ao `Prefect Server`
- Webhook do `Slack`

## Stack principal
* `Prefect`: Plataforma de orquestração de fluxos de trabalho.
* `Slack SDK`: Utilizada para envio de notificações.

## Observações e Restrições
* O script só executa de segunda a sexta-feira.
* A verificação de disponibilidade do DOE é feita até as 13:00.
* Em caso de falha, o script tenta novamente no próximo dia útil.

## Instalação e Configuração
Para instalar e configurar o projeto, siga os passos abaixo:

1. Clone o repositório
2. Configure as variáveis de ambiente: copie `.env.example` para `.env` e preencha as variável obrigatórias no arquivo `.env`
3. Instale as dependências utilizando o Poetry:
    ```sh
    poetry install
    ```
### Como usar
Para executar o script manualmente, utilize o comando:
    ```sh
    poetry run python workflows/download_doe/flow.py
    ```

> Este foi workflow instalado no [Prefect Server](https://prefect3.sistemas.tce.pa/) para execução automática: 

# Responsáveis
- **Patrick Alves** - patrick.alves@tce.pa.gov.br
- **Jaisson** - jaisson.penante@tcepa.tc.br
````
</exemplo>
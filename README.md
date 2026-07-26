# opencode-config

Configuração global, privada e reproduzível do OpenCode.

O diretório `config/` é a fonte de verdade e deve ser ligado a
`~/.config/opencode`. Assim, alterações feitas na configuração global aparecem
imediatamente no Git.

## Visão geral

| Componente | Função | Dependência externa |
| --- | --- | --- |
| OpenCode `1.18.5` | TUI e runtime principal | Node.js/npm |
| 9Router | Gateway local para Claude, GPT e Kimi | Serviço em `127.0.0.1:20128` |
| GPT-OSS 20B | Modelo do agente Plan e compressor de memória | `OPENROUTER_API_KEY` e internet |
| Prompt Enhancer | Melhora prompts via Qwen antes do modelo principal | `OPENROUTER_API_KEY` e internet |
| claude-mem `13.12.4` | Memória entre sessões | Bun, OpenRouter e worker em `127.0.0.1:37778` |
| Graphify `0.9.26` | Grafo navegável de cada codebase | `uv` e runtime Python |
| codebase-memory-mcp `0.9.0` | Índice estrutural MCP com atualização automática | Node.js/npm |
| Project Docs | Scaffold e auditoria assíncrona de `.docs/` | 9Router |
| Caveman/Ponytail | Concisão e política de implementação | Dependências Bun/npm |

Versões ficam pinadas em `.opencode-version`, `.graphify-version`,
`.claude-mem-version`, `.codebase-memory-mcp-version`, `mise.toml`,
`config/package.json` e `config/bun.lock`.

## Pré-requisitos

### Obrigatórios

- Git.
- Node.js com `npm`. A versão recomendada é `24.9.0`, registrada em
  `mise.toml`.
- Acesso à internet para instalar pacotes e chamar o OpenRouter.
- Uma chave OpenRouter válida em `OPENROUTER_API_KEY`. Ela é usada pelo agente
  Plan, pelo Prompt Enhancer e pelo compressor do claude-mem.
- 9Router instalado e com as contas desejadas configuradas. Todos os modelos
  principais dependem do gateway local em `http://127.0.0.1:20128/v1`.

### Python, uv e Graphify

Graphify é um pacote Python instalado como ferramenta isolada pelo `uv`.
Existem duas formas suportadas de preparar esse runtime:

1. Instalar [mise](https://mise.jdx.dev/) e executar `mise install` na raiz.
   Isso instala Node, Bun, uv e OpenCode nas versões registradas.
2. Instalar Python `3.10+` manualmente, garantindo que `python` no Windows ou
   `python3` em Linux/macOS esteja no `PATH`. Se `uv` estiver ausente, o script
   de integração o instala com `pip` e depois instala
   `graphifyy==0.9.26`.

Python não é instalado automaticamente pelo `install.ps1` ou `install.sh`.
Quando `uv` já está disponível, ele administra o ambiente isolado usado pelo
Graphify.

Extração AST de código não exige chave de LLM:

```bash
graphify . --code-only
```

Uma execução headless de `graphify .` que inclua Markdown, PDFs ou imagens
precisa de um backend semântico. O caminho recomendado é definir
`GEMINI_API_KEY` ou `GOOGLE_API_KEY`; a skill do OpenCode também pode coordenar
a extração pelo próprio host. Essa chave é opcional para código puro e nunca
deve entrar neste repositório.

### 9Router

O plugin de autostart atual procura o CLI no caminho Windows
`E:\minima\MerlinRouter\node_modules\9router\cli.js`. Em outra máquina, faça
uma destas ações antes de abrir o OpenCode:

- instale o MerlinRouter nesse caminho;
- ajuste `ROUTER_DIR` em `config/plugins/9router-autostart.mjs`; ou
- inicie o 9Router manualmente em `127.0.0.1:20128`.

Em Linux, macOS e WSL, o caminho Windows não funciona; o 9Router precisa ser
iniciado separadamente ou o plugin precisa ser adaptado para o caminho local.
O instalador deste repositório não instala nem autentica o 9Router.

### Credencial OpenRouter

Defina a chave antes de executar o instalador. No Windows:

```powershell
$env:OPENROUTER_API_KEY = "<sua-chave>"
[Environment]::SetEnvironmentVariable(
    "OPENROUTER_API_KEY",
    $env:OPENROUTER_API_KEY,
    [EnvironmentVariableTarget]::User
)
```

Em Linux, macOS ou WSL:

```bash
export OPENROUTER_API_KEY="<sua-chave>"
```

Persista a variável pelo gerenciador de segredos ou configuração privada do
shell. O setup copia a chave para `~/.claude-mem/.env`, com permissão restrita,
porque o worker do claude-mem não lê a variável do processo em todos os fluxos.
Esse arquivo continua fora do Git.

## O que fica versionado

- `opencode.json` e `tui.json`
- regras globais em `AGENTS.md`
- agentes, comandos, skills, plugins, tools e temas
- dependências e versões de plugins em `package.json` e `bun.lock`
- versão do OpenCode em `.opencode-version` e `mise.toml`
- política BYPASS reproduzível em `bypass-permissions.json`
- scripts de instalação e atualização

## O que nunca entra no Git

Credenciais, tokens, logs, sessões e dados de projetos ficam em
`~/.local/share/opencode/`. O OpenCode salva autenticação em
`~/.local/share/opencode/auth.json`, fora do link deste repositório.

Não coloque chaves diretamente em `opencode.json`. Use `opencode auth login`,
variáveis de ambiente ou um arquivo local ignorado pelo Git.

## Modo BYPASS / YOLO

Esta configuração combina três camadas para evitar solicitações de aprovação:

1. Todas as permissões conhecidas estão explicitamente definidas como `allow`
   em `config/opencode.json`, incluindo `external_directory`, leitura, shell,
   edição e `doom_loop`.
2. No Windows, `install.ps1` persiste `OPENCODE_PERMISSION` no ambiente do
   usuário. Essa sobrescrita é carregada depois das configurações de projeto.
3. O atalho `OpenCode Administrador` inicia a TUI com `--auto`, aprovando
   automaticamente qualquer solicitação residual que não esteja negada.

`bypass-permissions.json` inclui um wildcard final adicional para que
permissões de plugins e ferramentas futuras também sejam liberadas.

Este modo permite comandos destrutivos, acesso fora do projeto e leitura de
arquivos como `.env` sem confirmação.

## Caveman Ultra obrigatório

O Caveman de [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
está instalado globalmente no OpenCode e travado em `ultra`.

A trava possui três camadas:

1. `config/AGENTS.md` torna Ultra obrigatório em toda sessão.
2. O plugin grava `ultra` ao carregar, criar sessão, receber cada prompt e
   montar cada system prompt.
3. `CAVEMAN_DEFAULT_MODE=ultra` é persistido no ambiente do usuário pelos
   scripts Windows.

Comandos ou prompts como `/caveman off`, `/caveman lite`, `stop caveman` e
`normal mode` são ignorados. Configurações locais de projeto também não podem
rebaixar o modo. A clareza de avisos de segurança e ações irreversíveis continua
obrigatória, sem alterar o estado Ultra.

## Ponytail Ultra obrigatório

O Ponytail de
[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) está
instalado como dependência pinada e travado globalmente no nível máximo
oficial, `ultra`.

O wrapper `config/plugins/ponytail-lock.mjs` preserva skills e comandos
oficiais, mas regrava `ultra` ao carregar o plugin, criar sessão, receber
prompt e montar o system prompt. `PONYTAIL_DEFAULT_MODE=ultra` também é
persistido no ambiente do usuário. Comandos e regras locais tentando usar
`off`, `lite`, `full`, `review` ou `normal mode` são ignorados.

Ponytail governa a implementação (YAGNI, reuso e menor mudança correta);
Caveman governa a concisão da resposta. Nenhum deles reduz validação,
segurança, prevenção de perda de dados ou requisitos explicitamente mantidos.

## Prompt enhancer inicial

A skill global `prompt-enhancer` e o plugin `prompt-enhancer-hook.mjs` melhoram
automaticamente cada prompt humano da sessão raiz antes da chamada ao modelo
principal. O texto original continua visível e intacto no histórico; uma cópia
em inglês, mais clara e fiel, é guardada nos metadados da mensagem e usada
somente na visão enviada ao modelo.

O enhancer considera apenas a mensagem atual e nomes/tipos MIME de anexos. Ele
preserva intenção, escopo, permissões, restrições, exemplos, código, comandos,
caminhos, URLs, identificadores, números e o idioma solicitado para a resposta.
Prompts simples continuam curtos; prompts complexos só recebem estrutura quando
ela melhora a compreensão.

O enhancer chama diretamente
`https://openrouter.ai/api/v1/chat/completions` com
`qwen/qwen3.6-35b-a3b:nitro`. Ele não cria sessão ou agente filho do OpenCode,
não entra na fila de workspace e não faz seleção, corrida paralela ou fallback.
A rota usa reasoning desativado, temperatura `0`, top-p `0.8` e nenhuma
ferramenta. A saída é texto puro validado localmente. A credencial vem de
`OPENROUTER_API_KEY`, fora deste Git.

Cada tentativa do enhancer tem teto de rede de 5 segundos e circuit breaker. Timeout,
rede, `429`
e erros de servidor iniciam backoff exponencial de 60 segundos até 15 minutos.
Crédito, quota, billing e autorização iniciam em 15 minutos e chegam a 6
horas. `Retry-After` do provider é respeitado. Durante cooldown, o modelo é
pulado imediatamente; depois dele, uma única tentativa half-open verifica a
recuperação. Falha envia o prompt original e mostra aviso deduplicado. Os
agentes internos não possuem permissão para ferramentas. Nenhum segundo
modelo é tentado na mesma mensagem.

Quando um modelo Claude é selecionado como modelo principal, o mesmo endpoint
é consultado antes do envio. Se o 9router já marcou a conta Claude como
indisponível, o OpenCode troca imediatamente para GPT 5.6 Sol em `low`, sem
fazer uma chamada Claude condenada a `429` e sem aguardar timeout.

Use `!raw ` no início para desativar o enhancer em uma mensagem. O marcador
permanece no histórico visível, mas o modelo recebe somente o conteúdo depois
dele. Prompts de sessões filhas, comandos, mensagens sintéticas e mensagens
somente com imagem são ignorados.

## Graphify como mapa oficial da codebase

O [Graphify](https://github.com/Graphify-Labs/graphify) está instalado no
nível do usuário pela distribuição oficial `graphifyy`, pinada em
`.graphify-version`. A skill global fica em `config/skills/graphify/`.

Regras globais e o plugin `config/plugins/graphify.js` tornam o fluxo
query-first obrigatório para exploração não trivial:

- `graphify query "<pergunta>"` antes de grep/leitura ampla;
- `graphify path "<A>" "<B>"` para relações;
- `graphify explain "<conceito>"` para contexto focalizado;
- `graphify update .` depois de mudanças quando já existe `graphify-out/`.

Cada projeto mantém seu próprio `graphify-out/`; bancos, relatórios e índices
de codebase não entram neste repositório de configuração global.

## Memória global com claude-mem

O [claude-mem](https://github.com/thedotmack/claude-mem) está pinado em
`.claude-mem-version`. O plugin oficial captura ferramentas e mensagens do
OpenCode e expõe `claude_mem_search`.

`config/plugins/claude-mem-autostart.mjs` inicia o worker ao abrir o OpenCode e
injeta contexto recente do projeto em cada system prompt. O compressor usa
`openai/gpt-oss-20b` diretamente pelo OpenRouter. Tier routing fica
desativado e o limite global de agentes é `1`, impedindo chamadas de compressão
em paralelo. A credencial vem de `OPENROUTER_API_KEY`, sem duplicação no
`settings.json`.

Banco SQLite, Chroma, logs, PID, configurações e o arquivo local de gateway
ficam em `~/.claude-mem/`, fora deste Git. Memória é contexto histórico:
estado atual da codebase e instruções atuais sempre vencem conteúdo antigo.

## MCP estrutural sempre ativo

O
[codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)
está pinado em `.codebase-memory-mcp-version`, registrado globalmente como
MCP local com `enabled: true` e iniciado automaticamente pelo OpenCode.

`auto_index=true` e `auto_watch=true` fazem projetos novos serem indexados na
primeira conexão e mantêm índices existentes atualizados. Dados, bancos e logs
ficam em `~/.cache/codebase-memory-mcp/`, fora do Git.

Graphify continua sendo o mapa amplo/narrativo oficial. O MCP fornece consultas
estruturais rápidas (`search_graph`, `trace_path`, `get_code_snippet`,
`check_index_coverage`, `query_graph`, `get_architecture`). Para decisões
arquiteturais, os dois índices devem ser reconciliados com o código atual.

## Documentação contínua por projeto

A skill global `project-docs` e o plugin `project-docs-hook.mjs` mantêm
documentação viva em toda pasta aberta pelo OpenCode. O scaffold cria somente
arquivos ausentes em `.docs/`, a pasta `.docs/features/` e um bloco gerenciado
no `AGENTS.md` local, preservando conteúdo existente.

Depois de cada resposta concluída da sessão raiz, o hook inicia uma auditoria
assíncrona e não bloqueante. `project-docs-gpt` usa GPT 5.6 Sol com variante
`low`; erros de modelo, provider, dispatch ou timeout acionam uma única
tentativa com `project-docs-sonnet`, também em `low`. As escritas dos agentes
ficam restritas a `.docs/**`, nunca ao código ou ao `AGENTS.md`.

Cada projeto recebe `project.md`, `product.md`, `specs.md`, `infra.md`,
`rules.md` e `features.md`. O índice `features.md` aponta para uma página
verificada por capacidade em `.docs/features/<slug>.md`. Código atual sempre
vence documentação desatualizada; segredos e valores de `.env` nunca entram nos
documentos.

## 9Router local

Os provedores principais do 9router usam `http://127.0.0.1:20128/v1`. Plan,
Prompt Enhancer e claude-mem chamam OpenRouter diretamente. Cada família local
usa seu transporte nativo para que o 9router não converta níveis de esforço:

- Claude usa `@ai-sdk/anthropic` e `/v1/messages`.
- GPT Sol usa `@ai-sdk/openai` e `/v1/responses`.
- Kimi usa `@ai-sdk/openai-compatible` e `/v1/chat/completions`.

Modelos visíveis:

- Opus 5 — `low`, `medium`, `high`, `xhigh`, `max`
- Sonnet 5 — `low`, `medium`, `high`, `xhigh`, `max`
- Fable 5 — `low`, `medium`, `high`, `xhigh`, `max`
- GPT Sol — `low`, `medium`, `high`, `xhigh`, `max`
- Kimi K3 — `low`, `medium`, `high`, `max`
- Haiku — `high` e `max` por orçamento nativo de thinking

Use `Ctrl+T` na TUI para alternar a variante do modelo atual. No Haiku, `high`
usa 16.000 tokens de thinking e `max` usa 31.999; esses nomes não são enviados
como níveis de effort.

Os IDs e limites foram obtidos diretamente de `/v1/models`. O valor
`sk_9router` presente na configuração é apenas o placeholder exigido pelos
adapters para acessar o serviço local sem autenticação; não é uma credencial.

O agente embutido `plan` é uma exceção deliberada: ele usa
`openrouter-oss/openai/gpt-oss-20b` com temperatura `0`. Esse provider lê
`OPENROUTER_API_KEY` do ambiente e não interfere nos modelos principais do
9Router. O mesmo modelo comprime as observações do claude-mem.

## Instalação em uma nova máquina

### Preparação recomendada com mise

```bash
cd ~/repos/opencode-config
mise install
```

O `mise` é opcional. Sem ele, instale Node.js/npm e Python/uv conforme os
pré-requisitos; os scripts cuidam dos pacotes restantes.

### Windows

```powershell
git clone https://github.com/Overstrider/opencode-config.git "$env:USERPROFILE\repos\opencode-config"
cd "$env:USERPROFILE\repos\opencode-config"
# Defina OPENROUTER_API_KEY e prepare o 9Router antes deste passo.
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
opencode auth login
```

O script tenta criar um link simbólico e usa uma junction como fallback quando
o Windows não permite symlinks sem elevação. Ambos mantêm
`~/.config/opencode` apontando para `config/`. Ele também:

- instala a versão pinada do OpenCode;
- restaura dependências com Bun, usando npm como fallback;
- instala Graphify e codebase-memory-mcp;
- configura e reinicia o worker do claude-mem;
- persiste BYPASS, Caveman Ultra e Ponytail Ultra;
- cria o atalho `OpenCode Administrador`;
- valida a configuração resolvida.

Feche e reabra terminais e o OpenCode depois da primeira instalação para que
variáveis persistidas e plugins novos sejam carregados por processos novos.

### Linux, macOS ou WSL

```bash
git clone https://github.com/Overstrider/opencode-config.git "$HOME/repos/opencode-config"
cd "$HOME/repos/opencode-config"
# Exporte OPENROUTER_API_KEY e inicie o 9Router antes deste passo.
./install.sh
opencode auth login
```

Se já existir uma configuração que não aponta para este repositório, o
instalador a move para um backup com timestamp antes de criar o link.

No Unix, `OPENCODE_PERMISSION`, `CAVEMAN_DEFAULT_MODE` e
`PONYTAIL_DEFAULT_MODE` são exportados durante a instalação, mas não são
persistidos globalmente pelo script. Inicie com `opencode --auto` e, se
necessário, exporte essas variáveis no perfil privado do shell.

## Verificação pós-instalação

Execute:

```bash
opencode --version
opencode debug config
graphify --version
codebase-memory-mcp --version
node --test tests/*.test.mjs
```

Serviços esperados:

| Serviço | Verificação | Resultado esperado |
| --- | --- | --- |
| 9Router | `http://127.0.0.1:20128/v1/models` | HTTP `200` com catálogo de modelos |
| claude-mem | `http://127.0.0.1:37778/api/health` | worker pronto com provider OpenRouter |
| OpenRouter | Enviar um prompt comum no OpenCode | Prompt Enhancer grava `modelText` em inglês |

No PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:20128/v1/models
Invoke-RestMethod http://127.0.0.1:37778/api/health
```

No Bash:

```bash
curl --fail http://127.0.0.1:20128/v1/models
curl --fail http://127.0.0.1:37778/api/health
```

O texto do Prompt Enhancer não substitui a mensagem visível. O histórico
continua mostrando o original; somente a cópia enviada ao modelo fica em
inglês. Use `!raw ` para testar o bypass intencional.

## Solução de problemas

### `Python não foi encontrado; Graphify requer Python 3.10+`

Instale Python `3.10+` com a opção de adicionar ao `PATH`, ou instale `uv`
antes de executar o setup. Confirme com `python --version` no Windows ou
`python3 --version` no Unix, depois rode `setup-integrations.ps1` ou
`setup-integrations.sh` novamente.

### `no LLM API key found` ao executar `graphify .`

O projeto contém documentos e a CLI headless quer um backend semântico. Use
`graphify . --code-only` para indexar somente código, ou configure
`GEMINI_API_KEY`/`GOOGLE_API_KEY` para incluir documentos.

### Modelos falham com conexão recusada em `127.0.0.1:20128`

O 9Router não está ativo ou o caminho de autostart não existe nessa máquina.
Inicie o serviço manualmente, corrija `ROUTER_DIR` e valide `/v1/models`.

### `[claude-mem] Worker ... Unable to connect`

Confirme `~/.claude-mem/settings.json`, porta `37778` e o endpoint
`/api/health`. Rode novamente o setup de integrações para sincronizar a
credencial e reiniciar o worker. Os wrappers removem BOM UTF-8 antes de ler o
arquivo, evitando retorno silencioso à porta antiga `37777`.

### Prompt Enhancer envia o texto original

Confirme `OPENROUTER_API_KEY` no ambiente do processo que abriu o OpenCode.
Timeout, rede, crédito, quota ou autorização ativam circuit breaker e enviam o
original sem bloquear a conversa. Reiniciar durante o cooldown não corrige
crédito ou autorização; valide a conta OpenRouter.

## Atualização

No Windows:

```powershell
& "$env:USERPROFILE\repos\opencode-config\update.ps1"
```

No Linux, macOS ou WSL:

```bash
"$HOME/repos/opencode-config/update.sh"
```

Os scripts fazem `git pull --ff-only`, restauram dependências bloqueadas e
reinstalam a versão registrada em `.opencode-version`.

## Fluxo diário

```bash
cd ~/repos/opencode-config
git status
git add config
git commit -m "Customize OpenCode"
git push
```

## Estrutura

```text
config/
├── opencode.json
├── tui.json
├── AGENTS.md
├── package.json
├── bun.lock
├── agents/
├── commands/
├── lib/
├── plugins/
├── skills/
└── vendor/
scripts/
tests/
```

`graphify-out/`, `config/node_modules/`, credenciais e dados de runtime são
gerados localmente e ignorados pelo Git.

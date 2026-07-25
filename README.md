# opencode-config

Configuração global, privada e reproduzível do OpenCode.

O diretório `config/` é a fonte de verdade e deve ser ligado a
`~/.config/opencode`. Assim, alterações feitas na configuração global aparecem
imediatamente no Git.

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

## 9Router local

Somente os provedores locais do 9router estão habilitados, todos usando
`http://127.0.0.1:20128/v1`. Cada família usa seu transporte nativo para que o
9router não converta níveis de esforço:

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

## Instalação em uma nova máquina

### Windows

```powershell
git clone https://github.com/Overstrider/opencode-config.git "$env:USERPROFILE\repos\opencode-config"
Set-ExecutionPolicy -Scope Process Bypass
& "$env:USERPROFILE\repos\opencode-config\install.ps1"
opencode auth login
```

O script tenta criar um link simbólico e usa uma junction como fallback quando
o Windows não permite symlinks sem elevação. Ambos mantêm
`~/.config/opencode` apontando para `config/`.

### Linux, macOS ou WSL

```bash
git clone https://github.com/Overstrider/opencode-config.git "$HOME/repos/opencode-config"
"$HOME/repos/opencode-config/install.sh"
opencode auth login
```

Se já existir uma configuração que não aponta para este repositório, o
instalador a move para um backup com timestamp antes de criar o link.

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
├── plugins/
├── skills/
├── themes/
└── tools/
```

Os diretórios inicialmente vazios contêm `.gitkeep`. Remova o `.gitkeep`
quando adicionar a primeira customização real.

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
- scripts de instalação e atualização

## O que nunca entra no Git

Credenciais, tokens, logs, sessões e dados de projetos ficam em
`~/.local/share/opencode/`. O OpenCode salva autenticação em
`~/.local/share/opencode/auth.json`, fora do link deste repositório.

Não coloque chaves diretamente em `opencode.json`. Use `opencode auth login`,
variáveis de ambiente ou um arquivo local ignorado pelo Git.

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

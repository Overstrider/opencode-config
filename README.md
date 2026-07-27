# opencode-config — Copilot Minimal

Branch direta, sem 9Router, OpenRouter, Prompt Enhancer ou claude-mem.

Inclui OpenCode, Graphify, codebase-memory-mcp, Project Docs e políticas
Caveman/Ponytail.

## Chave do Copilot

Crie o arquivo privado:

```powershell
Copy-Item .\config\copilot.key.example .\config\copilot.key
notepad .\config\copilot.key
```

No Unix:

```bash
cp config/copilot.key.example config/copilot.key
${EDITOR:-nano} config/copilot.key
```

Substitua o texto de exemplo pelo token do GitHub Copilot. O arquivo
`config/copilot.key` é ignorado pelo Git e lido diretamente pelo provider
`copilot`.

## Provider

O OpenCode chama diretamente:

- endpoint: `https://api.githubcopilot.com`
- provider: `copilot`
- modelo: `copilot/gpt-5.4`

Modelo principal, modelo pequeno, Plan, investigadores, reviewers e agentes de
documentação usam o mesmo provider.

## Instalação

Linux, macOS ou WSL:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Overstrider/opencode-config/copilot-minimal/bootstrap.sh)
```

Repositório já clonado:

```bash
./install.sh
```

Windows:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install.ps1
```

Os instaladores preparam Graphify e codebase-memory-mcp. Nenhum gateway ou
serviço de memória é instalado.

## Verificação

```bash
node --test tests/*.test.mjs
opencode debug config
```

## Privacidade

Nunca entram no Git:

- `config/copilot.key`;
- credenciais ou tokens;
- dados de runtime do OpenCode;
- índices gerados pelo Graphify.

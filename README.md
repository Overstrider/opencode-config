# opencode-config — Copilot Minimal

Branch enxuta sem OpenRouter, Prompt Enhancer ou claude-mem.

Inclui:

- OpenCode e políticas Caveman/Ponytail;
- 9Router local;
- Graphify;
- codebase-memory-mcp limitado ao projeto atual;
- providers Claude, Codex, Kimi e GitHub Copilot via 9Router.

## Preparar GitHub Copilot

O caminho recomendado é conectar a conta pelo dashboard do 9Router:

1. Execute o instalador.
2. Abra `http://127.0.0.1:20128/dashboard`.
3. Entre em **Providers → GitHub Copilot → Connect**.
4. Conclua o OAuth e confirme que `gh/gpt-5.4` aparece em `/v1/models`.

Também existe um arquivo humano, ignorado pelo Git, pronto para receber um token:

```powershell
Copy-Item .\config\copilot.key.example .\config\copilot.key
notepad .\config\copilot.key
```

No Unix:

```bash
cp config/copilot.key.example config/copilot.key
${EDITOR:-nano} config/copilot.key
```

O token não é versionado. O fluxo OAuth do dashboard continua sendo a forma
suportada de importá-lo no 9Router; o arquivo serve como entrada privada para
automação futura ou execução não interativa.

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

Os instaladores preparam o 9Router, Graphify e codebase-memory-mcp. Depois,
conecte o Copilot no dashboard.

## Modelos

O provider `9router-copilot` já declara `gh/gpt-5.4`. Ele fica disponível assim
que a conta GitHub Copilot for conectada ao 9Router.

Plan usa temporariamente `9router-sol/cx/gpt-5.6-luna`, evitando qualquer
dependência de OpenRouter.

## Verificação

```bash
node --test tests/*.test.mjs
opencode debug config
```

Endpoints:

- 9Router: `http://127.0.0.1:20128/v1/models`
- Dashboard: `http://127.0.0.1:20128/dashboard`

## Privacidade

Nunca entram no Git:

- `config/copilot.key`;
- tokens OAuth;
- bancos e logs do 9Router;
- dados de runtime do OpenCode;
- índices gerados pelo Graphify.

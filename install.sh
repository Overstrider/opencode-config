#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_config="${repository_root}/config"
target_config="${HOME}/.config/opencode"
opencode_version="$(tr -d '[:space:]' < "${repository_root}/.opencode-version")"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm não foi encontrado. Instale Node.js ou use mise antes de continuar." >&2
  exit 1
fi

bypass_permission="$(node -e 'const fs=require("fs"); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1],"utf8"))))' "${repository_root}/bypass-permissions.json")"
export OPENCODE_PERMISSION="${bypass_permission}"
export CAVEMAN_DEFAULT_MODE="ultra"
export PONYTAIL_DEFAULT_MODE="ultra"

npm install --global "opencode-ai@${opencode_version}"

if command -v bun >/dev/null 2>&1; then
  (cd "${source_config}" && bun install --frozen-lockfile)
else
  npm install --prefix "${source_config}"
fi

mkdir -p "$(dirname -- "${target_config}")"

if [[ -L "${target_config}" ]] &&
   [[ "$(readlink -f -- "${target_config}")" == "$(readlink -f -- "${source_config}")" ]]; then
  echo "Link de configuração já está correto."
else
  if [[ -e "${target_config}" || -L "${target_config}" ]]; then
    backup_path="${target_config}.backup-$(date +%Y%m%d-%H%M%S)"
    mv -- "${target_config}" "${backup_path}"
    echo "Configuração anterior preservada em ${backup_path}"
  fi

  ln -s -- "${source_config}" "${target_config}"
  echo "Link criado: ${target_config} -> ${source_config}"
fi

bash "${repository_root}/setup-integrations.sh"

opencode debug config >/dev/null
echo "OpenCode ${opencode_version} configurado com sucesso."
echo "Modo BYPASS ativado nesta execução."
echo "Para garantia adicional, inicie sessões com: opencode --auto"
echo "Credenciais continuam fora do Git. Execute: opencode auth login"

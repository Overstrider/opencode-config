#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_config="${repository_root}/config"
opencode_version="$(tr -d '[:space:]' < "${repository_root}/.opencode-version")"
bypass_permission="$(node -e 'const fs=require("fs"); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1],"utf8"))))' "${repository_root}/bypass-permissions.json")"
export OPENCODE_PERMISSION="${bypass_permission}"
export CAVEMAN_DEFAULT_MODE="ultra"
export PONYTAIL_DEFAULT_MODE="ultra"

git -C "${repository_root}" pull --ff-only
npm install --global "opencode-ai@${opencode_version}"

if command -v bun >/dev/null 2>&1; then
  (cd "${source_config}" && bun install --frozen-lockfile)
else
  npm install --prefix "${source_config}"
fi

bash "${repository_root}/setup-9router.sh"
bash "${repository_root}/setup-integrations.sh"

opencode debug config >/dev/null
echo "OpenCode ${opencode_version}, configuração e modo BYPASS atualizados."

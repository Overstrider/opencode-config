#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_config="${repository_root}/config"
opencode_version="$(tr -d '[:space:]' < "${repository_root}/.opencode-version")"

git -C "${repository_root}" pull --ff-only
npm install --global "opencode-ai@${opencode_version}"

if command -v bun >/dev/null 2>&1; then
  (cd "${source_config}" && bun install --frozen-lockfile)
else
  npm install --prefix "${source_config}"
fi

opencode debug config >/dev/null
echo "OpenCode ${opencode_version} e configuração atualizados."

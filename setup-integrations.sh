#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
graphify_version="$(tr -d '[:space:]' < "${repository_root}/.graphify-version")"
codebase_memory_version="$(tr -d '[:space:]' < "${repository_root}/.codebase-memory-mcp-version")"
uv_version="0.11.6"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required." >&2
  exit 1
fi
if ! command -v uv >/dev/null 2>&1; then
  python3 -m pip install --user "uv==${uv_version}"
fi
export PATH="${HOME}/.local/bin:${PATH}"

uv tool install --upgrade "graphifyy==${graphify_version}"
npm install --global "codebase-memory-mcp@${codebase_memory_version}"
codebase-memory-mcp config set auto_index true
codebase-memory-mcp config set auto_watch true

echo "Graphify ${graphify_version} installed."
echo "codebase-memory-mcp ${codebase_memory_version} enabled."

#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source_config="${repository_root}/config"
graphify_version="$(tr -d '[:space:]' < "${repository_root}/.graphify-version")"
claude_mem_version="$(tr -d '[:space:]' < "${repository_root}/.claude-mem-version")"
codebase_memory_version="$(tr -d '[:space:]' < "${repository_root}/.codebase-memory-mcp-version")"
bun_version="1.3.13"
uv_version="0.11.6"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install the global integrations." >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  npm install --global "bun@${bun_version}"
fi

if ! command -v uv >/dev/null 2>&1; then
  python3 -m pip install --user "uv==${uv_version}"
fi
export PATH="${HOME}/.local/bin:${PATH}"

uv tool install --upgrade "graphifyy==${graphify_version}"
npm install --global "codebase-memory-mcp@${codebase_memory_version}"
codebase-memory-mcp config set auto_index true
codebase-memory-mcp config set auto_watch true

claude_mem_plugin_root="${source_config}/node_modules/claude-mem/plugin"
(cd "${claude_mem_plugin_root}" && bun install --frozen-lockfile)

claude_mem_data_dir="${HOME}/.claude-mem"
node - "${claude_mem_data_dir}" <<'NODE'
const fs = require('fs');
const path = require('path');

const dataDir = process.argv[2];
const settingsPath = path.join(dataDir, 'settings.json');
fs.mkdirSync(dataDir, { recursive: true });

let settings = {};
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch {}
const profile = 'openrouter-qwen36';
const model = 'qwen/qwen3.6-35b-a3b';
Object.assign(settings, {
  CLAUDE_MEM_PROVIDER: 'openrouter',
  CLAUDE_MEM_OPENROUTER_MODEL: model,
  CLAUDE_MEM_MODEL_PROFILE: profile,
  CLAUDE_MEM_MODEL: model,
  CLAUDE_MEM_MAX_CONCURRENT_AGENTS: '1',
  CLAUDE_MEM_TIER_ROUTING_ENABLED: 'false',
  CLAUDE_MEM_TIER_SIMPLE_MODEL: model,
  CLAUDE_MEM_TIER_SUMMARY_MODEL: model,
  CLAUDE_MEM_TIER_FAST_MODEL: model,
  CLAUDE_MEM_TIER_SMART_MODEL: model,
  CLAUDE_MEM_WORKER_HOST: '127.0.0.1',
  CLAUDE_MEM_WORKER_PORT: '37778',
  CLAUDE_MEM_DATA_DIR: dataDir,
});
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
NODE

node "${repository_root}/scripts/configure-claude-mem-env.mjs" \
  "${claude_mem_data_dir}"
bun "${claude_mem_plugin_root}/scripts/worker-service.cjs" restart >/dev/null

echo "Graphify ${graphify_version} installed."
echo "claude-mem ${claude_mem_version} configured and started."
echo "codebase-memory-mcp ${codebase_memory_version} always enabled."

#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
router_version="$(tr -d '[:space:]' < "${repository_root}/.9router-version")"
state_dir="${XDG_STATE_HOME:-${HOME}/.local/state}/opencode-config"
router_log="${state_dir}/9router.log"
health_url="http://127.0.0.1:20128/v1/models"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js 20+ and npm are required to install 9Router." >&2
  exit 1
fi

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( node_major < 20 )); then
  echo "9Router requires Node.js 20 or newer; found $(node --version)." >&2
  exit 1
fi

npm install --global "9router@${router_version}"

router_is_ready() {
  node - "${health_url}" <<'NODE'
const url = process.argv[2];
fetch(url, { signal: AbortSignal.timeout(1000) })
  .then((response) => process.exit(response.ok ? 0 : 1))
  .catch(() => process.exit(1));
NODE
}

if ! router_is_ready; then
  mkdir -p "${state_dir}"
  nohup 9router \
    --port 20128 \
    --host 127.0.0.1 \
    --no-browser \
    --skip-update \
    --log \
    >"${router_log}" 2>&1 &

  ready=false
  for _ in {1..30}; do
    if router_is_ready; then
      ready=true
      break
    fi
    sleep 1
  done

  if [[ "${ready}" != "true" ]]; then
    echo "9Router did not become ready. Inspect ${router_log}." >&2
    exit 1
  fi
fi

echo "9Router ${router_version} is ready at http://127.0.0.1:20128."
echo "Open http://127.0.0.1:20128/dashboard to connect providers and select models."

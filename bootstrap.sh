#!/usr/bin/env bash
set -euo pipefail

repository_url="${OPENCODE_CONFIG_REPOSITORY:-https://github.com/Overstrider/opencode-config.git}"
checkout_dir="${OPENCODE_CONFIG_DIR:-${XDG_DATA_HOME:-${HOME}/.local/share}/opencode-config-repo}"

if ! command -v git >/dev/null 2>&1; then
  echo "Git is required." >&2
  exit 1
fi

if [[ -d "${checkout_dir}/.git" ]]; then
  git -C "${checkout_dir}" pull --ff-only
elif [[ -e "${checkout_dir}" ]]; then
  echo "${checkout_dir} exists but is not this Git repository." >&2
  exit 1
else
  mkdir -p "$(dirname -- "${checkout_dir}")"
  git clone -- "${repository_url}" "${checkout_dir}"
fi

key_file="${checkout_dir}/config/copilot.key"
if [[ ! -s "${key_file}" ]]; then
  if [[ -n "${GITHUB_COPILOT_TOKEN:-}" ]]; then
    copilot_key="${GITHUB_COPILOT_TOKEN}"
  elif [[ -t 0 ]]; then
    read -r -s -p "GitHub Copilot token (or Enter to configure OAuth later): " copilot_key
    printf '\n'
  else
    echo "Set GITHUB_COPILOT_TOKEN before running non-interactively." >&2
    exit 1
  fi

  if [[ -n "${copilot_key}" ]]; then
    umask 077
    printf '%s\n' "${copilot_key}" > "${key_file}"
  fi
fi

exec bash "${checkout_dir}/install.sh"

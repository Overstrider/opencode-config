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

key_file="${checkout_dir}/config/openrouter.key"
if [[ ! -s "${key_file}" ]]; then
  if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
    openrouter_key="${OPENROUTER_API_KEY}"
  elif [[ -t 0 ]]; then
    read -r -s -p "OpenRouter API key: " openrouter_key
    printf '\n'
  else
    echo "Set OPENROUTER_API_KEY before running non-interactively." >&2
    exit 1
  fi

  if [[ -z "${openrouter_key}" ]]; then
    echo "The OpenRouter key cannot be empty." >&2
    exit 1
  fi

  umask 077
  printf '%s\n' "${openrouter_key}" > "${key_file}"
fi

exec bash "${checkout_dir}/install.sh"

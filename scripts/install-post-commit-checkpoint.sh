#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hook_dir="${repo_root}/.git/hooks"
hook_path="${hook_dir}/post-commit"

mkdir -p "${hook_dir}"
cp "${repo_root}/scripts/post-commit-checkpoint.sh" "${hook_path}"
chmod +x "${hook_path}"

echo "Installed post-commit checkpoint hook at ${hook_path}"

#!/usr/bin/env bash
set -euo pipefail

timestamp="$(date +"%Y-%m-%d-%H%M%S")"
short_sha="$(git rev-parse --short HEAD)"
tag="checkpoint-${timestamp}-${short_sha}"

git tag "${tag}"

if git remote get-url origin >/dev/null 2>&1; then
  git push origin "${tag}"
fi

echo "Created checkpoint tag ${tag}"

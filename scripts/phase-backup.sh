#!/bin/bash
#
# Phase backup script — creates a git tag before each optimization phase.
# To revert to a backup: git revert to the tag or git reset --hard <tag>
#
# Usage:
#   ./scripts/phase-backup.sh <phase-name>    # creates tag + backup branch
#   ./scripts/phase-backup.sh --list           # list all phase backups
#   ./scripts/phase-backup.sh --revert <name>  # revert to a phase backup
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

if [ "${1:-}" == "--list" ]; then
  echo -e "${CYAN}Phase backups:${NC}"
  git tag -l "backup/phase-*" --sort=-creatordate | while read tag; do
    date=$(git log -1 --format='%ci' "$tag" 2>/dev/null | cut -d' ' -f1)
    msg=$(git tag -l -n1 "$tag" | sed "s/^$tag\s*//")
    echo -e "  ${GREEN}$tag${NC}  ($date)  $msg"
  done
  echo ""
  echo "To revert: ./scripts/phase-backup.sh --revert <phase-name>"
  exit 0
fi

if [ "${1:-}" == "--revert" ]; then
  PHASE="${2:-}"
  if [ -z "$PHASE" ]; then
    echo -e "${RED}Usage: ./scripts/phase-backup.sh --revert <phase-name>${NC}"
    exit 1
  fi
  TAG="backup/phase-${PHASE}"
  if ! git rev-parse "$TAG" >/dev/null 2>&1; then
    echo -e "${RED}Backup tag '$TAG' not found.${NC}"
    echo "Available backups:"
    git tag -l "backup/phase-*"
    exit 1
  fi
  echo -e "${YELLOW}WARNING: This will create a new branch 'revert-${PHASE}' from the backup point.${NC}"
  echo -e "Your current work on master is NOT deleted — you can switch back anytime."
  read -p "Proceed? (y/N) " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
  git checkout -b "revert-${PHASE}" "$TAG"
  echo -e "${GREEN}Now on branch 'revert-${PHASE}' at the pre-${PHASE} state.${NC}"
  echo "To go back to master: git checkout master"
  exit 0
fi

PHASE="${1:-}"
if [ -z "$PHASE" ]; then
  echo "Usage: ./scripts/phase-backup.sh <phase-name>"
  echo "       ./scripts/phase-backup.sh --list"
  echo "       ./scripts/phase-backup.sh --revert <phase-name>"
  exit 1
fi

TAG="backup/phase-${PHASE}"
COMMIT=$(git rev-parse HEAD)
SHORT=$(git rev-parse --short HEAD)

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo -e "${YELLOW}Backup tag '$TAG' already exists. Skipping.${NC}"
  exit 0
fi

git tag -a "$TAG" -m "Backup before phase: ${PHASE} (commit ${SHORT})"
echo -e "${GREEN}Backup created:${NC} $TAG -> $SHORT"
echo "  To revert later: ./scripts/phase-backup.sh --revert ${PHASE}"

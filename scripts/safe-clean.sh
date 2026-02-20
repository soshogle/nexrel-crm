#!/bin/bash
#
# Safe cleanup script for nexrel-crm
# Removes stale build caches that accumulate over time.
# SAFE: Only touches generated/cached files, never source code or database.
#
# Usage:
#   ./scripts/safe-clean.sh          # interactive — shows what will be deleted, asks first
#   ./scripts/safe-clean.sh --yes    # skip confirmation
#   ./scripts/safe-clean.sh --dry    # show what would be deleted, change nothing

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

MODE="interactive"
[[ "${1:-}" == "--yes" ]] && MODE="auto"
[[ "${1:-}" == "--dry" ]] && MODE="dry"

echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}  nexrel-crm safe cleanup${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

# ── Gather sizes ──────────────────────────────────────────
get_size() { du -sh "$1" 2>/dev/null | awk '{print $1}' || echo "0B"; }

NEXT_SIZE="0B"; [ -d .next ] && NEXT_SIZE=$(get_size .next)
NEXT_CACHE_SIZE="0B"; [ -d .next/cache ] && NEXT_CACHE_SIZE=$(get_size .next/cache)
TSC_INCR="0B"; [ -f tsconfig.tsbuildinfo ] && TSC_INCR=$(get_size tsconfig.tsbuildinfo)

echo -e "${YELLOW}Current sizes:${NC}"
echo "  .next/cache  (webpack + build cache)  ${NEXT_CACHE_SIZE}"
echo "  .next/server (compiled server pages)   $([ -d .next/server ] && get_size .next/server || echo '0B')"
echo "  .next/trace  (build traces)            $([ -f .next/trace ] && get_size .next/trace || echo '0B')"
echo "  tsconfig.tsbuildinfo (tsc incremental) ${TSC_INCR}"
echo ""

# ── What we will clean ───────────────────────────────────
# .next/cache   → webpack hot-update bundles, accumulated over many dev sessions
#                 Next.js regenerates this on next `npm run dev` or `npm run build`
#                 This is the main culprit (typically 90%+ of .next size)
#
# .next/trace   → build performance traces, purely diagnostic
#
# tsconfig.tsbuildinfo → TypeScript incremental cache, regenerated on next tsc run
#
# NOT touched:
#   - .next/server → contains compiled pages; cleaning would force full rebuild
#                    (we clear this only with --full flag)
#   - node_modules → not touched; run `npm ci` separately if needed
#   - .git         → never touched
#   - source code  → never touched
#   - database     → never touched (Prisma migrations are source files)

ITEMS=()
DESCRIPTIONS=()

if [ -d .next/cache ]; then
  ITEMS+=(".next/cache")
  DESCRIPTIONS+=(".next/cache (${NEXT_CACHE_SIZE} — webpack/build cache)")
fi

if [ -f .next/trace ]; then
  ITEMS+=(".next/trace")
  DESCRIPTIONS+=(".next/trace ($(get_size .next/trace) — build traces)")
fi

if [ -f tsconfig.tsbuildinfo ]; then
  ITEMS+=("tsconfig.tsbuildinfo")
  DESCRIPTIONS+=("tsconfig.tsbuildinfo (${TSC_INCR} — tsc incremental)")
fi

if [ "${2:-}" == "--full" ] || [ "${1:-}" == "--full" ]; then
  if [ -d .next ]; then
    ITEMS=(".next")
    DESCRIPTIONS=(".next (${NEXT_SIZE} — entire build output, forces full rebuild)")
  fi
fi

if [ ${#ITEMS[@]} -eq 0 ]; then
  echo -e "${GREEN}Nothing to clean — caches are already clear.${NC}"
  exit 0
fi

echo -e "${YELLOW}Will remove:${NC}"
for desc in "${DESCRIPTIONS[@]}"; do
  echo "  • $desc"
done
echo ""
echo -e "  ${GREEN}SAFE — only generated/cached files. Source code, database, and git history are never touched.${NC}"
echo ""

if [ "$MODE" == "dry" ]; then
  echo -e "${CYAN}Dry run — no files deleted.${NC}"
  exit 0
fi

if [ "$MODE" == "interactive" ]; then
  read -p "Proceed? (y/N) " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

# ── Clean ─────────────────────────────────────────────────
for item in "${ITEMS[@]}"; do
  echo -n "  Removing $item ... "
  rm -rf "$item"
  echo -e "${GREEN}done${NC}"
done

echo ""
echo -e "${GREEN}Cleanup complete.${NC}"
echo "  Next 'npm run dev' will rebuild the cache (takes ~30-60s on first load)."
echo "  Next 'npm run build' will do a full production build."
echo ""

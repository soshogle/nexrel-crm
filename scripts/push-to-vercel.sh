#!/bin/bash
#
# Safe Push to Vercel Script
# 
# Usage: ./scripts/push-to-vercel.sh "commit message"
#

set -e

COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}\ud83d\ude80 Safe Push to Vercel${COLOR_RESET}\n"

if [ -z "$1" ]; then
    echo -e "${COLOR_RED}\u274c Please provide a commit message${COLOR_RESET}"
    echo "Usage: ./scripts/push-to-vercel.sh \"your commit message\""
    exit 1
fi

COMMIT_MSG="$1"

echo -e "${COLOR_YELLOW}Step 1: Running pre-push validation...${COLOR_RESET}"
if ! node scripts/validate-before-push.js; then
    echo -e "${COLOR_RED}\u274c Validation failed. Fix errors before pushing.${COLOR_RESET}"
    exit 1
fi

echo -e "\n${COLOR_YELLOW}Step 2: Checking next.config.js...${COLOR_RESET}"
if grep -q "outputFileTracingRoot" next.config.js 2>/dev/null; then
    echo -e "${COLOR_YELLOW}\u26a0\ufe0f  Removing outputFileTracingRoot from next.config.js${COLOR_RESET}"
    sed -i '/outputFileTracingRoot/d' next.config.js
fi
echo -e "${COLOR_GREEN}\u2713 next.config.js is clean${COLOR_RESET}"

echo -e "\n${COLOR_YELLOW}Step 3: Staging changes...${COLOR_RESET}"
git add -A

if git diff --cached --quiet; then
    echo -e "${COLOR_YELLOW}\u26a0\ufe0f  No changes to commit${COLOR_RESET}"
    exit 0
fi

echo -e "\n${COLOR_YELLOW}Step 4: Committing...${COLOR_RESET}"
git commit -m "$COMMIT_MSG"

echo -e "\n${COLOR_YELLOW}Step 5: Pushing to GitHub...${COLOR_RESET}"
git push origin main

echo -e "\n${COLOR_GREEN}\u2705 Successfully pushed to GitHub!${COLOR_RESET}"
echo -e "${COLOR_BLUE}\ud83d\udd17 Check deployment at: https://vercel.com/soshogle/nexrel-crm${COLOR_RESET}"

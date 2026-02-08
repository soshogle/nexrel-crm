#!/bin/bash

# Trigger Deployment via Vercel API
# Alternative to deploy hooks - triggers deployment directly

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_TOKEN="ykVWCg0kw8Tr8m2RhuA095Na"
PROJECT_ID="prj_TtBTAMHeXkbofxX808MlIgSzSIzu"
TEAM_ID="team_vJ3wdbf3QXa3R4KzaZjDEkLP"

echo ""
echo -e "${BLUE}🚀 Trigger Deployment via API${NC}"
echo ""

# Get latest commit SHA
LATEST_COMMIT=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -1)

echo "Latest commit: $LATEST_COMMIT"
echo "Message: $COMMIT_MSG"
echo ""

# Note: Vercel doesn't have a direct API to trigger deployments from Git
# The deployment API requires uploading files, which we can't do easily
# Best approach: Use Vercel CLI or create deploy hook via UI

echo -e "${YELLOW}⚠️  Vercel API doesn't support triggering deployments from Git commits${NC}"
echo ""
echo "Options:"
echo ""
echo "1. Use Vercel CLI (Recommended):"
echo "   npm install -g vercel"
echo "   vercel login"
echo "   vercel --prod"
echo ""
echo "2. Create Deploy Hook via UI:"
echo "   https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks"
echo "   Then add webhook to GitHub"
echo ""
echo "3. Manual Redeploy:"
echo "   https://vercel.com/soshogle/nexrel-crm"
echo "   Click 'Redeploy' → Select commit → Deploy"
echo ""

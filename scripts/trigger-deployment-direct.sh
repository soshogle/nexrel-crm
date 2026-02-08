#!/bin/bash

# Trigger Vercel Deployment Directly
# This uses the deployments API to trigger a new deployment

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
echo -e "${BLUE}🚀 Triggering Vercel Deployment Directly${NC}"
echo ""

# Get latest commit info
LATEST_COMMIT=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -1)

echo "Latest commit: $LATEST_COMMIT"
echo "Message: $COMMIT_MSG"
echo ""

# Note: Vercel deployments API requires file uploads, which is complex
# The easiest way is to use the dashboard or create a deploy hook manually

echo -e "${YELLOW}⚠️  Vercel API Limitation${NC}"
echo ""
echo "Vercel's deployment API requires uploading files, which is complex."
echo "The easiest solution is to create a deploy hook manually."
echo ""
echo -e "${BLUE}📋 Manual Steps (Recommended):${NC}"
echo ""
echo "1. Go to: https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks"
echo "2. Click 'Create Hook'"
echo "3. Configure:"
echo "   - Name: GitHub Auto-Deploy"
echo "   - Branch: master"
echo "4. Copy the webhook URL"
echo "5. Go to: https://github.com/soshogle/nexrel-crm/settings/hooks"
echo "6. Click 'Add webhook'"
echo "7. Paste the URL"
echo "8. Content type: application/json"
echo "9. Events: Just the push event"
echo "10. Click 'Add webhook'"
echo ""
echo -e "${BLUE}📋 Immediate Deployment (Right Now):${NC}"
echo ""
echo "While setting up the webhook, deploy manually:"
echo "1. Go to: https://vercel.com/soshogle/nexrel-crm"
echo "2. Click 'Redeploy' button"
echo "3. Select commit: $LATEST_COMMIT"
echo "4. Click 'Redeploy'"
echo ""

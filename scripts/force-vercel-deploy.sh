#!/bin/bash

# Force Vercel Deployment via API
# This triggers a deployment using the latest commit from GitHub

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
echo -e "${BLUE}🚀 Forcing Vercel Deployment${NC}"
echo ""

# Get latest commit SHA
LATEST_COMMIT=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)

echo "Latest commit: $LATEST_COMMIT"
echo "Message: $COMMIT_MSG"
echo ""

# Trigger deployment
echo "Triggering deployment..."
RESPONSE=$(curl -s -X POST \
  "https://api.vercel.com/v13/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"nexrel-crm\",
    \"target\": \"production\"
  }")

# Check if deployment was triggered
if echo "$RESPONSE" | grep -q '"uid"'; then
    DEPLOYMENT_UID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('uid', 'N/A'))" 2>/dev/null || echo "N/A")
    DEPLOYMENT_URL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('url', 'N/A'))" 2>/dev/null || echo "N/A")
    
    echo -e "${GREEN}✅ Deployment triggered successfully!${NC}"
    echo ""
    echo "Deployment UID: $DEPLOYMENT_UID"
    echo "Deployment URL: $DEPLOYMENT_URL"
    echo ""
    echo "Check status at:"
    echo "  https://vercel.com/soshogle/nexrel-crm"
else
    echo -e "${RED}❌ Failed to trigger deployment${NC}"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "Alternative: Trigger manually via dashboard:"
    echo "  1. Go to: https://vercel.com/soshogle/nexrel-crm"
    echo "  2. Click 'Redeploy'"
    echo "  3. Select commit: $LATEST_COMMIT"
fi

echo ""

#!/bin/bash

# Trigger Vercel Deployment
# This script triggers a deployment via Vercel API

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🚀 Triggering Vercel Deployment${NC}"
echo ""

# Check if Vercel CLI is installed
if command -v vercel &> /dev/null; then
    echo -e "${GREEN}✅ Vercel CLI found${NC}"
    echo ""
    echo "Triggering deployment via Vercel CLI..."
    vercel --prod
    exit 0
fi

# If Vercel CLI not installed, use API
echo -e "${YELLOW}⚠️  Vercel CLI not installed${NC}"
echo ""
echo "Option 1: Install Vercel CLI and deploy"
echo "  npm install -g vercel"
echo "  vercel --prod"
echo ""
echo "Option 2: Trigger via Vercel Dashboard"
echo "  1. Go to: https://vercel.com/soshogle/nexrel-crm"
echo "  2. Click 'Redeploy' button"
echo "  3. Select latest commit: $(git log --oneline -1 | cut -d' ' -f1)"
echo ""
echo "Option 3: Check GitHub Integration"
echo "  1. Go to: https://vercel.com/soshogle/nexrel-crm/settings/git"
echo "  2. Verify GitHub is connected"
echo "  3. Check 'Auto-deploy' is enabled"
echo "  4. If not enabled, enable it and push again:"
echo "     git commit --allow-empty -m 'Trigger deployment'"
echo "     git push"
echo ""
echo "Option 4: Use Deploy Hook (if configured)"
echo "  Check: https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks"
echo "  Copy webhook URL and trigger:"
echo "  curl -X POST YOUR_DEPLOY_HOOK_URL"
echo ""

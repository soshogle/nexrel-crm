#!/bin/bash

# Guide to Create Deploy Hook via UI
# Deploy hooks cannot be created via API - must use Vercel dashboard

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}📋 Create Deploy Hook via Vercel Dashboard${NC}"
echo ""
echo -e "${YELLOW}Note: Deploy hooks must be created via UI (no API available)${NC}"
echo ""
echo "Step-by-step instructions:"
echo ""
echo "1. Go to Vercel Dashboard:"
echo "   https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks"
echo ""
echo "2. Click 'Create Hook' button"
echo ""
echo "3. Fill in the form:"
echo "   - Name: GitHub Auto-Deploy"
echo "   - Branch: master"
echo "   - Git Provider: GitHub (if option available)"
echo ""
echo "4. Click 'Create Hook'"
echo ""
echo "5. Copy the webhook URL (looks like:)"
echo "   https://api.vercel.com/v1/integrations/deploy/prj_.../hook_..."
echo ""
echo "6. Add to GitHub:"
echo "   - Go to: https://github.com/soshogle/nexrel-crm/settings/hooks"
echo "   - Click 'Add webhook'"
echo "   - Paste the URL in 'Payload URL'"
echo "   - Content type: application/json"
echo "   - Events: Just the push event"
echo "   - Click 'Add webhook'"
echo ""
echo "7. Test it:"
echo "   git commit --allow-empty -m 'Test deploy hook'"
echo "   git push"
echo ""
echo -e "${GREEN}✅ After creating, the webhook will trigger deployments automatically!${NC}"
echo ""

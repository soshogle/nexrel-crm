#!/bin/bash

# Check GitHub Webhook Status
# This helps diagnose why deployments aren't triggering

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🔍 Checking GitHub Webhook Status${NC}"
echo ""

echo "1. Check GitHub Webhooks:"
echo "   https://github.com/soshogle/nexrel-crm/settings/hooks"
echo ""
echo "   Look for:"
echo "   - Vercel webhook (should be active)"
echo "   - Recent deliveries (should show recent pushes)"
echo ""

echo "2. Check Vercel Git Integration:"
echo "   https://vercel.com/soshogle/nexrel-crm/settings/git"
echo ""
echo "   Verify:"
echo "   - Repository: soshogle/nexrel-crm"
echo "   - Production branch: master"
echo "   - Auto-deploy enabled"
echo ""

echo "3. Check Recent Deployments:"
echo "   https://vercel.com/soshogle/nexrel-crm"
echo ""
echo "   Should see deployments triggered by commits"
echo ""

echo "4. Manual Trigger (if webhook not working):"
echo "   - Go to: https://vercel.com/soshogle/nexrel-crm"
echo "   - Click 'Redeploy'"
echo "   - Select latest commit"
echo ""

echo "5. Test Webhook:"
echo "   After pushing, check GitHub webhook deliveries:"
echo "   - Go to: https://github.com/soshogle/nexrel-crm/settings/hooks"
echo "   - Click on Vercel webhook"
echo "   - Check 'Recent Deliveries' tab"
echo "   - Should see recent push events"
echo ""

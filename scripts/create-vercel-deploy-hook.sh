#!/bin/bash
#
# Create Vercel Deploy Hook for GitHub Webhook
# 
# Usage: ./scripts/create-vercel-deploy-hook.sh
#

API_TOKEN="ykVWCg0kw8Tr8m2RhuA095Na"
PROJECT_ID="prj_TtBTAMHeXkbofxX808MlIgSzSIzu"
TEAM_ID="team_vJ3wdbf3QXa3R4KzaZjDEkLP"

echo "🔗 Creating Vercel Deploy Hook..."

RESULT=$(curl -s -X POST "https://api.vercel.com/v1/integrations/deploy-hooks" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"GitHub Auto-Deploy\",
    \"projectId\": \"${PROJECT_ID}\",
    \"teamId\": \"${TEAM_ID}\",
    \"branch\": \"master\"
  }")

WEBHOOK_URL=$(echo $RESULT | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ -z "$WEBHOOK_URL" ]; then
  echo "❌ Failed to create deploy hook"
  echo "Response: $RESULT"
  echo ""
  echo "Please create it manually:"
  echo "1. Go to: https://vercel.com/soshogle/nexrel-crm/settings/deploy-hooks"
  echo "2. Click 'Create Hook'"
  echo "3. Name: GitHub Auto-Deploy"
  echo "4. Branch: master"
  echo "5. Copy the webhook URL"
  exit 1
fi

echo ""
echo "✅ Deploy Hook created successfully!"
echo ""
echo "📋 Webhook URL:"
echo "$WEBHOOK_URL"
echo ""
echo "📝 Next steps:"
echo "1. Go to: https://github.com/soshogle/nexrel-crm/settings/hooks"
echo "2. Click 'Add webhook'"
echo "3. Paste the URL above in 'Payload URL'"
echo "4. Content type: application/json"
echo "5. Events: Just the push event"
echo "6. Click 'Add webhook'"
echo ""

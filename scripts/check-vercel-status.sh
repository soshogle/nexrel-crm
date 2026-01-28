#!/bin/bash
# Check Vercel deployment status

API_TOKEN="ykVWCg0kw8Tr8m2RhuA095Na"
PROJECT_ID="prj_TtBTAMHeXkbofxX808MlIgSzSIzu"

echo "🔍 Checking Vercel deployment status..."

RESULT=$(curl -s -X GET "https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1" \
  -H "Authorization: Bearer ${API_TOKEN}")

STATE=$(echo $RESULT | jq -r '.deployments[0].state')
URL=$(echo $RESULT | jq -r '.deployments[0].url')
CREATED=$(echo $RESULT | jq -r '.deployments[0].createdAt')

echo ""
echo "Status: $STATE"
echo "URL: https://$URL"
echo "Created: $(date -d @$((CREATED/1000)) 2>/dev/null || echo $CREATED)"
echo ""

if [ "$STATE" = "READY" ]; then
  echo "✅ Deployment successful!"
elif [ "$STATE" = "BUILDING" ]; then
  echo "🔨 Build in progress..."
elif [ "$STATE" = "ERROR" ]; then
  echo "❌ Build failed. Check Vercel dashboard for logs."
  echo "🔗 https://vercel.com/soshogle/nexrel-crm/deployments"
fi

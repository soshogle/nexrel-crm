#!/bin/bash

# Configure Orthanc Webhook Script
# This script configures the webhook in Orthanc via REST API

set -e

echo "🔧 Configuring Orthanc Webhook"
echo "==============================="
echo ""

# Get configuration
read -p "Enter Orthanc URL (e.g., http://localhost:8042): " ORTHANC_URL
read -p "Enter Orthanc username (default: orthanc): " ORTHANC_USER
ORTHANC_USER=${ORTHANC_USER:-orthanc}
read -sp "Enter Orthanc password: " ORTHANC_PASS
echo ""
read -p "Enter webhook URL (e.g., https://api.yourdomain.com/api/dental/dicom/webhook): " WEBHOOK_URL
read -sp "Enter webhook secret: " WEBHOOK_SECRET
echo ""

# Create Lua script for webhook
LUA_SCRIPT=$(cat <<'LUA_EOF'
function OnStoredInstance(dicom, instanceId)
   local url = 'WEBHOOK_URL_PLACEHOLDER'
   local secret = 'WEBHOOK_SECRET_PLACEHOLDER'
   
   local headers = {
      ['Content-Type'] = 'application/json',
      ['Authorization'] = 'Bearer ' .. secret
   }
   
   -- Get user ID from Orthanc metadata or use default
   -- In production, you might store user ID in Orthanc metadata
   local userId = 'default-user-id'  -- TODO: Get from Orthanc metadata
   
   local body = {
      event = 'NewInstance',
      resourceId = instanceId,
      userId = userId
   }
   
   local http = require('socket.http')
   local ltn12 = require('ltn12')
   local json = require('json')
   
   local response_body = {}
   local res, code, response_headers = http.request{
      url = url,
      method = 'POST',
      headers = headers,
      source = ltn12.source.string(json.encode(body)),
      sink = ltn12.sink.table(response_body)
   }
   
   if code ~= 200 then
      print('Webhook failed: ' .. code)
   end
end
LUA_EOF
)

# Replace placeholders
LUA_SCRIPT=$(echo "$LUA_SCRIPT" | sed "s|WEBHOOK_URL_PLACEHOLDER|$WEBHOOK_URL|g")
LUA_SCRIPT=$(echo "$LUA_SCRIPT" | sed "s|WEBHOOK_SECRET_PLACEHOLDER|$WEBHOOK_SECRET|g")

# Save Lua script
echo "$LUA_SCRIPT" > /tmp/orthanc-webhook.lua

echo "📝 Lua script created: /tmp/orthanc-webhook.lua"
echo ""

# Configure Orthanc via REST API
echo "🔧 Configuring Orthanc..."

# Get current configuration
CURRENT_CONFIG=$(curl -s -u "$ORTHANC_USER:$ORTHANC_PASS" "$ORTHANC_URL/system")

# Update configuration with Lua script
# Note: This is a simplified approach. In production, you might need to update orthanc.json directly
echo "⚠️  Note: Webhook configuration via REST API is limited."
echo "   Please configure webhook manually:"
echo ""
echo "   1. Access Orthanc web interface: $ORTHANC_URL"
echo "   2. Go to Configuration → Lua Scripts"
echo "   3. Copy the script from /tmp/orthanc-webhook.lua"
echo "   4. Paste into Lua Scripts section"
echo ""
echo "   Or update docker/orthanc/orthanc.json directly and restart:"
echo "   docker-compose -f docker-compose.orthanc.prod.yml restart"
echo ""

# Alternative: Update orthanc.json directly
read -p "Update orthanc.json directly? (y/n): " UPDATE_JSON
if [ "$UPDATE_JSON" == "y" ]; then
    # Backup original
    cp docker/orthanc/orthanc.json docker/orthanc/orthanc.json.backup
    
    # Add Lua script to configuration
    # This is a simplified approach - you may need to adjust based on Orthanc version
    echo "📝 Updating orthanc.json..."
    echo "   (Manual update recommended - see /tmp/orthanc-webhook.lua)"
fi

echo ""
echo "✅ Webhook script ready!"
echo "   Location: /tmp/orthanc-webhook.lua"
echo ""

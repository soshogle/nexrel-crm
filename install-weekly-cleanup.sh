#!/bin/bash
echo "🔧 Installing automated weekly cleanup..."

# Copy plist to LaunchAgents
cp /Users/cyclerun/Desktop/nexrel-crm/com.nexrel.cleanup.weekly.plist ~/Library/LaunchAgents/

# Load the agent
launchctl load ~/Library/LaunchAgents/com.nexrel.cleanup.weekly.plist

echo "✅ Installation complete!"
echo ""
echo "📋 Verification:"
launchctl list | grep com.nexrel.cleanup.weekly || echo "⚠️  Task not found in list (this is normal if it hasn't run yet)"

echo ""
echo "📝 The cleanup will run every Sunday at 5:00 AM"
echo "📁 Logs will be saved to:"
echo "   - /Users/cyclerun/Desktop/nexrel-crm/cleanup.log"
echo "   - /Users/cyclerun/Desktop/nexrel-crm/cleanup.error.log"

#!/bin/bash
# Cleanup script for Next.js build artifacts
# Run this weekly or when you need space

echo "🧹 Cleaning up build artifacts..."

# Delete Next.js build cache
if [ -d ".next" ]; then
    SIZE=$(du -sh .next | cut -f1)
    rm -rf .next
    echo "✅ Deleted .next folder (freed $SIZE)"
else
    echo "ℹ️  .next folder doesn't exist"
fi

# Clear npm cache (safe - npm will re-download packages when needed)
echo "🧹 Clearing npm cache..."
npm cache clean --force
echo "✅ npm cache cleared"

echo ""
echo "💾 Current space usage:"
du -sh node_modules .git 2>/dev/null | head -5

echo ""
echo "✅ Cleanup complete! Run 'npm run dev' to regenerate .next folder"

#!/bin/bash
# Quick validation script - Run before pushing to Vercel
# Checks TypeScript and optionally builds locally

echo "🔍 Validating code before push..."

# Type check (fast, no disk space)
echo "📝 Running TypeScript type check..."
npm run typecheck

if [ $? -ne 0 ]; then
    echo "❌ Type check failed! Fix errors before pushing."
    exit 1
fi

echo "✅ Type check passed!"

# Ask if user wants to build locally (optional)
read -p "Do you want to build locally to validate? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 Building locally..."
    npm run build
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed! Fix errors before pushing."
        exit 1
    fi
    
    echo "✅ Build successful!"
    echo "🧹 Cleaning up .next folder..."
    rm -rf .next
    echo "✅ Cleanup complete!"
fi

echo ""
echo "✅ Validation complete! Safe to push to Vercel."
echo "💡 Tip: Push to a feature branch first to get a preview deployment"

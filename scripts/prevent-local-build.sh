#!/bin/bash
# Prevents accidental local builds - redirects to dev mode instead

echo "⚠️  WARNING: Building locally uses ~4.2GB disk space!"
echo ""
echo "💡 Instead, use one of these options:"
echo "   1. Test locally: npm run dev"
echo "   2. Deploy to preview: git push origin feature/your-branch"
echo "   3. Deploy to production: git push origin master (Vercel builds automatically)"
echo ""
read -p "Do you really want to build locally? (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "✅ Build cancelled. Use 'npm run dev' for local testing instead."
    exit 1
fi

echo "🔨 Building locally (remember to run ./cleanup.sh after)..."
exec npm run build

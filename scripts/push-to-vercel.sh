#!/bin/bash
# Quick push to Vercel - bypasses local build
# Usage: ./scripts/push-to-vercel.sh "commit message"

set -e

MESSAGE="${1:-Quick update}"

echo "📦 Adding all changes..."
git add -A

echo "💾 Committing: $MESSAGE"
git commit -m "$MESSAGE" || echo "Nothing to commit"

echo "🚀 Pushing to GitHub (Vercel will auto-deploy)..."
git push origin master

echo "✅ Done! Check Vercel dashboard for build status."
echo "🔗 https://vercel.com/soshogle/nexrel-crm/deployments"

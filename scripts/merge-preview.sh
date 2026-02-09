#!/bin/bash
# Merges a preview branch to master and deploys to production

if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/merge-preview.sh <branch-name>"
    echo "   Example: ./scripts/merge-preview.sh feature/my-changes"
    exit 1
fi

BRANCH_NAME="$1"

echo "🔄 Merging preview branch to production..."
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Not on master branch. Switching..."
    git checkout master || git checkout main
fi

# Merge the branch
echo "📥 Merging $BRANCH_NAME into master..."
git merge "$BRANCH_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Merge failed! Please resolve conflicts manually."
    exit 1
fi

# Push to production
echo ""
echo "🚀 Deploying to production..."
git push origin master || git push origin main

echo ""
echo "✅ Deployed to production!"
echo "🔗 Check Vercel Dashboard for deployment status"
echo ""
echo "💡 Optional: Delete feature branch"
echo "   git branch -d $BRANCH_NAME"
echo "   git push origin --delete $BRANCH_NAME"

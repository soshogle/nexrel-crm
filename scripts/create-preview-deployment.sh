#!/bin/bash
# Automatically creates a feature branch and pushes for preview deployment

# Get current branch name or generate one
if [ -z "$1" ]; then
    BRANCH_NAME="feature/preview-$(date +%Y%m%d-%H%M%S)"
else
    BRANCH_NAME="feature/$1"
fi

echo "🚀 Creating preview deployment..."
echo ""

# Check if we're on master/main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "master" ] || [ "$CURRENT_BRANCH" = "main" ]; then
    echo "📝 Current branch: $CURRENT_BRANCH"
    echo "🔄 Creating feature branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
else
    echo "📝 Already on branch: $CURRENT_BRANCH"
    BRANCH_NAME="$CURRENT_BRANCH"
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    echo "⚠️  You have uncommitted changes. Staging them..."
    git add .
    
    echo ""
    read -p "Enter commit message (or press Enter for default): " COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Preview deployment: $(date +%Y-%m-%d\ %H:%M:%S)"
    fi
    
    git commit -m "$COMMIT_MSG"
fi

# Push to remote
echo ""
echo "📤 Pushing to GitHub..."
git push -u origin "$BRANCH_NAME"

echo ""
echo "✅ Preview deployment created!"
echo ""
echo "🔗 Next steps:"
echo "   1. Check Vercel Dashboard for preview URL"
echo "   2. Test the preview deployment"
echo "   3. If good, merge to master:"
echo "      git checkout master"
echo "      git merge $BRANCH_NAME"
echo "      git push origin master"
echo ""
echo "💡 Or use: ./scripts/merge-preview.sh $BRANCH_NAME"

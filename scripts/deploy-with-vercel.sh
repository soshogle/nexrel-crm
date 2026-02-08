#!/bin/bash

# Deploy to Vercel using CLI
# Run this script to deploy your code

set -e

echo "🚀 Deploying to Vercel..."
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Navigate to project
cd "$(dirname "$0")/.."

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

# Link project if needed
if [ ! -f .vercel/project.json ]; then
    echo "🔗 Linking project..."
    vercel link
fi

# Deploy to production
echo "🚀 Deploying to production..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check your deployment at: https://vercel.com/michael-mendezs-projects-15089219/nexrel-crm/deployments"

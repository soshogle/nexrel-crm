#!/bin/bash

# Script to run VNA Configuration migration
# This script loads environment variables and runs the migration

set -e

echo "🚀 Running VNA Configuration Migration"
echo "======================================"

# Change to project directory
cd "$(dirname "$0")/.."

# Load environment variables
if [ -f .env.local ]; then
    echo "📋 Loading .env.local..."
    export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
    echo "📋 Loading .env..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ No .env file found!"
    echo "Please create .env.local or .env with DATABASE_URL"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment!"
    echo "Please set DATABASE_URL in .env.local or .env"
    exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Run migration
echo "📦 Running Prisma migration..."
npx prisma migrate dev --name add_vna_configuration

echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart your development server"
echo "2. Test VNA configuration via Admin Dashboard"
echo "3. Create routing rules"
echo "4. Test workflow actions"

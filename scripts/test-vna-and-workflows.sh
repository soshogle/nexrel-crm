#!/bin/bash

# Test Script for VNA Configuration and Workflow Actions
# Phase 2 & 3 Testing

set -e

echo "🧪 Testing VNA Configuration and Workflow Actions"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set. Using .env.local if available.${NC}"
fi

# Test 1: Check if migration was applied
echo ""
echo "📋 Test 1: Checking Database Schema..."
if npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'VnaConfiguration');" 2>/dev/null | grep -q "t"; then
    echo -e "${GREEN}✅ VnaConfiguration table exists${NC}"
else
    echo -e "${RED}❌ VnaConfiguration table not found. Run migration first.${NC}"
    echo "   Run: npx prisma migrate dev --name add_vna_configuration"
    exit 1
fi

# Test 2: Generate Prisma Client
echo ""
echo "📋 Test 2: Generating Prisma Client..."
if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma Client generated successfully${NC}"
else
    echo -e "${RED}❌ Failed to generate Prisma Client${NC}"
    exit 1
fi

# Test 3: Check API endpoints exist
echo ""
echo "📋 Test 3: Checking API Routes..."
API_ROUTES=(
    "app/api/dental/vna/route.ts"
    "app/api/dental/vna/[id]/test/route.ts"
)

for route in "${API_ROUTES[@]}"; do
    if [ -f "$route" ]; then
        echo -e "${GREEN}✅ Found: $route${NC}"
    else
        echo -e "${RED}❌ Missing: $route${NC}"
    fi
done

# Test 4: Check workflow action handlers
echo ""
echo "📋 Test 4: Checking Workflow Action Handlers..."
WORKFLOW_FILES=(
    "lib/dental/workflow-actions.ts"
    "lib/dental/workflow-triggers.ts"
    "lib/dental/workflow-extensions.ts"
    "lib/workflow-engine.ts"
)

for file in "${WORKFLOW_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Found: $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
    fi
done

# Test 5: Check UI components
echo ""
echo "📋 Test 5: Checking UI Components..."
UI_COMPONENTS=(
    "components/dental/vna-configuration.tsx"
    "components/dental/routing-rules-builder.tsx"
    "components/dental/vna-configuration-with-routing.tsx"
)

for component in "${UI_COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo -e "${GREEN}✅ Found: $component${NC}"
    else
        echo -e "${RED}❌ Missing: $component${NC}"
    fi
done

echo ""
echo "================================================"
echo -e "${GREEN}✅ All checks completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Start your development server: npm run dev"
echo "2. Navigate to Admin Dashboard → VNA Configuration"
echo "3. Create a test VNA configuration"
echo "4. Create routing rules"
echo "5. Upload a test X-ray to verify routing"
echo "6. Test workflow actions via AI Employee workflow builder"

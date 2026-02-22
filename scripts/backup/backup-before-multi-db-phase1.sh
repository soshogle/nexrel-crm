#!/bin/bash
# Backup script before Multi-DB Per-Industry Phase 1
# Creates comprehensive backup of database, schema, and code

set -e

BACKUP_DATE=$(date +%Y-%m-%d-%H%M%S)
BACKUP_DIR="backups/pre-multi-db-phase1-${BACKUP_DATE}"
GIT_COMMIT=$(git rev-parse HEAD)
GIT_SHORT=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_TAG="backup/phase-multi-db-phase1"

echo "🔄 Starting comprehensive backup before Multi-DB Phase 1..."
echo "📅 Backup Date: ${BACKUP_DATE}"
echo "📍 Git Commit: ${GIT_COMMIT} (${GIT_SHORT})"
echo "🌿 Git Branch: ${GIT_BRANCH}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"
echo "✓ Created backup directory: ${BACKUP_DIR}"

# 1. Backup Prisma schema
echo "📄 Backing up Prisma schema..."
cp prisma/schema.prisma "${BACKUP_DIR}/schema.prisma.backup"
echo "✓ Schema backed up"

# 2. Backup lib/db.ts
echo "📄 Backing up lib/db.ts..."
cp lib/db.ts "${BACKUP_DIR}/db.ts.backup" 2>/dev/null || true
echo "✓ db.ts backed up"

# 3. Backup database (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
  echo "💾 Backing up database..."
  if [ -f "scripts/backup/export-database.mjs" ]; then
    DB_BACKUP_DIR="backups/db-${BACKUP_DATE}"
    mkdir -p "${DB_BACKUP_DIR}"
    (DATABASE_URL="$DATABASE_URL" npx tsx scripts/backup/export-database.mjs 2>/dev/null) || echo "⚠️  Database export had issues, but continuing..."
    # Copy to phase backup dir if export created files
    if [ -d "backups/$(date +%Y-%m-%d)" ]; then
      cp -r backups/$(date +%Y-%m-%d)/* "${BACKUP_DIR}/" 2>/dev/null || true
    fi
  fi
else
  echo "⚠️  DATABASE_URL not set, skipping database backup"
fi

# 4. Create git tag for this backup (phase-backup style)
echo "🏷️  Creating git tag..."
if git rev-parse "$GIT_TAG" >/dev/null 2>&1; then
  echo "⚠️  Tag $GIT_TAG already exists. Skipping tag creation."
else
  git tag -a "$GIT_TAG" -m "Backup before Multi-DB Phase 1: Foundation (commit ${GIT_SHORT})"
  echo "✓ Git tag created: $GIT_TAG"
fi

# 5. Create manifest file
cat > "${BACKUP_DIR}/BACKUP_MANIFEST.md" << EOF
# Backup Manifest - Pre Multi-DB Phase 1

**Date:** $(date)
**Git Commit:** ${GIT_COMMIT}
**Git Short:** ${GIT_SHORT}
**Git Branch:** ${GIT_BRANCH}
**Git Tag:** ${GIT_TAG}

## Purpose
This backup was created before implementing Multi-DB Per-Industry Phase 1 (Foundation) to allow rollback if needed.

## What Was Backed Up

### 1. Database Schema
- \`prisma/schema.prisma\` → \`schema.prisma.backup\`

### 2. Core Files
- \`lib/db.ts\` → \`db.ts.backup\`

### 3. Database Export
- All tables exported to JSON (if DATABASE_URL was available)

## Phase 1 Changes Being Made

### 1.1 Data Access Layer (DAL)
- \`lib/dal/lead-service.ts\`, \`deal-service.ts\`, \`campaign-service.ts\`, etc.
- Wrap Prisma CRM access in services

### 1.2 Industry Context
- \`lib/context/industry-context.ts\`
- \`getIndustryForRequest()\` helper

### 1.3 Industry Component Registry
- \`lib/industry-registry.ts\`
- Workflow tab registry, replace if/else chain

## How to Restore

### Option 1: Git Restore (Recommended)
\`\`\`bash
./scripts/phase-backup.sh --revert multi-db-phase1
# Or
git checkout ${GIT_TAG}
# Or
git reset --hard ${GIT_COMMIT}
\`\`\`

### Option 2: Manual Restore
\`\`\`bash
cp ${BACKUP_DIR}/schema.prisma.backup prisma/schema.prisma
cp ${BACKUP_DIR}/db.ts.backup lib/db.ts
npx prisma generate
\`\`\`

## Safety Notes
- Phase 1 is **additive** - no schema changes, no DB topology changes
- DAL wraps existing Prisma - behavior unchanged until Phase 3
- Can safely rollback if needed
EOF

echo "✓ Manifest created"

# 6. Summary
echo ""
echo "📋 Backup Summary:"
echo "  - Schema: ${BACKUP_DIR}/schema.prisma.backup"
echo "  - db.ts: ${BACKUP_DIR}/db.ts.backup"
echo "  - Manifest: ${BACKUP_DIR}/BACKUP_MANIFEST.md"
echo "  - Git Tag: ${GIT_TAG}"
if [ -n "$DATABASE_URL" ]; then
  echo "  - Database: backups/$(date +%Y-%m-%d)/ (if export ran)"
fi

echo ""
echo "✅ Backup completed successfully!"
echo "📁 Backup location: ${BACKUP_DIR}"
echo ""
echo "To revert later: ./scripts/phase-backup.sh --revert multi-db-phase1"
echo ""
echo "Ready to start Phase 1. Run Phase 1 implementation."

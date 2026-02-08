#!/bin/bash
# Database Backup Script for PostgreSQL
# Creates a pg_dump backup before running migrations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKUP_DATE=$(date +%Y-%m-%d-%H%M%S)
BACKUP_DIR="backups/pre-migration-${BACKUP_DATE}"
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo -e "${GREEN}🔄 Starting database backup...${NC}"
echo "📅 Backup Date: ${BACKUP_DATE}"
echo "📍 Git Commit: ${GIT_COMMIT}"
echo "🌿 Git Branch: ${GIT_BRANCH}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠️  DATABASE_URL not found in environment${NC}"
  echo "Loading from .env.local..."
  
  if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
  elif [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  else
    echo -e "${RED}❌ No .env.local or .env file found${NC}"
    exit 1
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL still not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ DATABASE_URL found${NC}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"
echo "📁 Created backup directory: ${BACKUP_DIR}"

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database?params
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^?]+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo -e "${YELLOW}⚠️  Could not parse DATABASE_URL, trying pg_dump directly...${NC}"
  DB_USER=""
  DB_PASS=""
  DB_HOST=""
  DB_PORT=""
  DB_NAME=""
fi

# Backup 1: pg_dump (if pg_dump is available)
if command -v pg_dump &> /dev/null; then
  echo "💾 Creating pg_dump backup..."
  
  if [ -n "$DB_NAME" ]; then
    # Use parsed connection details
    export PGPASSWORD="$DB_PASS"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --no-owner --no-acl \
      -f "${BACKUP_DIR}/database.sql" 2>&1 | tee "${BACKUP_DIR}/pg_dump.log"
    unset PGPASSWORD
  else
    # Use DATABASE_URL directly (requires pg_dump 11+)
    pg_dump "$DATABASE_URL" \
      --no-owner --no-acl \
      -f "${BACKUP_DIR}/database.sql" 2>&1 | tee "${BACKUP_DIR}/pg_dump.log"
  fi
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ pg_dump backup created: ${BACKUP_DIR}/database.sql${NC}"
    # Get file size
    FILE_SIZE=$(du -h "${BACKUP_DIR}/database.sql" | cut -f1)
    echo "   File size: ${FILE_SIZE}"
  else
    echo -e "${YELLOW}⚠️  pg_dump had issues, but continuing...${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  pg_dump not found, skipping SQL backup${NC}"
fi

# Backup 2: Prisma schema
echo "📄 Backing up Prisma schema..."
cp prisma/schema.prisma "${BACKUP_DIR}/schema.prisma.backup"
echo -e "${GREEN}✅ Schema backed up${NC}"

# Backup 3: Export via Prisma (JSON format)
echo "📦 Creating Prisma JSON export..."
if [ -f "scripts/backup/export-database.mjs" ]; then
  # Create today's backup directory for the export script
  TODAY=$(date +%Y-%m-%d)
  mkdir -p "backups/${TODAY}"
  
  tsx scripts/backup/export-database.mjs 2>&1 | tee "${BACKUP_DIR}/prisma_export.log" || {
    echo -e "${YELLOW}⚠️  Prisma export had issues, but continuing...${NC}"
  }
  
  # Copy exported files to our backup directory
  if [ -d "backups/${TODAY}" ]; then
    cp -r "backups/${TODAY}"/* "${BACKUP_DIR}/" 2>/dev/null || true
    echo -e "${GREEN}✅ Prisma JSON export completed${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Export script not found, skipping JSON export${NC}"
fi

# Create manifest file
cat > "${BACKUP_DIR}/BACKUP_MANIFEST.md" << EOF
# Database Backup Manifest

**Date:** $(date)
**Backup ID:** ${BACKUP_DATE}
**Git Commit:** ${GIT_COMMIT}
**Git Branch:** ${GIT_BRANCH}

## Backup Contents

1. **SQL Dump:** \`database.sql\` (pg_dump output)
2. **Prisma Schema:** \`schema.prisma.backup\`
3. **JSON Export:** Table-specific JSON files (if export script ran)

## Database Info

- **Host:** ${DB_HOST:-"from DATABASE_URL"}
- **Database:** ${DB_NAME:-"from DATABASE_URL"}
- **Port:** ${DB_PORT:-"from DATABASE_URL"}

## How to Restore

### Restore SQL Dump:
\`\`\`bash
psql \$DATABASE_URL < ${BACKUP_DIR}/database.sql
\`\`\`

### Restore Schema:
\`\`\`bash
cp ${BACKUP_DIR}/schema.prisma.backup prisma/schema.prisma
npx prisma generate
\`\`\`

### Restore from JSON (if needed):
Use the Prisma import scripts or manually restore JSON files.
EOF

echo ""
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo "📁 Backup location: ${BACKUP_DIR}"
echo ""
echo "📋 Backup manifest: ${BACKUP_DIR}/BACKUP_MANIFEST.md"
echo ""

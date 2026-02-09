#!/bin/bash
# Database Backup Script for Neon PostgreSQL
# Creates a backup before running migrations

echo "🔄 Creating database backup..."

# Get database URL from .env
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DB_URL" ]; then
    echo "❌ DATABASE_URL not found in .env file"
    exit 1
fi

# Create backup directory
BACKUP_DIR="backups/pre-twilio-failover-$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Extract connection details
# Neon URLs are in format: postgresql://user:pass@host/db?sslmode=require
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "📦 Backing up database: $DB_NAME"
echo "📁 Backup directory: $BACKUP_DIR"

# Use pg_dump to create backup
# Note: You may need to install postgresql-client or use Neon's backup feature
pg_dump "$DB_URL" > "$BACKUP_DIR/database_backup.sql" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_DIR/database_backup.sql"
    echo "📊 Backup size: $(du -h $BACKUP_DIR/database_backup.sql | cut -f1)"
else
    echo "⚠️  pg_dump failed. Trying alternative method..."
    echo "💡 Consider using Neon's built-in backup feature in the dashboard"
    echo "   Or use: Neon Console → Branches → Create Branch (as backup)"
fi

echo ""
echo "🔒 IMPORTANT: Keep this backup safe!"
echo "📝 Backup location: $BACKUP_DIR/database_backup.sql"

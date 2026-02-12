# Backup Manifest: Pre–AI Team Workflow Integration

**Backup ID:** pre-ai-team-workflow-integration-20260211-180859  
**Created:** February 11, 2026  
**Purpose:** Full backup before integrating "Your AI Team" employees into the workflow builder (Unified List approach)

---

## Backup Contents

| Item | Path | Description |
|------|------|-------------|
| Prisma Schema | `schema.prisma` | Database schema (before UserAIEmployee model) |
| AI Employees Page | `ai-employees/` | Dashboard page and AI Team logic |
| Workflow Components | `workflows/` | Industry workflow builder, task editor, etc. |
| Real Estate Workflows | `real-estate-workflows/` | RE task editor, types |
| Workflow Lib | `lib-workflows/` | Industry configs, hitl service |
| RE Task Executor | `workflow-task-executor.ts` | Real Estate workflow execution |
| Workflow APIs | `api-workflows/` | Workflow CRUD and execution APIs |
| AI Employee APIs | `api-ai-employees/` | AI employee APIs |
| Auth Components | `components-auth/` | Forgot password form, etc. |

---

## Restore Instructions

### Restore a single file (example: schema)
```bash
cp backups/pre-ai-team-workflow-integration-20260211-180859/schema.prisma prisma/schema.prisma
```

### Restore workflow components
```bash
cp -r backups/pre-ai-team-workflow-integration-20260211-180859/workflows/* components/workflows/
cp backups/pre-ai-team-workflow-integration-20260211-180859/real-estate-workflows/* components/real-estate/workflows/
```

### Restore AI employees page
```bash
cp -r backups/pre-ai-team-workflow-integration-20260211-180859/ai-employees/* app/dashboard/ai-employees/
```

---

## Database Backup (Recommended)

Before running any migrations, create a Neon branch backup:

1. Go to https://console.neon.tech
2. Select your project
3. Branches → Create Branch
4. Name: `backup-pre-ai-team-integration-20260211`

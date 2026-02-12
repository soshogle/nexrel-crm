# AI Team Workflow Integration – Build Phases

**Approach:** Unified List – existing workflows keep working; AI Team employees become additional assignable options in the workflow builder.

**Goal:** Make "Your AI Team" employees selectable in the workflow task editor and usable during execution (especially voice calls), while keeping drag-and-drop and current workflow behavior unchanged.

---

## Phase 1: Persist AI Team (Database + API)

**Objective:** Move AI Team employees from localStorage to the database so they can be referenced by workflows.

### 1.1 Schema

- Add `UserAIEmployee` model (or extend existing `AIEmployee` if appropriate):
  - `id`, `userId`, `profession`, `customName`, `voiceAgentId`, `isActive`, `capabilities` (JSON), `createdAt`, `updatedAt`
- Run migration

### 1.2 API

- `GET /api/ai-employees/user` – list current user’s AI Team employees
- `POST /api/ai-employees/user` – create
- `PATCH /api/ai-employees/user/[id]` – update (name, voice agent, active)
- `DELETE /api/ai-employees/user/[id]` – delete

### 1.3 AI Team Tab Migration

- Replace localStorage read/write with API calls
- One-time migration: on load, if localStorage has data and API returns empty, POST employees to API and clear localStorage
- Update add/remove/update/toggle handlers to use API

**Deliverable:** AI Team employees stored in DB and managed via API; AI Team tab works as before but backed by DB.

---

## Phase 2: Unified List in Task Editor (Industry Workflows)

**Objective:** Show AI Team employees alongside industry agents in the "Assign AI Agent" dropdown for non–Real Estate workflows.

### 2.1 Task Editor Changes

- In `components/workflows/task-editor-panel.tsx`:
  - Fetch user’s AI Team employees (e.g. from `/api/ai-employees/user`)
  - Extend the "Assign AI Agent" dropdown:
    - Section 1: Industry agents (from `industryConfig.aiAgents`)
    - Section 2: "My AI Team" (from API)
  - Use a prefix or flag to distinguish sources (e.g. `industry:appointment_scheduler` vs `ai_team:clxyz123`)

### 2.2 Task Data Model

- Add `assignedAIEmployeeId` (nullable) to `WorkflowTask` schema
- Keep `assignedAgentId` / `assignedAgentType` for industry agents
- Migration to add new column

### 2.3 Workflow APIs

- Update `POST /api/workflows` and `PATCH /api/workflows/[id]/tasks` to accept and persist `assignedAIEmployeeId`
- Ensure GET responses include `assignedAIEmployeeId` for tasks

**Deliverable:** Industry workflows can assign either industry agents or AI Team employees; assignments are saved and loaded correctly.

---

## Phase 3: Unified List in Task Editor (Real Estate Workflows)

**Objective:** Same unified list behavior for Real Estate workflows.

### 3.1 RE Task Editor

- In `components/real-estate/workflows/task-editor-panel.tsx`:
  - Fetch AI Team employees
  - Add "My AI Team" section to the assign dropdown
  - Use same prefix convention (`ai_team:id`)

### 3.2 RE Schema / Types

- Add `assignedAIEmployeeId` to RE workflow task structure if it uses a different model
- If RE uses generic `WorkflowTask`, Phase 2 schema changes apply

### 3.3 RE Workflow APIs

- Ensure RE workflow routes accept and return `assignedAIEmployeeId` where applicable

**Deliverable:** Real Estate workflows can assign AI Team employees in addition to RE agents.

---

## Phase 4: Execution Support (Voice + Other Channels)

**Objective:** When a workflow runs a task assigned to an AI Team employee, use that employee’s Voice AI agent (or config) for execution.

### 4.1 Execution Logic

- In workflow task executor (industry and/or RE):
  - Before running a voice task, check:
    - If `assignedAIEmployeeId` is set → load `UserAIEmployee` by ID
    - If `voiceAgentId` is set → use that Voice Agent for the call
    - If not set → fall back to existing logic (industry agent or RE agent)
  - Apply same pattern for other channels (email, SMS, etc.) if they use agent-specific config

### 4.2 Fallbacks

- If AI Team employee is deleted → treat as unassigned; log warning
- If `voiceAgentId` is null → skip voice call or use default agent per existing rules

**Deliverable:** Tasks assigned to AI Team employees execute correctly, including voice calls using the assigned agent.

---

## Phase 5: Task Type Filtering (Optional)

**Objective:** Filter or prioritize AI Team employees by capability/permission for specific task types.

### 5.1 Capability Mapping

- Define which professions can fulfill which task types (e.g. voice → Virtual Receptionist, Sales Rep)
- Add optional `capabilities` JSON to `UserAIEmployee` (e.g. `{ voice: true, email: true }`)

### 5.2 UI Filtering

- In task editor, when task type is known (e.g. voice call):
  - Option A: Only show AI Team employees that support that task type
  - Option B: Show all but highlight or sort suitable ones

### 5.3 Validation

- Before execution: if assigned AI Team employee lacks capability for the task type, log warning and optionally skip or use fallback

**Deliverable:** Better UX and correctness when assigning AI Team employees to voice, email, etc.

---

## Phase 6: UI Polish (Optional)

**Objective:** Improve visibility and clarity of AI Team assignments in the workflow builder.

### 6.1 Task Node Display

- Show a small badge or icon when a task is assigned to an AI Team employee (e.g. "My Team")
- Show employee name or profession on the node

### 6.2 Empty State

- If user has no AI Team employees and opens the assign dropdown:
  - Show "Hire an AI Employee" with a link to the AI Team tab

### 6.3 Drag-and-Drop

- No changes required if assignment is done in the task editor panel
- Optional: ensure task nodes reflect the assignment source (industry vs AI Team) visually

**Deliverable:** Clearer UX in the workflow builder.

---

## Implementation Order Summary

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Persist AI Team (DB + API + migration from localStorage) | None |
| 2 | Unified list in industry workflow task editor | Phase 1 |
| 3 | Unified list in Real Estate task editor | Phase 1, 2 |
| 4 | Execution support (voice, etc.) | Phase 1, 2, 3 |
| 5 | Task type filtering (optional) | Phase 2, 3 |
| 6 | UI polish (optional) | Phase 2, 3, 4 |

---

## Files to Modify (by Phase)

### Phase 1
- `prisma/schema.prisma`
- `app/api/ai-employees/user/route.ts` (new)
- `app/api/ai-employees/user/[id]/route.ts` (new)
- `app/dashboard/ai-employees/page.tsx`

### Phase 2
- `prisma/schema.prisma` (WorkflowTask)
- `components/workflows/task-editor-panel.tsx`
- `app/api/workflows/route.ts`
- `app/api/workflows/[id]/route.ts`
- `app/api/workflows/[id]/tasks/route.ts`

### Phase 3
- `components/real-estate/workflows/task-editor-panel.tsx`
- `components/real-estate/workflows/types.ts`
- RE workflow API routes (if different from generic)

### Phase 4
- `lib/workflows/workflow-task-executor.ts` (or equivalent)
- `lib/real-estate/workflow-task-executor.ts`

### Phase 5–6
- Task editor components, workflow types, optional config files

---

## Rollback

If issues arise:

1. Restore from backup: `backups/pre-ai-team-workflow-integration-20260211-180859/`
2. Revert migrations if needed (or keep schema and disable new features via feature flag)
3. For DB: use Neon branch backup if created

---

## Backup Location

```
backups/pre-ai-team-workflow-integration-20260211-180859/
```

See `BACKUP_MANIFEST.md` in that directory for restore instructions.

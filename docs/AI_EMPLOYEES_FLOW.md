# AI Employees & AI Team — Flow and Architecture

## Overview

The AI Employees system provides automated assistants that work 24/7 for your business. There are three main types:

1. **AI Team (Professional)** — General-purpose AI (Accountant, Developer, Admin Assistant, etc.)
2. **RE Team (Real Estate)** — Real estate–specific (Speed to Lead, Sphere Nurture, etc.)
3. **Industry Team** — Industry-specific (Dental, Medical, Restaurant, etc.): Appointment Scheduler, Patient Coordinator, Billing Specialist, etc.

---

## High-Level Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AI EMPLOYEES DASHBOARD                                    │
│  /dashboard/ai-employees                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │   AI Team    │  │   RE Team    │  │ Industry Team│
            │ (Professional)│  │ (Real Estate)│  │(Dental, Med) │
            └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                   │                 │                 │
                   ▼                 ▼                 ▼
            ┌──────────────────────────────────────────────────┐
            │              PROVISIONING                          │
            │  • Assign voice agent (ElevenLabs)                 │
            │  • Assign phone number (Twilio)                    │
            │  • Creates IndustryAIEmployeeAgent /              │
            │    REAIEmployeeAgent / ProfessionalAIEmployeeAgent │
            └──────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │ Manage Tasks │  │ Auto-Run     │  │ Run Now      │
            │ (toggle,     │  │ (workflow    │  │ (manual run) │
            │  schedule,   │  │  trigger)    │  │              │
            │  templates)  │  │              │  │              │
            └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Auto-Run Toggle ↔ Workflows

### How Auto-Run Connects to Workflows

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  AUTO-RUN TOGGLE (per AI employee)                                                │
│  Stored in: AIEmployeeAutoRun (userId, employeeType, industry, autoRunEnabled,   │
│             workflowId)                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                    When user enables Auto-Run (ON)
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  API: PATCH /api/ai-employees/auto-run                                            │
│  • Creates/updates AIEmployeeAutoRun record                                      │
│  • If no workflow exists → creates default workflow                              │
│  • Links workflowId to AIEmployeeAutoRun                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
            ┌──────────────────┐              ┌──────────────────┐
            │  REAL ESTATE     │              │  INDUSTRY        │
            │  createDefault   │              │  createDefault    │
            │  SpeedToLead     │              │  IndustryContact  │
            │  Workflow()      │              │  Workflow()       │
            └────────┬─────────┘              └────────┬─────────┘
                     │                                  │
                     ▼                                  ▼
            REWorkflowTemplate                 WorkflowTemplate
            (RE-specific steps)                 (industry-specific)
```

### Trigger Flow: When Does the Workflow Run?

```
                    EVENT: New Lead Created
                    (e.g. form submit, widget)
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  triggerAutoRunOnLeadCreatedForUser(userId, leadId, userIndustry)                │
│  (called from lead creation flows)                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
            REAL_ESTATE / null                  Other industries
                    │                                   │
                    ▼                                   ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ triggerAutoRunOnLeadCreated  │    │ triggerIndustryAutoRunOnLead  │
│ • Find AIEmployeeAutoRun      │    │ • Find AIEmployeeAutoRun      │
│   where autoRunEnabled=true  │    │   where industry=X,           │
│   and workflowId not null    │    │   autoRunEnabled=true         │
│ • For each: start RE         │    │ • For each: start Industry    │
│   workflow instance          │    │   workflow instance            │
└──────────────────────────────┘    └──────────────────────────────┘
                    │                                   │
                    ▼                                   ▼
            startWorkflowInstance()           startIndustryWorkflowInstance()
            (RE workflow engine)               (industry workflow engine)
```

---

## Examples: AI Employee Connected to Workflow

### Example 1: Dental — Appointment Scheduler + Auto-Run

1. **Setup**: User provisions "Sarah" (Appointment Coordinator) for their dental practice.
2. **Enable Auto-Run**: User toggles Auto-Run ON for Appointment Scheduler.
3. **System**: Creates default industry contact workflow (e.g. welcome SMS → follow-up call).
4. **Trigger**: New patient submits contact form.
5. **Result**: Workflow starts automatically; AI employee sends welcome SMS, schedules call, etc.

### Example 2: Real Estate — Speed to Lead + Auto-Run

1. **Setup**: User provisions Speed to Lead agent.
2. **Enable Auto-Run**: User toggles Auto-Run ON.
3. **System**: Creates default Speed to Lead workflow (immediate SMS, then call).
4. **Trigger**: New buyer/seller lead comes in.
5. **Result**: Workflow starts; AI calls/ texts lead within minutes.

### Example 3: Medical — Patient Coordinator + Auto-Run

1. **Setup**: User provisions Patient Coordinator for medical practice.
2. **Enable Auto-Run**: User toggles Auto-Run ON.
3. **System**: Creates default industry workflow.
4. **Trigger**: New patient books appointment or submits inquiry.
5. **Result**: Workflow sends intake SMS, follow-up email, etc.

---

## Manage Tasks vs. Scheduled Runs

### Two Ways AI Employees Execute Tasks

| Method | Trigger | Where Configured |
|--------|---------|------------------|
| **Auto-Run (Workflows)** | Event-driven (e.g. new lead) | Auto-Run toggle → Workflows tab |
| **Scheduled / Manual** | Cron (daily at X time) or "Run now" | Manage Tasks dialog |

### Manage Tasks Dialog

- **Location**: Open an AI employee card (Industry Team or RE Team) → click **Manage Tasks**.
- **Contents**:
  - **Duties & tasks**: Toggle which tasks run (e.g. appointment reminders, billing follow-ups).
  - **Per-task schedules**: Set daily run time (e.g. 5pm) for each task.
  - **Message templates**: Customize SMS/email for outreach.
  - **Custom tasks**: Add your own jobs (e.g. "Send insurance claims daily at 5pm").
  - **Run tasks now**: Manual trigger.

### Tab Confusion

- **"Manage Tasks" tab** in the AI Employees page = **Task Manager** (human tasks, Kanban, etc.).
- **"Manage Tasks" button** on an AI employee card = **AI Employee Task Dashboard** (toggles, schedules, templates, custom tasks).

---

## Data Flow Summary

```
User enables Auto-Run
    → AIEmployeeAutoRun created/updated
    → Default workflow created if none
    → workflowId linked

New lead created
    → triggerAutoRunOnLeadCreatedForUser()
    → Finds enabled AIEmployeeAutoRun records
    → Starts linked workflow
    → Workflow steps execute (SMS, call, email, etc.)

User clicks "Run tasks now" or cron runs
    → executeIndustryEmployee() / executeREEmployee()
    → Runs built-in executors (appointment reminders, etc.)
    → Runs enabled custom tasks (SMS to recent leads)
```

---

## Files Reference

| Component | Path |
|-----------|------|
| Auto-Run API | `app/api/ai-employees/auto-run/route.ts` |
| Auto-Run Triggers | `lib/ai-employees/auto-run-triggers.ts` |
| Industry Run | `lib/ai-employees/run-industry-employee.ts` |
| Task Config API | `app/api/ai-employees/task-config/route.ts` |
| Task Dashboard UI | `components/ai-employees/task-dashboard-dialog.tsx` |
| Cron (scheduled runs) | `app/api/cron/ai-employees-daily/route.ts` |

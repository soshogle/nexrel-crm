# Call Workflow Templates

This document describes the call-related workflow templates available in the dental CRM system. These workflows automate common call scenarios and integrate with the Twilio + ElevenLabs voice AI system.

## Overview

Call workflow templates are pre-configured workflows that automatically trigger based on call events. They help streamline patient communication, follow-up processes, and ensure no calls go unaddressed.

## Available Call Workflow Templates

### 1. Incoming Call - Patient Follow-up
**Trigger:** `INCOMING_CALL`  
**Description:** Automatically follow up after patient calls  
**Actions:**
- Create call note immediately
- Send SMS thank you message (5 minutes after call)
- Schedule callback if needed (1 day after call)

**Use Case:** Ensures every incoming call is properly documented and followed up.

### 2. Appointment Reminder Call
**Trigger:** `APPOINTMENT_SCHEDULED`  
**Description:** Call patients to remind them of upcoming appointments  
**Actions:**
- Make reminder call (1 week before appointment)
- Send SMS backup if call fails (5 minutes after call attempt)
- Make final reminder call (1 day before appointment)

**Use Case:** Reduces no-shows by proactively reminding patients of appointments.

### 3. Post-Appointment Follow-up Call
**Trigger:** `APPOINTMENT_COMPLETED`  
**Description:** Call patients after appointment to check on recovery  
**Actions:**
- Make follow-up call (1 day after appointment)
- Create call note (5 minutes after call)
- Send SMS alternative if call not answered (1 day after)

**Use Case:** Shows care and helps identify any post-treatment issues early.

### 4. Missed Appointment Follow-up
**Trigger:** `APPOINTMENT_NO_SHOW`  
**Description:** Call patients who missed their appointment  
**Actions:**
- Make follow-up call (1 hour after missed appointment)
- Send SMS follow-up (5 minutes after call)
- Try to reschedule (1 day after missed appointment)

**Use Case:** Recovers lost appointments and maintains patient relationships.

### 5. Treatment Plan Discussion Call
**Trigger:** `TREATMENT_PLAN_CREATED`  
**Description:** Call patients to discuss treatment plans  
**Actions:**
- Make immediate call to discuss plan
- Send SMS with treatment plan link (5 minutes after call)
- Schedule callback if needed (1 day after)

**Use Case:** Ensures patients understand their treatment options and can ask questions.

### 6. Emergency Call Handling
**Trigger:** `INCOMING_CALL`  
**Description:** Handle emergency calls with immediate response  
**Actions:**
- Create call note immediately
- Notify team member immediately
- Schedule urgent appointment immediately

**Use Case:** Ensures emergency calls get immediate attention and proper escalation.

### 7. Post-Procedure Check-in Call
**Trigger:** `PROCEDURE_COMPLETED`  
**Description:** Call patients after procedures to check recovery  
**Actions:**
- Make check-in call (1 day after procedure)
- Create call note (5 minutes after call)
- Make follow-up call (3 days after procedure)

**Use Case:** Monitors patient recovery and provides peace of mind.

### 8. Payment Reminder Call
**Trigger:** `PAYMENT_FAILED`  
**Description:** Call patients with outstanding balances  
**Actions:**
- Make immediate payment reminder call
- Send SMS with payment link (5 minutes after call)
- Make follow-up call (1 day after)

**Use Case:** Improves collection rates by proactively addressing payment issues.

## How to Use

1. **Access Templates:** Navigate to the Workflows section and select "Call Workflows" category
2. **Select Template:** Choose a template that matches your needs
3. **Customize:** Modify actions, delays, and conditions as needed
4. **Activate:** Enable the workflow to start automatically triggering

## Integration with Voice AI

These workflows integrate seamlessly with:
- **Twilio:** For call routing and handling
- **ElevenLabs:** For AI-powered call interactions
- **Enhanced Call Handler:** For patient matching and screen pops

## Workflow Triggers

### Automatic Triggers
- `INCOMING_CALL`: Triggered when a call comes in
- `CALL_COMPLETED`: Triggered when a call ends successfully
- `MISSED_CALL`: Triggered when a call is not answered

### Event-Based Triggers
- `APPOINTMENT_SCHEDULED`: When an appointment is booked
- `APPOINTMENT_COMPLETED`: When an appointment finishes
- `APPOINTMENT_NO_SHOW`: When a patient doesn't show up
- `TREATMENT_PLAN_CREATED`: When a treatment plan is created
- `PROCEDURE_COMPLETED`: When a procedure is completed
- `PAYMENT_FAILED`: When a payment fails

## Workflow Actions

### Call Actions
- `MAKE_PHONE_CALL`: Initiate an outbound call
- `CREATE_CALL_NOTE`: Document call details
- `SCHEDULE_CALLBACK`: Schedule a follow-up call

### Communication Actions
- `SEND_SMS`: Send text message
- `SEND_APPOINTMENT_REMINDER`: Send appointment reminder

### Administrative Actions
- `NOTIFY_TEAM_MEMBER`: Alert staff members
- `RESCHEDULE_APPOINTMENT`: Reschedule appointments
- `SCHEDULE_APPOINTMENT`: Create new appointments

## Best Practices

1. **Test Workflows:** Test each workflow with a small number of calls before full deployment
2. **Monitor Performance:** Review workflow execution logs regularly
3. **Customize Delays:** Adjust delay times based on your practice's needs
4. **Combine Templates:** Use multiple workflows together for comprehensive coverage
5. **Review Regularly:** Update workflows based on patient feedback and call outcomes

## Technical Details

### Workflow Engine
Workflows are executed by the `WorkflowEngine` class which:
- Monitors for trigger events
- Creates workflow instances
- Executes tasks in sequence
- Handles delays and conditions
- Logs all executions

### Call Integration
The `EnhancedCallHandler` class:
- Matches incoming calls to patients
- Triggers workflows automatically
- Provides screen pop data
- Routes calls based on rules

### Database Models
- `WorkflowTemplate`: Defines workflow structure
- `WorkflowInstance`: Tracks running workflows
- `TaskExecution`: Logs individual task executions
- `CallLog`: Records all call events

## Support

For questions or issues with call workflows:
1. Check workflow execution logs
2. Review call logs for trigger events
3. Verify workflow is active and properly configured
4. Contact support if issues persist

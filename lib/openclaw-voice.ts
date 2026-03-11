export const OPENCLAW_MODES = [
  "work_ai_orchestrator",
  "execution_chain",
  "approval_voice",
  "daily_command_center",
  "meeting_call_intelligence",
  "performance_coaching",
  "vertical_playbook",
  "autonomous_mode",
  "team_ops",
  "customer_voice_workflow",
] as const;

export type OpenClawMode = (typeof OPENCLAW_MODES)[number];

export function buildOpenClawRecoverySuggestion(
  errorMessage: string,
  params: any,
) {
  const text = String(errorMessage || "").toLowerCase();
  if (text.includes("email") && !params?.email) {
    return "Missing email. I can proceed using phone only, or you can provide an email now.";
  }
  if (text.includes("phone") && !params?.phone) {
    return "Missing phone number. I can continue with email-only follow-up, or you can provide a phone number.";
  }
  if (text.includes("name") && !params?.contactName && !params?.name) {
    return "I need a contact name to continue. Tell me the full name and I will retry.";
  }
  return "I can retry with corrected fields. Tell me what to update and I will continue from the failed step.";
}

export function getVerticalPlaybookSteps(vertical: "dental" | "real_estate") {
  if (vertical === "real_estate") {
    return [
      { name: "Trigger: New lead created", taskType: "TRIGGER" },
      { name: "Send showing availability SMS", taskType: "SMS" },
      { name: "Wait 1 day", taskType: "DELAY" },
      { name: "Call lead for qualification", taskType: "VOICE_CALL" },
      { name: "Create pipeline follow-up task", taskType: "CREATE_TASK" },
    ];
  }
  return [
    { name: "Trigger: Appointment no-show", taskType: "TRIGGER" },
    { name: "Send no-show rescue SMS", taskType: "SMS" },
    { name: "Wait 2 days", taskType: "DELAY" },
    { name: "Send treatment follow-up email", taskType: "EMAIL" },
    { name: "Create recall callback task", taskType: "CREATE_TASK" },
  ];
}

export function getCustomerWorkflowSteps() {
  return [
    { name: "Trigger: inbound call received", taskType: "TRIGGER" },
    { name: "Qualify caller intent", taskType: "CUSTOM" },
    { name: "FAQ response branch", taskType: "CUSTOM" },
    { name: "Booking step", taskType: "CREATE_TASK" },
    { name: "Human handoff if escalation needed", taskType: "CUSTOM" },
    { name: "Sync captured data to CRM", taskType: "CREATE_TASK" },
  ];
}

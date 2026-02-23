# Voice AI Agent Verification – Troubleshooting Guide

When you see **"Failed to set up agent"** on the AI Employees page after clicking **Test Agent**, use this guide to diagnose and fix the issue.

---

## Quick Checklist

| Check | How to Verify |
|-------|---------------|
| **1. Environment variables** | Ensure Soshogle Voice AI API key is set in your deployment |
| **2. User industry** | Real Estate agents (Sarah, Michael, etc.) require `industry: REAL_ESTATE` |
| **3. Soshogle Voice AI API** | Verify the API key is valid and has conversational AI access |
| **4. Browser console** | Open DevTools → Console for detailed error messages |

---

## Common Causes & Solutions

### 1. "Soshogle AI voice is not configured"

**Cause:** Missing Soshogle Voice AI API key.

**Solution:**
- Add the API key to your environment (Vercel, `.env.local`, etc.)
- Restart the app after adding the variable

---

### 2. "This feature is only available for Real Estate users"

**Cause:** You're trying to provision a Real Estate AI employee (e.g. Sarah – Speed to Lead Specialist) but your account industry is not set to Real Estate.

**Solution:**
- Go to **Settings** or **Onboarding** and set your industry to **Real Estate**
- Or use the **AI Team** tab for Professional AI employees (Accountant, Developer, etc.), which are available to all users

---

### 3. "Soshogle Voice AI create failed: ..."

**Cause:** Soshogle Voice AI API rejected the request. Common reasons:
- Invalid or expired API key
- Rate limit exceeded
- Account doesn’t have conversational AI access

**Solution:**
- Check your Soshogle Voice AI configuration in Settings
- Confirm your plan includes conversational AI
- If you see rate limits, wait a few minutes and try again

---

### 4. "Please sign in"

**Cause:** Session expired or not authenticated.

**Solution:**
- Sign out and sign back in
- Clear cookies and try again

---

### 5. "Voice agent not found" (after successful provision)

**Cause:** The agent was provisioned but the preview page couldn’t find it. This can happen if the voice-agents API doesn’t include RE/Professional agents.

**Solution:**
- Ensure you’re on the latest code (RE and Professional agents are now included in the voice-agents list)
- Refresh the page and try Test Agent again

---

## Verifying Your Setup

### Check environment variables (local)

Ensure the Soshogle Voice AI API key is set in your environment.

### Test the provision API directly

```bash
# Replace with your session cookie if needed
curl -X POST https://your-domain.com/api/real-estate/ai-employees/provision \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"employeeTypes": ["RE_SPEED_TO_LEAD"]}'
```

### Check server logs

When provisioning fails, the server logs the underlying error. Look for agent creation or provisioning errors.

---

## Error Messages (Improved)

The UI now shows more specific errors instead of a generic "Failed to set up agent". You may see:

| Error | Meaning |
|-------|---------|
| `Soshogle AI voice is not configured` | Missing Soshogle Voice AI API key |
| `This feature is only available for Real Estate users` | Account industry is not Real Estate |
| `Soshogle Voice AI create failed: 401` | Invalid API key |
| `Soshogle Voice AI create failed: 429` | Rate limited – wait and retry |
| `Please sign in` | Session expired |

---

## Related Documentation

- [VOICE_AGENT_SETUP.md](../VOICE_AGENT_SETUP.md) – Full Sarah voice agent setup
- [TWILIO_WEBHOOKS_VERIFICATION.md](../TWILIO_WEBHOOKS_VERIFICATION.md) – Soshogle Call webhook configuration

---

*Last updated: February 2026*

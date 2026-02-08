# Workflow Channel Type Filtering Guide

## Overview

Workflows can now filter by channel type, allowing you to create workflows that run only for specific messaging channels (Instagram, Messenger, WhatsApp, SMS, Email, etc.).

## How It Works

When a message is received, workflows receive the `channelType` in their context variables:
- `INSTAGRAM` - Instagram Direct Messages
- `FACEBOOK_MESSENGER` - Facebook Messenger
- `WHATSAPP` - WhatsApp Business
- `SMS` - SMS messages
- `EMAIL` - Email messages

## Configuring Channel Filters

### Option 1: Run for All Channels (Default)
If you don't specify `channelTypes` in the workflow's `triggerConfig`, the workflow will run for **all channels**.

```json
{
  "triggerConfig": {
    // No channelTypes specified = runs for all channels
  }
}
```

### Option 2: Run Only for Instagram
To run a workflow only when Instagram messages are received:

```json
{
  "triggerConfig": {
    "channelTypes": ["INSTAGRAM"]
  }
}
```

### Option 3: Run Only for Messenger
To run a workflow only when Messenger messages are received:

```json
{
  "triggerConfig": {
    "channelTypes": ["FACEBOOK_MESSENGER"]
  }
}
```

### Option 4: Run for Multiple Channels
To run a workflow for Instagram and Messenger (but not other channels):

```json
{
  "triggerConfig": {
    "channelTypes": ["INSTAGRAM", "FACEBOOK_MESSENGER"]
  }
}
```

## Example Use Cases

### Example 1: Instagram-Specific Auto-Reply
```json
{
  "name": "Instagram Welcome Message",
  "triggerType": "MESSAGE_RECEIVED",
  "triggerConfig": {
    "channelTypes": ["INSTAGRAM"]
  },
  "actions": [
    {
      "type": "SEND_MESSAGE",
      "message": "Thanks for reaching out on Instagram! We'll get back to you soon."
    }
  ]
}
```

### Example 2: Messenger-Specific Workflow
```json
{
  "name": "Messenger Quick Response",
  "triggerType": "MESSAGE_RECEIVED",
  "triggerConfig": {
    "channelTypes": ["FACEBOOK_MESSENGER"]
  },
  "actions": [
    {
      "type": "SEND_MESSAGE",
      "message": "Hi! Thanks for messaging us on Facebook Messenger."
    }
  ]
}
```

### Example 3: Multi-Channel Workflow
```json
{
  "name": "Social Media Auto-Reply",
  "triggerType": "MESSAGE_RECEIVED",
  "triggerConfig": {
    "channelTypes": ["INSTAGRAM", "FACEBOOK_MESSENGER", "WHATSAPP"]
  },
  "actions": [
    {
      "type": "SEND_MESSAGE",
      "message": "Thanks for contacting us! We'll respond shortly."
    }
  ]
}
```

## Supported Channel Types

- `INSTAGRAM` - Instagram Direct Messages
- `FACEBOOK_MESSENGER` - Facebook Messenger
- `WHATSAPP` - WhatsApp Business
- `SMS` - SMS messages
- `EMAIL` - Email messages
- `GOOGLE_BUSINESS` - Google Business Messages
- `WEBSITE_CHAT` - Website chat widget

## How Messages Are Routed

When a workflow sends a message via the `SEND_MESSAGE` action:
1. The workflow checks the conversation's `channelType`
2. Routes to the appropriate service:
   - `INSTAGRAM` → InstagramService → Instagram API
   - `FACEBOOK_MESSENGER` → FacebookMessengerService → Messenger API
   - `WHATSAPP` → WhatsAppService → WhatsApp API
   - etc.

## Technical Details

- Channel type filtering happens in `shouldExecuteWorkflow()` method
- Channel type is passed in `context.variables.channelType`
- Filtering is case-insensitive (INSTAGRAM = instagram = Instagram)
- If `channelTypes` is empty or not specified, workflow runs for all channels (backward compatible)

## Notes

- Channel filtering only applies to message-related triggers (`MESSAGE_RECEIVED`, `MESSAGE_WITH_KEYWORDS`)
- Other triggers (like `LEAD_STATUS_CHANGED`) ignore channel filters
- Workflows automatically route messages to the correct channel based on the conversation's channel type

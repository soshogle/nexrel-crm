# Tavus AI — Both Templates

Both **nexrel-service-template** (real estate, services) and **nexrel-ecommerce-template** (product stores) support Tavus AI avatars. Each owner's website uses their own avatars and webhooks.

## Overview

| Feature | Service Template | E-Commerce Template |
|---------|------------------|----------------------|
| Tavus floating button | ✅ | ✅ |
| Owner's own Replica/Persona | ✅ | ✅ |
| Webhook lead capture | ✅ | ✅ |
| Local storage (inquiries) | ✅ | ✅ |
| Push to nexrel-crm | ✅ | ✅ |

## Per-Owner Configuration

Each owner configures these in their site's `.env` / Vercel:

| Variable | Purpose |
|----------|---------|
| `TAVUS_API_KEY` | Tavus API key |
| `TAVUS_REPLICA_ID` | Owner's avatar (their digital twin) |
| `TAVUS_PERSONA_ID` | Owner's persona (system prompt, behavior) |
| `TAVUS_CALLBACK_URL` | Owner's site URL + `/api/webhooks/tavus` |
| `NEXREL_CRM_URL` | Optional: CRM base URL for lead push |
| `NEXREL_CRM_LEAD_OWNER_ID` | Optional: User ID in CRM who owns leads |
| `TAVUS_WEBHOOK_SECRET` | Optional: Shared secret for webhook auth |

## Flow

1. **Owner deploys** their site (from service or ecommerce template) with their own `TAVUS_REPLICA_ID` and `TAVUS_PERSONA_ID`.
2. **Visitor** opens the site → sees floating AI button → clicks → Tavus creates a conversation with that owner's avatar.
3. **Conversation ends** → Tavus POSTs to `TAVUS_CALLBACK_URL` (owner's site).
4. **Owner's site** receives webhook → saves lead to inquiries → optionally pushes to nexrel-crm.

## Setup Guides

- **Service template:** [nexrel-service-template/TAVUS_SETUP.md](../nexrel-service-template/TAVUS_SETUP.md)
- **E-commerce template:** [nexrel-ecommerce-template/TAVUS_SETUP.md](../nexrel-ecommerce-template/TAVUS_SETUP.md)

## CRM Integration

The nexrel-crm `/api/webhooks/tavus-lead` endpoint receives leads from any owner site. Configure `NEXREL_CRM_LEAD_OWNER_ID` and `TAVUS_WEBHOOK_SECRET` in both the owner site and the CRM.

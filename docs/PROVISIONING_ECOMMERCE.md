# Ecommerce Provisioning (Phase 3)

Automated provisioning for new PRODUCT template sites: GitHub, Neon, Vercel, env vars.

## Flow

1. User creates website with `templateType: PRODUCT` (or `SERVICE`)
2. `websiteSecret` generated and stored for PRODUCT sites (CRM → products API auth)
3. **Eyal exclusion:** Website ID `cmlkk9awe0002puiqm64iqw7t` is never provisioned
4. GitHub repo created (from template if configured, else empty)
5. Neon database created via API
6. Vercel project created with template-specific build config
7. For PRODUCT: env vars injected (DATABASE_URL, WEBSITE_SECRET, NEXREL_CRM_URL, NEXREL_WEBSITE_ID, JWT_SECRET, VITE_APP_TITLE)

## Env Vars (CRM)

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub personal/org token for repo creation |
| `NEON_API_KEY` | Yes | Neon API key (console.neon.tech → Settings → API) |
| `VERCEL_TOKEN` | Yes | Vercel API token |
| `NEXTAUTH_URL` | Yes | CRM URL (used for NEXREL_CRM_URL on sites) |
| `NEXREL_ECOM_TEMPLATE_OWNER` | No | GitHub org/user for ecommerce template repo |
| `NEXREL_ECOM_TEMPLATE_REPO` | No | Repo name (e.g. `nexrel-ecommerce-template`) |
| `NEXREL_SERVICE_TEMPLATE_OWNER` | No | GitHub org/user for service template repo |
| `NEXREL_SERVICE_TEMPLATE_REPO` | No | Repo name (e.g. `nexrel-service-template`) |
| `GITHUB_ORG` | No | Target org for generated repos (when using template) |

## Template Repos

To deploy from template (instead of empty repo):

1. Run `npm run publish:templates` (see [docs/PUBLISH_TEMPLATES_TO_GITHUB.md](./PUBLISH_TEMPLATES_TO_GITHUB.md))
2. Add the printed env vars to your CRM `.env`
3. Provisioning will use `POST /repos/{owner}/{repo}/generate` to create new repos from template

## Eyal's Site

Eyal's Darksword Armory (`cmlkk9awe0002puiqm64iqw7t`) is excluded from all provisioning. See `docs/phase0-eyal-isolation-rules.md`.

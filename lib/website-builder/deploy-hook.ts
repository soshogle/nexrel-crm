/**
 * Create or fetch Vercel deploy hook for a project.
 * Used to automate auto-deploy on save — owners don't need to set up manually.
 */

const VERCEL_API = 'https://api.vercel.com';
const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_vJ3wdbf3QXa3R4KzaZjDEkLP';

/**
 * Try to create a deploy hook via Vercel API, or fetch existing from project.
 * Returns the deploy hook URL or null.
 */
export async function createOrFetchDeployHook(
  projectId: string,
  teamId: string = TEAM_ID
): Promise<string | null> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Try to create via API (may not exist in all Vercel API versions)
  try {
    const createRes = await fetch(`${VERCEL_API}/v1/integrations/deploy-hooks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'CRM Auto-Deploy',
        projectId,
        teamId,
        branch: 'main',
      }),
    });
    if (createRes.ok) {
      const data = await createRes.json().catch(() => ({}));
      const url = data?.url ?? data?.hook?.url ?? data?.deployHook?.url;
      if (typeof url === 'string' && url.startsWith('https://')) {
        return url;
      }
    }
  } catch {
    // Ignore — fall through to fetch
  }

  // 2. Try branch "master" (some projects use it)
  try {
    const createRes = await fetch(`${VERCEL_API}/v1/integrations/deploy-hooks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'CRM Auto-Deploy',
        projectId,
        teamId,
        branch: 'master',
      }),
    });
    if (createRes.ok) {
      const data = await createRes.json().catch(() => ({}));
      const url = data?.url ?? data?.hook?.url ?? data?.deployHook?.url;
      if (typeof url === 'string' && url.startsWith('https://')) {
        return url;
      }
    }
  } catch {
    // Ignore
  }

  // 3. Fetch project and use existing deploy hook if any
  try {
    const projectRes = await fetch(
      `${VERCEL_API}/v9/projects/${projectId}?teamId=${teamId}`,
      { headers }
    );
    if (projectRes.ok) {
      const project = await projectRes.json();
      const hooks = project?.link?.deployHooks;
      if (Array.isArray(hooks) && hooks.length > 0) {
        const url = hooks[0]?.url;
        if (typeof url === 'string' && url.startsWith('https://')) {
          return url;
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

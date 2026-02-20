/**
 * Resource Provisioning Service
 * Creates GitHub repos, Neon databases, and Vercel projects for each website
 */

import type { ProvisioningResult, ProvisioningOptions } from './types';
import { randomBytes } from 'crypto';

/** Eyal's Darksword Armory - never provision, migrate, or modify (phase0 isolation) */
const EYAL_DARKSWORD_WEBSITE_ID = 'cmlkk9awe0002puiqm64iqw7t';

const NEON_API_BASE = 'https://console.neon.tech/api/v2';

export class ResourceProvisioningService {
  /**
   * Provision all resources for a website
   */
  async provisionResources(
    websiteId: string,
    websiteName: string,
    userId: string,
    options?: ProvisioningOptions
  ): Promise<ProvisioningResult> {
    // Phase 0: Never provision Eyal's Darksword Armory
    if (websiteId === EYAL_DARKSWORD_WEBSITE_ID) {
      console.log('[Provisioning] Skipping Eyal Darksword Armory (phase0 isolation)');
      return {};
    }

    const templateType = options?.templateType ?? 'SERVICE';
    const websiteSecret = options?.websiteSecret;
    const displayName = options?.websiteName ?? websiteName;

    let githubRepoUrl: string | null = null;
    let neonDatabaseUrl: string | null = null;
    let vercelProjectId: string | null = null;
    let vercelDeploymentUrl: string | null = null;

    try {
      try {
        githubRepoUrl = await this.createGitHubRepo(
          websiteId,
          displayName,
          userId,
          templateType
        );
      } catch (error: any) {
        console.warn('GitHub repo creation failed (continuing):', error.message);
      }

      try {
        neonDatabaseUrl = await this.createNeonDatabase(
          websiteId,
          displayName,
          userId
        );
      } catch (error: any) {
        console.warn('Neon database creation failed (continuing):', error.message);
      }

      if (githubRepoUrl) {
        try {
          const vercelResult = await this.createVercelProject(
            websiteId,
            displayName,
            githubRepoUrl,
            userId,
            templateType,
            {
              neonDatabaseUrl: neonDatabaseUrl ?? undefined,
              websiteSecret,
              websiteId,
            }
          );
          vercelProjectId = vercelResult.vercelProjectId;
          vercelDeploymentUrl = vercelResult.vercelDeploymentUrl || null;
        } catch (error: any) {
          console.warn('Vercel project creation failed (continuing):', error.message);
        }
      } else {
        console.warn('Skipping Vercel project creation - GitHub repo not available');
      }

      return {
        githubRepoUrl: githubRepoUrl || undefined,
        neonDatabaseUrl: neonDatabaseUrl || undefined,
        vercelProjectId: vercelProjectId || undefined,
        vercelDeploymentUrl: vercelDeploymentUrl || undefined,
      };
    } catch (error: any) {
      console.error('Provisioning encountered errors:', error);
      return {
        githubRepoUrl: githubRepoUrl || undefined,
        neonDatabaseUrl: neonDatabaseUrl || undefined,
        vercelProjectId: vercelProjectId || undefined,
        vercelDeploymentUrl: vercelDeploymentUrl || undefined,
      };
    }
  }

  /**
   * Create GitHub repository (from template if configured, else empty)
   */
  private async createGitHubRepo(
    websiteId: string,
    websiteName: string,
    userId: string,
    templateType: 'SERVICE' | 'PRODUCT'
  ): Promise<string> {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const repoName = `${userId}-website-${websiteId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const description = `Website: ${websiteName}`;

    // Try create-from-template if template repos are configured
    const templateOwner =
      templateType === 'PRODUCT'
        ? process.env.NEXREL_ECOM_TEMPLATE_OWNER
        : process.env.NEXREL_SERVICE_TEMPLATE_OWNER;
    const templateRepo =
      templateType === 'PRODUCT'
        ? process.env.NEXREL_ECOM_TEMPLATE_REPO
        : process.env.NEXREL_SERVICE_TEMPLATE_REPO;

    if (templateOwner && templateRepo) {
      try {
        const generateBody: Record<string, unknown> = {
          name: repoName,
          description,
          private: true,
          include_all_branches: false,
        };
        const targetOwner = process.env.GITHUB_ORG;
        if (targetOwner) generateBody.owner = targetOwner;

        const response = await fetch(
          `https://api.github.com/repos/${templateOwner}/${templateRepo}/generate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(generateBody),
          }
        );
        if (response.ok) {
          const repo = await response.json();
          return repo.html_url;
        }
      } catch (e: any) {
        console.warn('[Provisioning] Create-from-template failed, falling back to empty repo:', e.message);
      }
    }

    if (!templateOwner || !templateRepo) {
      console.warn(
        '[Provisioning] Template repos not configured. Set NEXREL_ECOM_TEMPLATE_OWNER/REPO (or SERVICE) to deploy from template. See docs/PUBLISH_TEMPLATES_TO_GITHUB.md'
      );
    }

    // Fallback: create empty repo
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description,
        private: true,
        auto_init: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${error}`);
    }

    const repo = await response.json();
    return repo.html_url;
  }

  /**
   * Create Neon database via API
   */
  private async createNeonDatabase(
    websiteId: string,
    websiteName: string,
    userId: string
  ): Promise<string> {
    const neonApiKey = process.env.NEON_API_KEY;
    if (!neonApiKey) {
      throw new Error('NEON_API_KEY not configured');
    }

    const projectName = `${userId}-website-${websiteId}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    const createResponse = await fetch(`${NEON_API_BASE}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${neonApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: {
          name: projectName,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Neon API error: ${error}`);
    }

    const data = (await createResponse.json()) as {
      project?: { id: string; name: string };
      connection_uris?: Array<{ connection_uri: string }>;
      connection_uri?: string;
    };

    // Neon create project returns connection_uris array or connection_uri
    const uri =
      data.connection_uris?.[0]?.connection_uri ??
      (data as any).connection_uri ??
      (data as any).connection_string;

    if (uri) {
      return uri;
    }

    // Fallback: construct from project if we have branch/host
    const project = data.project;
    if (!project?.id) {
      throw new Error('Neon API did not return project or connection URI');
    }

    // Fetch connection URI from project default branch
    const connResponse = await fetch(
      `${NEON_API_BASE}/projects/${project.id}/connection_uri`,
      {
        headers: {
          Authorization: `Bearer ${neonApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (connResponse.ok) {
      const connData = (await connResponse.json()) as { connection_uri?: string };
      if (connData.connection_uri) {
        return connData.connection_uri;
      }
    }

    throw new Error('Neon API did not return connection URI');
  }

  /**
   * Create Vercel project with template-specific build config
   */
  private async createVercelProject(
    websiteId: string,
    websiteName: string,
    githubRepoUrl: string,
    userId: string,
    templateType: 'SERVICE' | 'PRODUCT',
    env: {
      neonDatabaseUrl?: string;
      websiteSecret?: string;
      websiteId: string;
    }
  ): Promise<{ vercelProjectId: string; vercelDeploymentUrl?: string }> {
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    const projectName = `${userId}-website-${websiteId}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    const repoMatch = githubRepoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) {
      throw new Error('Invalid GitHub repository URL');
    }
    const [, repoOwner, repoName] = repoMatch;

    const crmUrl = process.env.NEXTAUTH_URL || process.env.NEXREL_CRM_URL || '';
    const jwtSecret = randomBytes(32).toString('hex');

    const baseBody: Record<string, unknown> = {
      name: projectName,
      gitRepository: {
        type: 'github',
        repo: `${repoOwner}/${repoName}`,
      },
    };

    if (templateType === 'PRODUCT') {
      // Ecommerce template: Vite + Express, output dist/
      Object.assign(baseBody, {
        framework: null,
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        installCommand: 'npm install --legacy-peer-deps',
      });
    } else {
      // Service template: Vite + Express, .vercel/output
      Object.assign(baseBody, {
        framework: null,
        buildCommand: 'npm run build',
        outputDirectory: '.vercel/output',
        installCommand: 'npm install --legacy-peer-deps',
      });
    }

    const response = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(baseBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel API error: ${error}`);
    }

    const project = await response.json();
    const vercelProjectId = project.id;

    // Inject env vars for PRODUCT template (ecommerce)
    if (templateType === 'PRODUCT' && vercelProjectId) {
      const envVars: Array<{ key: string; value: string; type: 'encrypted' }> = [
        { key: 'JWT_SECRET', value: jwtSecret, type: 'encrypted' },
        { key: 'VITE_APP_TITLE', value: websiteName, type: 'encrypted' },
        { key: 'NEXREL_CRM_URL', value: crmUrl, type: 'encrypted' },
        { key: 'NEXREL_WEBSITE_ID', value: websiteId, type: 'encrypted' },
      ];
      if (env.neonDatabaseUrl) {
        envVars.push({ key: 'DATABASE_URL', value: env.neonDatabaseUrl, type: 'encrypted' });
      }
      if (env.websiteSecret) {
        envVars.push({ key: 'WEBSITE_SECRET', value: env.websiteSecret, type: 'encrypted' });
      }
      // Voice AI: template fetches config from CRM using this shared secret
      if (process.env.WEBSITE_VOICE_CONFIG_SECRET) {
        envVars.push({
          key: 'WEBSITE_VOICE_CONFIG_SECRET',
          value: process.env.WEBSITE_VOICE_CONFIG_SECRET,
          type: 'encrypted',
        });
      }

      for (const ev of envVars) {
        const evRes = await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/env`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key: ev.key,
              value: ev.value,
              type: ev.type,
              target: ['production', 'preview'],
            }),
          }
        );
        if (!evRes.ok) {
          console.warn(`[Provisioning] Failed to set env ${ev.key}:`, await evRes.text());
        }
      }
    }

    // Inject env vars for SERVICE template (voice AI, CRM integration)
    if (templateType === 'SERVICE' && vercelProjectId && crmUrl) {
      const serviceEnvVars: Array<{ key: string; value: string; type: 'encrypted' }> = [
        { key: 'NEXREL_CRM_URL', value: crmUrl, type: 'encrypted' },
        { key: 'NEXREL_WEBSITE_ID', value: websiteId, type: 'encrypted' },
      ];
      if (process.env.WEBSITE_VOICE_CONFIG_SECRET) {
        serviceEnvVars.push({
          key: 'WEBSITE_VOICE_CONFIG_SECRET',
          value: process.env.WEBSITE_VOICE_CONFIG_SECRET,
          type: 'encrypted',
        });
      }
      for (const ev of serviceEnvVars) {
        const evRes = await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId}/env`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key: ev.key,
              value: ev.value,
              type: ev.type,
              target: ['production', 'preview'],
            }),
          }
        );
        if (!evRes.ok) {
          console.warn(`[Provisioning] Failed to set env ${ev.key}:`, await evRes.text());
        }
      }
    }

    return {
      vercelProjectId,
      vercelDeploymentUrl: `https://${project.name}.vercel.app`,
    };
  }

  async cleanupResources(opts: {
    githubRepoUrl?: string | null;
    vercelProjectId?: string | null;
    neonDatabaseUrl?: string | null;
    elevenLabsAgentId?: string | null;
    userId?: string;
    websiteId?: string;
  }): Promise<{ errors: string[] }> {
    const errors: string[] = [];

    if (opts.githubRepoUrl) {
      try {
        await this.deleteGitHubRepo(opts.githubRepoUrl);
      } catch (e: any) {
        console.error('[Cleanup] GitHub delete failed:', e.message);
        errors.push(`GitHub: ${e.message}`);
      }
    }

    if (opts.vercelProjectId) {
      try {
        await this.deleteVercelProject(opts.vercelProjectId);
      } catch (e: any) {
        console.error('[Cleanup] Vercel delete failed:', e.message);
        errors.push(`Vercel: ${e.message}`);
      }
    }

    if (opts.neonDatabaseUrl) {
      try {
        await this.deleteNeonProject(opts.neonDatabaseUrl);
      } catch (e: any) {
        console.error('[Cleanup] Neon delete failed:', e.message);
        errors.push(`Neon: ${e.message}`);
      }
    }

    if (opts.elevenLabsAgentId) {
      try {
        const { elevenLabsProvisioning } = await import('@/lib/elevenlabs-provisioning');
        await elevenLabsProvisioning.deleteAgent(opts.elevenLabsAgentId, opts.userId);
      } catch (e: any) {
        console.error('[Cleanup] ElevenLabs delete failed:', e.message);
        errors.push(`ElevenLabs: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`[Cleanup] ${errors.length} resource(s) failed to clean up:`, errors);
    }
    return { errors };
  }

  private async deleteGitHubRepo(repoUrl: string): Promise<void> {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    // Extract owner/repo from URL like https://github.com/org/repo-name
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new Error(`Cannot parse GitHub repo URL: ${repoUrl}`);
    }

    const [, owner, repo] = match;
    console.log(`🗑️  Deleting GitHub repo: ${owner}/${repo}`);

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status}: ${body}`);
    }
    console.log(`✅ GitHub repo deleted: ${owner}/${repo}`);
  }

  private async deleteVercelProject(projectId: string): Promise<void> {
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    console.log(`🗑️  Deleting Vercel project: ${projectId}`);

    const teamId = process.env.VERCEL_TEAM_ID;
    const url = teamId
      ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      throw new Error(`Vercel API ${response.status}: ${body}`);
    }
    console.log(`✅ Vercel project deleted: ${projectId}`);
  }

  private async deleteNeonProject(databaseUrl: string): Promise<void> {
    const neonApiKey = process.env.NEON_API_KEY;
    if (!neonApiKey) {
      throw new Error('NEON_API_KEY not configured');
    }

    // Neon connection URLs contain the endpoint host which maps to a project.
    // Format: postgres://user:pass@ep-xxxxx.region.neon.tech/dbname
    // We need to list projects and find by endpoint host to get the project ID.
    const hostMatch = databaseUrl.match(/@(ep-[^.]+)/);
    if (!hostMatch) {
      throw new Error(`Cannot extract Neon endpoint from URL`);
    }
    const endpointPrefix = hostMatch[1];
    console.log(`🗑️  Looking up Neon project for endpoint: ${endpointPrefix}`);

    // List projects and match by endpoint
    const listResp = await fetch(`${NEON_API_BASE}/projects?limit=100`, {
      headers: { Authorization: `Bearer ${neonApiKey}` },
    });
    if (!listResp.ok) {
      throw new Error(`Neon list projects failed: ${listResp.status}`);
    }
    const listData = (await listResp.json()) as { projects: Array<{ id: string; name: string }> };

    // Try each project to find the one with our endpoint
    let projectId: string | null = null;
    for (const proj of listData.projects) {
      const epResp = await fetch(`${NEON_API_BASE}/projects/${proj.id}/endpoints`, {
        headers: { Authorization: `Bearer ${neonApiKey}` },
      });
      if (!epResp.ok) continue;
      const epData = (await epResp.json()) as { endpoints: Array<{ host: string }> };
      if (epData.endpoints?.some(ep => ep.host.startsWith(endpointPrefix))) {
        projectId = proj.id;
        break;
      }
    }

    if (!projectId) {
      console.warn(`[Cleanup] Neon project for ${endpointPrefix} not found (may already be deleted)`);
      return;
    }

    console.log(`🗑️  Deleting Neon project: ${projectId}`);
    const delResp = await fetch(`${NEON_API_BASE}/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${neonApiKey}` },
    });

    if (!delResp.ok && delResp.status !== 404) {
      const body = await delResp.text();
      throw new Error(`Neon API ${delResp.status}: ${body}`);
    }
    console.log(`✅ Neon project deleted: ${projectId}`);
  }
}

export const resourceProvisioning = new ResourceProvisioningService();

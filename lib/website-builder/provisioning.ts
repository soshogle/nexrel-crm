/**
 * Resource Provisioning Service
 * Creates GitHub repos, Neon databases, and Vercel projects for each website
 */

import type { ProvisioningResult } from './types';

export class ResourceProvisioningService {
  /**
   * Provision all resources for a website
   */
  async provisionResources(
    websiteId: string,
    websiteName: string,
    userId: string
  ): Promise<ProvisioningResult> {
    try {
      // Create GitHub repository
      const githubRepoUrl = await this.createGitHubRepo(websiteId, websiteName, userId);
      
      // Create Neon database
      const neonDatabaseUrl = await this.createNeonDatabase(websiteId, websiteName, userId);
      
      // Create Vercel project
      const { vercelProjectId, vercelDeploymentUrl } = await this.createVercelProject(
        websiteId,
        websiteName,
        githubRepoUrl,
        userId
      );
      
      return {
        githubRepoUrl,
        neonDatabaseUrl,
        vercelProjectId,
        vercelDeploymentUrl,
      };
    } catch (error: any) {
      throw new Error(`Failed to provision resources: ${error.message}`);
    }
  }

  /**
   * Create GitHub repository
   */
  private async createGitHubRepo(
    websiteId: string,
    websiteName: string,
    userId: string
  ): Promise<string> {
    const repoName = `${userId}-website-${websiteId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // TODO: Implement GitHub API integration
    // For now, return placeholder
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN not configured');
    }
    
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          description: `Website: ${websiteName}`,
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
    } catch (error: any) {
      console.error('GitHub repo creation failed:', error);
      throw error;
    }
  }

  /**
   * Create Neon database
   */
  private async createNeonDatabase(
    websiteId: string,
    websiteName: string,
    userId: string
  ): Promise<string> {
    // TODO: Implement Neon API integration
    // For now, return placeholder
    const neonApiKey = process.env.NEON_API_KEY;
    if (!neonApiKey) {
      throw new Error('NEON_API_KEY not configured');
    }
    
    const projectName = `${userId}-website-${websiteId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    try {
      // Get project ID from Neon API
      const projectsResponse = await fetch('https://console.neon.tech/api/v2/projects', {
        headers: {
          'Authorization': `Bearer ${neonApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch Neon projects');
      }
      
      // Create new database branch (or project)
      // Note: Neon API structure may vary - adjust as needed
      const createResponse = await fetch('https://console.neon.tech/api/v2/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${neonApiKey}`,
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
      
      const project = await createResponse.json();
      
      // Get database connection string
      // This will need to be constructed from the project response
      const databaseUrl = `postgresql://${project.connection_string}`;
      
      return databaseUrl;
    } catch (error: any) {
      console.error('Neon database creation failed:', error);
      throw error;
    }
  }

  /**
   * Create Vercel project
   */
  private async createVercelProject(
    websiteId: string,
    websiteName: string,
    githubRepoUrl: string,
    userId: string
  ): Promise<{ vercelProjectId: string; vercelDeploymentUrl?: string }> {
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }
    
    const projectName = `${userId}-website-${websiteId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    try {
      // Extract repo owner and name from GitHub URL
      const repoMatch = githubRepoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        throw new Error('Invalid GitHub repository URL');
      }
      
      const [, repoOwner, repoName] = repoMatch;
      
      // Create Vercel project
      const response = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          gitRepository: {
            type: 'github',
            repo: `${repoOwner}/${repoName}`,
          },
          framework: 'nextjs',
          buildCommand: 'npm run build',
          outputDirectory: '.next',
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vercel API error: ${error}`);
      }
      
      const project = await response.json();
      
      return {
        vercelProjectId: project.id,
        vercelDeploymentUrl: `https://${project.name}.vercel.app`,
      };
    } catch (error: any) {
      console.error('Vercel project creation failed:', error);
      throw error;
    }
  }

  /**
   * Clean up resources (if website deletion fails)
   */
  async cleanupResources(
    githubRepoUrl: string,
    vercelProjectId: string
  ): Promise<void> {
    try {
      // Delete GitHub repo
      await this.deleteGitHubRepo(githubRepoUrl);
      
      // Delete Vercel project
      await this.deleteVercelProject(vercelProjectId);
      
      // Note: Neon databases are typically kept for data recovery
    } catch (error: any) {
      console.error('Resource cleanup failed:', error);
      // Don't throw - cleanup failures shouldn't break the flow
    }
  }

  private async deleteGitHubRepo(repoUrl: string): Promise<void> {
    // TODO: Implement GitHub repo deletion
  }

  private async deleteVercelProject(projectId: string): Promise<void> {
    // TODO: Implement Vercel project deletion
  }
}

export const resourceProvisioning = new ResourceProvisioningService();

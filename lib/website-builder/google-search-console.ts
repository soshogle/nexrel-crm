/**
 * Google Search Console Integration Service
 * Handles OAuth, site verification, sitemap submission, and indexing requests
 */

import { google } from 'googleapis';

export interface GoogleSearchConsoleConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SiteVerificationResult {
  success: boolean;
  verified: boolean;
  error?: string;
}

export interface SitemapSubmissionResult {
  success: boolean;
  error?: string;
}

export interface IndexingRequestResult {
  success: boolean;
  indexed: boolean;
  error?: string;
}

export class GoogleSearchConsoleService {
  /**
   * Get OAuth2 client
   */
  private getOAuth2Client(config: GoogleSearchConsoleConfig) {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
    });

    return oauth2Client;
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(
    config: GoogleSearchConsoleConfig
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const oauth2Client = this.getOAuth2Client(config);

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      return {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || config.refreshToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  /**
   * Verify site ownership in Google Search Console
   */
  async verifySite(
    siteUrl: string,
    config: GoogleSearchConsoleConfig
  ): Promise<SiteVerificationResult> {
    try {
      const oauth2Client = this.getOAuth2Client(config);
      const searchConsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client,
      });

      // Check if site is already verified
      const sitesResponse = await searchConsole.sites.list();
      const site = sitesResponse.data.siteEntry?.find(
        (s) => s.siteUrl === siteUrl || s.siteUrl === `sc_domain:${siteUrl.replace(/^https?:\/\//, '')}`
      );

      if (site && site.permissionLevel === 'siteOwner') {
        return {
          success: true,
          verified: true,
        };
      }

      // If not verified, return instructions for manual verification
      // (Google Search Console API doesn't support programmatic verification)
      return {
        success: false,
        verified: false,
        error: 'Site verification requires manual steps in Google Search Console. Please verify ownership at https://search.google.com/search-console',
      };
    } catch (error: any) {
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify site',
      };
    }
  }

  /**
   * Submit sitemap to Google Search Console
   */
  async submitSitemap(
    siteUrl: string,
    sitemapUrl: string,
    config: GoogleSearchConsoleConfig
  ): Promise<SitemapSubmissionResult> {
    try {
      const oauth2Client = this.getOAuth2Client(config);
      const searchConsole = google.searchconsole({
        version: 'v1',
        auth: oauth2Client,
      });

      // Normalize site URL format
      const normalizedSiteUrl = siteUrl.startsWith('http')
        ? siteUrl
        : `https://${siteUrl}`;

      // Submit sitemap
      await searchConsole.sitemaps.submit({
        siteUrl: normalizedSiteUrl,
        feedpath: sitemapUrl,
      });

      return {
        success: true,
      };
    } catch (error: any) {
      // Check if sitemap already exists (not an error)
      if (error.message?.includes('already exists') || error.code === 400) {
        return {
          success: true, // Already submitted, consider it success
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to submit sitemap',
      };
    }
  }

  /**
   * Request indexing for a specific URL
   */
  async requestIndexing(
    siteUrl: string,
    url: string,
    config: GoogleSearchConsoleConfig
  ): Promise<IndexingRequestResult> {
    try {
      const oauth2Client = this.getOAuth2Client(config);
      const indexing = google.indexing({
        version: 'v3',
        auth: oauth2Client,
      });

      // Request indexing
      await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED',
        },
      });

      return {
        success: true,
        indexed: true,
      };
    } catch (error: any) {
      // Indexing API requires specific permissions and may not be available for all accounts
      if (error.code === 403 || error.message?.includes('permission')) {
        return {
          success: false,
          indexed: false,
          error: 'Indexing API requires additional permissions. Please enable it in Google Cloud Console.',
        };
      }

      return {
        success: false,
        indexed: false,
        error: error.message || 'Failed to request indexing',
      };
    }
  }

  /**
   * Request indexing for multiple URLs (homepage and key pages)
   */
  async requestIndexingForKeyPages(
    siteUrl: string,
    urls: string[],
    config: GoogleSearchConsoleConfig
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const url of urls) {
      try {
        const result = await this.requestIndexing(siteUrl, url, config);
        if (result.success) {
          success++;
        } else {
          failed++;
          if (result.error) {
            errors.push(`${url}: ${result.error}`);
          }
        }
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        failed++;
        errors.push(`${url}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    scopes: string[] = [
      'https://www.googleapis.com/auth/webmasters',
      'https://www.googleapis.com/auth/indexing',
    ]
  ): string {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken: string; expiryDate: Date }> {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. Please revoke access and re-authorize with prompt=consent');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000), // Default 1 hour
    };
  }
}

export const googleSearchConsole = new GoogleSearchConsoleService();

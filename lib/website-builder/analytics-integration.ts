/**
 * Analytics Integration Service
 * Manages Google Analytics and Facebook Pixel integrations
 */

import { prisma } from '@/lib/db';

export interface AnalyticsConfig {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

export class WebsiteAnalyticsIntegrationService {
  /**
   * Update analytics configuration for a website
   */
  async updateAnalyticsConfig(websiteId: string, config: AnalyticsConfig) {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
    });

    if (!website) {
      throw new Error('Website not found');
    }

    return await prisma.website.update({
      where: { id: websiteId },
      data: {
        googleAnalyticsId: config.googleAnalyticsId || null,
        facebookPixelId: config.facebookPixelId || null,
      },
    });
  }

  /**
   * Get analytics configuration
   */
  async getAnalyticsConfig(websiteId: string): Promise<AnalyticsConfig> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        googleAnalyticsId: true,
        facebookPixelId: true,
      },
    });

    if (!website) {
      throw new Error('Website not found');
    }

    return {
      googleAnalyticsId: website.googleAnalyticsId || undefined,
      facebookPixelId: website.facebookPixelId || undefined,
    };
  }

  /**
   * Generate tracking code snippets
   */
  generateTrackingCodes(config: AnalyticsConfig): {
    googleAnalytics?: string;
    facebookPixel?: string;
  } {
    const codes: { googleAnalytics?: string; facebookPixel?: string } = {};

    if (config.googleAnalyticsId) {
      // Google Analytics 4 (G-XXXXX) or Universal Analytics (UA-XXXXX)
      const isGA4 = config.googleAnalyticsId.startsWith('G-');
      
      if (isGA4) {
        codes.googleAnalytics = `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${config.googleAnalyticsId}');
</script>`;
      } else {
        codes.googleAnalytics = `
<!-- Google Universal Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${config.googleAnalyticsId}');
</script>`;
      }
    }

    if (config.facebookPixelId) {
      codes.facebookPixel = `
<!-- Facebook Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${config.facebookPixelId}');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=${config.facebookPixelId}&ev=PageView&noscript=1"
/></noscript>`;
    }

    return codes;
  }

  /**
   * Validate Google Analytics ID format
   */
  validateGoogleAnalyticsId(id: string): boolean {
    // GA4 format: G-XXXXXXXXXX
    // Universal Analytics: UA-XXXXXXXXX-X
    return /^(G-[A-Z0-9]+|UA-\d+-\d+)$/.test(id);
  }

  /**
   * Validate Facebook Pixel ID format
   */
  validateFacebookPixelId(id: string): boolean {
    // Facebook Pixel ID is typically 15-16 digits
    return /^\d{15,16}$/.test(id);
  }
}

export const websiteAnalyticsIntegrationService = new WebsiteAnalyticsIntegrationService();

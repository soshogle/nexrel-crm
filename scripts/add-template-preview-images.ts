#!/usr/bin/env tsx
/**
 * Add Preview Images to Website Templates
 * Updates existing templates with attractive preview images
 */

import { prisma } from '@/lib/db';

// Preview images as SVG data URLs - professional gradients matching each template
const templatePreviewImages: Record<string, string> = {
  'Zebracat - AI Video Creation': `data:image/svg+xml,${encodeURIComponent(`
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="zebracatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ec4899;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#zebracatGrad)"/>
      <text x="200" y="120" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">Zebracat</text>
      <text x="200" y="160" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.9)" text-anchor="middle">AI Video Creation</text>
      <circle cx="200" cy="220" r="30" fill="rgba(255,255,255,0.3)"/>
      <polygon points="190,210 190,230 210,220" fill="white"/>
    </svg>
  `)}`,
  
  'Clay - GTM Data Platform': `data:image/svg+xml,${encodeURIComponent(`
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#clayGrad)"/>
      <text x="200" y="120" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">Clay</text>
      <text x="200" y="160" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle">GTM Data Platform</text>
      <rect x="120" y="200" width="60" height="40" fill="rgba(255,255,255,0.2)" rx="4"/>
      <rect x="200" y="200" width="60" height="40" fill="rgba(255,255,255,0.2)" rx="4"/>
      <rect x="280" y="200" width="60" height="40" fill="rgba(255,255,255,0.2)" rx="4"/>
    </svg>
  `)}`,
  
  'Starcloud - Space Data Centers': `data:image/svg+xml,${encodeURIComponent(`
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="starcloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1e3a8a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#starcloudGrad)"/>
      <circle cx="200" cy="120" r="40" fill="rgba(255,255,255,0.3)"/>
      <circle cx="200" cy="120" r="25" fill="rgba(255,255,255,0.5)"/>
      <text x="200" y="200" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">Starcloud</text>
      <text x="200" y="230" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle">Space Data Centers</text>
      <circle cx="100" cy="80" r="2" fill="white" opacity="0.6"/>
      <circle cx="300" cy="60" r="2" fill="white" opacity="0.6"/>
      <circle cx="320" cy="200" r="2" fill="white" opacity="0.6"/>
    </svg>
  `)}`,
  
  'NeoCultural Couture - Fashion Innovation': `data:image/svg+xml,${encodeURIComponent(`
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="neoculturalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a0a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ec4899;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f97316;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#neoculturalGrad)"/>
      <text x="200" y="100" font-family="serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">NeoCultural</text>
      <text x="200" y="130" font-family="serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">Couture</text>
      <text x="200" y="170" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle">Fashion Innovation</text>
      <path d="M 150 220 Q 200 200, 250 220" stroke="white" stroke-width="3" fill="none" opacity="0.6"/>
      <path d="M 150 240 Q 200 220, 250 240" stroke="white" stroke-width="2" fill="none" opacity="0.4"/>
    </svg>
  `)}`,
  
  'Little Lagniappe - Baby Food Subscription': `data:image/svg+xml,${encodeURIComponent(`
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lagniappeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff6b9d;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#c9a9dd;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ffd93d;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#lagniappeGrad)"/>
      <text x="200" y="110" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle">Little</text>
      <text x="200" y="140" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle">Lagniappe</text>
      <text x="200" y="180" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.9)" text-anchor="middle">Baby Food Subscription</text>
      <circle cx="200" cy="230" r="25" fill="rgba(255,255,255,0.4)"/>
      <path d="M 190 225 L 200 235 L 210 225" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>
  `)}`,
};

async function updateTemplatePreviewImages() {
  console.log('🎨 Updating template preview images...\n');

  const results = [];

  for (const [templateName, previewImage] of Object.entries(templatePreviewImages)) {
    try {
      console.log(`📸 Updating preview for: ${templateName}`);

      const updated = await prisma.websiteTemplate.updateMany({
        where: {
          name: templateName,
        },
        data: {
          previewImage,
        },
      });

      if (updated.count > 0) {
        results.push({
          success: true,
          name: templateName,
          count: updated.count,
        });
        console.log(`✅ Updated ${updated.count} template(s)\n`);
      } else {
        results.push({
          success: false,
          name: templateName,
          error: 'Template not found',
        });
        console.log(`⚠️  Template not found: ${templateName}\n`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to update ${templateName}:`, error.message);
      results.push({
        success: false,
        name: templateName,
        error: error.message,
      });
      console.log('');
    }
  }

  // Summary
  console.log('\n📊 Update Summary:');
  console.log('─'.repeat(50));
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((result) => {
    if (result.success) {
      console.log(`✅ ${result.name} - Updated ${result.count} template(s)`);
    } else {
      console.log(`❌ ${result.name} - Error: ${result.error}`);
    }
  });

  console.log('─'.repeat(50));
  console.log(`\n✅ Successfully updated: ${successful}/${Object.keys(templatePreviewImages).length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${Object.keys(templatePreviewImages).length}`);
  }

  // List all templates with preview images
  console.log('\n📋 All SERVICE templates:');
  const allTemplates = await prisma.websiteTemplate.findMany({
    where: { type: 'SERVICE' },
    select: {
      id: true,
      name: true,
      previewImage: true,
      category: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  allTemplates.forEach((t) => {
    const hasImage = t.previewImage ? '✅' : '❌';
    console.log(`  ${hasImage} ${t.name} (${t.category || 'Uncategorized'})`);
  });
}

updateTemplatePreviewImages()
  .then(() => {
    console.log('\n✅ Preview image update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

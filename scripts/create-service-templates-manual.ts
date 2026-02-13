#!/usr/bin/env tsx
/**
 * Create Service Website Templates Manually
 * Creates templates based on website information without scraping
 */

import { prisma } from '@/lib/db';
import type { WebsiteStructure } from '@/lib/website-builder/types';

const templates = [
  {
    name: 'Simple Professional',
    type: 'SERVICE' as const,
    category: 'Fallback / No Scraping',
    description: 'Clean, minimal template. No external preview URL — always works. Use when Import from URL fails.',
    structure: {
      pages: [
        {
          id: 'home',
          name: 'Home',
          path: '/',
          components: [
            {
              id: 'hero',
              type: 'Hero',
              props: {
                title: 'Welcome to Your Business',
                subtitle: 'We deliver quality services tailored to your needs.',
                ctaText: 'Get Started',
                ctaLink: '#contact',
              },
            },
            {
              id: 'about',
              type: 'AboutSection',
              props: {
                title: 'About Us',
                description: 'We are a dedicated team committed to excellence. Our mission is to help you achieve your goals with professional service and personalized attention.',
                ctaText: 'Learn More',
                ctaLink: '/about',
              },
            },
            {
              id: 'cta',
              type: 'CTASection',
              props: {
                title: 'Ready to Get Started?',
                description: 'Contact us today for a free consultation.',
                ctaText: 'Contact Us',
                ctaLink: '#contact',
              },
            },
            {
              id: 'form',
              type: 'ContactForm',
              props: {
                fields: [
                  { name: 'name', type: 'text', label: 'Name', required: true },
                  { name: 'email', type: 'email', label: 'Email', required: true },
                  { name: 'message', type: 'textarea', label: 'Message', required: true },
                ],
              },
            },
          ],
          seo: { title: 'Your Business', description: 'Professional services' },
        },
      ],
      globalStyles: {
        colors: { primary: '#2563EB', secondary: '#1E40AF', accent: '#3B82F6', background: '#FFFFFF', text: '#1F2937' },
        fonts: { heading: 'Inter, sans-serif', body: 'Inter, sans-serif' },
      },
      navigation: { items: [{ label: 'Home', path: '/' }, { label: 'Contact', path: '#contact' }], style: 'horizontal' },
      footer: { sections: [], copyright: '' },
    },
  },
  {
    name: 'Zebracat - AI Video Creation',
    type: 'SERVICE' as const,
    category: 'SaaS / Tech',
    description: 'Modern AI video creation platform with clean design, hero sections, and feature showcases. Perfect for SaaS and tech companies.',
    structure: {
      pages: [
        {
          id: 'home',
          name: 'Home',
          path: '/',
          components: [
            {
              id: 'hero',
              type: 'Hero',
              props: {
                title: 'The AI video agent for social media growth',
                subtitle: 'Get content ideas. Create videos from any text in minutes. Auto-schedule across all platforms.',
                ctaText: 'Start Growing Now',
                ctaLink: '/get-started',
              },
            },
            {
              id: 'features',
              type: 'FeaturesGrid',
              props: {
                title: 'Everything you need to create, optimize, and scale',
                features: [
                  { title: 'AI Avatars', description: 'Create human-like avatars to speak your script automatically' },
                  { title: 'AI Scenes', description: 'Instantly generate stunning scenes with AI' },
                  { title: 'AI Script Writing', description: 'Generate engaging scripts that hook your audience' },
                  { title: 'Voice Cloning', description: 'Clone your own voice for use across your videos' },
                  { title: 'AI Auto Captioning', description: 'Add accurate captions to every video automatically' },
                  { title: 'AI Editing', description: 'Let AI do the heavy lifting but stay in control for final tweaks' },
                ],
              },
            },
            {
              id: 'testimonials',
              type: 'Testimonials',
              props: {
                title: 'Loved by 50,000+ AI creators',
                testimonials: [],
              },
            },
            {
              id: 'cta',
              type: 'CTASection',
              props: {
                title: 'Ready to 10X Your Social Media Growth?',
                description: 'Join thousands of marketers and business owners who replaced expensive agencies.',
                ctaText: 'Start Your Free Trial',
                ctaLink: '/signup',
              },
            },
          ],
          seo: {
            title: 'Zebracat - AI Video Creation Platform',
            description: 'Create FREE AI Videos 10X Faster Online. Turn ideas into viral videos in seconds.',
          },
        },
      ],
      globalStyles: {
        colors: {
          primary: '#6366F1',
          secondary: '#8B5CF6',
          accent: '#EC4899',
          background: '#FFFFFF',
          text: '#1F2937',
        },
        fonts: {
          heading: 'Inter, sans-serif',
          body: 'Inter, sans-serif',
        },
      },
      navigation: {
        items: [
          { label: 'Features', path: '/features' },
          { label: 'Use Cases', path: '/use-cases' },
          { label: 'Pricing', path: '/pricing' },
          { label: 'Resources', path: '/resources' },
        ],
        style: 'horizontal',
      },
      footer: {
        sections: [
          {
            title: 'Product',
            links: [
              { label: 'Features', url: '/features' },
              { label: 'Use Cases', url: '/use-cases' },
              { label: 'Pricing', url: '/pricing' },
            ],
          },
          {
            title: 'Resources',
            links: [
              { label: 'Help Center', url: '/help' },
              { label: 'Blog', url: '/blog' },
              { label: 'Templates', url: '/templates' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Zebracat. All rights reserved.`,
      },
    },
  },
  {
    name: 'Clay - GTM Data Platform',
    type: 'SERVICE' as const,
    category: 'B2B / Marketing',
    description: 'Professional B2B platform design with data visualization, customer testimonials, and clear value propositions. Ideal for data and marketing tools.',
    structure: {
      pages: [
        {
          id: 'home',
          name: 'Home',
          path: '/',
          components: [
            {
              id: 'hero',
              type: 'Hero',
              props: {
                title: 'Go to market with unique data — and the ability to act on it',
                subtitle: 'Bring AI agents, enrichment, and intent data together and turn insights into relevant, timely action.',
                ctaText: 'Start building for free',
                ctaLink: '/signup',
              },
            },
            {
              id: 'features',
              type: 'FeaturesGrid',
              props: {
                title: 'Every GTM data point imaginable, in one place',
                description: 'Understand your total market, your customers, and the gap between them. Then act on it.',
                features: [
                  { title: 'Enrichments', description: 'Access premium data from 150+ providers' },
                  { title: 'Intent signals', description: 'Take instant action when prospects change jobs, visit your website' },
                  { title: 'AI-led research', description: 'Search public databases and find unique datapoints with Claygent' },
                ],
              },
            },
            {
              id: 'testimonials',
              type: 'Testimonials',
              props: {
                title: 'Trusted by more than 300,000 leading GTM teams',
                testimonials: [],
              },
            },
            {
              id: 'cta',
              type: 'CTASection',
              props: {
                title: 'Turn your growth ideas into reality today',
                description: 'Start your 14-day Pro trial today. No credit card required.',
                ctaText: 'Start building for free',
                ctaLink: '/signup',
              },
            },
          ],
          seo: {
            title: 'Clay - Go to market with unique data',
            description: 'Bring AI agents, enrichment, and intent data together and turn insights into relevant, timely action.',
          },
        },
      ],
      globalStyles: {
        colors: {
          primary: '#000000',
          secondary: '#666666',
          accent: '#0066FF',
          background: '#FFFFFF',
          text: '#1A1A1A',
        },
        fonts: {
          heading: 'Inter, sans-serif',
          body: 'Inter, sans-serif',
        },
      },
      navigation: {
        items: [
          { label: 'Product', path: '/product' },
          { label: 'Solutions', path: '/solutions' },
          { label: 'Resources', path: '/resources' },
          { label: 'Company', path: '/company' },
          { label: 'Pricing', path: '/pricing' },
        ],
        style: 'horizontal',
      },
      footer: {
        sections: [
          {
            title: 'Product',
            links: [
              { label: 'Features', url: '/features' },
              { label: 'Integrations', url: '/integrations' },
              { label: 'Pricing', url: '/pricing' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Clay. All rights reserved.`,
      },
    },
  },
  {
    name: 'Starcloud - Space Data Centers',
    type: 'SERVICE' as const,
    category: 'Deep Tech / Innovation',
    description: 'Futuristic tech company design with bold visuals, mission-focused content, and innovative presentation. Great for deep-tech and space companies.',
    structure: {
      pages: [
        {
          id: 'home',
          name: 'Home',
          path: '/',
          components: [
            {
              id: 'hero',
              type: 'Hero',
              props: {
                title: 'Why data centers should move to space',
                subtitle: 'As launch costs fall, data centers in space will leverage 24/7 solar energy and radiative cooling, rapidly deploying to gigawatt-scale.',
                ctaText: 'View our White Paper',
                ctaLink: '/wp',
              },
            },
            {
              id: 'benefits',
              type: 'FeaturesGrid',
              props: {
                title: 'Unlock the Future of Data Centers in Space',
                features: [
                  { title: 'Reduced Cost', description: 'Abundant solar energy without batteries, and radiative cooling' },
                  { title: 'Scalability', description: 'Grow to gigawatt scale without terrestrial constraints' },
                  { title: 'Rapid Deployment', description: 'Avoiding restrictive permitting constraints' },
                ],
              },
            },
            {
              id: 'team',
              type: 'TeamSection',
              props: {
                title: 'Meet our founders',
                description: 'We are a team of innovative deep-tech engineers with big ambitions to change the paradigm of hyperscale data centers.',
              },
            },
            {
              id: 'cta',
              type: 'CTASection',
              props: {
                title: 'Become part of a future with data centers in space',
                description: "Whether you're a curious customer or a potential partner, we'd love to hear from you.",
                ctaText: 'Get in touch',
                ctaLink: '/contact',
              },
            },
          ],
          seo: {
            title: 'Starcloud - Data Centers in Space',
            description: 'The Future of AI. As launch costs fall, data centers in space will leverage 24/7 solar energy.',
          },
        },
      ],
      globalStyles: {
        colors: {
          primary: '#000000',
          secondary: '#1A1A1A',
          accent: '#0066FF',
          background: '#FFFFFF',
          text: '#000000',
        },
        fonts: {
          heading: 'Inter, sans-serif',
          body: 'Inter, sans-serif',
        },
      },
      navigation: {
        items: [
          { label: 'Roadmap', path: '/roadmap' },
          { label: 'Team', path: '/team' },
          { label: 'Blog', path: '/blog' },
        ],
        style: 'horizontal',
      },
      footer: {
        sections: [],
        copyright: `© ${new Date().getFullYear()} Starcloud, Inc. All rights reserved.`,
      },
    },
  },
  {
    name: 'NeoCultural Couture - Fashion Innovation',
    type: 'SERVICE' as const,
    category: 'Creative / Fashion',
    description: 'Creative fashion platform with immersive visuals, cultural themes, and artistic presentation. Perfect for creative industries and fashion brands.',
    structure: {
      pages: [
        {
          id: 'home',
          name: 'Home',
          path: '/',
          components: [
            {
              id: 'hero',
              type: 'Hero',
              props: {
                title: 'Discover a futuristic fashion landscape',
                subtitle: 'Explore the future of fashion where culture meets innovation.',
                ctaText: 'Enter Website',
                ctaLink: '/explore',
              },
            },
            {
              id: 'about',
              type: 'AboutSection',
              props: {
                title: 'Embark on a visionary journey',
                description: 'Where tradition and technology converge, crafting a future where fashion transcends boundaries.',
              },
            },
            {
              id: 'collections',
              type: 'CollectionsGrid',
              props: {
                title: 'The future of fashion',
                description: 'Step into the future where each collection is a doorway to a different realm.',
                collections: [
                  { name: 'Amazonian Tech Explorer', image: '' },
                  { name: 'Nomadic Odyssey', image: '' },
                  { name: 'Mystical Bollywood Fusion', image: '' },
                  { name: 'Afro-Futurist Expression', image: '' },
                  { name: 'Urban Samurai Fusion', image: '' },
                ],
              },
            },
            {
              id: 'showcase',
              type: 'ShowcaseSection',
              props: {
                title: 'Your Vision, our canvas',
                description: 'Showcase Your AI-Generated Fashion Creations',
              },
            },
          ],
          seo: {
            title: 'NeoCultural Couture - Innovative Fashion Worlds',
            description: 'Discover a futuristic fashion landscape where culture meets innovation.',
          },
        },
      ],
      globalStyles: {
        colors: {
          primary: '#000000',
          secondary: '#FFFFFF',
          accent: '#FF6B6B',
          background: '#0A0A0A',
          text: '#FFFFFF',
        },
        fonts: {
          heading: 'Playfair Display, serif',
          body: 'Inter, sans-serif',
        },
      },
      navigation: {
        items: [
          { label: 'Collections', path: '/collections' },
          { label: 'Submit', path: '/submit' },
        ],
        style: 'horizontal',
      },
      footer: {
        sections: [],
        copyright: `© ${new Date().getFullYear()} NeoCultural Couture. All rights reserved.`,
      },
    },
  },
  {
    name: 'Little Lagniappe - Baby Food Subscription',
    type: 'SERVICE' as const,
    category: 'E-commerce / Subscription',
    description: 'Warm, family-focused design with product showcases, subscription features, and trust-building elements. Ideal for subscription services and family products.',
    structure: {
      pages: [
        {
          id: 'home',
          name: 'Home',
          path: '/',
          components: [
            {
              id: 'hero',
              type: 'Hero',
              props: {
                title: 'Building Brains for our Future Leaders',
                subtitle: 'Subscription Box Purées, Mashables, & Pinchables for Littles. From Farm to Fridge.',
                ctaText: 'Get Started',
                ctaLink: '/get-started',
              },
            },
            {
              id: 'products',
              type: 'ProductsGrid',
              props: {
                title: 'Fresh Baby Food for Adventurous Little Eaters',
                products: [
                  { name: 'Goo-Goo Gaga Gumbo', description: 'Celery, Bell Pepper, Onion, Tomato, Okra, Brown Rice' },
                  { name: 'Eggplant Étouffée', description: 'Eggplant, Garbanzo, Garlic, Purified Water, Olive Oil' },
                  { name: 'Alligator Applesauce', description: 'Apple, Cherry, Purified Water, Almond Extract' },
                  { name: "Yam Mom'n'Em", description: 'Yam, Spinach, Coconut Milk, Curry Powder' },
                  { name: 'Gris Gris Green Beans', description: 'Green Bean, Lentil, Purified Water, Dill' },
                  { name: 'Mardi Gras Mango', description: 'Mango, Banana, Coconut Milk, Nutmeg' },
                ],
              },
            },
            {
              id: 'how-it-works',
              type: 'StepsSection',
              props: {
                title: 'How It Works',
                steps: [
                  { title: 'Pick Your Plan', description: 'Our in-house nutritionist has created amazing options for your little one.' },
                  { title: 'We Make It Fresh', description: 'Once you decide on the perfect plan, we take care of everything else.' },
                  { title: 'We Ship It To Your Door', description: 'We guarantee freshness and deliver straight to your door.' },
                ],
              },
            },
            {
              id: 'benefits',
              type: 'FeaturesGrid',
              props: {
                title: 'The Benefits of Our Blends',
                features: [
                  { title: '100% Plant-Based Ingredients', description: '' },
                  { title: 'Formulated by Nutritionists', description: '' },
                  { title: 'Chef-Curated, Balanced Nutrition', description: '' },
                  { title: 'Delivery & Convenience', description: '' },
                  { title: 'Organic & Sustainable', description: '' },
                  { title: 'Eco-Friendly/BPA-Free Packaging', description: '' },
                ],
              },
            },
            {
              id: 'blog',
              type: 'BlogSection',
              props: {
                title: 'BaYOU Blog',
                description: 'Let The Good Times Scroll',
              },
            },
            {
              id: 'cta',
              type: 'CTASection',
              props: {
                title: 'Get Subscribed for a Little More Lagniappe!',
                description: 'Be the first to hear announcements about the latest products, promos, news, and more.',
                ctaText: 'Get Started',
                ctaLink: '/get-started',
              },
            },
          ],
          seo: {
            title: 'Little Lagniappe - Best First Foods for Children',
            description: 'Subscription Box Purées, Mashables, & Pinchables for Littles. From Farm to Fridge.',
          },
        },
      ],
      globalStyles: {
        colors: {
          primary: '#FF6B9D',
          secondary: '#C9A9DD',
          accent: '#FFD93D',
          background: '#FFFFFF',
          text: '#2D3748',
        },
        fonts: {
          heading: 'Comfortaa, sans-serif',
          body: 'Inter, sans-serif',
        },
      },
      navigation: {
        items: [
          { label: 'Menu', path: '/menu' },
          { label: 'Get Started', path: '/get-started' },
          { label: 'Gift', path: '/gift' },
          { label: 'About Us', path: '/about' },
          { label: 'Blog', path: '/blog' },
        ],
        style: 'horizontal',
      },
      footer: {
        sections: [
          {
            title: 'Menu',
            links: [
              { label: 'Get Started', url: '/get-started' },
              { label: 'Gift', url: '/gift' },
            ],
          },
          {
            title: 'About',
            links: [
              { label: 'About Us', url: '/about' },
              { label: 'FAQs', url: '/faqs' },
              { label: 'Blog', url: '/blog' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Little Lagniappe. All Rights Reserved.`,
      },
    },
  },
];

async function createTemplates() {
  console.log('🚀 Creating service website templates...\n');

  const results = [];

  for (const template of templates) {
    try {
      console.log(`📝 Creating template: ${template.name}`);
      console.log(`   Category: ${template.category}\n`);

      const created = await prisma.websiteTemplate.create({
        data: {
          name: template.name,
          type: template.type,
          category: template.category,
          description: template.description,
          structure: template.structure as any,
          isDefault: false,
        },
      });

      results.push({
        success: true,
        name: template.name,
        id: created.id,
      });

      console.log(`✅ Successfully created: ${template.name} (ID: ${created.id})\n`);
    } catch (error: any) {
      console.error(`❌ Failed to create ${template.name}:`, error.message);
      results.push({
        success: false,
        name: template.name,
        error: error.message,
      });
      console.log('');
    }
  }

  // Summary
  console.log('\n📊 Creation Summary:');
  console.log('─'.repeat(50));
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((result) => {
    if (result.success) {
      console.log(`✅ ${result.name} - ID: ${result.id}`);
    } else {
      console.log(`❌ ${result.name} - Error: ${result.error}`);
    }
  });

  console.log('─'.repeat(50));
  console.log(`\n✅ Successfully created: ${successful}/${templates.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${templates.length}`);
  }

  // List all SERVICE templates
  console.log('\n📋 All SERVICE templates in database:');
  const allTemplates = await prisma.websiteTemplate.findMany({
    where: { type: 'SERVICE' },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      isDefault: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (allTemplates.length === 0) {
    console.log('  (No templates found)');
  } else {
    allTemplates.forEach((t) => {
      console.log(`  - ${t.name} (${t.category || 'Uncategorized'})${t.isDefault ? ' [DEFAULT]' : ''}`);
    });
  }
}

createTemplates()
  .then(() => {
    console.log('\n✅ Template creation process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

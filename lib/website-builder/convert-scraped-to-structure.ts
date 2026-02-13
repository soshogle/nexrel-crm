/**
 * Convert scraped website data to website builder structure
 * Used by clone/rebuild flow and Import from URL in editor
 */

export function convertScrapedToComponents(scrapedData: any): any[] {
  const components: any[] = [];
  const ts = Date.now();

  // 1. Hero section - from SEO title/description + first image
  const heroImage = scrapedData.images?.[0]?.url;
  components.push({
    id: `hero-${ts}`,
    type: 'Hero',
    props: {
      title: scrapedData.seo?.title || 'Welcome',
      subtitle: scrapedData.seo?.description || '',
      imageUrl: heroImage || undefined,
      image: heroImage || undefined,
      ctaText: 'Get in Touch',
      ctaLink: '#contact',
    },
  });

  // 2. About/Text section - from SEO description
  if (scrapedData.seo?.description) {
    components.push({
      id: `about-${ts}`,
      type: 'AboutSection',
      props: {
        title: 'About Us',
        description: scrapedData.seo.description,
        ctaText: 'Learn More',
        ctaLink: '/about',
      },
    });
  }

  // 3. Image sections - from additional images (skip first, used in hero)
  const extraImages = (scrapedData.images || []).slice(1, 4);
  extraImages.forEach((img: any, i: number) => {
    components.push({
      id: `image-${ts}-${i}`,
      type: 'ImageSection',
      props: {
        title: img.alt || `Image ${i + 2}`,
        imageUrl: img.url,
        alt: img.alt || '',
      },
    });
  });

  // 4. Video section - from first video embed
  const firstVideo = scrapedData.videos?.[0];
  if (firstVideo) {
    const videoId = firstVideo.embedId || (firstVideo.url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)([a-zA-Z0-9_-]+)/)?.[1]);
    components.push({
      id: `video-${ts}`,
      type: 'VideoSection',
      props: {
        title: 'Watch',
        videoUrl: firstVideo.url || '',
        videoType: firstVideo.type === 'vimeo' ? 'vimeo' : 'youtube',
        videoId: videoId || '',
      },
    });
  }

  // 5. Contact form - from scraped forms
  const form = scrapedData.forms?.[0];
  if (form?.fields?.length) {
    const fields = form.fields.map((f: any) => ({
      name: f.name,
      type: f.type || 'text',
      label: (f.name || '').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      required: !!f.required,
    }));
    components.push({
      id: `form-${ts}`,
      type: 'ContactForm',
      props: { fields },
    });
  } else {
    components.push({
      id: `form-${ts}`,
      type: 'ContactForm',
      props: {
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
          { name: 'message', type: 'textarea', label: 'Message', required: true },
        ],
      },
    });
  }

  // 6. CTA section at the end
  components.push({
    id: `cta-${ts}`,
    type: 'CTASection',
    props: {
      title: 'Get in Touch',
      description: 'Contact us today to learn more',
      ctaText: 'Contact Us',
      ctaLink: '#contact',
    },
  });

  return components;
}

/**
 * Convert scraped data to full website structure (pages, globalStyles, etc.)
 */
export function convertScrapedToStructure(scrapedData: any): any {
  const components = convertScrapedToComponents(scrapedData);

  return {
    pages: [
      {
        id: 'home',
        name: 'Home',
        path: '/',
        components,
        seo: scrapedData.seo || {},
      },
    ],
    globalStyles: {
      colors: {
        primary: scrapedData.styles?.colors?.[0] || '#3B82F6',
        secondary: scrapedData.styles?.colors?.[1] || '#1E40AF',
        accent: scrapedData.styles?.colors?.[2] || '#60A5FA',
        background: '#FFFFFF',
        text: '#1F2937',
      },
      fonts: {
        heading: scrapedData.styles?.fonts?.[0] || 'Inter, sans-serif',
        body: scrapedData.styles?.fonts?.[0] || 'Inter, sans-serif',
      },
      spacing: { unit: 8 },
    },
    navigation: { items: [], style: 'horizontal' },
    footer: { sections: [], copyright: '' },
  };
}

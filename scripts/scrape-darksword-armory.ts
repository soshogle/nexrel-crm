#!/usr/bin/env tsx
/**
 * One-off script to scrape Darksword Armory website
 * Uses direct fetch (site blocks the scraper's block-detection flow)
 */

const SITE_URL = 'https://www.darksword-armory.com/';

async function fetchHtml(): Promise<string> {
  const res = await fetch(SITE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.text();
}

function extractSEO(html: string) {
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1];
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  return { title, description: desc, ogImage };
}

function resolveUrl(href: string): string {
  if (href.startsWith('http')) return href;
  const base = new URL(SITE_URL);
  return new URL(href, base.origin).href;
}

function extractImages(html: string): { url: string; alt?: string }[] {
  const seen = new Set<string>();
  const results: { url: string; alt?: string }[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let m;
  while ((m = regex.exec(html))) {
    const url = resolveUrl(m[1].trim());
    if (url && !seen.has(url) && !url.includes('pixel') && !url.includes('tracking')) {
      seen.add(url);
      results.push({ url, alt: m[2] || undefined });
    }
  }
  return results;
}

function extractProducts(html: string): { name: string; price?: string; url?: string }[] {
  const products: { name: string; price?: string; url?: string }[] = [];
  // WooCommerce / common e-commerce patterns
  const productBlocks = html.match(/<li[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/li>/gi) || [];
  for (const block of productBlocks.slice(0, 30)) {
    const nameMatch = block.match(/<h2[^>]*>([^<]+)<\/h2>/i) || block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)</i);
    const priceMatch = block.match(/USD[\d,.]+/);
    const linkMatch = block.match(/<a[^>]+href=["']([^"']+)["']/);
    if (nameMatch) {
      const name = (nameMatch[2] || nameMatch[1])?.replace(/\s+/g, ' ').trim();
      if (name && name.length > 2) {
        products.push({
          name,
          price: priceMatch?.[0],
          url: linkMatch?.[1] ? resolveUrl(linkMatch[1]) : undefined,
        });
      }
    }
  }
  // Fallback: look for price patterns with nearby text
  if (products.length < 5) {
    const priceRegex = /USD[\d,.]+[^<]*<\/[^>]+>[\s\S]{0,200}?([A-Za-z0-9\s\-\(\)#]+)(?=<)/gi;
    let pm;
    while ((pm = priceRegex.exec(html)) && products.length < 25) {
      const name = pm[1]?.replace(/\s+/g, ' ').trim();
      if (name && name.length > 3 && name.length < 80) {
        products.push({ name, price: pm[0].match(/USD[\d,.]+/)?.[0] });
      }
    }
  }
  return [...new Map(products.map((p) => [p.name, p])).values()];
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const regex = /<h[1-4][^>]*>([^<]+)<\/h[1-4]>/gi;
  let m;
  while ((m = regex.exec(html))) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (text && text.length < 150) headings.push(text);
  }
  return [...new Set(headings)];
}

function extractParagraphs(html: string): string[] {
  const paras: string[] = [];
  const regex = /<p[^>]*>([^<]+)<\/p>/gi;
  let m;
  while ((m = regex.exec(html))) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (text.length > 30 && text.length < 500) paras.push(text);
  }
  return paras.slice(0, 15);
}

async function main() {
  console.log('Fetching', SITE_URL, '...');
  const html = await fetchHtml();
  console.log('HTML length:', html.length);

  const seo = extractSEO(html);
  const images = extractImages(html);
  const products = extractProducts(html);
  const headings = extractHeadings(html);
  const paragraphs = extractParagraphs(html);

  const output = {
    url: SITE_URL,
    scrapedAt: new Date().toISOString(),
    seo,
    images: images.slice(0, 50),
    imageCount: images.length,
    products: products.slice(0, 30),
    productCount: products.length,
    headings,
    paragraphs: paragraphs.slice(0, 10),
  };

  const fs = await import('fs');
  fs.writeFileSync('darksword-armory-scraped.json', JSON.stringify(output, null, 2));
  console.log('\nSaved to darksword-armory-scraped.json\n');
  console.log('SEO:', seo.title);
  console.log('Description:', seo.description?.slice(0, 80) + '...');
  console.log('Images:', images.length);
  console.log('Products:', products.length);
  console.log('Headings:', headings.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

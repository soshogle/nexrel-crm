/**
 * Tier 2: Screenshot + AI Vision enrichment.
 * Uses Playwright to screenshot a listing page and OpenAI GPT-4o
 * to extract structured property data from the image.
 *
 * Used as fallback when Tier 1 (HTML scraping) fails or returns
 * insufficient data (e.g., Centris blocks the request or the page
 * requires JavaScript to render key content).
 */

import type { EnrichedData } from "./types";

const VISION_PROMPT = `You are a real estate data extraction expert. Analyze this screenshot of a property listing page and extract ALL available information into this exact JSON structure. Only include fields you can clearly see:

{
  "description": "Full property description text",
  "buildingStyle": "e.g. Two or more storey, Bungalow, Split-level",
  "yearBuilt": 2005,
  "area": "1500",
  "areaUnit": "ft²",
  "lotArea": "5000",
  "parking": "Garage (2), Driveway",
  "rooms": 8,
  "bedrooms": 3,
  "bathrooms": 2,
  "features": {
    "heating": "Forced air",
    "heatingEnergy": "Gas",
    "waterSupply": "Municipal",
    "amenities": ["Pool", "Central air", "Fireplace"],
    "proximity": ["School", "Park", "Metro"],
    "inclusions": ["Washer", "Dryer", "Dishwasher"]
  },
  "roomDetails": [
    {"name": "Kitchen", "level": "Ground floor", "dimensions": "12x14", "flooring": "Ceramic", "details": ""},
    {"name": "Living room", "level": "Ground floor", "dimensions": "15x18", "flooring": "Hardwood", "details": ""}
  ],
  "municipalTax": "$4,500",
  "schoolTax": "$500",
  "moveInDate": "60 days after acceptance",
  "brokerName": "John Smith",
  "brokerAgency": "RE/MAX",
  "brokerPhone": "+1 514-555-1234"
}

Return ONLY valid JSON, no markdown, no explanation.`;

/**
 * Take a screenshot of a URL using Playwright and extract data via OpenAI Vision.
 * Requires Playwright browsers to be installed: npx playwright install chromium
 */
export async function enrichViaVision(
  url: string,
  openaiApiKey?: string
): Promise<EnrichedData | null> {
  const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY required for Tier 2 vision enrichment");

  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Scroll down to trigger lazy-loaded content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1500);

    // Take a full-page screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: true, type: "png" });
    await browser.close();
    browser = null;

    const base64Image = screenshotBuffer.toString("base64");

    // Send to OpenAI GPT-4o vision
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: VISION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI Vision API error: ${response.status} ${err}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse the JSON response (strip any markdown fences)
    const jsonStr = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(jsonStr) as EnrichedData;

    const hasData = parsed.description || parsed.yearBuilt || parsed.area ||
      parsed.roomDetails?.length;

    return hasData ? parsed : null;
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    throw err;
  }
}

/**
 * Extract gallery image URLs from a Centris photo gallery page using Playwright.
 * Navigates to the /photos URL and extracts all high-res image sources.
 */
export async function extractGalleryImagesViaPlaywright(
  listingUrl: string
): Promise<string[]> {
  const photosUrl = listingUrl.replace(/\/?$/, "/photos");

  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();

    // Intercept image requests to capture CDN URLs
    const imageUrls = new Set<string>();
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("centris.ca/media") || url.includes("mspublic.centris.ca")) {
        // Upgrade to high-res version
        const highRes = url
          .replace(/w=\d+/, "w=1024")
          .replace(/h=\d+/, "h=768");
        imageUrls.add(highRes);
      }
    });

    await page.goto(photosUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Also extract from DOM
    const domImages = await page.evaluate(() => {
      const imgs: string[] = [];
      document.querySelectorAll("img").forEach((img) => {
        const src = img.src || img.getAttribute("data-src") || "";
        if (src.includes("centris") && src.includes("media")) {
          imgs.push(src);
        }
      });
      // Also check background images
      document.querySelectorAll("[style*='background-image']").forEach((el) => {
        const style = (el as HTMLElement).style.backgroundImage;
        const match = style.match(/url\(["']?([^"')]+)/);
        if (match?.[1]?.includes("centris")) imgs.push(match[1]);
      });
      return imgs;
    });

    domImages.forEach((url) => {
      const highRes = url.replace(/w=\d+/, "w=1024").replace(/h=\d+/, "h=768");
      imageUrls.add(highRes);
    });

    await browser.close();
    return Array.from(imageUrls);
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    throw err;
  }
}

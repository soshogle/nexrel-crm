/**
 * Soshogle AI Blog Post Generator
 * Generates problem→solution blog content for different industries
 * Uses OpenAI for content, DALL-E for problem images
 */

import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";

interface IndustryProblem {
  industry: string;
  problem: string;
  problemDescription: string;
  solutionKey: string; // Maps to Soshogle AI features
}

const INDUSTRIES: IndustryProblem[] = [
  {
    industry: "Healthcare",
    problem: "No-shows and missed appointments",
    problemDescription:
      "Clinics lose thousands in revenue when patients don't show up. Manual reminders fail, front desks can't answer every call, and scheduling gaps go unfilled.",
    solutionKey: "ai_receptionist_appointments",
  },
  {
    industry: "E-commerce",
    problem: "Abandoned carts and lost leads",
    problemDescription:
      "Visitors leave without buying. Manual follow-up doesn't scale. Drip campaigns feel generic. You're leaving money on the table with every abandoned cart.",
    solutionKey: "lead_nurture_automation",
  },
  {
    industry: "Real Estate",
    problem: "Leads go cold and follow-up slips",
    problemDescription:
      "Inquiries come in at all hours. By the time you call back, they've moved on. Manual follow-up is inconsistent and deals fall through the cracks.",
    solutionKey: "ai_receptionist_crm",
  },
  {
    industry: "Restaurants",
    problem: "Reservations chaos and no-shows",
    problemDescription:
      "Phones ring off the hook during rush. Table management is manual. No-shows leave empty seats. You need someone answering 24/7.",
    solutionKey: "ai_receptionist_booking",
  },
  {
    industry: "Professional Services",
    problem: "Leads fall through the cracks",
    problemDescription:
      "Consultants, lawyers, and agencies get inquiries on weekends and evenings. Without instant response, prospects choose competitors who answer faster.",
    solutionKey: "ai_receptionist_crm",
  },
  {
    industry: "Retail",
    problem: "Inventory and customer questions overwhelm staff",
    problemDescription:
      "Staff spends time answering "is it in stock?" and "when does X arrive?" instead of selling. After hours, nobody answers at all.",
    solutionKey: "ai_receptionist_knowledge",
  },
  {
    industry: "Fitness & Gyms",
    problem: "Membership inquiries and no-shows",
    problemDescription:
      "People want to sign up at 10pm. Class no-shows leave spots empty. Front desk can't handle tour requests during peak hours.",
    solutionKey: "ai_receptionist_appointments",
  },
  {
    industry: "Automotive",
    problem: "Service scheduling and after-hours leads",
    problemDescription:
      "Customers want to book service or ask about inventory outside business hours. Every missed call is a lost sale or service appointment.",
    solutionKey: "ai_receptionist_booking",
  },
  {
    industry: "Dental",
    problem: "Appointment no-shows and recall gaps",
    problemDescription:
      "No-shows cost thousands. Recalls get forgotten. Front desk juggles calls while patients wait. Scheduling is a constant headache.",
    solutionKey: "ai_receptionist_appointments",
  },
  {
    industry: "Salons & Spas",
    problem: "Booking chaos and last-minute cancellations",
    problemDescription:
      "Online booking helps but doesn't answer questions. Cancellations leave gaps. Staff spends hours on the phone instead of with clients.",
    solutionKey: "ai_receptionist_booking",
  },
  {
    industry: "Insurance",
    problem: "Quote requests and policy questions after hours",
    problemDescription:
      "Prospects want quotes when it's convenient for them—often evenings and weekends. Miss the window and they go to a competitor.",
    solutionKey: "ai_receptionist_crm",
  },
  {
    industry: "Property Management",
    problem: "Maintenance requests and tenant inquiries",
    problemDescription:
      "Tenants call at all hours. Maintenance requests pile up. Critical issues get lost in voicemail. You need 24/7 triage.",
    solutionKey: "ai_receptionist_crm",
  },
];

const SOLUTION_DESCRIPTIONS: Record<string, string> = {
  ai_receptionist_appointments:
    "Soshogle AI Receptionist answers calls 24/7, books appointments into your calendar, sends automated reminders to reduce no-shows, and fills gaps in your schedule—all powered by Soshogle AI.",
  ai_receptionist_booking:
    "Soshogle AI Receptionist handles reservations and bookings around the clock. It knows your availability, captures customer details, and confirms appointments—never miss a booking again.",
  ai_receptionist_crm:
    "Soshogle AI captures every lead instantly, qualifies them, and adds them to your CRM. Follow-up happens automatically. Your Nexrel dashboard shows every conversation—so nothing falls through the cracks.",
  ai_receptionist_knowledge:
    "Soshogle AI is trained on your products, inventory, and policies. It answers customer questions 24/7 so your staff can focus on selling. Integrates with your Nexrel CRM for full visibility.",
  lead_nurture_automation:
    "Soshogle AI nurtures leads with personalized campaigns, recovers abandoned carts, and follows up at the right moment. All powered by Nexrel's AI Growth Infrastructure—no manual work required.",
};

// Solution images: use og-image until you add Nexrel screenshots to /public/blog-screenshots/
const SOLUTION_SCREENSHOTS: Record<string, string> = {
  ai_receptionist_appointments: "/og-image.png",
  ai_receptionist_booking: "/og-image.png",
  ai_receptionist_crm: "/og-image.png",
  ai_receptionist_knowledge: "/og-image.png",
  lead_nurture_automation: "/og-image.png",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const minutes = Math.max(3, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export async function generateBlogPost(): Promise<{
  success: boolean;
  post?: { id: string; slug: string };
  error?: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  // Pick random industry
  const selected = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
  const solutionDesc = SOLUTION_DESCRIPTIONS[selected.solutionKey];
  const solutionImage =
    SOLUTION_SCREENSHOTS[selected.solutionKey] || "/og-image.png";

  const systemPrompt = `You are a content writer for Soshogle, an AI-powered business growth platform. Soshogle AI and Nexrel are the product names. Always say "Soshogle AI" not just "AI" when referring to the solution.

Write blog posts that:
1. Start with the business problem (relatable, specific to the industry)
2. Describe the pain in dollars, time, or lost opportunities
3. Introduce Soshogle AI / Nexrel as the solution
4. End with a clear CTA to book a demo or learn more

Tone: Professional, empathetic, solution-focused. No hype. Use "Soshogle AI" throughout.
Output: JSON with title, excerpt (2-3 sentences for social), and content (markdown, 400-600 words).`;

  const userPrompt = `Write a blog post for ${selected.industry} businesses.

Problem: ${selected.problem}
Problem context: ${selected.problemDescription}

Solution (Soshogle AI): ${solutionDesc}

Return JSON:
{
  "title": "Compelling headline with numbers or outcome if possible",
  "excerpt": "2-3 sentence summary for LinkedIn/Instagram cards",
  "content": "Full markdown content with ## headings, bullet points, problem section, solution section, CTA"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[BlogGenerator] OpenAI error:", response.status, errText);
      return { success: false, error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return { success: false, error: "No content from OpenAI" };

    const parsed = JSON.parse(raw) as {
      title: string;
      excerpt: string;
      content: string;
    };

    // Generate problem image with DALL-E (optional - skip if no key or to save cost)
    let problemImageUrl: string | null = null;
    const enableDalle = process.env.BLOG_ENABLE_DALLE === "true";
    if (enableDalle) {
      try {
        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: `Professional business illustration, modern and clean style: ${selected.industry} business struggling with ${selected.problem}. Show the frustration or chaos (e.g. phone ringing, missed calls, empty schedule). No text in image. Photorealistic, corporate style.`,
            n: 1,
            size: "1024x1024",
          }),
        });
        if (imageResponse.ok) {
          const imgData = await imageResponse.json();
          const imageUrl = imgData.data?.[0]?.url;
          if (imageUrl) {
            // Download and store in Vercel Blob
            const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
            if (blobToken) {
              const imgRes = await fetch(imageUrl);
              const blob = await imgRes.blob();
              const filename = `blog/${Date.now()}-${selected.industry.replace(/\s/g, "-")}-problem.png`;
              const blobResult = await put(filename, blob, {
                access: "public",
                contentType: "image/png",
              });
              problemImageUrl = blobResult.url;
            } else {
              problemImageUrl = imageUrl; // Use OpenAI URL temporarily (expires)
            }
          }
        }
      } catch (imgErr) {
        console.warn("[BlogGenerator] DALL-E skipped:", imgErr);
      }
    }

    const slug = slugify(parsed.title);
    const existingSlug = await prisma.blogPost.findUnique({
      where: { slug },
    });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const post = await prisma.blogPost.create({
      data: {
        slug: finalSlug,
        title: parsed.title,
        excerpt: parsed.excerpt,
        content: parsed.content,
        category: "Industry Insights",
        industry: selected.industry,
        problemImage: problemImageUrl,
        solutionImage,
        readTime: estimateReadTime(parsed.content),
      },
    });

    return { success: true, post: { id: post.id, slug: post.slug } };
  } catch (err: unknown) {
    console.error("[BlogGenerator] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export { INDUSTRIES, SOLUTION_DESCRIPTIONS };

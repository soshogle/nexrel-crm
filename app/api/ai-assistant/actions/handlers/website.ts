import { prisma } from "@/lib/db";

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = "https://" + u;
  }
  try {
    new URL(u);
    return u;
  } catch {
    throw new Error("Invalid URL. Please provide a valid website URL (e.g. example.com or https://example.com)");
  }
}

export async function cloneWebsite(userId: string, params: any) {
  const { sourceUrl, name } = params;
  if (!sourceUrl) {
    throw new Error("Please provide the URL of the website to clone (e.g. example.com)");
  }

  const url = normalizeUrl(sourceUrl);
  const websiteName = name || url.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0] || "Cloned Website";

  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const internalSecret = process.env.NEXTAUTH_SECRET;

  const response = await fetch(`${baseUrl}/api/website-builder/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internalSecret && { "x-internal-secret": internalSecret }),
    },
    body: JSON.stringify({
      name: websiteName,
      type: "REBUILT",
      sourceUrl: url,
      templateType: "SERVICE",
      enableVoiceAI: true,
      _internalUserId: userId,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to start website clone");
  }

  const data = await response.json();
  const websiteId = data.website?.id;

  return {
    message: `✅ Started cloning ${url}. This usually takes a few minutes. I'll take you to the website editor.`,
    websiteId,
    navigateTo: websiteId ? `/dashboard/websites/${websiteId}` : "/dashboard/websites",
  };
}

export async function createWebsite(userId: string, params: any) {
  const { name, templateType = "SERVICE", businessDescription, services, products } = params;
  const websiteName = name || "New Website";

  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const internalSecret = process.env.NEXTAUTH_SECRET;

  const questionnaireAnswers = {
    businessName: websiteName,
    businessDescription: businessDescription || "",
    services: services ? (Array.isArray(services) ? services : services.split(",").map((s: string) => s.trim())) : [],
    products: products ? (Array.isArray(products) ? products : products.split(",").map((p: string) => p.trim())) : [],
  };

  const response = await fetch(`${baseUrl}/api/website-builder/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internalSecret && { "x-internal-secret": internalSecret }),
    },
    body: JSON.stringify({
      name: websiteName,
      type: templateType === "PRODUCT" ? "PRODUCT_TEMPLATE" : "SERVICE_TEMPLATE",
      templateType: templateType || "SERVICE",
      questionnaireAnswers,
      prefillFromUser: !businessDescription && !services && !products,
      enableVoiceAI: true,
      _internalUserId: userId,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to create website");
  }

  const data = await response.json();
  const websiteId = data.website?.id;

  return {
    message: `✅ Created website "${websiteName}". Building now—this may take a few minutes. Taking you to the editor.`,
    websiteId,
    navigateTo: websiteId ? `/dashboard/websites/${websiteId}` : "/dashboard/websites",
  };
}

export async function listWebsites(userId: string, params: any) {
  const websites = await prisma.website.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      type: true,
      buildProgress: true,
      vercelDeploymentUrl: true,
      createdAt: true,
    },
  });

  return {
    message: `You have ${websites.length} website${websites.length !== 1 ? "s" : ""}.`,
    websites: websites.map((w) => ({
      id: w.id,
      name: w.name,
      status: w.status,
      type: w.type,
      buildProgress: w.buildProgress,
      url: w.vercelDeploymentUrl,
    })),
    navigateTo: "/dashboard/websites",
  };
}

export async function modifyWebsite(userId: string, params: any) {
  const { websiteId, message } = params;
  if (!websiteId || !message) {
    throw new Error("websiteId and message are required. Describe the change you want (e.g. 'Change the hero title to Welcome')");
  }

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) {
    throw new Error("Website not found");
  }

  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const internalSecret = process.env.NEXTAUTH_SECRET;

  const response = await fetch(`${baseUrl}/api/website-builder/modify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internalSecret && { "x-internal-secret": internalSecret }),
    },
    body: JSON.stringify({ websiteId, message, _internalUserId: userId }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to apply changes");
  }

  const data = await response.json();
  const hasPendingApproval = data.requiresApproval || data.changeApprovalId;

  return {
    message: hasPendingApproval
      ? `✅ Changes generated. Please review and approve them in the editor.`
      : `✅ Changes applied to ${website.name}.`,
    websiteId,
    navigateTo: `/dashboard/websites/${websiteId}`,
  };
}

export async function getWebsiteStructure(userId: string, params: any) {
  const { websiteId } = params;
  if (!websiteId) throw new Error("websiteId is required");

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const { getWebsiteStructureSummary } = await import("@/lib/website-builder/granular-tools");
  const summary = getWebsiteStructureSummary(website.structure as any);

  return {
    message: `Here's the structure of ${website.name}:`,
    structure: summary,
    websiteId,
    navigateTo: `/dashboard/websites/${websiteId}`,
  };
}

export async function updateHero(userId: string, params: any) {
  const { websiteId, title, subtitle, ctaText, ctaLink } = params;
  if (!websiteId) throw new Error("websiteId is required");
  if (!title && !subtitle && !ctaText && !ctaLink) {
    throw new Error("At least one of title, subtitle, ctaText, ctaLink is required");
  }

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const {
    findHeroComponent,
    applyStructureChange,
  } = await import("@/lib/website-builder/granular-tools");

  const hero = findHeroComponent(website.structure as any);
  if (!hero) throw new Error("No hero section found on this website");

  const updates: Record<string, string> = {};
  if (title !== undefined) updates.title = title;
  if (subtitle !== undefined) updates.subtitle = subtitle;
  if (ctaText !== undefined) updates.ctaText = ctaText;
  if (ctaLink !== undefined) updates.ctaLink = ctaLink;

  const path = `pages[${hero.pageIndex}].components[${hero.compIndex}].props`;
  const newStructure = applyStructureChange(website.structure as any, {
    type: "update",
    path,
    data: updates,
  });

  await prisma.website.update({
    where: { id: websiteId },
    data: { structure: newStructure },
  });

  return {
    message: `✅ Hero section updated.`,
    websiteId,
    navigateTo: `/dashboard/websites/${websiteId}`,
  };
}

export async function addSection(userId: string, params: any) {
  const { websiteId, sectionType, pagePath = "/", title, content, ctaText, ctaLink } = params;
  if (!websiteId || !sectionType) throw new Error("websiteId and sectionType are required");

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const structure = website.structure as any;
  const pages = structure?.pages || [];
  const pageIndex = pages.findIndex((p: any) => p.path === pagePath);
  if (pageIndex < 0) throw new Error(`Page not found: ${pagePath}`);

  const { applyStructureChange } = await import("@/lib/website-builder/granular-tools");

  const componentTemplates: Record<string, any> = {
    CTASection: { id: `cta-${Date.now()}`, type: "CTASection", props: { title: title || "Get in Touch", description: content || "Contact us today", ctaText: ctaText || "Contact Us", ctaLink: ctaLink || "/contact" } },
    TextSection: { id: `text-${Date.now()}`, type: "TextSection", props: { title: title || "Section", content: content || "" } },
    AboutSection: { id: `about-${Date.now()}`, type: "AboutSection", props: { title: title || "About Us", description: content || "", ctaText: ctaText || "Learn More", ctaLink: ctaLink || "/about" } },
    ContactForm: { id: `form-${Date.now()}`, type: "ContactForm", props: { fields: [{ name: "name", type: "text", label: "Name", required: true }, { name: "email", type: "email", label: "Email", required: true }, { name: "message", type: "textarea", label: "Message", required: true }] } },
    ImageSection: { id: `image-${Date.now()}`, type: "ImageSection", props: { title: title || "Image", imageUrl: "", alt: content || "" } },
    ServicesGrid: { id: `services-${Date.now()}`, type: "ServicesGrid", props: { services: [], ctaText: ctaText || "View All", ctaLink: ctaLink || "/services" } },
    ProductsGrid: { id: `products-${Date.now()}`, type: "ProductsGrid", props: { products: [], ctaText: ctaText || "View All", ctaLink: ctaLink || "/products" } },
    PopupSection: { id: `popup-${Date.now()}`, type: "PopupSection", props: { title: title || "Special Offer", content: content || "Sign up now!", trigger: "onLoad", delaySeconds: 3, showForm: true } },
    BookingWidget: { id: `booking-${Date.now()}`, type: "BookingWidget", props: { title: title || "Book Now", serviceTypes: [], duration: 60 } },
    ChatWidget: { id: `chat-${Date.now()}`, type: "ChatWidget", props: { title: "Chat with us", position: "bottomRight" } },
    VideoSection: { id: `video-${Date.now()}`, type: "VideoSection", props: { title: title || "Watch", videoUrl: "", videoType: "youtube", videoId: "" } },
  };

  const newComponent = componentTemplates[sectionType];
  if (!newComponent) throw new Error(`Unknown section type: ${sectionType}`);

  const newStructure = applyStructureChange(structure, {
    type: "add",
    path: `pages[${pageIndex}].components`,
    data: newComponent,
  });

  await prisma.website.update({
    where: { id: websiteId },
    data: { structure: newStructure },
  });

  return {
    message: `✅ Added ${sectionType} to ${pagePath}.`,
    websiteId,
    navigateTo: `/dashboard/websites/${websiteId}`,
  };
}

export async function updateSectionContent(userId: string, params: any) {
  const { websiteId, sectionType, title, content, ctaText, ctaLink, pagePath = "/" } = params;
  if (!websiteId || !sectionType) throw new Error("websiteId and sectionType are required");
  if (!title && !content && !ctaText && !ctaLink) {
    throw new Error("At least one of title, content, ctaText, ctaLink is required");
  }

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const { findSection, applyStructureChange } = await import("@/lib/website-builder/granular-tools");

  const section = findSection(website.structure as any, { pagePath, sectionType });
  if (!section) throw new Error(`Section type "${sectionType}" not found on page ${pagePath}`);

  const updates: Record<string, string> = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.description = updates.content = content;
  if (ctaText !== undefined) updates.ctaText = ctaText;
  if (ctaLink !== undefined) updates.ctaLink = ctaLink;

  const path = `pages[${section.pageIndex}].components[${section.compIndex}].props`;
  const newStructure = applyStructureChange(website.structure as any, {
    type: "update",
    path,
    data: updates,
  });

  await prisma.website.update({
    where: { id: websiteId },
    data: { structure: newStructure },
  });

  return {
    message: `✅ Updated ${sectionType} section.`,
    websiteId,
    navigateTo: `/dashboard/websites/${websiteId}`,
  };
}

export async function addCTA(userId: string, params: any) {
  const { websiteId, title, description, ctaText, ctaLink, pagePath = "/" } = params;
  if (!websiteId || !ctaText || !ctaLink) throw new Error("websiteId, ctaText, and ctaLink are required");

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const { findCTAComponent, findSection, applyStructureChange } = await import("@/lib/website-builder/granular-tools");

  const structure = website.structure as any;
  const existingCTA = findCTAComponent(structure);

  if (existingCTA) {
    const updates: Record<string, string> = { ctaText, ctaLink };
    if (title) updates.title = title;
    if (description) updates.description = description;

    const path = `pages[${existingCTA.pageIndex}].components[${existingCTA.compIndex}].props`;
    const newStructure = applyStructureChange(structure, {
      type: "update",
      path,
      data: updates,
    });
    await prisma.website.update({
      where: { id: websiteId },
      data: { structure: newStructure },
    });
    return {
      message: `✅ Updated CTA section.`,
      websiteId,
      navigateTo: `/dashboard/websites/${websiteId}`,
    };
  }

  const pages = structure?.pages || [];
  const pageIndex = pages.findIndex((p: any) => p.path === pagePath);
  if (pageIndex < 0) throw new Error(`Page not found: ${pagePath}`);

  const newComponent = {
    id: `cta-${Date.now()}`,
    type: "CTASection",
    props: {
      title: title || "Get in Touch",
      description: description || "Contact us today",
      ctaText,
      ctaLink,
    },
  };

  const newStructure = applyStructureChange(structure, {
    type: "add",
    path: `pages[${pageIndex}].components`,
    data: newComponent,
  });

  await prisma.website.update({
    where: { id: websiteId },
    data: { structure: newStructure },
  });

  return {
    message: `✅ Added CTA section.`,
    websiteId,
    navigateTo: `/dashboard/websites/${websiteId}`,
  };
}

export async function reorderSection(userId: string, params: any) {
  const { websiteId, pagePath = "/", fromIndex, toIndex } = params;
  if (!websiteId || fromIndex === undefined || toIndex === undefined) {
    throw new Error("websiteId, fromIndex, and toIndex are required");
  }

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const { reorderSections } = await import("@/lib/website-builder/granular-tools");
  const newStructure = reorderSections(website.structure as any, pagePath, fromIndex, toIndex);
  await prisma.website.update({
    where: { id: websiteId },
    data: { structure: newStructure },
  });
  return { message: `✓ Section reordered.`, websiteId, navigateTo: `/dashboard/websites/${websiteId}` };
}

export async function deleteSection(userId: string, params: any) {
  const { websiteId, sectionType, pagePath = "/" } = params;
  if (!websiteId || !sectionType) throw new Error("websiteId and sectionType are required");

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const { deleteSection: deleteSectionTool } = await import("@/lib/website-builder/granular-tools");
  const newStructure = deleteSectionTool(website.structure as any, { pagePath, sectionType });
  await prisma.website.update({
    where: { id: websiteId },
    data: { structure: newStructure },
  });
  return { message: `✓ Removed ${sectionType}.`, websiteId, navigateTo: `/dashboard/websites/${websiteId}` };
}

export async function listWebsiteMedia(userId: string, params: any) {
  const { websiteId, type } = params;
  if (!websiteId) throw new Error("websiteId is required");

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const media = await prisma.websiteMedia.findMany({
    where: { websiteId, ...(type && { type }) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return {
    message: `Found ${media.length} media item(s).`,
    media,
    websiteId,
  };
}

export async function addWebsiteImage(userId: string, params: any) {
  const { websiteId, sectionType, imageUrl, alt, pagePath = "/" } = params;
  if (!websiteId || !sectionType || !imageUrl) {
    throw new Error("websiteId, sectionType, and imageUrl are required");
  }

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");

  const { findSection, applyStructureChange } = await import("@/lib/website-builder/granular-tools");
  const section = findSection(website.structure as any, { pagePath, sectionType });
  if (!section) throw new Error(`Section "${sectionType}" not found`);

  const path = `pages[${section.pageIndex}].components[${section.compIndex}].props`;
  const updates: Record<string, string> = { imageUrl };
  if (alt) updates.alt = alt;
  const newStructure = applyStructureChange(website.structure as any, { type: "update", path, data: updates });
  await prisma.website.update({
    where: { id: websiteId },
    data: { structure: newStructure },
  });
  return { message: `✓ Image added to ${sectionType}.`, websiteId, navigateTo: `/dashboard/websites/${websiteId}` };
}

export async function makeItLookLike(userId: string, params: any) {
  const { websiteId, referenceUrl } = params;
  if (!websiteId || !referenceUrl) {
    throw new Error("websiteId and referenceUrl are required");
  }
  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");
  const { analyzeReferenceAndSuggest } = await import("@/lib/website-builder/make-it-look-like-service");
  const result = await analyzeReferenceAndSuggest(referenceUrl, website.structure, websiteId);
  return {
    message: `Analyzed ${referenceUrl}. Found ${result.suggestions.length} suggestion(s). Apply via AI Chat or Design tab.`,
    suggestions: result.suggestions,
    websiteId,
  };
}

export async function suggestHeroVariants(userId: string, params: any) {
  const { websiteId } = params;
  if (!websiteId) throw new Error("websiteId is required");
  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");
  const hero = (website.structure as any)?.pages?.[0]?.components?.find((c: any) => c.type === "Hero" || c.type === "HeroSection");
  const current = hero?.props || {};
  const variants = [
    { name: "Bold CTA", changes: { ctaText: "Get Started Free", ctaStyle: "primary" } },
    { name: "Softer ask", changes: { ctaText: "Learn More", ctaStyle: "secondary" } },
    { name: "Urgency", changes: { ctaText: "Limited Time Offer", subtitle: (current.subtitle || "") + " Act now." } },
  ];
  return {
    message: "A/B test suggestions for hero section. Use update_hero to apply.",
    variants,
    websiteId,
  };
}

export async function checkWebsiteAccessibility(userId: string, params: any) {
  const { websiteId } = params;
  if (!websiteId) throw new Error("websiteId is required");
  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });
  if (!website) throw new Error("Website not found");
  const { checkWebsiteAccessibility } = await import("@/lib/website-builder/accessibility-checker");
  const issues = checkWebsiteAccessibility(website.structure);
  return {
    message: `Found ${issues.length} accessibility issue(s).`,
    issues,
    websiteId,
  };
}

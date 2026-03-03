#!/usr/bin/env tsx
/**
 * Fix Theodora's ElevenLabs agent:
 * 1. Add client tools (searchListings, showListing, getListingDetails) so voice AI can provide listings
 * 2. Set turn_timeout_seconds to 30 (max) to prevent premature disconnect
 * 3. Set allowed_overrides for dynamic context injection
 * 4. Update prompt to mention listing capabilities
 *
 * Run: npx tsx scripts/fix-theodora-agent-tools.ts
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = "agent_6501khe58ftfefatk1hm3kfqgqxp";

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY not set");
  process.exit(1);
}

const LISTING_TOOLS_SECTION = `
═══════════════════════════════════════════════════════════════
🏠 REAL ESTATE LISTING TOOLS — USE THESE TO HELP VISITORS
═══════════════════════════════════════════════════════════════

You are a website voice assistant for Theodora Stavropoulos, a real estate broker at RE/MAX 3000 in Montréal, Quebec. Visitors are on her real estate website and you can help them find listings.

You have access to these client tools for searching and showing real estate listings:

🔍 searchListings
   Purpose: Search for properties based on criteria (bedrooms, city, price, type, etc.)
   When to use: Visitor asks about listings, properties for sale/rent, homes in a city, etc.
   After calling: Tell the visitor what you found. The listings will appear on their screen automatically.

📋 getListingDetails
   Purpose: Get full details about a specific listing by its slug/identifier
   When to use: Visitor wants more info about a specific property
   After calling: Share the key details (price, bedrooms, bathrooms, description)

🏠 showListing
   Purpose: Navigate the visitor to a specific listing page
   When to use: Visitor wants to see a specific listing on screen

IMPORTANT LISTING WORKFLOW:
1. When someone asks about properties, use searchListings immediately with their criteria
2. Share the top results conversationally (e.g. "I found 5 listings. The first one is...")
3. If they want details on a specific one, use getListingDetails
4. If they want to see it on screen, use showListing
5. You can search by: city, bedrooms, bathrooms, price range, property type (house/condo/apartment/townhouse), listing type (sale/rent)
6. Be proactive — if someone mentions a neighborhood or area, search for it
7. Always mention the price, bedrooms, and location of results`;

async function main() {
  console.log("Fetching current agent config...\n");

  const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY! },
  });
  if (!getRes.ok) {
    console.error("Failed to fetch agent:", getRes.status, await getRes.text());
    process.exit(1);
  }
  const agent = await getRes.json();

  console.log("Current agent:", agent.name);
  console.log("Current tools:", agent.tools?.length || 0);
  console.log("Current turn.turn_timeout:", agent.conversation_config?.turn?.turn_timeout);
  console.log();

  const existingPrompt: string = agent.conversation_config?.agent?.prompt?.prompt || "";

  // Update the prompt: change "phone conversation" to "website conversation" and add listing tools
  let updatedPrompt = existingPrompt.replace(
    /Important: You are having a phone conversation.*$/m,
    "Important: You are having a voice conversation on a real estate website. Keep responses conversational and helpful. Use the listing search tools to help visitors find properties."
  );

  updatedPrompt = updatedPrompt.replace(
    "You are a professional AI assistant representing",
    "You are Theodora's AI receptionist on her real estate website. You represent"
  );

  // Insert listing tools section before the first confidentiality section
  const confMarker = "═══════════════════════════════════════════════════════════════════\n🚨 CONFIDENTIALITY";
  const confIdx = updatedPrompt.indexOf(confMarker);
  if (confIdx > 0) {
    updatedPrompt = updatedPrompt.slice(0, confIdx) + LISTING_TOOLS_SECTION + "\n\n" + updatedPrompt.slice(confIdx);
  } else {
    updatedPrompt += "\n" + LISTING_TOOLS_SECTION;
  }

  const payload = {
    conversation_config: {
      agent: {
        prompt: {
          prompt: updatedPrompt,
        },
        first_message: agent.conversation_config?.agent?.first_message || "Hello! This is Theodora's office. How can I help you today?",
        language: agent.conversation_config?.agent?.language || "en",
      },
      turn: { mode: "turn", turn_timeout: 30 }, // CRITICAL: ElevenLabs uses turn.turn_timeout (not conversation). Unset defaults to 7s.
      conversation: {
        max_duration_seconds: 1800,
        turn_timeout_seconds: 30,
      },
    },
    platform_settings: {
      ...(agent.platform_settings || {}),
      allowed_overrides: {
        agent: ["prompt", "language"],
      },
    },
    tools: [
      {
        type: "client",
        name: "searchListings",
        description:
          "Search for real estate listings based on criteria. Returns matching properties. Use when visitor asks about available properties, homes for sale, rentals, condos, etc.",
        parameters: {
          type: "object",
          properties: {
            bedrooms: { type: "number", description: "Number of bedrooms" },
            bathrooms: { type: "number", description: "Number of bathrooms" },
            city: { type: "string", description: "City name to search in" },
            search: { type: "string", description: "Free text search (address, neighborhood, MLS number)" },
            listing_type: { type: "string", enum: ["sale", "rent"], description: "sale or rent" },
            property_type: {
              type: "string",
              enum: ["house", "condo", "apartment", "townhouse"],
              description: "Type of property",
            },
            min_price: { type: "number", description: "Minimum price" },
            max_price: { type: "number", description: "Maximum price" },
          },
        },
        expects_response: true,
      },
      {
        type: "client",
        name: "showListing",
        description:
          "Navigate the visitor to view a specific listing page on the website. Use when visitor wants to see a particular property.",
        parameters: {
          type: "object",
          properties: {
            slug: { type: "string", description: "The listing slug/identifier to show" },
          },
          required: ["slug"],
        },
        expects_response: true,
      },
      {
        type: "client",
        name: "getListingDetails",
        description:
          "Get full details about a specific listing including price, bedrooms, bathrooms, description. Use when visitor wants more information about a specific property.",
        parameters: {
          type: "object",
          properties: {
            slug: { type: "string", description: "The listing slug/identifier" },
          },
          required: ["slug"],
        },
        expects_response: true,
      },
    ],
  };

  console.log("Updating agent with:");
  console.log("  - 3 client tools (searchListings, showListing, getListingDetails)");
  console.log("  - turn_timeout_seconds: 30");
  console.log("  - max_duration_seconds: 1800");
  console.log("  - allowed_overrides: agent [prompt, language]");
  console.log();

  const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    console.error("PATCH failed:", patchRes.status, errText);
    process.exit(1);
  }

  const result = await patchRes.json();
  console.log("Agent updated successfully!");
  console.log("  Agent ID:", result.agent_id);
  console.log("  Tools:", result.tools?.length || 0);
  result.tools?.forEach((t: any) => {
    console.log(`    - [${t.type}] ${t.name}`);
  });
  console.log("  turn.turn_timeout:", result.conversation_config?.turn?.turn_timeout);
  console.log("  max_duration_seconds:", result.conversation_config?.conversation?.max_duration_seconds);
  console.log("  allowed_overrides:", JSON.stringify(result.platform_settings?.allowed_overrides));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

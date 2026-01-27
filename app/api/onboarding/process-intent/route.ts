
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transcript, currentStep, context } = await req.json();

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    // Use LLM to understand user intent
    const response = await fetch(
      "https://api.abacus.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant helping users set up their CRM system. 
Current setup step: ${currentStep}
Context: ${JSON.stringify(context)}

Analyze the user's voice command and respond with a JSON object containing:
{
  "intent": "continue" | "skip" | "help" | "configure" | "back",
  "extractedData": { 
    // Any relevant data extracted from the command (e.g., channel types, preferences)
  },
  "response": "A friendly, conversational response to the user (2-3 sentences max)",
  "suggestedAction": "What the system should do next"
}

Be conversational, helpful, and concise. If the user seems uncertain, offer guidance.`,
            },
            {
              role: "user",
              content: transcript,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to process intent with AI");
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content;

    // Parse AI response
    let parsedIntent;
    try {
      parsedIntent = JSON.parse(aiMessage);
    } catch (e) {
      // Fallback if AI doesn't return valid JSON
      parsedIntent = {
        intent: "help",
        extractedData: {},
        response:
          "I didn't quite catch that. Could you please repeat or type your preference?",
        suggestedAction: "wait_for_input",
      };
    }

    return NextResponse.json(parsedIntent);
  } catch (error) {
    console.error("Error processing intent:", error);
    return NextResponse.json(
      { error: "Failed to process voice command" },
      { status: 500 }
    );
  }
}

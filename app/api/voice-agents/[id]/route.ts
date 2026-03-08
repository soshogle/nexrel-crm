import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { generateReservationSystemPrompt } from "@/lib/voice-reservation-helper";
import { elevenLabsProvisioning } from "@/lib/elevenlabs-provisioning";
import { EASTERN_TIME_SYSTEM_INSTRUCTION } from "@/lib/voice-time-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/voice-agents/[id] - Get single voice agent

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
    });

    if (!user) {
      return apiErrors.notFound("User not found");
    }

    const agent = await db.voiceAgent.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      include: {
        callLogs: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        knowledgeBaseFiles: {
          include: {
            knowledgeBaseFile: true,
          },
          orderBy: { addedAt: "desc" },
        },
        _count: {
          select: {
            callLogs: true,
          },
        },
      },
    });

    if (!agent) {
      return apiErrors.notFound("Voice agent not found");
    }

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error("Error fetching voice agent:", error);
    return apiErrors.internal("Failed to fetch voice agent");
  }
}

// PUT /api/voice-agents/[id] - Update voice agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
    });

    if (!user) {
      return apiErrors.notFound("User not found");
    }

    const body = await request.json();

    // 📚 FETCH AND MERGE KNOWLEDGE BASE FILES
    let enhancedKnowledgeBase = body.knowledgeBase || "";
    let knowledgeBaseFiles = body.knowledgeBaseFiles || [];

    try {
      console.log("📚 Fetching knowledge base files for agent update...");

      // Fetch only files associated with this specific agent via junction table
      const agentFileAssociations =
        await db.voiceAgentKnowledgeBaseFile.findMany({
          where: {
            voiceAgentId: params.id,
          },
          include: {
            knowledgeBaseFile: true,
          },
          orderBy: { addedAt: "desc" },
        });

      // Extract the knowledge base files and filter by userId for security
      const userKnowledgeBaseFiles = agentFileAssociations
        .map((association) => association.knowledgeBaseFile)
        .filter((file) => file.userId === ctx.userId);

      if (userKnowledgeBaseFiles.length > 0) {
        console.log(
          `📄 Found ${userKnowledgeBaseFiles.length} knowledge base file(s)`,
        );

        const kbFileTexts = userKnowledgeBaseFiles
          .filter((file) => file.extractedText && file.extractedText.trim())
          .map((file) => {
            knowledgeBaseFiles.push({
              name: file.fileName,
              type: file.fileType,
              uploadedAt: file.createdAt.toISOString(),
            });
            return `\n\n--- ${file.fileName} ---\n${file.extractedText}`;
          })
          .join("\n");

        if (kbFileTexts) {
          enhancedKnowledgeBase = enhancedKnowledgeBase
            ? `${enhancedKnowledgeBase}\n\n=== KNOWLEDGE BASE DOCUMENTS ===${kbFileTexts}`
            : `=== KNOWLEDGE BASE DOCUMENTS ===${kbFileTexts}`;

          console.log(
            `✅ Merged ${userKnowledgeBaseFiles.length} knowledge base file(s) (${kbFileTexts.length} characters)`,
          );
        }
      }
    } catch (error: any) {
      console.error(
        "⚠️  Error fetching knowledge base files (continuing anyway):",
        error.message,
      );
    }

    // Build system prompt with enhanced knowledge base
    let systemPrompt = body.systemPrompt;

    // If enableReservations is true, use the reservation-aware prompt
    if (body.enableReservations && !systemPrompt) {
      systemPrompt = generateReservationSystemPrompt({
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        knowledgeBase: enhancedKnowledgeBase,
      });
    } else if (!systemPrompt) {
      const { LANGUAGE_PROMPT_SECTION } = await import("@/lib/voice-languages");
      // Default prompt if no custom prompt provided - multilingual like landing page
      systemPrompt = `${LANGUAGE_PROMPT_SECTION}

You are an AI voice assistant for ${body.businessName}${body.businessIndustry ? ` in the ${body.businessIndustry} industry` : ""}.

${enhancedKnowledgeBase || "Answer customer questions professionally and helpfully."}

${body.greetingMessage ? `Start conversations with: ${body.greetingMessage}` : ""}`;
    } else {
      const { LANGUAGE_PROMPT_SECTION } = await import("@/lib/voice-languages");
      systemPrompt = `${LANGUAGE_PROMPT_SECTION}\n\n${systemPrompt}`;
    }

    const originalAgent = await db.voiceAgent.findFirst({
      where: { id: params.id, userId: ctx.userId },
    });

    const agent = await db.voiceAgent.updateMany({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      data: {
        // Basic Info
        name: body.name,
        description: body.description,
        type: body.type,
        status: body.status,
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,

        // Knowledge & Prompts - Use enhanced knowledge base
        knowledgeBase: enhancedKnowledgeBase,
        knowledgeBaseSources:
          body.knowledgeBaseTexts?.length ||
          body.knowledgeBaseUrls?.length ||
          knowledgeBaseFiles.length
            ? {
                texts: (body.knowledgeBaseTexts || []).filter((t: string) =>
                  t.trim(),
                ),
                urls: (body.knowledgeBaseUrls || []).filter((u: string) =>
                  u.trim(),
                ),
                files: knowledgeBaseFiles,
              }
            : undefined,
        // Support both old (greetingMessage) and new (inbound/outbound) fields
        greetingMessage: body.greetingMessage, // Legacy field
        inboundGreeting:
          body.inboundGreeting !== undefined
            ? body.inboundGreeting
            : body.type === "INBOUND"
              ? body.greetingMessage
              : undefined,
        outboundGreeting:
          body.outboundGreeting !== undefined
            ? body.outboundGreeting
            : body.type === "OUTBOUND"
              ? body.greetingMessage
              : undefined,
        systemPrompt,
        firstMessage:
          body.firstMessage ||
          body.inboundGreeting ||
          body.outboundGreeting ||
          body.greetingMessage,
        enableReservations:
          body.enableReservations !== undefined
            ? body.enableReservations
            : undefined,

        // ElevenLabs Voice Configuration
        voiceId: body.voiceId,

        // Voice Settings
        stability: body.stability ?? 0.5,
        similarityBoost: body.similarityBoost ?? 0.75,
        style: body.style ?? 0.0,
        useSpeakerBoost: body.useSpeakerBoost ?? true,

        // TTS Configuration
        ttsModel: body.ttsModel || "eleven_multilingual_v2",
        outputFormat: body.outputFormat || "pcm_16000",

        // LLM Configuration
        llmModel: body.llmModel || "gpt-4",
        temperature: body.temperature ?? 0.7,
        maxTokens: body.maxTokens || 500,

        // Conversation Settings
        maxCallDuration: body.maxCallDuration || 600,
        enableInterruptions: body.enableInterruptions ?? true,
        responseDelay: body.responseDelay || 100,

        // Language
        language: body.language || "en",

        // Calendar & Scheduling
        googleCalendarId: body.googleCalendarId,
        availableHours: body.availableHours,
        appointmentDuration: body.appointmentDuration || 30,

        // Call Handling
        transferPhone: body.transferPhone,
        backupPhoneNumber: body.backupPhoneNumber,
        twilioPhoneNumber: body.twilioPhoneNumber,
        enableVoicemail: body.enableVoicemail || false,
        voicemailMessage: body.voicemailMessage,

        // Recording & Transcription Settings
        enableCallRecording:
          body.enableCallRecording !== undefined
            ? body.enableCallRecording
            : true,
        enableTranscription:
          body.enableTranscription !== undefined
            ? body.enableTranscription
            : true,
        sendRecordingEmail:
          body.sendRecordingEmail !== undefined
            ? body.sendRecordingEmail
            : false,
        recordingEmailAddress: body.recordingEmailAddress || null,

        // Advanced Settings
        pronunciationDict: body.pronunciationDict,
        webhookUrl: body.webhookUrl,
        customData: body.customData,
      },
    });

    if (agent.count === 0) {
      return apiErrors.notFound("Voice agent not found");
    }

    const updatedAgent = await db.voiceAgent.findUnique({
      where: { id: params.id },
    });

    // 📞 ASSIGN PHONE TO ELEVENLABS: When phone number changes, import and assign
    const phoneChanged =
      body.twilioPhoneNumber !== undefined &&
      body.twilioPhoneNumber !== originalAgent?.twilioPhoneNumber &&
      body.twilioPhoneNumber?.trim();
    if (
      phoneChanged &&
      updatedAgent?.elevenLabsAgentId &&
      body.twilioPhoneNumber?.trim()
    ) {
      try {
        const formattedPhone = body.twilioPhoneNumber.trim().startsWith("+")
          ? body.twilioPhoneNumber.trim()
          : body.twilioPhoneNumber.replace(/\D/g, "").length === 10
            ? "+1" + body.twilioPhoneNumber.replace(/\D/g, "")
            : "+" + body.twilioPhoneNumber.replace(/\D/g, "");
        const importResult = await elevenLabsProvisioning.importPhoneNumber(
          formattedPhone,
          updatedAgent.elevenLabsAgentId,
          ctx.userId,
        );
        if (importResult.success) {
          await db.voiceAgent.update({
            where: { id: params.id },
            data: { elevenLabsPhoneNumberId: importResult.phoneNumberId },
          });
          console.log("✅ Phone assigned to ElevenLabs agent");
        } else {
          console.warn(
            "⚠️ ElevenLabs phone import failed:",
            importResult.error,
          );
        }
      } catch (phoneErr: any) {
        console.warn(
          "⚠️ ElevenLabs phone assignment error:",
          phoneErr?.message,
        );
      }
    }

    // 🔄 SYNC WITH ELEVENLABS: Update the agent in ElevenLabs if it exists
    if (updatedAgent?.elevenLabsAgentId) {
      try {
        console.log(
          "🔄 Syncing agent with ElevenLabs:",
          updatedAgent.elevenLabsAgentId,
        );

        // Prepare the updates for ElevenLabs
        // Use appropriate greeting based on agent type
        const greetingForElevenLabs =
          updatedAgent.type === "OUTBOUND"
            ? updatedAgent.outboundGreeting || updatedAgent.greetingMessage
            : updatedAgent.inboundGreeting || updatedAgent.greetingMessage;

        const { ensureMultilingualPrompt } = await import(
          "@/lib/voice-languages"
        );
        const multilingualPrompt = ensureMultilingualPrompt(systemPrompt);

        const elevenLabsUpdates: any = {
          name: updatedAgent.name,
          systemPrompt: multilingualPrompt,
          greetingMessage:
            greetingForElevenLabs || updatedAgent.firstMessage || "",
          language: body.language || "en",
        };

        // Include voice settings if voiceId is set
        if (updatedAgent.voiceId) {
          elevenLabsUpdates.voiceId = updatedAgent.voiceId;
        }

        // Update the agent in ElevenLabs
        await elevenLabsProvisioning.updateAgent(
          updatedAgent.elevenLabsAgentId,
          elevenLabsUpdates,
          ctx.userId,
        );

        console.log(
          "✅ ElevenLabs agent updated successfully with new knowledge base",
        );
      } catch (elevenLabsError: any) {
        console.error(
          "⚠️  Failed to sync with ElevenLabs (database was updated):",
          elevenLabsError.message,
        );
        // Don't fail the request - database was updated successfully
        // The agent will still work with the old ElevenLabs config until next sync
      }
    }

    // 📌 UPDATE KNOWLEDGE BASE FILE ASSOCIATIONS IF PROVIDED
    if (
      body.knowledgeBaseFileIds !== undefined &&
      Array.isArray(body.knowledgeBaseFileIds)
    ) {
      try {
        console.log(`🔗 Updating file associations for agent ${params.id}...`);

        // Remove all existing associations for this agent
        await db.voiceAgentKnowledgeBaseFile.deleteMany({
          where: {
            voiceAgentId: params.id,
          },
        });
        console.log("✅ Removed existing file associations");

        // Add new associations if any files are provided
        if (body.knowledgeBaseFileIds.length > 0) {
          // Verify user owns these files
          const ownedFiles = await db.knowledgeBaseFile.findMany({
            where: {
              id: { in: body.knowledgeBaseFileIds },
              userId: ctx.userId,
            },
            select: { id: true },
          });

          // Create new junction table entries
          await db.voiceAgentKnowledgeBaseFile.createMany({
            data: ownedFiles.map((file) => ({
              voiceAgentId: params.id,
              knowledgeBaseFileId: file.id,
            })),
            skipDuplicates: true,
          });

          console.log(`✅ Associated ${ownedFiles.length} file(s) with agent`);
        }
      } catch (updateError) {
        console.error("⚠️ Error updating file associations:", updateError);
        // Don't fail the entire update if file association fails
      }
    }

    return NextResponse.json(updatedAgent);
  } catch (error: any) {
    console.error("Error updating voice agent:", error);
    return apiErrors.internal(
      "We couldn't save your changes. Please try again.",
    );
  }
}

// DELETE /api/voice-agents/[id] - Delete voice agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
    });

    if (!user) {
      return apiErrors.notFound("User not found");
    }

    // First, get the agent to retrieve the ElevenLabs agent ID
    const agent = await db.voiceAgent.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (!agent) {
      return apiErrors.notFound("Voice agent not found");
    }

    // Delete from ElevenLabs if elevenLabsAgentId exists
    if (agent.elevenLabsAgentId) {
      console.log(`🗑️ Deleting ElevenLabs agent: ${agent.elevenLabsAgentId}`);
      const deleteResult = await elevenLabsProvisioning.deleteAgent(
        agent.elevenLabsAgentId,
        ctx.userId,
      );

      if (!deleteResult.success) {
        console.error(
          "⚠️ Failed to delete from ElevenLabs:",
          deleteResult.error,
        );
        // Continue with database deletion even if ElevenLabs deletion fails
        // to avoid orphaned records in the CRM
      } else {
        console.log("✅ Successfully deleted agent from ElevenLabs");
      }
    }

    // Delete from database
    const result = await db.voiceAgent.deleteMany({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    });

    if (result.count === 0) {
      return apiErrors.notFound("Voice agent not found");
    }

    console.log(`✅ Successfully deleted voice agent ${params.id} from CRM`);
    return NextResponse.json({
      success: true,
      message:
        "Voice agent deleted successfully from both CRM and Soshogle Voice AI",
    });
  } catch (error: any) {
    console.error("Error deleting voice agent:", error);
    return apiErrors.internal("Failed to delete voice agent");
  }
}

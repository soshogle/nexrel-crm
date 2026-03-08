import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { elevenLabsProvisioning } from "@/lib/elevenlabs-provisioning";
import { generateReservationSystemPrompt } from "@/lib/voice-reservation-helper";
import { VOICE_AGENT_LIMIT } from "@/lib/voice-agent-templates";
import { apiErrors } from "@/lib/api-error";
import { parsePagination, paginatedResponse } from "@/lib/api-utils";
import { z } from "zod";

const VoiceAgentCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    businessName: z.string().min(1, "Business name is required").max(255),
    description: z.string().max(2000).optional(),
    type: z.enum(["INBOUND", "OUTBOUND"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "TESTING", "PENDING"]).optional(),
    businessIndustry: z.string().max(100).optional(),
    knowledgeBase: z.string().max(100_000).optional(),
    greetingMessage: z.string().max(1000).optional(),
    inboundGreeting: z.string().max(1000).optional(),
    outboundGreeting: z.string().max(1000).optional(),
    firstMessage: z.string().max(1000).optional(),
    systemPrompt: z.string().max(50_000).optional(),
    voiceId: z.string().max(100).optional(),
    language: z.string().max(10).optional(),
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    useSpeakerBoost: z.boolean().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(4096).optional(),
    maxCallDuration: z.number().int().min(30).max(7200).optional(),
    enableInterruptions: z.boolean().optional(),
    responseDelay: z.number().int().min(0).max(5000).optional(),
    transferPhone: z.string().max(50).optional(),
    backupPhoneNumber: z.string().max(50).optional(),
    twilioPhoneNumber: z.string().max(50).optional(),
    enableVoicemail: z.boolean().optional(),
    voicemailMessage: z.string().max(1000).optional(),
    enableCallRecording: z.boolean().optional(),
    enableTranscription: z.boolean().optional(),
    sendRecordingEmail: z.boolean().optional(),
    recordingEmailAddress: z.string().email().optional().nullable(),
    enableReservations: z.boolean().optional(),
    googleCalendarId: z.string().max(255).optional(),
    appointmentDuration: z.number().int().min(5).max(480).optional(),
    aiPrompt: z.string().max(10_000).optional(),
    webhookUrl: z.string().url().max(500).optional().or(z.literal("")),
    knowledgeBaseTexts: z.array(z.string().max(50_000)).optional(),
    knowledgeBaseUrls: z.array(z.string().url().max(500)).optional(),
    knowledgeBaseFileIds: z.array(z.string()).optional(),
    llmModel: z.string().max(100).optional(),
    ttsModel: z.string().max(100).optional(),
    outputFormat: z.string().max(50).optional(),
  })
  .passthrough(); // allow extra fields for forward-compat

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// GET /api/voice-agents - List all voice agents for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id && !session?.user?.email) {
      return apiErrors.unauthorized();
    }

    // Look up user from main DB (where provision writes agents). Prefer email for consistency across meta/main DB split.
    let user = session.user.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;
    if (!user && session.user.id) {
      user = await prisma.user.findUnique({ where: { id: session.user.id } });
    }
    const userId = user?.id ?? session.user.id;
    if (!userId) {
      return apiErrors.notFound("User not found");
    }

    const pagination = parsePagination(request);

    // VoiceAgent, Industry/RE/Professional AI Employee agents all live in main DB (provision writes there)
    const agents = await (prisma as any).voiceAgent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            callLogs: true,
            outboundCalls: true,
            campaigns: true,
          },
        },
      },
      take: pagination.take,
      skip: pagination.skip,
    });

    // Include Industry AI Employee agents (Dental, Medical, Orthodontist, etc.)
    const industryAgents = await (
      prisma as any
    ).industryAIEmployeeAgent.findMany({
      where: { userId, status: "active" },
    });

    const industryAgentsForPreview = industryAgents.map((a: any) => ({
      id: a.id,
      name: a.name,
      industry: a.industry,
      employeeType: a.employeeType,
      twilioPhoneNumber: a.twilioPhoneNumber,
      elevenLabsAgentId: a.elevenLabsAgentId,
      _count: { callLogs: a.callCount, outboundCalls: 0, campaigns: 0 },
      elevenLabsCallCount: a.callCount,
      aiEmployeeCount: 0,
      source: "industry" as const,
    }));

    // Include RE AI Employee agents (Sarah, Michael, etc.) for preview
    const reAgents = await (prisma as any).rEAIEmployeeAgent.findMany({
      where: { userId },
    });
    const reAgentsForPreview = reAgents.map((a: any) => ({
      id: a.id,
      name: a.name,
      employeeType: a.employeeType,
      twilioPhoneNumber: a.twilioPhoneNumber,
      elevenLabsAgentId: a.elevenLabsAgentId,
      _count: { callLogs: 0, outboundCalls: 0, campaigns: 0 },
      elevenLabsCallCount: 0,
      aiEmployeeCount: 0,
      source: "re" as const,
    }));

    // Include Professional AI Employee agents (Accountant, Developer, etc.) for preview
    const profAgents = await (
      prisma as any
    ).professionalAIEmployeeAgent.findMany({
      where: { userId },
    });
    const profAgentsForPreview = profAgents.map((a: any) => ({
      id: a.id,
      name: a.name,
      employeeType: a.employeeType,
      twilioPhoneNumber: a.twilioPhoneNumber,
      elevenLabsAgentId: a.elevenLabsAgentId,
      _count: { callLogs: 0, outboundCalls: 0, campaigns: 0 },
      elevenLabsCallCount: 0,
      aiEmployeeCount: 0,
      source: "professional" as const,
    }));

    // Get AI employee counts per agent
    const aiEmployeeCounts = await (prisma as any).userAIEmployee.groupBy({
      by: ["voiceAgentId"],
      where: {
        userId,
        voiceAgentId: { not: null },
      },
      _count: { voiceAgentId: true },
    });
    const aiCountByAgent = Object.fromEntries(
      aiEmployeeCounts.map((r: any) => [r.voiceAgentId, r._count.voiceAgentId]),
    );

    // Fetch call counts from ElevenLabs for each agent
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    const enrichedAgents = await Promise.all(
      agents.map(async (agent: any) => {
        let elevenLabsCallCount = 0;

        // Only fetch if agent has ElevenLabs agent ID and API key is configured
        if (agent.elevenLabsAgentId && elevenLabsApiKey) {
          try {
            const response = await fetch(
              `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agent.elevenLabsAgentId}&page_size=1`,
              {
                headers: {
                  "xi-api-key": elevenLabsApiKey,
                },
              },
            );

            if (response.ok) {
              const data = await response.json();
              // ElevenLabs doesn't return total count in the list endpoint,
              // so we'll fetch all conversations to get accurate count
              const fullResponse = await fetch(
                `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agent.elevenLabsAgentId}&page_size=100`,
                {
                  headers: {
                    "xi-api-key": elevenLabsApiKey,
                  },
                },
              );

              if (fullResponse.ok) {
                const fullData = await fullResponse.json();
                elevenLabsCallCount = fullData.conversations?.length || 0;
              }
            }
          } catch (error) {
            console.error(
              `Error fetching ElevenLabs calls for agent ${agent.id}:`,
              error,
            );
            // Fall back to database count on error
            elevenLabsCallCount = agent._count.callLogs;
          }
        } else {
          // Use database count if no ElevenLabs integration
          elevenLabsCallCount = agent._count.callLogs;
        }

        return {
          ...agent,
          _count: {
            ...agent._count,
            callLogs: Math.max(agent._count.callLogs, elevenLabsCallCount),
          },
          elevenLabsCallCount,
          aiEmployeeCount: aiCountByAgent[agent.id] || 0,
        };
      }),
    );

    // Include CRM Voice Assistant (website/conversational AI) when user has one
    const crmAssistantForPreview: any[] = [];
    if (user && (user as any).crmVoiceAgentId) {
      crmAssistantForPreview.push({
        id: `crm-assistant-${user.id}`,
        name: `${user.name || "Your Business"} CRM Assistant`,
        elevenLabsAgentId: (user as any).crmVoiceAgentId,
        _count: { callLogs: 0, outboundCalls: 0, campaigns: 0 },
        elevenLabsCallCount: 0,
        aiEmployeeCount: 0,
        source: "crm-assistant" as const,
        businessName: user.name || "Your Business",
      });
    }

    // Merge all agent types for unified list
    const allAgents = [
      ...enrichedAgents,
      ...crmAssistantForPreview,
      ...industryAgentsForPreview.filter((ia: any) => ia.elevenLabsAgentId),
      ...reAgentsForPreview.filter((a: any) => a.elevenLabsAgentId),
      ...profAgentsForPreview.filter((a: any) => a.elevenLabsAgentId),
    ];

    const total = allAgents.length;
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[voice-agents] Returning ${total} agents for user ${userId}`,
      );
    }
    return paginatedResponse(allAgents, total, pagination, "voiceAgents");
  } catch (error: any) {
    console.error("Error fetching voice agents:", error);
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: error?.message, stack: error?.stack },
        { status: 500 },
      );
    }
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/voice-agents - Create new voice agent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiErrors.unauthorized();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return apiErrors.notFound("User not found");

    // Enforce 12-agent limit (super admins bypass)
    if (user.role !== "SUPER_ADMIN") {
      const existingCount = await (prisma as any).voiceAgent.count({
        where: { userId: user.id },
      });
      if (existingCount >= VOICE_AGENT_LIMIT) {
        return NextResponse.json(
          {
            error: `Voice agent limit reached. Maximum ${VOICE_AGENT_LIMIT} agents per account.`,
          },
          { status: 403 },
        );
      }
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return apiErrors.badRequest("Request body must be valid JSON");
    }

    const parseResult = VoiceAgentCreateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiErrors.validationError(
        "Invalid voice agent data",
        parseResult.error.flatten(),
      );
    }
    const body = parseResult.data;
    const ownerPhone =
      typeof user.phone === "string" && user.phone.trim().length > 0
        ? user.phone.trim()
        : null;
    const requestedTransferPhone =
      typeof body.transferPhone === "string" &&
      body.transferPhone.trim().length > 0
        ? body.transferPhone.trim()
        : null;
    const requestedBackupPhone =
      typeof body.backupPhoneNumber === "string" &&
      body.backupPhoneNumber.trim().length > 0
        ? body.backupPhoneNumber.trim()
        : null;

    const fallbackFromOwnerProfile =
      !requestedTransferPhone && !requestedBackupPhone;
    const effectiveTransferPhone =
      requestedTransferPhone || (fallbackFromOwnerProfile ? ownerPhone : null);
    const effectiveBackupPhone =
      requestedBackupPhone || (fallbackFromOwnerProfile ? ownerPhone : null);

    const knowledgeBaseTexts = Array.isArray(body.knowledgeBaseTexts)
      ? body.knowledgeBaseTexts.filter((t) => typeof t === "string" && t.trim())
      : [];
    const knowledgeBaseUrls = Array.isArray(body.knowledgeBaseUrls)
      ? body.knowledgeBaseUrls.filter((u) => typeof u === "string" && u.trim())
      : [];
    const knowledgeBaseFileIds = Array.isArray(body.knowledgeBaseFileIds)
      ? body.knowledgeBaseFileIds
      : [];

    type KnowledgeBaseSourceFile = {
      name: string;
      type: string;
      uploadedAt: string;
    };
    const legacyKnowledgeBaseFilesRaw = (
      body as { knowledgeBaseFiles?: unknown }
    ).knowledgeBaseFiles;
    const legacyKnowledgeBaseFiles: KnowledgeBaseSourceFile[] = Array.isArray(
      legacyKnowledgeBaseFilesRaw,
    )
      ? legacyKnowledgeBaseFilesRaw.filter(
          (file): file is KnowledgeBaseSourceFile => {
            if (!file || typeof file !== "object") return false;
            const candidate = file as Record<string, unknown>;
            return (
              typeof candidate.name === "string" &&
              typeof candidate.type === "string" &&
              typeof candidate.uploadedAt === "string"
            );
          },
        )
      : [];

    // Fetch user's language preference
    const userLanguage = user.language || body.language || "en";
    const { LANGUAGE_PROMPT_SECTION, ensureMultilingualPrompt } = await import(
      "@/lib/voice-languages"
    );

    // Build system prompt
    let systemPrompt = body.systemPrompt;
    if (body.enableReservations && !systemPrompt) {
      systemPrompt = generateReservationSystemPrompt({
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        knowledgeBase: body.knowledgeBase,
      });
    } else if (!systemPrompt) {
      systemPrompt = `${LANGUAGE_PROMPT_SECTION}

You are an AI voice assistant for ${body.businessName}${body.businessIndustry ? ` in the ${body.businessIndustry} industry` : ""}.

${body.knowledgeBase || "Answer customer questions professionally and helpfully."}

${body.greetingMessage ? `Start conversations with: ${body.greetingMessage}` : ""}`;
    } else {
      systemPrompt = ensureMultilingualPrompt(systemPrompt);
    }

    // Create agent in database
    const agentType = body.type || "INBOUND";
    const agent = await (prisma as any).voiceAgent.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description,
        type: agentType,
        status: body.status || "TESTING",
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        knowledgeBase: body.knowledgeBase,
        knowledgeBaseSources:
          knowledgeBaseTexts.length ||
          knowledgeBaseUrls.length ||
          legacyKnowledgeBaseFiles.length
            ? {
                texts: knowledgeBaseTexts,
                urls: knowledgeBaseUrls,
                files: legacyKnowledgeBaseFiles,
              }
            : undefined,
        greetingMessage: body.greetingMessage,
        inboundGreeting:
          body.inboundGreeting ||
          (agentType === "INBOUND" ? body.greetingMessage : null),
        outboundGreeting:
          body.outboundGreeting ||
          (agentType === "OUTBOUND" ? body.greetingMessage : null),
        systemPrompt,
        firstMessage:
          body.firstMessage ||
          body.inboundGreeting ||
          body.outboundGreeting ||
          body.greetingMessage,
        enableReservations: body.enableReservations || false,
        voiceId: body.voiceId || "EXAVITQu4vr4xnSDxMaL",
        elevenLabsAgentId: null,
        stability: body.stability ?? 0.5,
        similarityBoost: body.similarityBoost ?? 0.75,
        style: body.style ?? 0.0,
        useSpeakerBoost: body.useSpeakerBoost ?? true,
        ttsModel: body.ttsModel || "eleven_multilingual_v2",
        outputFormat: body.outputFormat || "pcm_16000",
        llmModel: body.llmModel || "gpt-4",
        temperature: body.temperature ?? 0.7,
        maxTokens: body.maxTokens || 500,
        maxCallDuration: body.maxCallDuration || 600,
        enableInterruptions: body.enableInterruptions ?? true,
        responseDelay: body.responseDelay || 100,
        language: body.language || userLanguage,
        googleCalendarId: body.googleCalendarId,
        availableHours: body.availableHours,
        appointmentDuration: body.appointmentDuration || 30,
        transferPhone: effectiveTransferPhone,
        backupPhoneNumber: effectiveBackupPhone,
        twilioPhoneNumber: body.twilioPhoneNumber,
        enableVoicemail: body.enableVoicemail || false,
        voicemailMessage: body.voicemailMessage,
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
        pronunciationDict: body.pronunciationDict,
        webhookUrl: body.webhookUrl,
        customData: body.customData,
      },
    });

    // Associate knowledge base files with the agent
    if (knowledgeBaseFileIds.length > 0) {
      try {
        const ownedFiles = await (prisma as any).knowledgeBaseFile.findMany({
          where: { id: { in: knowledgeBaseFileIds }, userId: user.id },
          select: { id: true },
        });
        if (ownedFiles.length > 0) {
          await (prisma as any).voiceAgentKnowledgeBaseFile.createMany({
            data: ownedFiles.map((f: any) => ({
              voiceAgentId: agent.id,
              knowledgeBaseFileId: f.id,
            })),
            skipDuplicates: true,
          });
        }
      } catch (updateError: any) {
        console.error(
          "[voice-agents] Error associating files with agent:",
          updateError.message,
        );
        // Non-fatal
      }
    }

    // Auto-import knowledge base files and onboarding documents
    let enhancedKnowledgeBase = body.knowledgeBase || "";
    let knowledgeBaseFiles: KnowledgeBaseSourceFile[] = [
      ...legacyKnowledgeBaseFiles,
    ];

    try {
      const whereClause: any = { userId: user.id };
      if (knowledgeBaseFileIds.length > 0) {
        whereClause.id = { in: knowledgeBaseFileIds };
      }

      const userKnowledgeBaseFiles = await (
        prisma as any
      ).knowledgeBaseFile.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      });

      if (userKnowledgeBaseFiles.length > 0) {
        const kbFileTexts = userKnowledgeBaseFiles
          .filter((file: any) => file.extractedText?.trim())
          .map((file: any) => {
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
        }
      }

      // Import onboarding documents
      const userWithProgress: any = await prisma.user.findUnique({
        where: { id: user.id },
        select: { onboardingProgress: true },
      } as any);

      if (userWithProgress?.onboardingProgress) {
        let progress: any = {};
        try {
          progress = JSON.parse(userWithProgress.onboardingProgress as string);
        } catch {
          /* ignore */
        }

        if (progress.uploadedDocuments?.length > 0) {
          const documentTexts = progress.uploadedDocuments
            .filter((doc: any) => doc.extractedText)
            .map((doc: any) => {
              knowledgeBaseFiles.push({
                name: doc.fileName,
                type: doc.fileType,
                uploadedAt: doc.uploadedAt,
              });
              return `\n\n--- ${doc.fileName} ---\n${doc.extractedText}`;
            })
            .join("\n");

          if (documentTexts) {
            enhancedKnowledgeBase = enhancedKnowledgeBase
              ? `${enhancedKnowledgeBase}\n\n=== ONBOARDING DOCUMENTS ===${documentTexts}`
              : `=== ONBOARDING DOCUMENTS ===${documentTexts}`;
          }
        }
      }

      if (enhancedKnowledgeBase) {
        await (prisma as any).voiceAgent.update({
          where: { id: agent.id },
          data: {
            knowledgeBase: enhancedKnowledgeBase,
            knowledgeBaseSources: {
              texts: knowledgeBaseTexts,
              urls: knowledgeBaseUrls,
              files: knowledgeBaseFiles,
            },
          },
        });
      }
    } catch (error: any) {
      console.error(
        "[voice-agents] Error importing knowledge base documents:",
        error.message,
      );
      // Non-fatal — continue
    }

    // Rebuild system prompt with enhanced knowledge base
    let finalSystemPrompt = systemPrompt;
    if (enhancedKnowledgeBase && enhancedKnowledgeBase !== body.knowledgeBase) {
      if (body.enableReservations) {
        finalSystemPrompt = generateReservationSystemPrompt({
          businessName: body.businessName,
          businessIndustry: body.businessIndustry,
          knowledgeBase: enhancedKnowledgeBase,
        });
      } else if (!body.systemPrompt) {
        finalSystemPrompt = `You are an AI voice assistant for ${body.businessName}${body.businessIndustry ? ` in the ${body.businessIndustry} industry` : ""}.

${enhancedKnowledgeBase || "Answer customer questions professionally and helpfully."}

${body.greetingMessage ? `Start conversations with: ${body.greetingMessage}` : ""}`;
      }
      await (prisma as any).voiceAgent.update({
        where: { id: agent.id },
        data: { systemPrompt: finalSystemPrompt },
      });
    }

    // Check ElevenLabs subscription before phone number provisioning
    if (body.twilioPhoneNumber) {
      try {
        const subscriptionCheck =
          await elevenLabsProvisioning.checkSubscription(user.id);
        if (
          subscriptionCheck.success &&
          !subscriptionCheck.canUsePhoneNumbers
        ) {
          await (prisma as any).voiceAgent.delete({ where: { id: agent.id } });
          return NextResponse.json(
            {
              error: "Soshogle AI plan upgrade required",
              details:
                subscriptionCheck.error ||
                "Your plan does not support phone number imports.",
              tier: subscriptionCheck.tier,
              upgradeRequired: true,
              recommendation:
                "Please upgrade your Soshogle AI plan to use phone numbers with voice agents.",
            },
            { status: 402 },
          );
        }
      } catch (subscriptionError: any) {
        console.error(
          "[voice-agents] Error checking ElevenLabs subscription:",
          subscriptionError.message,
        );
        // Non-fatal — continue
      }
    }

    // Auto-provision ElevenLabs agent
    try {
      const greetingForElevenLabs =
        agentType === "OUTBOUND"
          ? body.outboundGreeting || body.greetingMessage
          : body.inboundGreeting || body.greetingMessage;

      const provisionResult = await elevenLabsProvisioning.createAgent({
        name: body.name,
        businessName: body.businessName,
        businessIndustry: body.businessIndustry,
        greetingMessage: greetingForElevenLabs || body.firstMessage,
        systemPrompt: finalSystemPrompt,
        knowledgeBase: enhancedKnowledgeBase,
        voiceId: body.voiceId,
        language: "en",
        maxCallDuration: body.maxCallDuration,
        twilioPhoneNumber: body.twilioPhoneNumber,
        userId: user.id,
        voiceAgentId: agent.id,
      });

      if (!provisionResult.success) {
        console.error(
          "[voice-agents] ElevenLabs provisioning failed:",
          provisionResult.error,
        );
        try {
          await (prisma as any).voiceAgent.delete({ where: { id: agent.id } });
        } catch (e: any) {
          console.error("[voice-agents] Rollback failed:", e.message);
        }
        return NextResponse.json(
          {
            error: "Failed to create voice agent",
            details: provisionResult.error,
            suggestion:
              "Please check: 1) Soshogle AI voice is configured, 2) You have an active plan, 3) Phone credentials are configured correctly",
          },
          { status: 500 },
        );
      }
    } catch (provisionError: any) {
      console.error(
        "[voice-agents] Exception during ElevenLabs provisioning:",
        provisionError.message,
      );
      try {
        await (prisma as any).voiceAgent.delete({ where: { id: agent.id } });
      } catch (e: any) {
        console.error("[voice-agents] Rollback failed:", e.message);
      }
      return NextResponse.json(
        {
          error: "Failed to provision voice agent",
          details: provisionError.message,
        },
        { status: 500 },
      );
    }

    const updatedAgent = await (prisma as any).voiceAgent.findUnique({
      where: { id: agent.id },
    });
    return NextResponse.json(updatedAgent || agent, { status: 201 });
  } catch (error: any) {
    console.error("[voice-agents] Error creating voice agent:", error.message);
    return NextResponse.json(
      {
        error: "Failed to create voice agent",
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }
}

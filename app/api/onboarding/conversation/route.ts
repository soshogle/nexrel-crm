import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  onboardingConversation,
  onboardingSteps,
} from "@/lib/onboarding-conversation";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    // Get user's current progress
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingProgress: true },
    } as any);

    let progress = {};
    if ((user as any)?.onboardingProgress) {
      try {
        progress = JSON.parse((user as any).onboardingProgress as string);
      } catch (e) {
        progress = {};
      }
    }

    // Get next step with conditional logic
    const currentStepId = (progress as any).currentStep;
    const nextStep = onboardingConversation.getNextStep(
      currentStepId,
      progress,
    );

    if (!nextStep) {
      return NextResponse.json({
        completed: true,
        message:
          "🎉 Perfect! Your CRM is ready to go. Let me apply the configuration now...",
      });
    }

    // Format question with collected data
    const question = onboardingConversation.formatQuestion(
      nextStep.question,
      progress,
    );

    // Calculate completion percentage
    const completionPercentage =
      onboardingConversation.getCompletionPercentage(progress);

    return NextResponse.json({
      step: nextStep,
      question,
      progress,
      completionPercentage,
    });
  } catch (error: any) {
    console.error("Conversation error:", error);
    return apiErrors.internal(
      error.message || "Failed to get conversation state",
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { response, action } = body;

    // Get current progress
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingProgress: true },
    } as any);

    let progress: any = {};
    if ((user as any)?.onboardingProgress) {
      try {
        progress = JSON.parse((user as any).onboardingProgress as string);
      } catch (e) {
        progress = {};
      }
    }

    // Handle "go back" action
    if (action === "back") {
      const currentStepId = progress.currentStep;
      const previousStep = onboardingConversation.getPreviousStep(
        currentStepId,
        progress,
      );

      if (previousStep) {
        progress.currentStep = previousStep.id;

        // Save progress
        await db.user.update({
          where: { id: session.user.id },
          data: {
            onboardingProgress: JSON.stringify(progress),
          },
        } as any);

        const question = onboardingConversation.formatQuestion(
          previousStep.question,
          progress,
        );
        const completionPercentage =
          onboardingConversation.getCompletionPercentage(progress);

        return NextResponse.json({
          step: previousStep,
          question,
          progress,
          completionPercentage,
          message: "No problem! Let's update that.",
        });
      } else {
        return apiErrors.badRequest("Already at first step");
      }
    }

    // Handle normal response
    if (!response || typeof response !== "string" || response.trim() === "") {
      return apiErrors.badRequest("Response is required");
    }

    // Check if this is a bulk company profile submission
    const isCompanyProfile =
      response.includes("Company Name:") &&
      (response.includes("Email:") || response.includes("Description:"));

    if (isCompanyProfile) {
      // Parse the formatted company profile
      const lines = response.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith("Company Name:")) {
          const value = trimmedLine.replace("Company Name:", "").trim();
          if (value && !value.includes("[Please add")) {
            progress.businessName = value;
            progress.companyProfile = value; // Mark step as complete
          }
        } else if (trimmedLine.startsWith("Description:")) {
          const value = trimmedLine.replace("Description:", "").trim();
          if (value && !value.includes("[Please add")) {
            progress.about = value;
          }
        } else if (trimmedLine.startsWith("Email:")) {
          const value = trimmedLine.replace("Email:", "").trim();
          if (value && !value.includes("[Please add")) {
            progress.contact_email = value;
          }
        } else if (trimmedLine.startsWith("Phone:")) {
          const value = trimmedLine.replace("Phone:", "").trim();
          if (value && !value.includes("[Please add")) {
            progress.contact_phone = value;
          }
        } else if (trimmedLine.startsWith("Address:")) {
          const value = trimmedLine.replace("Address:", "").trim();
          if (value && !value.includes("[Please add")) {
            progress.contact_address = value;
          }
        } else if (trimmedLine.startsWith("Logo:")) {
          const value = trimmedLine.replace("Logo:", "").trim();
          if (value && !value.includes("[Please add")) {
            progress.logo = value;
          }
        } else if (trimmedLine.startsWith("Website:")) {
          const value = trimmedLine.replace("Website:", "").trim();
          if (value && !value.includes("[Please add")) {
            progress.website = value;
            progress.hasWebsite = "yes";
          }
        }
      }

      // Mark company profile step as complete
      progress.currentStep = "company_profile";

      // Prepare user profile update data
      const profileUpdateData: any = {
        onboardingProgress: JSON.stringify(progress),
      };

      // Automatically populate user profile fields with parsed data
      if (progress.businessName) {
        profileUpdateData.name = progress.businessName;
      }

      if (progress.about) {
        profileUpdateData.businessDescription = progress.about;
      }

      if (progress.logo) {
        profileUpdateData.image = progress.logo;
      }

      if (progress.contact_phone) {
        profileUpdateData.phone = progress.contact_phone;
      }

      if (progress.contact_address) {
        profileUpdateData.address = progress.contact_address;
      }

      if (progress.website) {
        profileUpdateData.website = progress.website;
      }

      if (progress.industry) {
        profileUpdateData.industry = progress.industry;
      }

      // Save the updated progress and profile
      await db.user.update({
        where: { id: session.user.id },
        data: profileUpdateData,
      } as any);

      // Get the next step with conditional logic
      const nextStep = onboardingConversation.getNextStep(
        "company_profile",
        progress,
      );

      if (!nextStep) {
        return NextResponse.json({
          completed: true,
          message:
            "🎉 Perfect! Your CRM is ready. Let me set everything up for you...",
          progress,
        });
      }

      const nextQuestion = onboardingConversation.formatQuestion(
        nextStep.question,
        progress,
      );
      const completionPercentage =
        onboardingConversation.getCompletionPercentage(progress);

      return NextResponse.json({
        step: nextStep,
        question: nextQuestion,
        progress,
        completionPercentage,
      });
    }

    // Standard step-by-step flow
    const currentStepId = progress.currentStep || "website_scrape";
    const currentStep = onboardingConversation.getStep(currentStepId);

    if (!currentStep) {
      return apiErrors.badRequest("Unable to determine current step");
    }

    // Parse and validate response
    const parsedValue = onboardingConversation.parseResponse(
      currentStep,
      response,
    );
    const validation = onboardingConversation.validateResponse(
      currentStep,
      parsedValue,
    );

    if (!validation.valid) {
      return apiErrors.badRequest(validation.error!);
    }

    // Update progress
    progress[currentStep.field] = parsedValue;
    progress.currentStep = currentStep.id;

    // Prepare user profile update data
    const profileUpdateData: any = {
      onboardingProgress: JSON.stringify(progress),
    };

    // Map specific fields to user profile
    if (currentStep.field === "businessName" && parsedValue) {
      profileUpdateData.name = parsedValue;
    } else if (currentStep.field === "industry" && parsedValue) {
      profileUpdateData.industry = parsedValue;
    } else if (currentStep.field === "website" && parsedValue) {
      profileUpdateData.website = parsedValue;
    }

    // Save progress and update profile
    await db.user.update({
      where: { id: session.user.id },
      data: profileUpdateData,
    } as any);

    // Get next step with conditional logic
    const nextStep = onboardingConversation.getNextStep(
      currentStep.id,
      progress,
    );

    if (!nextStep) {
      return NextResponse.json({
        completed: true,
        message:
          "🎉 Perfect! Your CRM is ready. Let me set everything up for you...",
        progress,
      });
    }

    const nextQuestion = onboardingConversation.formatQuestion(
      nextStep.question,
      progress,
    );
    const completionPercentage =
      onboardingConversation.getCompletionPercentage(progress);

    return NextResponse.json({
      step: nextStep,
      question: nextQuestion,
      progress,
      completionPercentage,
    });
  } catch (error: any) {
    console.error("Conversation update error:", error);
    return apiErrors.internal(error.message || "Failed to update conversation");
  }
}

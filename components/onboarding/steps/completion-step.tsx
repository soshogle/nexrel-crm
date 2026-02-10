
"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CompletionStepProps {
  onComplete: () => void;
  setupSummary: {
    messagingChannels: number;
    knowledgeBaseConfigured: boolean;
    autoReplyEnabled: boolean;
    calendarConnected: boolean;
    paymentProviders: number;
  };
}

export function CompletionStep({
  onComplete,
  setupSummary,
}: CompletionStepProps) {
  const router = useRouter();

  const handleFinish = () => {
    onComplete();
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-green-600/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h3 className="text-2xl font-bold">You're All Set!</h3>
        <p className="text-muted-foreground">
          Your CRM is configured and ready to use. Here's what you've set up:
        </p>
      </div>

      <div className="space-y-3 p-6 border rounded-lg bg-muted/50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Messaging Channels</span>
          <span className="text-sm text-muted-foreground">
            {setupSummary.messagingChannels > 0
              ? `${setupSummary.messagingChannels} selected`
              : "None configured"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Knowledge Base</span>
          <span className="text-sm text-muted-foreground">
            {setupSummary.knowledgeBaseConfigured
              ? "Configured"
              : "Not configured"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">AI Auto-Reply</span>
          <span className="text-sm text-muted-foreground">
            {setupSummary.autoReplyEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Calendar</span>
          <span className="text-sm text-muted-foreground">
            {setupSummary.calendarConnected
              ? "Connected"
              : "Not connected"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Payment Providers</span>
          <span className="text-sm text-muted-foreground">
            {setupSummary.paymentProviders > 0
              ? `${setupSummary.paymentProviders} selected`
              : "None selected"}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">Next Steps:</h4>
        <div className="space-y-2">
          <Link href="/dashboard/leads">
            <Button variant="outline" className="w-full justify-start gap-2">
              <ExternalLink className="h-4 w-4" />
              Add Your First Lead
            </Button>
          </Link>
          <Link href="/dashboard/ai-automations">
            <Button variant="outline" className="w-full justify-start gap-2">
              <ExternalLink className="h-4 w-4" />
              Create a Campaign
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Fine-tune Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <Button onClick={handleFinish} size="lg" className="px-8">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

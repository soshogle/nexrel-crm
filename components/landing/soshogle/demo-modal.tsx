"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { ElevenLabsAgent } from "./elevenlabs-agent";
import { ROICalculator } from "./roi-calculator";
import { toast } from "sonner";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const DEMO_AGENT_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID ||
  "agent_0301kap49d2afq5vp04v0r6p5k6q";

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    position: "",
    industry: "",
    websiteUrl: "",
  });

  const [showAgent, setShowAgent] = useState(false);
  const [leadId, setLeadId] = useState<string | undefined>();
  const [conversationStartTime, setConversationStartTime] = useState<number | undefined>();
  const [showROICalculator, setShowROICalculator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formStartedRef = useRef(false);

  const handleConversationEnd = async (
    messages: Array<{ role: "agent" | "user"; content: string; timestamp: number }>,
    audioBlob?: Blob
  ) => {
    if (!leadId) return;

    const duration = conversationStartTime ? Math.floor((Date.now() - conversationStartTime) / 1000) : 0;
    const transcript = messages.length > 0
      ? messages.map(msg => `${msg.role === "agent" ? "AI Agent" : "User"}: ${msg.content}`).join("\n\n")
      : "No conversation recorded";

    let audioUrl: string | undefined;
    if (audioBlob) {
      try {
        const uploadResponse = await fetch("/api/demo/upload-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            audioBlob: await blobToBase64(audioBlob),
          }),
        });
        const uploadResult = await uploadResponse.json();
        audioUrl = uploadResult?.url;
      } catch (error) {
        console.error("Failed to upload audio:", error);
      }
    }

    await fetch("/api/demo/record-conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        transcript,
        duration,
        recordingUrl: audioUrl,
        messages,
      }),
    });

    await fetch("/api/demo/send-lead-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        email: formData.email,
        fullName: formData.fullName,
      }),
    });

    toast.success("Conversation saved! Check your email for the report.");
    setShowAgent(false);
    setShowROICalculator(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStartedRef.current) {
      formStartedRef.current = true;
    }

    if (!formData.fullName || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/demo/create-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          companyName: formData.companyName,
          position: formData.position,
          industry: formData.industry,
          websiteUrl: formData.websiteUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save information");
      }

      setLeadId(data.leadId);
      setConversationStartTime(Date.now());
      toast.success("Information saved! Starting conversation...");
      setShowAgent(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to save information");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (!formStartedRef.current) {
      formStartedRef.current = true;
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border/50 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-background/80 rounded-lg transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {showROICalculator && (
          <ROICalculator
            isOpen={showROICalculator}
            onClose={() => {
              setShowROICalculator(false);
              handleClose();
            }}
          />
        )}

        {showAgent && (
          <div className="p-8">
            <ElevenLabsAgent
              agentId={DEMO_AGENT_ID}
              onConversationEnd={handleConversationEnd}
              dynamicVariables={{
                company_name: formData.companyName || "your company",
                website_url: formData.websiteUrl || "https://example.com",
                user_name: formData.fullName || "Visitor",
                industry: formData.industry || "your industry",
              }}
            />
          </div>
        )}

        {!showAgent && !showROICalculator && (
          <div className="p-8">
            <h2 className="text-2xl font-light mb-2">Try Interactive Demo</h2>
            <p className="text-muted-foreground mb-6">
              Experience our AI voice agent in action. Fill in your details to get started.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Your Company"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  placeholder="Your Title"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={formData.industry} onValueChange={(value) => handleInputChange("industry", value)}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select an industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="text"
                  placeholder="example.com or www.example.com"
                  value={formData.websiteUrl}
                  onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Starting..." : "Start Demo"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface KnowledgeBaseStepProps {
  onComplete: (data: any) => void;
  initialData?: any;
}

export function KnowledgeBaseStep({
  onComplete,
  initialData,
}: KnowledgeBaseStepProps) {
  // Initialize with consistent defaults to prevent hydration mismatch
  const [businessInfo, setBusinessInfo] = useState("");
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([
    { question: "", answer: "" }
  ]);
  const [initialized, setInitialized] = useState(false);

  // Sync data from props after client-side mount
  useEffect(() => {
    if (!initialized && initialData) {
      setBusinessInfo(initialData.businessInfo || "");
      setFaqs(initialData.faqs || [{ question: "", answer: "" }]);
      setInitialized(true);
    }
  }, [initialData, initialized]);

  const addFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  const handleNext = async () => {
    if (!businessInfo.trim()) {
      toast.error("Please provide some information about your business");
      return;
    }

    // Filter out empty FAQs
    const validFaqs = faqs.filter(
      (faq) => faq.question.trim() && faq.answer.trim()
    );

    onComplete({ businessInfo, faqs: validFaqs });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">
            Tell me about your business
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          This information helps the AI respond accurately to customer inquiries
          about your services, hours, pricing, and more.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessInfo">
          Business Information{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="businessInfo"
          placeholder="Example: We are a digital marketing agency specializing in social media management and content creation. We serve small to medium businesses. Our hours are Monday-Friday 9am-6pm EST. Pricing starts at $500/month..."
          value={businessInfo}
          onChange={(e) => setBusinessInfo(e.target.value)}
          rows={6}
          className="resize-none"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Common Questions (Optional)</Label>
          <Button onClick={addFaq} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
          </Button>
        </div>

        {faqs.map((faq, index) => (
          <div key={index} className="space-y-2 p-4 border rounded-lg">
            <div className="flex justify-between items-start">
              <Label className="text-sm">FAQ #{index + 1}</Label>
              {faqs.length > 1 && (
                <Button
                  onClick={() => removeFaq(index)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              placeholder="Question (e.g., What are your rates?)"
              value={faq.question}
              onChange={(e) => updateFaq(index, "question", e.target.value)}
            />
            <Textarea
              placeholder="Answer"
              value={faq.answer}
              onChange={(e) => updateFaq(index, "answer", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={() => onComplete({ skipped: true })} variant="ghost">
          Skip for Now
        </Button>
        <Button onClick={handleNext}>Continue</Button>
      </div>
    </div>
  );
}

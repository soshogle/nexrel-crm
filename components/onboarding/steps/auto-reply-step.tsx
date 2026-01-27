
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Bot, Clock, Sparkles } from "lucide-react";

interface AutoReplyStepProps {
  onComplete: (data: any) => void;
  initialData?: any;
}

export function AutoReplyStep({
  onComplete,
  initialData,
}: AutoReplyStepProps) {
  // Initialize with consistent defaults to prevent hydration mismatch
  const [enabled, setEnabled] = useState(true);
  const [tone, setTone] = useState("professional");
  const [respondOutsideHours, setRespondOutsideHours] = useState(true);
  const [businessHours, setBusinessHours] = useState({
    start: "09:00",
    end: "17:00",
  });
  const [initialized, setInitialized] = useState(false);

  // Sync data from props after client-side mount
  useEffect(() => {
    if (!initialized && initialData) {
      setEnabled(initialData.enabled ?? true);
      setTone(initialData.tone || "professional");
      setRespondOutsideHours(initialData.respondOutsideHours ?? true);
      setBusinessHours(initialData.businessHours || {
        start: "09:00",
        end: "17:00",
      });
      setInitialized(true);
    }
  }, [initialData, initialized]);

  const handleNext = () => {
    onComplete({
      enabled,
      tone,
      respondOutsideHours,
      businessHours,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">
            Configure AI Auto-Reply System
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Let AI handle incoming messages automatically using your knowledge
          base. It will respond instantly and escalate to you when needed.
        </p>
      </div>

      <div className="space-y-6">
        {/* Enable Auto-Reply */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Enable AI Auto-Reply</Label>
            <p className="text-sm text-muted-foreground">
              Automatically respond to customer messages
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            {/* Tone Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Response Tone
              </Label>
              <RadioGroup value={tone} onValueChange={setTone}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="professional" id="professional" />
                  <Label htmlFor="professional" className="cursor-pointer flex-1">
                    <div className="font-medium">Professional</div>
                    <div className="text-sm text-muted-foreground">
                      Formal and business-appropriate
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="friendly" id="friendly" />
                  <Label htmlFor="friendly" className="cursor-pointer flex-1">
                    <div className="font-medium">Friendly</div>
                    <div className="text-sm text-muted-foreground">
                      Warm and conversational
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="casual" id="casual" />
                  <Label htmlFor="casual" className="cursor-pointer flex-1">
                    <div className="font-medium">Casual</div>
                    <div className="text-sm text-muted-foreground">
                      Relaxed and informal
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Business Hours */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Business Hours
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime" className="text-sm">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={businessHours.start}
                    onChange={(e) =>
                      setBusinessHours((prev: { start: string; end: string }) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-sm">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={businessHours.end}
                    onChange={(e) =>
                      setBusinessHours((prev: { start: string; end: string }) => ({
                        ...prev,
                        end: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Outside Hours */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Respond Outside Hours</Label>
                <p className="text-sm text-muted-foreground">
                  Still respond when outside business hours
                </p>
              </div>
              <Switch
                checked={respondOutsideHours}
                onCheckedChange={setRespondOutsideHours}
              />
            </div>
          </>
        )}
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

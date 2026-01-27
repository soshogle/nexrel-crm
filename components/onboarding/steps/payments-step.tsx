
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";

interface PaymentsStepProps {
  onComplete: (data: any) => void;
  initialData?: any;
}

export function PaymentsStep({ onComplete, initialData }: PaymentsStepProps) {
  // Initialize with consistent defaults to prevent hydration mismatch
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Sync data from props after client-side mount
  useEffect(() => {
    if (!initialized && initialData) {
      setSelectedProviders(initialData.selectedProviders || []);
      setInitialized(true);
    }
  }, [initialData, initialized]);

  const providers = [
    {
      id: "stripe",
      label: "Stripe",
      description: "Credit/debit cards, Apple Pay, Google Pay",
    },
    {
      id: "square",
      label: "Square",
      description: "In-person and online payments",
    },
    {
      id: "paypal",
      label: "PayPal",
      description: "PayPal wallet and credit cards",
    },
  ];

  const handleProviderToggle = (providerId: string) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((id) => id !== providerId)
        : [...prev, providerId]
    );
  };

  const handleNext = () => {
    onComplete({ selectedProviders });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">
            Accept Payments (Optional)
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Select payment providers you'd like to use for collecting payments,
          invoices, and booking fees. You can configure credentials later in
          settings.
        </p>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => {
          const isSelected = selectedProviders.includes(provider.id);

          return (
            <div
              key={provider.id}
              className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleProviderToggle(provider.id)}
            >
              <Checkbox
                id={provider.id}
                checked={isSelected}
                onCheckedChange={() => handleProviderToggle(provider.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor={provider.id}
                  className="cursor-pointer font-medium"
                >
                  {provider.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {provider.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> You'll need to create accounts with these
          providers and add your API keys in Settings → Payment Providers
          before you can accept payments.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button onClick={handleNext}>
          {selectedProviders.length > 0
            ? "Continue"
            : "Skip Payment Setup"}
        </Button>
      </div>
    </div>
  );
}

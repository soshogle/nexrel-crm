
"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface OnboardingStepProps {
  title: string;
  description: string;
  children: ReactNode;
  completed?: boolean;
}

export function OnboardingStep({
  title,
  description,
  children,
  completed = false,
}: OnboardingStepProps) {
  return (
    <Card className="relative">
      {completed && (
        <div className="absolute top-4 right-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

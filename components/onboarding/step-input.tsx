
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Edit2, ChevronRight } from "lucide-react";
import { ConversationStep } from "@/lib/onboarding-conversation";

interface StepInputProps {
  step: ConversationStep;
  onSubmit: (value: string) => void;
  onEdit?: () => void;
  isProcessing: boolean;
  defaultValue?: string;
}

export function StepInput({ step, onSubmit, onEdit, isProcessing, defaultValue = "" }: StepInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleSubmit = () => {
    if (step.type === 'multiselect') {
      onSubmit(selectedItems.join(', '));
    } else {
      onSubmit(value);
    }
  };

  const handleYesNo = (answer: 'yes' | 'no') => {
    onSubmit(answer);
  };

  const toggleMultiItem = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  // Yes/No buttons
  if (step.type === 'yesno') {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-6">
          <div className="space-y-4">
            {step.description && (
              <p className="text-sm text-muted-foreground">{step.description}</p>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => handleYesNo('yes')}
                disabled={isProcessing}
                size="lg"
                className="flex-1 h-14 text-lg font-semibold bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Check className="h-5 w-5 mr-2" />
                Yes
              </Button>
              <Button
                onClick={() => handleYesNo('no')}
                disabled={isProcessing}
                size="lg"
                variant="outline"
                className="flex-1 h-14 text-lg font-semibold hover:bg-muted"
              >
                <X className="h-5 w-5 mr-2" />
                No / Skip
              </Button>
            </div>
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={isProcessing}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Previous Answer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Select dropdown
  if (step.type === 'select' && step.options) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-6">
          <div className="space-y-4">
            {step.description && (
              <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
            )}
            <Select onValueChange={(v) => setValue(v)} value={value}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                {step.options.map((option) => (
                  <SelectItem key={option} value={option} className="text-base py-3">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !value}
              size="lg"
              className="w-full h-12 text-base font-semibold"
            >
              Continue
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={isProcessing}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Previous Answer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multiselect
  if (step.type === 'multiselect' && step.options) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-6">
          <div className="space-y-4">
            {step.description && (
              <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {step.options.map((option) => {
                const isSelected = selectedItems.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => toggleMultiItem(option)}
                    disabled={isProcessing}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{option}</span>
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing}
              size="lg"
              className="w-full h-12 text-base font-semibold"
            >
              {selectedItems.length > 0 
                ? `Continue with ${selectedItems.length} selected` 
                : 'Skip for now'
              }
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={isProcessing}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Previous Answer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Text/URL input (default)
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className="p-6">
        <div className="space-y-4">
          {step.description && (
            <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
          )}
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type your answer here..."
            className="min-h-[120px] text-base resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !isProcessing && value.trim()) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !value.trim()}
              size="lg"
              className="flex-1 h-12 text-base font-semibold"
            >
              Continue
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
                size="lg"
                className="h-12"
                disabled={isProcessing}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Press Ctrl+Enter to submit
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

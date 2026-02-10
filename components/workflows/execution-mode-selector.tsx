/**
 * Execution Mode Selector Component
 * Small toggle to switch between Workflow and Campaign modes
 * Appears in workflow builder header
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Workflow, Users } from 'lucide-react';

interface ExecutionModeSelectorProps {
  mode: 'WORKFLOW' | 'CAMPAIGN';
  onModeChange: (mode: 'WORKFLOW' | 'CAMPAIGN') => void;
}

export function ExecutionModeSelector({
  mode,
  onModeChange,
}: ExecutionModeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Mode:</span>
      <Select value={mode} onValueChange={onModeChange}>
        <SelectTrigger className="w-[140px] border-purple-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="WORKFLOW">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              <span>Workflow</span>
            </div>
          </SelectItem>
          <SelectItem value="CAMPAIGN">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Campaign</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      {mode === 'CAMPAIGN' && (
        <Badge variant="outline" className="border-purple-300 text-purple-700">
          Batch Mode
        </Badge>
      )}
    </div>
  );
}

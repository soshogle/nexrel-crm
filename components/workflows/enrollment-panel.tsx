/**
 * Enrollment Panel Component
 * Shows enrollment settings for drip campaign mode workflows
 * Only appears when executionMode === 'DRIP'
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Plus, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EnrollmentTrigger {
  type: 'LEAD_CREATED' | 'STATUS_CHANGED' | 'TAG_ADDED' | 'SCORE_REACHED' | 'MANUAL';
  conditions?: {
    status?: string[];
    tags?: string[];
    minScore?: number;
  };
}

interface EnrollmentPanelProps {
  enrollmentMode: boolean;
  enrollmentTriggers: EnrollmentTrigger[];
  onEnrollmentModeChange: (enabled: boolean) => void;
  onEnrollmentTriggersChange: (triggers: EnrollmentTrigger[]) => void;
}

export function EnrollmentPanel({
  enrollmentMode,
  enrollmentTriggers,
  onEnrollmentModeChange,
  onEnrollmentTriggersChange,
}: EnrollmentPanelProps) {
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [newTriggerType, setNewTriggerType] = useState<EnrollmentTrigger['type']>('MANUAL');

  const handleAddTrigger = () => {
    const newTrigger: EnrollmentTrigger = {
      type: newTriggerType,
      conditions: newTriggerType === 'MANUAL' ? undefined : {},
    };
    onEnrollmentTriggersChange([...enrollmentTriggers, newTrigger]);
    setShowAddTrigger(false);
    setNewTriggerType('MANUAL');
    toast.success('Enrollment trigger added');
  };

  const handleRemoveTrigger = (index: number) => {
    const updated = enrollmentTriggers.filter((_, i) => i !== index);
    onEnrollmentTriggersChange(updated);
    toast.success('Enrollment trigger removed');
  };

  return (
    <Card className="border-purple-200 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Enrollment Settings</CardTitle>
          </div>
          <Badge variant="outline" className="border-purple-300 text-purple-700">
            Drip Campaign Mode
          </Badge>
        </div>
        <CardDescription>
          Configure how leads are enrolled in this drip campaign workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enrollment Mode Toggle */}
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div>
            <Label className="text-sm font-medium">Enrollment Mode</Label>
            <p className="text-xs text-muted-foreground mt-1">
              When enabled, leads progress through workflow steps independently based on enrollment triggers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={enrollmentMode ? 'default' : 'outline'}
              onClick={() => onEnrollmentModeChange(!enrollmentMode)}
              className={enrollmentMode ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {enrollmentMode ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>

        {enrollmentMode && (
          <>
            {/* Enrollment Triggers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Enrollment Triggers</Label>
                {!showAddTrigger && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddTrigger(true)}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Trigger
                  </Button>
                )}
              </div>

              {enrollmentTriggers.length === 0 && !showAddTrigger && (
                <div className="p-4 border-2 border-dashed border-purple-200 rounded-lg text-center">
                  <AlertCircle className="h-8 w-8 text-purple-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No enrollment triggers configured. Leads must be manually enrolled.
                  </p>
                </div>
              )}

              {/* Existing Triggers */}
              {enrollmentTriggers.map((trigger, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-purple-300 text-purple-700">
                      {trigger.type.replace('_', ' ')}
                    </Badge>
                    {trigger.conditions && Object.keys(trigger.conditions).length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {Object.keys(trigger.conditions).length} condition(s)
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveTrigger(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add Trigger Form */}
              {showAddTrigger && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Trigger Type</Label>
                        <Select
                          value={newTriggerType}
                          onValueChange={(value) => setNewTriggerType(value as EnrollmentTrigger['type'])}
                        >
                          <SelectTrigger className="mt-1 border-purple-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MANUAL">Manual Enrollment</SelectItem>
                            <SelectItem value="LEAD_CREATED">When Lead is Created</SelectItem>
                            <SelectItem value="STATUS_CHANGED">When Status Changes</SelectItem>
                            <SelectItem value="TAG_ADDED">When Tag is Added</SelectItem>
                            <SelectItem value="SCORE_REACHED">When Score Reaches Threshold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddTrigger}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Add Trigger
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAddTrigger(false);
                            setNewTriggerType('MANUAL');
                          }}
                          className="border-purple-200"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Info Message */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>How it works:</strong> When a trigger condition is met, leads are automatically enrolled
                in this workflow and progress through steps independently. Each lead moves at their own pace
                based on the delays configured in each workflow step.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

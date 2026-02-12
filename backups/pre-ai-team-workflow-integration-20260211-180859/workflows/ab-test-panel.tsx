/**
 * A/B Testing Panel Component
 * Shows A/B testing configuration for drip campaign mode workflows
 * Only appears when executionMode === 'DRIP' and enrollmentMode is enabled
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Beaker, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ABTestConfig {
  splitPercentage: number; // 0-100, percentage for group A (rest goes to B)
  testType: 'subject' | 'content' | 'timing' | 'task';
  testDuration?: number; // Days to run test before declaring winner
  autoDeclareWinner?: boolean; // Automatically declare winner based on metrics
  metric?: 'open_rate' | 'click_rate' | 'reply_rate' | 'conversion_rate';
}

interface ABTestPanelProps {
  enableAbTesting: boolean;
  abTestConfig: ABTestConfig | null;
  onEnableAbTestingChange: (enabled: boolean) => void;
  onABTestConfigChange: (config: ABTestConfig | null) => void;
}

export function ABTestPanel({
  enableAbTesting,
  abTestConfig,
  onEnableAbTestingChange,
  onABTestConfigChange,
}: ABTestPanelProps) {
  const [localConfig, setLocalConfig] = useState<ABTestConfig>(
    abTestConfig || {
      splitPercentage: 50,
      testType: 'content',
      testDuration: 7,
      autoDeclareWinner: false,
      metric: 'open_rate',
    }
  );

  useEffect(() => {
    if (abTestConfig) {
      setLocalConfig(abTestConfig);
    }
  }, [abTestConfig]);

  const handleConfigUpdate = (updates: Partial<ABTestConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onABTestConfigChange(newConfig);
  };

  return (
    <Card className="border-purple-200 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">A/B Testing</CardTitle>
          </div>
          <Badge variant="outline" className="border-purple-300 text-purple-700">
            Advanced
          </Badge>
        </div>
        <CardDescription>
          Test different variants to optimize your drip campaign performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable A/B Testing Toggle */}
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div>
            <Label className="text-sm font-medium">Enable A/B Testing</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Split your audience to test different variants and optimize performance
            </p>
          </div>
          <Switch
            checked={enableAbTesting}
            onCheckedChange={(checked) => {
              onEnableAbTestingChange(checked);
              if (checked) {
                onABTestConfigChange(localConfig);
              } else {
                onABTestConfigChange(null);
              }
            }}
          />
        </div>

        {enableAbTesting && (
          <>
            {/* Split Percentage */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Traffic Split</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="border-blue-300 text-blue-700">
                      Group A: {localConfig.splitPercentage}%
                    </Badge>
                    <Badge variant="outline" className="border-green-300 text-green-700">
                      Group B: {100 - localConfig.splitPercentage}%
                    </Badge>
                  </div>
                  <Input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={localConfig.splitPercentage}
                    onChange={(e) =>
                      handleConfigUpdate({ splitPercentage: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
                <Input
                  type="number"
                  min="10"
                  max="90"
                  value={localConfig.splitPercentage}
                  onChange={(e) => {
                    const value = Math.max(10, Math.min(90, parseInt(e.target.value) || 50));
                    handleConfigUpdate({ splitPercentage: value });
                  }}
                  className="w-20 border-purple-200"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Percentage of leads assigned to Group A (rest go to Group B)
              </p>
            </div>

            {/* Test Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">What to Test</Label>
              <Select
                value={localConfig.testType}
                onValueChange={(value: ABTestConfig['testType']) =>
                  handleConfigUpdate({ testType: value })
                }
              >
                <SelectTrigger className="border-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">
                    <div>
                      <div className="font-medium">Content</div>
                      <div className="text-xs text-muted-foreground">
                        Test different email/SMS content
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="subject">
                    <div>
                      <div className="font-medium">Subject Line</div>
                      <div className="text-xs text-muted-foreground">
                        Test different email subject lines
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="timing">
                    <div>
                      <div className="font-medium">Send Timing</div>
                      <div className="text-xs text-muted-foreground">
                        Test different send times
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="task">
                    <div>
                      <div className="font-medium">Task Sequence</div>
                      <div className="text-xs text-muted-foreground">
                        Test different workflow task orders
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Test Duration */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Test Duration (Days)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={localConfig.testDuration || 7}
                onChange={(e) =>
                  handleConfigUpdate({ testDuration: parseInt(e.target.value) || 7 })
                }
                className="border-purple-200"
              />
              <p className="text-xs text-muted-foreground">
                How long to run the test before analyzing results
              </p>
            </div>

            {/* Auto Declare Winner */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <Label className="text-sm font-medium">Auto-Declare Winner</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically select winning variant based on performance metrics
                </p>
              </div>
              <Switch
                checked={localConfig.autoDeclareWinner || false}
                onCheckedChange={(checked) => handleConfigUpdate({ autoDeclareWinner: checked })}
              />
            </div>

            {/* Performance Metric */}
            {localConfig.autoDeclareWinner && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Performance Metric</Label>
                <Select
                  value={localConfig.metric || 'open_rate'}
                  onValueChange={(value: ABTestConfig['metric']) =>
                    handleConfigUpdate({ metric: value })
                  }
                >
                  <SelectTrigger className="border-purple-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_rate">Open Rate</SelectItem>
                    <SelectItem value="click_rate">Click Rate</SelectItem>
                    <SelectItem value="reply_rate">Reply Rate</SelectItem>
                    <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Metric used to determine the winning variant
                </p>
              </div>
            )}

            {/* Info Message */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-blue-800">
                    <strong>How it works:</strong> When A/B testing is enabled, leads are randomly
                    assigned to Group A or B based on the split percentage. Each group receives
                    different variants of tasks. After the test duration, you can analyze results
                    and manually select a winner, or let the system auto-select based on your chosen
                    metric.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

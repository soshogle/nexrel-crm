'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TabsContent } from '@/components/ui/tabs';

interface AdvancedTabProps {
  formData: {
    pronunciationDict: string;
    webhookUrl: string;
    customData: string;
  };
  setFormData: (updater: any) => void;
}

export function AdvancedTab({ formData, setFormData }: AdvancedTabProps) {
  const update = (fields: Record<string, any>) => setFormData((prev: any) => ({ ...prev, ...fields }));

  return (
    <TabsContent value="advanced" className="space-y-4 mt-4">
      <div>
        <Label htmlFor="pronunciationDict">
          Pronunciation Dictionary
          <span className="text-xs text-gray-500 ml-2">JSON format</span>
        </Label>
        <Textarea
          id="pronunciationDict" value={formData.pronunciationDict}
          onChange={(e) => update({ pronunciationDict: e.target.value })}
          placeholder='{"API": "A P I", "SQL": "sequel"}'
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">Custom pronunciation rules for specific words</p>
      </div>
      <div>
        <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
        <Input id="webhookUrl" value={formData.webhookUrl} onChange={(e) => update({ webhookUrl: e.target.value })} placeholder="https://your-domain.com/webhook" />
        <p className="text-xs text-gray-500 mt-1">Receive call events via webhook</p>
      </div>
      <div>
        <Label htmlFor="customData">
          Custom Data
          <span className="text-xs text-gray-500 ml-2">JSON format</span>
        </Label>
        <Textarea
          id="customData" value={formData.customData}
          onChange={(e) => update({ customData: e.target.value })}
          placeholder='{"team": "sales", "region": "west"}'
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">Additional metadata attached to the agent</p>
      </div>
    </TabsContent>
  );
}

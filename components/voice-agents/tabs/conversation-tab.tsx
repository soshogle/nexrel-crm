'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TabsContent } from '@/components/ui/tabs';
import { VOICE_AGENT_LANGUAGES } from '@/lib/voice-languages';

interface ConversationTabProps {
  formData: {
    llmModel: string;
    language: string;
    temperature: number;
    maxTokens: number;
    maxCallDuration: number;
    responseDelay: number;
    enableInterruptions: boolean;
    firstMessage: string;
  };
  setFormData: (updater: any) => void;
}

export function ConversationTab({ formData, setFormData }: ConversationTabProps) {
  const update = (fields: Record<string, any>) => setFormData((prev: any) => ({ ...prev, ...fields }));

  return (
    <TabsContent value="conversation" className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="llmModel">Language Model</Label>
          <Select value={formData.llmModel} onValueChange={(value) => update({ llmModel: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4">GPT-4 (Recommended)</SelectItem>
              <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</SelectItem>
              <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
              <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="language">Language</Label>
          <Select value={formData.language} onValueChange={(value) => update({ language: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {VOICE_AGENT_LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>
            Temperature: {formData.temperature.toFixed(2)}
            <span className="text-xs text-gray-500 ml-2">Higher = more creative, Lower = more focused</span>
          </Label>
          <Slider value={[formData.temperature]} onValueChange={([value]) => update({ temperature: value })} min={0} max={1} step={0.05} className="mt-2" />
        </div>
        <div>
          <Label htmlFor="maxTokens">Max Tokens per Response</Label>
          <Input id="maxTokens" type="number" value={formData.maxTokens} onChange={(e) => update({ maxTokens: parseInt(e.target.value) || 500 })} min="100" max="2000" />
        </div>
        <div>
          <Label htmlFor="maxCallDuration">Max Call Duration (seconds)</Label>
          <Input id="maxCallDuration" type="number" value={formData.maxCallDuration} onChange={(e) => update({ maxCallDuration: parseInt(e.target.value) || 600 })} min="60" max="3600" />
          <p className="text-xs text-gray-500 mt-1">Current: {Math.floor(formData.maxCallDuration / 60)} minutes</p>
        </div>
        <div>
          <Label htmlFor="responseDelay">Response Delay (milliseconds)</Label>
          <Input id="responseDelay" type="number" value={formData.responseDelay} onChange={(e) => update({ responseDelay: parseInt(e.target.value) || 100 })} min="0" max="1000" />
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="enableInterruptions" checked={formData.enableInterruptions} onCheckedChange={(checked) => update({ enableInterruptions: checked })} />
          <Label htmlFor="enableInterruptions">Allow Caller Interruptions</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="firstMessage">First Message (What agent says when call connects)</Label>
        <Textarea id="firstMessage" value={formData.firstMessage} onChange={(e) => update({ firstMessage: e.target.value })} placeholder="Hello! Thank you for calling. How can I help you today?" rows={2} />
      </div>
    </TabsContent>
  );
}

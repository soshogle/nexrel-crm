'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
}

interface VoiceTtsTabProps {
  formData: {
    voiceId: string;
    ttsModel: string;
    outputFormat: string;
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };
  setFormData: (updater: any) => void;
  voices: Voice[];
  loadingVoices: boolean;
}

export function VoiceTtsTab({ formData, setFormData, voices, loadingVoices }: VoiceTtsTabProps) {
  const update = (fields: Record<string, any>) => setFormData((prev: any) => ({ ...prev, ...fields }));

  return (
    <TabsContent value="voice" className="space-y-4 mt-4">
      <div>
        <Label htmlFor="voiceId">
          Voice Selection
          {loadingVoices && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
        </Label>
        <Select value={formData.voiceId} onValueChange={(value) => update({ voiceId: value })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {voices.length > 0 ? (
              voices.map((voice) => (
                <SelectItem key={voice.voice_id} value={voice.voice_id}>
                  {voice.name} {voice.category && `(${voice.category})`}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="EXAVITQu4vr4xnSDxMaL">Eric (Default)</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ttsModel">TTS Model</Label>
          <Select value={formData.ttsModel} onValueChange={(value) => update({ ttsModel: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="eleven_turbo_v2">Eleven Turbo v2 (Recommended)</SelectItem>
              <SelectItem value="eleven_turbo_v2_5">Eleven Turbo v2.5</SelectItem>
              <SelectItem value="eleven_monolingual_v1">Eleven Monolingual v1</SelectItem>
              <SelectItem value="eleven_multilingual_v2">Eleven Multilingual v2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="outputFormat">Output Format</Label>
          <Select value={formData.outputFormat} onValueChange={(value) => update({ outputFormat: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pcm_16000">PCM 16000 Hz (Recommended)</SelectItem>
              <SelectItem value="pcm_22050">PCM 22050 Hz</SelectItem>
              <SelectItem value="pcm_24000">PCM 24000 Hz</SelectItem>
              <SelectItem value="pcm_44100">PCM 44100 Hz</SelectItem>
              <SelectItem value="ulaw_8000">μ-law 8000 Hz</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>
            Stability: {formData.stability.toFixed(2)}
            <span className="text-xs text-gray-500 ml-2">Higher = more stable, Lower = more expressive</span>
          </Label>
          <Slider value={[formData.stability]} onValueChange={([value]) => update({ stability: value })} min={0} max={1} step={0.05} className="mt-2" />
        </div>
        <div>
          <Label>
            Similarity Boost: {formData.similarityBoost.toFixed(2)}
            <span className="text-xs text-gray-500 ml-2">How closely to match the original voice</span>
          </Label>
          <Slider value={[formData.similarityBoost]} onValueChange={([value]) => update({ similarityBoost: value })} min={0} max={1} step={0.05} className="mt-2" />
        </div>
        <div>
          <Label>
            Style Exaggeration: {formData.style.toFixed(2)}
            <span className="text-xs text-gray-500 ml-2">Amplify the style of the voice</span>
          </Label>
          <Slider value={[formData.style]} onValueChange={([value]) => update({ style: value })} min={0} max={1} step={0.05} className="mt-2" />
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="useSpeakerBoost" checked={formData.useSpeakerBoost} onCheckedChange={(checked) => update({ useSpeakerBoost: checked })} />
          <Label htmlFor="useSpeakerBoost">Use Speaker Boost (Enhance voice clarity)</Label>
        </div>
      </div>
    </TabsContent>
  );
}

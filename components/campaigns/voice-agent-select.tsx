'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface VoiceAgentSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function VoiceAgentSelect({ value, onChange, placeholder = 'Select a voice agent' }: VoiceAgentSelectProps) {
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);

  useEffect(() => {
    fetch('/api/voice-agents')
      .then((r) => (r.ok ? r.json() : { voiceAgents: [] }))
      .then((d) => setVoiceAgents(d.voiceAgents || []))
      .catch(() => setVoiceAgents([]));
  }, []);

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {voiceAgents.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

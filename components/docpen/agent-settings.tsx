'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Settings,
  Mic,
  Globe,
  Trash2,
  RefreshCw,
  ChevronRight,
  Volume2,
  Play,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Agent {
  id: string;
  profession: string;
  customProfession?: string;
  elevenLabsAgentId: string;
  voiceId?: string;
  voiceName?: string;
  language: string;
  languageName?: string;
  voiceGender?: string;
  stability?: number;
  similarityBoost?: number;
  isActive: boolean;
  lastUsedAt?: string;
  conversationCount: number;
  totalDurationSec: number;
  createdAt: string;
  _count: {
    conversations: number;
    knowledgeBaseFiles: number;
  };
}

interface Language {
  code: string;
  name: string;
}

interface Voice {
  voice_id: string;
  name: string;
  gender: string;
  description?: string;
  preview_url?: string;
  recommended?: boolean;
}

const PROFESSION_LABELS: Record<string, string> = {
  GENERAL_PRACTICE: 'General Practice',
  DENTAL: 'Dental',
  OPTOMETRY: 'Optometry',
  DERMATOLOGY: 'Dermatology',
  CARDIOLOGY: 'Cardiology',
  PSYCHIATRY: 'Psychiatry',
  PEDIATRICS: 'Pediatrics',
  ORTHOPEDIC: 'Orthopedic',
  PHYSIOTHERAPY: 'Physiotherapy',
  CHIROPRACTIC: 'Chiropractic',
  CUSTOM: 'Custom',
};

export function DocpenAgentSettings() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [updatingFunctions, setUpdatingFunctions] = useState(false);

  // Editing form state
  const [editForm, setEditForm] = useState({
    language: 'en',
    voiceId: '',
    stability: 0.6,
    similarityBoost: 0.8,
    isActive: true,
  });

  useEffect(() => {
    fetchAgents();
    fetchVoices();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/docpen/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data.agents || []);
      setLanguages(data.languages || []);
    } catch (error) {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchVoices = async () => {
    try {
      const response = await fetch('/api/docpen/voices');
      if (response.ok) {
        const data = await response.json();
        setVoices(data.voices || []);
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setEditForm({
      language: agent.language || 'en',
      voiceId: agent.voiceId || '',
      stability: agent.stability || 0.6,
      similarityBoost: agent.similarityBoost || 0.8,
      isActive: agent.isActive,
    });
  };

  const handleSave = async () => {
    if (!editingAgent) return;

    setSaving(true);
    try {
      const response = await fetch('/api/docpen/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: editingAgent.id,
          ...editForm,
          voiceName: voices.find(v => v.voice_id === editForm.voiceId)?.name,
        }),
      });

      if (!response.ok) throw new Error('Failed to update agent');

      toast.success('Agent updated successfully');
      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      toast.error('Failed to update agent');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFunctions = async () => {
    setUpdatingFunctions(true);
    try {
      const response = await fetch('/api/docpen/agents/update-functions', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update agents');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Updated ${result.updated} of ${result.total} agents successfully!`);
        if (result.errors && result.errors.length > 0) {
          console.warn('Some agents had errors:', result.errors);
        }
      } else {
        throw new Error(result.error || 'Update failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update agent functions');
    } finally {
      setUpdatingFunctions(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;

    try {
      const response = await fetch(`/api/docpen/agents?agentId=${deleteAgent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete agent');

      toast.success('Agent deleted');
      setDeleteAgent(null);
      fetchAgents();
    } catch (error) {
      toast.error('Failed to delete agent');
    }
  };

  const playVoicePreview = (voice: Voice) => {
    if (!voice.preview_url) return;
    setPlayingVoice(voice.voice_id);
    const audio = new Audio(voice.preview_url);
    audio.onended = () => setPlayingVoice(null);
    audio.play().catch(() => setPlayingVoice(null));
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Voice Agents</h3>
          <p className="text-sm text-muted-foreground">
            Manage your profession-specific voice assistants
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleUpdateFunctions}
            disabled={updatingFunctions || agents.length === 0}
          >
            {updatingFunctions ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update All Agents
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAgents}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Agents List */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h4 className="font-medium mb-1">No Voice Agents Yet</h4>
            <p className="text-sm text-muted-foreground">
              Voice agents are automatically created when you start a Docpen session
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => (
            <Card key={agent.id} className={!agent.isActive ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-950">
                      <Bot className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {PROFESSION_LABELS[agent.profession] || agent.profession}
                          {agent.customProfession && ` - ${agent.customProfession}`}
                        </h4>
                        <Badge variant={agent.isActive ? 'default' : 'secondary'}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {agent.languageName || 'English'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mic className="h-3 w-3" />
                          {agent.voiceName || 'Default'}
                        </span>
                        <span>{agent._count.conversations} conversations</span>
                        <span>{formatDuration(agent.totalDurationSec)} total</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(agent)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteAgent(agent)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Edit Voice Agent
            </DialogTitle>
            <DialogDescription>
              Configure voice and language settings for{' '}
              {editingAgent &&
                (PROFESSION_LABELS[editingAgent.profession] || editingAgent.profession)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Language */}
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={editForm.language}
                onValueChange={val => setEditForm(f => ({ ...f, language: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice */}
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select
                value={editForm.voiceId || undefined}
                onValueChange={val => setEditForm(f => ({ ...f, voiceId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map(voice => (
                    <SelectItem key={voice.voice_id} value={voice.voice_id}>
                      <div className="flex items-center gap-2">
                        {voice.name} ({voice.gender})
                        {voice.recommended && (
                          <Badge variant="outline" className="text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.voiceId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const voice = voices.find(v => v.voice_id === editForm.voiceId);
                    if (voice) playVoicePreview(voice);
                  }}
                  disabled={playingVoice === editForm.voiceId}
                >
                  {playingVoice === editForm.voiceId ? (
                    <Volume2 className="h-4 w-4 mr-1 animate-pulse" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Preview Voice
                </Button>
              )}
            </div>

            {/* Voice Stability */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Voice Stability</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(editForm.stability * 100)}%
                </span>
              </div>
              <Slider
                value={[editForm.stability]}
                onValueChange={([val]) => setEditForm(f => ({ ...f, stability: val }))}
                min={0}
                max={1}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground">
                Higher stability = more consistent, lower = more expressive
              </p>
            </div>

            {/* Similarity Boost */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Similarity Boost</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(editForm.similarityBoost * 100)}%
                </span>
              </div>
              <Slider
                value={[editForm.similarityBoost]}
                onValueChange={([val]) =>
                  setEditForm(f => ({ ...f, similarityBoost: val }))
                }
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Agent Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable this voice agent
                </p>
              </div>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={val => setEditForm(f => ({ ...f, isActive: val }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAgent(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the{' '}
              {deleteAgent &&
                (PROFESSION_LABELS[deleteAgent.profession] || deleteAgent.profession)}{' '}
              voice agent? This will permanently delete the agent and all
              associated conversation history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

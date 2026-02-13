
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, MoreVertical, Power, Trash2, Pencil, TestTube2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EditVoiceAgentDialog } from './edit-voice-agent-dialog';
import { toast } from 'sonner';

interface VoiceAgentsListProps {
  agents: any[];
  loading: boolean;
  onAgentUpdated: () => void;
}

export function VoiceAgentsList({ agents, loading, onAgentUpdated }: VoiceAgentsListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice agent?')) return;

    setDeletingId(id);
    try {
      await fetch(`/api/voice-agents/${id}`, { method: 'DELETE' });
      onAgentUpdated();
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert('Failed to delete agent');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (agent: any) => {
    setEditingAgent(agent);
    setShowEditDialog(true);
  };

  const handleTest = (agent: any) => {
    // Check if agent has ElevenLabs configuration
    if (!agent.elevenLabsAgentId) {
      toast.error('Agent needs to be configured before testing', {
        description: 'Please configure the agent first by clicking Edit.',
      });
      return;
    }
    
    // Navigate to browser-based preview page
    router.push(`/dashboard/voice-agents/preview?agentId=${agent.id}`);
  };

  const toggleStatus = async (agent: any) => {
    try {
      const newStatus = agent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await fetch(`/api/voice-agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...agent, status: newStatus }),
      });
      onAgentUpdated();
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const handleSyncOnboardingDocs = async (agentId: string) => {
    setSyncingId(agentId);
    
    // Show loading toast
    const loadingToast = toast.loading('Syncing onboarding documents...', {
      description: 'Fetching documents and updating agent...',
    });

    try {
      const response = await fetch(`/api/voice-agents/${agentId}/sync-onboarding-docs`, {
        method: 'PATCH',
      });

      const data = await response.json();

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.ok) {
        if (data.warning) {
          toast.warning('Partial Success', {
            description: data.warning,
            duration: 6000,
          });
        } else {
          toast.success('Sync Complete!', {
            description: data.message || 'Onboarding documents synced successfully to agent and Soshogle AI.',
            duration: 5000,
          });
        }
        onAgentUpdated();
      } else {
        toast.error('Sync Failed', {
          description: data.error || 'Failed to sync onboarding documents',
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('Error syncing onboarding docs:', error);
      toast.dismiss(loadingToast);
      toast.error('Sync Failed', {
        description: error.message || 'Network error while syncing documents',
        duration: 6000,
      });
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-900 rounded-lg border-2 border-dashed border-gray-700">
        <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2 text-white">
          No Voice Agents Yet
        </h3>
        <p className="text-gray-400">
          Create your first AI voice agent to start handling calls automatically
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.filter(agent => agent && agent.id).map((agent) => (
        <div
          key={agent.id}
          className="bg-card border rounded-lg p-6 hover:border-primary/50 hover:shadow-lg transition-all"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {agent.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {agent.businessName}
              </p>
              <Badge
                variant={
                  agent.status === 'ACTIVE'
                    ? 'default'
                    : agent.status === 'TESTING'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {agent.status}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleTest(agent)}>
                  <TestTube2 className="w-4 h-4 mr-2" />
                  Test Agent
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleSyncOnboardingDocs(agent.id)}
                  disabled={syncingId === agent.id}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncingId === agent.id ? 'animate-spin' : ''}`} />
                  {syncingId === agent.id ? 'Syncing...' : 'Sync Onboarding Docs'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(agent)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleStatus(agent)}>
                  <Power className="w-4 h-4 mr-2" />
                  {agent.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(agent.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400 w-24">Type:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {agent.type}
              </span>
            </div>

            {agent.twilioPhoneNumber && (
              <div className="flex items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400 w-24">Phone:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {agent.twilioPhoneNumber}
                </span>
              </div>
            )}

            {agent.businessIndustry && (
              <div className="flex items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400 w-24">Industry:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {agent.businessIndustry}
                </span>
              </div>
            )}

            <div className="flex items-center text-sm pt-3 border-t border-gray-200 dark:border-gray-700">
              <Phone className="w-4 h-4 mr-2 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                {agent._count?.callLogs || 0} calls handled
              </span>
            </div>
          </div>
        </div>
      ))}

      <EditVoiceAgentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onAgentUpdated={() => {
          onAgentUpdated();
          setShowEditDialog(false);
        }}
        agent={editingAgent}
      />
    </div>
  );
}

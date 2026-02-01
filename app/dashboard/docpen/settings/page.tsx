'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  MessageSquare,
  BookOpen,
  ArrowLeft,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DocpenAgentSettings } from '@/components/docpen/agent-settings';
import { DocpenConversationHistory } from '@/components/docpen/conversation-history';
import { DocpenKnowledgeBaseTraining } from '@/components/docpen/knowledge-base-training';

export default function DocpenSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('agents');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/docpen')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-500" />
            AI Docpen Settings
          </h1>
          <p className="text-muted-foreground">
            Manage voice agents, conversation history, and training knowledge
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Voice Agents
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Training
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="agents">
            <DocpenAgentSettings />
          </TabsContent>
          <TabsContent value="history">
            <DocpenConversationHistory />
          </TabsContent>
          <TabsContent value="training">
            <DocpenKnowledgeBaseTraining />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

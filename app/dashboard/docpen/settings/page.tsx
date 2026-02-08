'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Bot,
  MessageSquare,
  BookOpen,
  ArrowLeft,
  Brain,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import { isMenuItemVisible } from '@/lib/industry-menu-config';
import type { Industry } from '@/lib/industry-menu-config';

// Lazy load components to prevent them from loading until their tab is active
// This prevents translation hook errors if IntlProvider isn't ready
const DocpenAgentSettings = dynamic(() => import('@/components/docpen/agent-settings').then(mod => ({ default: mod.DocpenAgentSettings })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
});

const DocpenConversationHistory = dynamic(() => import('@/components/docpen/conversation-history').then(mod => ({ default: mod.DocpenConversationHistory })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
});

const DocpenKnowledgeBaseTraining = dynamic(() => import('@/components/docpen/knowledge-base-training').then(mod => ({ default: mod.DocpenKnowledgeBaseTraining })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div></div>
});

export default function DocpenSettingsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState('agents');

  // Check if user's industry has access to Docpen
  const userIndustry = (session?.user?.industry as Industry) || null;
  const hasDocpenAccess = isMenuItemVisible('docpen', userIndustry);

  // Redirect non-medical industries away from Docpen settings
  useEffect(() => {
    if (sessionStatus === 'authenticated' && !hasDocpenAccess) {
      router.push('/dashboard');
    }
  }, [sessionStatus, hasDocpenAccess, router]);

  // Show loading while checking access
  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && !hasDocpenAccess)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Guard against unauthenticated state
  if (sessionStatus === 'unauthenticated' || !session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to access Docpen settings</p>
        </div>
      </div>
    );
  }

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
          <TabsContent value="history" className="mt-0">
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

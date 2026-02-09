'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Globe, Settings, Loader2, MessageSquare, Eye, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { toast } from 'sonner';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';

interface Website {
  id: string;
  name: string;
  type: string;
  status: string;
  buildProgress: number;
  structure: any;
  seoData: any;
  vercelDeploymentUrl?: string;
  voiceAIEnabled: boolean;
  voiceAIConfig?: any;
  elevenLabsAgentId?: string;
  pendingChanges?: any;
  createdAt: string;
  updatedAt: string;
}

interface PendingChange {
  id: string;
  changes: any;
  preview: any;
  status: string;
  createdAt: string;
}

export default function WebsiteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [activeTab, setActiveTab] = useState('editor');

  useEffect(() => {
    if (session && params.id) {
      fetchWebsite();
      fetchPendingChanges();
    }
  }, [session, params.id]);

  const fetchWebsite = async () => {
    try {
      const response = await fetch(`/api/websites/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setWebsite(data.website);
      } else {
        toast.error('Failed to load website');
        router.push('/dashboard/websites');
      }
    } catch (error) {
      console.error('Error fetching website:', error);
      toast.error('Failed to load website');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingChanges = async () => {
    try {
      // TODO: Create API endpoint for pending changes
      // For now, check website.pendingChanges
      if (website?.pendingChanges) {
        setPendingChanges([website.pendingChanges]);
      }
    } catch (error) {
      console.error('Error fetching pending changes:', error);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    setChatLoading(true);
    try {
      // Send chat message to AI for website modification
      const response = await fetch(`/api/website-builder/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: params.id,
          message: chatMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process modification');
      }

      const data = await response.json();
      
      // Show preview of changes
      setPendingChanges([...pendingChanges, {
        id: data.approvalId,
        changes: data.changes,
        preview: data.preview,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      }]);

      setChatMessage('');
      toast.success('Changes generated! Review and approve below.');
      setActiveTab('approval');
    } catch (error: any) {
      toast.error(error.message || 'Failed to process modification');
    } finally {
      setChatLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      const response = await fetch('/api/website-builder/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: params.id,
          approvalId,
          action: 'approve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve changes');
      }

      toast.success('Changes approved and applied!');
      setPendingChanges(pendingChanges.filter(c => c.id !== approvalId));
      fetchWebsite(); // Refresh website data
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve changes');
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      const response = await fetch('/api/website-builder/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: params.id,
          approvalId,
          action: 'reject',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject changes');
      }

      toast.success('Changes rejected');
      setPendingChanges(pendingChanges.filter(c => c.id !== approvalId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject changes');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Website not found</p>
            <Link href="/dashboard/websites">
              <Button className="mt-4">Back to Websites</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/websites">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{website.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={website.status === 'READY' ? 'default' : 'outline'}>
                {website.status}
              </Badge>
              {website.vercelDeploymentUrl && (
                <a
                  href={website.vercelDeploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  View Website
                </a>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="approval">
            Pending Changes
            {pendingChanges.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingChanges.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Website Structure</CardTitle>
              <CardDescription>
                Edit your website structure and content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Visual editor coming soon. Use the AI Chat tab to modify your website.
                </p>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(website.structure, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Chat - Modify Your Website</CardTitle>
              <CardDescription>
                Tell the AI what changes you want, and it will generate them for your approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleChatSubmit} className="space-y-4">
                <div>
                  <Textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Example: Change the header color to blue, add a contact form, update the about section..."
                    rows={4}
                    disabled={chatLoading}
                  />
                </div>
                <Button type="submit" disabled={chatLoading || !chatMessage.trim()}>
                  {chatLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Generate Changes
                    </>
                  )}
                </Button>
              </form>

              {website.voiceAIEnabled && website.elevenLabsAgentId && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-4">Voice AI Assistant</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Talk to your website's voice assistant (like on nexrel.soshogle.com)
                  </p>
                  <ElevenLabsAgent
                    agentId={website.elevenLabsAgentId}
                    onConversationEnd={(transcript) => {
                      console.log('Conversation ended:', transcript);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          {pendingChanges.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Check className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Changes</h3>
                <p className="text-muted-foreground">
                  Use the AI Chat tab to request modifications
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingChanges.map((change) => (
                <Card key={change.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Pending Changes</span>
                      <Badge variant="outline">{change.status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(change.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Current</h4>
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(website.structure, null, 2).substring(0, 500)}...
                          </pre>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Preview</h4>
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(change.preview, null, 2).substring(0, 500)}...
                          </pre>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleApprove(change.id)}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(change.id)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Website Preview</CardTitle>
              <CardDescription>
                Preview your website before publishing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {website.vercelDeploymentUrl ? (
                <div className="space-y-4">
                  <a
                    href={website.vercelDeploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button>
                      <Eye className="h-4 w-4 mr-2" />
                      Open Preview
                    </Button>
                  </a>
                  <iframe
                    src={website.vercelDeploymentUrl}
                    className="w-full h-[600px] border rounded-lg"
                    title="Website Preview"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Website is still building. Preview will be available when ready.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

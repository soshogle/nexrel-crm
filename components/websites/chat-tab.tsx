'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Loader2, Image as ImageIcon } from 'lucide-react';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';
import { toast } from 'sonner';

interface ChatTabProps {
  websiteId: string;
  website: any;
  pendingChanges: any[];
  setPendingChanges: (changes: any[]) => void;
  fetchWebsite: () => Promise<void>;
  setActiveTab: (tab: string) => void;
}

export function ChatTab({
  websiteId,
  website,
  pendingChanges,
  setPendingChanges,
  fetchWebsite,
  setActiveTab,
}: ChatTabProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [requiresImageUpload, setRequiresImageUpload] = useState<any>(null);
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    setChatLoading(true);
    setRequiresImageUpload(null);
    setImageUploadFile(null);
    
    try {
      const requestBody: any = {
        websiteId,
        message: chatMessage,
      };

      if (imageUploadFile) {
        const arrayBuffer = await imageUploadFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        requestBody.imageUpload = {
          data: base64,
          contentType: imageUploadFile.type,
        };
      }

      const response = await fetch(`/api/website-builder/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process modification');
      }

      const data = await response.json();
      
      if (data.requiresImageUpload && !imageUploadFile) {
        setRequiresImageUpload(data.requiresImageUpload);
        toast.info('Please upload an image to replace the existing one');
        setChatLoading(false);
        return;
      }

      setPendingChanges([...pendingChanges, {
        id: data.approvalId,
        changes: data.changes,
        preview: data.preview,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        explanation: data.explanation,
      }]);

      setChatMessage('');
      setImageUploadFile(null);
      setRequiresImageUpload(null);
      
      if (data.explanation) {
        toast.success(data.explanation);
      } else {
        toast.success('Changes generated! Review and approve below.');
      }
      setActiveTab('approval');
    } catch (error: any) {
      toast.error(error.message || 'Failed to process modification');
    } finally {
      setChatLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!requiresImageUpload) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('websiteId', websiteId);
      formData.append('imagePath', requiresImageUpload.currentImagePath);

      const response = await fetch('/api/website-builder/upload-image-swap', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      setImageUploadFile(file);
      
      const chatForm = document.querySelector('form[onsubmit]') as HTMLFormElement;
      if (chatForm) {
        chatForm.requestSubmit();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
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
              placeholder="Example: Change background to white, swap the image of the girl in red top, change button text to 'Get Started', update heading to 'Welcome'..."
              rows={4}
              disabled={chatLoading || uploadingImage}
            />
            <p className="text-sm text-muted-foreground mt-2">
              💡 Try: "Change background to white", "Swap that image", "Change button text to 'Get Started'", "Update heading to 'Welcome'"
            </p>
          </div>

          {requiresImageUpload && (
            <Alert>
              <ImageIcon className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-semibold">Image Replacement Required</p>
                  <p className="text-sm text-muted-foreground">
                    AI identified: <strong>{requiresImageUpload.description}</strong>
                  </p>
                  {requiresImageUpload.currentImageUrl && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Current image:</p>
                      <img 
                        src={requiresImageUpload.currentImageUrl} 
                        alt="Current" 
                        className="max-w-xs rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image-upload">Upload Replacement Image</Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file);
                      }
                    }}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Uploading image...
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={chatLoading || uploadingImage || !chatMessage.trim()}>
              {chatLoading || uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingImage ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Generate Changes
                </>
              )}
            </Button>
            {requiresImageUpload && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRequiresImageUpload(null);
                  setImageUploadFile(null);
                  setChatMessage('');
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        {website.voiceAIEnabled && website.elevenLabsAgentId && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-4">Voice AI Assistant</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Talk to your website's voice assistant (like on nexrel.soshogle.com)
            </p>
            <ElevenLabsAgent
              agentId={website.elevenLabsAgentId}
              suppressUserDisconnectLog={true}
              onConversationEnd={(transcript) => {
                console.log('Conversation ended:', transcript);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

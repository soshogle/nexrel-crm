'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Info, ShoppingCart, FileText, Upload, Trash2 } from 'lucide-react';
import PurchasePhoneNumberDialog from './purchase-phone-number-dialog';
import { TwilioPhoneSelector } from '@/components/shared/twilio-phone-selector';
import { VOICE_AGENT_LANGUAGES } from '@/lib/voice-languages';
import { VoiceTtsTab } from './tabs/voice-tts-tab';
import { ConversationTab } from './tabs/conversation-tab';
import { RecordingPrivacyTab } from './tabs/recording-privacy-tab';
import { AdvancedTab } from './tabs/advanced-tab';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
}

interface CreateVoiceAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated: () => void;
  initialPhoneNumber?: string;
}

export function CreateVoiceAgentDialog({
  open,
  onOpenChange,
  onAgentCreated,
  initialPhoneNumber,
}: CreateVoiceAgentDialogProps) {
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    businessName: '',
    businessIndustry: '',
    type: 'INBOUND',
    description: '',
    
    // Knowledge Base
    knowledgeBase: '',
    knowledgeBaseTexts: [] as string[],
    knowledgeBaseUrls: [] as string[],
    knowledgeBaseFiles: [] as string[],
    greetingMessage: '', // Legacy field
    inboundGreeting: '',
    outboundGreeting: '',
    firstMessage: '',
    systemPrompt: '',
    
    // Voice & TTS Settings
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    ttsModel: 'eleven_turbo_v2',
    outputFormat: 'pcm_16000',
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true,
    
    // LLM Settings
    llmModel: 'gpt-4',
    temperature: 0.7,
    maxTokens: 500,
    
    // Conversation Settings
    maxCallDuration: 600,
    enableInterruptions: true,
    responseDelay: 100,
    language: 'en',
    
    // Phone Configuration
    twilioPhoneNumber: '',
    transferPhone: '',
    enableVoicemail: false,
    voicemailMessage: '',
    
    // Appointment Booking
    googleCalendarId: '',
    appointmentDuration: 30,
    availableHours: '',
    
    // Advanced Settings
    pronunciationDict: '',
    webhookUrl: '',
    customData: '',
    
    // Reservation Settings
    enableReservations: false,
    
    // Recording & Transcription Settings
    enableCallRecording: true,
    enableTranscription: true,
    sendRecordingEmail: false,
    recordingEmailAddress: '',
  });
  
  const { data: session } = useSession() || {};
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [error, setError] = useState('');
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [phoneRefreshTrigger, setPhoneRefreshTrigger] = useState(0);
  const [autoConfigureAfterCreation, setAutoConfigureAfterCreation] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<any[]>([]);
  const [onboardingDocuments, setOnboardingDocuments] = useState<any[]>([]);
  const [selectedOnboardingDocs, setSelectedOnboardingDocs] = useState<string[]>([]);

  // Auto-populate business info from user's onboarding data
  useEffect(() => {
    if (open) {
      fetchBusinessInfo();
    }
  }, [open]);

  const fetchBusinessInfo = async () => {
    try {
      const response = await fetch('/api/onboarding/progress');
      if (response.ok) {
        const data = await response.json();
        const progress = data.progress || {};
        
        // Auto-populate business name and industry if available
        if (progress.businessName || progress.industry) {
          setFormData(prev => ({
            ...prev,
            businessName: progress.businessName || prev.businessName,
            businessIndustry: progress.industry || prev.businessIndustry,
          }));
          console.log('✅ Auto-populated business info:', {
            businessName: progress.businessName,
            businessIndustry: progress.industry,
          });
        }
        
        // Load onboarding documents if available
        if (progress.uploadedDocuments && Array.isArray(progress.uploadedDocuments)) {
          setOnboardingDocuments(progress.uploadedDocuments);
          console.log('✅ Loaded onboarding documents:', progress.uploadedDocuments.length);
        }
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
      // Continue without auto-population
    }
  };

  // Fetch available voices and CLEAR knowledge base files for new agent
  useEffect(() => {
    if (open) {
      fetchVoices();
      // Clear knowledge base files when creating a NEW agent
      // Files will only be shown if uploaded during this session
      setKnowledgeBaseFiles([]);
      setSelectedOnboardingDocs([]);
      console.log('🆕 Creating new agent - starting with empty knowledge base');
    } else {
      // Also clear when closing to ensure clean state for next open
      setKnowledgeBaseFiles([]);
      setSelectedOnboardingDocs([]);
      setError('');
      console.log('🧹 Dialog closed - cleared knowledge base files');
    }
  }, [open]);

  // Set initial phone number if provided
  useEffect(() => {
    if (initialPhoneNumber && open) {
      setFormData(prev => ({
        ...prev,
        twilioPhoneNumber: initialPhoneNumber
      }));
    }
  }, [initialPhoneNumber, open]);

  const fetchVoices = async () => {
    setLoadingVoices(true);
    try {
      const response = await fetch('/api/elevenlabs/voices');
      if (response.ok) {
        const data = await response.json();
        setVoices(data.voices || []);
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err);
    } finally {
      setLoadingVoices(false);
    }
  };

  const fetchKnowledgeBaseFiles = async () => {
    try {
      // Fetch ALL files (files can now be shared across multiple agents)
      const response = await fetch('/api/knowledge-base');
      if (response.ok) {
        const data = await response.json();
        setKnowledgeBaseFiles(data.knowledgeBase || []);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge base files:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload PDF, Word, Excel, or Text files only.',
      });
      return;
    }

    // Validate file size (max 50MB)
    const maxSizeMB = 50;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error('File size exceeds limit', {
        description: `Your file is ${fileSizeMB}MB. Please upload files smaller than ${maxSizeMB}MB.`,
      });
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'voice-agent');

      const response = await fetch('/api/knowledge-base/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      toast.success('File uploaded successfully', {
        description: `${file.name} has been processed and added to your knowledge base.`,
      });

      // Add the newly uploaded file to the local list (don't fetch ALL files)
      if (data.file) {
        setKnowledgeBaseFiles(prev => [...prev, data.file]);
        console.log('✅ Added new file to knowledge base:', data.file.fileName);
      }

      // Clear the file input
      e.target.value = '';
    } catch (err) {
      console.error('Failed to upload file:', err);
      toast.error('Upload failed', {
        description: 'There was an error uploading your file. Please try again.',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteKnowledgeBaseFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      toast.success('File deleted successfully');
      // Remove the file from local state (don't fetch ALL files)
      setKnowledgeBaseFiles(prev => prev.filter(file => file.id !== fileId));
      console.log('✅ Removed file from knowledge base:', fileId);
    } catch (err) {
      console.error('Failed to delete file:', err);
      toast.error('Delete failed', {
        description: 'There was an error deleting the file. Please try again.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.name || !formData.name.trim()) {
      setError('Please enter an agent name');
      setLoading(false);
      return;
    }

    // Phone number is optional for super admins
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    if (!isSuperAdmin && (!formData.twilioPhoneNumber || !formData.twilioPhoneNumber.trim())) {
      setError('Please select or enter a phone number. Phone number is required for voice agents.');
      setLoading(false);
      toast.error('Phone number required', {
        description: 'Select a number from the dropdown or purchase one.',
      });
      return;
    }
    
    // If super admin skips phone number, add a note
    if (isSuperAdmin && (!formData.twilioPhoneNumber || !formData.twilioPhoneNumber.trim())) {
      console.log('⚠️ Super admin creating voice agent without phone number');
    }

    try {
      // Add selected onboarding documents to knowledge base texts
      const selectedDocsContent = onboardingDocuments
        .filter(doc => selectedOnboardingDocs.includes(doc.fileName))
        .map(doc => `Document: ${doc.fileName}\n\n${doc.extractedText}`)
        .join('\n\n---\n\n');
      
      const requestData = {
        ...formData,
        knowledgeBaseTexts: selectedDocsContent 
          ? [...formData.knowledgeBaseTexts, selectedDocsContent]
          : formData.knowledgeBaseTexts,
        // Send the IDs of the files uploaded during this session
        knowledgeBaseFileIds: knowledgeBaseFiles.map(file => file.id),
      };
      
      console.log('📤 Creating agent with knowledge base files:', knowledgeBaseFiles.map(f => f.fileName));
      
      const response = await fetch('/api/voice-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const createdAgent = await response.json();
        
        // Auto-configure if option is enabled
        if (autoConfigureAfterCreation && createdAgent.id) {
          try {
            console.log('🔧 Auto-configuring voice agent:', createdAgent.id);
            
            toast.loading('Configuring Voice AI...', { id: 'auto-config' });
            
            const configResponse = await fetch(`/api/voice-agents/${createdAgent.id}/auto-configure`, {
              method: 'POST',
            });
            
            if (configResponse.ok) {
              console.log('✅ Voice agent auto-configured successfully');
              toast.success('Voice agent ready to use!', {
                id: 'auto-config',
                description: 'Your agent is fully configured and ready to make/receive calls',
                duration: 5000,
              });
            } else {
              const error = await configResponse.json();
              console.warn('⚠️ Auto-configuration failed:', error);
              toast.warning('Agent created, but configuration failed', {
                id: 'auto-config',
                description: 'You can manually configure it by clicking "Auto-Configure Now" in the test dialog',
                duration: 6000,
              });
            }
          } catch (configError) {
            console.error('⚠️ Auto-configuration error (non-critical):', configError);
            toast.warning('Agent created, but configuration had issues', {
              id: 'auto-config',
              description: 'You can manually configure it later',
              duration: 5000,
            });
          }
        } else {
          // Just show success for agent creation
          toast.success('Voice agent created!', {
            description: 'Remember to configure it before testing calls',
            duration: 4000,
          });
        }
        
        onAgentCreated();
        onOpenChange(false);
        // Reset form
        setFormData({
          name: '',
          businessName: '',
          businessIndustry: '',
          type: 'INBOUND',
          description: '',
          knowledgeBase: '',
          enableReservations: false,
          knowledgeBaseTexts: [],
          knowledgeBaseUrls: [],
          knowledgeBaseFiles: [],
          greetingMessage: '', // Legacy field
          inboundGreeting: '',
          outboundGreeting: '',
          firstMessage: '',
          systemPrompt: '',
          voiceId: 'EXAVITQu4vr4xnSDxMaL',
          ttsModel: 'eleven_turbo_v2',
          outputFormat: 'pcm_16000',
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          llmModel: 'gpt-4',
          temperature: 0.7,
          maxTokens: 500,
          maxCallDuration: 600,
          enableInterruptions: true,
          responseDelay: 100,
          language: 'en',
          twilioPhoneNumber: '',
          transferPhone: '',
          enableVoicemail: false,
          voicemailMessage: '',
          googleCalendarId: '',
          appointmentDuration: 30,
          availableHours: '',
          pronunciationDict: '',
          webhookUrl: '',
          customData: '',
          enableCallRecording: true,
          enableTranscription: true,
          sendRecordingEmail: false,
          recordingEmailAddress: '',
        });
      } else {
        // Safely parse error response
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            
            // Special handling for payment plan issues
            if (response.status === 402 || errorData.upgradeRequired) {
              const upgradeMessage = `${errorData.details || errorData.error}\n\n${errorData.recommendation || 'Please upgrade your Soshogle AI plan.'}`;
              setError(upgradeMessage);
              
              toast.error('Soshogle AI Plan Upgrade Required', {
                description: errorData.details || errorData.error,
                duration: 10000,
                action: errorData.upgradeUrl ? {
                  label: 'Upgrade Now',
                  onClick: () => window.open(errorData.upgradeUrl, '_blank')
                } : undefined
              });
            } else {
              setError(errorData.error || errorData.details || 'Failed to create voice agent');
            }
            
            console.error('❌ Agent creation failed:', errorData);
          } else {
            const errorText = await response.text();
            setError(errorText || 'Failed to create voice agent');
            console.error('❌ Agent creation failed (non-JSON):', errorText);
          }
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          setError('Failed to create voice agent. Please check console for details.');
        }
      }
    } catch (err: any) {
      console.error('❌ Error creating agent:', err);
      setError(err.message || 'Failed to create voice agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Voice AI Agent</DialogTitle>
          <DialogDescription>
            Configure your AI voice agent for handling calls automatically
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="voice">Voice & TTS</TabsTrigger>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="recording">Recording & Privacy</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Dental Office Receptionist"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g., Downtown Dental Clinic"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessIndustry">Industry</Label>
                  <Input
                    id="businessIndustry"
                    value={formData.businessIndustry}
                    onChange={(e) => setFormData({ ...formData, businessIndustry: e.target.value })}
                    placeholder="e.g., Dental, Restaurant, Real Estate"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Agent Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INBOUND">Inbound Only</SelectItem>
                      <SelectItem value="OUTBOUND">Outbound Only</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this agent's purpose"
                  rows={2}
                />
              </div>

              {/* Reservation Management */}
              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-purple-50">
                <input
                  type="checkbox"
                  id="enableReservations"
                  checked={formData.enableReservations}
                  onChange={(e) => setFormData({ ...formData, enableReservations: e.target.checked })}
                  className="rounded"
                />
                <div>
                  <Label htmlFor="enableReservations" className="cursor-pointer font-semibold text-purple-900">
                    🍽️ Enable Restaurant Reservations
                  </Label>
                  <p className="text-sm text-purple-700">
                    Allow customers to make, modify, and cancel restaurant reservations via phone
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Knowledge Base & FAQs</Label>
                  <Alert className="mt-2 mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Add knowledge sources to help your AI agent answer questions accurately. You can add text, URLs, or upload files.
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Legacy Text Knowledge Base */}
                <div>
                  <Label htmlFor="knowledgeBase">Quick Text Knowledge Base (Legacy)</Label>
                  <Textarea
                    id="knowledgeBase"
                    value={formData.knowledgeBase}
                    onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
                    placeholder="Enter information about your business: hours, services, pricing, common questions, etc."
                    rows={4}
                  />
                </div>

                {/* Text Knowledge Sources */}
                <div>
                  <Label htmlFor="kbText">Text Knowledge Sources</Label>
                  <div className="space-y-2 mt-2">
                    {formData.knowledgeBaseTexts.map((text, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Textarea
                          value={text}
                          onChange={(e) => {
                            const newTexts = [...formData.knowledgeBaseTexts];
                            newTexts[idx] = e.target.value;
                            setFormData({ ...formData, knowledgeBaseTexts: newTexts });
                          }}
                          placeholder="Enter text knowledge..."
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newTexts = formData.knowledgeBaseTexts.filter((_, i) => i !== idx);
                            setFormData({ ...formData, knowledgeBaseTexts: newTexts });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, knowledgeBaseTexts: [...formData.knowledgeBaseTexts, ''] })}
                    >
                      + Add Text Source
                    </Button>
                  </div>
                </div>

                {/* URL Knowledge Sources */}
                <div>
                  <Label htmlFor="kbUrl">URL Knowledge Sources</Label>
                  <div className="space-y-2 mt-2">
                    {formData.knowledgeBaseUrls.map((url, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...formData.knowledgeBaseUrls];
                            newUrls[idx] = e.target.value;
                            setFormData({ ...formData, knowledgeBaseUrls: newUrls });
                          }}
                          placeholder="https://example.com/knowledge-base"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newUrls = formData.knowledgeBaseUrls.filter((_, i) => i !== idx);
                            setFormData({ ...formData, knowledgeBaseUrls: newUrls });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, knowledgeBaseUrls: [...formData.knowledgeBaseUrls, ''] })}
                    >
                      + Add URL Source
                    </Button>
                  </div>
                </div>

                {/* File Knowledge Sources */}
                <div>
                  <Label htmlFor="fileUpload">File Knowledge Sources</Label>
                  <p className="text-sm text-gray-500 mt-1 mb-3">
                    Upload PDF, Word, Excel, or Text files (max 50MB). Files are extracted and added to your agent's knowledge base automatically.
                  </p>
                  
                  {/* File Upload Button */}
                  <div className="relative">
                    <Input
                      id="fileUpload"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('fileUpload')?.click()}
                      disabled={uploadingFile}
                      className="w-full"
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Document
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Uploaded Files List */}
                  {knowledgeBaseFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm text-gray-600">
                        Uploaded Files ({knowledgeBaseFiles.length}) - Content will be included in agent:
                      </Label>
                      {knowledgeBaseFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="h-4 w-4 text-purple-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {file.fileType} • {(file.fileSize / 1024).toFixed(2)} KB • {new Date(file.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteKnowledgeBaseFile(file.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Onboarding Documents Selection */}
                {onboardingDocuments.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold">Onboarding Documents</Label>
                    <p className="text-sm text-gray-500 mt-1 mb-3">
                      Select documents from your onboarding to include in the agent's knowledge base
                    </p>
                    <Alert className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        These documents were uploaded during your onboarding process. Select the ones you want the agent to have access to.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                      {onboardingDocuments.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md"
                        >
                          <Checkbox
                            id={`onboarding-doc-${idx}`}
                            checked={selectedOnboardingDocs.includes(doc.fileName)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOnboardingDocs(prev => [...prev, doc.fileName]);
                              } else {
                                setSelectedOnboardingDocs(prev => prev.filter(f => f !== doc.fileName));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`onboarding-doc-${idx}`}
                              className="text-sm font-medium cursor-pointer flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4 text-purple-600 flex-shrink-0" />
                              <span className="truncate">{doc.fileName}</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              {doc.extractedText?.substring(0, 100)}...
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedOnboardingDocs.length > 0 && (
                      <p className="text-sm text-purple-600 font-medium mt-2">
                        {selectedOnboardingDocs.length} document{selectedOnboardingDocs.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Conditional Greeting Based on Agent Type */}
              {formData.type === 'INBOUND' ? (
                <div>
                  <Label htmlFor="inboundGreeting">Inbound Greeting (When Customer Calls You)</Label>
                  <Textarea
                    id="inboundGreeting"
                    value={formData.inboundGreeting}
                    onChange={(e) => setFormData({ ...formData, inboundGreeting: e.target.value })}
                    placeholder="Thank you for calling [Business Name]. How can I help you today?"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">This is what the AI says when a customer calls your business.</p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="outboundGreeting">Outbound Greeting (When AI Calls Customer)</Label>
                  <Textarea
                    id="outboundGreeting"
                    value={formData.outboundGreeting}
                    onChange={(e) => setFormData({ ...formData, outboundGreeting: e.target.value })}
                    placeholder="Hi, this is [AI Name] calling from [Business Name]. Is this a good time to talk?"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">This is what the AI says when it calls a customer.</p>
                </div>
              )}

              <div>
                <Label htmlFor="systemPrompt">
                  Custom System Prompt (Optional)
                  <span className="text-xs text-gray-500 ml-2">Leave blank for auto-generation</span>
                </Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="You are a helpful AI assistant..."
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* Voice & TTS Tab */}
            <VoiceTtsTab formData={formData} setFormData={setFormData} voices={voices} loadingVoices={loadingVoices} />

            <ConversationTab formData={formData} setFormData={setFormData} />

            {/* Phone Tab */}
            <TabsContent value="phone" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Configure your phone number and call handling settings
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <TwilioPhoneSelector
                  value={formData.twilioPhoneNumber}
                  onChange={(v) => setFormData({ ...formData, twilioPhoneNumber: v })}
                  required={session?.user?.role !== 'SUPER_ADMIN'}
                  onPurchaseClick={() => setShowPurchaseDialog(true)}
                  showPurchaseButton={true}
                  refreshTrigger={phoneRefreshTrigger}
                  label="Phone Number"
                  description="Required for calls. Select from your Twilio account. The system assigns it to the agent in ElevenLabs."
                />
              </div>

              <div>
                <Label htmlFor="transferPhone">Transfer Phone (Optional)</Label>
                <Input
                  id="transferPhone"
                  value={formData.transferPhone}
                  onChange={(e) => setFormData({ ...formData, transferPhone: e.target.value })}
                  placeholder="+14155551234"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Phone number to transfer calls to when needed
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enableVoicemail"
                  checked={formData.enableVoicemail}
                  onCheckedChange={(checked) => setFormData({ ...formData, enableVoicemail: checked })}
                />
                <Label htmlFor="enableVoicemail">Enable Voicemail</Label>
              </div>

              {formData.enableVoicemail && (
                <div>
                  <Label htmlFor="voicemailMessage">Voicemail Message</Label>
                  <Textarea
                    id="voicemailMessage"
                    value={formData.voicemailMessage}
                    onChange={(e) => setFormData({ ...formData, voicemailMessage: e.target.value })}
                    placeholder="You've reached [Business Name]. Please leave a message..."
                    rows={3}
                  />
                </div>
              )}
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Configure appointment booking integration with Google Calendar
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="googleCalendarId">Google Calendar ID (Optional)</Label>
                <Input
                  id="googleCalendarId"
                  value={formData.googleCalendarId}
                  onChange={(e) => setFormData({ ...formData, googleCalendarId: e.target.value })}
                  placeholder="your-calendar@gmail.com"
                />
              </div>

              <div>
                <Label htmlFor="appointmentDuration">Default Appointment Duration (minutes)</Label>
                <Input
                  id="appointmentDuration"
                  type="number"
                  value={formData.appointmentDuration}
                  onChange={(e) => setFormData({ ...formData, appointmentDuration: parseInt(e.target.value) || 30 })}
                  min="15"
                  max="240"
                />
              </div>

              <div>
                <Label htmlFor="availableHours">
                  Available Hours (Optional)
                  <span className="text-xs text-gray-500 ml-2">JSON format</span>
                </Label>
                <Textarea
                  id="availableHours"
                  value={formData.availableHours}
                  onChange={(e) => setFormData({ ...formData, availableHours: e.target.value })}
                  placeholder='{"monday": ["09:00-17:00"], "tuesday": ["09:00-17:00"]}'
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specify business hours for appointment scheduling
                </p>
              </div>
            </TabsContent>

            <RecordingPrivacyTab formData={formData} setFormData={setFormData} />
            <AdvancedTab formData={formData} setFormData={setFormData} />
          </Tabs>

          <div className="space-y-4 pt-6 border-t mt-6">
            {/* Auto-Configure Option */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
              <Switch
                id="autoConfigureAfterCreation"
                checked={autoConfigureAfterCreation}
                onCheckedChange={setAutoConfigureAfterCreation}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="autoConfigureAfterCreation" className="font-semibold cursor-pointer">
                  ⚡ Auto-Configure Voice AI (Recommended)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically set up the voice AI agent with Soshogle AI after creation. 
                  This means your agent will be ready to make and receive calls immediately! 
                  If disabled, you'll need to configure it manually before testing.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {autoConfigureAfterCreation ? 'Creating & Configuring...' : 'Creating...'}
                  </>
                ) : (
                  `Create Agent${autoConfigureAfterCreation ? ' & Auto-Configure' : ''}`
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Purchase Phone Number Dialog */}
      <PurchasePhoneNumberDialog
        open={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        onSuccess={(phoneNumber) => {
          console.log('Phone number purchased:', phoneNumber);
          setFormData((prev) => ({ ...prev, twilioPhoneNumber: phoneNumber }));
          setShowPurchaseDialog(false);
          setPhoneRefreshTrigger((n) => n + 1);
        }}
      />
    </Dialog>
  );
}

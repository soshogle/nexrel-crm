'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, FileText, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
}

interface EditVoiceAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentUpdated: () => void;
  agent: any | null;
}

export function EditVoiceAgentDialog({
  open,
  onOpenChange,
  onAgentUpdated,
  agent,
}: EditVoiceAgentDialogProps) {
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
    
    // Reservation Settings
    enableReservations: false,
    
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
    
    // Recording & Transcription Settings
    enableCallRecording: true,
    enableTranscription: true,
    sendRecordingEmail: false,
    recordingEmailAddress: '',
  });
  
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [error, setError] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<any[]>([]);

  // Load agent data when dialog opens
  useEffect(() => {
    if (open && agent) {
      const kbSources = agent.knowledgeBaseSources as any;
      setFormData({
        name: agent.name || '',
        businessName: agent.businessName || '',
        businessIndustry: agent.businessIndustry || '',
        type: agent.type || 'INBOUND',
        description: agent.description || '',
        knowledgeBase: agent.knowledgeBase || '',
        knowledgeBaseTexts: kbSources?.texts || [],
        knowledgeBaseUrls: kbSources?.urls || [],
        knowledgeBaseFiles: kbSources?.files || [],
        greetingMessage: agent.greetingMessage || '', // Legacy field
        inboundGreeting: agent.inboundGreeting || (agent.type === 'INBOUND' ? agent.greetingMessage : '') || '',
        outboundGreeting: agent.outboundGreeting || (agent.type === 'OUTBOUND' ? agent.greetingMessage : '') || '',
        firstMessage: agent.firstMessage || '',
        systemPrompt: agent.systemPrompt || '',
        enableReservations: (agent as any).enableReservations || false,
        voiceId: agent.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        ttsModel: agent.ttsModel || 'eleven_turbo_v2',
        outputFormat: agent.outputFormat || 'pcm_16000',
        stability: agent.stability ?? 0.5,
        similarityBoost: agent.similarityBoost ?? 0.75,
        style: agent.style ?? 0.0,
        useSpeakerBoost: agent.useSpeakerBoost ?? true,
        llmModel: agent.llmModel || 'gpt-4',
        temperature: agent.temperature ?? 0.7,
        maxTokens: agent.maxTokens || 500,
        maxCallDuration: agent.maxCallDuration || 600,
        enableInterruptions: agent.enableInterruptions ?? true,
        responseDelay: agent.responseDelay || 100,
        language: agent.language || 'en',
        twilioPhoneNumber: agent.twilioPhoneNumber || '',
        transferPhone: agent.transferPhone || '',
        enableVoicemail: agent.enableVoicemail || false,
        voicemailMessage: agent.voicemailMessage || '',
        googleCalendarId: agent.googleCalendarId || '',
        appointmentDuration: agent.appointmentDuration || 30,
        availableHours: agent.availableHours || '',
        pronunciationDict: agent.pronunciationDict || '',
        webhookUrl: agent.webhookUrl || '',
        customData: agent.customData || '',
        enableCallRecording: agent.enableCallRecording ?? true,
        enableTranscription: agent.enableTranscription ?? true,
        sendRecordingEmail: agent.sendRecordingEmail ?? false,
        recordingEmailAddress: agent.recordingEmailAddress || '',
      });
      fetchVoices();
      fetchKnowledgeBaseFiles();
    }
  }, [open, agent]);

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
      // Fetch only files associated with this specific agent
      const url = agent?.id 
        ? `/api/knowledge-base?voiceAgentId=${agent.id}`
        : '/api/knowledge-base';
      const response = await fetch(url);
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
      // Associate the file with the current agent being edited
      if (agent?.id) {
        formData.append('voiceAgentId', agent.id);
      }

      const response = await fetch('/api/knowledge-base/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to upload file');
      }

      toast.success('File uploaded successfully', {
        description: `${file.name} has been processed and added to your knowledge base.`,
      });

      // Refresh the knowledge base files list
      await fetchKnowledgeBaseFiles();

      // Clear the file input
      e.target.value = '';
    } catch (err: any) {
      console.error('Failed to upload file:', err);
      console.error('Error details:', err.message);
      toast.error('Upload failed', {
        description: err.message || 'There was an error uploading your file. Please try again.',
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
      await fetchKnowledgeBaseFiles();
    } catch (err) {
      console.error('Failed to delete file:', err);
      toast.error('Delete failed', {
        description: 'There was an error deleting the file. Please try again.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/voice-agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onAgentUpdated();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update voice agent');
      }
    } catch (err: any) {
      console.error('Error updating agent:', err);
      setError(err.message || 'Failed to update voice agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Voice AI Agent</DialogTitle>
          <DialogDescription>
            Update your voice agent's configuration and settings
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
                  <Label htmlFor="fileUploadEdit">File Knowledge Sources</Label>
                  <p className="text-sm text-gray-500 mt-1 mb-3">
                    Upload PDF, Word, Excel, or Text files (max 50MB)
                  </p>
                  
                  {/* File Upload Button */}
                  <div className="relative">
                    <Input
                      id="fileUploadEdit"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('fileUploadEdit')?.click()}
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
                      <Label className="text-sm text-gray-600">Uploaded Files:</Label>
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
            <TabsContent value="voice" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="voiceId">
                  Voice Selection
                  {loadingVoices && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
                </Label>
                <Select
                  value={formData.voiceId}
                  onValueChange={(value) => setFormData({ ...formData, voiceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <Select
                    value={formData.ttsModel}
                    onValueChange={(value) => setFormData({ ...formData, ttsModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Select
                    value={formData.outputFormat}
                    onValueChange={(value) => setFormData({ ...formData, outputFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <span className="text-xs text-gray-500 ml-2">
                      Higher = more stable, Lower = more expressive
                    </span>
                  </Label>
                  <Slider
                    value={[formData.stability]}
                    onValueChange={([value]) => setFormData({ ...formData, stability: value })}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>
                    Similarity Boost: {formData.similarityBoost.toFixed(2)}
                    <span className="text-xs text-gray-500 ml-2">
                      How closely to match the original voice
                    </span>
                  </Label>
                  <Slider
                    value={[formData.similarityBoost]}
                    onValueChange={([value]) => setFormData({ ...formData, similarityBoost: value })}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>
                    Style Exaggeration: {formData.style.toFixed(2)}
                    <span className="text-xs text-gray-500 ml-2">
                      Amplify the style of the voice
                    </span>
                  </Label>
                  <Slider
                    value={[formData.style]}
                    onValueChange={([value]) => setFormData({ ...formData, style: value })}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="useSpeakerBoost"
                    checked={formData.useSpeakerBoost}
                    onCheckedChange={(checked) => setFormData({ ...formData, useSpeakerBoost: checked })}
                  />
                  <Label htmlFor="useSpeakerBoost">
                    Use Speaker Boost (Enhance voice clarity)
                  </Label>
                </div>
              </div>
            </TabsContent>

            {/* Conversation Tab */}
            <TabsContent value="conversation" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="llmModel">Language Model</Label>
                  <Select
                    value={formData.llmModel}
                    onValueChange={(value) => setFormData({ ...formData, llmModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">All Languages (Multilingual)</SelectItem>
                      <SelectItem value="none">None (Language Detection)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="bg">Bulgarian</SelectItem>
                      <SelectItem value="zh">Chinese (Mandarin)</SelectItem>
                      <SelectItem value="hr">Croatian</SelectItem>
                      <SelectItem value="cs">Czech</SelectItem>
                      <SelectItem value="da">Danish</SelectItem>
                      <SelectItem value="nl">Dutch</SelectItem>
                      <SelectItem value="fil">Filipino</SelectItem>
                      <SelectItem value="fi">Finnish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="el">Greek</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="hu">Hungarian</SelectItem>
                      <SelectItem value="id">Indonesian</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      <SelectItem value="ko">Korean</SelectItem>
                      <SelectItem value="ms">Malay</SelectItem>
                      <SelectItem value="no">Norwegian</SelectItem>
                      <SelectItem value="pl">Polish</SelectItem>
                      <SelectItem value="pt-BR">Portuguese (Brazilian)</SelectItem>
                      <SelectItem value="pt">Portuguese (European)</SelectItem>
                      <SelectItem value="ro">Romanian</SelectItem>
                      <SelectItem value="ru">Russian</SelectItem>
                      <SelectItem value="sk">Slovak</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="sv">Swedish</SelectItem>
                      <SelectItem value="ta">Tamil</SelectItem>
                      <SelectItem value="tr">Turkish</SelectItem>
                      <SelectItem value="uk">Ukrainian</SelectItem>
                      <SelectItem value="vi">Vietnamese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>
                    Temperature: {formData.temperature.toFixed(2)}
                    <span className="text-xs text-gray-500 ml-2">
                      Higher = more creative, Lower = more focused
                    </span>
                  </Label>
                  <Slider
                    value={[formData.temperature]}
                    onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="maxTokens">Max Tokens per Response</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 500 })}
                    min="100"
                    max="2000"
                  />
                </div>

                <div>
                  <Label htmlFor="maxCallDuration">Max Call Duration (seconds)</Label>
                  <Input
                    id="maxCallDuration"
                    type="number"
                    value={formData.maxCallDuration}
                    onChange={(e) => setFormData({ ...formData, maxCallDuration: parseInt(e.target.value) || 600 })}
                    min="60"
                    max="3600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current: {Math.floor(formData.maxCallDuration / 60)} minutes
                  </p>
                </div>

                <div>
                  <Label htmlFor="responseDelay">Response Delay (milliseconds)</Label>
                  <Input
                    id="responseDelay"
                    type="number"
                    value={formData.responseDelay}
                    onChange={(e) => setFormData({ ...formData, responseDelay: parseInt(e.target.value) || 100 })}
                    min="0"
                    max="1000"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableInterruptions"
                    checked={formData.enableInterruptions}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableInterruptions: checked })}
                  />
                  <Label htmlFor="enableInterruptions">
                    Allow Caller Interruptions
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="firstMessage">First Message (What agent says when call connects)</Label>
                <Textarea
                  id="firstMessage"
                  value={formData.firstMessage}
                  onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
                  placeholder="Hello! Thank you for calling. How can I help you today?"
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* Phone Tab */}
            <TabsContent value="phone" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Configure your phone number and call handling settings
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="twilioPhoneNumber">Phone Number</Label>
                <Input
                  id="twilioPhoneNumber"
                  value={formData.twilioPhoneNumber}
                  onChange={(e) => setFormData({ ...formData, twilioPhoneNumber: e.target.value })}
                  placeholder="+14155551234"
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

            {/* Recording & Privacy Tab */}
            <TabsContent value="recording" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Configure call recording, transcription, and privacy settings
                </AlertDescription>
              </Alert>

              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="enableCallRecording" className="font-semibold">
                      Enable Call Recording
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Record all calls for quality assurance and training purposes
                    </p>
                  </div>
                  <Switch
                    id="enableCallRecording"
                    checked={formData.enableCallRecording}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, enableCallRecording: checked })
                    }
                  />
                </div>

                {formData.enableCallRecording && (
                  <>
                    <div className="flex items-center justify-between ml-6 pt-2 border-t">
                      <div className="space-y-1">
                        <Label htmlFor="enableTranscription" className="font-semibold">
                          Enable Transcription
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically transcribe call recordings to text
                        </p>
                      </div>
                      <Switch
                        id="enableTranscription"
                        checked={formData.enableTranscription}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, enableTranscription: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between ml-6 pt-2 border-t">
                      <div className="space-y-1">
                        <Label htmlFor="sendRecordingEmail" className="font-semibold">
                          Email Recording & Transcript
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Send call recording and transcript via email after each call
                        </p>
                      </div>
                      <Switch
                        id="sendRecordingEmail"
                        checked={formData.sendRecordingEmail}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, sendRecordingEmail: checked })
                        }
                      />
                    </div>

                    {formData.sendRecordingEmail && (
                      <div className="ml-6 pt-2">
                        <Label htmlFor="recordingEmailAddress">
                          Email Address
                          <span className="text-destructive ml-1">*</span>
                        </Label>
                        <Input
                          id="recordingEmailAddress"
                          type="email"
                          value={formData.recordingEmailAddress}
                          onChange={(e) => 
                            setFormData({ ...formData, recordingEmailAddress: e.target.value })
                          }
                          placeholder="recordings@yourcompany.com"
                          required={formData.sendRecordingEmail}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Recordings and transcripts will be sent to this email address
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Privacy & Compliance:</strong> Recording calls may require consent from 
                  all parties depending on your jurisdiction. Ensure you comply with local laws 
                  and regulations (e.g., two-party consent laws, GDPR, CCPA). Consider adding a 
                  recording disclosure to your greeting message.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  📞 How Call Recording Works
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <li>• Recordings are stored securely in Soshogle's cloud storage</li>
                  <li>• Transcriptions are generated automatically using advanced AI</li>
                  <li>• All recordings are linked to contact records for easy review</li>
                  <li>• Call transcripts appear in the Messages section for each contact</li>
                  <li>• You can disable recording anytime for security or privacy reasons</li>
                </ul>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Advanced voice AI configuration options for power users
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="pronunciationDict">
                  Pronunciation Dictionary (Optional)
                  <span className="text-xs text-gray-500 ml-2">JSON array format</span>
                </Label>
                <Textarea
                  id="pronunciationDict"
                  value={formData.pronunciationDict}
                  onChange={(e) => setFormData({ ...formData, pronunciationDict: e.target.value })}
                  placeholder='[{"word": "SQL", "pronunciation": "sequel"}, {"word": "API", "pronunciation": "ay pee eye"}]'
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Define custom pronunciations for technical terms, acronyms, or brand names
                </p>
              </div>

              <div>
                <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                <Input
                  id="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://your-domain.com/webhook/voice-events"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Receive real-time events from Soshogle (call started, call ended, etc.)
                </p>
              </div>

              <div>
                <Label htmlFor="customData">
                  Custom Data (Optional)
                  <span className="text-xs text-gray-500 ml-2">JSON format</span>
                </Label>
                <Textarea
                  id="customData"
                  value={formData.customData}
                  onChange={(e) => setFormData({ ...formData, customData: e.target.value })}
                  placeholder='{"department": "sales", "region": "west", "priority": "high"}'
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Store additional metadata or configuration specific to your use case
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
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
                  Updating...
                </>
              ) : (
                'Update Agent'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

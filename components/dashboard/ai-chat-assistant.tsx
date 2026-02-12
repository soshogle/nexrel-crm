
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles, 
  Minimize2,
  Bot,
  User,
  Paperclip,
  FileSpreadsheet,
  XCircle,
  ArrowRight,
  Mic,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { ElevenLabsAgent } from "@/components/landing/soshogle/elevenlabs-agent";
import { ChatMarkdown } from "@/components/dashboard/chat-markdown";
import { extractScreenContext, getPageContext } from "@/lib/screen-context-extractor";
import { EmailPreviewCard, type EmailDraft } from "@/components/dashboard/email-preview-card";
import { SmsPreviewCard, type SmsDraft } from "@/components/dashboard/sms-preview-card";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  file?: {
    name: string;
    type: string;
  };
  navigateTo?: string;
  emailDraft?: EmailDraft;
  smsDraft?: SmsDraft;
}

export function AIChatAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [crmAgentId, setCrmAgentId] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch CRM voice agent ID for voice mode
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        setVoiceLoading(true);
        const response = await fetch('/api/crm-voice-agent');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.agentId) {
            setCrmAgentId(data.agentId);
            console.log('✅ [Chat Assistant] CRM voice agent loaded:', data.agentId);
          }
        }
      } catch (error) {
        console.error('❌ [Chat Assistant] Failed to load CRM voice agent:', error);
      } finally {
        setVoiceLoading(false);
      }
    };
    fetchAgent();
  }, []);

  // Add welcome message on mount (client-side only)
  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: "👋 Hi! I'm Soshogle Agent, your AI assistant. I'm here to help you with anything related to your CRM. Ask me about leads, contacts, campaigns, workflows, or any other feature! You can type or use voice mode.",
      timestamp: new Date(),
    }]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Listen for help requests from other components (like test dialog)
  useEffect(() => {
    const handleOpenAssistant = (event: CustomEvent) => {
      console.log('🔔 AI Assistant event received:', event.detail);
      const { message } = event.detail || {};
      
      // Open the assistant
      setIsOpen(true);
      setIsMinimized(false);
      
      // Add the user's message to the chat
      if (message) {
        console.log('✅ Setting input message:', message);
        setInput(message);
        
        // Focus the input and auto-send after a short delay
        setTimeout(() => {
          // Focus the input
          if (inputRef.current) {
            inputRef.current.focus();
          }
          
          // Programmatically trigger the send button click
          const sendButton = document.querySelector('[data-ai-send-button]') as HTMLButtonElement;
          if (sendButton && !sendButton.disabled) {
            console.log('📤 Auto-sending message...');
            sendButton.click();
          }
        }, 300);
      }
    };

    // Use type assertion to fix TypeScript error
    const handler = handleOpenAssistant as EventListener;
    window.addEventListener('open-ai-assistant', handler);
    
    return () => {
      window.removeEventListener('open-ai-assistant', handler);
    };
  }, [setIsOpen, setIsMinimized, setInput]); // Include all dependencies

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    toast.success(`File "${file.name}" selected`);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input || (selectedFile ? `Uploaded file: ${selectedFile.name}` : ""),
      timestamp: new Date(),
      file: selectedFile ? { name: selectedFile.name, type: selectedFile.type } : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    const currentFile = selectedFile;
    setInput("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsLoading(true);

    // Phase 2: Create draft first when user says "create workflow", then pass draftId to AI so it adds tasks live
    const lower = currentInput.toLowerCase();
    let workflowDraftId: string | null = null;
    const isWorkflowCreate = /\b(create|set up|build)\b.*\bworkflow\b|\bworkflow\b.*\b(create|set up|build)\b/.test(lower);
    if (isWorkflowCreate) {
      try {
        const draftRes = await fetch('/api/workflows/draft', { method: 'POST' });
        const draftData = draftRes.ok ? await draftRes.json() : null;
        workflowDraftId = draftData?.workflow?.id || null;
        if (workflowDraftId && typeof window !== 'undefined') {
          sessionStorage.setItem('activeWorkflowDraftId', workflowDraftId);
          fetch('/api/workflows/active-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftId: workflowDraftId }),
          }).catch(() => {});
        }
        // Navigate immediately so user sees builder while AI adds tasks (builder polls every 3s)
        router.push(workflowDraftId ? `/dashboard/workflows?openBuilder=1&draftId=${workflowDraftId}` : '/dashboard/workflows?openBuilder=1');
        toast.success('Opening workflow builder... I\'ll add the tasks as we go.');
      } catch {
        router.push('/dashboard/workflows?openBuilder=1');
        toast.success('Opening workflow builder...');
      }
    } else if (/\b(create|set up|build)\b.*\bcampaign\b|\bcampaign\b.*\b(create|set up|build)\b/.test(lower)) {
      router.push('/dashboard/campaigns/email-drip/create');
      toast.success('Opening campaign creator...');
    }

    try {
      // If there's a file, handle file upload separately
      if (currentFile) {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('message', currentInput);
        formData.append('conversationHistory', JSON.stringify(messages.slice(-10)));
        const activeDraftId = workflowDraftId || (typeof window !== 'undefined' ? sessionStorage.getItem('activeWorkflowDraftId') : null);
        const screenContext = typeof window !== 'undefined' ? extractScreenContext() : '';
        const pageContext = typeof window !== 'undefined' ? getPageContext() : null;
        const context: Record<string, any> = {};
        if (activeDraftId) context.activeWorkflowDraftId = activeDraftId;
        if (screenContext) context.screenContext = screenContext;
        if (pageContext?.path) context.currentPath = pageContext.path;
        if (pageContext?.activeWebsiteId) context.activeWebsiteId = pageContext.activeWebsiteId;
        if (pageContext?.activeLeadId) context.activeLeadId = pageContext.activeLeadId;
        if (pageContext?.activeDealId) context.activeDealId = pageContext.activeDealId;
        if (Object.keys(context).length > 0) formData.append('context', JSON.stringify(context));

        const response = await fetch("/api/ai-assistant/chat", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process file");
        }

        const data = await response.json();

        const assistantMessage: Message = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
          navigateTo: data.navigateTo,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Handle navigation if present
        if (data.navigateTo) {
          toast.success("Taking you to the page...", {
            icon: <ArrowRight className="h-4 w-4" />,
          });
          // Delay navigation slightly to allow user to see the message
          setTimeout(() => {
            router.push(data.navigateTo);
          }, 1500);
        }
      } else {
        // Regular text message - pass workflowDraftId when we just created a draft so AI adds tasks
        const activeDraftId = workflowDraftId || (typeof window !== 'undefined' ? sessionStorage.getItem('activeWorkflowDraftId') : null);
        const screenContext = typeof window !== 'undefined' ? extractScreenContext() : '';
        const pageContext = typeof window !== 'undefined' ? getPageContext() : null;
        const context: Record<string, any> = {};
        if (activeDraftId) context.activeWorkflowDraftId = activeDraftId;
        if (screenContext) context.screenContext = screenContext;
        if (pageContext?.path) context.currentPath = pageContext.path;
        if (pageContext?.activeWebsiteId) context.activeWebsiteId = pageContext.activeWebsiteId;
        if (pageContext?.activeLeadId) context.activeLeadId = pageContext.activeLeadId;
        if (pageContext?.activeDealId) context.activeDealId = pageContext.activeDealId;
        const response = await fetch("/api/ai-assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: currentInput,
            conversationHistory: messages.slice(-10),
            ...(Object.keys(context).length > 0 && { context }),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        const data = await response.json();

        const assistantMessage: Message = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
          navigateTo: data.navigateTo,
          ...(data.emailDraft && { emailDraft: data.emailDraft }),
          ...(data.smsDraft && { smsDraft: data.smsDraft }),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Handle visualization trigger
        if (data.triggerVisualization && data.statistics) {
          console.log('📊 [Chat Assistant] Triggering visualization with statistics:', data.statistics);
          // Dispatch event for AI Brain page to receive
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ai-brain-visualization-update', {
              detail: {
                statistics: data.statistics,
                show: true,
              },
            }));
          }
          // Notify user
          toast.success("Visualizations ready on AI Brain page!", {
            icon: <BarChart3 className="h-4 w-4" />,
            duration: 3000,
          });
        }

        // Handle navigation if present (skip if we already navigated for workflow create)
        if (data.navigateTo && !isWorkflowCreate) {
          if (data.triggerVisualization) {
            toast.success("Taking you to AI Brain page to view visualizations...", {
              icon: <ArrowRight className="h-4 w-4" />,
            });
          } else {
            toast.success("Taking you to the page...", {
              icon: <ArrowRight className="h-4 w-4" />,
            });
          }
          // Delay navigation slightly to allow user to see the message
          setTimeout(() => {
            router.push(data.navigateTo);
          }, 1500);
        }
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
      
      const errorMessage: Message = {
        role: "assistant",
        content: `I'm sorry, I encountered an error: ${error.message || "Unknown error"}. Please try again or contact support if the issue persists.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 z-[9999] p-0"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6 text-white" />
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        </div>
      </Button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] transition-all duration-300 ${
      isMinimized ? "w-80" : "w-96"
    }`}>
      <Card className="shadow-2xl border-2 border-primary/20">
        <CardHeader className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Soshogle Agent
                  <Badge variant="secondary" className="bg-white/20 text-white text-[10px] px-1.5 py-0 h-4">
                    AI
                  </Badge>
                </CardTitle>
                <p className="text-xs text-white/80 mt-0.5">Your CRM Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0">
            {/* Messages Area */}
            <ScrollArea className="h-96 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.role === "assistant" && (
                          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          {message.file && (
                            <div className={`flex items-center gap-2 p-2 rounded-lg ${
                              message.role === "user" ? "bg-white/20" : "bg-background"
                            }`}>
                              <FileSpreadsheet className="h-4 w-4" />
                              <span className="text-xs font-medium">{message.file.name}</span>
                            </div>
                          )}
                          {message.role === "assistant" ? (
                            <ChatMarkdown content={message.content} />
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          )}
                          {message.emailDraft && message.role === "assistant" && (
                            <EmailPreviewCard
                              draft={message.emailDraft}
                              onSend={async () => {
                                const res = await fetch("/api/ai-assistant/confirm-email", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "send", draft: message.emailDraft }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                toast.success(data.message);
                                setMessages((prev) =>
                                  prev.map((m, i) =>
                                    i === index
                                      ? { ...m, emailDraft: undefined, content: `✓ ${data.message}` }
                                      : m
                                  )
                                );
                              }}
                              onSchedule={async (scheduledFor) => {
                                const res = await fetch("/api/ai-assistant/confirm-email", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "schedule",
                                    draft: message.emailDraft,
                                    scheduledFor,
                                  }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                toast.success(data.message);
                                setMessages((prev) =>
                                  prev.map((m, i) =>
                                    i === index
                                      ? { ...m, emailDraft: undefined, content: `✓ ${data.message}` }
                                      : m
                                  )
                                );
                              }}
                            />
                          )}
                          {message.smsDraft && message.role === "assistant" && (
                            <SmsPreviewCard
                              draft={message.smsDraft}
                              onSend={async () => {
                                const res = await fetch("/api/ai-assistant/confirm-sms", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ action: "send", draft: message.smsDraft }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                toast.success(data.message);
                                setMessages((prev) =>
                                  prev.map((m, i) =>
                                    i === index
                                      ? { ...m, smsDraft: undefined, content: `✓ ${data.message}` }
                                      : m
                                  )
                                );
                              }}
                              onSchedule={async (scheduledFor) => {
                                const res = await fetch("/api/ai-assistant/confirm-sms", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "schedule",
                                    draft: message.smsDraft,
                                    scheduledFor,
                                  }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                toast.success(data.message);
                                setMessages((prev) =>
                                  prev.map((m, i) =>
                                    i === index
                                      ? { ...m, smsDraft: undefined, content: `✓ ${data.message}` }
                                      : m
                                  )
                                );
                              }}
                            />
                          )}
                          {message.navigateTo && message.role === "assistant" && !message.emailDraft && !message.smsDraft && (
                            <Button
                              variant="default"
                              size="sm"
                              className="mt-2 gap-2"
                              onClick={() => {
                                router.push(message.navigateTo!);
                                toast.success("Taking you there now!");
                              }}
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                              Go to page
                            </Button>
                          )}
                        </div>
                        {message.role === "user" && (
                          <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl p-3 bg-muted">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                        </div>
                        <p className="text-sm text-muted-foreground">Thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-background">
              {/* File Upload Preview */}
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="h-6 w-6"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* File Upload Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || voiceMode}
                  title="Upload CSV file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                {/* Voice Mode Toggle */}
                <Button
                  type="button"
                  variant={voiceMode ? "default" : "outline"}
                  size="icon"
                  onClick={() => {
                    if (!voiceMode && crmAgentId) {
                      setVoiceMode(true);
                    } else {
                      setVoiceMode(false);
                    }
                  }}
                  disabled={isLoading || voiceLoading || !crmAgentId}
                  title={voiceMode ? "Exit voice mode" : "Enable voice mode"}
                  className={voiceMode ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" : ""}
                >
                  <Mic className={`h-4 w-4 ${voiceMode ? 'text-white' : ''}`} />
                </Button>

                {/* Text Input - Hidden when voice mode is active */}
                {!voiceMode && (
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedFile ? "Add a message (optional)..." : "Ask me anything about your CRM..."}
                    disabled={isLoading}
                    className="flex-1"
                  />
                )}

                {/* Voice Agent Display - Show when voice mode is active */}
                {voiceMode && crmAgentId && (
                  <div className="flex-1 flex items-center justify-center p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Mic className="h-4 w-4 animate-pulse" />
                      <span>Voice mode active - Speak now</span>
                    </div>
                  </div>
                )}

                {/* Send Button - Hidden when voice mode is active */}
                {!voiceMode && (
                  <Button
                    data-ai-send-button
                    onClick={handleSend}
                    disabled={isLoading || (!input.trim() && !selectedFile)}
                    size="icon"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {/* Voice Agent Component - Render when voice mode is active */}
              {voiceMode && crmAgentId && !isMinimized && (
                <div className="mt-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <ElevenLabsAgent
                    agentId={crmAgentId}
                    autoStart={false}
                    onAudioLevel={() => {}}
                    onAgentSpeakingChange={(speaking) => {
                      // Update UI based on speaking state
                    }}
                    onMessage={(message) => {
                      // Add agent message to chat
                      if (message.role === 'agent' && message.content) {
                        const agentMessage: Message = {
                          role: "assistant",
                          content: message.content,
                          timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, agentMessage]);
                        
                        // Check if message contains statistics keywords and trigger visualization
                        const content = message.content.toLowerCase();
                        const statsKeywords = ['statistic', 'statistics', 'stats', 'revenue', 'leads', 'deals', 'data', 'what if', 'predict', 'project', 'simulate'];
                        if (statsKeywords.some(keyword => content.includes(keyword))) {
                          // Trigger statistics fetch and visualization (pass message for dynamic chart parsing)
                          fetch('/api/crm-voice-agent/functions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              function_name: 'get_statistics',
                              parameters: { chartIntent: message.content },
                            }),
                          }).then(async (res) => {
                            if (res.ok) {
                              const data = await res.json();
                              if (data.success && data.statistics) {
                                // Dispatch visualization event
                                window.dispatchEvent(new CustomEvent('ai-brain-visualization-update', {
                                  detail: { statistics: data.statistics, show: true },
                                }));
                                // Auto-navigate
                                toast.success("Visualizations ready! Taking you to AI Brain page...", {
                                  icon: <BarChart3 className="h-4 w-4" />,
                                });
                                setTimeout(() => {
                                  router.push('/dashboard/business-ai?mode=voice');
                                }, 1500);
                              }
                            }
                          }).catch(console.error);
                        }
                      }
                    }}
                    onConversationEnd={(transcript) => {
                      // Add user messages from transcript to chat
                      transcript.forEach((msg: any) => {
                        if (msg.role === 'user') {
                          const userMessage: Message = {
                            role: "user",
                            content: msg.content,
                            timestamp: new Date(msg.timestamp),
                          };
                          setMessages((prev) => [...prev, userMessage]);
                        }
                      });
                    }}
                  />
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Press Enter to send • Upload CSV for bulk imports • AI-powered assistance
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

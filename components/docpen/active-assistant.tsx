'use client';

import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Mic, MicOff, Loader2, Book, Pill, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  queryType?: string;
  content: string;
  sources?: Array<{ type: string; title: string; url?: string }>;
  timestamp: Date;
}

interface ActiveAssistantProps {
  sessionId: string;
  isActive: boolean;
  onActivationChange?: (active: boolean) => void;
}

export function ActiveAssistant({
  sessionId,
  isActive,
  onActivationChange,
}: ActiveAssistantProps) {
  const tPlaceholders = useTranslations('placeholders.input');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedQueryType, setSelectedQueryType] = useState<string>('medical_lookup');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const queryTypes = [
    { id: 'patient_history', label: 'Patient History', icon: Book },
    { id: 'drug_interaction', label: 'Drug Check', icon: Pill },
    { id: 'medical_lookup', label: 'Medical Info', icon: HelpCircle },
    { id: 'feedback', label: 'Session Feedback', icon: MessageCircle },
  ];

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Speech recognition error');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendQuery = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      queryType: selectedQueryType,
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/docpen/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          queryType: selectedQueryType,
          queryText: userMessage.content,
          triggerMethod: isListening ? 'voice' : 'text',
        }),
      });

      if (!response.ok) throw new Error('Query failed');

      const result = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.response,
        sources: result.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  return (
    <Card className={`h-full flex flex-col ${isActive ? 'border-purple-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Docpen Assistant
          </CardTitle>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Standby'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Query Type Selector */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {queryTypes.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={selectedQueryType === id ? 'default' : 'outline'}
              className="text-xs h-7"
              onClick={() => setSelectedQueryType(id)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
            </Button>
          ))}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4 mb-3" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Ask Docpen about patient history, drug interactions, or medical information.
                </p>
                <p className="text-xs mt-2">
                  Say "Docpen" or type your question below.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.queryType && message.type === 'user' && (
                      <Badge variant="outline" className="text-xs mb-1 bg-background/20">
                        {queryTypes.find(q => q.id === message.queryType)?.label}
                      </Badge>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs font-medium mb-1">Sources:</p>
                        {message.sources.map((source, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            • {source.title}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2">
          <Button
            size="icon"
            variant={isListening ? 'destructive' : 'outline'}
            onClick={toggleListening}
            disabled={isLoading}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? tPlaceholders('listening') : tPlaceholders('askDocpen')}
            disabled={isLoading || isListening}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={sendQuery}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

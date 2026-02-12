
'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Phone, Video, MoreVertical, Check, CheckCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { MakeCallDialog } from '@/components/voice-agents/make-call-dialog';

interface Message {
  id: string;
  conversationId: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  attachments?: any;
}

interface Conversation {
  id: string;
  channelType: string;
  contactName: string;
  contactIdentifier: string;
  contactAvatar?: string;
  lead?: {
    id: string;
    businessName: string;
  };
}

interface MessageThreadProps {
  conversationId: string;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [smartReplies, setSmartReplies] = useState<{ id: string; label: string; text: string }[]>([]);
  const [showSmartReplies, setShowSmartReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      loadConversation();
      loadMessages();
      markAsRead();
    }
  }, [conversationId]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      loadMessages();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/messaging/conversations/${conversationId}`);
      const data = await response.json();
      setConversation(data.conversation);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/messaging/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/messaging/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsRead: true }),
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/messaging/conversations/${conversationId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to send message');
      }

      const data = await response.json();
      
      // Add message to UI immediately
      setMessages([...messages, data.message]);
      setNewMessage('');
      toast.success('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fetchSmartReplies = async () => {
    if (smartReplies.length > 0) {
      setShowSmartReplies((v) => !v);
      return;
    }
    setLoadingReplies(true);
    try {
      const res = await fetch(`/api/smart-replies?conversationId=${conversationId}`);
      const data = await res.json();
      if (res.ok && data.replies) {
        setSmartReplies(data.replies);
        setShowSmartReplies(true);
      } else {
        toast.error('Could not load smart replies');
      }
    } catch {
      toast.error('Could not load smart replies');
    } finally {
      setLoadingReplies(false);
    }
  };

  const useSmartReply = (text: string) => {
    setNewMessage((prev) => (prev ? `${prev}\n\n${text}` : text));
    setShowSmartReplies(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'DELIVERED':
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'FAILED':
        return <span className="text-destructive text-xs">!</span>;
      default:
        return null;
    }
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.contactAvatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(conversation.contactName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{conversation.contactName}</h3>
            <p className="text-sm text-muted-foreground">
              {conversation.contactIdentifier}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setCallDialogOpen(true)}
            title="Make Voice AI Call"
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              toast.info('Video calling feature coming soon!');
            }}
            title="Video call"
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              toast.info('More options coming soon!');
            }}
            title="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-16 bg-muted rounded-2xl animate-pulse max-w-xs" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-muted-foreground mb-2">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Start the conversation by sending a message below
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOutbound = message.direction === 'OUTBOUND';
              const showAvatar = index === 0 || 
                messages[index - 1].direction !== message.direction;

              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {showAvatar && !isOutbound && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conversation.contactAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(conversation.contactName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!showAvatar && !isOutbound && <div className="w-8" />}

                  <div
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} max-w-[70%]`}
                  >
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOutbound
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 px-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.sentAt), 'HH:mm')}
                      </span>
                      {isOutbound && getMessageStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        {showSmartReplies && smartReplies.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {smartReplies.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 px-2 text-xs"
                onClick={() => useSmartReply(r.text)}
              >
                {r.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="h-auto py-1.5 px-2 text-xs" onClick={() => setShowSmartReplies(false)}>
              Close
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={fetchSmartReplies}
            disabled={loadingReplies}
            title="Smart replies"
          >
            {loadingReplies ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>

          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-32 resize-none"
            rows={1}
          />

          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Voice AI Call Dialog */}
      <MakeCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        defaultName={conversation?.contactName || ''}
        defaultPhone={conversation?.contactIdentifier || ''}
        defaultPurpose="Follow-up from message conversation"
      />
    </div>
  );
}

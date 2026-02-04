
'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Search, Filter, Inbox, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Conversation {
  id: string;
  channelType: string;
  contactName: string;
  contactIdentifier: string;
  contactAvatar?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  status: string;
}

interface ConversationListProps {
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onSync?: () => void;
}

const channelIcons: Record<string, string> = {
  SMS: '💬',
  EMAIL: '✉️',
  WHATSAPP: '📱',
  INSTAGRAM: '📸',
  MESSENGER: '💙',
  FACEBOOK_MESSENGER: '💙',
  GOOGLE_BUSINESS: '🏢',
  WEBSITE_CHAT: '💻',
};

const channelColors: Record<string, { bg: string; border: string; text: string }> = {
  SMS: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  EMAIL: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  WHATSAPP: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  INSTAGRAM: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  FACEBOOK_MESSENGER: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  GOOGLE_BUSINESS: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  WEBSITE_CHAT: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
};

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
  onSync,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  useEffect(() => {
    loadConversations();
    
    // Poll for new messages every 30 seconds
    const interval = setInterval(() => {
      loadConversations();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [channelFilter]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (channelFilter !== 'all') {
        params.set('channelType', channelFilter);
      }
      
      const response = await fetch(`/api/messaging/conversations?${params}`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contactIdentifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-700 bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
            <Inbox className="h-5 w-5 text-primary" />
            Messages
          </h2>
          {onSync && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSync}
              className="text-white hover:bg-gray-800"
              title="Sync messages"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Channel Filter */}
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="SMS">💬 SMS</SelectItem>
            <SelectItem value="EMAIL">✉️ Email</SelectItem>
            <SelectItem value="WHATSAPP">📱 WhatsApp</SelectItem>
            <SelectItem value="INSTAGRAM">📸 Instagram</SelectItem>
            <SelectItem value="FACEBOOK_MESSENGER">💙 Facebook</SelectItem>
            <SelectItem value="GOOGLE_BUSINESS">🏢 Google Business</SelectItem>
            <SelectItem value="WEBSITE_CHAT">💻 Website Chat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-400">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors ${
                  selectedConversationId === conversation.id
                    ? 'bg-gray-800'
                    : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.contactAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(conversation.contactName)}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={`absolute -bottom-1 -right-1 text-xs px-1.5 py-0.5 rounded-full border ${channelColors[conversation.channelType]?.bg || 'bg-gray-500/10'} ${channelColors[conversation.channelType]?.border || 'border-gray-500/30'}`}
                    title={conversation.channelType}
                  >
                    <span className={channelColors[conversation.channelType]?.text || 'text-gray-400'}>
                      {channelIcons[conversation.channelType] || '💬'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold truncate text-white">
                      {conversation.contactName}
                    </p>
                    {conversation.lastMessageAt && (
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 truncate">
                      {conversation.lastMessagePreview || 'No messages yet'}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge className="ml-2 bg-primary text-primary-foreground">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

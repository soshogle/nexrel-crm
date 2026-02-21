
'use client';

import { useState, useEffect } from 'react';
import { ConversationList } from './conversation-list';
import { MessageThread } from './message-thread';
import CallHistoryPanel from './call-history-panel';
import { ChannelConnectionsPanel } from './channel-connections-panel';
import { ChannelStatsCards } from './channel-stats-cards';
import CreateContactDialog from '../contacts/create-contact-dialog';
import { MessageCircle, Plus, Loader2, Search, UserPlus, Phone, Mail, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface PhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  capabilities?: {
    sms?: boolean;
    voice?: boolean;
  };
}

export function MessagingPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newChannelType, setNewChannelType] = useState('SMS');
  const [newContactName, setNewContactName] = useState('');
  const [newContactIdentifier, setNewContactIdentifier] = useState('');
  const [fromPhoneNumber, setFromPhoneNumber] = useState<string>('');
  const [twilioNumbers, setTwilioNumbers] = useState<PhoneNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showConnectionsPanel, setShowConnectionsPanel] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Contact search and selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [isCreateContactDialogOpen, setIsCreateContactDialogOpen] = useState(false);

  // Fetch Twilio phone numbers when dialog opens and SMS is selected
  useEffect(() => {
    if (showNewConversation && newChannelType === 'SMS') {
      fetchTwilioNumbers();
    }
  }, [showNewConversation, newChannelType]);

  const fetchTwilioNumbers = async () => {
    try {
      setLoadingNumbers(true);
      const response = await fetch('/api/twilio/phone-numbers/owned');
      const data = await response.json();

      if (data.success && data.numbers) {
        setTwilioNumbers(data.numbers);
        // Auto-select first number if available
        if (data.numbers.length > 0 && !fromPhoneNumber) {
          setFromPhoneNumber(data.numbers[0].phoneNumber);
        }
      } else {
        toast.error('No phone numbers found. Please configure in Settings.');
      }
    } catch (error) {
      console.error('Error fetching Twilio numbers:', error);
      toast.error('Failed to load phone numbers');
    } finally {
      setLoadingNumbers(false);
    }
  };

  // Search for contacts/leads
  const searchContacts = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      
      // Search both contacts and leads
      const [contactsRes, leadsRes] = await Promise.all([
        fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=5`),
        fetch(`/api/leads?search=${encodeURIComponent(query)}&limit=5`)
      ]);

      const contactsData = await contactsRes.json();
      const leadsData = await leadsRes.json();

      const results = [
        ...(contactsData.contacts || []).map((c: any) => ({ ...c, type: 'contact' })),
        ...(leadsData || []).map((l: any) => ({ ...l, type: 'lead' }))
      ];

      setSearchResults(results);
      
      if (results.length === 0 && query.trim()) {
        setShowCreateContact(true);
      }
    } catch (error) {
      console.error('Error searching contacts:', error);
      toast.error('Failed to search contacts');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle selecting a contact from search results
  const handleSelectContact = (contact: any) => {
    setSelectedContact(contact);
    
    if (contact.type === 'contact') {
      setNewContactName(contact.name || '');
      setNewContactIdentifier(newChannelType === 'SMS' ? contact.phone : contact.email);
    } else {
      // Lead
      setNewContactName(contact.contactPerson || contact.businessName || '');
      setNewContactIdentifier(newChannelType === 'SMS' ? contact.phone : contact.email);
    }
    
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle new contact created from dialog
  const handleContactCreated = (contact: any) => {
    // Auto-select the newly created contact
    handleSelectContact({ ...contact, type: 'contact' });
    // Refresh search results
    if (searchQuery) {
      searchContacts(searchQuery);
    }
  };

  const handleNewConversation = async () => {
    if (!newContactName.trim() || !newContactIdentifier.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    // For SMS, require phone number selection only if multiple numbers exist
    if (newChannelType === 'SMS') {
      if (twilioNumbers.length === 0) {
        toast.error('No phone numbers configured. Please configure a phone number in Settings.');
        return;
      }
      // If multiple numbers exist, require selection
      if (twilioNumbers.length > 1 && !fromPhoneNumber) {
        toast.error('Please select a phone number to send from');
        return;
      }
      // If only one number exists, use it automatically
      if (twilioNumbers.length === 1 && !fromPhoneNumber) {
        setFromPhoneNumber(twilioNumbers[0].phoneNumber);
      }
    }

    try {
      setCreating(true);
      const response = await fetch('/api/messaging/conversations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType: newChannelType,
          contactName: newContactName.trim(),
          contactIdentifier: newContactIdentifier.trim(),
          fromPhoneNumber: newChannelType === 'SMS' ? (fromPhoneNumber || twilioNumbers[0]?.phoneNumber) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create conversation');
      }

      toast.success('Conversation created successfully!');
      setShowNewConversation(false);
      setSelectedConversationId(data.conversation.id);
      
      // Reset form
      setNewContactName('');
      setNewContactIdentifier('');
      setFromPhoneNumber('');
      
      // Refresh conversation list
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast.error(error.message || 'Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  const handleSync = async () => {
    try {
      const response = await fetch('/api/messaging/sync', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success('Messages synced successfully');
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error('Failed to sync messages');
      }
    } catch (error) {
      console.error('Error syncing messages:', error);
      toast.error('Failed to sync messages');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Channel Stats - Reference for owners to see which channels get most communications */}
      <div className="shrink-0 px-4 py-3 border-b border-gray-700 bg-gray-900/50">
        <p className="text-xs text-muted-foreground mb-2">Channel activity overview</p>
        <ChannelStatsCards refreshKey={refreshKey} compact />
      </div>

      <div className="flex-1 flex min-h-0">
      {/* Conversations List - Left Sidebar */}
      <div className="w-full md:w-96 shrink-0 flex flex-col border-r border-gray-700">
        <div className="flex-1 overflow-hidden">
          <ConversationList
            key={refreshKey}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onSync={handleSync}
          />
        </div>
        
        {/* Channel Connections Panel - Collapsible */}
        <div className="border-t border-gray-700 bg-gray-900">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConnectionsPanel(!showConnectionsPanel)}
            className="w-full justify-between text-white hover:bg-gray-800 rounded-none"
          >
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Channel Connections
            </span>
            <span className="text-xs text-gray-400">
              {showConnectionsPanel ? 'Hide' : 'Show'}
            </span>
          </Button>
          {showConnectionsPanel && (
            <div className="max-h-96 overflow-y-auto border-t border-gray-700">
              <ChannelConnectionsPanel
                onConnectionChange={() => {
                  setRefreshKey((prev) => prev + 1);
                  handleSync();
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Message Thread - Main Area */}
      <div className="flex-1 hidden md:flex">
        {selectedConversationId ? (
          <Tabs defaultValue="messages" className="w-full">
            <div className="border-b px-6 pt-4">
              <TabsList>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="calls">Call History</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="messages" className="h-[calc(100vh-8rem)] mt-0">
              <MessageThread conversationId={selectedConversationId} />
            </TabsContent>
            <TabsContent value="calls" className="h-[calc(100vh-8rem)] p-6 overflow-y-auto">
              <CallHistoryPanel selectedConversationId={selectedConversationId} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center w-full text-center p-8">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <MessageCircle className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Choose a conversation from the list to view messages and send replies
            </p>
            
            <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                  <DialogDescription>
                    Choose a channel and enter contact details to start a new conversation.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel">Channel</Label>
                    <Select value={newChannelType} onValueChange={setNewChannelType}>
                      <SelectTrigger id="channel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">💬 SMS</SelectItem>
                        <SelectItem value="EMAIL">✉️ Email</SelectItem>
                        <SelectItem value="WHATSAPP">📱 WhatsApp</SelectItem>
                        <SelectItem value="INSTAGRAM">📸 Instagram</SelectItem>
                        <SelectItem value="FACEBOOK_MESSENGER">💙 Facebook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show SMS phone number selection only for SMS channel */}
                  {newChannelType === 'SMS' && (
                    <div className="space-y-2">
                      <Label htmlFor="smsNumber">SMS</Label>
                      {loadingNumbers ? (
                        <div className="flex items-center gap-2 p-3 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading phone numbers...</span>
                        </div>
                      ) : twilioNumbers.length === 0 ? (
                        <div className="p-3 border rounded-md bg-muted">
                          <p className="text-sm text-muted-foreground">
                            No phone numbers configured. Please configure a phone number in Settings.
                          </p>
                        </div>
                      ) : twilioNumbers.length === 1 ? (
                        <div className="p-3 border rounded-md bg-muted">
                          <p className="text-sm text-muted-foreground">
                            {twilioNumbers[0].phoneNumber}
                            {twilioNumbers[0].friendlyName && ` (${twilioNumbers[0].friendlyName})`}
                          </p>
                        </div>
                      ) : (
                        <Select value={fromPhoneNumber} onValueChange={setFromPhoneNumber} required>
                          <SelectTrigger id="smsNumber">
                            <SelectValue placeholder="Select SMS phone number" />
                          </SelectTrigger>
                          <SelectContent>
                            {twilioNumbers.map((number) => (
                              <SelectItem key={number.phoneNumber} value={number.phoneNumber}>
                                {number.phoneNumber} {number.friendlyName && `(${number.friendlyName})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {/* Contact Search or Manual Entry Toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <Label>Select Contact</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUseManualEntry(!useManualEntry);
                        if (!useManualEntry) {
                          setSearchQuery('');
                          setSearchResults([]);
                          setSelectedContact(null);
                        }
                      }}
                    >
                      {useManualEntry ? (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search Contacts
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Manual Entry
                        </>
                      )}
                    </Button>
                  </div>

                  {!useManualEntry ? (
                    <>
                      {/* Contact Search */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search contacts by name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              searchContacts(e.target.value);
                            }}
                            className="pl-10"
                          />
                          {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                          )}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                          <Card className="p-2 max-h-48 overflow-y-auto">
                            {searchResults.map((result, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleSelectContact(result)}
                                className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="rounded-full bg-primary/10 p-2">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium truncate">
                                        {result.type === 'contact' ? result.name : (result.contactPerson || result.businessName)}
                                      </p>
                                      <Badge variant="outline" className="text-xs">
                                        {result.type}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                      {result.phone && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {result.phone}
                                        </span>
                                      )}
                                      {result.email && (
                                        <span className="flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {result.email}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </Card>
                        )}

                        {/* No Results - Create Contact Option */}
                        {searchQuery && searchResults.length === 0 && !isSearching && showCreateContact && (
                          <Card className="p-4 bg-muted">
                            <p className="text-sm text-muted-foreground mb-3">
                              No contacts found for "{searchQuery}"
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsCreateContactDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Create New Contact
                            </Button>
                          </Card>
                        )}
                      </div>

                      {/* Selected Contact Display */}
                      {selectedContact && (
                        <Card className="p-4 bg-primary/5">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {selectedContact.type === 'contact' 
                                  ? selectedContact.name 
                                  : (selectedContact.contactPerson || selectedContact.businessName)}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                {selectedContact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {selectedContact.phone}
                                  </span>
                                )}
                                {selectedContact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {selectedContact.email}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedContact(null);
                                setNewContactName('');
                                setNewContactIdentifier('');
                              }}
                            >
                              Change
                            </Button>
                          </div>
                        </Card>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Manual Entry Form */}
                      <div className="space-y-2">
                        <Label htmlFor="name">Contact Name</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="identifier">
                          {newChannelType === 'EMAIL' ? 'Email Address' : 
                           newChannelType === 'SMS' ? 'Phone Number (Recipient)' :
                           'Contact Identifier'}
                        </Label>
                        <Input
                          id="identifier"
                          placeholder={
                            newChannelType === 'EMAIL' ? 'john@example.com' :
                            newChannelType === 'SMS' ? '+15149928774' :
                            'Contact ID'
                          }
                          value={newContactIdentifier}
                          onChange={(e) => setNewContactIdentifier(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {newChannelType === 'SMS' && 'Format: +1234567890 (include country code)'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowNewConversation(false);
                      // Reset form
                      setNewContactName('');
                      setNewContactIdentifier('');
                      setFromPhoneNumber('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleNewConversation}
                    disabled={creating || (newChannelType === 'SMS' && twilioNumbers.length === 0)}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Start Conversation'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Mobile: Show thread in full screen when selected */}
      {selectedConversationId && (
        <div className="fixed inset-0 z-50 md:hidden bg-background">
          <Tabs defaultValue="messages" className="w-full h-full">
            <div className="border-b px-4 pt-4">
              <TabsList>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="calls">Call History</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="messages" className="h-[calc(100vh-5rem)] mt-0">
              <MessageThread conversationId={selectedConversationId} />
            </TabsContent>
            <TabsContent value="calls" className="h-[calc(100vh-5rem)] p-4 overflow-y-auto">
              <CallHistoryPanel selectedConversationId={selectedConversationId} />
            </TabsContent>
          </Tabs>
        </div>
      )}
      </div>

      {/* Create Contact Dialog */}
      <CreateContactDialog
        open={isCreateContactDialogOpen}
        onOpenChange={setIsCreateContactDialogOpen}
        onContactCreated={handleContactCreated}
        initialData={{
          name: searchQuery,
          phone: newChannelType === 'SMS' ? '' : undefined,
          email: newChannelType === 'EMAIL' ? '' : undefined,
        }}
      />
    </div>
  );
}

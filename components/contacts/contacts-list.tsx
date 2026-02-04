
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Phone,
  Mail,
  MessageSquare,
  MoreHorizontal,
  TrendingUp,
  Trash2,
  Eye,
  Edit,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import ContactDetailDialog from './contact-detail-dialog';
import TagsManagerDialog from './tags-manager-dialog';
import { MakeCallDialog } from '@/components/voice-agents/make-call-dialog';

interface Contact {
  id: string;
  businessName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  contactType: string | null;
  tags: string[];
  lastContactedAt: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  _count?: {
    deals: number;
    messages: number;
    calls: number;
  };
}

interface ContactsListProps {
  searchQuery: string;
  selectedType: string;
  selectedStatus: string;
  selectedTags: string[];
  refreshKey: number;
  onRefresh: () => void;
}

export default function ContactsList({
  searchQuery,
  selectedType,
  selectedStatus,
  selectedTags,
  refreshKey,
  onRefresh,
}: ContactsListProps) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false);
  const [contactForTags, setContactForTags] = useState<Contact | null>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [contactForCall, setContactForCall] = useState<Contact | null>(null);

  useEffect(() => {
    if (session) {
      fetchContacts();
    }
  }, [session, searchQuery, selectedType, selectedStatus, selectedTags, refreshKey]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

      const response = await fetch(`/api/contacts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      } else {
        toast.error('Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(contacts.map((c) => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts([...selectedContacts, contactId]);
    } else {
      setSelectedContacts(selectedContacts.filter((id) => id !== contactId));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedContacts.length} contacts?`)) return;

    try {
      const response = await fetch('/api/contacts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContacts }),
      });

      if (response.ok) {
        toast.success('Contacts deleted successfully');
        setSelectedContacts([]);
        onRefresh();
      } else {
        toast.error('Failed to delete contacts');
      }
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast.error('Failed to delete contacts');
    }
  };

  const handleBulkTag = () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select contacts first');
      return;
    }
    // Open tags dialog for bulk tagging
    setContactForTags(null); // null indicates bulk operation
    setIsTagsDialogOpen(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Delete this contact?')) return;

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Contact deleted');
        onRefresh();
      } else {
        toast.error('Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailDialogOpen(true);
  };

  const handleContactClick = (contact: Contact) => {
    handleViewContact(contact);
  };

  const handleContactDoubleClick = (contact: Contact) => {
    handleViewContact(contact);
  };

  const handleManageTags = (contact: Contact) => {
    setContactForTags(contact);
    setIsTagsDialogOpen(true);
  };

  const handleMakeCall = (contact: Contact) => {
    setContactForCall(contact);
    setCallDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      CONTACTED: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      QUALIFIED: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      CONVERTED: 'bg-green-500/10 text-green-500 border-green-500/20',
      LOST: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      customer: 'bg-green-500/10 text-green-500',
      prospect: 'bg-blue-500/10 text-blue-500',
      partner: 'bg-purple-500/10 text-purple-500',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Phone className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
        <p className="text-muted-foreground mb-4">
          {searchQuery
            ? 'Try adjusting your search filters'
            : 'Get started by importing contacts or adding them manually'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        {/* Bulk Actions */}
        {selectedContacts.length > 0 && (
          <div className="mb-4 flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedContacts.length} contact(s) selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkTag}>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      selectedContacts.length === contacts.length &&
                      contacts.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Last Contacted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow 
                  key={contact.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onDoubleClick={() => handleContactDoubleClick(contact)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={(checked) =>
                        handleSelectContact(contact.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{contact.businessName}</div>
                      {contact.contactPerson && (
                        <div className="text-sm text-muted-foreground">
                          {contact.contactPerson}
                        </div>
                      )}
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 ml-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                              onClick={() => handleMakeCall(contact)}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.contactType && (
                      <Badge
                        variant="outline"
                        className={getTypeColor(contact.contactType)}
                      >
                        {contact.contactType}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(contact.status)}>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No tags</span>
                      )}
                      {contact.tags && contact.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{contact.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      {contact._count?.deals ? (
                        <span>{contact._count.deals} deals</span>
                      ) : null}
                      {contact._count?.messages ? (
                        <span>{contact._count.messages} msgs</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.lastContactedAt ? (
                      <span className="text-sm text-muted-foreground">
                        {new Date(contact.lastContactedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewContact(contact)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/leads`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleManageTags(contact)}>
                          <Tag className="h-4 w-4 mr-2" />
                          Manage Tags
                        </DropdownMenuItem>
                        {contact.phone && (
                          <DropdownMenuItem onClick={() => handleMakeCall(contact)}>
                            <Phone className="h-4 w-4 mr-2" />
                            Make Voice AI Call
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/messages`)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogs */}
      {selectedContact && (
        <ContactDetailDialog
          contact={selectedContact}
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          onRefresh={onRefresh}
        />
      )}

      <TagsManagerDialog
        open={isTagsDialogOpen}
        onOpenChange={setIsTagsDialogOpen}
        contact={contactForTags}
        selectedContactIds={contactForTags ? [contactForTags.id] : selectedContacts}
        onSuccess={() => {
          onRefresh();
          setSelectedContacts([]);
        }}
      />

      {/* Voice AI Call Dialog */}
      <MakeCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        defaultName={contactForCall?.contactPerson || contactForCall?.businessName || ''}
        defaultPhone={contactForCall?.phone || ''}
        defaultPurpose="Contact follow-up"
        contactId={contactForCall?.id}
      />
    </>
  );
}

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, MessageSquare, Plus, Edit, Trash2, Copy, Save,
  Search, MoreHorizontal, FileText, Tag, Star, StarOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  bodyHtml?: string | null;
  variables?: string[] | null;
  category?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  variables?: string[] | null;
  category?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  'welcome', 'follow_up', 'appointment', 'reminder',
  'invoice', 'newsletter', 'promotion', 'notification', 'other',
];

const VARIABLE_HINTS = [
  '{{firstName}}', '{{lastName}}', '{{email}}', '{{phone}}',
  '{{companyName}}', '{{address}}', '{{date}}', '{{time}}',
];

export default function TemplatesPage() {
  const [tab, setTab] = useState<'email' | 'sms'>('email');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Email form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({
    name: '', subject: '', body: '', bodyHtml: '', category: '', isDefault: false,
  });

  // SMS form state
  const [showSmsForm, setShowSmsForm] = useState(false);
  const [editingSmsId, setEditingSmsId] = useState<string | null>(null);
  const [smsForm, setSmsForm] = useState({
    name: '', message: '', category: '', isDefault: false,
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      const [emailRes, smsRes] = await Promise.all([
        fetch('/api/email-templates'),
        fetch('/api/sms-templates'),
      ]);
      if (emailRes.ok) {
        const d = await emailRes.json();
        setEmailTemplates(d.templates || []);
      }
      if (smsRes.ok) {
        const d = await smsRes.json();
        setSmsTemplates(d.templates || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // Filtered templates
  const filteredEmail = emailTemplates.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredSms = smsTemplates.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.message.toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Email CRUD
  function openNewEmail() {
    setEditingEmailId(null);
    setEmailForm({ name: '', subject: '', body: '', bodyHtml: '', category: '', isDefault: false });
    setShowEmailForm(true);
  }

  function openEditEmail(t: EmailTemplate) {
    setEditingEmailId(t.id);
    setEmailForm({
      name: t.name, subject: t.subject, body: t.body,
      bodyHtml: t.bodyHtml || '', category: t.category || '', isDefault: t.isDefault,
    });
    setShowEmailForm(true);
  }

  async function saveEmail() {
    setSaving(true);
    try {
      const payload = {
        ...(editingEmailId && { id: editingEmailId }),
        name: emailForm.name,
        subject: emailForm.subject,
        body: emailForm.body,
        bodyHtml: emailForm.bodyHtml || null,
        category: emailForm.category || null,
        isDefault: emailForm.isDefault,
      };
      const res = await fetch('/api/email-templates', {
        method: editingEmailId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: editingEmailId ? 'Updated' : 'Created', description: 'Email template saved' });
      setShowEmailForm(false);
      fetchTemplates();
    } catch {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmail(id: string) {
    if (!confirm('Delete this email template?')) return;
    try {
      await fetch(`/api/email-templates?id=${id}`, { method: 'DELETE' });
      toast({ title: 'Deleted', description: 'Email template removed' });
      fetchTemplates();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  }

  async function duplicateEmail(t: EmailTemplate) {
    try {
      await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${t.name} (Copy)`,
          subject: t.subject,
          body: t.body,
          bodyHtml: t.bodyHtml,
          category: t.category,
        }),
      });
      toast({ title: 'Duplicated', description: 'Template copied' });
      fetchTemplates();
    } catch {
      toast({ title: 'Error', description: 'Failed to duplicate', variant: 'destructive' });
    }
  }

  // SMS CRUD
  function openNewSms() {
    setEditingSmsId(null);
    setSmsForm({ name: '', message: '', category: '', isDefault: false });
    setShowSmsForm(true);
  }

  function openEditSms(t: SMSTemplate) {
    setEditingSmsId(t.id);
    setSmsForm({
      name: t.name, message: t.message, category: t.category || '', isDefault: t.isDefault,
    });
    setShowSmsForm(true);
  }

  async function saveSms() {
    setSaving(true);
    try {
      const payload = {
        ...(editingSmsId && { id: editingSmsId }),
        name: smsForm.name,
        message: smsForm.message,
        category: smsForm.category || null,
        isDefault: smsForm.isDefault,
      };
      const res = await fetch('/api/sms-templates', {
        method: editingSmsId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: editingSmsId ? 'Updated' : 'Created', description: 'SMS template saved' });
      setShowSmsForm(false);
      fetchTemplates();
    } catch {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSms(id: string) {
    if (!confirm('Delete this SMS template?')) return;
    try {
      await fetch(`/api/sms-templates?id=${id}`, { method: 'DELETE' });
      toast({ title: 'Deleted', description: 'SMS template removed' });
      fetchTemplates();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  }

  function insertVariable(variable: string, target: 'email-body' | 'email-subject' | 'sms') {
    if (target === 'email-body') {
      setEmailForm((f) => ({ ...f, body: f.body + variable }));
    } else if (target === 'email-subject') {
      setEmailForm((f) => ({ ...f, subject: f.subject + variable }));
    } else {
      setSmsForm((f) => ({ ...f, message: f.message + variable }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Template Manager</h1>
          <p className="text-muted-foreground">Create and manage email and SMS templates for campaigns and workflows</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'email' | 'sms')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" /> Email Templates
              <Badge variant="secondary" className="ml-1">{emailTemplates.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-2">
              <MessageSquare className="h-4 w-4" /> SMS Templates
              <Badge variant="secondary" className="ml-1">{smsTemplates.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <Button onClick={tab === 'email' ? openNewEmail : openNewSms}>
            <Plus className="mr-2 h-4 w-4" /> New {tab === 'email' ? 'Email' : 'SMS'} Template
          </Button>
        </div>

        {/* Filters */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Tag className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email Templates Tab */}
        <TabsContent value="email" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredEmail.length === 0 ? (
            <Card>
              <CardContent className="py-20 text-center">
                <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium">No email templates</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first email template to use in campaigns and workflows</p>
                <Button className="mt-4" onClick={openNewEmail}>
                  <Plus className="mr-2 h-4 w-4" /> Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEmail.map((t) => (
                <Card key={t.id} className="group relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate flex items-center gap-2">
                          {t.isDefault && <Star className="h-4 w-4 text-yellow-500 shrink-0" />}
                          {t.name}
                        </CardTitle>
                        <CardDescription className="truncate mt-1">{t.subject}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditEmail(t)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateEmail(t)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteEmail(t.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{t.body}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {t.category && (
                        <Badge variant="outline" className="text-xs capitalize">{t.category.replace(/_/g, ' ')}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SMS Templates Tab */}
        <TabsContent value="sms" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredSms.length === 0 ? (
            <Card>
              <CardContent className="py-20 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-lg font-medium">No SMS templates</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first SMS template</p>
                <Button className="mt-4" onClick={openNewSms}>
                  <Plus className="mr-2 h-4 w-4" /> Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSms.map((t) => (
                <Card key={t.id} className="group relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate flex items-center gap-2">
                          {t.isDefault && <Star className="h-4 w-4 text-yellow-500 shrink-0" />}
                          {t.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {t.message.length} chars
                          {t.message.length > 160 && (
                            <span className="text-yellow-500 ml-1">(multi-segment)</span>
                          )}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSms(t)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteSms(t.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{t.message}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {t.category && (
                        <Badge variant="outline" className="text-xs capitalize">{t.category.replace(/_/g, ' ')}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Email Template Dialog */}
      <Dialog open={showEmailForm} onOpenChange={setShowEmailForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmailId ? 'Edit Email Template' : 'New Email Template'}</DialogTitle>
            <DialogDescription>
              Use variables like {'{{firstName}}'} to personalize content.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={emailForm.name}
                  onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                  placeholder="e.g. Welcome Email"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={emailForm.category || 'none'} onValueChange={(v) => setEmailForm({ ...emailForm, category: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject *</Label>
              <Input
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Email subject line"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Body *</Label>
                <div className="flex gap-1 flex-wrap">
                  {VARIABLE_HINTS.slice(0, 4).map((v) => (
                    <Button key={v} variant="ghost" size="sm" className="h-6 text-xs px-2"
                      onClick={() => insertVariable(v, 'email-body')}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                placeholder="Write your email content... Use {{variables}} for personalization."
                rows={10}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="email-default"
                checked={emailForm.isDefault}
                onChange={(e) => setEmailForm({ ...emailForm, isDefault: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="email-default" className="text-sm">Set as default template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailForm(false)}>Cancel</Button>
            <Button onClick={saveEmail} disabled={saving || !emailForm.name || !emailForm.subject || !emailForm.body}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : editingEmailId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Template Dialog */}
      <Dialog open={showSmsForm} onOpenChange={setShowSmsForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSmsId ? 'Edit SMS Template' : 'New SMS Template'}</DialogTitle>
            <DialogDescription>
              SMS messages over 160 characters will be split into multiple segments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={smsForm.name}
                  onChange={(e) => setSmsForm({ ...smsForm, name: e.target.value })}
                  placeholder="e.g. Appointment Reminder"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={smsForm.category || 'none'} onValueChange={(v) => setSmsForm({ ...smsForm, category: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Message *</Label>
                <span className={`text-xs ${smsForm.message.length > 160 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                  {smsForm.message.length}/160
                </span>
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                {VARIABLE_HINTS.slice(0, 4).map((v) => (
                  <Button key={v} variant="ghost" size="sm" className="h-6 text-xs px-2"
                    onClick={() => insertVariable(v, 'sms')}
                  >
                    {v}
                  </Button>
                ))}
              </div>
              <Textarea
                value={smsForm.message}
                onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                placeholder="Write your SMS content..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sms-default"
                checked={smsForm.isDefault}
                onChange={(e) => setSmsForm({ ...smsForm, isDefault: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="sms-default" className="text-sm">Set as default template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSmsForm(false)}>Cancel</Button>
            <Button onClick={saveSms} disabled={saving || !smsForm.name || !smsForm.message}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : editingSmsId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

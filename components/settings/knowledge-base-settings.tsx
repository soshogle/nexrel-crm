
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Book, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function KnowledgeBaseSettings() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: '',
    priority: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/knowledge-base');
      const data = await response.json();
      setEntries(data.knowledgeBase || []);
    } catch (error) {
      console.error('Failed to fetch knowledge base:', error);
      toast.error('Failed to load knowledge base');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async () => {
    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        }),
      });

      if (response.ok) {
        toast.success('Knowledge base entry created');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchEntries();
      } else {
        toast.error('Failed to create entry');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Failed to create entry');
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      const response = await fetch(`/api/knowledge-base/${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        }),
      });

      if (response.ok) {
        toast.success('Knowledge base entry updated');
        setEditingEntry(null);
        resetForm();
        fetchEntries();
      } else {
        toast.error('Failed to update entry');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Entry deleted');
        fetchEntries();
      } else {
        toast.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      tags: '',
      priority: 0,
      isActive: true,
    });
  };

  const openEditDialog = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category || 'general',
      tags: entry.tags ? JSON.parse(entry.tags).join(', ') : '',
      priority: entry.priority,
      isActive: entry.isActive,
    });
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['general', 'faq', 'product', 'policy', 'support'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Knowledge Base</h3>
          <p className="text-sm text-gray-400">
            Manage your company knowledge for AI responses
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingEntry(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingEntry ? 'Edit' : 'Add'} Knowledge Base Entry
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Add information that AI will use to respond to customer inquiries
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-white">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Business Hours"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="content" className="text-white">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter the information..."
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-white">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-white">
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority" className="text-white">Priority (0-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                    }
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tags" className="text-white">
                  Tags (comma-separated)
                </Label>
                <Input
                  id="tags"
                  placeholder="hours, location, pricing"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingEntry(null);
                  resetForm();
                }}
                className="border-gray-700 text-white"
              >
                Cancel
              </Button>
              <Button onClick={editingEntry ? handleUpdateEntry : handleCreateEntry}>
                {editingEntry ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            <SelectItem value="all" className="text-white">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-white">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-6 bg-gray-900 border-gray-700">
            <p className="text-center text-gray-400">Loading...</p>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900 border-gray-700">
            <Book className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No knowledge base entries</h4>
            <p className="text-gray-400 mb-4">
              Add entries to help AI respond to customer questions accurately
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Entry
            </Button>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="p-6 bg-gray-900 border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-medium text-white">{entry.title}</h4>
                    {entry.category && (
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        {entry.category}
                      </Badge>
                    )}
                    {!entry.isActive && (
                      <Badge variant="outline" className="border-gray-600 text-gray-400">
                        Inactive
                      </Badge>
                    )}
                    {entry.priority > 0 && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        Priority: {entry.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">{entry.content}</p>
                  {entry.tags && (
                    <div className="flex gap-2 flex-wrap">
                      {JSON.parse(entry.tags).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="bg-gray-800 text-gray-300">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      openEditDialog(entry);
                      setIsCreateDialogOpen(true);
                    }}
                    className="border-gray-700 text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="border-gray-700 text-white hover:border-red-500 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

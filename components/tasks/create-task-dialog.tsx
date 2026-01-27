
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Calendar as CalendarIcon, User } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: any;
}

export default function CreateTaskDialog({
  open,
  onClose,
  onSuccess,
  task,
}: CreateTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiCategorization, setAiCategorization] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    category: '',
    assignedToId: '',
    leadId: '',
    dealId: '',
    dueDate: '',
    startDate: '',
    estimatedHours: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (open) {
      fetchLeads();
      fetchDeals();
      fetchUsers();
      
      if (task) {
        // Editing existing task
        setFormData({
          title: task.title || '',
          description: task.description || '',
          priority: task.priority || 'MEDIUM',
          status: task.status || 'TODO',
          category: task.category || '',
          assignedToId: task.assignedToId || '',
          leadId: task.leadId || '',
          dealId: task.dealId || '',
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
          startDate: task.startDate ? new Date(task.startDate).toISOString().slice(0, 16) : '',
          estimatedHours: task.estimatedHours?.toString() || '',
          tags: task.tags || [],
        });
      } else {
        // Reset for new task
        setFormData({
          title: '',
          description: '',
          priority: 'MEDIUM',
          status: 'TODO',
          category: '',
          assignedToId: '',
          leadId: '',
          dealId: '',
          dueDate: '',
          startDate: '',
          estimatedHours: '',
          tags: [],
        });
        setAiSuggestions([]);
      }
    }
  }, [open, task]);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads?limit=50');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await fetch('/api/deals?limit=50');
      if (response.ok) {
        const data = await response.json();
        setDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/team/members');
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const generateAiSuggestions = () => {
    // Simulate AI suggestions based on context
    const suggestions: string[] = [];

    if (formData.leadId) {
      suggestions.push('Follow up on initial contact');
      suggestions.push('Send proposal document');
      suggestions.push('Schedule demo call');
    }

    if (formData.dealId) {
      suggestions.push('Prepare contract documents');
      suggestions.push('Review pricing terms');
      suggestions.push('Send closing materials');
    }

    if (formData.category === 'SALES') {
      suggestions.push('Update CRM records');
      suggestions.push('Send follow-up email');
      suggestions.push('Schedule next touchpoint');
    }

    if (formData.category === 'SUPPORT') {
      suggestions.push('Resolve customer issue');
      suggestions.push('Update ticket status');
      suggestions.push('Follow up with customer');
    }

    setAiSuggestions(suggestions.slice(0, 3));
  };

  useEffect(() => {
    if (formData.leadId || formData.dealId || formData.category) {
      generateAiSuggestions();
    }
  }, [formData.leadId, formData.dealId, formData.category]);

  // Auto-categorize when title/description changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.title.length > 5 && !task) {
        analyzeTask();
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [formData.title, formData.description]);

  const analyzeTask = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/tasks/ai-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiCategorization(data);
      }
    } catch (error) {
      console.error('Error analyzing task:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAiCategorization = () => {
    if (aiCategorization) {
      setFormData({
        ...formData,
        category: aiCategorization.category || formData.category,
        tags: [...new Set([...(formData.tags || []), ...(aiCategorization.tags || [])])],
      });
      toast.success('AI suggestions applied');
      setAiCategorization(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        assignedToId: formData.assignedToId || null,
        leadId: formData.leadId || null,
        dealId: formData.dealId || null,
        category: formData.category || null,
      };

      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save task');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error(error.message || 'Failed to save task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {task ? 'Update task details' : 'Add a new task to your workflow'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && !task && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-400">
                  AI Suggestions
                </span>
              </div>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData({ ...formData, title: suggestion })}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-gray-300">
              Task Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              required
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-gray-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task..."
              rows={3}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* AI Auto-Categorization Suggestion */}
          {aiCategorization && aiCategorization.confidence > 0 && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">
                      AI Auto-Categorization
                    </span>
                    <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
                      {aiCategorization.confidence}% confident
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    {aiCategorization.category && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Category:</span>{' '}
                        <span className="font-medium text-purple-300">{aiCategorization.category}</span>
                      </p>
                    )}
                    {aiCategorization.tags && aiCategorization.tags.length > 0 && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Tags:</span>{' '}
                        <span className="text-purple-300">
                          {aiCategorization.tags.join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={applyAiCategorization}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              <span>Analyzing task with AI...</span>
            </div>
          )}

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority" className="text-gray-300">
                Priority
              </Label>
              <Select
                value={formData.priority || "MEDIUM"}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status" className="text-gray-300">
                Status
              </Label>
              <Select
                value={formData.status || "TODO"}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category & Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="text-gray-300">
                Category
              </Label>
              <Select
                value={formData.category || "none"}
                onValueChange={(value) => setFormData({ ...formData, category: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  <SelectItem value="SALES">Sales</SelectItem>
                  <SelectItem value="SUPPORT">Support</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="DEVELOPMENT">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assignedTo" className="text-gray-300">
                Assign To
              </Label>
              <Select
                value={formData.assignedToId || "none"}
                onValueChange={(value) => setFormData({ ...formData, assignedToId: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lead & Deal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lead" className="text-gray-300">
                Related Lead
              </Label>
              <Select
                value={formData.leadId || "none"}
                onValueChange={(value) => setFormData({ ...formData, leadId: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Lead</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deal" className="text-gray-300">
                Related Deal
              </Label>
              <Select
                value={formData.dealId || "none"}
                onValueChange={(value) => setFormData({ ...formData, dealId: value === "none" ? "" : value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select deal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Deal</SelectItem>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-gray-300">
                Start Date & Time
              </Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="dueDate" className="text-gray-300">
                Due Date & Time
              </Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Estimated Hours */}
          <div>
            <Label htmlFor="estimatedHours" className="text-gray-300">
              Estimated Hours
            </Label>
            <Input
              id="estimatedHours"
              type="number"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              placeholder="0"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-700 text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : task ? (
                'Update Task'
              ) : (
                'Create Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  Target, 
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  estimatedDuration: string;
  difficulty: string;
  variables: string[];
  actions: any[];
}

export function WorkflowTemplatesBrowser() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([]);
  const [categories, setCategories] = useState<Array<{value: string; label: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  
  // Schedule form state
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [timezone, setTimezone] = useState('America/New_York');
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  
  // Customization state
  const [customizationData, setCustomizationData] = useState({
    companyName: '',
    industry: '',
    targetAudience: '',
    productService: '',
    businessGoals: ''
  });
  const [customizing, setCustomizing] = useState(false);
  const [customizedVariables, setCustomizedVariables] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workflows/templates');
      const data = await response.json();
      
      if (response.ok) {
        setTemplates(data.templates || []);
        setCategories([
          { value: 'all', label: 'All Templates' },
          ...(data.categories || [])
        ]);
      } else {
        toast.error('Failed to load templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Error loading workflow templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setWorkflowName(template.name);
    setWorkflowDescription(template.description);
    setShowCustomizeDialog(true);
  };

  const handleCustomizeTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setCustomizing(true);
      const response = await fetch('/api/workflows/customize-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          customization: customizationData
        })
      });

      const data = await response.json();

      if (response.ok) {
        setCustomizedVariables(data.customizedTemplate.customizedVariables || {});
        toast.success('Template customized with AI!');
        setShowCustomizeDialog(false);
        setShowScheduleDialog(true);
      } else {
        toast.error(data.error || 'Failed to customize template');
      }
    } catch (error) {
      console.error('Error customizing template:', error);
      toast.error('Error customizing template');
    } finally {
      setCustomizing(false);
    }
  };

  const handleScheduleWorkflow = async () => {
    if (!selectedTemplate || !scheduledDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      const dateStr = scheduledDate.toISOString().split('T')[0];
      
      const response = await fetch('/api/workflows/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          scheduledDate: dateStr,
          scheduledTime,
          timezone,
          customVariables: customizedVariables,
          name: workflowName,
          description: workflowDescription
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Workflow scheduled for ${dateStr} at ${scheduledTime}`);
        setShowScheduleDialog(false);
        setSelectedTemplate(null);
        setScheduledDate(undefined);
        setCustomizedVariables({});
      } else {
        toast.error(data.error || 'Failed to schedule workflow');
      }
    } catch (error) {
      console.error('Error scheduling workflow:', error);
      toast.error('Error scheduling workflow');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'intermediate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'advanced': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sales': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'marketing': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'support': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'seasonal': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'nurture': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workflow templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Workflow Templates</h2>
          <p className="text-muted-foreground">
            Choose from pre-designed workflows that can be customized with AI for your business
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No templates found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-3xl">{template.icon}</span>
                  <Badge variant="outline" className={getDifficultyColor(template.difficulty)}>
                    {template.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{template.estimatedDuration}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>{(template.actions || []).length} actions</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                  {(template.tags || []).slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {(template.tags || []).length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{(template.tags || []).length - 2}
                    </Badge>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleSelectTemplate(template)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Customize & Schedule
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Customization Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedTemplate?.icon}</span>
              Customize {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Tell us about your business so AI can customize this workflow for you
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Your company name"
                value={customizationData.companyName}
                onChange={(e) => setCustomizationData({ ...customizationData, companyName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., E-commerce, SaaS, Real Estate"
                value={customizationData.industry}
                onChange={(e) => setCustomizationData({ ...customizationData, industry: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Input
                id="targetAudience"
                placeholder="Who are your customers?"
                value={customizationData.targetAudience}
                onChange={(e) => setCustomizationData({ ...customizationData, targetAudience: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productService">Product/Service</Label>
              <Input
                id="productService"
                placeholder="What do you offer?"
                value={customizationData.productService}
                onChange={(e) => setCustomizationData({ ...customizationData, productService: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessGoals">Campaign Goals</Label>
              <Textarea
                id="businessGoals"
                placeholder="What do you want to achieve with this workflow?"
                value={customizationData.businessGoals}
                onChange={(e) => setCustomizationData({ ...customizationData, businessGoals: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCustomizeTemplate}
              disabled={customizing || !customizationData.companyName}
            >
              {customizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Customizing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Customize with AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Schedule Workflow
            </DialogTitle>
            <DialogDescription>
              Choose when to run this workflow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflowName">Workflow Name</Label>
              <Input
                id="workflowName"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflowDescription">Description (Optional)</Label>
              <Textarea
                id="workflowDescription"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={scheduledDate}
                onSelect={setScheduledDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Time</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {Object.keys(customizedVariables).length > 0 && (
              <div className="space-y-2">
                <Label>AI-Customized Variables</Label>
                <div className="bg-muted p-3 rounded-lg space-y-1 text-sm max-h-40 overflow-y-auto">
                  {Object.entries(customizedVariables).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                  {Object.keys(customizedVariables).length > 5 && (
                    <p className="text-muted-foreground italic">
                      +{Object.keys(customizedVariables).length - 5} more variables
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleWorkflow} disabled={!scheduledDate}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

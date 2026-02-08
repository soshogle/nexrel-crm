/**
 * Dental Workflow Templates Browser
 * Shows role-specific workflow templates for dental practices
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';
import { Workflow, Play, Stethoscope, ClipboardList, X } from 'lucide-react';
import { toast } from 'sonner';
import { WorkflowBuilder } from '@/components/workflows/workflow-builder';
import { Industry } from '@prisma/client';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: Array<{ type: string; delayMinutes: number }>;
  category: 'clinical' | 'admin' | 'all';
}

export function DentalWorkflowTemplatesBrowser() {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'clinical' | 'admin'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string | undefined>(undefined);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/dental/workflows/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching workflow templates:', error);
      toast.error('Failed to load workflow templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: WorkflowTemplate) => {
    try {
      // Convert dental template to workflow format
      const tasks = template.actions.map((action, index) => ({
        name: action.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Action: ${action.type}`,
        taskType: action.type,
        delayValue: action.delayMinutes || 0,
        delayUnit: 'MINUTES' as const,
        isHITL: false,
        isOptional: false,
        displayOrder: index + 1,
        position: { row: Math.floor(index / 3), col: index % 3 },
        actionConfig: { actions: [] },
      }));

      // Create workflow from template via API
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          type: 'CUSTOM',
          industry: 'DENTAL',
          tasks,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const workflowId = data.workflow?.id;
        
        if (workflowId) {
          setSelectedTemplate(template);
          setCreatedWorkflowId(workflowId);
          
          // Small delay to ensure workflow is available in database
          await new Promise(resolve => setTimeout(resolve, 500));
          
          setShowWorkflowBuilder(true);
          toast.success(`Workflow created from template: ${template.name}`);
        } else {
          throw new Error('Workflow ID not returned');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workflow');
      }
    } catch (error: any) {
      console.error('Error creating workflow from template:', error);
      toast.error(`Failed to create workflow: ${error.message}`);
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory || t.category === 'all');

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Templates
        </Button>
        <Button
          variant={selectedCategory === 'clinical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('clinical')}
        >
          <Stethoscope className="w-4 h-4 mr-1" />
          Clinical
        </Button>
        <Button
          variant={selectedCategory === 'admin' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('admin')}
        >
          <ClipboardList className="w-4 h-4 mr-1" />
          Administrative
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {template.category === 'clinical' ? (
                    <Stethoscope className="w-3 h-3 mr-1" />
                  ) : template.category === 'admin' ? (
                    <ClipboardList className="w-3 h-3 mr-1" />
                  ) : (
                    <Workflow className="w-3 h-3 mr-1" />
                  )}
                  {template.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="text-xs text-gray-600">
                  <strong>Trigger:</strong> {template.trigger}
                </div>
                <div className="text-xs text-gray-600">
                  <strong>Actions:</strong> {template.actions.length} step(s)
                </div>
              </div>
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => handleUseTemplate(template)}
              >
                <Play className="w-3 h-3 mr-1" />
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No templates available for this category
        </div>
      )}

      {/* Workflow Builder Dialog */}
      <Dialog open={showWorkflowBuilder} onOpenChange={(open) => {
        setShowWorkflowBuilder(open);
        if (!open) {
          // Reset when dialog closes
          setCreatedWorkflowId(undefined);
          setSelectedTemplate(null);
          // Refresh templates when dialog closes
          fetchTemplates();
        }
      }}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {selectedTemplate ? `Workflow Builder: ${selectedTemplate.name}` : 'Workflow Builder'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedTemplate?.description || 'Build and customize your workflow'}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWorkflowBuilder(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-6">
            <WorkflowBuilder
              industry="DENTAL"
              initialWorkflowId={createdWorkflowId}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

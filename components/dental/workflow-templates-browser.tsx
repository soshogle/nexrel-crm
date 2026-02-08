/**
 * Dental Workflow Templates Browser
 * Shows role-specific workflow templates for dental practices
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { Workflow, Play, Stethoscope, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

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
    toast.info(`Creating workflow from template: ${template.name}`);
    // Navigate to workflow builder with template pre-filled
    // This would integrate with the existing workflow builder
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
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, FileText, Users, Shield, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface WorkflowTemplate {
  id: string;
  name: string;
  type: 'BUYER' | 'SELLER' | 'CUSTOM';
  description: string;
  taskCount: number;
  hitlGates: number;
  agentsAssigned: number;
  estimatedCycle: string;
  steps: string[];
}

const DEFAULT_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'buyer-template',
    name: 'Buyer Pipeline',
    type: 'BUYER',
    description: 'Complete buyer journey from lead qualification to closing and post-close follow-up',
    taskCount: 12,
    hitlGates: 4,
    agentsAssigned: 8,
    estimatedCycle: '30-45 days',
    steps: [
      'Lead Qualification',
      'MLS Search Setup',
      'Property Shortlist',
      'Schedule Showings',
      'Collect Feedback',
      'Adjust Criteria',
      'Collect Offer Inputs',
      'Prepare Offer Brief (HITL)',
      'Track Conditions',
      'Closing Coordination',
      'Post-Close Follow-up',
    ],
  },
  {
    id: 'seller-template',
    name: 'Seller Pipeline',
    type: 'SELLER',
    description: 'Complete seller journey from lead to listing, negotiation, and post-close follow-up',
    taskCount: 10,
    hitlGates: 3,
    agentsAssigned: 7,
    estimatedCycle: '60-90 days',
    steps: [
      'Seller Qualification',
      'Book Evaluation',
      'Prepare CMA',
      'Schedule Photography',
      'Photo Day Checklist',
      'Draft Marketing',
      'Publish Listing (HITL)',
      'Collect Feedback',
      'Handle Offers (HITL)',
      'Post-Close Follow-up',
    ],
  },
];

interface WorkflowTemplatesGalleryProps {
  onSelectTemplate: (type: 'BUYER' | 'SELLER') => void;
  onCreateCustom: () => void;
}

export function WorkflowTemplatesGallery({
  onSelectTemplate,
  onCreateCustom,
}: WorkflowTemplatesGalleryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Workflow Templates
          </h3>
          <p className="text-gray-600 mt-1">
            Start with a pre-built template or create your own custom workflow
          </p>
        </div>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DEFAULT_TEMPLATES.map((template) => (
          <motion.div
            key={template.id}
            onHoverStart={() => setHoveredId(template.id)}
            onHoverEnd={() => setHoveredId(null)}
            whileHover={{ y: -4 }}
          >
            <Card className="bg-white border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer shadow-md hover:shadow-lg h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 ${
                      template.type === 'BUYER' 
                        ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300' 
                        : 'bg-gradient-to-br from-green-100 to-green-200 border-green-300'
                    }`}>
                      {template.type === 'BUYER' ? (
                        <Home className="w-7 h-7 text-purple-600" />
                      ) : (
                        <FileText className="w-7 h-7 text-green-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-gray-900 text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-gray-600">{template.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className={`${
                    template.type === 'BUYER' 
                      ? 'bg-purple-100 text-purple-700 border-purple-300' 
                      : 'bg-green-100 text-green-700 border-green-300'
                  }`}>
                    {template.taskCount} Tasks
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-lg font-bold text-purple-600">{template.hitlGates}</div>
                      <div className="text-xs text-gray-600">HITL Gates</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-lg font-bold text-purple-600">{template.agentsAssigned}</div>
                      <div className="text-xs text-gray-600">AI Agents</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-lg font-bold text-purple-600">{template.estimatedCycle}</div>
                      <div className="text-xs text-gray-600">Cycle</div>
                    </div>
                  </div>

                  {/* Steps Preview */}
                  <div className="pt-3 border-t border-purple-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Workflow Steps:</p>
                    <div className="space-y-1">
                      {template.steps.slice(0, 6).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          <span>{step}</span>
                        </div>
                      ))}
                      {template.steps.length > 6 && (
                        <div className="text-xs text-gray-500 italic">
                          +{template.steps.length - 6} more steps
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => onSelectTemplate(template.type)}
                    className={`w-full mt-4 ${
                      template.type === 'BUYER'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600'
                        : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600'
                    } text-white shadow-md`}
                  >
                    Use {template.name} Template
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Custom Workflow Option */}
      <Card className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-300 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Create Custom Workflow</h4>
                <p className="text-sm text-gray-600">Build your own workflow from scratch with full control</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onCreateCustom}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              Create Custom
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

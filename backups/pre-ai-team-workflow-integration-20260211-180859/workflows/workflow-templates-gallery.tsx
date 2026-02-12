/**
 * Generic Workflow Templates Gallery
 * Shows industry-specific templates
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { getIndustryConfig } from '@/lib/workflows/industry-configs';
import { Industry } from '@prisma/client';

interface WorkflowTemplatesGalleryProps {
  industry: Industry;
  onSelectTemplate: (templateId: string) => void;
  onCreateCustom: () => void;
}

export function WorkflowTemplatesGallery({
  industry,
  onSelectTemplate,
  onCreateCustom,
}: WorkflowTemplatesGalleryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const industryConfig = getIndustryConfig(industry);
  
  if (!industryConfig) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        <p>No templates available for this industry</p>
      </div>
    );
  }
  
  const templates = industryConfig.templates || [];
  
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
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => {
            const taskCount = template.tasks.length;
            const hitlGates = template.tasks.filter(t => t.isHITL).length;
            const agentsAssigned = new Set(
              template.tasks
                .map(t => t.agentName)
                .filter(Boolean)
            ).size;
            
            return (
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
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-300 flex items-center justify-center">
                          <Sparkles className="w-7 h-7 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-gray-900 text-lg">{template.name}</CardTitle>
                          <CardDescription className="text-gray-600">{template.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                        {taskCount} Tasks
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-lg font-bold text-purple-600">{hitlGates}</div>
                          <div className="text-xs text-gray-600">HITL Gates</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-lg font-bold text-purple-600">{agentsAssigned}</div>
                          <div className="text-xs text-gray-600">AI Agents</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-lg font-bold text-purple-600">
                            {template.tasks.reduce((acc, t) => {
                              const delayHours = t.delayUnit === 'DAYS' 
                                ? t.delayValue * 24 
                                : t.delayUnit === 'HOURS' 
                                ? t.delayValue 
                                : t.delayValue / 60;
                              return acc + delayHours;
                            }, 0).toFixed(0)}h
                          </div>
                          <div className="text-xs text-gray-600">Total Delay</div>
                        </div>
                      </div>

                      {/* Steps Preview */}
                      <div className="pt-3 border-t border-purple-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Workflow Steps:</p>
                        <div className="space-y-1">
                          {template.tasks.slice(0, 6).map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              <span>{step.name}</span>
                              {step.isHITL && (
                                <Badge variant="outline" className="ml-auto text-[10px] px-1 py-0 border-amber-300 text-amber-700">
                                  HITL
                                </Badge>
                              )}
                            </div>
                          ))}
                          {template.tasks.length > 6 && (
                            <div className="text-xs text-gray-500 italic">
                              +{template.tasks.length - 6} more steps
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => onSelectTemplate(template.id)}
                        className="w-full mt-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-md"
                      >
                        Use {template.name} Template
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="bg-white border-2 border-purple-200">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">No templates available for this industry yet.</p>
            <p className="text-sm text-gray-500 mt-2">Create a custom workflow to get started.</p>
          </CardContent>
        </Card>
      )}

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

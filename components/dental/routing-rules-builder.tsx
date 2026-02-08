/**
 * Routing Rules Builder Component
 * Phase 2: Visual rule builder for VNA routing
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowRight, MapPin, Image, User } from 'lucide-react';

interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    location?: string;
    imageType?: string[];
    patientId?: string;
    leadId?: string;
  };
  action: {
    vnaId: string;
    compress?: boolean;
  };
}

interface RoutingRulesBuilderProps {
  vnas: Array<{ id: string; name: string }>;
  rules: RoutingRule[];
  onRulesChange: (rules: RoutingRule[]) => void;
}

export function RoutingRulesBuilder({ vnas, rules, onRulesChange }: RoutingRulesBuilderProps) {
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    priority: 0,
    conditions: {
      location: '',
      imageType: [] as string[],
      patientId: '',
      leadId: '',
    },
    action: {
      vnaId: '',
      compress: false,
    },
  });

  const xrayTypes = ['PANORAMIC', 'BITEWING', 'PERIAPICAL', 'CEPHALOMETRIC', 'CBCT'];

  const handleSaveRule = () => {
    if (!formData.name || !formData.action.vnaId) {
      toast.error('Rule name and target VNA are required');
      return;
    }

    const newRule: RoutingRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      name: formData.name,
      priority: formData.priority,
      conditions: {
        ...(formData.conditions.location && { location: formData.conditions.location }),
        ...(formData.conditions.imageType.length > 0 && { imageType: formData.conditions.imageType }),
        ...(formData.conditions.patientId && { patientId: formData.conditions.patientId }),
        ...(formData.conditions.leadId && { leadId: formData.conditions.leadId }),
      },
      action: {
        vnaId: formData.action.vnaId,
        compress: formData.action.compress,
      },
    };

    if (editingRule) {
      const updated = rules.map(r => r.id === editingRule.id ? newRule : r);
      onRulesChange(updated);
      toast.success('Rule updated');
    } else {
      onRulesChange([...rules, newRule]);
      toast.success('Rule created');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeleteRule = (id: string) => {
    if (!confirm('Delete this routing rule?')) return;
    onRulesChange(rules.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      priority: 0,
      conditions: {
        location: '',
        imageType: [],
        patientId: '',
        leadId: '',
      },
      action: {
        vnaId: '',
        compress: false,
      },
    });
    setEditingRule(null);
  };

  const openEditDialog = (rule: RoutingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      priority: rule.priority,
      conditions: {
        location: rule.conditions.location || '',
        imageType: rule.conditions.imageType || [],
        patientId: rule.conditions.patientId || '',
        leadId: rule.conditions.leadId || '',
      },
      action: {
        vnaId: rule.action.vnaId,
        compress: rule.action.compress || false,
      },
    });
    setIsDialogOpen(true);
  };

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Routing Rules</h3>
          <p className="text-sm text-gray-600">Define rules for routing images to different VNAs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Routing Rule' : 'Create Routing Rule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Route CBCT to Cloud VNA"
                />
              </div>

              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Lower number = higher priority (evaluated first)</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">Conditions (IF)</Label>
                <div className="space-y-3">
                  <div>
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </Label>
                    <Input
                      value={formData.conditions.location}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, location: e.target.value },
                      })}
                      placeholder="e.g., Main Clinic"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Image Type
                    </Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (value && !formData.conditions.imageType.includes(value)) {
                          setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              imageType: [...formData.conditions.imageType, value],
                            },
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select image types..." />
                      </SelectTrigger>
                      <SelectContent>
                        {xrayTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.conditions.imageType.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.conditions.imageType.map((type) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                conditions: {
                                  ...formData.conditions,
                                  imageType: formData.conditions.imageType.filter(t => t !== type),
                                },
                              });
                            }}
                          >
                            {type} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Patient ID (optional)
                    </Label>
                    <Input
                      value={formData.conditions.patientId}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: { ...formData.conditions, patientId: e.target.value },
                      })}
                      placeholder="Specific patient ID"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Action (THEN)
                </Label>
                <div className="space-y-3">
                  <div>
                    <Label>Route to VNA *</Label>
                    <Select
                      value={formData.action.vnaId}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        action: { ...formData.action, vnaId: value },
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select VNA..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vnas.map((vna) => (
                          <SelectItem key={vna.id} value={vna.id}>{vna.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="compress"
                      checked={formData.action.compress}
                      onChange={(e) => setFormData({
                        ...formData,
                        action: { ...formData.action, compress: e.target.checked },
                      })}
                      className="rounded"
                    />
                    <Label htmlFor="compress" className="cursor-pointer">
                      Compress before routing
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRule}>
                  {editingRule ? 'Update' : 'Create'} Rule
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {sortedRules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-400">
              No routing rules. Create a rule to route images to specific VNAs.
            </CardContent>
          </Card>
        ) : (
          sortedRules.map((rule) => {
            const vna = vnas.find(v => v.id === rule.action.vnaId);
            return (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm">{rule.name}</CardTitle>
                        <Badge variant="outline">Priority: {rule.priority}</Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">IF:</span>
                          {rule.conditions.location && (
                            <Badge variant="outline">Location: {rule.conditions.location}</Badge>
                          )}
                          {rule.conditions.imageType && rule.conditions.imageType.length > 0 && (
                            <Badge variant="outline">Type: {rule.conditions.imageType.join(', ')}</Badge>
                          )}
                          {rule.conditions.patientId && (
                            <Badge variant="outline">Patient: {rule.conditions.patientId}</Badge>
                          )}
                          {Object.keys(rule.conditions).length === 0 && (
                            <span className="text-gray-400">No conditions (always matches)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">THEN:</span>
                          <Badge>{vna?.name || 'Unknown VNA'}</Badge>
                          {rule.action.compress && (
                            <Badge variant="secondary">Compress</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(rule)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

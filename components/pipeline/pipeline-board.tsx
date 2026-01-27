
'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, Target, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PipelineStage } from './pipeline-stage';
import { CreateDealDialog } from './create-deal-dialog';
import { DealDetailModal } from './deal-detail-modal';
import { toast } from 'sonner';

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

interface Stage {
  id: string;
  name: string;
  displayOrder: number;
  probability: number;
  deals: Deal[];
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  probability: number;
  priority: string;
  expectedCloseDate: string | null;
  lead?: {
    id: string;
    businessName: string;
    contactPerson?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export function PipelineBoard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    try {
      const response = await fetch('/api/pipelines');
      if (response.ok) {
        const data = await response.json();
        setPipelines(data);
        if (data.length > 0 && !selectedPipeline) {
          const defaultPipeline = data.find((p: Pipeline) => p.name === 'Default') || data[0];
          setSelectedPipeline(defaultPipeline.id);
        }
      }
    } catch (error) {
      console.error('Failed to load pipelines:', error);
      toast.error('Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  const handleDealMoved = async (dealId: string, newStageId: string) => {
    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: newStageId }),
      });

      if (response.ok) {
        toast.success('Deal moved successfully');
        loadPipelines();
      } else {
        toast.error('Failed to move deal');
      }
    } catch (error) {
      console.error('Failed to move deal:', error);
      toast.error('Failed to move deal');
    }
  };

  const currentPipeline = pipelines.find((p) => p.id === selectedPipeline);
  const sortedStages = currentPipeline?.stages?.sort((a, b) => a.displayOrder - b.displayOrder) || [];

  // Calculate pipeline metrics
  const totalValue = sortedStages.reduce((sum, stage) => 
    sum + stage.deals.reduce((stageSum, deal) => stageSum + deal.value, 0), 0
  );
  const totalDeals = sortedStages.reduce((sum, stage) => sum + stage.deals.length, 0);
  const weightedValue = sortedStages.reduce((sum, stage) => 
    sum + stage.deals.reduce((stageSum, deal) => stageSum + (deal.value * deal.probability / 100), 0), 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">Visualize and manage your deals</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pipeline Value</p>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <Target className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weighted Value</p>
              <p className="text-2xl font-bold">${weightedValue.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Deals</p>
              <p className="text-2xl font-bold">{totalDeals}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline Board */}
      {currentPipeline ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {sortedStages.map((stage) => (
              <PipelineStage
                key={stage.id}
                stage={stage}
                onDealClick={setSelectedDeal}
                onDealMoved={handleDealMoved}
                filterPriority={filterPriority}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pipeline Selected</h3>
            <p className="text-muted-foreground mb-4">
              Select a pipeline to view and manage your deals
            </p>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <CreateDealDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => {
          setCreateDialogOpen(false);
          loadPipelines();
        }}
        pipelineId={selectedPipeline}
      />

      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          open={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={loadPipelines}
        />
      )}
    </div>
  );
}

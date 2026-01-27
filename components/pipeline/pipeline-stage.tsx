
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DealCard } from './deal-card';
import { DollarSign } from 'lucide-react';

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

interface Stage {
  id: string;
  name: string;
  displayOrder: number;
  probability: number;
  deals: Deal[];
}

interface PipelineStageProps {
  stage: Stage;
  onDealClick: (deal: Deal) => void;
  onDealMoved: (dealId: string, newStageId: string) => void;
  filterPriority: string;
}

export function PipelineStage({
  stage,
  onDealClick,
  onDealMoved,
  filterPriority,
}: PipelineStageProps) {
  const [dragOver, setDragOver] = useState(false);

  const filteredDeals = filterPriority === 'all'
    ? stage.deals
    : stage.deals.filter(deal => deal.priority === filterPriority);

  const stageValue = filteredDeals.reduce((sum, deal) => sum + deal.value, 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dealId = e.dataTransfer.getData('dealId');
    if (dealId) {
      onDealMoved(dealId, stage.id);
    }
  };

  return (
    <div className="flex-shrink-0 w-[320px]">
      <Card
        className={`p-4 h-full transition-colors ${
          dragOver ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Stage Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              {stage.name}
              <Badge variant="secondary" className="font-normal">
                {filteredDeals.length}
              </Badge>
            </h3>
            <Badge variant="outline" className="text-xs">
              {stage.probability}%
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>${stageValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Deals List */}
        <div className="space-y-3 min-h-[200px]">
          {filteredDeals.length > 0 ? (
            filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => onDealClick(deal)}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No deals in this stage
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

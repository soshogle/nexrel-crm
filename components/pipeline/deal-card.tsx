
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, DollarSign, Tag } from 'lucide-react';
import { format } from 'date-fns';

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
}

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('dealId', deal.id);
  };

  const priorityColors = {
    URGENT: 'bg-red-500/10 text-red-500 border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    MEDIUM: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    LOW: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="p-4 cursor-pointer hover:shadow-md transition-shadow bg-card"
    >
      {/* Deal Title */}
      <h4 className="font-medium mb-2 line-clamp-1">{deal.title}</h4>

      {/* Value */}
      <div className="flex items-center gap-1 text-lg font-bold text-primary mb-3">
        <DollarSign className="h-4 w-4" />
        {deal.value.toLocaleString()} {deal.currency}
      </div>

      {/* Lead Info */}
      {deal.lead && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
          {deal.lead.businessName}
        </p>
      )}

      {/* Priority Badge */}
      <div className="mb-3">
        <Badge
          className={priorityColors[deal.priority as keyof typeof priorityColors] || priorityColors.MEDIUM}
        >
          {deal.priority}
        </Badge>
      </div>

      {/* Expected Close Date */}
      {deal.expectedCloseDate && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(deal.expectedCloseDate), 'MMM dd, yyyy')}</span>
        </div>
      )}

      {/* Tags */}
      {deal.tags && deal.tags.length > 0 && (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          <Tag className="h-3 w-3 text-muted-foreground" />
          {deal.tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {deal.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{deal.tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Assigned To */}
      {deal.assignedTo && (
        <div className="flex items-center gap-2 pt-3 border-t">
          <Avatar className="h-6 w-6">
            <AvatarImage src={deal.assignedTo.avatar} />
            <AvatarFallback className="text-xs">
              {deal.assignedTo.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground line-clamp-1">
            {deal.assignedTo.name}
          </span>
        </div>
      )}
    </Card>
  );
}

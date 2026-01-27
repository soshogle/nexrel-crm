'use client';

import { useState, useEffect } from 'react';
import {
  Network,
  ArrowRight,
  ArrowLeft,
  Link as LinkIcon,
  Loader2,
  ExternalLink,
  Brain,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface RelationshipGraphViewProps {
  entityType: string;
  entityId: string;
}

interface Relationship {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationshipType: string;
  strength: number;
  interactionCount: number;
  lastInteractionAt: string;
}

interface EntityDetails {
  [key: string]: any;
}

export function RelationshipGraphView({
  entityType,
  entityId,
}: RelationshipGraphViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [outgoing, setOutgoing] = useState<Relationship[]>([]);
  const [incoming, setIncoming] = useState<Relationship[]>([]);
  const [entityCache, setEntityCache] = useState<Map<string, EntityDetails>>(
    new Map()
  );

  useEffect(() => {
    loadRelationships();
  }, [entityType, entityId]);

  const loadRelationships = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/relationships?entityType=${entityType}&entityId=${entityId}`
      );
      if (!response.ok) throw new Error('Failed to load relationships');

      const data = await response.json();
      setOutgoing(data.outgoing || []);
      setIncoming(data.incoming || []);

      // Load entity details for all related entities
      await loadEntityDetails(data.outgoing || [], data.incoming || []);
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntityDetails = async (
    outgoingRels: Relationship[],
    incomingRels: Relationship[]
  ) => {
    const newCache = new Map<string, EntityDetails>();

    const entitiesToLoad = new Map<string, Set<string>>();

    // Collect all entities that need to be loaded
    [...outgoingRels, ...incomingRels].forEach((rel) => {
      const isOutgoing = rel.sourceType === entityType && rel.sourceId === entityId;
      const relatedType = isOutgoing ? rel.targetType : rel.sourceType;
      const relatedId = isOutgoing ? rel.targetId : rel.sourceId;

      if (!entitiesToLoad.has(relatedType)) {
        entitiesToLoad.set(relatedType, new Set());
      }
      entitiesToLoad.get(relatedType)!.add(relatedId);
    });

    // Load entity details (simplified - in production, you'd batch these)
    for (const [type, ids] of entitiesToLoad.entries()) {
      for (const id of ids) {
        try {
          const details = await fetchEntityDetails(type, id);
          if (details) {
            newCache.set(`${type}-${id}`, details);
          }
        } catch (error) {
          console.error(`Error loading ${type} ${id}:`, error);
        }
      }
    }

    setEntityCache(newCache);
  };

  const fetchEntityDetails = async (
    type: string,
    id: string
  ): Promise<EntityDetails | null> => {
    try {
      let endpoint = '';
      switch (type) {
        case 'LEAD':
          endpoint = `/api/leads/${id}`;
          break;
        case 'DEAL':
          endpoint = `/api/deals/${id}`;
          break;
        case 'TASK':
          endpoint = `/api/tasks/${id}`;
          break;
        case 'CONVERSATION':
          endpoint = `/api/conversations/${id}`;
          break;
        default:
          return null;
      }

      const response = await fetch(endpoint);
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${type} details:`, error);
      return null;
    }
  };

  const getEntityTitle = (type: string, id: string): string => {
    const details = entityCache.get(`${type}-${id}`);
    if (!details) return 'Loading...';

    switch (type) {
      case 'LEAD':
        return details.businessName || 'Unnamed Lead';
      case 'DEAL':
        return details.title || 'Unnamed Deal';
      case 'TASK':
        return details.title || 'Unnamed Task';
      case 'CONVERSATION':
        return `Conversation #${id.slice(0, 8)}`;
      default:
        return `${type} #${id.slice(0, 8)}`;
    }
  };

  const getEntityPath = (type: string, id: string): string => {
    switch (type) {
      case 'LEAD':
        return `/leads/${id}`;
      case 'DEAL':
        return `/deals/${id}`;
      case 'TASK':
        return `/tasks/${id}`;
      case 'CONVERSATION':
        return `/conversations/${id}`;
      default:
        return '#';
    }
  };

  const getStrengthColor = (strength: number): string => {
    if (strength >= 7) return 'text-green-600';
    if (strength >= 4) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const formatRelationType = (type: string): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalRelationships = outgoing.length + incoming.length;

  if (totalRelationships === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Relationships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No relationships found</p>
            <p className="text-sm mt-1">
              Relationships are created automatically when you link entities
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Relationships
            <Badge variant="secondary">
              {totalRelationships} total
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/ai-brain')}
            className="gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500"
          >
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="hidden sm:inline">AI Insights</span>
            <Sparkles className="h-3 w-3 text-yellow-400" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All ({totalRelationships})
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              Outgoing ({outgoing.length})
            </TabsTrigger>
            <TabsTrigger value="incoming">
              Incoming ({incoming.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
            {[...outgoing, ...incoming]
              .sort((a, b) => b.strength - a.strength)
              .map((rel) => (
                <RelationshipCard
                  key={rel.id}
                  relationship={rel}
                  isOutgoing={rel.sourceType === entityType && rel.sourceId === entityId}
                  getEntityTitle={getEntityTitle}
                  getEntityPath={getEntityPath}
                  getStrengthColor={getStrengthColor}
                  formatRelationType={formatRelationType}
                  router={router}
                />
              ))}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3 mt-4">
            {outgoing
              .sort((a, b) => b.strength - a.strength)
              .map((rel) => (
                <RelationshipCard
                  key={rel.id}
                  relationship={rel}
                  isOutgoing={true}
                  getEntityTitle={getEntityTitle}
                  getEntityPath={getEntityPath}
                  getStrengthColor={getStrengthColor}
                  formatRelationType={formatRelationType}
                  router={router}
                />
              ))}
          </TabsContent>

          <TabsContent value="incoming" className="space-y-3 mt-4">
            {incoming
              .sort((a, b) => b.strength - a.strength)
              .map((rel) => (
                <RelationshipCard
                  key={rel.id}
                  relationship={rel}
                  isOutgoing={false}
                  getEntityTitle={getEntityTitle}
                  getEntityPath={getEntityPath}
                  getStrengthColor={getStrengthColor}
                  formatRelationType={formatRelationType}
                  router={router}
                />
              ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RelationshipCard({
  relationship,
  isOutgoing,
  getEntityTitle,
  getEntityPath,
  getStrengthColor,
  formatRelationType,
  router,
}: {
  relationship: Relationship;
  isOutgoing: boolean;
  getEntityTitle: (type: string, id: string) => string;
  getEntityPath: (type: string, id: string) => string;
  getStrengthColor: (strength: number) => string;
  formatRelationType: (type: string) => string;
  router: any;
}) {
  const relatedType = isOutgoing
    ? relationship.targetType
    : relationship.sourceType;
  const relatedId = isOutgoing ? relationship.targetId : relationship.sourceId;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-shrink-0">
        {isOutgoing ? (
          <ArrowRight className="h-5 w-5 text-blue-600" />
        ) : (
          <ArrowLeft className="h-5 w-5 text-purple-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs capitalize">
            {relatedType.toLowerCase()}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelationType(relationship.relationshipType)}
          </span>
        </div>
        <p className="font-medium text-sm truncate">
          {getEntityTitle(relatedType, relatedId)}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span
            className={cn('font-semibold', getStrengthColor(relationship.strength))}
          >
            Strength: {relationship.strength.toFixed(1)}/10
          </span>
          <span>{relationship.interactionCount} interactions</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => router.push(getEntityPath(relatedType, relatedId))}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}

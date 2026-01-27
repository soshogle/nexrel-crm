'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Link as LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

// Simple debounce function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  status?: string;
  metrics?: {
    totalRelations: number;
    avgStrength: number;
    strongestType: string;
  };
}

interface UnifiedSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UnifiedSearch({ isOpen, onClose }: UnifiedSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    leads: SearchResult[];
    deals: SearchResult[];
    tasks: SearchResult[];
  }>({ leads: [], deals: [], tasks: [] });

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults({ leads: [], deals: [], tasks: [] });
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/relationships/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        
        // Transform results
        const transformedResults = {
          leads: data.leads?.map((lead: any) => ({
            id: lead.id,
            type: 'lead',
            title: lead.businessName,
            subtitle: lead.contactPerson || lead.email,
            status: lead.status,
            metrics: lead.metrics,
          })) || [],
          deals: data.deals?.map((deal: any) => ({
            id: deal.id,
            type: 'deal',
            title: deal.title,
            subtitle: `$${deal.value} - ${deal.stage?.name || 'Unknown'}`,
            metrics: deal.metrics,
          })) || [],
          tasks: data.tasks?.map((task: any) => ({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : 'No due date',
            status: task.status,
            metrics: task.metrics,
          })) || [],
        };

        setResults(transformedResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    let path = '';
    switch (result.type) {
      case 'lead':
        path = `/leads/${result.id}`;
        break;
      case 'deal':
        path = `/deals/${result.id}`;
        break;
      case 'task':
        path = `/tasks/${result.id}`;
        break;
    }
    if (path) {
      router.push(path);
      onClose();
    }
  };

  const totalResults =
    results.leads.length + results.deals.length + results.tasks.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Unified Search
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search across leads, deals, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {!loading && totalResults > 0 && (
            <>
              {results.leads.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Leads ({results.leads.length})
                  </h3>
                  <div className="space-y-2">
                    {results.leads.map((lead) => (
                      <ResultCard
                        key={lead.id}
                        result={lead}
                        onClick={() => handleResultClick(lead)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {results.deals.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Deals ({results.deals.length})
                  </h3>
                  <div className="space-y-2">
                    {results.deals.map((deal) => (
                      <ResultCard
                        key={deal.id}
                        result={deal}
                        onClick={() => handleResultClick(deal)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {results.tasks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    Tasks ({results.tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {results.tasks.map((task) => (
                      <ResultCard
                        key={task.id}
                        result={task}
                        onClick={() => handleResultClick(task)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd> to close
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultCard({
  result,
  onClick,
}: {
  result: SearchResult;
  onClick: () => void;
}) {
  return (
    <Card
      className="p-3 cursor-pointer hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="capitalize">
              {result.type}
            </Badge>
            {result.status && (
              <Badge variant="secondary" className="text-xs">
                {result.status}
              </Badge>
            )}
          </div>
          <h4 className="font-semibold text-sm truncate">{result.title}</h4>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground mt-1">
              {result.subtitle}
            </p>
          )}
        </div>

        {result.metrics && result.metrics.totalRelations > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <LinkIcon className="h-3.5 w-3.5" />
            <span>{result.metrics.totalRelations} connections</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// Global search trigger component
export function GlobalSearchTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64"
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search...</span>
        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <UnifiedSearch isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

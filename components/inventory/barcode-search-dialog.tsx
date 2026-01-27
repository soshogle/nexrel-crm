
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Loader2, Barcode, Package } from 'lucide-react';

interface BarcodeSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemSelect?: (item: any) => void;
}

export default function BarcodeSearchDialog({
  open,
  onOpenChange,
  onItemSelect,
}: BarcodeSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a barcode or SKU');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/general-inventory/barcode-search?q=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.items || []);

      if (data.items.length === 0) {
        toast.info('No items found with that barcode or SKU');
      }
    } catch (error) {
      console.error('Barcode search error:', error);
      toast.error('Failed to search inventory');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleItemClick = (item: any) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
    onOpenChange(false);
    toast.success(`Selected: ${item.name}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Barcode / SKU Search
          </DialogTitle>
          <DialogDescription>
            Search your inventory by barcode or SKU for quick access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Scan or enter barcode / SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="font-mono"
              autoFocus
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Found {results.length} {results.length === 1 ? 'item' : 'items'}
                </p>
                {results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Package className="h-5 w-5 text-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">
                              SKU: {item.sku}
                            </Badge>
                            {item.barcode && (
                              <Badge variant="outline" className="font-mono text-xs">
                                <Barcode className="h-3 w-3 mr-1" />
                                {item.barcode}
                              </Badge>
                            )}
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">
                                {item.category.name}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {item.description}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm">
                            <span>
                              Quantity: <strong>{item.quantity}</strong> {item.unit || 'units'}
                            </span>
                            {item.sellingPrice && (
                              <span>
                                Price: <strong>${(item.sellingPrice / 100).toFixed(2)}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {item.quantity <= item.reorderLevel && (
                        <Badge variant="destructive">Low Stock</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : searchQuery && !isSearching ? (
              <div className="text-center py-12 text-muted-foreground">
                <Barcode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items found</p>
                <p className="text-sm">Try a different barcode or SKU</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a barcode or SKU to search</p>
                <p className="text-sm">You can scan with a barcode scanner or type manually</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

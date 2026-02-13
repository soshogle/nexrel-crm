
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Trash2, RefreshCw, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ElevenLabsKey {
  apiKey: string;
  label: string;
  priority: number;
  characterLimit: number;
  characterUsed: number;
  usagePercent: number;
}

export function ElevenLabsKeysManager() {
  const [keys, setKeys] = useState<ElevenLabsKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({
    apiKey: '',
    label: '',
    priority: 1,
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/elevenlabs-keys');
      if (!response.ok) throw new Error('Failed to fetch keys');
      
      const data = await response.json();
      setKeys(data.keys || []);
    } catch (error: any) {
      toast.error('Failed to load API keys');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.apiKey || !newKey.label) {
      toast.error('Please provide both API key and label');
      return;
    }

    try {
      const response = await fetch('/api/elevenlabs-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add API key');
      }

      toast.success('API key added successfully');
      setNewKey({ apiKey: '', label: '', priority: 1 });
      setShowAddForm(false);
      fetchKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add API key');
    }
  };

  const handleRemoveKey = async (keyId: string, label: string) => {
    if (!confirm(`Are you sure you want to remove "${label}"?`)) return;

    try {
      const response = await fetch(`/api/elevenlabs-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove key');

      toast.success('API key removed');
      fetchKeys();
    } catch (error: any) {
      toast.error('Failed to remove API key');
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/elevenlabs-keys/refresh', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to refresh');

      toast.success('API keys refreshed');
      fetchKeys();
    } catch (error: any) {
      toast.error('Failed to refresh API keys');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 0.95) return 'text-red-500';
    if (percent >= 0.80) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUsageBadge = (percent: number) => {
    if (percent >= 0.95) return <Badge variant="destructive">Critical</Badge>;
    if (percent >= 0.80) return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Warning</Badge>;
    return <Badge variant="outline" className="text-green-500 border-green-500">Healthy</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Soshogle AI API Keys
              </CardTitle>
              <CardDescription>
                Manage your Soshogle AI API keys with automatic failover
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Backup Key
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The system automatically switches to backup keys when your primary account reaches 95% capacity.
              Lower priority numbers are used first (0 = primary).
            </AlertDescription>
          </Alert>

          {/* Add Key Form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  placeholder="e.g., Backup Account 1"
                  value={newKey.label}
                  onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk_..."
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority (0 = highest)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  value={newKey.priority}
                  onChange={(e) => setNewKey({ ...newKey, priority: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddKey}>Add Key</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* API Keys List */}
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys configured yet.</p>
              <p className="text-sm mt-2">The system will use the environment variable as fallback.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {keys.map((key, index) => {
                const usagePercent = key.usagePercent * 100;
                const isPrimary = key.priority === 0;
                
                return (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{key.label}</h3>
                          {isPrimary && (
                            <Badge variant="default">Primary</Badge>
                          )}
                          {getUsageBadge(key.usagePercent)}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {key.apiKey}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Priority: {key.priority}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveKey(key.apiKey, key.label)}
                        disabled={isPrimary}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    {/* Usage Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Character Usage</span>
                        <span className={getUsageColor(key.usagePercent)}>
                          {key.characterUsed.toLocaleString()} / {key.characterLimit.toLocaleString()}
                          ({usagePercent.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress 
                        value={usagePercent} 
                        className="h-2"
                      />
                    </div>

                    {/* Status Messages */}
                    {key.usagePercent >= 0.95 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This account is at critical capacity. The system will use backup keys.
                        </AlertDescription>
                      </Alert>
                    )}
                    {key.usagePercent >= 0.80 && key.usagePercent < 0.95 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This account is approaching capacity limit.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

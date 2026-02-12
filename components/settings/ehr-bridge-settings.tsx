'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, Copy, ExternalLink, Loader2, Shield } from 'lucide-react';

export function EHRBridgeSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setToken(null);
    try {
      const res = await fetch('/api/ehr-bridge/auth/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate token');
      setToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          EHR Bridge Extension
        </CardTitle>
        <CardDescription>
          Generate a token to connect the Nexrel EHR Bridge Chrome extension. The extension lets you push Docpen notes directly into browser-based EHRs (Dentrix, Open Dental, Athena, Epic, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Extension Token'
            )}
          </Button>

          {token && (
            <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
              <p className="text-sm font-medium">Your token (copy and paste into the extension):</p>
              <div className="flex gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all">{token}</code>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Token expires in 90 days. Store it securely. Do not share.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Setup steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Install the Nexrel EHR Bridge extension (load unpacked from <code className="bg-muted px-1 rounded">extensions/nexrel-ehr-bridge</code>)</li>
              <li>Click "Connect to Nexrel" in the extension popup</li>
              <li>Paste the token from above</li>
              <li>Open an EHR tab (e.g. Dentrix, Athena) and push notes</li>
            </ol>
          </div>

          <a
            href={`${appUrl}/dashboard/docpen`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-purple-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Open Docpen
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

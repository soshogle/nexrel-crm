
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Globe, Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function SubdomainSettings() {
  const [subdomain, setSubdomain] = useState('');
  const [suggestedSubdomain, setSuggestedSubdomain] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubdomain();
  }, []);

  const fetchSubdomain = async () => {
    try {
      const response = await fetch('/api/user/subdomain');
      if (response.ok) {
        const data = await response.json();
        setSubdomain(data.subdomain || '');
        setSuggestedSubdomain(data.suggestedSubdomain || '');
        setInputValue(data.subdomain || '');
      }
    } catch (error) {
      console.error('Error fetching subdomain:', error);
      toast.error('Failed to load subdomain settings');
    } finally {
      setIsLoading(false);
    }
  };

  const validateSubdomain = (value: string): boolean => {
    const regex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    return regex.test(value);
  };

  const handleSave = async () => {
    setError('');
    setIsSaving(true);

    if (!inputValue) {
      setError('Subdomain cannot be empty');
      setIsSaving(false);
      return;
    }

    if (!validateSubdomain(inputValue)) {
      setError('Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.');
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/user/subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: inputValue }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubdomain(inputValue);
        toast.success(data.message || 'Subdomain saved successfully!');
        // Copy to clipboard
        const url = `https://${inputValue}.soshogle.com`;
        navigator.clipboard.writeText(url);
        toast.success('Subdomain URL copied to clipboard!');
      } else {
        setError(data.error || 'Failed to save subdomain');
        toast.error(data.error || 'Failed to save subdomain');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
      toast.error('Failed to save subdomain');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove your custom subdomain? Your booking links will stop working.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/user/subdomain', {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubdomain('');
        setInputValue('');
        toast.success('Subdomain removed successfully');
      } else {
        toast.error('Failed to remove subdomain');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyUrl = () => {
    if (subdomain) {
      const url = `https://${subdomain}.soshogle.com`;
      navigator.clipboard.writeText(url);
      toast.success('URL copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Custom Subdomain
        </CardTitle>
        <CardDescription>
          Set up a branded subdomain for your business. This will be used for parent signups and booking pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subdomain && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Your subdomain is active:{' '}
                <a
                  href={`https://${subdomain}.soshogle.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-green-700 hover:underline inline-flex items-center gap-1"
                >
                  {subdomain}.soshogle.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
              <Button variant="ghost" size="sm" onClick={copyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="subdomain">Subdomain</Label>
          <div className="flex gap-2">
            <Input
              id="subdomain"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toLowerCase())}
              placeholder={suggestedSubdomain || 'yourclub'}
              className="flex-1"
            />
            <span className="flex items-center text-muted-foreground">.soshogle.com</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Use only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.
          </p>
        </div>

        {suggestedSubdomain && !subdomain && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Suggested subdomain:</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue(suggestedSubdomain)}
            >
              {suggestedSubdomain}.soshogle.com
            </Button>
          </div>
        )}

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <p className="text-sm font-medium text-blue-900">Benefits of custom subdomain:</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Branded parent signup URL: {inputValue || 'yourclub'}.soshogle.com/auth/parent/signup</li>
            <li>Branded booking page: {inputValue || 'yourclub'}.soshogle.com/booking</li>
            <li>Professional appearance for your club</li>
            <li>Easy to share with parents</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {subdomain && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              'Remove Subdomain'
            )}
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving || !inputValue}
          className="ml-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              {subdomain ? 'Update' : 'Set'} Subdomain
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

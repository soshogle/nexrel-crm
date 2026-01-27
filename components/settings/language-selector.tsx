
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Globe, Loader2, Check } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文（普通话）' },
];

export default function LanguageSelector() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCurrentLanguage();
  }, []);

  const fetchCurrentLanguage = async () => {
    try {
      const response = await fetch('/api/user/language');
      if (!response.ok) {
        throw new Error('Failed to fetch language');
      }
      const data = await response.json();
      setCurrentLanguage(data.language || 'en');
      setSelectedLanguage(data.language || 'en');
    } catch (error: any) {
      console.error('Error fetching language:', error);
      toast.error('Failed to load language preference');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLanguage = async () => {
    if (selectedLanguage === currentLanguage) {
      toast.info('Language is already set to ' + languages.find(l => l.code === selectedLanguage)?.name);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/user/language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update language');
      }

      const data = await response.json();
      setCurrentLanguage(selectedLanguage);
      
      toast.success('Language updated successfully! Refreshing...', {
        icon: <Check className="h-4 w-4" />,
      });

      // Refresh the page to apply the new language
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating language:', error);
      toast.error(error.message || 'Failed to update language');
    } finally {
      setIsSaving(false);
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
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Language Preference</CardTitle>
        </div>
        <CardDescription>
          Select your preferred language for the CRM interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language">Select Language</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center justify-between w-full">
                    <span>{lang.name}</span>
                    <span className="text-muted-foreground ml-4">{lang.nativeName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedLanguage !== currentLanguage && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            ℹ️ The page will refresh automatically after saving to apply the new language.
          </div>
        )}

        <Button
          onClick={handleSaveLanguage}
          disabled={isSaving || selectedLanguage === currentLanguage}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Language Preference
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Available Languages:</strong></p>
          <ul className="list-disc list-inside pl-2 space-y-1">
            <li>🇬🇧 English</li>
            <li>🇫🇷 French (Français)</li>
            <li>🇪🇸 Spanish (Español)</li>
            <li>🇨🇳 Chinese (中文)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

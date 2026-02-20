'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Globe, ShoppingCart, Briefcase, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface RebuildWebsiteFormProps {
  onBack: () => void;
}

const blockedPreviewHostnames = new Set([
  'little-lagniappe.com', 'www.little-lagniappe.com',
  'neoculturalcouture.com', 'www.neoculturalcouture.com',
  'vaara.com', 'www.vaara.com',
  'davidprotein.com', 'www.davidprotein.com',
]);

const templateSourceUrls: Record<string, string> = {
  'Zebracat - AI Video Creation': 'https://www.zebracat.ai/',
  'Clay - GTM Data Platform': 'https://www.clay.com/',
  'Starcloud - Space Data Centers': 'https://www.starcloud.com/',
  'NeoCultural Couture - Fashion Innovation': 'https://www.neoculturalcouture.com/',
  'Little Lagniappe - Baby Food Subscription': 'https://www.little-lagniappe.com/',
};

const isPreviewUrlBlocked = (url: string | null) => {
  if (!url) return false;
  try {
    return blockedPreviewHostnames.has(new URL(url).hostname);
  } catch {
    return false;
  }
};

const getTemplatePreviewUrl = (tpl: { previewUrl?: string | null; name: string }) =>
  tpl.previewUrl || templateSourceUrls[tpl.name] || null;

export function RebuildWebsiteForm({ onBack }: RebuildWebsiteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [rebuildUrl, setRebuildUrl] = useState('');
  const [rebuildName, setRebuildName] = useState('');
  const [rebuildTemplateType, setRebuildTemplateType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [rebuildTemplates, setRebuildTemplates] = useState<any[]>([]);
  const [rebuildSelectedTemplateId, setRebuildSelectedTemplateId] = useState<string>('');
  const [loadingRebuildTemplates, setLoadingRebuildTemplates] = useState(false);
  const [enableVoiceAI, setEnableVoiceAI] = useState(true);
  const [enableBlog, setEnableBlog] = useState(false);
  const [blogHasCTA, setBlogHasCTA] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [hoveredRebuildTemplateId, setHoveredRebuildTemplateId] = useState<string | null>(null);
  const [rebuildPreviewUrl, setRebuildPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadRebuildTemplates();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('google-search-console-tokens');
      if (stored) {
        try {
          const tokens = JSON.parse(stored);
          if (tokens.accessToken && tokens.refreshToken) {
            setGoogleConnected(true);
          }
        } catch (e) { /* ignore */ }
      }
    }
  }, []);

  const loadRebuildTemplates = async () => {
    setLoadingRebuildTemplates(true);
    try {
      const response = await fetch(`/api/admin/website-templates?type=${rebuildTemplateType}`);
      if (response.ok) {
        const data = await response.json();
        const templates = data.templates || [];
        setRebuildTemplates(templates);
        const defaultTpl = templates.find((t: any) => t.isDefault) || templates[0];
        if (defaultTpl) {
          setRebuildSelectedTemplateId(defaultTpl.id);
        }
      }
    } catch (error) {
      console.error('Failed to load rebuild templates:', error);
    } finally {
      setLoadingRebuildTemplates(false);
    }
  };

  const handleRebuildTemplateHover = (templateId: string, tpl: { previewUrl?: string | null; name: string }) => {
    const url = getTemplatePreviewUrl(tpl);
    if (url) {
      setHoveredRebuildTemplateId(templateId);
      setRebuildPreviewUrl(url);
    }
  };

  const handleRebuildTemplateLeave = () => {
    setTimeout(() => {
      setHoveredRebuildTemplateId(null);
      setRebuildPreviewUrl(null);
    }, 200);
  };

  const handleRebuild = async () => {
    if (!rebuildUrl || !rebuildName) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let googleTokens: any = null;
      if (googleConnected && typeof window !== 'undefined') {
        const stored = localStorage.getItem('google-search-console-tokens');
        if (stored) {
          try { googleTokens = JSON.parse(stored); } catch (e) { /* invalid */ }
        }
      }

      const response = await fetch('/api/website-builder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rebuildName,
          type: 'REBUILT',
          sourceUrl: rebuildUrl,
          templateType: rebuildTemplateType,
          templateId: rebuildSelectedTemplateId || undefined,
          enableVoiceAI,
          questionnaireAnswers: enableBlog ? {
            blog: {
              enabled: true,
              includeCTA: blogHasCTA,
              ctaText: rebuildTemplateType === 'SERVICE' ? 'Get Started' : 'Shop Now',
              ctaLink: rebuildTemplateType === 'SERVICE' ? '/contact' : '/products',
            },
          } : undefined,
          ...(googleTokens && {
            googleSearchConsoleAccessToken: googleTokens.accessToken,
            googleSearchConsoleRefreshToken: googleTokens.refreshToken,
            googleSearchConsoleTokenExpiry: googleTokens.expiryDate,
            googleSearchConsoleSiteUrl: null,
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create website');
      }

      const data = await response.json();
      toast.success('Website rebuild started! This may take a few minutes.');
      router.push(`/dashboard/websites/${data.website.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create website');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const response = await fetch('/api/website-builder/google-oauth?websiteId=temp');
      if (response.ok) {
        const data = await response.json();
        const popup = window.open(data.authUrl, 'google-oauth', 'width=600,height=700');
        toast.info('Complete Google authorization in the popup window');
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
            const tokens = event.data.tokens;
            localStorage.setItem('google-search-console-tokens', JSON.stringify(tokens));
            setGoogleConnected(true);
            setConnectingGoogle(false);
            if (popup) popup.close();
            window.removeEventListener('message', messageHandler);
            toast.success('Google Search Console connected!');
          } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
            setConnectingGoogle(false);
            if (popup) popup.close();
            window.removeEventListener('message', messageHandler);
            toast.error(`Google OAuth failed: ${event.data.error}`);
          }
        };
        window.addEventListener('message', messageHandler);
        const checkInterval = setInterval(() => {
          if (popup?.closed && !googleConnected) {
            clearInterval(checkInterval);
            setConnectingGoogle(false);
            window.removeEventListener('message', messageHandler);
          }
        }, 1000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate Google OAuth');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Google Search Console');
      setConnectingGoogle(false);
    }
  };

  const switchTemplateType = async (type: 'SERVICE' | 'PRODUCT') => {
    setRebuildTemplateType(type);
    setLoadingRebuildTemplates(true);
    try {
      const r = await fetch(`/api/admin/website-templates?type=${type}`);
      if (r.ok) {
        const d = await r.json();
        const tpls = d.templates || [];
        setRebuildTemplates(tpls);
        const def = tpls.find((t: any) => t.isDefault) || tpls[0];
        setRebuildSelectedTemplateId(def?.id || '');
      }
    } finally {
      setLoadingRebuildTemplates(false);
    }
  };

  return (
    <div className="relative z-10 container mx-auto p-6 max-w-2xl">
      <Button
        variant="ghost"
        className="mb-6 bg-white/90 backdrop-blur-sm hover:bg-white/95"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2">
        <CardHeader>
          <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Rebuild Your Website
          </CardTitle>
          <CardDescription className="text-base">
            Enter your website URL and we&apos;ll rebuild it for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Website Name</Label>
            <Input id="name" value={rebuildName} onChange={(e) => setRebuildName(e.target.value)} placeholder="My Business Website" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="url">Website URL</Label>
            <Input id="url" type="url" value={rebuildUrl} onChange={(e) => setRebuildUrl(e.target.value)} placeholder="https://example.com" className="mt-1" />
          </div>

          {/* Template selection */}
          <div>
            <Label className="text-base font-medium">Design Template</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Choose a template design. Your scraped content will be placed into this layout.
            </p>
            <div className="flex gap-2 mb-2">
              <Button type="button" variant={rebuildTemplateType === 'SERVICE' ? 'default' : 'outline'} size="sm" onClick={() => switchTemplateType('SERVICE')}>
                <Briefcase className="h-4 w-4 mr-1" /> Service
              </Button>
              <Button type="button" variant={rebuildTemplateType === 'PRODUCT' ? 'default' : 'outline'} size="sm" onClick={() => switchTemplateType('PRODUCT')}>
                <ShoppingCart className="h-4 w-4 mr-1" /> Product
              </Button>
            </div>
            {loadingRebuildTemplates ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading templates...
              </div>
            ) : rebuildTemplates.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {rebuildTemplates.map((tpl) => {
                  const hasPreview = getTemplatePreviewUrl(tpl);
                  const isHovered = hoveredRebuildTemplateId === tpl.id;
                  return (
                    <div key={tpl.id} className="relative" onMouseEnter={() => hasPreview && handleRebuildTemplateHover(tpl.id, tpl)} onMouseLeave={handleRebuildTemplateLeave}>
                      <Card
                        className={`cursor-pointer transition-all ${rebuildSelectedTemplateId === tpl.id ? 'ring-2 ring-primary' : 'hover:border-primary/50'} ${isHovered ? 'ring-2 ring-blue-400 z-50' : ''}`}
                        style={{ transform: isHovered ? 'scale(1.02)' : 'scale(1)' }}
                        onClick={() => setRebuildSelectedTemplateId(tpl.id)}
                      >
                        <CardContent className="p-3">
                          <div className="relative rounded-md overflow-hidden bg-muted/50 mb-2 flex items-center justify-center" style={{ height: hasPreview ? 100 : 40 }}>
                            {isHovered && rebuildPreviewUrl && !isPreviewUrlBlocked(rebuildPreviewUrl) ? (
                              <iframe src={rebuildPreviewUrl} className="w-full h-full min-h-[200px] border-0 rounded" title={`Preview: ${tpl.name}`} sandbox="allow-same-origin allow-scripts allow-popups allow-forms" />
                            ) : tpl.previewImage ? (
                              <img src={tpl.previewImage} alt={tpl.name} className="w-full h-full object-cover" />
                            ) : (
                              <Globe className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="font-medium text-sm truncate">{tpl.name}</div>
                          {tpl.category && <span className="text-xs text-primary font-medium">{tpl.category}</span>}
                          {tpl.isDefault && <Badge variant="secondary" className="mt-1 text-xs">Default</Badge>}
                          {hasPreview && !isHovered && <p className="text-xs text-muted-foreground mt-1">Hover to preview</p>}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No templates available. Content will use a basic layout.</p>
            )}
          </div>

          {/* Blog Section */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Add Blog Section
              </CardTitle>
              <CardDescription className="text-xs">Add a blog to share content and improve SEO.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="rebuildEnableBlog" checked={enableBlog} onCheckedChange={(checked) => setEnableBlog(!!checked)} />
                <Label htmlFor="rebuildEnableBlog" className="cursor-pointer">Enable blog page</Label>
              </div>
              {enableBlog && (
                <div className="pl-6 space-y-3 border-l-2 border-purple-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rebuildBlogHasCTA" checked={blogHasCTA} onCheckedChange={(checked) => setBlogHasCTA(!!checked)} />
                    <Label htmlFor="rebuildBlogHasCTA" className="cursor-pointer text-sm">Include Call-to-Action (CTA) on blog posts</Label>
                  </div>
                  {blogHasCTA && (
                    <p className="text-xs text-muted-foreground pl-6">Each blog post will include a CTA button to drive conversions</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SEO Automation */}
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">SEO Automation (Optional)</CardTitle>
              <CardDescription className="text-xs">Connect Google Search Console for automatic sitemap submission and indexing</CardDescription>
            </CardHeader>
            <CardContent>
              {!googleConnected ? (
                <Button type="button" variant="outline" onClick={handleConnectGoogle} disabled={connectingGoogle} className="w-full">
                  {connectingGoogle ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Connect Google Search Console
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Google Search Console Connected</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { localStorage.removeItem('google-search-console-tokens'); setGoogleConnected(false); toast.info('Google Search Console disconnected'); }}>
                    Disconnect
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">Enables automatic sitemap submission, indexing requests, and SEO optimization.</p>
            </CardContent>
          </Card>

          <div className="flex items-center space-x-2">
            <Checkbox id="voiceAI" checked={enableVoiceAI} onCheckedChange={(checked) => setEnableVoiceAI(!!checked)} />
            <Label htmlFor="voiceAI" className="cursor-pointer">Enable Voice AI Assistant</Label>
          </div>

          <Button onClick={handleRebuild} disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rebuilding...</>) : 'Start Rebuild'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

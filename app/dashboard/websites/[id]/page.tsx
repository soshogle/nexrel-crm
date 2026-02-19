'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { setWebsiteBuilderContext } from '@/lib/website-builder-context';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Globe, Settings, Loader2, MessageSquare, Eye, Check, X, Upload, Image as ImageIcon, AlertCircle, BarChart3, Package, Link2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { toast } from 'sonner';
import { ElevenLabsAgent } from '@/components/landing/soshogle/elevenlabs-agent';
import { StockDashboard } from '@/components/websites/stock-dashboard';
import { PropertyListings } from '@/components/websites/property-listings';
import { AnalyticsSettings } from '@/components/websites/analytics-settings';
import { EcommerceContentEditor } from '@/components/websites/ecommerce-content-editor';
import { SeoEditor } from '@/components/websites/seo-editor';
import { ProductsEditor } from '@/components/websites/products-editor';
import { AgencyConfigEditor, type AgencyConfigForm } from '@/components/websites/agency-config-editor';
import { MenuPagesEditor } from '@/components/websites/menu-pages-editor';
import { SectionEditor } from '@/components/website-builder/section-editor';
import { GlobalStylesEditor } from '@/components/website-builder/global-styles-editor';
import { WebsiteFilesManager } from '@/components/website-builder/website-files-manager';
import { StructurePreview } from '@/components/website-builder/structure-preview';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Website {
  id: string;
  name: string;
  type: string;
  templateType?: string;
  neonDatabaseUrl?: string | null;
  status: string;
  buildProgress: number;
  structure: any;
  seoData: any;
  vercelDeploymentUrl?: string;
  voiceAIEnabled: boolean;
  voiceAIConfig?: any;
  elevenLabsAgentId?: string;
  enableTavusAvatar?: boolean;
  agencyConfig?: Record<string, unknown> | null;
  navConfig?: Record<string, unknown> | null;
  pageLabels?: Record<string, string> | null;
  pendingChanges?: any;
  createdAt: string;
  updatedAt: string;
  builds?: { error?: string | null }[];
}

interface PendingChange {
  id: string;
  changes: any;
  preview: any;
  status: string;
  createdAt: string;
  explanation?: string;
}

export default function WebsiteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [requiresImageUpload, setRequiresImageUpload] = useState<{
    description: string;
    currentImagePath: string;
    currentImageUrl?: string;
  } | null>(null);
  const [imageUploadFile, setImageUploadFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [activeTab, setActiveTab] = useState('editor');
  const [editorMode, setEditorMode] = useState<'simple' | 'advanced'>('simple');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [importUrlOpen, setImportUrlOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const prevImportInProgressRef = useRef(false);
  const [templateFallbackOpen, setTemplateFallbackOpen] = useState(false);
  const [fallbackTemplates, setFallbackTemplates] = useState<any[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [listingsCount, setListingsCount] = useState<number | null>(null);
  const [listingsCountLoading, setListingsCountLoading] = useState(false);
  const [syncCentrisLoading, setSyncCentrisLoading] = useState(false);

  useEffect(() => {
    if (session && params.id) {
      fetchWebsite();
      fetchPendingChanges();
    }
  }, [session, params.id]);

  // Default to home page (path '/') when website loads
  useEffect(() => {
    if (website?.structure?.pages?.length) {
      const homeIdx = website.structure.pages.findIndex(
        (p: any) => p.path === '/' || p.id === 'home'
      );
      setSelectedPageIndex(homeIdx >= 0 ? homeIdx : 0);
    }
  }, [website?.structure?.pages]);

  // Poll for progress when building
  useEffect(() => {
    if (!params.id || website?.status !== 'BUILDING') return;
    const interval = setInterval(fetchWebsite, 5000);
    return () => clearInterval(interval);
  }, [params.id, website?.status]);

  // Poll when import from URL is in progress
  const importBuild = website?.builds?.[0] as { status?: string; error?: string; buildData?: { type?: string; url?: string; addedCount?: number } } | undefined;
  const isImportInProgress = importBuild?.status === 'IN_PROGRESS' && importBuild?.buildData?.type === 'import';
  useEffect(() => {
    if (!params.id || !isImportInProgress) return;
    const interval = setInterval(fetchWebsite, 5000);
    return () => clearInterval(interval);
  }, [params.id, isImportInProgress]);

  // Toast when import completes (transition from in-progress to completed)
  useEffect(() => {
    if (prevImportInProgressRef.current && !isImportInProgress && importBuild?.status === 'COMPLETED' && importBuild?.buildData?.addedCount) {
      toast.success(`Added ${importBuild.buildData.addedCount} sections from the URL`);
    }
    prevImportInProgressRef.current = isImportInProgress;
  }, [isImportInProgress, importBuild?.status, importBuild?.buildData?.addedCount]);

  // Fetch listings count when opening settings (SERVICE template only)
  const fetchListingsCount = useCallback(async () => {
    if (!website?.id || website.templateType !== 'SERVICE') return;
    setListingsCountLoading(true);
    try {
      const res = await fetch(`/api/websites/${website.id}/listings/status`);
      const data = await res.json();
      setListingsCount(data.count ?? 0);
    } catch {
      setListingsCount(null);
    } finally {
      setListingsCountLoading(false);
    }
  }, [website?.id, website?.templateType]);
  useEffect(() => {
    if (settingsOpen && website?.templateType === 'SERVICE') {
      fetchListingsCount();
    }
  }, [settingsOpen, website?.templateType, fetchListingsCount]);

  // Sync website builder context so voice/chat AI sees what user sees
  useEffect(() => {
    if (params.id) {
      setWebsiteBuilderContext({
        page: 'editor',
        activeWebsiteId: params.id as string,
        activeWebsiteName: website?.name,
        activeTab,
      });
    }
  }, [params.id, website?.name, activeTab]);

  const fetchWebsite = async () => {
    try {
      const response = await fetch(`/api/websites/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setWebsite(data.website);
      } else {
        toast.error('Failed to load website');
        router.push('/dashboard/websites');
      }
    } catch (error) {
      console.error('Error fetching website:', error);
      toast.error('Failed to load website');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingChanges = async () => {
    try {
      // TODO: Create API endpoint for pending changes
      // For now, check website.pendingChanges
      if (website?.pendingChanges) {
        setPendingChanges([website.pendingChanges]);
      }
    } catch (error) {
      console.error('Error fetching pending changes:', error);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    setChatLoading(true);
    setRequiresImageUpload(null);
    setImageUploadFile(null);
    
    try {
      // Prepare request body
      const requestBody: any = {
        websiteId: params.id,
        message: chatMessage,
      };

      // If image upload file exists, include it
      if (imageUploadFile) {
        const arrayBuffer = await imageUploadFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        requestBody.imageUpload = {
          data: base64,
          contentType: imageUploadFile.type,
        };
      }

      // Send chat message to AI for website modification
      const response = await fetch(`/api/website-builder/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process modification');
      }

      const data = await response.json();
      
      // Check if image upload is required
      if (data.requiresImageUpload && !imageUploadFile) {
        setRequiresImageUpload(data.requiresImageUpload);
        toast.info('Please upload an image to replace the existing one');
        setChatLoading(false);
        return;
      }

      // Show preview of changes
      setPendingChanges([...pendingChanges, {
        id: data.approvalId,
        changes: data.changes,
        preview: data.preview,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        explanation: data.explanation,
      }]);

      setChatMessage('');
      setImageUploadFile(null);
      setRequiresImageUpload(null);
      
      if (data.explanation) {
        toast.success(data.explanation);
      } else {
        toast.success('Changes generated! Review and approve below.');
      }
      setActiveTab('approval');
    } catch (error: any) {
      toast.error(error.message || 'Failed to process modification');
    } finally {
      setChatLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!requiresImageUpload) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('websiteId', params.id);
      formData.append('imagePath', requiresImageUpload.currentImagePath);

      const response = await fetch('/api/website-builder/upload-image-swap', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      // Now resubmit the original chat message with the uploaded image
      setImageUploadFile(file);
      
      // Automatically resubmit the chat message
      const chatForm = document.querySelector('form[onsubmit]') as HTMLFormElement;
      if (chatForm) {
        chatForm.requestSubmit();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      const response = await fetch('/api/website-builder/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: params.id,
          approvalId,
          action: 'approve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve changes');
      }

      toast.success('Changes approved and applied!');
      setPendingChanges(pendingChanges.filter(c => c.id !== approvalId));
      fetchWebsite(); // Refresh website data
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve changes');
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      const response = await fetch('/api/website-builder/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: params.id,
          approvalId,
          action: 'reject',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject changes');
      }

      toast.success('Changes rejected');
      setPendingChanges(pendingChanges.filter(c => c.id !== approvalId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject changes');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Website not found</p>
            <Link href="/dashboard/websites">
              <Button className="mt-4">Back to Websites</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const buildError = website.status === 'FAILED' && website.builds?.[0]?.error;
  const isBuilding = website.status === 'BUILDING';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {isBuilding && (
        <Card className="sticky top-0 z-10 bg-background shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Building your website...</span>
              <span className="text-sm text-muted-foreground">{website.buildProgress}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${website.buildProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This usually takes 2–5 minutes. You can stay on this page — it will update automatically.
            </p>
          </CardContent>
        </Card>
      )}
      {buildError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Build failed</p>
            <p className="mt-1 text-sm break-words">{buildError}</p>
            <p className="mt-2 text-xs opacity-90">You can delete this website and try again, or contact support if the error persists.</p>
          </AlertDescription>
        </Alert>
      )}
      {isImportInProgress && (
        <Card className="sticky top-0 z-10 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium">Import in progress</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We&apos;re scraping the URL and adding sections. Come back in a minute or refresh — the page will update automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {importBuild?.status === 'FAILED' && importBuild?.buildData?.type === 'import' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Import failed</p>
            <p className="mt-1 text-sm break-words">{importBuild.error || 'Could not import from URL'}</p>
            <p className="mt-2 text-xs opacity-90">The site may block scraping, use bot protection, or require login.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setTemplateFallbackOpen(true);
                fetch('/api/admin/website-templates?type=SERVICE')
                  .then((r) => r.json())
                  .then((d) => setFallbackTemplates(d.templates || []))
                  .catch(() => setFallbackTemplates([]));
              }}
            >
              Use a template instead
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Dialog open={templateFallbackOpen} onOpenChange={setTemplateFallbackOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Use a template instead</DialogTitle>
            <DialogDescription>
              Add sections from a pre-built template to your page. These templates work without scraping.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 py-2">
            {fallbackTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading templates…</p>
            ) : (
              fallbackTemplates.map((tpl: any) => (
                <Button
                  key={tpl.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  disabled={applyingTemplate}
                  onClick={async () => {
                    setApplyingTemplate(true);
                    try {
                      const pagePath = website?.structure?.pages?.[selectedPageIndex]?.path || '/';
                      const res = await fetch(`/api/websites/${website?.id}/apply-template`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ templateId: tpl.id, pagePath }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed');
                      toast.success(`Added ${data.addedCount} sections from ${tpl.name}`);
                      setTemplateFallbackOpen(false);
                      await fetchWebsite();
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to apply template');
                    } finally {
                      setApplyingTemplate(false);
                    }
                  }}
                >
                  <span className="font-medium">{tpl.name}</span>
                  {tpl.category && (
                    <span className="text-muted-foreground text-xs ml-2">({tpl.category})</span>
                  )}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/websites">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{website.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={website.status === 'READY' ? 'default' : 'outline'}>
                {website.status}
              </Badge>
              {website.vercelDeploymentUrl && (
                <a
                  href={website.vercelDeploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  View Website
                </a>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          {website.templateType === 'SERVICE' && (
            <TabsTrigger value="listings">Listings</TabsTrigger>
          )}
          {website.templateType === 'PRODUCT' && (
            <>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </>
          )}
          <TabsTrigger value="seo">SEO & Ranking</TabsTrigger>
          <TabsTrigger value="stock">Stock & Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="approval">
            Pending Changes
            {pendingChanges.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingChanges.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Customize your website below. When ready, preview or publish.
            </p>
            <Button onClick={() => setActiveTab('preview')}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Website
            </Button>
          </div>
          <GlobalStylesEditor
            styles={website.structure?.globalStyles}
            onSave={async (styles) => {
              const res = await fetch(`/api/websites/${website.id}/structure`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'global_styles', globalStyles: styles }),
              });
              if (!res.ok) throw new Error((await res.json()).error);
              await fetchWebsite();
            }}
          />
          <WebsiteFilesManager websiteId={website.id} />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Page Sections</CardTitle>
                  <CardDescription>
                    Drag sections to reorder. Click an image to replace, or use AI Chat to add or change content.
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Simple:</strong> Reorder and delete only. <strong>Advanced:</strong> Layout, image replace, and config per section.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={importUrlOpen} onOpenChange={setImportUrlOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Link2 className="h-3.5 w-3.5" />
                        Import from URL
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import from URL</DialogTitle>
                        <DialogDescription>
                          Scrape a website and add its sections (Hero, About, images, contact form, etc.) to the current page. Runs in the background — you can close this and come back in a minute.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="import-url">Website URL</Label>
                          <Input
                            id="import-url"
                            placeholder="https://example.com"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            disabled={importing}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setImportUrlOpen(false)} disabled={importing}>
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!importUrl.trim()) {
                              toast.error('Enter a URL');
                              return;
                            }
                            setImporting(true);
                            try {
                              const pagePath = website.structure?.pages?.[selectedPageIndex]?.path || '/';
                              const res = await fetch(`/api/websites/${website.id}/import-from-url`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url: importUrl.trim(), pagePath }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Import failed');
                              if (data.status === 'in_progress') {
                                toast.success(data.message || 'Import started. Come back in a minute or refresh.');
                                setImportUrl('');
                                setImportUrlOpen(false);
                                await fetchWebsite(); // Refresh to show import-in-progress state
                              } else {
                                toast.success(`Added ${data.addedCount} sections from the URL`);
                                setImportUrl('');
                                setImportUrlOpen(false);
                                await fetchWebsite();
                              }
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to import');
                            } finally {
                              setImporting(false);
                            }
                          }}
                          disabled={importing || !importUrl.trim()}
                        >
                          {importing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Importing…
                            </>
                          ) : (
                            'Import'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  {website.structure?.pages?.length > 1 && (
                    <Tabs
                      value={String(selectedPageIndex)}
                      onValueChange={(v) => setSelectedPageIndex(parseInt(v, 10))}
                      className="w-auto"
                    >
                      <TabsList className="h-8">
                        {website.structure.pages.map((p: any, i: number) => (
                          <TabsTrigger key={p.id || i} value={String(i)} className="text-xs">
                            {p.name || p.path || `Page ${i + 1}`}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  )}
                  <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v)} className="w-auto">
                    <TabsList className="h-8">
                      <TabsTrigger value="simple" className="text-xs">Simple</TabsTrigger>
                      <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SectionEditor
                compactMode={editorMode === 'simple'}
                websiteId={website.id}
                pagePath={website.structure?.pages?.[selectedPageIndex]?.path || '/'}
                components={website.structure?.pages?.[selectedPageIndex]?.components || []}
                isBuilding={isBuilding}
                buildProgress={website.buildProgress ?? 0}
                onReorder={async (from, to) => {
                  const pagePath = website.structure?.pages?.[selectedPageIndex]?.path || '/';
                  const res = await fetch('/api/ai-assistant/actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'reorder_section',
                      parameters: { websiteId: website.id, fromIndex: from, toIndex: to, pagePath },
                    }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  await fetchWebsite();
                }}
                onDelete={async (sectionType) => {
                  const pagePath = website.structure?.pages?.[selectedPageIndex]?.path || '/';
                  const res = await fetch('/api/ai-assistant/actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'delete_section',
                      parameters: { websiteId: website.id, sectionType, pagePath },
                    }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  await fetchWebsite();
                }}
                onUpdateImage={async (sectionType, imageUrl, alt) => {
                  const pagePath = website.structure?.pages?.[selectedPageIndex]?.path || '/';
                  const res = await fetch('/api/ai-assistant/actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'add_website_image',
                      parameters: { websiteId: website.id, sectionType, imageUrl, alt, pagePath },
                    }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  await fetchWebsite();
                }}
                onUpdateLayout={async (sectionType, layout) => {
                  const pagePath = website.structure?.pages?.[selectedPageIndex]?.path || '/';
                  const res = await fetch(`/api/websites/${website.id}/structure`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'section_layout',
                      sectionType,
                      pagePath,
                      layout: {
                        padding: layout.padding,
                        margin: layout.margin,
                        alignment: layout.alignment,
                        visibility: layout.visibility,
                      },
                    }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  await fetchWebsite();
                }}
                onUpdateProps={async (sectionType, props) => {
                  const pagePath = website.structure?.pages?.[selectedPageIndex]?.path || '/';
                  const res = await fetch(`/api/websites/${website.id}/structure`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'section_props',
                      sectionType,
                      pagePath,
                      props,
                    }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  await fetchWebsite();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Chat - Modify Your Website</CardTitle>
              <CardDescription>
                Tell the AI what changes you want, and it will generate them for your approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleChatSubmit} className="space-y-4">
                <div>
                  <Textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Example: Change background to white, swap the image of the girl in red top, change button text to 'Get Started', update heading to 'Welcome'..."
                    rows={4}
                    disabled={chatLoading || uploadingImage}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    💡 Try: "Change background to white", "Swap that image", "Change button text to 'Get Started'", "Update heading to 'Welcome'"
                  </p>
                </div>

                {/* Image Upload Section (shown when AI requests image swap) */}
                {requiresImageUpload && (
                  <Alert>
                    <ImageIcon className="h-4 w-4" />
                    <AlertDescription className="space-y-3">
                      <div>
                        <p className="font-semibold">Image Replacement Required</p>
                        <p className="text-sm text-muted-foreground">
                          AI identified: <strong>{requiresImageUpload.description}</strong>
                        </p>
                        {requiresImageUpload.currentImageUrl && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Current image:</p>
                            <img 
                              src={requiresImageUpload.currentImageUrl} 
                              alt="Current" 
                              className="max-w-xs rounded border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image-upload">Upload Replacement Image</Label>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file);
                            }
                          }}
                          disabled={uploadingImage}
                        />
                        {uploadingImage && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading image...
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={chatLoading || uploadingImage || !chatMessage.trim()}>
                    {chatLoading || uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {uploadingImage ? 'Uploading...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Generate Changes
                      </>
                    )}
                  </Button>
                  {requiresImageUpload && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRequiresImageUpload(null);
                        setImageUploadFile(null);
                        setChatMessage('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              {website.voiceAIEnabled && website.elevenLabsAgentId && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-4">Voice AI Assistant</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Talk to your website's voice assistant (like on nexrel.soshogle.com)
                  </p>
                  <ElevenLabsAgent
                    agentId={website.elevenLabsAgentId}
                    onConversationEnd={(transcript) => {
                      console.log('Conversation ended:', transcript);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO & Google Ranking</CardTitle>
              <CardDescription>
                Configure meta tags, descriptions, and Open Graph data for better search visibility and social sharing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeoEditor
                websiteId={website.id}
                websiteName={website.name}
                seoData={website.seoData as any}
                structure={website.structure as any}
                onSave={async (data) => {
                  if (data.seoData) {
                    const res = await fetch(`/api/websites/${website.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ seoData: data.seoData }),
                    });
                    if (!res.ok) throw new Error((await res.json()).error);
                  }
                  if (data.pageSeo) {
                    const res = await fetch(`/api/websites/${website.id}/structure`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'page_seo', pageSeo: data.pageSeo }),
                    });
                    if (!res.ok) throw new Error((await res.json()).error);
                  }
                  await fetchWebsite();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsSettings websiteId={params.id as string} />
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          {pendingChanges.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Check className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Changes</h3>
                <p className="text-muted-foreground">
                  Use the AI Chat tab to request modifications
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingChanges.map((change) => (
                <Card key={change.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Pending Changes</span>
                      <Badge variant="outline">{change.status}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(change.createdAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {change.explanation && (
                      <Alert>
                        <AlertDescription>
                          <strong>AI Explanation:</strong> {change.explanation}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Current</h4>
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(website.structure, null, 2).substring(0, 500)}...
                          </pre>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Preview</h4>
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(change.preview, null, 2).substring(0, 500)}...
                          </pre>
                        </div>
                      </div>
                    </div>
                    {change.changes && change.changes.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Changes Summary</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {change.changes.map((ch: any, idx: number) => (
                            <li key={idx}>
                              <strong>{ch.type}:</strong> {ch.description || ch.path}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleApprove(change.id)}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(change.id)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {website.templateType === 'SERVICE' && (
          <TabsContent value="listings" className="space-y-4">
            <PropertyListings websiteId={params.id as string} />
          </TabsContent>
        )}

        {website.templateType === 'PRODUCT' && (
          <>
            <TabsContent value="products" className="space-y-4">
              <ProductsEditor
                websiteId={params.id as string}
                vercelDeploymentUrl={website.vercelDeploymentUrl}
              />
            </TabsContent>
            <TabsContent value="content" className="space-y-4">
              <EcommerceContentEditor websiteId={params.id as string} />
            </TabsContent>
          </>
        )}

        <TabsContent value="stock" className="space-y-4">
          <StockDashboard websiteId={params.id as string} />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Website Preview</CardTitle>
              <CardDescription>
                Preview your website before publishing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {website.vercelDeploymentUrl ? (
                <div className="space-y-4">
                  <a
                    href={website.vercelDeploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button>
                      <Eye className="h-4 w-4 mr-2" />
                      Open Preview
                    </Button>
                  </a>
                  <iframe
                    src={website.vercelDeploymentUrl}
                    className="w-full h-[600px] border rounded-lg"
                    title="Website Preview"
                  />
                </div>
              ) : website.structure?.pages?.[0]?.components?.length ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Local preview (no deployment yet). Build via Create New Website to deploy to Vercel.
                  </p>
                  <div className="border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                    <StructurePreview
                      components={website.structure.pages[0].components}
                      globalStyles={website.structure.globalStyles}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Website is still building. Preview will be available when ready.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Website Settings</SheetTitle>
            <SheetDescription>
              Quick actions and links for {website.name}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {website.vercelDeploymentUrl && (
              <a
                href={website.vercelDeploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="h-4 w-4 mr-2" />
                  View Live Website
                </Button>
              </a>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setSettingsOpen(false);
                setActiveTab('preview');
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Website
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setSettingsOpen(false);
                setActiveTab('analytics');
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            {website.templateType === 'SERVICE' && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium">Centris Listings</p>
                <div className="space-y-2">
                  <Label htmlFor="centrisBrokerUrl" className="text-xs">Your Centris broker URL (optional)</Label>
                  <Input
                    id="centrisBrokerUrl"
                    placeholder="https://www.centris.ca/en/broker/your-name/..."
                    className="text-sm"
                    defaultValue={(website.agencyConfig as { centrisBrokerUrl?: string })?.centrisBrokerUrl ?? ''}
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      const current = (website.agencyConfig as { centrisBrokerUrl?: string })?.centrisBrokerUrl ?? '';
                      if (val === current) return;
                      try {
                        const agencyConfig = {
                          ...(typeof website.agencyConfig === 'object' && website.agencyConfig ? website.agencyConfig : {}),
                          centrisBrokerUrl: val || undefined,
                        };
                        const res = await fetch(`/api/websites/${website.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ agencyConfig }),
                        });
                        if (!res.ok) throw new Error('Failed to save');
                        setWebsite((w) => (w ? { ...w, agencyConfig } : null));
                        toast.success(val ? 'Broker URL saved. Run Sync to prioritize your listings.' : 'Broker URL cleared');
                      } catch {
                        toast.error('Failed to save');
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your Centris.ca broker profile URL. When syncing, your listings will be marked featured and shown first on the home page.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="centrisBrokerSoldUrl" className="text-xs">Centris sold listings URL (optional)</Label>
                  <Input
                    id="centrisBrokerSoldUrl"
                    placeholder="https://www.centris.ca/.../sold or broker sold page"
                    className="text-sm"
                    defaultValue={(website.agencyConfig as { centrisBrokerSoldUrl?: string })?.centrisBrokerSoldUrl ?? ''}
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      const current = (website.agencyConfig as { centrisBrokerSoldUrl?: string })?.centrisBrokerSoldUrl ?? '';
                      if (val === current) return;
                      try {
                        const agencyConfig = {
                          ...(typeof website.agencyConfig === 'object' && website.agencyConfig ? website.agencyConfig : {}),
                          centrisBrokerSoldUrl: val || undefined,
                        };
                        const res = await fetch(`/api/websites/${website.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ agencyConfig }),
                        });
                        if (!res.ok) throw new Error('Failed to save');
                        setWebsite((w) => (w ? { ...w, agencyConfig } : null));
                        toast.success(val ? 'Sold listings URL saved. Run Sync to import sold comparables.' : 'Sold listings URL cleared');
                      } catch {
                        toast.error('Failed to save');
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    If your broker profile has a sold listings page URL, paste it here. Sold listings are used as comparables for property evaluation.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="realtorBrokerUrl" className="text-xs">Your Realtor.ca agent URL (optional)</Label>
                  <Input
                    id="realtorBrokerUrl"
                    placeholder="https://www.realtor.ca/agent/2237157/your-name-..."
                    className="text-sm"
                    defaultValue={(website.agencyConfig as { realtorBrokerUrl?: string })?.realtorBrokerUrl ?? ''}
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      const current = (website.agencyConfig as { realtorBrokerUrl?: string })?.realtorBrokerUrl ?? '';
                      if (val === current) return;
                      try {
                        const agencyConfig = {
                          ...(typeof website.agencyConfig === 'object' && website.agencyConfig ? website.agencyConfig : {}),
                          realtorBrokerUrl: val || undefined,
                        };
                        const res = await fetch(`/api/websites/${website.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ agencyConfig }),
                        });
                        if (!res.ok) throw new Error('Failed to save');
                        setWebsite((w) => (w ? { ...w, agencyConfig } : null));
                        toast.success(val ? 'Realtor.ca URL saved. Run Sync to import your listings.' : 'Realtor.ca URL cleared');
                      } catch {
                        toast.error('Failed to save');
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your Realtor.ca agent page URL. Sync will fetch your listings and add them to the home page rotation.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {listingsCountLoading ? (
                    <span className="text-sm text-muted-foreground">Checking...</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {listingsCount !== null ? `${listingsCount} listing(s)` : '—'}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={syncCentrisLoading || !website.neonDatabaseUrl}
                    onClick={async () => {
                      setSyncCentrisLoading(true);
                      try {
                        const res = await fetch(`/api/websites/${website.id}/sync-centris`, {
                          method: 'POST',
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Sync failed');
                        let msg = `Synced ${data.fetched ?? 0} Centris listings to ${data.databases ?? 1} database(s)`;
                        if (data.realtor?.imported != null && data.realtor.imported > 0) {
                          msg += `, ${data.realtor.imported} Realtor.ca`;
                        }
                        if (data.realtor?.error) {
                          toast.warning(`${msg}. Realtor.ca failed: ${data.realtor.error}`);
                        } else {
                          toast.success(msg);
                        }
                        fetchListingsCount();
                      } catch (e) {
                        toast.error((e as Error).message || 'Sync failed');
                      } finally {
                        setSyncCentrisLoading(false);
                      }
                    }}
                  >
                    {syncCentrisLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Sync now
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fetches Montreal listings from Centris via Apify and writes to this site&apos;s database.
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setSettingsOpen(false);
                setActiveTab('stock');
              }}
            >
              <Package className="h-4 w-4 mr-2" />
              Stock & Inventory
            </Button>
            <div className="pt-4 border-t space-y-4">
              <p className="text-sm font-medium">Agency / Brand</p>
              <AgencyConfigEditor
                websiteId={website.id}
                agencyConfig={website.agencyConfig ?? null}
                onSave={async (config: AgencyConfigForm) => {
                  const res = await fetch(`/api/websites/${website.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      agencyConfig: {
                        brokerName: config.brokerName || undefined,
                        name: config.name || undefined,
                        tagline: config.tagline || undefined,
                        logoUrl: config.logoUrl || undefined,
                        phone: config.phone || undefined,
                        email: config.email || undefined,
                        address: config.address || undefined,
                        fullAddress: config.address || undefined,
                      },
                    }),
                  });
                  if (!res.ok) throw new Error('Failed to save');
                  setWebsite((w) =>
                    w
                      ? {
                          ...w,
                          agencyConfig: {
                            ...(w.agencyConfig as Record<string, unknown> || {}),
                            brokerName: config.brokerName,
                            name: config.name,
                            tagline: config.tagline,
                            logoUrl: config.logoUrl,
                            phone: config.phone,
                            email: config.email,
                            address: config.address,
                            fullAddress: config.address,
                          },
                        }
                      : null
                  );
                }}
                onUpdateLocal={() => {}}
              />
            </div>
            <div className="pt-4 border-t space-y-4">
              <p className="text-sm font-medium">Menu & Pages</p>
              <MenuPagesEditor
                websiteId={website.id}
                navConfig={website.navConfig ?? null}
                pageLabels={website.pageLabels ?? null}
                onSave={async (updates) => {
                  const res = await fetch(`/api/websites/${website.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates),
                  });
                  if (!res.ok) throw new Error('Failed to save');
                  setWebsite((w) =>
                    w
                      ? {
                          ...w,
                          navConfig: updates.navConfig ?? w.navConfig,
                          pageLabels: updates.pageLabels ?? w.pageLabels,
                        }
                      : null
                  );
                }}
                onUpdateLocal={(updates) => {
                  setWebsite((w) =>
                    w
                      ? {
                          ...w,
                          navConfig: updates.navConfig ?? w.navConfig,
                          pageLabels: updates.pageLabels ?? w.pageLabels,
                        }
                      : null
                  );
                }}
              />
            </div>
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium">Voice & Avatar</p>
              {website.voiceAIEnabled && website.elevenLabsAgentId && (
                <div className="space-y-2">
                  <Label htmlFor="voiceAIPrompt" className="text-sm">
                    Voice AI Custom Prompt
                  </Label>
                  <Textarea
                    id="voiceAIPrompt"
                    placeholder="Customize how the Voice AI introduces your business, services, and tone. Leave blank to use default."
                    className="min-h-[100px] text-sm"
                    defaultValue={(website.voiceAIConfig as { customPrompt?: string })?.customPrompt ?? ''}
                    onBlur={async (e) => {
                      const customPrompt = e.target.value.trim();
                      const current = (website.voiceAIConfig as { customPrompt?: string })?.customPrompt ?? '';
                      if (customPrompt === current) return;
                      try {
                        const voiceAIConfig = {
                          ...(typeof website.voiceAIConfig === 'object' && website.voiceAIConfig ? website.voiceAIConfig : {}),
                          customPrompt: customPrompt || undefined,
                        };
                        const res = await fetch(`/api/websites/${website.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ voiceAIConfig }),
                        });
                        if (!res.ok) throw new Error('Failed to update');
                        setWebsite((w) => (w ? { ...w, voiceAIConfig } : null));
                        toast.success('Voice AI prompt saved');
                      } catch {
                        toast.error('Failed to save prompt');
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt is sent to the Voice AI agent. Use it to describe your agency, specialties, and how you want the assistant to greet visitors.
                  </p>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableTavusAvatar"
                  checked={website.enableTavusAvatar !== false}
                  onCheckedChange={async (checked) => {
                    try {
                      const res = await fetch(`/api/websites/${website.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enableTavusAvatar: !!checked }),
                      });
                      if (!res.ok) throw new Error('Failed to update');
                      setWebsite((w) => (w ? { ...w, enableTavusAvatar: !!checked } : null));
                      toast.success(checked ? 'AI Avatar enabled' : 'AI Avatar disabled');
                    } catch {
                      toast.error('Failed to update');
                    }
                  }}
                />
                <Label htmlFor="enableTavusAvatar" className="cursor-pointer text-sm">
                  Enable AI Avatar (video assistant)
                </Label>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

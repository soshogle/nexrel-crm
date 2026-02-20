'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { setWebsiteBuilderContext } from '@/lib/website-builder-context';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Globe, Settings, Loader2, Eye, AlertCircle, BarChart3, Package, RefreshCw, Pencil } from 'lucide-react';
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
import { StockDashboard } from '@/components/websites/stock-dashboard';
import { PropertyListings } from '@/components/websites/property-listings';
import { AnalyticsSettings } from '@/components/websites/analytics-settings';
import { EcommerceContentEditor } from '@/components/websites/ecommerce-content-editor';
import { SeoEditor } from '@/components/websites/seo-editor';
import { ProductsEditor } from '@/components/websites/products-editor';
import { AgencyConfigEditor, type AgencyConfigForm } from '@/components/websites/agency-config-editor';
import { MenuPagesEditor } from '@/components/websites/menu-pages-editor';
import { StructurePreview } from '@/components/website-builder/structure-preview';
import { EditorTab } from '@/components/websites/editor-tab';
import { ChatTab } from '@/components/websites/chat-tab';
import { ApprovalTab } from '@/components/websites/approval-tab';
import { SectionContentEditor } from '@/components/website-builder/section-content-editor';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [activeTab, setActiveTab] = useState('editor');
  const [editorMode, setEditorMode] = useState<'simple' | 'advanced'>('simple');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const prevImportInProgressRef = useRef(false);
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
            <p className="mt-2 text-xs">Try using a template from the Editor tab instead.</p>
          </AlertDescription>
        </Alert>
      )}
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
          <TabsTrigger value="page-editor">Page Editor</TabsTrigger>
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
          <EditorTab
            website={website}
            selectedPageIndex={selectedPageIndex}
            setSelectedPageIndex={setSelectedPageIndex}
            editorMode={editorMode}
            setEditorMode={setEditorMode}
            fetchWebsite={fetchWebsite}
            onPreview={() => setActiveTab('preview')}
          />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <ChatTab
            websiteId={website.id}
            website={website}
            pendingChanges={pendingChanges}
            setPendingChanges={setPendingChanges}
            fetchWebsite={fetchWebsite}
            setActiveTab={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="page-editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Page-by-Page Content Editor
              </CardTitle>
              <CardDescription>
                Edit text, swap images, and use AI to rewrite content for each section of your website. Select a page and expand any section to modify it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {website.structure?.pages?.length > 0 ? (
                <SectionContentEditor
                  websiteId={website.id}
                  pages={website.structure.pages}
                  onStructureUpdate={fetchWebsite}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No pages found. Build your website first using the Editor or AI Chat tab.</p>
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
          <ApprovalTab
            websiteId={website.id}
            websiteStructure={website.structure}
            pendingChanges={pendingChanges}
            setPendingChanges={setPendingChanges}
            fetchWebsite={fetchWebsite}
          />
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

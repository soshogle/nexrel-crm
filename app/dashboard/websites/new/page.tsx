'use client';

import { useState, useEffect } from 'react';
import { setWebsiteBuilderContext } from '@/lib/website-builder-context';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Loader2, Globe, Sparkles, Wand2, ShoppingCart, Briefcase, Code, Palette, Zap, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';

// Designer Background Carousel Component
function DesignerBackgroundCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      gradient: 'from-purple-400 via-pink-400 to-red-400',
      icon: <Code className="h-32 w-32 text-white/20" />,
      position: 'top-20 left-10',
      rotation: 'rotate-12',
    },
    {
      gradient: 'from-blue-400 via-cyan-400 to-teal-400',
      icon: <Palette className="h-32 w-32 text-white/20" />,
      position: 'top-40 right-20',
      rotation: '-rotate-12',
    },
    {
      gradient: 'from-indigo-400 via-purple-400 to-pink-400',
      icon: <Zap className="h-32 w-32 text-white/20" />,
      position: 'bottom-32 left-1/4',
      rotation: 'rotate-6',
    },
    {
      gradient: 'from-rose-400 via-orange-400 to-amber-400',
      icon: <Globe className="h-32 w-32 text-white/20" />,
      position: 'bottom-20 right-1/3',
      rotation: '-rotate-6',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 via-pink-50 to-cyan-50 animate-gradient-shift"></div>
      
      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-200/30 via-transparent to-blue-200/30 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-pink-200/30 via-transparent to-cyan-200/30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Floating website preview cards with carousel effect */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          const offset = (index - currentSlide + slides.length) % slides.length;
          const scale = isActive ? 1 : 0.8;
          const opacity = isActive ? 0.25 : 0.1;
          const translateX = (offset - currentSlide) * 100;
          
          return (
            <div
              key={index}
              className={`absolute ${slide.position} transition-all duration-1000 ease-in-out ${slide.rotation}`}
              style={{
                transform: `translateX(${translateX}px) scale(${scale})`,
                opacity: opacity,
                zIndex: isActive ? 10 : 5,
              }}
            >
              <div className={`w-72 h-56 bg-gradient-to-br ${slide.gradient} rounded-2xl shadow-2xl p-6 flex flex-col justify-between backdrop-blur-sm border border-white/20`}>
                <div className="flex justify-center items-center h-full">
                  {slide.icon}
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mt-2">
                  <div className="h-2 bg-white/30 rounded-full mb-2"></div>
                  <div className="h-2 bg-white/20 rounded-full w-3/4"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional floating elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Small decorative circles */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-purple-300/20 to-blue-300/20 blur-xl animate-float"
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              top: `${(i * 12) % 100}%`,
              left: `${(i * 15) % 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${10 + i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}

export default function NewWebsitePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<'initial' | 'rebuild' | 'new'>('initial');
  const [loading, setLoading] = useState(false);

  // Rebuild form state
  const [rebuildUrl, setRebuildUrl] = useState('');
  const [rebuildName, setRebuildName] = useState('');
  const [rebuildTemplateType, setRebuildTemplateType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [rebuildTemplates, setRebuildTemplates] = useState<any[]>([]);
  const [rebuildSelectedTemplateId, setRebuildSelectedTemplateId] = useState<string>('');
  const [loadingRebuildTemplates, setLoadingRebuildTemplates] = useState(false);

  // New website form state
  const [websiteName, setWebsiteName] = useState('');
  const [templateType, setTemplateType] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [businessDescription, setBusinessDescription] = useState('');
  const [services, setServices] = useState('');
  const [products, setProducts] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [enableVoiceAI, setEnableVoiceAI] = useState(true);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [enableBlog, setEnableBlog] = useState(false);
  const [blogHasCTA, setBlogHasCTA] = useState(true);
  const [templateHasBlog, setTemplateHasBlog] = useState(false);
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hoveredRebuildTemplateId, setHoveredRebuildTemplateId] = useState<string | null>(null);
  const [rebuildPreviewUrl, setRebuildPreviewUrl] = useState<string | null>(null);

  // One website per profile: redirect if user already has a website
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/websites');
        if (res.ok) {
          const data = await res.json();
          if (data.canCreateNew === false || (data.websites?.length ?? 0) >= 1) {
            router.replace('/dashboard/websites');
          }
        }
      } catch (e) {
        console.error('Failed to check website limit:', e);
      }
    };
    if (session) check();
  }, [session, router]);

  // Sync website builder context so voice/chat AI can follow along
  useEffect(() => {
    setWebsiteBuilderContext({
      page: 'new',
      step,
      rebuildUrl: step === 'rebuild' ? rebuildUrl : undefined,
      rebuildName: step === 'rebuild' ? rebuildName : undefined,
      websiteName: step === 'new' ? websiteName : undefined,
      templateType: step === 'new' ? templateType : undefined,
      buildProgress: loading ? 0 : undefined,
    });
    return () => { /* keep context on unmount for navigation */ };
  }, [step, rebuildUrl, rebuildName, websiteName, templateType, loading]);

  // Check for stored Google tokens on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('google-search-console-tokens');
      if (stored) {
        try {
          const tokens = JSON.parse(stored);
          if (tokens.accessToken && tokens.refreshToken) {
            setGoogleConnected(true);
          }
        } catch (e) {
          // Invalid stored data
        }
      }
    }
  }, []);

  // Load templates when template type changes
  useEffect(() => {
    if (step === 'new') {
      loadTemplates();
      if (templateType === 'PRODUCT') {
        loadProducts();
      }
    }
  }, [step, templateType]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch('/api/ecommerce/products');
      if (response.ok) {
        const data = await response.json();
        setAvailableProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!businessDescription.trim() || businessDescription.length < 10) {
      toast.error('Please enter at least 10 characters of business description first');
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await fetch('/api/website-builder/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessDescription,
          websiteName,
          templateType,
          services: templateType === 'SERVICE' ? services : undefined,
          products: templateType === 'PRODUCT' ? products : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate description');
      }

      const data = await response.json();
      if (data.generated?.enhancedDescription) {
        setBusinessDescription(data.generated.enhancedDescription);
        toast.success('Business description enhanced with AI!');
      }
    } catch (error: any) {
      console.error('Error generating description:', error);
      toast.error(error.message || 'Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const checkTemplateForBlog = (template: any) => {
    // Check if template structure has a blog page
    const structure = template.structure;
    if (structure?.pages) {
      const hasBlog = structure.pages.some((page: any) => 
        page.id === 'blog' || 
        page.path === '/blog' || 
        page.name?.toLowerCase().includes('blog')
      );
      setTemplateHasBlog(hasBlog);
      // If template doesn't have blog, enable blog option by default
      if (!hasBlog) {
        setEnableBlog(true);
      } else {
        setEnableBlog(false); // Disable if template already has blog
      }
    } else {
      setTemplateHasBlog(false);
      setEnableBlog(true); // Enable by default if we can't determine
    }
  };

  // Fallback URLs when template.previewUrl not in DB (legacy)
  const templateSourceUrls: Record<string, string> = {
    'Zebracat - AI Video Creation': 'https://www.zebracat.ai/',
    'Clay - GTM Data Platform': 'https://www.clay.com/',
    'Starcloud - Space Data Centers': 'https://www.starcloud.com/',
    'NeoCultural Couture - Fashion Innovation': 'https://www.neoculturalcouture.com/',
    'Little Lagniappe - Baby Food Subscription': 'https://www.little-lagniappe.com/',
  };

  const getTemplatePreviewUrl = (tpl: { previewUrl?: string | null; name: string }) =>
    tpl.previewUrl || templateSourceUrls[tpl.name] || null;

  const handleTemplateHover = (templateId: string, tpl: { previewUrl?: string | null; name: string }) => {
    const url = getTemplatePreviewUrl(tpl);
    if (url) {
      setHoveredTemplateId(templateId);
      setPreviewUrl(url);
    }
  };

  const handleRebuildTemplateHover = (templateId: string, tpl: { previewUrl?: string | null; name: string }) => {
    const url = getTemplatePreviewUrl(tpl);
    if (url) {
      setHoveredRebuildTemplateId(templateId);
      setRebuildPreviewUrl(url);
    }
  };

  const handleTemplateLeave = () => {
    setTimeout(() => {
      setHoveredTemplateId(null);
      setPreviewUrl(null);
    }, 200);
  };

  const handleRebuildTemplateLeave = () => {
    setTimeout(() => {
      setHoveredRebuildTemplateId(null);
      setRebuildPreviewUrl(null);
    }, 200);
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch(`/api/admin/website-templates?type=${templateType}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        // Auto-select default template
        const defaultTemplate = data.templates?.find((t: any) => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          checkTemplateForBlog(defaultTemplate);
        } else if (data.templates?.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
          checkTemplateForBlog(data.templates[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleInitialChoice = (choice: 'rebuild' | 'new') => {
    setStep(choice);
    if (choice === 'rebuild') {
      loadRebuildTemplates();
    }
  };

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


  const handleRebuild = async () => {
    if (!rebuildUrl || !rebuildName) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
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

  const handleNewWebsite = async () => {
    if (!websiteName || !businessDescription) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const questionnaireAnswers = {
        businessName: websiteName,
        businessDescription,
        services: services ? services.split(',').map(s => s.trim()) : [],
        products: templateType === 'PRODUCT' && selectedProducts.length > 0
          ? selectedProducts.map((productId) => {
              const product = availableProducts.find((p) => p.id === productId);
              return product ? {
                productId: product.id,
                sku: product.sku,
                name: product.name,
                price: product.price,
                inventory: product.inventory,
              } : null;
            }).filter(Boolean)
          : products ? products.split(',').map(p => p.trim()) : [],
        selectedProductIds: templateType === 'PRODUCT' ? selectedProducts : [],
        contactInfo: {
          email: contactEmail,
          phone: contactPhone,
        },
        // Blog settings
        blog: enableBlog ? {
          enabled: true,
          includeCTA: blogHasCTA,
          ctaText: templateType === 'SERVICE' ? 'Get Started' : 'Shop Now',
          ctaLink: templateType === 'SERVICE' ? '/contact' : '/products',
        } : undefined,
      };

      // Get Google tokens from localStorage if connected
      let googleTokens: any = null;
      if (googleConnected && typeof window !== 'undefined') {
        const stored = localStorage.getItem('google-search-console-tokens');
        if (stored) {
          try {
            googleTokens = JSON.parse(stored);
          } catch (e) {
            // Invalid tokens, continue without them
          }
        }
      }

      const response = await fetch('/api/website-builder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: websiteName,
          type: templateType === 'SERVICE' ? 'SERVICE_TEMPLATE' : 'PRODUCT_TEMPLATE',
          templateType,
          templateId: selectedTemplateId || undefined, // Use selected template if available
          questionnaireAnswers,
          enableVoiceAI,
          // Include Google tokens if available
          ...(googleTokens && {
            googleSearchConsoleAccessToken: googleTokens.accessToken,
            googleSearchConsoleRefreshToken: googleTokens.refreshToken,
            googleSearchConsoleTokenExpiry: googleTokens.expiryDate,
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create website');
      }

      const data = await response.json();
      toast.success('Website creation started! This may take a few minutes.');
      router.push(`/dashboard/websites/${data.website.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create website');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'initial') {
    return (
      <div className="relative min-h-screen">
        {/* Designer Background Carousel */}
        <DesignerBackgroundCarousel />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto p-6 max-w-4xl">
          <Link href="/dashboard/websites">
            <Button variant="ghost" className="mb-6 bg-white/90 backdrop-blur-sm hover:bg-white/95">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Websites
            </Button>
          </Link>

          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-xl">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Create New Website
              </h1>
              <p className="text-muted-foreground text-lg">
                Choose how you'd like to create your website
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card
                className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/95 backdrop-blur-sm border-2 hover:border-purple-300"
                onClick={() => handleInitialChoice('rebuild')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Globe className="h-6 w-6 text-purple-600" />
                    Rebuild Existing Website
                  </CardTitle>
                  <CardDescription className="text-base">
                    We'll clone and rebuild your current website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Enter your website URL and we'll extract all content, images, SEO data, and structure to rebuild it for you.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/95 backdrop-blur-sm border-2 hover:border-blue-300"
                onClick={() => handleInitialChoice('new')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                    Build New Website
                  </CardTitle>
                  <CardDescription className="text-base">
                    We'll build a completely new website for you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Answer a few questions and upload your assets. We'll build a professional website tailored to your business.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'rebuild') {
    return (
      <div className="relative min-h-screen">
        {/* Designer Background Carousel */}
        <DesignerBackgroundCarousel />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto p-6 max-w-2xl">
          <Button
            variant="ghost"
            className="mb-6 bg-white/90 backdrop-blur-sm hover:bg-white/95"
            onClick={() => setStep('initial')}
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
                Enter your website URL and we'll rebuild it for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Website Name</Label>
                <Input
                  id="name"
                  value={rebuildName}
                  onChange={(e) => setRebuildName(e.target.value)}
                  placeholder="My Business Website"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={rebuildUrl}
                  onChange={(e) => setRebuildUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1"
                />
              </div>

              {/* Rebuild template selection */}
              <div>
                <Label className="text-base font-medium">Design Template</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose a template design. Your scraped content will be placed into this layout for you to approve or modify with the AI editor.
                </p>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={rebuildTemplateType === 'SERVICE' ? 'default' : 'outline'}
                    size="sm"
                    onClick={async () => {
                      setRebuildTemplateType('SERVICE');
                      setLoadingRebuildTemplates(true);
                      try {
                        const r = await fetch('/api/admin/website-templates?type=SERVICE');
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
                    }}
                  >
                    <Briefcase className="h-4 w-4 mr-1" />
                    Service
                  </Button>
                  <Button
                    type="button"
                    variant={rebuildTemplateType === 'PRODUCT' ? 'default' : 'outline'}
                    size="sm"
                    onClick={async () => {
                      setRebuildTemplateType('PRODUCT');
                      setLoadingRebuildTemplates(true);
                      try {
                        const r = await fetch('/api/admin/website-templates?type=PRODUCT');
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
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Product
                  </Button>
                </div>
                {loadingRebuildTemplates ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading templates...
                  </div>
                ) : rebuildTemplates.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {rebuildTemplates.map((tpl) => {
                      const hasPreview = getTemplatePreviewUrl(tpl);
                      const isHovered = hoveredRebuildTemplateId === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          className="relative"
                          onMouseEnter={() => hasPreview && handleRebuildTemplateHover(tpl.id, tpl)}
                          onMouseLeave={handleRebuildTemplateLeave}
                        >
                          <Card
                            className={`cursor-pointer transition-all ${
                              rebuildSelectedTemplateId === tpl.id ? 'ring-2 ring-primary' : 'hover:border-primary/50'
                            } ${isHovered ? 'ring-2 ring-blue-400 z-50' : ''}`}
                            style={{ transform: isHovered ? 'scale(1.02)' : 'scale(1)' }}
                            onClick={() => setRebuildSelectedTemplateId(tpl.id)}
                          >
                            <CardContent className="p-3">
                              <div className="relative rounded-md overflow-hidden bg-muted/50 mb-2 flex items-center justify-center" style={{ height: hasPreview ? 100 : 40 }}>
                                {isHovered && rebuildPreviewUrl ? (
                                  <iframe
                                    src={rebuildPreviewUrl}
                                    className="w-full h-full min-h-[200px] border-0 rounded"
                                    title={`Preview: ${tpl.name}`}
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                  />
                                ) : tpl.previewImage ? (
                                  <img src={tpl.previewImage} alt={tpl.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Globe className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="font-medium text-sm truncate">{tpl.name}</div>
                              {tpl.category && (
                                <span className="text-xs text-primary font-medium">{tpl.category}</span>
                              )}
                              {tpl.isDefault && (
                                <Badge variant="secondary" className="mt-1 text-xs">Default</Badge>
                              )}
                              {hasPreview && !isHovered && (
                                <p className="text-xs text-muted-foreground mt-1">Hover to preview</p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No templates available. Content will use a basic layout.
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="voiceAI"
                  checked={enableVoiceAI}
                  onCheckedChange={(checked) => setEnableVoiceAI(!!checked)}
                />
                <Label htmlFor="voiceAI" className="cursor-pointer">
                  Enable Voice AI Assistant (like on nexrel.soshogle.com)
                </Label>
              </div>

              <Button
                onClick={handleRebuild}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rebuilding...
                  </>
                ) : (
                  'Start Rebuild'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Designer Background Carousel */}
      <DesignerBackgroundCarousel />

      {/* Content */}
      <div className="relative z-10 container mx-auto p-6 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6 bg-white/80 backdrop-blur-sm"
          onClick={() => setStep('initial')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-2">
          <CardHeader>
            <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Build New Website
            </CardTitle>
            <CardDescription className="text-base">
              Answer a few questions and we'll build your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="websiteName">Website Name *</Label>
              <Input
                id="websiteName"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="My Business"
                className="mt-1"
              />
            </div>

            {/* Website Type Selection - Enhanced */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Website Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all border-2 ${
                    templateType === 'SERVICE'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setTemplateType('SERVICE')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className={`h-6 w-6 ${templateType === 'SERVICE' ? 'text-primary' : 'text-gray-400'}`} />
                      <div>
                        <h3 className="font-semibold">Service Website</h3>
                        <p className="text-sm text-muted-foreground">For service-based businesses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all border-2 ${
                    templateType === 'PRODUCT'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setTemplateType('PRODUCT')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <ShoppingCart className={`h-6 w-6 ${templateType === 'PRODUCT' ? 'text-primary' : 'text-gray-400'}`} />
                      <div>
                        <h3 className="font-semibold">Product Website</h3>
                        <p className="text-sm text-muted-foreground">For e-commerce stores</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <Label>Choose a Template</Label>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading templates...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {templates.map((template) => {
                    const sourceUrl = getTemplatePreviewUrl(template);
                    const isHovered = hoveredTemplateId === template.id;
                    
                    return (
                      <div
                        key={template.id}
                        className="relative"
                        onMouseEnter={() => getTemplatePreviewUrl(template) && handleTemplateHover(template.id, template)}
                        onMouseLeave={handleTemplateLeave}
                      >
                        <Card
                          className={`cursor-pointer transition-all duration-300 ${
                            selectedTemplateId === template.id
                              ? 'ring-2 ring-primary shadow-lg'
                              : 'hover:shadow-lg'
                          } ${isHovered ? 'ring-2 ring-blue-400 z-50' : ''}`}
                          style={{
                            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                            zIndex: isHovered ? 50 : 1,
                          }}
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            checkTemplateForBlog(template);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="relative w-full rounded-lg mb-3 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden shadow-md border border-gray-200 transition-all duration-300"
                              style={{ height: isHovered ? '400px' : '160px' }}
                            >
                              {isHovered && previewUrl ? (
                                <div className="w-full h-full relative">
                                  <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                                    <a
                                      href={previewUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Open in new tab"
                                    >
                                      <ExternalLink className="w-4 h-4 text-blue-600" />
                                    </a>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setHoveredTemplateId(null);
                                        setPreviewUrl(null);
                                      }}
                                      className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white transition-colors"
                                      title="Close preview"
                                    >
                                      <X className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                  <iframe
                                    src={previewUrl}
                                    className="w-full h-full border-0 rounded-lg"
                                    title={`Live preview of ${template.name}`}
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                    loading="lazy"
                                    style={{ pointerEvents: 'auto' }}
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/20 to-transparent h-12 pointer-events-none" />
                                </div>
                              ) : (
                                <>
                                  {template.previewImage ? (
                                    <img
                                      src={template.previewImage}
                                      alt={template.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        // Fallback to placeholder if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent && !parent.querySelector('.image-placeholder')) {
                                          const placeholder = document.createElement('div');
                                          placeholder.className = 'image-placeholder w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-200 to-blue-200';
                                          placeholder.innerHTML = '<svg class="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                          parent.appendChild(placeholder);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-200 to-blue-200 text-purple-500">
                                      <Globe className="w-16 h-16 mb-2 opacity-50" />
                                      <span className="text-xs font-medium opacity-70">Preview</span>
                                    </div>
                                  )}
                                  {sourceUrl && (
                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
                                      <ExternalLink className="w-3 h-3 text-blue-600" />
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <h4 className="font-semibold text-sm text-gray-900">{template.name}</h4>
                            {template.category && (
                              <span className="inline-block text-xs text-purple-600 font-medium mt-1 mb-1">
                                {template.category}
                              </span>
                            )}
                            {template.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            {template.isDefault && (
                              <Badge variant="outline" className="mt-2 text-xs border-primary text-primary">
                                Default Template
                              </Badge>
                            )}
                            {sourceUrl && !isHovered && (
                              <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                <span>Hover to preview live site</span>
                              </div>
                            )}
                            {isHovered && sourceUrl && (
                              <div className="mt-2 text-xs text-green-600 flex items-center gap-1 font-medium">
                                <Globe className="w-3 h-3" />
                                <span>Live preview active</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="description">Business Description *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={generatingDescription || !businessDescription.trim() || businessDescription.length < 10}
                className="flex items-center gap-2"
              >
                {generatingDescription ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    AI Enhance
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="description"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="Describe your business... (Enter at least 10 characters to enable AI enhancement)"
              rows={4}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your business description and click "AI Enhance" to generate professional, SEO-optimized content
            </p>
          </div>

          {templateType === 'SERVICE' ? (
            <div>
              <Label htmlFor="services">Services (comma-separated)</Label>
              <Input
                id="services"
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="Consulting, Design, Development"
                className="mt-1"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Select Products for Your Website</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose products from your e-commerce catalog to display on your website
                </p>
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading products...</span>
                  </div>
                ) : availableProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border rounded-md">
                    {availableProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${
                          selectedProducts.includes(product.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedProducts((prev) =>
                            prev.includes(product.id)
                              ? prev.filter((id) => id !== product.id)
                              : [...prev, product.id]
                          );
                        }}
                      >
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => {
                            setSelectedProducts((prev) =>
                              prev.includes(product.id)
                                ? prev.filter((id) => id !== product.id)
                                : [...prev, product.id]
                            );
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${(product.price / 100).toFixed(2)} • Stock: {product.inventory}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-md bg-gray-50">
                    <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">No products found</p>
                    <Link href="/dashboard/ecommerce">
                      <Button variant="outline" size="sm">
                        Create Products
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
              {selectedProducts.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </div>
              )}
              <div>
                <Label htmlFor="products">Or enter products manually (comma-separated)</Label>
                <Input
                  id="products"
                  value={products}
                  onChange={(e) => setProducts(e.target.value)}
                  placeholder="Product 1, Product 2, Product 3"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Blog Creation Option (if template doesn't include blog) */}
          {!templateHasBlog && (
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Add Blog Section
                </CardTitle>
                <CardDescription className="text-xs">
                  Your selected template doesn't include a blog. Add one to share content and improve SEO.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableBlog"
                    checked={enableBlog}
                    onCheckedChange={(checked) => setEnableBlog(!!checked)}
                  />
                  <Label htmlFor="enableBlog" className="cursor-pointer">
                    Enable blog page
                  </Label>
                </div>
                
                {enableBlog && (
                  <div className="pl-6 space-y-3 border-l-2 border-purple-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="blogHasCTA"
                        checked={blogHasCTA}
                        onCheckedChange={(checked) => setBlogHasCTA(!!checked)}
                      />
                      <Label htmlFor="blogHasCTA" className="cursor-pointer text-sm">
                        Include Call-to-Action (CTA) on blog posts
                      </Label>
                    </div>
                    {blogHasCTA && (
                      <p className="text-xs text-muted-foreground pl-6">
                        Each blog post will include a CTA button to drive conversions (e.g., "Contact Us", "Get Started", "Learn More")
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Google Search Console Connection (Optional) */}
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">SEO Automation (Optional)</CardTitle>
              <CardDescription className="text-xs">
                Connect Google Search Console to automatically submit sitemaps, request indexing, and optimize SEO
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!googleConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    setConnectingGoogle(true);
                    try {
                      const response = await fetch('/api/website-builder/google-oauth?websiteId=temp');
                      if (response.ok) {
                        const data = await response.json();
                        // Open OAuth URL in new window and listen for completion
                        const popup = window.open(data.authUrl, 'google-oauth', 'width=600,height=700');
                        toast.info('Complete Google authorization in the popup window');
                        
                        // Listen for postMessage from OAuth callback
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
                        
                        // Also poll for popup closure
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
                  }}
                  disabled={connectingGoogle}
                  className="w-full"
                >
                  {connectingGoogle ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('google-search-console-tokens');
                      setGoogleConnected(false);
                      toast.info('Google Search Console disconnected');
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                This enables automatic sitemap submission, indexing requests, and SEO optimization after your website is deployed.
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="voiceAI"
              checked={enableVoiceAI}
              onCheckedChange={(checked) => setEnableVoiceAI(!!checked)}
            />
            <Label htmlFor="voiceAI" className="cursor-pointer">
              Enable Voice AI Assistant (like on nexrel.soshogle.com)
            </Label>
          </div>

          <Button
            onClick={handleNewWebsite}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Building Website...
              </>
            ) : (
              'Build Website'
            )}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

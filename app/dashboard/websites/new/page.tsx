'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Loader2, Globe, Sparkles, Wand2, ShoppingCart, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewWebsitePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<'initial' | 'rebuild' | 'new'>('initial');
  const [loading, setLoading] = useState(false);

  // Rebuild form state
  const [rebuildUrl, setRebuildUrl] = useState('');
  const [rebuildName, setRebuildName] = useState('');

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
        } else if (data.templates?.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
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
      };

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
      <div className="container mx-auto p-6 max-w-4xl">
        <Link href="/dashboard/websites">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Websites
          </Button>
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Create New Website</h1>
            <p className="text-muted-foreground">
              Choose how you'd like to create your website
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleInitialChoice('rebuild')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Rebuild Existing Website
                </CardTitle>
                <CardDescription>
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
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleInitialChoice('new')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Build New Website
                </CardTitle>
                <CardDescription>
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
    );
  }

  if (step === 'rebuild') {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setStep('initial')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Rebuild Your Website</CardTitle>
            <CardDescription>
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
              />
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
              className="w-full"
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
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated Carousel Background */}
      <div className="fixed inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50"></div>
        <div className="absolute inset-0 opacity-20">
          {/* Animated website preview cards */}
          <div className="absolute top-10 left-10 w-64 h-48 bg-white rounded-lg shadow-lg transform rotate-3 animate-pulse" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-32 right-20 w-72 h-56 bg-white rounded-lg shadow-lg transform -rotate-2 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-60 h-44 bg-white rounded-lg shadow-lg transform rotate-1 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-40 right-1/3 w-68 h-52 bg-white rounded-lg shadow-lg transform -rotate-3 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </div>

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

        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Build New Website</CardTitle>
            <CardDescription>
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
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplateId === template.id
                          ? 'ring-2 ring-primary'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="w-full h-32 rounded mb-2 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden">
                          {template.previewImage ? (
                            <img
                              src={template.previewImage}
                              alt={template.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('.image-placeholder')) {
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'image-placeholder w-full h-full flex items-center justify-center text-purple-400';
                                  placeholder.innerHTML = '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                  parent.appendChild(placeholder);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-purple-400">
                              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm">{template.name}</h4>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        {template.isDefault && (
                          <span className="text-xs text-primary mt-1 block">Default</span>
                        )}
                      </CardContent>
                    </Card>
                  ))}
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

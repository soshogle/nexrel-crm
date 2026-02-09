'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Loader2, Globe, Sparkles } from 'lucide-react';
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

  // Load templates when template type changes
  useEffect(() => {
    if (step === 'new') {
      loadTemplates();
    }
  }, [step, templateType]);

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
        products: products ? products.split(',').map(p => p.trim()) : [],
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
          <CardTitle>Build New Website</CardTitle>
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
            />
          </div>

          <div>
            <Label>Website Type</Label>
            <RadioGroup
              value={templateType}
              onValueChange={(value) => setTemplateType(value as 'SERVICE' | 'PRODUCT')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SERVICE" id="service" />
                <Label htmlFor="service" className="cursor-pointer">
                  Service Website
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PRODUCT" id="product" />
                <Label htmlFor="product" className="cursor-pointer">
                  Product Website
                </Label>
              </div>
            </RadioGroup>
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
                        {template.previewImage && (
                          <img
                            src={template.previewImage}
                            alt={template.name}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        )}
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
            <Label htmlFor="description">Business Description *</Label>
            <Textarea
              id="description"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="Describe your business..."
              rows={4}
            />
          </div>

          {templateType === 'SERVICE' ? (
            <div>
              <Label htmlFor="services">Services (comma-separated)</Label>
              <Input
                id="services"
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="Consulting, Design, Development"
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="products">Products (comma-separated)</Label>
              <Input
                id="products"
                value={products}
                onChange={(e) => setProducts(e.target.value)}
                placeholder="Product 1, Product 2, Product 3"
              />
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
  );
}

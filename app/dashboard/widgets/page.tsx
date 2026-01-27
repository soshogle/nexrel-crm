'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Code, Copy, CheckCircle2, Settings, Eye, Palette, Layers } from 'lucide-react';
import { toast } from 'sonner';
import AdminPageGuard from '@/components/admin/admin-page-guard';

interface WidgetConfig {
  userId: string;
  widgetId: string;
  baseUrl: string;
}

interface WidgetCustomization {
  title: string;
  description: string;
  buttonText: string;
  buttonColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  showBusinessName: boolean;
  showContactPerson: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  showAddress: boolean;
  showMessage: boolean;
}

export default function WidgetsPage() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [customization, setCustomization] = useState<WidgetCustomization>({
    title: 'Get in Touch',
    description: 'Fill out the form below and we\'ll get back to you soon.',
    buttonText: 'Submit',
    buttonColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: '8px',
    showBusinessName: true,
    showContactPerson: true,
    showEmail: true,
    showPhone: true,
    showWebsite: false,
    showAddress: false,
    showMessage: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/widget/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch widget config:', error);
      toast.error('Failed to load widget configuration');
    }
  };

  const generateWidgetCode = () => {
    if (!config) return '';

    const fields = [];
    if (customization.showBusinessName) fields.push('businessName');
    if (customization.showContactPerson) fields.push('contactPerson');
    if (customization.showEmail) fields.push('email');
    if (customization.showPhone) fields.push('phone');
    if (customization.showWebsite) fields.push('website');
    if (customization.showAddress) fields.push('address');
    if (customization.showMessage) fields.push('message');

    return `<!-- AI Lead Generation Widget -->
<div id="ai-lead-widget"></div>
<script>
(function() {
  const config = {
    userId: '${config.userId}',
    widgetId: '${config.widgetId}',
    apiUrl: '${config.baseUrl}/api/widget/submit',
    title: '${customization.title}',
    description: '${customization.description}',
    buttonText: '${customization.buttonText}',
    buttonColor: '${customization.buttonColor}',
    backgroundColor: '${customization.backgroundColor}',
    textColor: '${customization.textColor}',
    borderRadius: '${customization.borderRadius}',
    fields: ${JSON.stringify(fields)}
  };

  const container = document.getElementById('ai-lead-widget');
  if (!container) return;

  // Create widget HTML
  const widgetHTML = \`
    <div style="max-width: 500px; margin: 0 auto; padding: 24px; background-color: \${config.backgroundColor}; border-radius: \${config.borderRadius}; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); font-family: system-ui, -apple-system, sans-serif;">
      <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: \${config.textColor};">\${config.title}</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">\${config.description}</p>
      <form id="ai-lead-form" style="display: flex; flex-direction: column; gap: 16px;">
        \${config.fields.includes('businessName') ? \`
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: \${config.textColor};">Business Name *</label>
            <input type="text" name="businessName" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
          </div>
        \` : ''}
        \${config.fields.includes('contactPerson') ? \`
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: \${config.textColor};">Contact Person *</label>
            <input type="text" name="contactPerson" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
          </div>
        \` : ''}
        \${config.fields.includes('email') ? \`
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: \${config.textColor};">Email *</label>
            <input type="email" name="email" required style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
          </div>
        \` : ''}
        \${config.fields.includes('phone') ? \`
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: \${config.textColor};">Phone</label>
            <input type="tel" name="phone" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
          </div>
        \` : ''}
        \${config.fields.includes('website') ? \`
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: \${config.textColor};">Website</label>
            <input type="url" name="website" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
          </div>
        \` : ''}
        \${config.fields.includes('address') ? \`
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: \${config.textColor};">Address</label>
            <input type="text" name="address" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;" />
          </div>
        \` : ''}
        \${config.fields.includes('message') ? \`
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px; color: \${config.textColor};">Message</label>
            <textarea name="message" rows="4" style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
          </div>
        \` : ''}
        <button type="submit" style="width: 100%; padding: 10px 16px; background-color: \${config.buttonColor}; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 14px;">\${config.buttonText}</button>
        <div id="ai-lead-status" style="display: none; padding: 12px; border-radius: 6px; font-size: 14px;"></div>
      </form>
    </div>
  \`;

  container.innerHTML = widgetHTML;

  // Handle form submission
  const form = document.getElementById('ai-lead-form');
  const status = document.getElementById('ai-lead-status');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: config.userId,
          widgetId: config.widgetId,
          formData: data
        })
      });

      const result = await response.json();

      if (response.ok) {
        status.style.display = 'block';
        status.style.backgroundColor = '#d1fae5';
        status.style.color = '#065f46';
        status.textContent = result.message || 'Thank you! We\\'ll get back to you soon.';
        form.reset();
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      status.style.display = 'block';
      status.style.backgroundColor = '#fee2e2';
      status.style.color = '#991b1b';
      status.textContent = 'Something went wrong. Please try again.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = config.buttonText;
    }
  });
})();
</script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Widget code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const widgetCode = generateWidgetCode();

  return (
    <AdminPageGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Embeddable Widget</h1>
          <p className="text-muted-foreground mt-2">
            Create and customize your lead capture widget to embed on any website
          </p>
        </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customization Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Customize Widget
              </CardTitle>
              <CardDescription>Configure your widget appearance and fields</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">
                    <Layers className="h-4 w-4 mr-2" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="style">
                    <Palette className="h-4 w-4 mr-2" />
                    Style
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={customization.title}
                      onChange={(e) => setCustomization({ ...customization, title: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={customization.description}
                      onChange={(e) => setCustomization({ ...customization, description: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input
                      value={customization.buttonText}
                      onChange={(e) => setCustomization({ ...customization, buttonText: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label>Form Fields</Label>
                    <div className="space-y-2">
                      {[
                        { key: 'showBusinessName', label: 'Business Name' },
                        { key: 'showContactPerson', label: 'Contact Person' },
                        { key: 'showEmail', label: 'Email' },
                        { key: 'showPhone', label: 'Phone' },
                        { key: 'showWebsite', label: 'Website' },
                        { key: 'showAddress', label: 'Address' },
                        { key: 'showMessage', label: 'Message' },
                      ].map((field) => (
                        <div key={field.key} className="flex items-center justify-between">
                          <Label htmlFor={field.key} className="cursor-pointer">
                            {field.label}
                          </Label>
                          <Switch
                            id={field.key}
                            checked={customization[field.key as keyof WidgetCustomization] as boolean}
                            onCheckedChange={(checked) =>
                              setCustomization({ ...customization, [field.key]: checked })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Button Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={customization.buttonColor}
                        onChange={(e) => setCustomization({ ...customization, buttonColor: e.target.value })}
                        className="w-16 h-10 bg-gray-800 border-gray-700"
                      />
                      <Input
                        value={customization.buttonColor}
                        onChange={(e) => setCustomization({ ...customization, buttonColor: e.target.value })}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={customization.backgroundColor}
                        onChange={(e) => setCustomization({ ...customization, backgroundColor: e.target.value })}
                        className="w-16 h-10 bg-gray-800 border-gray-700"
                      />
                      <Input
                        value={customization.backgroundColor}
                        onChange={(e) => setCustomization({ ...customization, backgroundColor: e.target.value })}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={customization.textColor}
                        onChange={(e) => setCustomization({ ...customization, textColor: e.target.value })}
                        className="w-16 h-10 bg-gray-800 border-gray-700"
                      />
                      <Input
                        value={customization.textColor}
                        onChange={(e) => setCustomization({ ...customization, textColor: e.target.value })}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Border Radius</Label>
                    <Select
                      value={customization.borderRadius}
                      onValueChange={(value) => setCustomization({ ...customization, borderRadius: value })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">None</SelectItem>
                        <SelectItem value="4px">Small</SelectItem>
                        <SelectItem value="8px">Medium</SelectItem>
                        <SelectItem value="12px">Large</SelectItem>
                        <SelectItem value="16px">X-Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Widget Code & Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Embed Code */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Code
              </CardTitle>
              <CardDescription>Copy and paste this code into your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={widgetCode}
                  readOnly
                  className="bg-gray-800 border-gray-700 font-mono text-xs h-[300px] resize-none"
                />
                <Button
                  onClick={() => copyToClipboard(widgetCode)}
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/50">
                <AlertDescription className="text-sm text-blue-300">
                  <strong>How to use:</strong> Paste this code snippet anywhere in your HTML where you want the widget to appear. It will automatically load and display the form.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Widget Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Widget ID</span>
                  <Badge variant="outline">{config?.widgetId || 'Loading...'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Status</span>
                  <Badge className="bg-green-500/20 text-green-300">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
    </AdminPageGuard>
  );
}

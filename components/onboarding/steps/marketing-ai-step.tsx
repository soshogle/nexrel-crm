
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  CAMPAIGN_TONES,
  MARKETING_CHANNELS,
  MARKETING_BUDGETS,
  WEBSITE_TRAFFIC,
  CURRENT_CRMS
} from '@/lib/onboarding-config';
import { Sparkles, Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MarketingAIStepProps {
  data: any;
  onChange: (data: any) => void;
}

export function MarketingAIStep({ data, onChange }: MarketingAIStepProps) {
  // Initialize with consistent empty values to prevent hydration mismatch
  const [formData, setFormData] = useState({
    campaignTone: '',
    primaryMarketingChannel: '',
    monthlyMarketingBudget: '',
    websiteTraffic: '',
    currentCRM: '',
    socialMediaProfiles: '',
    businessKnowledge: ''
  });

  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Sync data from props after client-side mount
  useEffect(() => {
    if (!initialized && data) {
      setFormData({
        campaignTone: data.campaignTone || '',
        primaryMarketingChannel: data.primaryMarketingChannel || '',
        monthlyMarketingBudget: data.monthlyMarketingBudget || '',
        websiteTraffic: data.websiteTraffic || '',
        currentCRM: data.currentCRM || '',
        socialMediaProfiles: data.socialMediaProfiles || '',
        businessKnowledge: data.businessKnowledge || ''
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  useEffect(() => {
    if (initialized) {
      onChange(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Simulate file upload - in production, would make actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      const fileNames = Array.from(files).map(f => f.name);
      setUploadedFiles(prev => [...prev, ...fileNames]);
      toast.success(`Uploaded ${fileNames.length} file(s) successfully!`);
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  // Don't render until client-side initialization is complete
  if (!initialized) {
    return (
      <div className="space-y-6 flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div>
        <h2 className="text-2xl font-bold mb-2">Marketing & AI Training</h2>
        <p className="text-muted-foreground">
          Configure your marketing preferences and train the AI assistant with your business knowledge.
        </p>
      </div>

      <div className="space-y-4">
        {/* Campaign Tone */}
        <div className="space-y-2">
          <Label htmlFor="campaignTone">Campaign Tone & Voice *</Label>
          <Select
            value={formData.campaignTone}
            onValueChange={(value) => updateField('campaignTone', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="How should campaigns sound?" />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_TONES.map((tone) => (
                <SelectItem key={tone.value} value={tone.value}>
                  {tone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Primary Marketing Channel */}
        <div className="space-y-2">
          <Label htmlFor="primaryMarketingChannel">Primary Marketing Channel *</Label>
          <Select
            value={formData.primaryMarketingChannel}
            onValueChange={(value) => updateField('primaryMarketingChannel', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Your main marketing focus" />
            </SelectTrigger>
            <SelectContent>
              {MARKETING_CHANNELS.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {channel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Marketing Budget */}
        <div className="space-y-2">
          <Label htmlFor="monthlyMarketingBudget">Monthly Marketing Budget (Optional)</Label>
          <Select
            value={formData.monthlyMarketingBudget}
            onValueChange={(value) => updateField('monthlyMarketingBudget', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your budget range" />
            </SelectTrigger>
            <SelectContent>
              {MARKETING_BUDGETS.map((budget) => (
                <SelectItem key={budget} value={budget}>
                  {budget}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Website Traffic */}
        <div className="space-y-2">
          <Label htmlFor="websiteTraffic">Website Traffic (Optional)</Label>
          <Select
            value={formData.websiteTraffic}
            onValueChange={(value) => updateField('websiteTraffic', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Current website traffic" />
            </SelectTrigger>
            <SelectContent>
              {WEBSITE_TRAFFIC.map((traffic) => (
                <SelectItem key={traffic} value={traffic}>
                  {traffic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current CRM */}
        <div className="space-y-2">
          <Label htmlFor="currentCRM">Current CRM (If Migrating)</Label>
          <Select
            value={formData.currentCRM}
            onValueChange={(value) => updateField('currentCRM', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select current CRM system" />
            </SelectTrigger>
            <SelectContent>
              {CURRENT_CRMS.map((crm) => (
                <SelectItem key={crm} value={crm}>
                  {crm}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Social Media Profiles */}
        <div className="space-y-2">
          <Label htmlFor="socialMediaProfiles">Social Media Profiles (Optional)</Label>
          <Textarea
            id="socialMediaProfiles"
            placeholder="Enter your social media URLs (one per line)&#10;Facebook: https://facebook.com/yourpage&#10;Instagram: https://instagram.com/yourpage"
            value={formData.socialMediaProfiles}
            onChange={(e) => updateField('socialMediaProfiles', e.target.value)}
            rows={4}
          />
        </div>

        {/* AI Knowledge Base */}
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Train Your AI Assistant</h3>
          </div>

          <div className="space-y-3">
            <Label htmlFor="businessKnowledge">Tell the AI About Your Business *</Label>
            <Textarea
              id="businessKnowledge"
              placeholder="Describe your business in detail...&#10;&#10;What makes you unique?&#10;Common customer questions?&#10;Pricing information?&#10;Service details?&#10;Your typical customer journey?"
              value={formData.businessKnowledge}
              onChange={(e) => updateField('businessKnowledge', e.target.value)}
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              The more detail you provide, the better the AI can assist your customers and team.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Upload Documents (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Input
                type="file"
                id="documents"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <label htmlFor="documents" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium">
                    {uploading ? 'Uploading...' : 'Click to upload documents'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDFs, Word docs, or text files (FAQs, pricing sheets, etc.)
                  </p>
                </div>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploaded Files:</p>
                <div className="space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

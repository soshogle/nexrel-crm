
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationAutocomplete } from '../location-autocomplete';
import {
  BUSINESS_CATEGORIES,
  INDUSTRY_NICHES,
  TEAM_SIZES,
  CURRENCIES,
  LANGUAGES,
  TIMEZONES
} from '@/lib/onboarding-config';

interface BusinessProfileStepProps {
  data: any;
  onChange: (data: any) => void;
}

export function BusinessProfileStep({ data, onChange }: BusinessProfileStepProps) {
  // Initialize with consistent empty values to prevent hydration mismatch
  const [formData, setFormData] = useState({
    businessCategory: '',
    industryNiche: '',
    operatingLocation: '',
    timezone: 'America/New_York',
    currency: 'USD',
    teamSize: '',
    businessLanguage: 'English',
    productsServices: '',
    targetAudience: '',
    demographics: ''
  });

  const [initialized, setInitialized] = useState(false);

  // Sync data from props after client-side mount
  useEffect(() => {
    if (!initialized && data) {
      setFormData({
        businessCategory: data.businessCategory || '',
        industryNiche: data.industryNiche || '',
        operatingLocation: data.operatingLocation || '',
        timezone: data.timezone || 'America/New_York',
        currency: data.currency || 'USD',
        teamSize: data.teamSize || '',
        businessLanguage: data.businessLanguage || 'English',
        productsServices: data.productsServices || '',
        targetAudience: data.targetAudience || '',
        demographics: data.demographics || ''
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  useEffect(() => {
    if (initialized) {
      onChange(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, initialized]);

  const updateField = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    // Immediately notify parent of the change
    onChange(newFormData);
  };

  // Don't render until initialization is complete to prevent hydration mismatch
  if (!initialized) {
    return null;
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div>
        <h2 className="text-2xl font-bold mb-2">Tell Us About Your Business</h2>
        <p className="text-muted-foreground">
          This information helps us customize your CRM and AI assistant for your specific needs.
        </p>
      </div>

      <div className="space-y-4">
        {/* Business Category */}
        <div className="space-y-2">
          <Label htmlFor="businessCategory">Business Category *</Label>
          <Select
            value={formData.businessCategory}
            onValueChange={(value) => updateField('businessCategory', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your business category" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industry Niche */}
        <div className="space-y-2">
          <Label htmlFor="industryNiche">Industry Niche *</Label>
          <Select
            value={formData.industryNiche}
            onValueChange={(value) => updateField('industryNiche', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your industry niche" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_NICHES.map((niche) => (
                <SelectItem key={niche} value={niche}>
                  {niche}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location with Google Maps */}
        <LocationAutocomplete
          value={formData.operatingLocation}
          onChange={(location, isOnline) => {
            updateField('operatingLocation', location);
          }}
          onTimezoneDetected={(timezone) => {
            updateField('timezone', timezone);
          }}
        />

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone *</Label>
          <Select
            value={formData.timezone}
            onValueChange={(value) => updateField('timezone', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency">Currency *</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) => updateField('currency', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.value} value={curr.value}>
                  {curr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Team Size */}
        <div className="space-y-2">
          <Label htmlFor="teamSize">Team Size *</Label>
          <Select
            value={formData.teamSize}
            onValueChange={(value) => updateField('teamSize', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your team size" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Business Language */}
        <div className="space-y-2">
          <Label htmlFor="businessLanguage">Primary Business Language *</Label>
          <Select
            value={formData.businessLanguage}
            onValueChange={(value) => updateField('businessLanguage', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your business language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products/Services */}
        <div className="space-y-2">
          <Label htmlFor="productsServices">Products/Services Offered *</Label>
          <Textarea
            id="productsServices"
            placeholder="Describe your main products or services..."
            value={formData.productsServices}
            onChange={(e) => updateField('productsServices', e.target.value)}
            rows={3}
            required
          />
          <p className="text-xs text-muted-foreground">
            e.g., "Social media marketing, SEO, PPC advertising"
          </p>
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience">Target Audience *</Label>
          <Textarea
            id="targetAudience"
            placeholder="Who are your ideal customers?"
            value={formData.targetAudience}
            onChange={(e) => updateField('targetAudience', e.target.value)}
            rows={3}
            required
          />
          <p className="text-xs text-muted-foreground">
            e.g., "Small business owners with 2-10 employees, aged 30-50"
          </p>
        </div>

        {/* Demographics (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="demographics">Demographics & Additional Details (Optional)</Label>
          <Textarea
            id="demographics"
            placeholder="Any additional customer demographics or targeting details..."
            value={formData.demographics}
            onChange={(e) => updateField('demographics', e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

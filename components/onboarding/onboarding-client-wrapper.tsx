'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BusinessProfileStep } from '@/components/onboarding/steps/business-profile-step';
import { SalesConfigStep } from '@/components/onboarding/steps/sales-config-step';
import { MessagingStep } from '@/components/onboarding/steps/messaging-step';
import { PaymentStep } from '@/components/onboarding/steps/payment-step';
import CalendarStep from '@/components/onboarding/steps/calendar-step';
import { MarketingAIStep } from '@/components/onboarding/steps/marketing-ai-step';
import { ReviewLaunchStep } from '@/components/onboarding/steps/review-launch-step';

const STEPS = [
  { id: 1, name: 'Website & Company', description: 'Basic information' },
  { id: 2, name: 'Business Profile', description: 'About your business' },
  { id: 3, name: 'Sales Configuration', description: 'Sales process details' },
  { id: 4, name: 'Email & Calendar', description: 'Connect Gmail & Google Workspace' },
  { id: 5, name: 'Payment Processing', description: 'Payment provider' },
  { id: 6, name: 'Marketing & AI', description: 'Train your AI assistant' },
  { id: 7, name: 'Review & Launch', description: 'Final review' }
];

export default function OnboardingClientWrapper() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1); // Track highest step reached
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1 data (website & company)
  const [hasWebsite, setHasWebsite] = useState<boolean | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [companyProfile, setCompanyProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    businessDescription: ''
  });

  // All onboarding data with safe defaults
  const [onboardingData, setOnboardingData] = useState<any>({
    currency: 'USD',
    businessCategory: '',
    industryNiche: '',
    productsServices: '',
    targetAudience: '',
    salesCycleLength: '',
    preferredContactMethod: '',
    emailProvider: '',
    smsProvider: '',
    paymentProvider: '',
    businessLanguage: 'English',
    teamSize: '',
    operatingLocation: ''
  });

  // Load saved draft from localStorage
  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('onboarding_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📂 Loading saved onboarding data from localStorage');
        
        // Restore all saved state
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.hasWebsite !== undefined) setHasWebsite(parsed.hasWebsite);
        if (parsed.websiteUrl) setWebsiteUrl(parsed.websiteUrl);
        if (parsed.companyProfile) setCompanyProfile(parsed.companyProfile);
        if (parsed.onboardingData) setOnboardingData(parsed.onboardingData);
        
        toast.info('Restored your previously entered information');
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  };

  // Clear localStorage draft (called after successful completion)
  const clearLocalStorageDraft = () => {
    try {
      localStorage.removeItem('onboarding_draft');
      console.log('🗑️ Cleared onboarding draft from localStorage');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true);
    // Load saved form data from localStorage when component mounts
    loadFromLocalStorage();
  }, []);

  useEffect(() => {
    if (status === 'loading' || !mounted) return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated' && session?.user?.id) {
      loadExistingData();
    }
  }, [status, session, router, mounted]);

  // Save form data to localStorage whenever it changes (auto-save)
  useEffect(() => {
    if (!mounted) return;
    
    const dataToSave = {
      currentStep,
      hasWebsite,
      websiteUrl,
      companyProfile,
      onboardingData
    };
    
    try {
      localStorage.setItem('onboarding_draft', JSON.stringify(dataToSave));
      console.log('💾 Auto-saved onboarding data to localStorage');
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [mounted, currentStep, hasWebsite, websiteUrl, companyProfile, onboardingData]);

  const loadExistingData = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/onboarding/update-step');
      if (response.ok) {
        const { user } = await response.json();
        if (user) {
          // Merge user data with defaults to maintain consistency
          setOnboardingData((prev: any) => ({
            ...prev,
            ...user,
            // Ensure critical fields have defaults
            currency: user.currency || 'USD',
            businessCategory: user.businessCategory || '',
            industryNiche: user.industryNiche || '',
            productsServices: user.productsServices || '',
            targetAudience: user.targetAudience || '',
            salesCycleLength: user.salesCycleLength || '',
            preferredContactMethod: user.preferredContactMethod || '',
            emailProvider: user.emailProvider || '',
            smsProvider: user.smsProvider || '',
            paymentProvider: user.paymentProvider || '',
            businessLanguage: user.businessLanguage || 'English',
            teamSize: user.teamSize || '',
            operatingLocation: user.operatingLocation || ''
          }));
          // Pre-fill company profile if exists
          if (user.name || user.email || user.phone) {
            setCompanyProfile({
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || '',
              address: user.address || '',
              website: user.website || '',
              businessDescription: user.businessDescription || ''
            });
            if (user.website) {
              setHasWebsite(true);
              setWebsiteUrl(user.website);
            }
          }
          // Allow users to access onboarding wizard even after completion
          // This lets them update their settings
          // Note: Removed auto-redirect to dashboard
        }
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    // Automatically add https:// if no protocol is specified
    let formattedUrl = websiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setExtracting(true);
    try {
      const response = await fetch('/api/onboarding/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract website data');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract data');
      }

      // Access the extracted data from the response
      const extracted = data.extractedData || {};
      
      // Count how many fields were extracted
      const extractedFields = [
        extracted.companyName,
        extracted.email,
        extracted.phone,
        extracted.address,
        extracted.description
      ].filter(field => field && field.trim()).length;

      // Update the website URL with the formatted version
      setWebsiteUrl(formattedUrl);

      // Update company profile with extracted data
      setCompanyProfile({
        name: extracted.companyName || companyProfile.name,
        email: extracted.email || companyProfile.email,
        phone: extracted.phone || companyProfile.phone,
        address: extracted.address || companyProfile.address,
        website: formattedUrl,
        businessDescription: extracted.description || companyProfile.businessDescription
      });

      if (extractedFields > 0) {
        toast.success(`Successfully extracted ${extractedFields} field(s) from the website!`);
      } else {
        toast.info('No data could be extracted. Please fill in the fields manually.');
      }
    } catch (error: any) {
      console.error('Extract error:', error);
      toast.error(error.message || 'Could not extract website data. Please check the URL and try again.');
    } finally {
      setExtracting(false);
    }
  };

  const saveStep = async (stepData: any) => {
    setSaving(true);
    try {
      console.log('💾 Saving step data:', JSON.stringify(stepData, null, 2));
      const response = await fetch('/api/onboarding/update-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🔴 Server error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to save step data');
      }

      const { user } = await response.json();
      console.log('✅ Step saved successfully');
      setOnboardingData((prev: any) => ({ ...prev, ...stepData }));
      return true;
    } catch (error: any) {
      console.error('🔴 Error saving step:', error);
      toast.error(error.message || 'Failed to save progress');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const validateCurrentStep = () => {
    console.log('🔍 Validating step:', currentStep);
    console.log('📊 Current onboardingData:', JSON.stringify(onboardingData, null, 2));
    
    // Validate step 1
    if (currentStep === 1) {
      if (hasWebsite === null) {
        toast.error('Please indicate if you have a website');
        return false;
      }
      if (hasWebsite && !websiteUrl.trim()) {
        toast.error('Please enter your website URL');
        return false;
      }
      if (!companyProfile.name?.trim()) {
        toast.error('Company name is required');
        return false;
      }
    }

    // Validate step 2 - Business Profile
    if (currentStep === 2) {
      console.log('✅ Checking businessCategory:', onboardingData.businessCategory);
      console.log('✅ Checking industryNiche:', onboardingData.industryNiche);
      console.log('✅ Checking productsServices:', onboardingData.productsServices);
      console.log('✅ Checking targetAudience:', onboardingData.targetAudience);
      
      if (!onboardingData.businessCategory?.trim()) {
        toast.error('Please select a business category');
        console.error('❌ Missing businessCategory');
        return false;
      }
      if (!onboardingData.industryNiche?.trim()) {
        toast.error('Please select an industry niche');
        console.error('❌ Missing industryNiche');
        return false;
      }
      if (!onboardingData.productsServices?.trim()) {
        toast.error('Please describe your products/services');
        console.error('❌ Missing productsServices');
        return false;
      }
      if (!onboardingData.targetAudience?.trim()) {
        toast.error('Please describe your target audience');
        console.error('❌ Missing targetAudience');
        return false;
      }
    }

    // Steps 3-6 are optional, no validation required
    console.log('✅ Validation passed!');
    return true;
  };

  const handleNext = async () => {
    // Wait a tick to ensure state updates have completed
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Validate current step
    if (!validateCurrentStep()) {
      return;
    }

    // Save data for the current step
    let dataToSave: any = {};

    if (currentStep === 1) {
      // Save company profile
      dataToSave = {
        name: companyProfile.name,
        email: companyProfile.email,
        phone: companyProfile.phone,
        address: companyProfile.address,
        website: companyProfile.website,
        businessDescription: companyProfile.businessDescription
      };
    } else {
      // For other steps, save the onboardingData
      dataToSave = onboardingData;
    }

    const saved = await saveStep(dataToSave);
    if (!saved) return;

    // Move to next step
    if (currentStep < STEPS.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Update max step reached if we're moving forward
      if (nextStep > maxStepReached) {
        setMaxStepReached(nextStep);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleComplete = async () => {
    const saved = await saveStep({ onboardingCompleted: true });
    if (saved) {
      // Clear the localStorage draft since onboarding is complete
      clearLocalStorageDraft();
      toast.success('🎉 Welcome to your CRM!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset your onboarding progress? This will clear all entered data.')) {
      return;
    }

    try {
      const response = await fetch('/api/onboarding/update-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: null,
          businessDescription: null,
          businessCategory: null,
          industryNiche: null,
          productsServices: null,
          targetAudience: null,
          onboardingCompleted: false
        })
      });

      if (response.ok) {
        // Clear localStorage draft
        clearLocalStorageDraft();
        toast.success('Onboarding reset successfully');
        // Reset local state
        setCurrentStep(1);
        setHasWebsite(null);
        setWebsiteUrl('');
        setCompanyProfile({
          name: '',
          email: '',
          phone: '',
          address: '',
          website: '',
          businessDescription: ''
        });
        setOnboardingData({});
      } else {
        toast.error('Failed to reset onboarding');
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      toast.error('Failed to reset onboarding');
    }
  };

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  // Show loading while checking auth and loading data, or while mounting
  if (!mounted || loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (status === 'unauthenticated' || !session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome to Soshogle CRM</h1>
              <p className="text-muted-foreground">
                Let's set up your CRM in just a few steps. We'll configure everything for you.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Reset Progress
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium">Step {currentStep} of {STEPS.length}</p>
              <p className="text-xs text-muted-foreground">{STEPS[currentStep - 1].name}</p>
            </div>
            <p className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Navigation */}
        <div className="grid grid-cols-7 gap-2 mb-8">
          {STEPS.map((step) => {
            const isClickable = step.id <= maxStepReached;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep || (step.id < maxStepReached);
            
            return (
              <div
                key={step.id}
                onClick={() => {
                  if (isClickable) {
                    setCurrentStep(step.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`text-center p-3 rounded-md transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : isCompleted
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : isClickable
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-muted text-muted-foreground'
                } ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-60'}`}
                title={isClickable ? `Go to ${step.name}` : 'Complete previous steps first'}
              >
                <p className="text-sm font-semibold mb-1">{step.id}</p>
                <p className="text-[10px] leading-tight truncate">{step.name}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <Card className="p-6 mb-6" suppressHydrationWarning>
          {/* Step 1: Website & Company */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Do You Have a Website?</h2>
                <p className="text-muted-foreground">
                  We can automatically extract your company information from your website.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  variant={hasWebsite === true ? 'default' : 'outline'}
                  onClick={() => setHasWebsite(true)}
                  className="flex-1"
                  size="lg"
                >
                  Yes, I have a website
                </Button>
                <Button
                  variant={hasWebsite === false ? 'default' : 'outline'}
                  onClick={() => setHasWebsite(false)}
                  className="flex-1"
                  size="lg"
                >
                  No website yet
                </Button>
              </div>

              {hasWebsite && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website URL</label>
                    <p className="text-xs text-muted-foreground">Enter your company website (e.g., example.com or https://example.com)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="example.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="flex-1 px-3 py-2 border border-input rounded-md"
                        disabled={extracting}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && websiteUrl.trim() && !extracting) {
                            e.preventDefault();
                            handleExtractWebsite();
                          }
                        }}
                      />
                      <Button
                        onClick={handleExtractWebsite}
                        disabled={extracting || !websiteUrl.trim()}
                      >
                        {extracting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          'Extract Data'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {hasWebsite !== null && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Company Profile</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Name *</label>
                      <input
                        type="text"
                        placeholder="Enter company name"
                        value={companyProfile.name}
                        onChange={(e) => setCompanyProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        placeholder="company@example.com"
                        value={companyProfile.email}
                        onChange={(e) => setCompanyProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone</label>
                      <input
                        type="tel"
                        placeholder="+1234567890"
                        value={companyProfile.phone}
                        onChange={(e) => setCompanyProfile(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Address</label>
                      <input
                        type="text"
                        placeholder="123 Main St, City"
                        value={companyProfile.address}
                        onChange={(e) => setCompanyProfile(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Description</label>
                    <textarea
                      placeholder="Briefly describe what your company does..."
                      value={companyProfile.businessDescription}
                      onChange={(e) => setCompanyProfile(prev => ({ ...prev, businessDescription: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Business Profile */}
          {currentStep === 2 && (
            <div key="step-2">
              <BusinessProfileStep
                data={onboardingData}
                onChange={(data) => setOnboardingData((prev: any) => ({ ...prev, ...data }))}
              />
            </div>
          )}

          {/* Step 3: Sales Configuration */}
          {currentStep === 3 && (
            <div key="step-3">
              <SalesConfigStep
                data={onboardingData}
                onChange={(data) => setOnboardingData((prev: any) => ({ ...prev, ...data }))}
                currency={onboardingData.currency || 'USD'}
              />
            </div>
          )}

          {/* Step 4: Email & Calendar */}
          {currentStep === 4 && (
            <div key="step-4">
              <MessagingStep
                onNext={handleNext}
                onBack={handleBack}
              />
            </div>
          )}

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <div key="step-5">
              <PaymentStep
                data={onboardingData}
                onChange={(data) => setOnboardingData((prev: any) => ({ ...prev, ...data }))}
              />
            </div>
          )}

          {/* Step 6: Marketing & AI */}
          {currentStep === 6 && (
            <div key="step-6">
              <MarketingAIStep
                data={onboardingData}
                onChange={(data) => setOnboardingData((prev: any) => ({ ...prev, ...data }))}
              />
            </div>
          )}

          {/* Step 7: Review & Launch */}
          {currentStep === 7 && (
            <div key="step-7">
              <ReviewLaunchStep
                allData={{ ...companyProfile, ...onboardingData }}
                onComplete={handleComplete}
              />
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        {currentStep < 7 && currentStep !== 4 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || saving}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

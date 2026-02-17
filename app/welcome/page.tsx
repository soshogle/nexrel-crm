
'use client';

// Fixed: useSession destructuring with fallback
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Briefcase, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const INDUSTRIES = [
  { value: 'ACCOUNTING', label: 'Accounting' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'SPORTS_CLUB', label: 'Sports Club' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'LAW', label: 'Law' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'DENTIST', label: 'Dentist' },
  { value: 'MEDICAL_SPA', label: 'Medical Spa' },
  { value: 'OPTOMETRIST', label: 'Optometrist' },
  { value: 'HEALTH_CLINIC', label: 'Health Clinic' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'HOSPITAL', label: 'Hospital' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'ORTHODONTIST', label: 'Orthodontist' },
];

export default function WelcomePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const handleContinue = async () => {
    if (!selectedIndustry) {
      toast.error('Please select your industry to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/set-industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: selectedIndustry }),
      });

      if (!response.ok) {
        throw new Error('Failed to save industry');
      }

      toast.success('Industry saved! Redirecting to your dashboard...');
      
      // Small delay for better UX
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error saving industry:', error);
      toast.error('Failed to save industry. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header with Logo */}
      <div className="border-b border-gray-800 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image
                src="/soshogle-logo.png"
                alt="Soshogle Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="text-xl font-bold gradient-text">Soshogle AI CRM</span>
              <p className="text-xs text-gray-400">Your AI Business Ecosystem</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Welcome Card */}
          <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-800 rounded-lg p-8 sm:p-12 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-6">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                <span className="text-white">Welcome to </span>
                <span className="gradient-text">Soshogle AI</span>
              </h1>
              
              <p className="text-lg text-gray-400">
                Your AI Business Ecosystem
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
              <label htmlFor="industry-select" className="block text-sm font-medium text-gray-300 mb-3">
                What industry are you in?
              </label>
              
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger 
                  id="industry-select"
                  className="w-full bg-gray-800 border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500"
                >
                  <SelectValue placeholder="Select your industry..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {INDUSTRIES.map((industry) => (
                    <SelectItem
                      key={industry.value}
                      value={industry.value}
                      className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {selectedIndustry === industry.value && (
                          <Check className="h-4 w-4 text-purple-500" />
                        )}
                        <span>{industry.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedIndustry && (
                <p className="mt-3 text-sm text-gray-400 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Great choice! Your CRM will be customized for the{' '}
                  <span className="font-medium text-white">
                    {INDUSTRIES.find(i => i.value === selectedIndustry)?.label}
                  </span>{' '}
                  industry.
                </p>
              )}
            </div>

            <Button
              onClick={handleContinue}
              disabled={!selectedIndustry || isSubmitting}
              className="w-full gradient-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Setting up your CRM...
                </>
              ) : (
                'Continue to Dashboard'
              )}
            </Button>

            <p className="mt-4 text-xs text-center text-gray-500">
              Don't worry, you can customize your settings later in the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

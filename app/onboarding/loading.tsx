
import { Loader2 } from 'lucide-react';

export default function OnboardingLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Onboarding Wizard</h2>
        <p className="text-gray-600">Setting up your personalized experience...</p>
      </div>
    </div>
  );
}

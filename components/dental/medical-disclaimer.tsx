/**
 * Medical Device Disclaimer Component
 * Displays regulatory disclaimers for AI analysis and medical imaging
 */

'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MedicalDisclaimerProps {
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

export function MedicalDisclaimer({ variant = 'default', className = '' }: MedicalDisclaimerProps) {
  const t = useTranslations('dental.disclaimer');

  const disclaimers = [
    t('aiInfoOnly') || 'AI analysis is for information purposes only',
    t('notDiagnostic') || 'Not for diagnostic use',
    t('requiresInterpretation') || 'Requires professional interpretation',
    t('notSubstitute') || 'Not a substitute for professional judgment',
  ];

  if (variant === 'compact') {
    return (
      <div className={`text-xs text-yellow-600 ${className}`}>
        <AlertCircle className="w-3 h-3 inline mr-1" />
        <span className="font-semibold">Disclaimer: </span>
        {disclaimers.join(' • ')}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`text-xs text-yellow-600 ${className}`}>
        <AlertCircle className="w-3 h-3 inline mr-1" />
        {disclaimers.join(' • ')}
      </span>
    );
  }

  return (
    <div className={`p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded-lg ${className}`}>
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
          <p className="font-semibold">IMPORTANT DISCLAIMER:</p>
          {disclaimers.map((disclaimer, idx) => (
            <p key={idx}>• {disclaimer}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

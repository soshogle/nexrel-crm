/**
 * Redesigned Insurance Claims Integration Component
 * Exact match to image - claim entries with status icons (green checkmark, orange dollar), amounts
 */

'use client';

import { CheckCircle2, DollarSign } from 'lucide-react';

interface InsuranceClaim {
  id: string;
  provider: string;
  amount: number;
  status: 'Approved' | 'Funding' | 'Pending';
}

interface RedesignedInsuranceClaimsProps {
  claims?: InsuranceClaim[];
}

export function RedesignedInsuranceClaims({ claims }: RedesignedInsuranceClaimsProps) {
  // Mock data matching image exactly
  const defaultClaims: InsuranceClaim[] = [
    {
      id: 'PI2345',
      provider: 'BlueCross BlueShield',
      amount: 850,
      status: 'Approved',
    },
    {
      id: 'H78910',
      provider: 'Delta Dental',
      amount: 1300,
      status: 'Funding',
    },
  ];

  const displayClaims = claims && claims.length > 0 ? claims : defaultClaims;

  return (
    <div className="space-y-2">
      {displayClaims.slice(0, 2).map((claim, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-900">
              Claim {claim.id} - {claim.provider}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <div className="text-right">
              <div className="text-xs font-bold text-gray-900">${claim.amount.toLocaleString()}</div>
            </div>
            {claim.status === 'Approved' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : claim.status === 'Funding' ? (
              <DollarSign className="w-4 h-4 text-orange-600 flex-shrink-0" />
            ) : (
              <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

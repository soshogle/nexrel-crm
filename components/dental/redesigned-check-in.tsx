/**
 * Redesigned Check-In Touch-screen Component
 * Exact match to image - welcome message with Check-in/Update Info buttons
 */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User } from 'lucide-react';

interface RedesignedCheckInProps {
  patientName?: string;
  onCheckIn?: () => void;
  onUpdateInfo?: () => void;
}

export function RedesignedCheckIn({ patientName = 'John Smith', onCheckIn, onUpdateInfo }: RedesignedCheckInProps) {
  return (
    <div className="space-y-4 text-center">
      {/* User Icon */}
      <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
        <User className="w-8 h-8 text-purple-600" />
      </div>

      {/* Welcome Message */}
      <div>
        <p className="text-sm font-medium text-gray-900 mb-1">
          Welcome, {patientName}!
        </p>
        <p className="text-xs text-gray-600 mb-4">
          Please confirm your appointment.
        </p>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={onCheckIn}
        >
          Check-in
        </Button>
        <Button
          variant="outline"
          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={onUpdateInfo}
        >
          Update info
        </Button>
      </div>

      {/* Patient Name Input */}
      <div className="pt-2">
        <Input
          placeholder="Patient Name"
          className="h-8 text-xs border border-gray-300"
          defaultValue={patientName}
        />
      </div>
    </div>
  );
}

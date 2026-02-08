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
    <div className="space-y-4 text-center px-2">
      {/* User Icon - EXACT match to image */}
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
        <User className="w-10 h-10 text-white" strokeWidth={2} />
      </div>

      {/* Welcome Message - EXACT match */}
      <div>
        <p className="text-base font-bold text-gray-900 mb-1">
          Welcome, {patientName}!
        </p>
        <p className="text-sm text-gray-600">
          Please confirm your appointment.
        </p>
      </div>

      {/* Buttons - EXACT match to image */}
      <div className="space-y-2.5">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-md"
          onClick={onCheckIn}
        >
          Check-in
        </Button>
        <Button
          variant="outline"
          className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg"
          onClick={onUpdateInfo}
        >
          Update info
        </Button>
      </div>

      {/* Patient Name Input - EXACT match */}
      <div className="pt-2">
        <Input
          placeholder="Patient Name"
          className="h-10 text-sm border-2 border-gray-300 rounded-lg px-3 text-center"
          defaultValue={patientName}
        />
      </div>
    </div>
  );
}

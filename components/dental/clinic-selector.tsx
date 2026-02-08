/**
 * Clinic Selector Component
 * Allows users to switch between clinics
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Clinic {
  id: string;
  name: string;
  role: string;
  isPrimary: boolean;
  membershipId: string;
}

interface ClinicSelectorProps {
  onClinicChange?: (clinicId: string) => void;
}

export function ClinicSelector({ onClinicChange }: ClinicSelectorProps) {
  const { data: session } = useSession();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClinics();
  }, [session]);

  const fetchClinics = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/clinics');
      if (response.ok) {
        const data = await response.json();
        setClinics(data.clinics || []);
        
        // Set primary clinic as default
        const primary = data.clinics?.find((c: Clinic) => c.isPrimary);
        if (primary) {
          setSelectedClinicId(primary.id);
          onClinicChange?.(primary.id);
        }
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClinicChange = async (clinicId: string) => {
    setSelectedClinicId(clinicId);
    
    // Update active clinic context
    try {
      const response = await fetch('/api/clinics/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      });

      if (response.ok) {
        const clinic = clinics.find(c => c.id === clinicId);
        toast.success(`Switched to ${clinic?.name || 'clinic'}`);
        onClinicChange?.(clinicId);
      }
    } catch (error) {
      console.error('Error switching clinic:', error);
      toast.error('Failed to switch clinic');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Building2 className="w-4 h-4" />
        <span>Loading clinics...</span>
      </div>
    );
  }

  if (clinics.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="bg-white/10 backdrop-blur-sm border-white/20 text-white"
        onClick={() => toast.info('Create clinic feature coming soon')}
      >
        <Plus className="w-4 h-4 mr-1" />
        Create Clinic
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-white" />
      <Select
        value={selectedClinicId || '__none__'}
        onValueChange={(value) => {
          if (value !== '__none__') {
            handleClinicChange(value);
          }
        }}
      >
        <SelectTrigger className="w-48 bg-white/10 backdrop-blur-sm border-white/20 text-white">
          <SelectValue placeholder="Select clinic" />
        </SelectTrigger>
        <SelectContent>
          {clinics.map((clinic) => (
            <SelectItem key={clinic.id} value={clinic.id}>
              <div className="flex items-center justify-between w-full">
                <span>{clinic.name}</span>
                {clinic.isPrimary && (
                  <span className="ml-2 text-xs text-purple-400">Primary</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

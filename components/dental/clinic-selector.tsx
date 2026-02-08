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
import { ClinicManagementDialog } from './clinic-management-dialog';

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
  const [showManageDialog, setShowManageDialog] = useState(false);

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

  const handleManageSuccess = () => {
    fetchClinics();
    setShowManageDialog(false);
  };

  if (clinics.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/10 backdrop-blur-sm border-white/20 text-white"
          onClick={() => setShowManageDialog(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Clinic
        </Button>
        <ClinicManagementDialog
          open={showManageDialog}
          onOpenChange={setShowManageDialog}
          clinics={clinics}
          onSuccess={handleManageSuccess}
        />
      </>
    );
  }

  return (
    <>
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
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
          onClick={() => setShowManageDialog(true)}
          title="Manage Clinics"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
      <ClinicManagementDialog
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
        clinics={clinics}
        onSuccess={handleManageSuccess}
      />
    </>
  );
}

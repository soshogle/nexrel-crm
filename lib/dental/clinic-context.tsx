/**
 * Clinic Context Provider
 * Provides active clinic context throughout the app
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface Clinic {
  id: string;
  name: string;
  role: string;
  isPrimary: boolean;
  membershipId: string;
}

interface ClinicContextType {
  activeClinic: Clinic | null;
  clinics: Clinic[];
  setActiveClinic: (clinic: Clinic | null) => void;
  refreshClinics: () => Promise<void>;
  loading: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [activeClinic, setActiveClinicState] = useState<Clinic | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClinics = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/clinics');
      if (response.ok) {
        const data = await response.json();
        const clinicsList = data.clinics || [];
        setClinics(clinicsList);
        
        // Set primary clinic as active
        const primary = clinicsList.find((c: Clinic) => c.isPrimary);
        if (primary && !activeClinic) {
          setActiveClinicState(primary);
        }
      }
    } catch (error) {
      console.error('Error fetching clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, [session]);

  const setActiveClinic = (clinic: Clinic | null) => {
    setActiveClinicState(clinic);
    if (clinic) {
      // Store in localStorage for persistence
      localStorage.setItem('activeClinicId', clinic.id);
    }
  };

  // Load active clinic from localStorage on mount
  useEffect(() => {
    if (clinics.length > 0 && !activeClinic) {
      const savedClinicId = localStorage.getItem('activeClinicId');
      const savedClinic = savedClinicId 
        ? clinics.find(c => c.id === savedClinicId)
        : clinics.find(c => c.isPrimary);
      
      if (savedClinic) {
        setActiveClinicState(savedClinic);
      }
    }
  }, [clinics]);

  return (
    <ClinicContext.Provider
      value={{
        activeClinic,
        clinics,
        setActiveClinic,
        refreshClinics: fetchClinics,
        loading,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function useDentalData() {
  const { data: session } = useSession();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [odontogramData, setOdontogramData] = useState<any>(null);
  const [periodontalData, setPeriodontalData] = useState<any>(null);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [formResponses, setFormResponses] = useState<any[]>([]);
  const [ramqClaims, setRamqClaims] = useState<any[]>([]);
  const [xrays, setXrays] = useState<any[]>([]);
  const [selectedXray, setSelectedXray] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingClaims: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => { setMounted(true); }, []);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointmentsRes = await fetch(`/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`);
      const fetchedAppointments = appointmentsRes.ok ? await appointmentsRes.json() : [];

      let pendingClaims = 0;
      if (session?.user?.id) {
        try {
          const claimsRes = await fetch(`/api/dental/ramq/claims?userId=${session.user.id}`);
          const claims = claimsRes.ok ? await claimsRes.json() : [];
          pendingClaims = Array.isArray(claims) ? claims.filter((c: any) => c.status === 'DRAFT' || c.status === 'SUBMITTED').length : 0;
        } catch (error) {
          console.error('Error fetching claims:', error);
        }
      }

      let monthlyRevenue = 0;
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const plansRes = await Promise.all(
          leads.map(async (lead) => {
            try {
              const res = await fetch(`/api/dental/treatment-plans?leadId=${lead.id}`);
              if (res.ok) { const data = await res.json(); return data.plans || []; }
              return [];
            } catch { return []; }
          })
        );

        const allPlans = plansRes.flat();
        monthlyRevenue = allPlans
          .filter((plan: any) => {
            const planDate = new Date(plan.createdDate);
            return planDate >= startOfMonth && (plan.status === 'APPROVED' || plan.status === 'IN_PROGRESS' || plan.status === 'COMPLETED');
          })
          .reduce((sum: number, plan: any) => sum + (plan.totalCost || 0), 0);
      } catch (error) {
        console.error('Error calculating revenue:', error);
      }

      setStats({
        totalPatients: leads.length,
        todayAppointments: Array.isArray(fetchedAppointments) ? fetchedAppointments.length : 0,
        pendingClaims,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [leads, session?.user?.id]);

  const fetchLeads = useCallback(async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        const leadsArray = Array.isArray(data) ? data : (data.leads || []);
        setLeads(leadsArray);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOdontogram = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/odontogram?leadId=${selectedLeadId}`);
      if (response.ok) { const data = await response.json(); setOdontogramData(data.odontogram?.toothData || null); }
    } catch (error) { console.error('Error fetching odontogram:', error); setOdontogramData(null); }
  }, [selectedLeadId]);

  const fetchPeriodontalChart = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/periodontal?leadId=${selectedLeadId}`);
      if (response.ok) { const data = await response.json(); setPeriodontalData(data.charts?.[0]?.measurements || null); }
    } catch (error) { console.error('Error fetching periodontal chart:', error); setPeriodontalData(null); }
  }, [selectedLeadId]);

  const fetchTreatmentPlans = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/treatment-plans?leadId=${selectedLeadId}`);
      if (response.ok) { const data = await response.json(); setTreatmentPlans(data.plans || []); }
    } catch (error) { console.error('Error fetching treatment plans:', error); setTreatmentPlans([]); }
  }, [selectedLeadId]);

  const fetchProcedures = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/procedures?leadId=${selectedLeadId}`);
      if (response.ok) { const data = await response.json(); setProcedures(data.procedures || []); }
    } catch (error) { console.error('Error fetching procedures:', error); setProcedures([]); }
  }, [selectedLeadId]);

  const fetchForms = useCallback(async () => {
    try {
      const response = await fetch('/api/dental/forms?type=templates');
      if (response.ok) { const data = await response.json(); setForms(data.forms || []); }
    } catch (error) { console.error('Error fetching forms:', error); }
  }, []);

  const fetchFormResponses = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/forms?type=responses&leadId=${selectedLeadId}`);
      if (response.ok) { const data = await response.json(); setFormResponses(data.responses || []); }
    } catch (error) { console.error('Error fetching form responses:', error); setFormResponses([]); }
  }, [selectedLeadId]);

  const fetchRAMQClaims = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const response = await fetch(`/api/dental/ramq/claims?userId=${session.user.id}${selectedLeadId ? `&leadId=${selectedLeadId}` : ''}`);
      if (response.ok) { const data = await response.json(); setRamqClaims(Array.isArray(data) ? data : []); }
    } catch (error) { console.error('Error fetching RAMQ claims:', error); setRamqClaims([]); }
  }, [session?.user?.id, selectedLeadId]);

  const fetchXrays = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/xrays?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        setXrays(Array.isArray(data) ? data : []);
        if (data.length > 0 && !selectedXray) { setSelectedXray(data[0]); }
      }
    } catch (error) { console.error('Error fetching X-rays:', error); setXrays([]); }
  }, [selectedLeadId, selectedXray]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (leads.length > 0) {
      fetchStats();
      if (!selectedLeadId && leads[0]) { setSelectedLeadId(leads[0].id); }
    }
  }, [leads, selectedLeadId, fetchStats]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchOdontogram(); fetchPeriodontalChart(); fetchTreatmentPlans();
      fetchProcedures(); fetchForms(); fetchFormResponses();
      fetchRAMQClaims(); fetchXrays();
    }
  }, [selectedLeadId, fetchOdontogram, fetchPeriodontalChart, fetchTreatmentPlans, fetchProcedures, fetchForms, fetchFormResponses, fetchRAMQClaims, fetchXrays]);

  useEffect(() => {
    const fetchAppointmentsData = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const response = await fetch(`/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`);
        if (response.ok) { const data = await response.json(); setAppointments(Array.isArray(data) ? data : []); }
      } catch (error) { console.error('Error fetching appointments:', error); }
    };
    if (session?.user?.id) { fetchAppointmentsData(); }
  }, [session?.user?.id]);

  const handleSaveOdontogram = async (toothData: any) => {
    if (!selectedLeadId) { toast.error('Please select a patient first'); return; }
    try {
      const response = await fetch('/api/dental/odontogram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLeadId, toothData }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save odontogram');
      toast.success('Odontogram saved successfully');
      setOdontogramData(toothData);
    } catch (error: any) { toast.error('Failed to save odontogram: ' + error.message); }
  };

  const handleSavePeriodontalChart = async (measurements: any) => {
    if (!selectedLeadId) { toast.error('Please select a patient first'); return; }
    try {
      const response = await fetch('/api/dental/periodontal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLeadId, measurements }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save periodontal chart');
      toast.success('Periodontal chart saved successfully');
      setPeriodontalData(measurements);
      await fetchPeriodontalChart();
    } catch (error: any) { toast.error('Failed to save periodontal chart: ' + error.message); }
  };

  return {
    session, selectedLeadId, setSelectedLeadId, leads, loading, mounted, stats,
    odontogramData, periodontalData, treatmentPlans, procedures, forms,
    formResponses, ramqClaims, xrays, selectedXray, appointments,
    handleSaveOdontogram, handleSavePeriodontalChart,
    fetchTreatmentPlans, fetchXrays,
  };
}

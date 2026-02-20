/**
 * Dental Management Page
 * EXACT match to design mockup - Card by card redesign
 * Pan-able canvas with all panels matching image exactly
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText, Activity, ClipboardList, Calendar, Stethoscope,
  Users, DollarSign,
} from 'lucide-react';
import { DentalCardGrid } from '@/components/dental/dental-card-grid';
import { DentalModals } from '@/components/dental/dental-modals';

function PanableCanvas({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-auto"
      style={{ scrollBehavior: 'smooth', cursor: 'grab' }}
      onMouseDown={(e) => {
        if (containerRef.current) {
          const startX = e.pageX - containerRef.current.scrollLeft;
          const startY = e.pageY - containerRef.current.scrollTop;
          const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
              containerRef.current.scrollLeft = e.pageX - startX;
              containerRef.current.scrollTop = e.pageY - startY;
            }
          };
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }
      }}
    >
      <div className="min-w-[1400px] p-4">
        {children}
      </div>
    </div>
  );
}

export default function DentalTestPage() {
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
  const [openModal, setOpenModal] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointmentsRes = await fetch(`/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`);
      const appointmentsData = appointmentsRes.ok ? await appointmentsRes.json() : [];

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
        todayAppointments: Array.isArray(appointmentsData) ? appointmentsData.length : 0,
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
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const selectedPatient = leads.find(l => l.id === selectedLeadId);

  const displayProcedures = procedures.length > 0
    ? procedures.slice(0, 4).map((proc: any) => ({
        time: new Date(proc.datePerformed || proc.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        patient: leads.find(l => l.id === proc.leadId)?.contactPerson || leads.find(l => l.id === proc.leadId)?.businessName || 'Unknown',
        procedure: proc.procedureName || proc.description || 'Procedure',
        status: proc.status || 'Completed',
        color: proc.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : proc.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700',
      }))
    : [
        { time: '10:00 AM', patient: 'Sarah Jones', procedure: 'Orthodontic Adjustment', status: 'Online', color: 'bg-green-100 text-green-700' },
        { time: '10:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', status: 'Restorative', color: 'bg-teal-100 text-teal-700' },
        { time: '11:00 AM', patient: 'Lola Rone', procedure: 'Orthodontic (Recal)', status: 'Adjustment', color: 'bg-blue-100 text-blue-700' },
        { time: '11:30 AM', patient: 'Shem Jones', procedure: 'Check-in', status: 'Check-in', color: 'bg-blue-50 text-blue-600' },
      ];

  const displayTreatmentPlans = treatmentPlans.length > 0
    ? treatmentPlans.slice(0, 3).map((plan: any) => ({
        code: plan.cdtCode || 'N/A',
        name: plan.procedureName || plan.description || 'Treatment',
        cost: plan.cost || plan.estimatedCost || 0,
        timeline: plan.timeline || 'Week 1',
        icon: plan.type === 'EVALUATION' ? ClipboardList : plan.type === 'PREVENTIVE' ? Activity : Stethoscope,
        costColor: (plan.cost || plan.estimatedCost || 0) < 200 ? 'bg-green-100 text-green-700' : (plan.cost || plan.estimatedCost || 0) < 500 ? 'bg-orange-100 text-orange-700' : 'bg-purple-600 text-white',
      }))
    : [
        { code: 'D0150', name: 'Comprehensive Oral Eval', cost: 120, timeline: 'Week 1', icon: ClipboardList, costColor: 'bg-green-100 text-green-700' },
        { code: 'D1110', name: 'Prophylaxis - Adult', cost: 150, timeline: 'Week 2', icon: Activity, costColor: 'bg-orange-100 text-orange-700' },
        { code: 'D2740', name: 'Crown - Porcelain/Ceramic', cost: 1200, timeline: 'Weeks 3-8', icon: Stethoscope, costColor: 'bg-purple-600 text-white' },
      ];

  const displayFormResponses = formResponses.length > 0
    ? formResponses.slice(0, 3).map((resp: any) => ({
        date: new Date(resp.submittedAt || resp.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        patient: leads.find(l => l.id === resp.leadId)?.contactPerson || leads.find(l => l.id === resp.leadId)?.businessName || 'Unknown',
        form: forms.find(f => f.id === resp.formId)?.name || 'Form',
        submission: new Date(resp.submittedAt || resp.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        time: 'Forms Submitted',
      }))
    : [
        { date: '06/13/2022', patient: 'Sarah Jones', form: 'New Patient Registration', submission: '06/13/2022', time: 'Forms Submitted' },
        { date: '06/18/2022', patient: 'John Nbes', form: 'New Patient Registration', submission: '06/18/2022', time: 'Forms Submitted' },
        { date: '06/19/2022', patient: 'Michael Brown', form: 'New Patient Registration', submission: '06/19/2022', time: 'Forms Submitted' },
      ];

  const displayClaims = ramqClaims.length > 0
    ? ramqClaims.slice(0, 2).map((claim: any) => ({
        id: claim.claimNumber || claim.id || 'N/A',
        provider: claim.providerName || claim.insuranceProvider || 'Insurance',
        amount: claim.amount || claim.totalAmount || 0,
        status: claim.status === 'APPROVED' ? 'Approved' : claim.status === 'PENDING' || claim.status === 'SUBMITTED' ? 'Pending' : 'Draft',
      }))
    : [
        { id: 'PI2345', provider: 'BlueCross BlueShield', amount: 850, status: 'Approved' },
        { id: 'M78910', provider: 'Delta Dental', amount: 1300, status: 'Pending' },
      ];

  const displayMultiChairAppointments = appointments.length > 0
    ? appointments.slice(0, 4).map((apt: any, idx: number) => {
        const patient = leads.find(l => l.id === apt.leadId);
        const chairTypes = ['Ortho', 'Hygiene', 'Ortho', 'Restorative'];
        const colors = ['bg-green-100 border-green-300', 'bg-teal-100 border-teal-300', 'bg-green-100 border-green-300', 'bg-teal-100 border-teal-300'];
        return {
          chair: `Chair ${idx + 1} - ${chairTypes[idx]}`,
          time: `${new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${new Date(apt.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
          patient: patient?.contactPerson || patient?.businessName || 'Unknown',
          procedure: apt.title || apt.description || 'Appointment',
          color: colors[idx] || 'bg-gray-100 border-gray-300',
        };
      })
    : [
        { chair: 'Chair 1 - Ortho', time: '9:00 AM - 10:00 AM', patient: 'Emily White', procedure: 'Ortho Adjustment', color: 'bg-green-100 border-green-300' },
        { chair: 'Chair 2 - Hygiene', time: '10:30 AM - 11:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', color: 'bg-teal-100 border-teal-300' },
        { chair: 'Chair 3 - Ortho', time: '10:00 AM - 11:00 AM', patient: 'Emily White', procedure: 'Ortho Adjustment', color: 'bg-green-100 border-green-300' },
        { chair: 'Chair 4 - Restorative', time: '10:30 AM - 11:30 AM', patient: 'Michael Brown', procedure: 'Prophylaxis', color: 'bg-teal-100 border-teal-300' },
      ];

  return (
    <PanableCanvas>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Dental Management</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedLeadId || ''} onValueChange={(value) => setSelectedLeadId(value)}>
            <SelectTrigger className="w-64 h-9 border border-gray-300 text-sm"><SelectValue placeholder="Select a patient..." /></SelectTrigger>
            <SelectContent>
              {leads.map((lead) => (
                <SelectItem key={lead.id} value={lead.id}>{lead.contactPerson || lead.businessName || lead.email || lead.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPatient && (
            <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-xs px-2 py-1">
              {selectedPatient.contactPerson || selectedPatient.businessName}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-purple-600' },
          { label: "Today's Appointments", value: stats.todayAppointments, icon: Calendar, color: 'text-blue-600' },
          { label: 'Pending Claims', value: stats.pendingClaims, icon: FileText, color: 'text-amber-600' },
          { label: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
        ].map((stat, idx) => (
          <Card key={idx} className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                </div>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DentalCardGrid
        selectedLeadId={selectedLeadId}
        sessionUserId={session?.user?.id}
        odontogramData={odontogramData}
        periodontalData={periodontalData}
        selectedXray={selectedXray}
        displayProcedures={displayProcedures}
        displayTreatmentPlans={displayTreatmentPlans}
        displayFormResponses={displayFormResponses}
        displayClaims={displayClaims}
        displayMultiChairAppointments={displayMultiChairAppointments}
        onOpenModal={setOpenModal}
      />

      <DentalModals
        openModal={openModal}
        onCloseModal={() => setOpenModal(null)}
        selectedLeadId={selectedLeadId}
        sessionUserId={session?.user?.id}
        odontogramData={odontogramData}
        periodontalData={periodontalData}
        selectedXray={selectedXray}
        displayProcedures={displayProcedures}
        displayTreatmentPlans={displayTreatmentPlans}
        displayFormResponses={displayFormResponses}
        displayClaims={displayClaims}
        displayMultiChairAppointments={displayMultiChairAppointments}
        onSaveOdontogram={handleSaveOdontogram}
        onSavePeriodontalChart={handleSavePeriodontalChart}
        onTreatmentPlanSaved={async () => { await fetchTreatmentPlans(); toast.success('Treatment plan saved'); }}
        onXrayRefresh={fetchXrays}
      />
    </PanableCanvas>
  );
}

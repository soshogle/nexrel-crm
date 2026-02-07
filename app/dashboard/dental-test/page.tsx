/**
 * Dental Management Page
 * EXACT match to design mockup - Card by card redesign
 * Pan-able canvas with all panels matching image exactly
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PeriodontalBarChart } from '@/components/dental/periodontal-bar-chart';
import { PeriodontalChart } from '@/components/dental/periodontal-chart';
import { CustomOdontogramDisplay } from '@/components/dental/custom-odontogram-display';
import { EnhancedOdontogramDisplay } from '@/components/dental/enhanced-odontogram-display';
import { CustomFormsBuilder } from '@/components/dental/custom-forms-builder';
import { CustomMultiChairAgenda } from '@/components/dental/custom-multi-chair-agenda';
import { CustomXRayAnalysis } from '@/components/dental/custom-xray-analysis';
import { DicomViewer } from '@/components/dental/dicom-viewer';
import { CustomDocumentUpload } from '@/components/dental/custom-document-upload';
import { CustomSignature } from '@/components/dental/custom-signature';
import { CardModal } from '@/components/dental/card-modal';
import { Odontogram } from '@/components/dental/odontogram';
import { TreatmentPlanBuilder } from '@/components/dental/treatment-plan-builder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  FileText,
  Activity,
  ClipboardList,
  Calendar,
  Stethoscope,
  FormInput,
  Monitor,
  Building2,
  PenTool,
  Scan,
  User,
  Users,
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  Upload,
  ChevronLeft,
  ChevronRight,
  File,
  Image as ImageIcon,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Circle,
  X,
  Eye,
} from 'lucide-react';

// Pan-able Canvas - Smooth scrolling like landing page
function PanableCanvas({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-auto"
      style={{
        scrollBehavior: 'smooth',
        cursor: 'grab',
      }}
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
      <div className="min-w-[1600px] min-h-[1400px] p-6 bg-white">
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
  const [activeMultiChairTab, setActiveMultiChairTab] = useState<'ortho' | 'hygiene' | 'restorative'>('ortho');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingClaims: 0,
    monthlyRevenue: 0,
  });
  const [openModal, setOpenModal] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointmentsRes = await fetch(
        `/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`
      );
      const appointments = appointmentsRes.ok ? await appointmentsRes.json() : [];

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
              if (res.ok) {
                const data = await res.json();
                return data.plans || [];
              }
              return [];
            } catch {
              return [];
            }
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
        todayAppointments: Array.isArray(appointments) ? appointments.length : 0,
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
        console.log('Fetched leads:', leadsArray.length);
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
      if (response.ok) {
        const data = await response.json();
        setOdontogramData(data.odontogram?.toothData || null);
      }
    } catch (error) {
      console.error('Error fetching odontogram:', error);
      setOdontogramData(null);
    }
  }, [selectedLeadId]);

  const fetchPeriodontalChart = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/periodontal?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        const latestChart = data.charts?.[0];
        setPeriodontalData(latestChart?.measurements || null);
      }
    } catch (error) {
      console.error('Error fetching periodontal chart:', error);
      setPeriodontalData(null);
    }
  }, [selectedLeadId]);

  const fetchTreatmentPlans = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/treatment-plans?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        setTreatmentPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
      setTreatmentPlans([]);
    }
  }, [selectedLeadId]);

  const fetchProcedures = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/procedures?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        setProcedures(data.procedures || []);
      }
    } catch (error) {
      console.error('Error fetching procedures:', error);
      setProcedures([]);
    }
  }, [selectedLeadId]);

  const fetchForms = useCallback(async () => {
    try {
      const response = await fetch('/api/dental/forms?type=templates');
      if (response.ok) {
        const data = await response.json();
        setForms(data.forms || []);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  }, []);

  const fetchFormResponses = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/forms?type=responses&leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        setFormResponses(data.responses || []);
      }
    } catch (error) {
      console.error('Error fetching form responses:', error);
      setFormResponses([]);
    }
  }, [selectedLeadId]);

  const fetchRAMQClaims = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const response = await fetch(`/api/dental/ramq/claims?userId=${session.user.id}${selectedLeadId ? `&leadId=${selectedLeadId}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        setRamqClaims(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching RAMQ claims:', error);
      setRamqClaims([]);
    }
  }, [session?.user?.id, selectedLeadId]);

  const fetchXrays = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/xrays?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        setXrays(Array.isArray(data) ? data : []);
        if (data.length > 0 && !selectedXray) {
          setSelectedXray(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching X-rays:', error);
      setXrays([]);
    }
  }, [selectedLeadId, selectedXray]);

  // useEffect hooks after function declarations
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (leads.length > 0) {
      fetchStats();
      // Auto-select first patient
      if (!selectedLeadId && leads[0]) {
        setSelectedLeadId(leads[0].id);
      }
    }
  }, [leads, selectedLeadId, fetchStats]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchOdontogram();
      fetchPeriodontalChart();
      fetchTreatmentPlans();
      fetchProcedures();
      fetchForms();
      fetchFormResponses();
      fetchRAMQClaims();
      fetchXrays();
    }
  }, [selectedLeadId, fetchOdontogram, fetchPeriodontalChart, fetchTreatmentPlans, fetchProcedures, fetchForms, fetchFormResponses, fetchRAMQClaims, fetchXrays]);

  // Fetch appointments for multi-chair agenda
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const response = await fetch(`/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`);
        if (response.ok) {
          const data = await response.json();
          setAppointments(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };
    if (session?.user?.id) {
      fetchAppointments();
    }
  }, [session?.user?.id]);

  const handleSaveOdontogram = async (toothData: any) => {
    if (!selectedLeadId) {
      toast.error('Please select a patient first');
      return;
    }
    try {
      const response = await fetch('/api/dental/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          toothData,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save odontogram');
      }
      toast.success('Odontogram saved successfully');
      setOdontogramData(toothData);
    } catch (error: any) {
      toast.error('Failed to save odontogram: ' + error.message);
    }
  };

  const handleSavePeriodontalChart = async (measurements: any) => {
    if (!selectedLeadId) {
      toast.error('Please select a patient first');
      return;
    }
    try {
      const response = await fetch('/api/dental/periodontal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          measurements,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save periodontal chart');
      }
      toast.success('Periodontal chart saved successfully');
      setPeriodontalData(measurements);
      await fetchPeriodontalChart();
    } catch (error: any) {
      toast.error('Failed to save periodontal chart: ' + error.message);
    }
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

  // Transform fetched data to match display format, with fallback to mock data
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
          <Select
            value={selectedLeadId || ''}
            onValueChange={(value) => setSelectedLeadId(value)}
          >
            <SelectTrigger className="w-64 h-9 border border-gray-300 text-sm">
              <SelectValue placeholder="Select a patient..." />
            </SelectTrigger>
            <SelectContent>
              {leads.map((lead) => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.contactPerson || lead.businessName || lead.email || lead.id}
                </SelectItem>
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

      {/* TOP ROW - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 1. Arch Odontogram */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenModal('odontogram')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Arch Odontogram</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100" onClick={(e) => e.stopPropagation()}>
                  <ChevronLeft className="h-3 w-3 text-gray-600" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100" onClick={(e) => e.stopPropagation()}>
                  <ChevronRight className="h-3 w-3 text-gray-600" />
                </Button>
              </div>
            </div>
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Select defaultValue="treatment">
                <SelectTrigger className="h-7 text-xs w-full border border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treatment">Hover affected by: Treatment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <div>
                <EnhancedOdontogramDisplay toothData={odontogramData} />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* 2. Procedures Activity Log */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenModal('procedures')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Procedures Activity Log</CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="Search..." className="h-7 w-28 text-xs border border-gray-300" />
                <Select defaultValue="today">
                  <SelectTrigger className="h-7 text-xs w-20 border border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {displayProcedures.map((proc, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs border-b border-gray-100 pb-2">
                  <div className="w-16 text-gray-600 font-medium">{proc.time}</div>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{proc.patient}</div>
                      <div className="text-gray-600 truncate">{proc.procedure}</div>
                    </div>
                  </div>
                  <Badge className={`text-xs px-2 py-0.5 ${proc.color} border-0`}>
                    {proc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Treatment Plan Builder */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenModal('treatment-plan')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Treatment Plan Builder</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {displayTreatmentPlans.map((plan, idx) => {
                const IconComponent = plan.icon;
                return (
                  <div key={idx} className="flex items-center gap-2 p-2 border border-gray-200 rounded">
                    <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900">{plan.code}</div>
                      <div className="text-xs text-gray-600 truncate">{plan.name}</div>
                    </div>
                    <Badge className={`text-xs px-2 py-1 ${plan.costColor} border-0 font-semibold`}>
                      ${plan.cost}
                    </Badge>
                    <div className="text-xs text-gray-500 w-16 text-right">{plan.timeline}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE ROW - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 4. Periodontal Charting */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenModal('periodontal')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Periodontal Charting</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <PeriodontalBarChart measurements={periodontalData} />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* 5. Forms Builder */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenModal('forms-builder')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Forms Builder</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {session?.user?.id ? (
              <CustomFormsBuilder />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
            )}
          </CardContent>
        </Card>

        {/* 6. Form Responses */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenModal('form-responses')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Form Responses</CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="Search..." className="h-7 w-28 text-xs border border-gray-300" />
                <Select defaultValue="all">
                  <SelectTrigger className="h-7 text-xs w-24 border border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Forms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {displayFormResponses.map((response, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs border-b border-gray-100 pb-2">
                  <div className="w-20 text-gray-600">{response.date}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{response.patient}</div>
                    <div className="text-gray-600 truncate">{response.form}</div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 text-xs border-0">Submitted</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM ROW - Split Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* 7. Document Upload - 3 columns */}
        <div className="col-span-3">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Document Upload</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {selectedLeadId ? (
                <CustomDocumentUpload />
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 8. Check-In Touch-screen - 3 columns */}
        <div className="col-span-3">
          <Card 
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setOpenModal('check-in')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Check-In Touch-screen</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {session?.user?.id ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Welcome, John Smith!</p>
                    <p className="text-xs text-gray-600 mb-4">Please confirm your appointment.</p>
                  </div>
                  <Input placeholder="Patient name" className="mb-3 border border-gray-300" />
                  <div className="flex gap-2">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white flex-1">Check-In</Button>
                    <Button variant="outline" className="border-gray-300 flex-1">Update Info</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 9. Multi-Chair Agenda - 3 columns */}
        <div className="col-span-3">
          <Card 
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setOpenModal('multi-chair')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Multi-Chair Agenda</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {session?.user?.id ? (
                <CustomMultiChairAgenda appointments={displayMultiChairAppointments} />
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 10-12. Right Column - 3 sections stacked - 3 columns */}
        <div className="col-span-3 space-y-4">
          {/* 10. Insurance Claims Integration */}
          <Card 
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setOpenModal('insurance-claims')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Insurance Claims Integration</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {displayClaims.map((claim, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        Claim {claim.id} - {claim.provider}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-xs font-bold text-gray-900">${claim.amount}</div>
                      {claim.status === 'Approved' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-1" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-600 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 11. X-Ray Analysis */}
          <Card 
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setOpenModal('xray-analysis')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">X-Ray Analysis</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {selectedLeadId && session?.user?.id ? (
                <CustomXRayAnalysis xrayData={selectedXray} />
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
              )}
            </CardContent>
          </Card>

          {/* 12. Electronic Signature Capture */}
          <Card 
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setOpenModal('signature')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Electronic signature capture</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {session?.user?.id ? (
                <CustomSignature />
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CardModal
        isOpen={openModal === 'odontogram'}
        onClose={() => setOpenModal(null)}
        title="Arch Odontogram"
      >
        {selectedLeadId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Select defaultValue="treatment">
                <SelectTrigger className="h-8 w-64 border border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treatment">Hover affected by: Treatment</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </div>
            <Odontogram
              leadId={selectedLeadId}
              initialData={odontogramData}
              onSave={handleSaveOdontogram}
            />
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'treatment-plan'}
        onClose={() => setOpenModal(null)}
        title="Treatment Plan Builder"
      >
        {selectedLeadId ? (
          <TreatmentPlanBuilder
            leadId={selectedLeadId}
            onSave={async (data) => {
              await fetchTreatmentPlans();
              toast.success('Treatment plan saved');
            }}
          />
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'procedures'}
        onClose={() => setOpenModal(null)}
        title="Procedures Activity Log"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Input placeholder="Search..." className="h-8 flex-1 border border-gray-300" />
            <Select defaultValue="today">
              <SelectTrigger className="h-8 w-32 border border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {displayProcedures.map((proc, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="w-20 text-gray-600 font-medium">{proc.time}</div>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{proc.patient}</div>
                  <div className="text-sm text-gray-600">{proc.procedure}</div>
                </div>
              </div>
              <Badge className={`text-sm px-3 py-1 ${proc.color} border-0`}>
                {proc.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'periodontal'}
        onClose={() => setOpenModal(null)}
        title="Periodontal Charting"
      >
        {selectedLeadId ? (
          <PeriodontalChart
            leadId={selectedLeadId}
            initialData={periodontalData}
            onSave={handleSavePeriodontalChart}
          />
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'forms-builder'}
        onClose={() => setOpenModal(null)}
        title="Forms Builder"
      >
        {session?.user?.id ? (
          <CustomFormsBuilder />
        ) : (
          <div className="text-center py-16 text-gray-400">Please sign in</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'form-responses'}
        onClose={() => setOpenModal(null)}
        title="Form Responses"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Input placeholder="Search..." className="h-8 flex-1 border border-gray-300" />
            <Select defaultValue="all">
              <SelectTrigger className="h-8 w-40 border border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {displayFormResponses.map((response, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="w-24 text-gray-600">{response.date}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{response.patient}</div>
                <div className="text-sm text-gray-600">{response.form}</div>
              </div>
              <Badge className="bg-green-100 text-green-700 text-sm border-0">Submitted</Badge>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'document-upload'}
        onClose={() => setOpenModal(null)}
        title="Document Upload"
      >
        {selectedLeadId ? (
          <CustomDocumentUpload />
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'check-in'}
        onClose={() => setOpenModal(null)}
        title="Check-In Touch-screen"
      >
        {session?.user?.id ? (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">Welcome, John Smith!</p>
              <p className="text-sm text-gray-600 mb-6">Please confirm your appointment.</p>
            </div>
            <Input placeholder="Patient name" className="mb-4 border border-gray-300 h-10" />
            <div className="flex gap-3">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white flex-1 h-10">Check-In</Button>
              <Button variant="outline" className="border-gray-300 flex-1 h-10">Update Info</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Please sign in</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'multi-chair'}
        onClose={() => setOpenModal(null)}
        title="Multi-Chair Agenda"
      >
        {session?.user?.id ? (
          <CustomMultiChairAgenda appointments={displayMultiChairAppointments} />
        ) : (
          <div className="text-center py-16 text-gray-400">Please sign in</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'insurance-claims'}
        onClose={() => setOpenModal(null)}
        title="Insurance Claims Integration"
      >
        <div className="space-y-3">
          {displayClaims.map((claim, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">
                  Claim {claim.id} - {claim.provider}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg font-bold text-gray-900">${claim.amount}</div>
                {claim.status === 'Approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 mx-auto" />
                ) : (
                  <Clock className="w-5 h-5 text-orange-600 mt-1 mx-auto" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'xray-analysis'}
        onClose={() => setOpenModal(null)}
        title="X-Ray Analysis"
      >
        {selectedLeadId && session?.user?.id && selectedXray ? (
          <div className="h-[calc(100vh-200px)]">
            <DicomViewer
              xrayId={selectedXray.id}
              imageUrl={selectedXray.imageUrl || `/api/dental/xrays/${selectedXray.id}/image`}
              dicomFile={selectedXray.dicomFile || undefined}
              xrayType={selectedXray.xrayType}
              initialAnalysis={selectedXray.aiAnalysis}
              onAnalysisComplete={(analysis) => {
                // Refresh X-ray data
                fetchXrays();
              }}
            />
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient and X-ray</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'signature'}
        onClose={() => setOpenModal(null)}
        title="Electronic Signature Capture"
      >
        {session?.user?.id ? (
          <CustomSignature />
        ) : (
          <div className="text-center py-16 text-gray-400">Please sign in</div>
        )}
      </CardModal>
    </PanableCanvas>
  );
}

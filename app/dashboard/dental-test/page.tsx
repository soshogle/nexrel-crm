/**
 * Dental Management Page
 * Complete dental practice management system - Command Center Layout
 * Matches the design mockup exactly with all panels visible simultaneously
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Odontogram as OdontogramComponent } from '@/components/dental/odontogram';
import { DocumentUpload } from '@/components/dental/document-upload';
import { PeriodontalChart } from '@/components/dental/periodontal-chart';
import { TreatmentPlanBuilder } from '@/components/dental/treatment-plan-builder';
import { ProcedureLog } from '@/components/dental/procedure-log';
import { FormsBuilder } from '@/components/dental/forms-builder';
import { FormResponsesViewer } from '@/components/dental/form-responses-viewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  FileText,
  Activity,
  ClipboardList,
  Calendar,
  Stethoscope,
  FormInput,
  FileCheck,
  Monitor,
  Grid3x3,
  Building2,
  PenTool,
  Scan,
  User,
  Users,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  Image as ImageIcon,
  File,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TouchScreenWelcome } from '@/components/dental/touch-screen-welcome';
import { MultiChairAgenda } from '@/components/dental/multi-chair-agenda';
import { RAMQIntegration } from '@/components/dental/ramq-integration';
import { ElectronicSignature } from '@/components/dental/electronic-signature';
import { XRayUpload } from '@/components/dental/xray-upload';

// Component wrapper for multi-chair agenda with professional selector
function MultiChairAgendaWithProfessionalSelector({ userId }: { userId: string }) {
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(userId);
  const [professionals, setProfessionals] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);

  useEffect(() => {
    fetchProfessionals();
  }, [userId]);

  const fetchProfessionals = async () => {
    try {
      setLoadingProfessionals(true);
      const teamResponse = await fetch('/api/team');
      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        const teamMembers = teamData.members?.map((m: any) => ({
          id: m.user?.id || m.id,
          name: m.user?.name || m.name || 'Unknown',
          email: m.user?.email || m.email || '',
        })) || [];
        
        const currentUser = teamData.currentUser;
        if (currentUser) {
          const allProfessionals = [
            { id: currentUser.id, name: currentUser.name || 'Me', email: currentUser.email || '' },
            ...teamMembers.filter((m: any) => m.id !== currentUser.id),
          ];
          setProfessionals(allProfessionals);
          if (!selectedProfessionalId || selectedProfessionalId === userId) {
            setSelectedProfessionalId(currentUser.id);
          }
        } else {
          setProfessionals([{ id: userId, name: 'Me', email: '' }]);
        }
      } else {
        setProfessionals([{ id: userId, name: 'Me', email: '' }]);
      }
    } catch (error) {
      console.error('Error fetching professionals:', error);
      setProfessionals([{ id: userId, name: 'Me', email: '' }]);
    } finally {
      setLoadingProfessionals(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Select
          value={selectedProfessionalId}
          onValueChange={setSelectedProfessionalId}
          disabled={loadingProfessionals}
        >
          <SelectTrigger className="w-48 h-8 text-xs border-purple-200">
            <SelectValue placeholder="Select professional..." />
          </SelectTrigger>
          <SelectContent>
            {professionals.map((professional) => (
              <SelectItem key={professional.id} value={professional.id}>
                {professional.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <MultiChairAgenda
        userId={selectedProfessionalId}
        selectedDate={new Date()}
        onAppointmentUpdated={() => {
          toast.success('Appointment updated');
        }}
      />
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
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingClaims: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (leads.length > 0) {
      fetchStats();
    }
  }, [leads]);

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
  }, [selectedLeadId]);

  const fetchStats = async () => {
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
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchOdontogram = async () => {
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
  };

  const fetchPeriodontalChart = async () => {
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
  };

  const fetchTreatmentPlans = async () => {
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
  };

  const fetchProcedures = async () => {
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
  };

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/dental/forms?type=templates');
      if (response.ok) {
        const data = await response.json();
        setForms(data.forms || []);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const fetchFormResponses = async () => {
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
  };

  const fetchRAMQClaims = async () => {
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
  };

  const fetchXrays = async () => {
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
  };

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

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dental Management</h1>
        <div className="flex items-center gap-4">
          <Select
            value={selectedLeadId || ''}
            onValueChange={(value) => setSelectedLeadId(value)}
          >
            <SelectTrigger className="w-64 border-purple-200">
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
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              {selectedPatient.contactPerson || selectedPatient.businessName}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Patients</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalPatients}</p>
              </div>
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Today&apos;s Appointments</p>
                <p className="text-xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pending Claims</p>
                <p className="text-xl font-bold text-gray-900">{stats.pendingClaims}</p>
              </div>
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Monthly Revenue</p>
                <p className="text-xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Layout - Top Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Arch Odontogram - Top Left */}
        <Card className="bg-white border-purple-200 shadow-sm h-full flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Arch Odontogram</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-2">
              <Select defaultValue="treatment">
                <SelectTrigger className="h-7 text-xs w-full border-purple-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treatment">Hover affected by: Treatment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-auto min-h-[400px]">
            {selectedLeadId ? (
              <div className="h-full [&>div]:border-0 [&>div]:shadow-none">
                <OdontogramComponent
                  leadId={selectedLeadId}
                  initialData={odontogramData}
                  onSave={handleSaveOdontogram}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* Procedures Activity Log - Top Center */}
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Procedures Activity Log</CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="Search..." className="h-7 w-32 text-xs border-purple-200" />
                <Select defaultValue="today">
                  <SelectTrigger className="h-7 text-xs w-24 border-purple-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {selectedLeadId ? (
              <div className="space-y-2">
                {procedures.slice(0, 5).map((proc: any, idx: number) => (
                  <div key={proc.id || idx} className="flex items-center gap-3 text-xs border-b border-gray-100 pb-2">
                    <div className="w-16 text-gray-600">{new Date(proc.performedDate || proc.scheduledDate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{selectedPatient?.contactPerson || 'Patient'}</div>
                      <div className="text-gray-600">{proc.procedureName || proc.procedureCode}</div>
                    </div>
                    <Badge 
                      className={`text-xs ${
                        proc.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        proc.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-700' :
                        proc.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {proc.status || 'Scheduled'}
                    </Badge>
                  </div>
                ))}
                {procedures.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">No procedures</div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* Treatment Plan Builder - Top Right */}
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Treatment Plan Builder</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedLeadId ? (
              <div className="space-y-3">
                {treatmentPlans.slice(0, 1).flatMap((plan: any) => 
                  (plan.procedures || []).slice(0, 3).map((proc: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-2 border border-purple-100 rounded">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-900">{proc.procedureCode || 'D0150'}</div>
                        <div className="text-xs text-gray-600">{proc.description || 'Comprehensive Oral Eval'}</div>
                      </div>
                      <Badge className="bg-purple-600 text-white text-xs px-2 py-1">
                        ${proc.cost || 120}
                      </Badge>
                      <div className="text-xs text-gray-500 w-20">
                        {idx === 0 ? 'Week 1' : idx === 1 ? 'Week 2' : 'Weeks 3-4'}
                      </div>
                    </div>
                  ))
                )}
                {treatmentPlans.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">No treatment plans</div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Select a patient</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Periodontal Charting - Middle Left */}
        <Card className="bg-white border-purple-200 shadow-sm h-full flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-sm font-semibold text-gray-900">Periodontal Charting</CardTitle>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-auto min-h-[400px]">
            {selectedLeadId ? (
              <div className="h-full [&>div]:border-0 [&>div]:shadow-none">
                <PeriodontalChart
                  leadId={selectedLeadId}
                  initialData={periodontalData}
                  onSave={handleSavePeriodontalChart}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* Forms Builder - Middle Center */}
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Forms Builder</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {session?.user?.id ? (
              <FormsBuilder
                userId={session.user.id}
                onFormCreated={() => {
                  fetchForms();
                  toast.success('Form created');
                }}
              />
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Please sign in</div>
            )}
          </CardContent>
        </Card>

        {/* Form Responses - Middle Right */}
        <Card className="bg-white border-purple-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Form Responses</CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="Search..." className="h-7 w-32 text-xs border-purple-200" />
                <Select defaultValue="all">
                  <SelectTrigger className="h-7 text-xs w-28 border-purple-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Forms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {selectedLeadId ? (
              <div className="space-y-2">
                {formResponses.slice(0, 5).map((response: any, idx: number) => (
                  <div key={response.id || idx} className="flex items-center gap-3 text-xs border-b border-gray-100 pb-2">
                    <div className="w-20 text-gray-600">{new Date(response.submittedAt || Date.now()).toLocaleDateString()}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{selectedPatient?.contactPerson || 'Patient'}</div>
                      <div className="text-gray-600">{response.form?.formName || 'Form'}</div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs">Submitted</Badge>
                  </div>
                ))}
                {formResponses.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">No responses</div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Select a patient</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Document Upload - Bottom Left */}
        <div className="col-span-3">
          <Card className="bg-white border-purple-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Document Upload</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {selectedLeadId ? (
                <DocumentUpload
                  leadId={selectedLeadId}
                  onUploadComplete={() => {
                    toast.success('Document uploaded');
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">Select a patient</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Check-In Touch-screen - Bottom Center-Left */}
        <div className="col-span-3">
          <Card className="bg-white border-purple-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Check-In Touch-screen</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {session?.user?.id ? (
                <TouchScreenWelcome
                  userId={session.user.id}
                  onCheckIn={() => {
                    toast.success('Patient checked in');
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Multi-Chair Agenda - Bottom Center-Right */}
        <div className="col-span-3">
          <Card className="bg-white border-purple-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Multi-Chair Agenda</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {session?.user?.id ? (
                <MultiChairAgendaWithProfessionalSelector userId={session.user.id} />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Split into 3 sections */}
        <div className="col-span-3 space-y-4">
          {/* Insurance Claims Integration - Top */}
          <Card className="bg-white border-purple-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Insurance Claims Integration</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {session?.user?.id ? (
                <div className="space-y-2">
                  {ramqClaims.slice(0, 3).map((claim: any, idx: number) => (
                    <div key={claim.id || idx} className="flex items-center justify-between p-2 border border-purple-100 rounded">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-900">Claim #{claim.claimNumber || claim.id?.slice(-5)}</div>
                        <div className="text-xs text-gray-600">{claim.procedureName || 'Procedure'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-900">${claim.amount || 0}</div>
                        {claim.status === 'APPROVED' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-1" />
                        ) : (
                          <Clock className="w-4 h-4 text-orange-600 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                  {ramqClaims.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">No claims</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">Please sign in</div>
              )}
            </CardContent>
          </Card>

          {/* X-Ray Analysis - Middle */}
          <Card className="bg-white border-purple-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">X-Ray Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {selectedLeadId && session?.user?.id ? (
                <div className="space-y-3">
                  {selectedXray && selectedXray.aiAnalysis ? (
                    <div className="space-y-2 text-xs">
                      <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                        <div className="font-medium text-gray-900">Diagnostic: {selectedXray.aiAnalysis.findings || 'Cavities Detected'}</div>
                        <div className="text-gray-600">Severity: {selectedXray.aiAnalysis.severity || 'Moderate'}</div>
                      </div>
                      {selectedXray.aiAnalysis.details && (
                        <div className="text-xs text-gray-600">
                          {selectedXray.aiAnalysis.details}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">No AI analysis available</div>
                  )}
                  {xrays.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">No X-rays uploaded</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">Select a patient</div>
              )}
            </CardContent>
          </Card>

          {/* Electronic Signature Capture - Bottom */}
          <Card className="bg-white border-purple-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Electronic signature capture</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {session?.user?.id ? (
                <ElectronicSignature
                  userId={session.user.id}
                  leadId={selectedLeadId || undefined}
                  onSignatureComplete={(signatureData) => {
                    toast.success('Signature completed');
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

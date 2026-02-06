/**
 * Dental Management Page
 * Complete dental practice management system with professional design
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Odontogram as OdontogramComponent } from '@/components/dental/odontogram';
import { Odontogram3D } from '@/components/dental/odontogram-3d';
import { DocumentUpload } from '@/components/dental/document-upload';
import { PeriodontalChart } from '@/components/dental/periodontal-chart';
import { TreatmentPlanBuilder } from '@/components/dental/treatment-plan-builder';
import { ProcedureLog } from '@/components/dental/procedure-log';
import { FormsBuilder } from '@/components/dental/forms-builder';
import { FormRenderer } from '@/components/dental/form-renderer';
import { FormResponsesViewer } from '@/components/dental/form-responses-viewer';
import { DocumentGenerator } from '@/components/dental/document-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText,
  Activity,
  ClipboardList,
  Calendar,
  Stethoscope,
  FormInput,
  FileCheck,
  FilePlus,
  Monitor,
  Grid3x3,
  Building2,
  PenTool,
  Scan,
  User,
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  Sparkles,
  RefreshCw,
  Settings,
  Boxes,
  Eye,
  EyeOff,
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

  const selectedProfessional = professionals.find(p => p.id === selectedProfessionalId);

  return (
    <div className="space-y-4">
      <Card className="bg-white border-purple-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <Label className="text-sm font-semibold text-gray-700">Viewing Schedule For:</Label>
            </div>
            <Select
              value={selectedProfessionalId}
              onValueChange={setSelectedProfessionalId}
              disabled={loadingProfessionals}
            >
              <SelectTrigger className="w-64 border-purple-200">
                <SelectValue placeholder="Select professional..." />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-600" />
                      <span>{professional.name}</span>
                      {professional.email && (
                        <span className="text-xs text-gray-500">({professional.email})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProfessional && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedProfessional.name}</span>
                {' '}schedule
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('odontogram');
  const [show3D, setShow3D] = useState(false);
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
      fetchForms();
    }
  }, [selectedLeadId]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchForms();
    }
  }, [session]);

  const fetchStats = async () => {
    try {
      // Fetch appointments for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointmentsRes = await fetch(
        `/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`
      );
      const appointments = appointmentsRes.ok ? await appointmentsRes.json() : [];

      // Fetch RAMQ claims
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

      // Calculate monthly revenue from treatment plans
      let monthlyRevenue = 0;
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        // Fetch all treatment plans for this month
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
      throw error;
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
      throw error;
    }
  };

  const handleSaveTreatmentPlan = async (planData: any) => {
    if (!selectedLeadId) {
      toast.error('Please select a patient first');
      return;
    }

    try {
      const response = await fetch('/api/dental/treatment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planData,
          leadId: selectedLeadId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save treatment plan');
      }

      toast.success('Treatment plan saved successfully');
      await fetchTreatmentPlans();
    } catch (error: any) {
      toast.error('Failed to save treatment plan: ' + error.message);
      throw error;
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

  const handleFormCreated = () => {
    fetchForms();
    toast.success('Form template created successfully');
  };

  const handleFormSelect = async (formId: string) => {
    const form = forms.find(f => f.id === formId);
    if (form) {
      setSelectedForm(form);
      setSelectedFormId(formId);
    }
  };

  const handleFormSubmit = async (responseData: Record<string, any>) => {
    if (!selectedLeadId || !selectedFormId) {
      toast.error('Please select a patient and form');
      return;
    }

    try {
      const response = await fetch('/api/dental/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: selectedFormId,
          leadId: selectedLeadId,
          formData: responseData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Form submitted successfully');
        setSelectedFormId(null);
        setSelectedForm(null);
      } else {
        toast.error(data.error || 'Failed to submit form');
      }
    } catch (error: any) {
      toast.error('Failed to submit form: ' + error.message);
    }
  };

  const handleDocumentUploadComplete = () => {
    toast.success('Document uploaded successfully');
  };

  const handleDocumentGenerated = (documentId: string) => {
    toast.success('Document generated and saved');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/20 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/20 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const selectedPatient = leads.find(l => l.id === selectedLeadId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/20 to-white">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-violet-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-100/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Professional Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/25">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              Dental Management
            </h1>
            <p className="text-gray-600 mt-1">Complete dental practice management system</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-purple-200 bg-white hover:bg-purple-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" className="border-purple-200 bg-white hover:bg-purple-50">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="bg-white border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPatients}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-200">
                  <Users className="w-6 h-6 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">Today&apos;s Appointments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayAppointments}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-200">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Claims</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingClaims}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-200">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">${stats.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-200">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Patient Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white border-purple-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Select Patient</CardTitle>
              <CardDescription>
                Choose a patient to access their dental records and management tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedLeadId || ''}
                onValueChange={(value) => setSelectedLeadId(value)}
              >
                <SelectTrigger className="w-full max-w-md border-purple-200">
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
                <div className="mt-4 flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                    {selectedPatient.contactPerson || selectedPatient.businessName}
                  </Badge>
                  {selectedPatient.email && (
                    <span className="text-sm text-gray-600">{selectedPatient.email}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TabsList className="bg-white border border-purple-200 shadow-sm p-1 flex-wrap h-auto">
              <TabsTrigger
                value="odontogram"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <Activity className="h-4 w-4" />
                Odontogram
              </TabsTrigger>
              <TabsTrigger
                value="periodontal"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <Stethoscope className="h-4 w-4" />
                Periodontal
              </TabsTrigger>
              <TabsTrigger
                value="treatment-plan"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <ClipboardList className="h-4 w-4" />
                Treatment Plan
              </TabsTrigger>
              <TabsTrigger
                value="procedures"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <Calendar className="h-4 w-4" />
                Procedures
              </TabsTrigger>
              <TabsTrigger
                value="forms-builder"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <FormInput className="h-4 w-4" />
                Forms Builder
              </TabsTrigger>
              <TabsTrigger
                value="forms-fill"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <FileCheck className="h-4 w-4" />
                Fill Form
              </TabsTrigger>
              <TabsTrigger
                value="form-responses"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <Boxes className="h-4 w-4" />
                Responses
              </TabsTrigger>
              <TabsTrigger
                value="doc-generator"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <FilePlus className="h-4 w-4" />
                Generate Doc
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <FileText className="h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger
                value="touch-screen"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <Monitor className="h-4 w-4" />
                Check-In
              </TabsTrigger>
              <TabsTrigger
                value="multi-chair"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <Grid3x3 className="h-4 w-4" />
                Multi-Chair
              </TabsTrigger>
              <TabsTrigger
                value="ramq"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <Building2 className="h-4 w-4" />
                RAMQ
              </TabsTrigger>
              <TabsTrigger
                value="signature"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <PenTool className="h-4 w-4" />
                Signature
              </TabsTrigger>
              <TabsTrigger
                value="xray"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm gap-2"
              >
                <Scan className="h-4 w-4" />
                X-Ray
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Tab Contents */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="odontogram" className="mt-0">
                {selectedLeadId ? (
                  <div className="space-y-4">
                    {/* 3D Toggle */}
                    <Card className="bg-white border-purple-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            <Label className="text-sm font-semibold text-gray-700">3D View</Label>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShow3D(!show3D)}
                            className="border-purple-200"
                          >
                            {show3D ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Switch to 2D
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Switch to 3D
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Odontogram Component */}
                    {show3D && odontogramData ? (
                      <Card className="bg-white border-purple-200 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-gray-900">3D Odontogram</CardTitle>
                          <CardDescription>Interactive 3D tooth chart - rotate and zoom</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Odontogram3D
                            leadId={selectedLeadId}
                            toothData={odontogramData}
                          />
                        </CardContent>
                      </Card>
                    ) : (
                      <OdontogramComponent
                        leadId={selectedLeadId}
                        initialData={odontogramData}
                        onSave={handleSaveOdontogram}
                      />
                    )}
                  </div>
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please select a patient to view their odontogram</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="periodontal" className="mt-0">
                {selectedLeadId ? (
                  <PeriodontalChart
                    leadId={selectedLeadId}
                    initialData={periodontalData}
                    onSave={handleSavePeriodontalChart}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please select a patient to view their periodontal chart</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="treatment-plan" className="mt-0">
                {selectedLeadId ? (
                  <TreatmentPlanBuilder
                    leadId={selectedLeadId}
                    onSave={handleSaveTreatmentPlan}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please select a patient to create or view treatment plans</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="procedures" className="mt-0">
                {selectedLeadId ? (
                  <ProcedureLog leadId={selectedLeadId} />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please select a patient to view their procedure log</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="forms-builder" className="mt-0">
                {session?.user?.id ? (
                  <FormsBuilder
                    userId={session.user.id}
                    onFormCreated={handleFormCreated}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <FormInput className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please sign in to create forms</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="forms-fill" className="mt-0">
                {selectedLeadId ? (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Select Form to Fill</CardTitle>
                      <CardDescription>
                        Choose a form template to fill out for this patient
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {forms.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No forms available. Create a form template first.
                        </div>
                      ) : (
                        <>
                          <Select
                            value={selectedFormId || ''}
                            onValueChange={handleFormSelect}
                          >
                            <SelectTrigger className="border-purple-200">
                              <SelectValue placeholder="Select a form..." />
                            </SelectTrigger>
                            <SelectContent>
                              {forms.map((form) => (
                                <SelectItem key={form.id} value={form.id}>
                                  {form.formName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selectedForm && (
                            <FormRenderer
                              formId={selectedForm.id}
                              leadId={selectedLeadId!}
                              formSchema={selectedForm.formSchema}
                              formName={selectedForm.formName}
                              description={selectedForm.description}
                              onSave={handleFormSubmit}
                            />
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please select a patient to fill out forms</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="form-responses" className="mt-0">
                {selectedLeadId ? (
                  <FormResponsesViewer leadId={selectedLeadId!} />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Boxes className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please select a patient to view form responses</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="doc-generator" className="mt-0">
                {selectedLeadId ? (
                  <DocumentGenerator
                    leadId={selectedLeadId!}
                    onDocumentGenerated={handleDocumentGenerated}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <FilePlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please select a patient to generate documents</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                {selectedLeadId ? (
                  <DocumentUpload
                    leadId={selectedLeadId}
                    onUploadComplete={handleDocumentUploadComplete}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please select a patient to upload documents</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="touch-screen" className="mt-0">
                {session?.user?.id ? (
                  <TouchScreenWelcome
                    userId={session.user.id}
                    onCheckIn={() => {
                      toast.success('Patient checked in');
                    }}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please sign in to use check-in system</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="multi-chair" className="mt-0">
                {session?.user?.id ? (
                  <MultiChairAgendaWithProfessionalSelector userId={session.user.id} />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Grid3x3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please sign in to view multi-chair agenda</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ramq" className="mt-0">
                {session?.user?.id ? (
                  <RAMQIntegration
                    userId={session.user.id}
                    leadId={selectedLeadId || undefined}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please sign in to manage RAMQ claims</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="signature" className="mt-0">
                {session?.user?.id ? (
                  <ElectronicSignature
                    userId={session.user.id}
                    leadId={selectedLeadId || undefined}
                    onSignatureComplete={(signatureData) => {
                      toast.success('Signature completed');
                    }}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <PenTool className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please sign in to use electronic signature</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="xray" className="mt-0">
                {session?.user?.id && selectedLeadId ? (
                  <XRayUpload
                    userId={session.user.id}
                    leadId={selectedLeadId}
                    onUploadComplete={() => {
                      toast.success('X-ray uploaded successfully');
                    }}
                  />
                ) : (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardContent className="py-12 text-center">
                      <Scan className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Please sign in and select a patient to upload X-rays</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}

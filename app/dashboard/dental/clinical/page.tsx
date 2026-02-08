/**
 * Clinical Dashboard - Practitioner View
 * Patient-focused clinical tools for dentists/orthodontists during patient care
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { SharedDashboardLayout } from '@/components/dental/shared-dashboard-layout';
import { PeriodontalBarChart } from '@/components/dental/periodontal-bar-chart';
import { EnhancedOdontogramDisplay } from '@/components/dental/enhanced-odontogram-display';
import { CustomXRayAnalysis } from '@/components/dental/custom-xray-analysis';
import { DicomViewer } from '@/components/dental/dicom-viewer';
import { CustomDocumentUpload } from '@/components/dental/custom-document-upload';
import { CardModal } from '@/components/dental/card-modal';
import { DentalWorkflowTemplatesBrowser } from '@/components/dental/workflow-templates-browser';
import { Odontogram } from '@/components/dental/odontogram';
import { TreatmentPlanBuilder } from '@/components/dental/treatment-plan-builder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  FileText,
  Activity,
  ClipboardList,
  Stethoscope,
  Scan,
  User,
  ChevronLeft,
  ChevronRight,
  Brain,
  File,
  PenTool,
} from 'lucide-react';

export default function ClinicalDashboardPage() {
  const { data: session } = useSession();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [odontogramData, setOdontogramData] = useState<any>(null);
  const [periodontalData, setPeriodontalData] = useState<any>(null);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [xrays, setXrays] = useState<any[]>([]);
  const [selectedXray, setSelectedXray] = useState<any | null>(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingClaims: 0,
    monthlyRevenue: 0,
  });
  const [openModal, setOpenModal] = useState<string | null>(null);

  // Fetch leads (patients)
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

  // Fetch odontogram data
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

  // Fetch periodontal chart
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

  // Fetch treatment plans
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

  // Fetch procedures
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

  // Fetch X-rays
  const fetchXrays = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const response = await fetch(`/api/dental/xrays?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        setXrays(data || []);
        if (data && data.length > 0) {
          setSelectedXray(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching X-rays:', error);
      setXrays([]);
    }
  }, [selectedLeadId]);

  // Fetch stats
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

      setStats({
        totalPatients: leads.length,
        todayAppointments: Array.isArray(appointments) ? appointments.length : 0,
        pendingClaims: 0,
        monthlyRevenue: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [leads]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchOdontogram();
      fetchPeriodontalChart();
      fetchTreatmentPlans();
      fetchProcedures();
      fetchXrays();
    }
  }, [selectedLeadId, fetchOdontogram, fetchPeriodontalChart, fetchTreatmentPlans, fetchProcedures, fetchXrays]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Display procedures for today
  const displayProcedures = procedures
    .filter((proc: any) => {
      const procDate = new Date(proc.datePerformed);
      const today = new Date();
      return procDate.toDateString() === today.toDateString();
    })
    .slice(0, 5)
    .map((proc: any) => ({
      time: new Date(proc.datePerformed).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      patient: leads.find((l) => l.id === proc.leadId)?.contactPerson || 'Unknown',
      procedure: proc.procedureCode || 'Procedure',
      status: proc.status || 'Completed',
      color: 'bg-green-100 text-green-700',
    }));

  // Display treatment plans
  const displayTreatmentPlans = treatmentPlans.slice(0, 4).map((plan: any) => ({
    code: plan.id.substring(0, 8),
    name: plan.planName || 'Treatment Plan',
    cost: plan.totalCost || 0,
    timeline: plan.estimatedDuration || 'N/A',
    costColor: 'bg-blue-100 text-blue-700',
    icon: ClipboardList,
  }));

  const handleSaveOdontogram = async (data: any) => {
    toast.success('Odontogram saved successfully');
    fetchOdontogram();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clinical dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <SharedDashboardLayout
      role="clinical"
      selectedLeadId={selectedLeadId}
      leads={leads}
      stats={stats}
      onPatientSelect={setSelectedLeadId}
    >
      {/* CLINICAL CARDS - Patient-focused */}
      
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

        {/* 2. X-Ray Analysis */}
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
              {displayTreatmentPlans.length > 0 ? (
                displayTreatmentPlans.map((plan, idx) => {
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
                })
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">No treatment plans</div>
              )}
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

        {/* 5. Procedures Activity Log */}
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
              {displayProcedures.length > 0 ? (
                displayProcedures.map((proc, idx) => (
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
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">No procedures today</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 6. Clinical Notes */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenModal('clinical-notes')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-600">Quick note entry</div>
                <Button size="sm" variant="outline" className="w-full">
                  <PenTool className="w-3 h-3 mr-1" />
                  Add Note
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM ROW - Document Upload */}
      <div className="grid grid-cols-3 gap-4">
        {/* 7. Document Upload */}
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

      {/* Workflow Templates Section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Workflow Templates</CardTitle>
            <p className="text-sm text-gray-600">Pre-built workflows for clinical tasks</p>
          </CardHeader>
          <CardContent>
            <DentalWorkflowTemplatesBrowser />
          </CardContent>
        </Card>
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
          <TreatmentPlanBuilder leadId={selectedLeadId} />
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
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
              imageUrl={selectedXray.fullUrl || selectedXray.previewUrl || selectedXray.imageUrl || `/api/dental/xrays/${selectedXray.id}/image`}
              dicomFile={selectedXray.dicomFile || undefined}
              xrayType={selectedXray.xrayType}
              initialAnalysis={selectedXray.aiAnalysis}
              onAnalysisComplete={(analysis) => {
                fetchXrays();
              }}
            />
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient and X-ray</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'periodontal'}
        onClose={() => setOpenModal(null)}
        title="Periodontal Charting"
      >
        {selectedLeadId ? (
          <div className="space-y-4">
            <PeriodontalBarChart measurements={periodontalData} />
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'procedures'}
        onClose={() => setOpenModal(null)}
        title="Procedures Activity Log"
      >
        <div className="space-y-2">
          {procedures.length > 0 ? (
            procedures.map((proc: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 p-3 border border-gray-200 rounded">
                <div className="w-20 text-gray-600">
                  {new Date(proc.datePerformed).toLocaleDateString()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{proc.procedureCode}</div>
                  <div className="text-sm text-gray-600">{proc.description}</div>
                </div>
                <Badge>{proc.status}</Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-gray-400">No procedures found</div>
          )}
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'clinical-notes'}
        onClose={() => setOpenModal(null)}
        title="Clinical Notes"
      >
        {selectedLeadId ? (
          <div className="space-y-4">
            <textarea
              className="w-full h-64 p-3 border border-gray-300 rounded-lg"
              placeholder="Enter clinical notes..."
            />
            <Button>Save Note</Button>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>
    </SharedDashboardLayout>
  );
}

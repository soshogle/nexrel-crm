/**
 * Clinical Dashboard - Practitioner View
 * Patient-focused clinical tools for dentists/orthodontists during patient care
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useClinic, ClinicProvider } from '@/lib/dental/clinic-context';
import { SharedDashboardLayout } from '@/components/dental/shared-dashboard-layout';
import { PeriodontalBarChart } from '@/components/dental/periodontal-bar-chart';
import { EnhancedOdontogramDisplay } from '@/components/dental/enhanced-odontogram-display';
import { CustomXRayAnalysis } from '@/components/dental/custom-xray-analysis';
import { RedesignedArchOdontogram } from '@/components/dental/redesigned-arch-odontogram';
import { ExactArchOdontogram } from '@/components/dental/exact-arch-odontogram';
import { RedesignedProceduresLog } from '@/components/dental/redesigned-procedures-log';
import { RedesignedTreatmentPlan } from '@/components/dental/redesigned-treatment-plan';
import { RedesignedPeriodontalChart } from '@/components/dental/redesigned-periodontal-chart';
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

// Clinical Notes Editor Component
function ClinicalNotesEditor({ leadId }: { leadId: string }) {
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    fetchNotes();
  }, [leadId]);

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });

      if (response.ok) {
        toast.success('Clinical note saved successfully');
        setNoteContent('');
        await fetchNotes();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save note');
      }
    } catch (error: any) {
      toast.error('Failed to save note: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">New Clinical Note</label>
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          className="w-full h-48 p-3 border border-gray-300 rounded-lg resize-none"
          placeholder="Enter clinical notes..."
        />
        <Button 
          onClick={handleSaveNote} 
          disabled={saving || !noteContent.trim()}
          className="mt-2"
        >
          {saving ? 'Saving...' : 'Save Note'}
        </Button>
      </div>
      
      {notes.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">Previous Notes</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notes.map((note) => (
              <div key={note.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicalDashboardPageContent() {
  const { data: session } = useSession();
  const { activeClinic } = useClinic();
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
  const [procedureSearch, setProcedureSearch] = useState('');
  const [procedureFilter, setProcedureFilter] = useState('today');
  const [odontogramViewMode, setOdontogramViewMode] = useState<'wisely' | 'treatment' | 'caries' | 'completed'>('treatment');

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
      const clinicIdParam = activeClinic?.id ? `&clinicId=${activeClinic.id}` : '';
      const response = await fetch(`/api/dental/odontogram?leadId=${selectedLeadId}${clinicIdParam}`);
      if (response.ok) {
        const data = await response.json();
        setOdontogramData(data.odontogram?.toothData || null);
      }
    } catch (error) {
      console.error('Error fetching odontogram:', error);
      setOdontogramData(null);
    }
  }, [selectedLeadId, activeClinic?.id]);

  // Fetch periodontal chart
  const fetchPeriodontalChart = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const clinicIdParam = activeClinic?.id ? `&clinicId=${activeClinic.id}` : '';
      const response = await fetch(`/api/dental/periodontal?leadId=${selectedLeadId}${clinicIdParam}`);
      if (response.ok) {
        const data = await response.json();
        const latestChart = data.charts?.[0];
        setPeriodontalData(latestChart?.measurements || null);
      }
    } catch (error) {
      console.error('Error fetching periodontal chart:', error);
      setPeriodontalData(null);
    }
  }, [selectedLeadId, activeClinic?.id]);

  // Fetch treatment plans
  const fetchTreatmentPlans = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const clinicIdParam = activeClinic?.id ? `&clinicId=${activeClinic.id}` : '';
      const response = await fetch(`/api/dental/treatment-plans?leadId=${selectedLeadId}${clinicIdParam}`);
      if (response.ok) {
        const data = await response.json();
        setTreatmentPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
      setTreatmentPlans([]);
    }
  }, [selectedLeadId, activeClinic?.id]);

  // Fetch procedures
  const fetchProcedures = useCallback(async () => {
    if (!selectedLeadId) return;
    try {
      const clinicIdParam = activeClinic?.id ? `&clinicId=${activeClinic.id}` : '';
      const response = await fetch(`/api/dental/procedures?leadId=${selectedLeadId}${clinicIdParam}`);
      if (response.ok) {
        const data = await response.json();
        setProcedures(data.procedures || []);
      }
    } catch (error) {
      console.error('Error fetching procedures:', error);
      setProcedures([]);
    }
  }, [selectedLeadId, activeClinic?.id]);

  // Fetch X-rays
  const fetchXrays = useCallback(async () => {
    if (!selectedLeadId) {
      setXrays([]);
      setSelectedXray(null);
      return;
    }
    try {
      const clinicIdParam = activeClinic?.id ? `&clinicId=${activeClinic.id}` : '';
      const response = await fetch(`/api/dental/xrays?leadId=${selectedLeadId}${clinicIdParam}`);
      if (response.ok) {
        const data = await response.json();
        const xraysArray = data || [];
        setXrays(xraysArray);
        if (xraysArray.length > 0) {
          setSelectedXray(xraysArray[0]);
        } else {
          setSelectedXray(null);
        }
      }
    } catch (error) {
      console.error('Error fetching X-rays:', error);
      setXrays([]);
      setSelectedXray(null);
    }
  }, [selectedLeadId, activeClinic?.id]);

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

  // Display procedures with search and filter
  const displayProcedures = procedures
    .filter((proc: any) => {
      // Search filter
      const patientName = leads.find((l) => l.id === proc.leadId)?.contactPerson || 'Unknown';
      const procedureCode = proc.procedureCode || 'Procedure';
      const searchLower = procedureSearch.toLowerCase();
      if (procedureSearch && !patientName.toLowerCase().includes(searchLower) && !procedureCode.toLowerCase().includes(searchLower)) {
        return false;
      }
      
      // Date filter
      if (procedureFilter === 'today') {
        const procDate = new Date(proc.datePerformed);
        const today = new Date();
        return procDate.toDateString() === today.toDateString();
      } else if (procedureFilter === 'week') {
        const procDate = new Date(proc.datePerformed);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return procDate >= weekAgo;
      }
      return true;
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
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('odontogram')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Arch Odontogram</CardTitle>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 hover:bg-gray-100 active:bg-gray-200 transition-colors" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedLeadId && leads.length > 0) {
                      const currentIndex = leads.findIndex(l => l.id === selectedLeadId);
                      if (currentIndex > 0) {
                        const prevLead = leads[currentIndex - 1];
                        setSelectedLeadId(prevLead.id);
                        toast.success(`Switched to ${prevLead.contactPerson || 'patient'}`);
                      } else {
                        toast.info('Already at first patient');
                      }
                    } else {
                      toast.error('Please select a patient first');
                    }
                  }}
                  disabled={!selectedLeadId || (selectedLeadId ? (leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === 0) : true)}
                >
                  <ChevronLeft className={`h-3 w-3 ${!selectedLeadId || (selectedLeadId && leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === 0) ? 'text-gray-300' : 'text-gray-600'}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 hover:bg-gray-100 active:bg-gray-200 transition-colors" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedLeadId && leads.length > 0) {
                      const currentIndex = leads.findIndex(l => l.id === selectedLeadId);
                      if (currentIndex < leads.length - 1) {
                        const nextLead = leads[currentIndex + 1];
                        setSelectedLeadId(nextLead.id);
                        toast.success(`Switched to ${nextLead.contactPerson || 'patient'}`);
                      } else {
                        toast.info('Already at last patient');
                      }
                    } else {
                      toast.error('Please select a patient first');
                    }
                  }}
                  disabled={!selectedLeadId || (selectedLeadId ? (leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === leads.length - 1) : true)}
                >
                  <ChevronRight className={`h-3 w-3 ${!selectedLeadId || (selectedLeadId && leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === leads.length - 1) ? 'text-gray-300' : 'text-gray-600'}`} />
                </Button>
              </div>
            </div>
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Select 
                value={odontogramViewMode} 
                onValueChange={(value: 'wisely' | 'treatment' | 'caries' | 'completed') => setOdontogramViewMode(value)}
              >
                <SelectTrigger className="h-7 text-xs w-full border border-gray-300 hover:border-gray-400 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    value="wisely" 
                    className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    Hover affected by: Wisely
                  </SelectItem>
                  <SelectItem 
                    value="treatment" 
                    className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    Hover affected by: Treatment
                  </SelectItem>
                  <SelectItem 
                    value="caries" 
                    className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    Hover affected by: Caries
                  </SelectItem>
                  <SelectItem 
                    value="completed" 
                    className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    Hover affected by: Completed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <ExactArchOdontogram 
                toothData={odontogramData} 
                initialViewMode={odontogramViewMode === 'treatment' ? 'treatments' : odontogramViewMode === 'caries' ? 'conditions' : odontogramViewMode === 'completed' ? 'completed' : 'all'}
              />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* 2. X-Ray Analysis */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('xray-analysis')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">X-Ray Analysis</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId && session?.user?.id ? (
              <CustomXRayAnalysis xrayData={selectedXray || (xrays.length > 0 ? xrays[0] : null)} />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* 3. Treatment Plan Builder */}
        <div 
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setOpenModal('treatment-plan')}
        >
          <RedesignedTreatmentPlan
            treatments={displayTreatmentPlans.map((plan: any) => ({
              code: plan.code,
              name: plan.name,
              cost: plan.cost,
              timeline: plan.timeline,
              costColor: plan.costColor,
              icon: plan.icon,
              progress: 50, // Default progress
            }))}
          />
        </div>
      </div>

      {/* MIDDLE ROW - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 4. Periodontal Charting */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('periodontal')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Periodontal Charting</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <RedesignedPeriodontalChart measurements={periodontalData} />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* 5. Procedures Activity Log */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('procedures')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Procedures Activity Log</CardTitle>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Input 
                  placeholder="Search..." 
                  className="h-7 w-28 text-xs border border-gray-300" 
                  value={procedureSearch}
                  onChange={(e) => setProcedureSearch(e.target.value)}
                />
                <Select value={procedureFilter} onValueChange={setProcedureFilter}>
                  <SelectTrigger className="h-7 text-xs w-20 border border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <RedesignedProceduresLog
              procedures={displayProcedures.map((proc: any) => ({
                time: proc.time,
                patient: proc.patient,
                procedure: proc.procedure,
                status: proc.status,
              }))}
            />
          </CardContent>
        </Card>

        {/* 6. Clinical Notes */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('clinical-notes')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-600">Quick note entry</div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenModal('clinical-notes');
                  }}
                >
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
        <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Document Upload</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <CustomDocumentUpload leadId={selectedLeadId} />
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
              <Select 
                value={odontogramViewMode} 
                onValueChange={(value: 'wisely' | 'treatment' | 'caries' | 'completed') => setOdontogramViewMode(value)}
              >
                <SelectTrigger className="h-8 w-64 border border-gray-300 hover:border-gray-400 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    value="wisely" 
                    className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    Hover affected by: Wisely
                  </SelectItem>
                  <SelectItem 
                    value="treatment" 
                    className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    Hover affected by: Treatment
                  </SelectItem>
                  <SelectItem 
                    value="caries" 
                    className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    Hover affected by: Caries
                  </SelectItem>
                  <SelectItem 
                    value="completed" 
                    className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    Hover affected by: Completed
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  onClick={() => {
                    if (selectedLeadId && leads.length > 0) {
                      const currentIndex = leads.findIndex(l => l.id === selectedLeadId);
                      if (currentIndex > 0) {
                        const prevLead = leads[currentIndex - 1];
                        setSelectedLeadId(prevLead.id);
                        toast.success(`Switched to ${prevLead.contactPerson || 'patient'}`);
                      } else {
                        toast.info('Already at first patient');
                      }
                    } else {
                      toast.error('Please select a patient first');
                    }
                  }}
                  disabled={!selectedLeadId || (selectedLeadId ? (leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === 0) : true)}
                >
                  <ChevronLeft className={`h-4 w-4 ${!selectedLeadId || (selectedLeadId && leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === 0) ? 'text-gray-300' : 'text-gray-600'}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  onClick={() => {
                    if (selectedLeadId && leads.length > 0) {
                      const currentIndex = leads.findIndex(l => l.id === selectedLeadId);
                      if (currentIndex < leads.length - 1) {
                        const nextLead = leads[currentIndex + 1];
                        setSelectedLeadId(nextLead.id);
                        toast.success(`Switched to ${nextLead.contactPerson || 'patient'}`);
                      } else {
                        toast.info('Already at last patient');
                      }
                    } else {
                      toast.error('Please select a patient first');
                    }
                  }}
                  disabled={!selectedLeadId || (selectedLeadId ? (leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === leads.length - 1) : true)}
                >
                  <ChevronRight className={`h-4 w-4 ${!selectedLeadId || (selectedLeadId && leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === leads.length - 1) ? 'text-gray-300' : 'text-gray-600'}`} />
                </Button>
              </div>
            </div>
            <ExactArchOdontogram 
              toothData={odontogramData} 
              initialViewMode={odontogramViewMode === 'treatment' ? 'treatments' : odontogramViewMode === 'caries' ? 'conditions' : odontogramViewMode === 'completed' ? 'completed' : 'all'}
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
        {!selectedLeadId ? (
          <div className="text-center py-16 text-gray-400">Select a patient first</div>
        ) : !session?.user?.id ? (
          <div className="text-center py-16 text-gray-400">Please sign in</div>
        ) : xrays.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-gray-400">No X-rays found for this patient</p>
            <p className="text-sm text-gray-500">Upload an X-ray to begin analysis</p>
          </div>
        ) : !selectedXray ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-gray-400">Select an X-ray to analyze</p>
            {xrays.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {xrays.map((xray: any) => (
                  <button
                    key={xray.id}
                    onClick={() => setSelectedXray(xray)}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="font-medium text-sm">{xray.xrayType || 'X-Ray'}</div>
                    <div className="text-xs text-gray-500">
                      {xray.dateTaken ? new Date(xray.dateTaken).toLocaleDateString() : 'No date'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[calc(100vh-200px)]">
            {xrays.length > 1 && (
              <div className="mb-4 flex items-center gap-2">
                <Select
                  value={selectedXray.id}
                  onValueChange={(value) => {
                    const xray = xrays.find((x: any) => x.id === value);
                    if (xray) setSelectedXray(xray);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {xrays.map((xray: any) => (
                      <SelectItem key={xray.id} value={xray.id}>
                        {xray.xrayType || 'X-Ray'} - {xray.dateTaken ? new Date(xray.dateTaken).toLocaleDateString() : 'No date'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
        )}
      </CardModal>

      <CardModal
        isOpen={openModal === 'periodontal'}
        onClose={() => setOpenModal(null)}
        title="Periodontal Charting"
      >
        {selectedLeadId ? (
          <div className="space-y-4">
            <RedesignedPeriodontalChart measurements={periodontalData} />
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
        <RedesignedProceduresLog
          procedures={procedures.map((proc: any) => ({
            time: new Date(proc.datePerformed).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            patient: leads.find((l) => l.id === proc.leadId)?.contactPerson || 'Unknown',
            procedure: proc.procedureCode || 'Procedure',
            status: proc.status || 'Completed',
          }))}
        />
      </CardModal>

      <CardModal
        isOpen={openModal === 'clinical-notes'}
        onClose={() => setOpenModal(null)}
        title="Clinical Notes"
      >
        {selectedLeadId ? (
          <ClinicalNotesEditor leadId={selectedLeadId} />
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>
    </SharedDashboardLayout>
  );
}

export default function ClinicalDashboardPage() {
  return (
    <ClinicProvider>
      <ClinicalDashboardPageContent />
    </ClinicProvider>
  );
}

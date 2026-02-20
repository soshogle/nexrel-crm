/**
 * Administrative Dashboard - Admin Assistant View
 * Operations-focused dashboard for scheduling, billing, and practice management
 * Includes Phase 4 Production Features
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { SharedDashboardLayout } from '@/components/dental/shared-dashboard-layout';
import { ProductionDashboard } from '@/components/dental/production-dashboard';
import { TeamPerformanceCard } from '@/components/dental/team-performance-card';
import { DentalWorkflowTemplatesBrowser } from '@/components/dental/workflow-templates-browser';
import { CustomMultiChairAgenda } from '@/components/dental/custom-multi-chair-agenda';
import { CustomDocumentUpload } from '@/components/dental/custom-document-upload';
import { RedesignedCheckIn } from '@/components/dental/redesigned-check-in';
import { RedesignedFormResponses } from '@/components/dental/redesigned-form-responses';
import { RedesignedInsuranceClaims } from '@/components/dental/redesigned-insurance-claims';
import { AdminModals } from '@/components/dental/admin-modals';
import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Calendar,
  DollarSign,
  FileText,
  Users,
  ClipboardList,
  Building2,
  CheckCircle2,
  Clock,
  Upload,
  User,
  Search,
  TrendingUp,
  Server,
} from 'lucide-react';

export default function AdministrativeDashboardPage() {
  const { data: session } = useSession();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [formResponses, setFormResponses] = useState<any[]>([]);
  const [productionMetrics, setProductionMetrics] = useState({
    dailyProduction: 0,
    weeklyProduction: 0,
    monthlyProduction: 0,
    casesStartedToday: 0,
    casesCompletedToday: 0,
    activeTreatments: 0,
    chairUtilization: 75,
    teamProductivity: 85,
    productionTrend: 'up' as 'up' | 'down' | 'stable',
    revenueTrend: 12.5,
  });
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', name: 'Dr. Smith', role: 'Orthodontist', production: 12500, cases: 8, efficiency: 92, trend: 'up' as const },
    { id: '2', name: 'Dr. Johnson', role: 'Orthodontist', production: 9800, cases: 6, efficiency: 88, trend: 'up' as const },
    { id: '3', name: 'Sarah Miller', role: 'Hygienist', production: 3200, cases: 12, efficiency: 95, trend: 'stable' as const },
    { id: '4', name: 'Mike Davis', role: 'Assistant', production: 1800, cases: 15, efficiency: 90, trend: 'up' as const },
  ]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingClaims: 0,
    monthlyRevenue: 0,
  });
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [formResponseSearch, setFormResponseSearch] = useState('');
  const [formResponseFilter, setFormResponseFilter] = useState('date');
  const [productionChartData, setProductionChartData] = useState({
    dailyData: [] as any[],
    weeklyData: [] as any[],
    monthlyData: [] as any[],
    byTreatmentType: [] as any[],
    byPractitioner: [] as any[],
    byDayOfWeek: [] as any[],
  });

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

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await fetch(
        `/api/appointments?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setAppointments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  }, []);

  // Fetch insurance claims
  const fetchClaims = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const response = await fetch(`/api/dental/ramq/claims?userId=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setClaims(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
      setClaims([]);
    }
  }, [session?.user?.id]);

  // Fetch form responses
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

  // Fetch production metrics
  const fetchProductionMetrics = useCallback(async () => {
    try {
      // Calculate daily production from appointments/treatment plans
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Mock data - replace with actual API calls
      setProductionMetrics({
        dailyProduction: 12500,
        weeklyProduction: 87500,
        monthlyProduction: 350000,
        casesStartedToday: 8,
        casesCompletedToday: 5,
        activeTreatments: 45,
        chairUtilization: 75,
        teamProductivity: 85,
        productionTrend: 'up',
        revenueTrend: 12.5,
      });

      // Generate chart data
      const dailyData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString(),
          value: 8000 + Math.random() * 7000,
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });

      const weeklyData = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (11 - i) * 7);
        return {
          date: date.toISOString(),
          value: 50000 + Math.random() * 50000,
          label: `Week ${i + 1}`,
        };
      });

      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(today);
        date.setMonth(date.getMonth() - (11 - i));
        return {
          date: date.toISOString(),
          value: 200000 + Math.random() * 200000,
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        };
      });

      setProductionChartData({
        dailyData,
        weeklyData,
        monthlyData,
        byTreatmentType: [
          { type: 'Invisalign', value: 150000 },
          { type: 'Braces', value: 120000 },
          { type: 'Retainers', value: 50000 },
          { type: 'Other', value: 30000 },
        ],
        byPractitioner: [
          { name: 'Dr. Smith', value: 180000 },
          { name: 'Dr. Johnson', value: 120000 },
          { name: 'Hygienist', value: 40000 },
        ],
        byDayOfWeek: [
          { day: 'Mon', value: 15000 },
          { day: 'Tue', value: 18000 },
          { day: 'Wed', value: 20000 },
          { day: 'Thu', value: 17000 },
          { day: 'Fri', value: 14000 },
          { day: 'Sat', value: 8000 },
          { day: 'Sun', value: 0 },
        ],
      });
    } catch (error) {
      console.error('Error fetching production metrics:', error);
    }
  }, []);

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

      setStats({
        totalPatients: leads.length,
        todayAppointments: Array.isArray(appointments) ? appointments.length : 0,
        pendingClaims,
        monthlyRevenue: productionMetrics.monthlyProduction,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [leads, session?.user?.id, productionMetrics.monthlyProduction]);

  useEffect(() => {
    fetchLeads();
    fetchAppointments();
    fetchClaims();
    fetchProductionMetrics();
  }, [fetchLeads, fetchAppointments, fetchClaims, fetchProductionMetrics]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchFormResponses();
    }
  }, [selectedLeadId, fetchFormResponses]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Display multi-chair appointments
  const displayMultiChairAppointments = appointments.map((apt: any) => ({
    chair: apt.chair || '1',
    time: new Date(apt.startTime || apt.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    patient: leads.find((l) => l.id === apt.leadId)?.contactPerson || apt.customerName || 'Unknown',
    procedure: apt.title || apt.procedure || 'Appointment',
    color: 'bg-blue-100 border-blue-300', // Default color
    leadId: apt.leadId,
    status: apt.status,
  }));

  // Display claims
  const displayClaims = claims.slice(0, 5).map((claim: any) => ({
    id: claim.id.substring(0, 8),
    provider: claim.provider || 'RAMQ',
    amount: claim.amount || 0,
    status: claim.status === 'APPROVED' ? 'Approved' : 'Pending',
  }));

  // Display form responses with search
  const displayFormResponses = formResponses
    .filter((response: any) => {
      if (!formResponseSearch) return true;
      const patientName = leads.find((l) => l.id === response.leadId)?.contactPerson || 'Unknown';
      const formName = response.formName || 'Form';
      const searchLower = formResponseSearch.toLowerCase();
      return patientName.toLowerCase().includes(searchLower) || formName.toLowerCase().includes(searchLower);
    })
    .slice(0, 5)
    .map((response: any) => ({
      date: new Date(response.submittedAt).toLocaleDateString(),
      patient: leads.find((l) => l.id === response.leadId)?.contactPerson || 'Unknown',
      form: response.formName || 'Form',
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading administrative dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user is admin (you can customize this logic)
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.email?.includes('admin');

  return (
    <SharedDashboardLayout
      role="admin"
      selectedLeadId={selectedLeadId}
      leads={leads}
      stats={stats}
      onPatientSelect={setSelectedLeadId}
    >
      {/* Settings Button - Admin Only */}
      {isAdmin && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg bg-white hover:bg-gray-50 border-gray-300"
            onClick={() => setOpenModal('settings')}
            title="Settings"
          >
            <Settings className="h-5 w-5 text-gray-700" />
          </Button>
        </div>
      )}
      {/* PHASE 4: PRODUCTION DASHBOARD - New Row Above Existing Cards */}
      <div className="mb-6">
        <ProductionDashboard 
          metrics={productionMetrics}
          onViewDetails={(metric) => {
            setOpenModal('production-charts');
          }}
        />
      </div>

      {/* ADMINISTRATIVE CARDS - Operations-focused */}
      
      {/* TOP ROW - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 1. Multi-Chair Agenda */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
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

        {/* 2. Check-In Touch-screen */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('check-in')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Check-In Touch-screen</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {session?.user?.id ? (
              <RedesignedCheckIn
                patientName={selectedLeadId ? leads.find(l => l.id === selectedLeadId)?.contactPerson || 'Patient' : 'John Smith'}
                onCheckIn={() => setOpenModal('check-in')}
                onUpdateInfo={() => setOpenModal('check-in')}
              />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
            )}
          </CardContent>
        </Card>

        {/* 3. Insurance Claims Integration */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('insurance-claims')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Insurance Claims</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <RedesignedInsuranceClaims
              claims={displayClaims.map((claim: any) => ({
                id: claim.id,
                provider: claim.provider,
                amount: claim.amount,
                status: claim.status === 'Approved' ? 'Approved' : 'Funding',
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE ROW - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 4. Billing & Payments */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('billing')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Billing & Payments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                <span className="text-xs text-gray-700">Today's Revenue</span>
                <span className="text-xs font-bold text-green-700">${productionMetrics.dailyProduction.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                <span className="text-xs text-gray-700">Outstanding</span>
                <span className="text-xs font-bold text-gray-900">$12,450</span>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={async (e) => {
                  e.stopPropagation();
                  toast.info('Payment processing feature - coming soon');
                  // TODO: Implement payment processing
                }}
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Process Payment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. Form Responses */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('form-responses')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Form Responses</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <RedesignedFormResponses
              responses={displayFormResponses.map((r: any) => ({
                date: r.date,
                patientName: r.patient,
                formTitle: r.form,
                submissionDate: r.date,
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              }))}
            />
          </CardContent>
        </Card>

        {/* 6. Team Performance */}
        <TeamPerformanceCard 
          teamMembers={teamMembers}
          onViewDetails={() => setOpenModal('team-performance')}
        />
      </div>

      {/* BOTTOM ROW - Document Management & Lab Orders */}
      <div className="grid grid-cols-3 gap-4">
        {/* 7. Document Management */}
        <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Document Management</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <CustomDocumentUpload leadId={selectedLeadId} />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* 8. Lab Orders */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('lab-orders')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Lab Orders</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                <span className="text-xs text-gray-700">Pending Orders</span>
                <Badge variant="outline" className="text-xs">3</Badge>
              </div>
              <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                <span className="text-xs text-gray-700">In Progress</span>
                <Badge variant="outline" className="text-xs">5</Badge>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!selectedLeadId) {
                    toast.error('Please select a patient first');
                    return;
                  }
                  setOpenModal('lab-orders');
                  setShowLabOrderForm(true);
                }}
              >
                <Building2 className="w-3 h-3 mr-1" />
                New Lab Order
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 9. Electronic Signature Capture */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('signature')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Electronic Signature</CardTitle>
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

      {/* Workflow Templates Section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Workflow Templates</CardTitle>
            <p className="text-sm text-gray-600">Pre-built workflows for administrative tasks</p>
          </CardHeader>
          <CardContent>
            <DentalWorkflowTemplatesBrowser />
          </CardContent>
        </Card>
      </div>


      <AdminModals
        openModal={openModal}
        onCloseModal={() => setOpenModal(null)}
        selectedLeadId={selectedLeadId}
        leads={leads}
        claims={claims}
        formResponses={formResponses}
        teamMembers={teamMembers}
        displayMultiChairAppointments={displayMultiChairAppointments}
        productionMetrics={productionMetrics}
        productionChartData={productionChartData}
        onRefreshLeads={fetchLeads}
      />
    </SharedDashboardLayout>
  );
}

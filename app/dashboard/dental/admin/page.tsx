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
import { CustomSignature } from '@/components/dental/custom-signature';
import { ReferralManagement } from '@/components/dental/referral-management';
import { InsurancePreAuth } from '@/components/dental/insurance-preauth';
import { LabCommunication } from '@/components/dental/lab-communication';
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
    chairUtilization: 0,
    teamProductivity: 0,
    productionTrend: 'up' as 'up' | 'down' | 'stable',
    revenueTrend: 0,
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingClaims: 0,
    monthlyRevenue: 0,
  });
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [labOrders, setLabOrders] = useState<any[]>([]);
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
  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(null);

  // Fetch leads (patients)
  const fetchLeads = useCallback(async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        const leadsArray = Array.isArray(data) ? data : Array.isArray(data?.leads) ? data.leads : [];
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
        setAppointments(data?.appointments ?? data?.data ?? []);
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
        const nextClaims = Array.isArray(data) ? data : (Array.isArray(data?.claims) ? data.claims : []);
        setClaims(nextClaims);
        const outstanding = nextClaims
          .filter((c: any) => ['DRAFT', 'SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(String(c.status || '').toUpperCase()))
          .reduce((sum: number, c: any) => sum + Number(c.amount || c.estimatedCost || 0), 0);
        setOutstandingBalance(outstanding);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
      setClaims([]);
    }
  }, [session?.user?.id]);

  // Fetch lab orders
  const fetchLabOrders = useCallback(async () => {
    try {
      const params = selectedLeadId ? `leadId=${selectedLeadId}` : '';
      const response = await fetch(`/api/dental/lab-orders${params ? `?${params}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        setLabOrders(Array.isArray(data?.orders) ? data.orders : []);
      }
    } catch (error) {
      console.error('Error fetching lab orders:', error);
      setLabOrders([]);
    }
  }, [selectedLeadId]);

  // Fetch form responses (all when no patient selected, or filtered by leadId)
  const fetchFormResponses = useCallback(async () => {
    try {
      const leadParam = selectedLeadId ? `&leadId=${selectedLeadId}` : '';
      const response = await fetch(`/api/dental/forms?type=responses${leadParam}`);
      if (response.ok) {
        const data = await response.json();
        setFormResponses(Array.isArray(data?.responses) ? data.responses : []);
      }
    } catch (error) {
      console.error('Error fetching form responses:', error);
      setFormResponses([]);
    }
  }, [selectedLeadId]);

  // Fetch production metrics
  const fetchProductionMetrics = useCallback(async () => {
    try {
      const [dayRes, weekRes, monthRes] = await Promise.all([
        fetch('/api/dental/reports?reportType=comprehensive&dateRange=today'),
        fetch('/api/dental/reports?reportType=comprehensive&dateRange=week'),
        fetch('/api/dental/reports?reportType=comprehensive&dateRange=month'),
      ]);
      const day = dayRes.ok ? await dayRes.json() : { summary: {}, data: [] };
      const week = weekRes.ok ? await weekRes.json() : { summary: {}, data: [] };
      const month = monthRes.ok ? await monthRes.json() : { summary: {}, data: [] };

      const daySummary = day.summary || {};
      const weekSummary = week.summary || {};
      const monthSummary = month.summary || {};

      const dayData = Array.isArray(day.data) ? day.data : [];
      const weekData = Array.isArray(week.data) ? week.data : [];
      const monthData = Array.isArray(month.data) ? month.data : [];

      const dayRevenue = Number(daySummary.totalRevenue || 0);
      const prevDayRevenue = dayData.length >= 2 ? Number(dayData[dayData.length - 2]?.revenue || 0) : 0;
      const revenueTrend = prevDayRevenue > 0 ? ((dayRevenue - prevDayRevenue) / prevDayRevenue) * 100 : 0;

      const providerAgg = new Map<string, { cases: number; production: number }>();
      (Array.isArray(appointments) ? appointments : []).forEach((apt: any) => {
        const provider = apt.providerName || apt.provider || apt.practitionerName || apt.assignedTo || 'Unassigned';
        const current = providerAgg.get(provider) || { cases: 0, production: 0 };
        current.cases += 1;
        providerAgg.set(provider, current);
      });
      const apptCount = Math.max(1, (Array.isArray(appointments) ? appointments.length : 0));
      for (const [provider, value] of providerAgg.entries()) {
        value.production = Math.round((value.cases / apptCount) * Number(monthSummary.totalRevenue || 0));
        providerAgg.set(provider, value);
      }
      const computedTeam = Array.from(providerAgg.entries()).map(([name, v], idx) => ({
        id: `provider-${idx}`,
        name,
        role: 'Provider',
        production: v.production,
        cases: v.cases,
        efficiency: Math.min(100, Math.max(50, Math.round((v.cases / apptCount) * 100))),
        trend: 'stable' as const,
      }));
      setTeamMembers(computedTeam);

      const activeTreatments = Number(monthSummary.totalProcedures || 0);
      const chairUtilization = Math.min(100, Math.round(((Array.isArray(appointments) ? appointments.length : 0) / 16) * 100));
      const teamProductivity = computedTeam.length > 0
        ? Math.round(computedTeam.reduce((sum, t) => sum + t.efficiency, 0) / computedTeam.length)
        : 0;

      setProductionMetrics({
        dailyProduction: dayRevenue,
        weeklyProduction: Number(weekSummary.totalRevenue || 0),
        monthlyProduction: Number(monthSummary.totalRevenue || 0),
        casesStartedToday: Number(daySummary.totalProcedures || 0),
        casesCompletedToday: Number(daySummary.totalAppointments || 0),
        activeTreatments,
        chairUtilization,
        teamProductivity,
        productionTrend: revenueTrend > 1 ? 'up' : revenueTrend < -1 ? 'down' : 'stable',
        revenueTrend,
      });

      const dailyData = monthData.map((d: any) => ({
        date: d.period,
        value: Number(d.revenue || 0),
        label: d.period,
      }));
      const weeklyData = weekData.map((d: any) => ({
        date: d.period,
        value: Number(d.revenue || 0),
        label: d.period,
      }));
      const monthlyData = monthData.reduce((acc: any[], d: any) => {
        const key = String(d.period || '').slice(0, 6) || d.period;
        const existing = acc.find((x) => x.label === key);
        if (existing) existing.value += Number(d.revenue || 0);
        else acc.push({ date: d.period, value: Number(d.revenue || 0), label: key });
        return acc;
      }, []);

      const byDayMap = new Map<string, number>();
      monthData.forEach((d: any) => {
        const label = d.period || '';
        const day = label.split(' ')[0] || label;
        byDayMap.set(day, (byDayMap.get(day) || 0) + Number(d.revenue || 0));
      });
      const byDayOfWeek = Array.from(byDayMap.entries()).map(([day, value]) => ({ day, value }));

      setProductionChartData({
        dailyData,
        weeklyData,
        monthlyData,
        byTreatmentType: [],
        byPractitioner: computedTeam.map((m) => ({ name: m.name, value: m.production })),
        byDayOfWeek,
      });
    } catch (error) {
      console.error('Error fetching production metrics:', error);
    }
  }, [appointments]);

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
      const res = appointmentsRes.ok ? await appointmentsRes.json() : {};
      const appointments = res?.appointments ?? res?.data ?? [];

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
        monthlyRevenue: productionMetrics.monthlyProduction || 0,
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
    fetchFormResponses();
  }, [fetchFormResponses]);

  useEffect(() => {
    fetchLabOrders();
  }, [fetchLabOrders]);

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
    provider: claim.provider || claim.insuranceProvider || 'RAMQ',
    amount: claim.amount || 0,
    status:
      String(claim.status || '').toUpperCase() === 'APPROVED'
        ? 'Approved'
        : ['SUBMITTED', 'UNDER_REVIEW', 'PENDING', 'INFO_REQUESTED'].includes(String(claim.status || '').toUpperCase())
          ? 'Funding'
          : 'Pending',
  }));

  // Display form responses with search (form name from response.form.formName)
  const displayFormResponses = formResponses
    .filter((response: any) => {
      if (!formResponseSearch) return true;
      const patientName = leads.find((l) => l.id === response.leadId)?.contactPerson || 'Unknown';
      const formName = response.form?.formName || response.formName || 'Form';
      const searchLower = formResponseSearch.toLowerCase();
      return patientName.toLowerCase().includes(searchLower) || formName.toLowerCase().includes(searchLower);
    })
    .slice(0, 5)
    .map((response: any) => ({
      date: new Date(response.submittedAt).toLocaleDateString(),
      submittedAt: response.submittedAt,
      patient: leads.find((l) => l.id === response.leadId)?.contactPerson || 'Unknown',
      form: response.form?.formName || response.formName || 'Form',
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
                patientName={
                  selectedLeadId
                    ? leads.find((l) => l.id === selectedLeadId)?.contactPerson || 'Patient'
                    : (displayMultiChairAppointments[0]?.patient || 'No patient selected')
                }
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

      {/* PRE-AUTH + REFERRALS ROW */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Insurance Pre-Authorization */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('preauth')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Pre-Authorization</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <InsurancePreAuth leadId={selectedLeadId || undefined} compact />
          </CardContent>
        </Card>

        {/* Referral Management */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('referrals')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Referrals</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ReferralManagement leadId={selectedLeadId || undefined} compact />
          </CardContent>
        </Card>

        {/* Lab Communication */}
        <Card 
          className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer hover:shadow-xl transition-all"
          onClick={() => setOpenModal('lab-communication')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Lab Communication</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <LabCommunication leadId={selectedLeadId || undefined} compact />
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
                <span className="text-xs font-bold text-gray-900">
                  {outstandingBalance != null ? `$${outstandingBalance.toLocaleString()}` : '—'}
                </span>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={async (e) => {
                  e.stopPropagation();
                  toast.info('Use the Payments flow to process patient balances.');
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
                time: r.submittedAt
                  ? new Date(r.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : '—',
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
                <Badge variant="outline" className="text-xs">
                  {labOrders.filter((o: any) => o.status === 'PENDING' || o.status === 'SUBMITTED').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                <span className="text-xs text-gray-700">In Progress</span>
                <Badge variant="outline" className="text-xs">
                  {labOrders.filter((o: any) => o.status === 'IN_PROGRESS' || o.status === 'SENT').length}
                </Badge>
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
        outstandingBalance={outstandingBalance}
        productionChartData={productionChartData}
        onRefreshLeads={fetchLeads}
      />
    </SharedDashboardLayout>
  );
}

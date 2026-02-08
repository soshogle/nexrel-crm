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
import { ProductionCharts } from '@/components/dental/production-charts';
import { TeamPerformanceCard } from '@/components/dental/team-performance-card';
import { DentalWorkflowTemplatesBrowser } from '@/components/dental/workflow-templates-browser';
import { CustomMultiChairAgenda } from '@/components/dental/custom-multi-chair-agenda';
import { CustomFormsBuilder } from '@/components/dental/custom-forms-builder';
import { CustomDocumentUpload } from '@/components/dental/custom-document-upload';
import { CustomSignature } from '@/components/dental/custom-signature';
import { VnaConfigurationWithRouting } from '@/components/dental/vna-configuration-with-routing';
import { CardModal } from '@/components/dental/card-modal';
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
  const [activeMultiChairTab, setActiveMultiChairTab] = useState<'ortho' | 'hygiene' | 'restorative'>('ortho');
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
    id: apt.id,
    time: new Date(apt.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    patient: leads.find((l) => l.id === apt.leadId)?.contactPerson || 'Unknown',
    procedure: apt.title || 'Appointment',
    chair: apt.chair || '1',
    status: apt.status || 'scheduled',
  }));

  // Display claims
  const displayClaims = claims.slice(0, 5).map((claim: any) => ({
    id: claim.id.substring(0, 8),
    provider: claim.provider || 'RAMQ',
    amount: claim.amount || 0,
    status: claim.status === 'APPROVED' ? 'Approved' : 'Pending',
  }));

  // Display form responses
  const displayFormResponses = formResponses.slice(0, 5).map((response: any) => ({
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

  return (
    <SharedDashboardLayout
      role="admin"
      selectedLeadId={selectedLeadId}
      leads={leads}
      stats={stats}
      onPatientSelect={setSelectedLeadId}
    >
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

        {/* 2. Check-In Touch-screen */}
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
                  <p className="text-sm font-medium text-gray-900 mb-2">Patient Check-In</p>
                  <p className="text-xs text-gray-600 mb-4">Tap to check in</p>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">Check-In</Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
            )}
          </CardContent>
        </Card>

        {/* 3. Insurance Claims Integration */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenModal('insurance-claims')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Insurance Claims</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {displayClaims.length > 0 ? (
                displayClaims.map((claim, idx) => (
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
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">No claims</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE ROW - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 4. Billing & Payments */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
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
              <Button size="sm" variant="outline" className="w-full">
                <DollarSign className="w-3 h-3 mr-1" />
                Process Payment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. Form Responses */}
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
              {displayFormResponses.length > 0 ? (
                displayFormResponses.map((response, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs border-b border-gray-100 pb-2">
                    <div className="w-20 text-gray-600">{response.date}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{response.patient}</div>
                      <div className="text-gray-600 truncate">{response.form}</div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs border-0">Submitted</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">No responses</div>
              )}
            </div>
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
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Document Management</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <CustomDocumentUpload />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* 8. Lab Orders */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
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
              <Button size="sm" variant="outline" className="w-full">
                <Building2 className="w-3 h-3 mr-1" />
                New Lab Order
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 9. Electronic Signature Capture */}
        <Card 
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
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

      {/* VNA Configuration Section - Phase 2 */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">VNA Configuration</CardTitle>
                <p className="text-sm text-gray-600">Manage Vendor Neutral Archive connections and routing rules</p>
              </div>
              <Button onClick={() => setOpenModal('vna-config')} variant="outline">
                <Server className="w-4 h-4 mr-2" />
                Configure VNAs
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Modals */}
      <CardModal
        isOpen={openModal === 'multi-chair'}
        onClose={() => setOpenModal(null)}
        title="Multi-Chair Agenda"
      >
        <div className="space-y-4">
          <CustomMultiChairAgenda appointments={displayMultiChairAppointments} />
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'check-in'}
        onClose={() => setOpenModal(null)}
        title="Patient Check-In"
      >
        <div className="space-y-4">
          <Input placeholder="Patient name" className="mb-3" />
          <div className="flex gap-2">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white flex-1">Check-In</Button>
            <Button variant="outline" className="flex-1">Update Info</Button>
          </div>
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'insurance-claims'}
        onClose={() => setOpenModal(null)}
        title="Insurance Claims"
      >
        <div className="space-y-3">
          {claims.map((claim: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">
                  Claim {claim.id?.substring(0, 8)} - {claim.provider || 'RAMQ'}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg font-bold text-gray-900">${claim.amount || 0}</div>
                {claim.status === 'APPROVED' ? (
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
        isOpen={openModal === 'billing'}
        onClose={() => setOpenModal(null)}
        title="Billing & Payments"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Today's Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">${productionMetrics.dailyProduction.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">$12,450</p>
              </CardContent>
            </Card>
          </div>
          <Button className="w-full">
            <DollarSign className="w-4 h-4 mr-2" />
            Process Payment
          </Button>
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'form-responses'}
        onClose={() => setOpenModal(null)}
        title="Form Responses"
      >
        <div className="space-y-2">
          {formResponses.map((response: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 p-3 border border-gray-200 rounded">
              <div className="w-20 text-gray-600">{new Date(response.submittedAt).toLocaleDateString()}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{response.formName}</div>
                <div className="text-sm text-gray-600">{leads.find((l) => l.id === response.leadId)?.contactPerson || 'Unknown'}</div>
              </div>
              <Badge className="bg-green-100 text-green-700">Submitted</Badge>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'team-performance'}
        onClose={() => setOpenModal(null)}
        title="Team Performance"
      >
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-600">{member.role}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">${member.production.toLocaleString()}</p>
                <p className="text-sm text-gray-600">{member.cases} cases</p>
              </div>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'lab-orders'}
        onClose={() => setOpenModal(null)}
        title="Lab Orders"
      >
        <div className="space-y-4">
          <Button className="w-full">
            <Building2 className="w-4 h-4 mr-2" />
            Create New Lab Order
          </Button>
          <div className="space-y-2">
            <div className="p-3 border border-gray-200 rounded">
              <p className="font-semibold">Order #12345</p>
              <p className="text-sm text-gray-600">Status: In Progress</p>
            </div>
          </div>
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'signature'}
        onClose={() => setOpenModal(null)}
        title="Electronic Signature Capture"
      >
        <CustomSignature />
      </CardModal>

      <CardModal
        isOpen={openModal === 'production-charts'}
        onClose={() => setOpenModal(null)}
        title="Production Analytics"
        className="max-w-6xl"
      >
        <ProductionCharts
          dailyData={productionChartData.dailyData}
          weeklyData={productionChartData.weeklyData}
          monthlyData={productionChartData.monthlyData}
          byTreatmentType={productionChartData.byTreatmentType}
          byPractitioner={productionChartData.byPractitioner}
          byDayOfWeek={productionChartData.byDayOfWeek}
          onExport={(format) => {
            toast.success(`Exporting as ${format.toUpperCase()}...`);
            // Implement export functionality
          }}
        />
      </CardModal>

      {/* VNA Configuration Modal - Phase 2 */}
      <CardModal
        isOpen={openModal === 'vna-config'}
        onClose={() => setOpenModal(null)}
        title="VNA Configuration & Routing Rules"
        className="max-w-5xl"
      >
        <VnaConfigurationWithRouting />
      </CardModal>
    </SharedDashboardLayout>
  );
}

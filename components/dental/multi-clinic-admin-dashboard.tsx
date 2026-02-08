/**
 * Multi-Clinic Admin Dashboard
 * Centralized dashboard for managing multiple clinics
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/lib/dental/clinic-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign, Calendar, TrendingUp, Activity } from 'lucide-react';
import { ClinicManagementDialog } from './clinic-management-dialog';

interface ClinicStats {
  clinicId: string;
  clinicName: string;
  totalPatients: number;
  totalAppointments: number;
  monthlyRevenue: number;
  activeStaff: number;
  growthRate: number;
}

export function MultiClinicAdminDashboard() {
  const { data: session } = useSession();
  const { clinics, activeClinic, setActiveClinic } = useClinic();
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [clinicStats, setClinicStats] = useState<ClinicStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');

  useEffect(() => {
    if (activeClinic) {
      setSelectedClinicId(activeClinic.id);
    }
  }, [activeClinic]);

  useEffect(() => {
    fetchClinicStats();
  }, [selectedClinicId, viewMode]);

  const fetchClinicStats = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch aggregated stats
      // For now, we'll use mock data structure
      const stats: ClinicStats[] = clinics.map((clinic) => ({
        clinicId: clinic.id,
        clinicName: clinic.name,
        totalPatients: 0, // Would fetch from API
        totalAppointments: 0,
        monthlyRevenue: 0,
        activeStaff: 0,
        growthRate: 0,
      }));

      setClinicStats(stats);
    } catch (error) {
      console.error('Error fetching clinic stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClinicSelect = (clinicId: string) => {
    setSelectedClinicId(clinicId);
    const clinic = clinics.find((c) => c.id === clinicId);
    if (clinic) {
      setActiveClinic(clinic);
    }
  };

  const displayedStats = viewMode === 'all' 
    ? clinicStats 
    : clinicStats.filter((s) => s.clinicId === selectedClinicId);

  const totalStats = clinicStats.reduce(
    (acc, stat) => ({
      totalPatients: acc.totalPatients + stat.totalPatients,
      totalAppointments: acc.totalAppointments + stat.totalAppointments,
      monthlyRevenue: acc.monthlyRevenue + stat.monthlyRevenue,
      activeStaff: acc.activeStaff + stat.activeStaff,
    }),
    { totalPatients: 0, totalAppointments: 0, monthlyRevenue: 0, activeStaff: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Multi-Clinic Management</h2>
          <p className="text-gray-600">Overview and management across all clinic locations</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={viewMode} onValueChange={(v: 'all' | 'single') => setViewMode(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              <SelectItem value="single">Single Clinic</SelectItem>
            </SelectContent>
          </Select>
          {viewMode === 'single' && (
            <Select
              value={selectedClinicId || '__none__'}
              onValueChange={(value) => {
                if (value !== '__none__') handleClinicSelect(value);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select clinic" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setShowManageDialog(true)}>
            <Building2 className="w-4 h-4 mr-2" />
            Manage Clinics
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {viewMode === 'all' && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalPatients}</div>
              <p className="text-xs text-gray-500 mt-1">Across all clinics</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalAppointments}</div>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalStats.monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">Combined revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.activeStaff}</div>
              <p className="text-xs text-gray-500 mt-1">Across all clinics</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clinic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedStats.map((stat) => {
          const clinic = clinics.find((c) => c.id === stat.clinicId);
          return (
            <Card key={stat.clinicId} className={activeClinic?.id === stat.clinicId ? 'border-purple-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{stat.clinicName}</CardTitle>
                  {clinic?.isPrimary && (
                    <Badge variant="default" className="bg-purple-600">Primary</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Patients</span>
                    </div>
                    <span className="font-semibold">{stat.totalPatients}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Appointments</span>
                    </div>
                    <span className="font-semibold">{stat.totalAppointments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>Revenue</span>
                    </div>
                    <span className="font-semibold">${stat.monthlyRevenue.toLocaleString()}</span>
                  </div>
                  {stat.growthRate !== 0 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>Growth</span>
                      </div>
                      <span className={`font-semibold ${stat.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.growthRate > 0 ? '+' : ''}{stat.growthRate}%
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleClinicSelect(stat.clinicId)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ClinicManagementDialog
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
        clinics={clinics}
        onSuccess={() => {
          setShowManageDialog(false);
          fetchClinicStats();
        }}
      />
    </div>
  );
}

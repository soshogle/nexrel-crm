/**
 * Shared Dashboard Layout Component
 * Common layout structure for both Clinical and Administrative dashboards
 */

'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, DollarSign, FileText, Search, User, Mic } from 'lucide-react';
import { RoleSwitcher } from './role-switcher';
import { ClinicSelector } from './clinic-selector';

interface SharedDashboardLayoutProps {
  role: 'clinical' | 'admin';
  selectedLeadId: string | null;
  leads: any[];
  stats: {
    totalPatients: number;
    todayAppointments: number;
    pendingClaims: number;
    monthlyRevenue: number;
  };
  onPatientSelect: (leadId: string | null) => void;
  children: React.ReactNode;
}

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
      <div className="min-w-[1600px] min-h-[1400px] p-6 bg-gradient-to-r from-purple-900 via-purple-700 to-purple-500">
        {children}
      </div>
    </div>
  );
}

export function SharedDashboardLayout({
  role,
  selectedLeadId,
  leads,
  stats,
  onPatientSelect,
  children,
}: SharedDashboardLayoutProps) {
  const selectedPatient = leads.find((lead) => lead.id === selectedLeadId);

  return (
    <PanableCanvas>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {role === 'clinical' ? 'Clinical Dashboard' : 'Administrative Dashboard'}
            </h1>
            <p className="text-purple-100 mt-1">
              {role === 'clinical'
                ? 'Patient care and clinical documentation'
                : 'Scheduling, billing, and operations management'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {role === 'clinical' && (
              <Link href="/dashboard/docpen">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:text-white"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  AI Docpen
                </Button>
              </Link>
            )}
            <ClinicSelector />
            <RoleSwitcher currentRole={role} />
          </div>
        </div>

        {/* Patient Selector */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <Select
              value={selectedLeadId || '__none__'}
              onValueChange={(value) => onPatientSelect(value === '__none__' ? null : value)}
            >
              <SelectTrigger className="w-full border border-white/20 bg-white/10 backdrop-blur-sm text-white">
                <SelectValue placeholder="Select a patient..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No patient selected</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.contactPerson || lead.businessName || lead.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPatient && (
            <Badge variant="outline" className="px-3 py-1 border-white/30 bg-white/10 backdrop-blur-sm text-white">
              <User className="w-3 h-3 mr-1" />
              {selectedPatient.contactPerson || selectedPatient.businessName}
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Patients', value: stats.totalPatients, icon: Users, color: 'text-purple-600' },
            { label: "Today's Appointments", value: stats.todayAppointments, icon: Calendar, color: 'text-blue-600' },
            { label: 'Pending Claims', value: stats.pendingClaims, icon: FileText, color: 'text-amber-600' },
            { label: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
          ].map((stat, idx) => (
            <Card key={idx} className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-lg">
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
      </div>

      {/* Dashboard Content */}
      {children}
    </PanableCanvas>
  );
}

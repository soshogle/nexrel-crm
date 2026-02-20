'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardModal } from '@/components/dental/card-modal';
import { CustomMultiChairAgenda } from '@/components/dental/custom-multi-chair-agenda';
import { CustomSignature } from '@/components/dental/custom-signature';
import { RedesignedCheckIn } from '@/components/dental/redesigned-check-in';
import { RedesignedFormResponses } from '@/components/dental/redesigned-form-responses';
import { RedesignedInsuranceClaims } from '@/components/dental/redesigned-insurance-claims';
import { VnaConfigurationWithRouting } from '@/components/dental/vna-configuration-with-routing';
import { PatientInfoUpdateForm } from '@/components/dental/patient-info-update-form';
import { LabOrderForm } from '@/components/dental/lab-order-form';
import { ProductionCharts } from '@/components/dental/production-charts';
import { DollarSign, Building2, Mic } from 'lucide-react';
import { toast } from 'sonner';

interface AdminModalsProps {
  openModal: string | null;
  onCloseModal: () => void;
  selectedLeadId: string | null;
  leads: any[];
  claims: any[];
  formResponses: any[];
  teamMembers: any[];
  displayMultiChairAppointments: any[];
  productionMetrics: { dailyProduction: number };
  productionChartData: {
    dailyData: any[];
    weeklyData: any[];
    monthlyData: any[];
    byTreatmentType: any[];
    byPractitioner: any[];
    byDayOfWeek: any[];
  };
  onRefreshLeads: () => void;
}

export function AdminModals({
  openModal,
  onCloseModal,
  selectedLeadId,
  leads,
  claims,
  formResponses,
  teamMembers,
  displayMultiChairAppointments,
  productionMetrics,
  productionChartData,
  onRefreshLeads,
}: AdminModalsProps) {
  const [showUpdateInfo, setShowUpdateInfo] = useState(false);
  const [showLabOrderForm, setShowLabOrderForm] = useState(false);

  return (
    <>
      <CardModal isOpen={openModal === 'multi-chair'} onClose={onCloseModal} title="Multi-Chair Agenda">
        <div className="space-y-4">
          <CustomMultiChairAgenda appointments={displayMultiChairAppointments} />
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'check-in'}
        onClose={() => { onCloseModal(); setShowUpdateInfo(false); }}
        title={showUpdateInfo ? "Update Patient Information" : "Patient Check-In"}
      >
        {showUpdateInfo && selectedLeadId ? (
          <PatientInfoUpdateForm
            leadId={selectedLeadId}
            onSuccess={() => {
              toast.success('Patient information updated successfully');
              setShowUpdateInfo(false);
              onCloseModal();
              onRefreshLeads();
            }}
            onCancel={() => setShowUpdateInfo(false)}
          />
        ) : (
          <div className="space-y-4">
            {selectedLeadId && (
              <div className="flex justify-end">
                <Button
                  variant="outline" size="sm"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('leadId', selectedLeadId);
                    const patientName = leads.find((l) => l.id === selectedLeadId)?.contactPerson;
                    if (patientName) params.set('patientName', patientName);
                    params.set('from', 'clinical');
                    window.location.href = `/dashboard/docpen?${params.toString()}`;
                  }}
                >
                  <Mic className="h-4 w-4 mr-2" /> Start Visit in Docpen
                </Button>
              </div>
            )}
            <RedesignedCheckIn
              patientName={selectedLeadId ? leads.find(l => l.id === selectedLeadId)?.contactPerson || 'Patient' : 'John Smith'}
              onCheckIn={() => { toast.success('Patient checked in successfully'); onCloseModal(); }}
              onUpdateInfo={() => {
                if (!selectedLeadId) { toast.error('Please select a patient first'); return; }
                setShowUpdateInfo(true);
              }}
            />
          </div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'insurance-claims'} onClose={onCloseModal} title="Insurance Claims">
        <RedesignedInsuranceClaims
          claims={claims.map((claim: any) => ({
            id: claim.id?.substring(0, 8) || 'N/A',
            provider: claim.provider || 'RAMQ',
            amount: claim.amount || 0,
            status: claim.status === 'APPROVED' ? 'Approved' : 'Funding',
          }))}
        />
      </CardModal>

      <CardModal isOpen={openModal === 'billing'} onClose={onCloseModal} title="Billing & Payments">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Today&apos;s Revenue</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">${productionMetrics.dailyProduction.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-amber-600">$12,450</p></CardContent>
            </Card>
          </div>
          <Button className="w-full" onClick={() => { toast.info('Payment processing feature - coming soon'); }}>
            <DollarSign className="w-4 h-4 mr-2" /> Process Payment
          </Button>
        </div>
      </CardModal>

      <CardModal isOpen={openModal === 'form-responses'} onClose={onCloseModal} title="Form Responses">
        <RedesignedFormResponses
          responses={formResponses.map((response: any) => ({
            date: new Date(response.submittedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            patientName: leads.find((l) => l.id === response.leadId)?.contactPerson || 'Unknown',
            formTitle: response.formName || 'Form',
            submissionDate: new Date(response.submittedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            time: new Date(response.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          }))}
        />
      </CardModal>

      <CardModal isOpen={openModal === 'team-performance'} onClose={onCloseModal} title="Team Performance">
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div><p className="font-semibold text-gray-900">{member.name}</p><p className="text-sm text-gray-600">{member.role}</p></div>
              <div className="text-right"><p className="text-lg font-bold text-gray-900">${member.production.toLocaleString()}</p><p className="text-sm text-gray-600">{member.cases} cases</p></div>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal
        isOpen={openModal === 'lab-orders'}
        onClose={() => { onCloseModal(); setShowLabOrderForm(false); }}
        title={showLabOrderForm ? "Create New Lab Order" : "Lab Orders"}
      >
        {showLabOrderForm && selectedLeadId ? (
          <LabOrderForm
            leadId={selectedLeadId}
            onSuccess={() => { setShowLabOrderForm(false); onCloseModal(); }}
            onCancel={() => setShowLabOrderForm(false)}
          />
        ) : (
          <div className="space-y-4">
            <Button className="w-full" onClick={() => {
              if (!selectedLeadId) { toast.error('Please select a patient first'); return; }
              setShowLabOrderForm(true);
            }}>
              <Building2 className="w-4 h-4 mr-2" /> Create New Lab Order
            </Button>
            <div className="space-y-2">
              <div className="p-3 border border-gray-200 rounded">
                <p className="font-semibold">Order #12345</p>
                <p className="text-sm text-gray-600">Status: In Progress</p>
              </div>
            </div>
          </div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'signature'} onClose={onCloseModal} title="Electronic Signature Capture">
        <CustomSignature />
      </CardModal>

      <CardModal isOpen={openModal === 'production-charts'} onClose={onCloseModal} title="Production Analytics">
        <ProductionCharts
          dailyData={productionChartData.dailyData}
          weeklyData={productionChartData.weeklyData}
          monthlyData={productionChartData.monthlyData}
          byTreatmentType={productionChartData.byTreatmentType}
          byPractitioner={productionChartData.byPractitioner}
          byDayOfWeek={productionChartData.byDayOfWeek}
          onExport={(format) => { toast.success(`Exporting as ${format.toUpperCase()}...`); }}
        />
      </CardModal>

      <CardModal isOpen={openModal === 'settings'} onClose={onCloseModal} title="Settings">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">VNA Configuration</h3>
            <p className="text-sm text-gray-600 mb-4">Manage Vendor Neutral Archive connections and routing rules</p>
            <VnaConfigurationWithRouting />
          </div>
        </div>
      </CardModal>

      <CardModal isOpen={openModal === 'vna-config'} onClose={onCloseModal} title="VNA Configuration & Routing Rules">
        <VnaConfigurationWithRouting />
      </CardModal>
    </>
  );
}

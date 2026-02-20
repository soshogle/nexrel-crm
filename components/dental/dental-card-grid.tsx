'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExactArchOdontogram } from '@/components/dental/exact-arch-odontogram';
import { RedesignedProceduresLog } from '@/components/dental/redesigned-procedures-log';
import { RedesignedTreatmentPlan } from '@/components/dental/redesigned-treatment-plan';
import { RedesignedPeriodontalChart } from '@/components/dental/redesigned-periodontal-chart';
import { RedesignedFormResponses } from '@/components/dental/redesigned-form-responses';
import { RedesignedInsuranceClaims } from '@/components/dental/redesigned-insurance-claims';
import { CustomFormsBuilder } from '@/components/dental/custom-forms-builder';
import { CustomMultiChairAgenda } from '@/components/dental/custom-multi-chair-agenda';
import { CustomXRayAnalysis } from '@/components/dental/custom-xray-analysis';
import { CustomDocumentUpload } from '@/components/dental/custom-document-upload';
import { CustomSignature } from '@/components/dental/custom-signature';
import { ChevronLeft, ChevronRight, User, CheckCircle2, Clock } from 'lucide-react';

interface DentalCardGridProps {
  selectedLeadId: string | null;
  sessionUserId: string | undefined;
  odontogramData: any;
  periodontalData: any;
  selectedXray: any;
  displayProcedures: any[];
  displayTreatmentPlans: any[];
  displayFormResponses: any[];
  displayClaims: any[];
  displayMultiChairAppointments: any[];
  onOpenModal: (modal: string) => void;
}

export function DentalCardGrid({
  selectedLeadId,
  sessionUserId,
  odontogramData,
  periodontalData,
  selectedXray,
  displayProcedures,
  displayTreatmentPlans,
  displayFormResponses,
  displayClaims,
  displayMultiChairAppointments,
  onOpenModal,
}: DentalCardGridProps) {
  return (
    <>
      {/* TOP ROW - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 1. Arch Odontogram */}
        <Card
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onOpenModal('odontogram')}
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
                <SelectTrigger className="h-7 text-xs w-full border border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="treatment">Hover affected by: Treatment</SelectItem></SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {selectedLeadId ? (
              <ExactArchOdontogram toothData={odontogramData} />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
            )}
          </CardContent>
        </Card>

        {/* 2. Procedures Activity Log */}
        <Card
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onOpenModal('procedures')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Procedures Activity Log</CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="Search..." className="h-7 w-28 text-xs border border-gray-300" />
                <Select defaultValue="today">
                  <SelectTrigger className="h-7 text-xs w-20 border border-gray-300"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="today">Today</SelectItem></SelectContent>
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

        {/* 3. Treatment Plan Builder */}
        <Card
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onOpenModal('treatment-plan')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Treatment Plan Builder</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <RedesignedTreatmentPlan
              treatments={displayTreatmentPlans.map((plan: any) => ({
                code: plan.code,
                name: plan.name,
                cost: plan.cost,
                timeline: plan.timeline,
                costColor: plan.costColor,
                icon: plan.icon,
                progress: 50,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE ROW - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 4. Periodontal Charting */}
        <Card
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onOpenModal('periodontal')}
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

        {/* 5. Forms Builder */}
        <Card
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onOpenModal('forms-builder')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm font-semibold text-gray-900">Forms Builder</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {sessionUserId ? (
              <CustomFormsBuilder />
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
            )}
          </CardContent>
        </Card>

        {/* 6. Form Responses */}
        <Card
          className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onOpenModal('form-responses')}
        >
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900">Form Responses</CardTitle>
              <div className="flex items-center gap-2">
                <Input placeholder="Search..." className="h-7 w-28 text-xs border border-gray-300" />
                <Select defaultValue="all">
                  <SelectTrigger className="h-7 text-xs w-24 border border-gray-300"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Forms</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
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
      </div>

      {/* BOTTOM ROW - Split Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* 7. Document Upload */}
        <div className="col-span-3">
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

        {/* 8. Check-In Touch-screen */}
        <div className="col-span-3">
          <Card
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onOpenModal('check-in')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Check-In Touch-screen</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {sessionUserId ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">Welcome, John Smith!</p>
                    <p className="text-xs text-gray-600 mb-4">Please confirm your appointment.</p>
                  </div>
                  <Input placeholder="Patient name" className="mb-3 border border-gray-300" />
                  <div className="flex gap-2">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white flex-1">Check-In</Button>
                    <Button variant="outline" className="border-gray-300 flex-1">Update Info</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 9. Multi-Chair Agenda */}
        <div className="col-span-3">
          <Card
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onOpenModal('multi-chair')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Multi-Chair Agenda</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {sessionUserId ? (
                <CustomMultiChairAgenda appointments={displayMultiChairAppointments} />
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 10-12. Right Column */}
        <div className="col-span-3 space-y-4">
          <Card
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onOpenModal('insurance-claims')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Insurance Claims Integration</CardTitle>
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

          <Card
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onOpenModal('xray-analysis')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">X-Ray Analysis</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {selectedLeadId && sessionUserId ? (
                <CustomXRayAnalysis xrayData={selectedXray} />
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Select a patient</div>
              )}
            </CardContent>
          </Card>

          <Card
            className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onOpenModal('signature')}
          >
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Electronic signature capture</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {sessionUserId ? (
                <CustomSignature />
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">Please sign in</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CardModal } from '@/components/dental/card-modal';
import { Odontogram } from '@/components/dental/odontogram';
import { TreatmentPlanBuilder } from '@/components/dental/treatment-plan-builder';
import { PeriodontalChart } from '@/components/dental/periodontal-chart';
import { CustomFormsBuilder } from '@/components/dental/custom-forms-builder';
import { CustomMultiChairAgenda } from '@/components/dental/custom-multi-chair-agenda';
import { CustomDocumentUpload } from '@/components/dental/custom-document-upload';
import { CustomSignature } from '@/components/dental/custom-signature';
import { DicomViewer } from '@/components/dental/dicom-viewer';
import { ChevronLeft, ChevronRight, User, CheckCircle2, Clock } from 'lucide-react';

interface DentalModalsProps {
  openModal: string | null;
  onCloseModal: () => void;
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
  onSaveOdontogram: (toothData: any) => Promise<void>;
  onSavePeriodontalChart: (measurements: any) => Promise<void>;
  onTreatmentPlanSaved: () => Promise<void>;
  onXrayRefresh: () => void;
}

export function DentalModals({
  openModal,
  onCloseModal,
  selectedLeadId,
  sessionUserId,
  odontogramData,
  periodontalData,
  selectedXray,
  displayProcedures,
  displayFormResponses,
  displayClaims,
  displayMultiChairAppointments,
  onSaveOdontogram,
  onSavePeriodontalChart,
  onTreatmentPlanSaved,
  onXrayRefresh,
}: DentalModalsProps) {
  return (
    <>
      <CardModal isOpen={openModal === 'odontogram'} onClose={onCloseModal} title="Arch Odontogram">
        {selectedLeadId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Select defaultValue="treatment">
                <SelectTrigger className="h-8 w-64 border border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="treatment">Hover affected by: Treatment</SelectItem></SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100"><ChevronLeft className="h-4 w-4 text-gray-600" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100"><ChevronRight className="h-4 w-4 text-gray-600" /></Button>
              </div>
            </div>
            <Odontogram leadId={selectedLeadId} initialData={odontogramData} onSave={onSaveOdontogram} />
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'treatment-plan'} onClose={onCloseModal} title="Treatment Plan Builder">
        {selectedLeadId ? (
          <TreatmentPlanBuilder leadId={selectedLeadId} onSave={async () => { await onTreatmentPlanSaved(); }} />
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'procedures'} onClose={onCloseModal} title="Procedures Activity Log">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Input placeholder="Search..." className="h-8 flex-1 border border-gray-300" />
            <Select defaultValue="today">
              <SelectTrigger className="h-8 w-32 border border-gray-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {displayProcedures.map((proc, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="w-20 text-gray-600 font-medium">{proc.time}</div>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{proc.patient}</div>
                  <div className="text-sm text-gray-600">{proc.procedure}</div>
                </div>
              </div>
              <Badge className={`text-sm px-3 py-1 ${proc.color} border-0`}>{proc.status}</Badge>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal isOpen={openModal === 'periodontal'} onClose={onCloseModal} title="Periodontal Charting">
        {selectedLeadId ? (
          <PeriodontalChart leadId={selectedLeadId} initialData={periodontalData} onSave={onSavePeriodontalChart} />
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'forms-builder'} onClose={onCloseModal} title="Forms Builder">
        {sessionUserId ? <CustomFormsBuilder /> : <div className="text-center py-16 text-gray-400">Please sign in</div>}
      </CardModal>

      <CardModal isOpen={openModal === 'form-responses'} onClose={onCloseModal} title="Form Responses">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Input placeholder="Search..." className="h-8 flex-1 border border-gray-300" />
            <Select defaultValue="all">
              <SelectTrigger className="h-8 w-40 border border-gray-300"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Forms</SelectItem></SelectContent>
            </Select>
          </div>
          {displayFormResponses.map((response, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="w-24 text-gray-600">{response.date}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{response.patient}</div>
                <div className="text-sm text-gray-600">{response.form}</div>
              </div>
              <Badge className="bg-green-100 text-green-700 text-sm border-0">Submitted</Badge>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal isOpen={openModal === 'document-upload'} onClose={onCloseModal} title="Document Upload">
        {selectedLeadId ? <CustomDocumentUpload /> : <div className="text-center py-16 text-gray-400">Select a patient</div>}
      </CardModal>

      <CardModal isOpen={openModal === 'check-in'} onClose={onCloseModal} title="Check-In Touch-screen">
        {sessionUserId ? (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">Welcome, John Smith!</p>
              <p className="text-sm text-gray-600 mb-6">Please confirm your appointment.</p>
            </div>
            <Input placeholder="Patient name" className="mb-4 border border-gray-300 h-10" />
            <div className="flex gap-3">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white flex-1 h-10">Check-In</Button>
              <Button variant="outline" className="border-gray-300 flex-1 h-10">Update Info</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Please sign in</div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'multi-chair'} onClose={onCloseModal} title="Multi-Chair Agenda">
        {sessionUserId ? (
          <CustomMultiChairAgenda appointments={displayMultiChairAppointments} />
        ) : (
          <div className="text-center py-16 text-gray-400">Please sign in</div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'insurance-claims'} onClose={onCloseModal} title="Insurance Claims Integration">
        <div className="space-y-3">
          {displayClaims.map((claim, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">Claim {claim.id} - {claim.provider}</div>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg font-bold text-gray-900">${claim.amount}</div>
                {claim.status === 'Approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 mx-auto" />
                ) : (
                  <Clock className="w-5 h-5 text-orange-600 mt-1 mx-auto" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardModal>

      <CardModal isOpen={openModal === 'xray-analysis'} onClose={onCloseModal} title="X-Ray Analysis">
        {selectedLeadId && sessionUserId && selectedXray ? (
          <div className="h-[calc(100vh-200px)]">
            <DicomViewer
              xrayId={selectedXray.id}
              imageUrl={selectedXray.imageUrl || `/api/dental/xrays/${selectedXray.id}/image`}
              dicomFile={selectedXray.dicomFile || undefined}
              xrayType={selectedXray.xrayType}
              initialAnalysis={selectedXray.aiAnalysis}
              onAnalysisComplete={() => { onXrayRefresh(); }}
            />
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient and X-ray</div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'signature'} onClose={onCloseModal} title="Electronic Signature Capture">
        {sessionUserId ? <CustomSignature /> : <div className="text-center py-16 text-gray-400">Please sign in</div>}
      </CardModal>
    </>
  );
}

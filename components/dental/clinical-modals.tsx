'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CardModal } from '@/components/dental/card-modal';
import { ExactArchOdontogram } from '@/components/dental/exact-arch-odontogram';
import { TreatmentPlanBuilder } from '@/components/dental/treatment-plan-builder';
import { RedesignedPeriodontalChart } from '@/components/dental/redesigned-periodontal-chart';
import { RedesignedProceduresLog } from '@/components/dental/redesigned-procedures-log';
import { DicomViewer } from '@/components/dental/dicom-viewer';
import { ChevronLeft, ChevronRight, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface ClinicalModalsProps {
  openModal: string | null;
  onCloseModal: () => void;
  selectedLeadId: string | null;
  sessionUserId: string | undefined;
  leads: any[];
  odontogramData: any;
  periodontalData: any;
  procedures: any[];
  xrays: any[];
  selectedXray: any;
  onSelectLead: (id: string) => void;
  onSelectXray: (xray: any) => void;
  onXrayRefresh: () => void;
  clinicalNotesEditor: React.ReactNode;
}

export function ClinicalModals({
  openModal,
  onCloseModal,
  selectedLeadId,
  sessionUserId,
  leads,
  odontogramData,
  periodontalData,
  procedures,
  xrays,
  selectedXray,
  onSelectLead,
  onSelectXray,
  onXrayRefresh,
  clinicalNotesEditor,
}: ClinicalModalsProps) {
  const [odontogramViewMode, setOdontogramViewMode] = useState<'wisely' | 'treatment' | 'caries' | 'completed'>('treatment');

  return (
    <>
      <CardModal isOpen={openModal === 'odontogram'} onClose={onCloseModal} title="Arch Odontogram">
        {selectedLeadId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Select
                value={odontogramViewMode}
                onValueChange={(value: 'wisely' | 'treatment' | 'caries' | 'completed') => setOdontogramViewMode(value)}
              >
                <SelectTrigger className="h-8 w-64 border border-gray-300 hover:border-gray-400 transition-colors"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wisely" className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer">Hover affected by: Wisely</SelectItem>
                  <SelectItem value="treatment" className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer">Hover affected by: Treatment</SelectItem>
                  <SelectItem value="caries" className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer">Hover affected by: Caries</SelectItem>
                  <SelectItem value="completed" className="hover:bg-purple-50 hover:text-purple-700 cursor-pointer">Hover affected by: Completed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  onClick={() => {
                    if (selectedLeadId && leads.length > 0) {
                      const currentIndex = leads.findIndex(l => l.id === selectedLeadId);
                      if (currentIndex > 0) {
                        const prevLead = leads[currentIndex - 1];
                        onSelectLead(prevLead.id);
                        toast.success(`Switched to ${prevLead.contactPerson || 'patient'}`);
                      } else { toast.info('Already at first patient'); }
                    } else { toast.error('Please select a patient first'); }
                  }}
                  disabled={!selectedLeadId || (leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === 0)}
                >
                  <ChevronLeft className={`h-4 w-4 ${!selectedLeadId || (leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === 0) ? 'text-gray-300' : 'text-gray-600'}`} />
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  onClick={() => {
                    if (selectedLeadId && leads.length > 0) {
                      const currentIndex = leads.findIndex(l => l.id === selectedLeadId);
                      if (currentIndex < leads.length - 1) {
                        const nextLead = leads[currentIndex + 1];
                        onSelectLead(nextLead.id);
                        toast.success(`Switched to ${nextLead.contactPerson || 'patient'}`);
                      } else { toast.info('Already at last patient'); }
                    } else { toast.error('Please select a patient first'); }
                  }}
                  disabled={!selectedLeadId || (leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === leads.length - 1)}
                >
                  <ChevronRight className={`h-4 w-4 ${!selectedLeadId || (leads.length > 0 && leads.findIndex(l => l.id === selectedLeadId) === leads.length - 1) ? 'text-gray-300' : 'text-gray-600'}`} />
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

      <CardModal isOpen={openModal === 'treatment-plan'} onClose={onCloseModal} title="Treatment Plan Builder">
        {selectedLeadId ? (
          <TreatmentPlanBuilder leadId={selectedLeadId} />
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'xray-analysis'} onClose={onCloseModal} title="X-Ray Analysis">
        {!selectedLeadId ? (
          <div className="text-center py-16 text-gray-400">Select a patient first</div>
        ) : !sessionUserId ? (
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
                  <button key={xray.id} onClick={() => onSelectXray(xray)} className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                    <div className="font-medium text-sm">{xray.xrayType || 'X-Ray'}</div>
                    <div className="text-xs text-gray-500">{xray.dateTaken ? new Date(xray.dateTaken).toLocaleDateString() : 'No date'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[calc(100vh-200px)]">
            {xrays.length > 1 && (
              <div className="mb-4 flex items-center gap-2">
                <Select value={selectedXray.id} onValueChange={(value) => { const xray = xrays.find((x: any) => x.id === value); if (xray) onSelectXray(xray); }}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
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
              onAnalysisComplete={() => { onXrayRefresh(); }}
            />
          </div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'periodontal'} onClose={onCloseModal} title="Periodontal Charting">
        {selectedLeadId ? (
          <div className="space-y-4"><RedesignedPeriodontalChart measurements={periodontalData} /></div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>

      <CardModal isOpen={openModal === 'procedures'} onClose={onCloseModal} title="Procedures Activity Log">
        <RedesignedProceduresLog
          procedures={procedures.map((proc: any) => ({
            time: new Date(proc.datePerformed).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            patient: leads.find((l) => l.id === proc.leadId)?.contactPerson || 'Unknown',
            procedure: proc.procedureCode || 'Procedure',
            status: proc.status || 'Completed',
          }))}
        />
      </CardModal>

      <CardModal isOpen={openModal === 'clinical-notes'} onClose={onCloseModal} title="Clinical Notes">
        {selectedLeadId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('leadId', selectedLeadId);
                  const patientName = leads.find((l) => l.id === selectedLeadId)?.contactPerson || leads.find((l) => l.id === selectedLeadId)?.businessName;
                  if (patientName) params.set('patientName', patientName);
                  params.set('from', 'clinical');
                  window.location.href = `/dashboard/docpen?${params.toString()}`;
                }}
              >
                <Brain className="h-4 w-4 mr-2" /> Open in Docpen
              </Button>
            </div>
            {clinicalNotesEditor}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">Select a patient</div>
        )}
      </CardModal>
    </>
  );
}

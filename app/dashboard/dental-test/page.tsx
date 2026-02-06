/**
 * Dental Components Test Page
 * Test page for odontogram and document upload components
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Odontogram as OdontogramComponent } from '@/components/dental/odontogram';
import { DocumentUpload } from '@/components/dental/document-upload';
import { PeriodontalChart } from '@/components/dental/periodontal-chart';
import { TreatmentPlanBuilder } from '@/components/dental/treatment-plan-builder';
import { ProcedureLog } from '@/components/dental/procedure-log';
import { FormsBuilder } from '@/components/dental/forms-builder';
import { FormRenderer } from '@/components/dental/form-renderer';
import { FormResponsesViewer } from '@/components/dental/form-responses-viewer';
import { DocumentGenerator } from '@/components/dental/document-generator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Activity, ClipboardList, Calendar, Stethoscope, FormInput, FileCheck, FilePlus, Monitor, Grid3x3, Building2, PenTool, Scan } from 'lucide-react';
import { TouchScreenWelcome } from '@/components/dental/touch-screen-welcome';
import { MultiChairAgenda } from '@/components/dental/multi-chair-agenda';
import { RAMQIntegration } from '@/components/dental/ramq-integration';
import { ElectronicSignature } from '@/components/dental/electronic-signature';
import { XRayUpload } from '@/components/dental/xray-upload';

export default function DentalTestPage() {
  const { data: session } = useSession();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [odontogramData, setOdontogramData] = useState<any>(null);
  const [periodontalData, setPeriodontalData] = useState<any>(null);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (selectedLeadId) {
      fetchOdontogram();
      fetchPeriodontalChart();
      fetchTreatmentPlans();
      fetchForms();
    }
  }, [selectedLeadId]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchForms();
    }
  }, [session]);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchOdontogram = async () => {
    if (!selectedLeadId) return;
    
    try {
      const response = await fetch(`/api/dental/odontogram?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        setOdontogramData(data.odontogram?.toothData || null);
      }
    } catch (error) {
      console.error('Error fetching odontogram:', error);
      // It's okay if odontogram doesn't exist yet
      setOdontogramData(null);
    }
  };

  const handleSaveOdontogram = async (toothData: any) => {
    if (!selectedLeadId) {
      toast.error('Please select a patient first');
      return;
    }

    try {
      const response = await fetch('/api/dental/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          toothData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save odontogram');
      }

      toast.success('Odontogram saved successfully');
      setOdontogramData(toothData);
    } catch (error: any) {
      toast.error('Failed to save odontogram: ' + error.message);
      throw error;
    }
  };

  const fetchPeriodontalChart = async () => {
    if (!selectedLeadId) return;
    
    try {
      const response = await fetch(`/api/dental/periodontal?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        // Get the most recent chart
        const latestChart = data.charts?.[0];
        setPeriodontalData(latestChart?.measurements || null);
      }
    } catch (error) {
      console.error('Error fetching periodontal chart:', error);
      setPeriodontalData(null);
    }
  };

  const fetchTreatmentPlans = async () => {
    if (!selectedLeadId) return;
    
    try {
      const response = await fetch(`/api/dental/treatment-plans?leadId=${selectedLeadId}`);
      if (response.ok) {
        const data = await response.json();
        setTreatmentPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
      setTreatmentPlans([]);
    }
  };

  const handleSavePeriodontalChart = async (measurements: any) => {
    if (!selectedLeadId) {
      toast.error('Please select a patient first');
      return;
    }

    try {
      const response = await fetch('/api/dental/periodontal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          measurements,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save periodontal chart');
      }

      toast.success('Periodontal chart saved successfully');
      setPeriodontalData(measurements);
      await fetchPeriodontalChart();
    } catch (error: any) {
      toast.error('Failed to save periodontal chart: ' + error.message);
      throw error;
    }
  };

  const handleSaveTreatmentPlan = async (planData: any) => {
    if (!selectedLeadId) {
      toast.error('Please select a patient first');
      return;
    }

    try {
      const response = await fetch('/api/dental/treatment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planData,
          leadId: selectedLeadId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save treatment plan');
      }

      toast.success('Treatment plan saved successfully');
      await fetchTreatmentPlans();
    } catch (error: any) {
      toast.error('Failed to save treatment plan: ' + error.message);
      throw error;
    }
  };

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/dental/forms?type=templates');
      if (response.ok) {
        const data = await response.json();
        setForms(data.forms || []);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const handleFormCreated = () => {
    fetchForms();
    toast.success('Form template created successfully');
  };

  const handleFormSelect = async (formId: string) => {
    const form = forms.find(f => f.id === formId);
    if (form) {
      setSelectedForm(form);
      setSelectedFormId(formId);
    }
  };

  const handleFormSubmit = async (responseData: Record<string, any>) => {
    if (!selectedLeadId || !selectedFormId) {
      toast.error('Please select a patient and form');
      return;
    }

    try {
      const response = await fetch('/api/dental/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: selectedFormId,
          leadId: selectedLeadId,
          formData: responseData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Form submitted successfully');
        setSelectedFormId(null);
        setSelectedForm(null);
      } else {
        toast.error(data.error || 'Failed to submit form');
      }
    } catch (error: any) {
      toast.error('Failed to submit form: ' + error.message);
    }
  };

  const handleDocumentUploadComplete = () => {
    toast.success('Document uploaded successfully');
    // Optionally refresh document list
  };

  const handleDocumentGenerated = (documentId: string) => {
    toast.success('Document generated and saved');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dental Components Test</h1>
          <p className="text-muted-foreground mt-1">
            Test odontogram and document upload components
          </p>
        </div>
      </div>

      {/* Patient Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Patient</CardTitle>
          <CardDescription>
            Choose a patient to test dental components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedLeadId || ''}
            onValueChange={(value) => setSelectedLeadId(value)}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a patient..." />
            </SelectTrigger>
            <SelectContent>
              {leads.map((lead) => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.contactPerson || lead.businessName || lead.email || lead.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedLeadId ? (
        <Tabs defaultValue="odontogram" className="space-y-4">
          <TabsList className="grid w-full grid-cols-14">
            <TabsTrigger value="odontogram" className="gap-2">
              <Activity className="h-4 w-4" />
              Odontogram
            </TabsTrigger>
            <TabsTrigger value="periodontal" className="gap-2">
              <Stethoscope className="h-4 w-4" />
              Periodontal
            </TabsTrigger>
            <TabsTrigger value="treatment-plan" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Treatment Plan
            </TabsTrigger>
            <TabsTrigger value="procedures" className="gap-2">
              <Calendar className="h-4 w-4" />
              Procedures
            </TabsTrigger>
            <TabsTrigger value="forms-builder" className="gap-2">
              <FormInput className="h-4 w-4" />
              Forms Builder
            </TabsTrigger>
            <TabsTrigger value="forms-fill" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Fill Form
            </TabsTrigger>
            <TabsTrigger value="form-responses" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Responses
            </TabsTrigger>
            <TabsTrigger value="doc-generator" className="gap-2">
              <FilePlus className="h-4 w-4" />
              Generate Doc
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="touch-screen" className="gap-2">
              <Monitor className="h-4 w-4" />
              Check-In
            </TabsTrigger>
            <TabsTrigger value="multi-chair" className="gap-2">
              <Grid3x3 className="h-4 w-4" />
              Multi-Chair
            </TabsTrigger>
            <TabsTrigger value="ramq" className="gap-2">
              <Building2 className="h-4 w-4" />
              RAMQ
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-2">
              <PenTool className="h-4 w-4" />
              Signature
            </TabsTrigger>
            <TabsTrigger value="xray" className="gap-2">
              <Scan className="h-4 w-4" />
              X-Ray
            </TabsTrigger>
          </TabsList>

          <TabsContent value="odontogram">
            <OdontogramComponent
              leadId={selectedLeadId}
              initialData={odontogramData}
              onSave={handleSaveOdontogram}
            />
          </TabsContent>

          <TabsContent value="periodontal">
            <PeriodontalChart
              leadId={selectedLeadId}
              initialData={periodontalData}
              onSave={handleSavePeriodontalChart}
            />
          </TabsContent>

          <TabsContent value="treatment-plan">
            <TreatmentPlanBuilder
              leadId={selectedLeadId}
              onSave={handleSaveTreatmentPlan}
            />
          </TabsContent>

          <TabsContent value="procedures">
            <ProcedureLog leadId={selectedLeadId} />
          </TabsContent>

          <TabsContent value="forms-builder">
            {session?.user?.id ? (
              <FormsBuilder
                userId={session.user.id}
                onFormCreated={handleFormCreated}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Please sign in to create forms</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="forms-fill">
            <Card>
              <CardHeader>
                <CardTitle>Select Form to Fill</CardTitle>
                <CardDescription>
                  Choose a form template to fill out for this patient
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {forms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No forms available. Create a form template first.
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedFormId || ''}
                      onValueChange={handleFormSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a form..." />
                      </SelectTrigger>
                      <SelectContent>
                        {forms.map((form) => (
                          <SelectItem key={form.id} value={form.id}>
                            {form.formName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedForm && (
                      <FormRenderer
                        formId={selectedForm.id}
                        leadId={selectedLeadId!}
                        formSchema={selectedForm.formSchema}
                        formName={selectedForm.formName}
                        description={selectedForm.description}
                        onSave={handleFormSubmit}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form-responses">
            <FormResponsesViewer leadId={selectedLeadId!} />
          </TabsContent>

          <TabsContent value="doc-generator">
            <DocumentGenerator
              leadId={selectedLeadId!}
              onDocumentGenerated={handleDocumentGenerated}
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentUpload
              leadId={selectedLeadId}
              onUploadComplete={handleDocumentUploadComplete}
            />
          </TabsContent>

          <TabsContent value="touch-screen">
            {session?.user?.id ? (
              <TouchScreenWelcome
                userId={session.user.id}
                onCheckIn={() => {
                  toast.success('Patient checked in');
                }}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Please sign in to use check-in system</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="multi-chair">
            {session?.user?.id ? (
              <MultiChairAgenda
                userId={session.user.id}
                selectedDate={new Date()}
                onAppointmentUpdated={() => {
                  toast.success('Appointment updated');
                }}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Please sign in to view multi-chair agenda</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ramq">
            {session?.user?.id ? (
              <RAMQIntegration
                userId={session.user.id}
                leadId={selectedLeadId || undefined}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Please sign in to manage RAMQ claims</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="signature">
            {session?.user?.id ? (
              <ElectronicSignature
                userId={session.user.id}
                leadId={selectedLeadId || undefined}
                onSignatureComplete={(signatureData) => {
                  toast.success('Signature completed');
                }}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Please sign in to use electronic signature</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="xray">
            {session?.user?.id && selectedLeadId ? (
              <XRayUpload
                userId={session.user.id}
                leadId={selectedLeadId}
                onUploadComplete={() => {
                  toast.success('X-ray uploaded successfully');
                }}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Please sign in and select a patient to upload X-rays</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Please select a patient to test the components
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

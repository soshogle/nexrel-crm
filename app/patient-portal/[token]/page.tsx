/**
 * Patient Portal Page
 * Phase 5: Patient-facing portal to view treatment plans, progress, and documents
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TreatmentProgressVisualization } from '@/components/dental/treatment-progress-visualization';
import { TreatmentTimeline } from '@/components/dental/treatment-timeline';
import { FileText, Calendar, CreditCard, Image as ImageIcon, Download } from 'lucide-react';
import { format } from 'date-fns';

interface PatientPortalData {
  patient: {
    name: string;
    email: string;
    phone?: string;
  };
  treatmentPlans: any[];
  appointments: any[];
  documents: any[];
  invoices: any[];
  xrays: any[];
}

export default function PatientPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<PatientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPortalData();
  }, [token]);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dental/patient-portal?token=${token}`);
      if (!response.ok) {
        throw new Error('Invalid or expired portal link');
      }
      const portalData = await response.json();
      setData(portalData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading your portal...</div>
          <div className="text-sm text-gray-600">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Please contact your dental practice for a new portal link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold">Patient Portal</h1>
          <p className="text-gray-600 mt-1">Welcome, {data.patient.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="treatment">Treatment</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Treatment Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data.treatmentPlans.filter((p) => p.status === 'IN_PROGRESS').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data.appointments.filter((a) => new Date(a.startTime) > new Date()).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {data.invoices.filter((i) => i.status === 'SENT').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {data.treatmentPlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Treatment Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.treatmentPlans.map((plan) => (
                      <div key={plan.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{plan.planName}</h3>
                          <Badge>{plan.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Total Cost: ${plan.totalCost?.toFixed(2)}</span>
                          <span>
                            Patient Responsibility: ${plan.patientResponsibility?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="treatment" className="space-y-6 mt-6">
            {data.treatmentPlans.length > 0 && (
              <>
                <TreatmentProgressVisualization
                  leadId={data.treatmentPlans[0].leadId}
                  treatmentPlanId={data.treatmentPlans[0].id}
                />
                <TreatmentTimeline
                  leadId={data.treatmentPlans[0].leadId}
                  treatmentPlanId={data.treatmentPlans[0].id}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.appointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No appointments scheduled</div>
                ) : (
                  <div className="space-y-4">
                    {data.appointments.map((appt) => (
                      <div key={appt.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">
                              {format(new Date(appt.startTime), 'MMM d, yyyy h:mm a')}
                            </div>
                            <div className="text-sm text-gray-600">{appt.professionalName}</div>
                            {appt.notes && (
                              <div className="text-sm text-gray-500 mt-1">{appt.notes}</div>
                            )}
                          </div>
                          <Badge variant={appt.status === 'CONFIRMED' ? 'default' : 'outline'}>
                            {appt.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents & X-Rays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between border rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{doc.name}</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.url} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ))}
                  {data.xrays.map((xray) => (
                    <div key={xray.id} className="flex items-center justify-between border rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium">X-Ray - {xray.description || 'Dental X-Ray'}</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(xray.takenDate), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={xray.imageUrl} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Invoices & Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No invoices available</div>
                ) : (
                  <div className="space-y-4">
                    {data.invoices.map((invoice) => (
                      <div key={invoice.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold">Invoice #{invoice.invoiceNumber}</div>
                            <div className="text-sm text-gray-600">
                              {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <Badge variant={invoice.status === 'PAID' ? 'default' : 'destructive'}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-lg font-semibold">
                            ${invoice.totalAmount?.toFixed(2)}
                          </div>
                          {invoice.status !== 'PAID' && (
                            <Button>Pay Now</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

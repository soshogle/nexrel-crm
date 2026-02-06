/**
 * RAMQ Integration Component
 * Manages RAMQ claim submission and tracking
 * Note: RAMQ uses Facturation.net for billing management
 * This component supports manual claim entry and can integrate with Facturation.net API if available
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { FileText, Send, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { CDT_CODES } from '@/lib/dental/cdt-codes';

interface RAMQClaim {
  id: string;
  claimNumber?: string;
  patientName: string;
  patientRAMQNumber: string;
  procedureCode: string;
  procedureName: string;
  serviceDate: string;
  amount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'PENDING';
  submissionDate?: string;
  responseDate?: string;
  rejectionReason?: string;
  notes?: string;
}

interface RAMQIntegrationProps {
  userId: string;
  leadId?: string;
}

export function RAMQIntegration({ userId, leadId }: RAMQIntegrationProps) {
  const [claims, setClaims] = useState<RAMQClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<RAMQClaim | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  
  // Form state
  const [patientRAMQNumber, setPatientRAMQNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [procedureCode, setProcedureCode] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (leadId) {
      fetchPatientInfo();
    }
    fetchClaims();
  }, [userId, leadId]);

  const fetchPatientInfo = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}`);
      if (response.ok) {
        const lead = await response.json();
        setPatientName(lead.contactPerson || lead.businessName || '');
        const insuranceInfo = lead.insuranceInfo as any;
        if (insuranceInfo?.ramqNumber) {
          setPatientRAMQNumber(insuranceInfo.ramqNumber);
        }
      }
    } catch (error) {
      console.error('Error fetching patient info:', error);
    }
  };

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dental/ramq/claims?userId=${userId}${leadId ? `&leadId=${leadId}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        setClaims(data);
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!patientRAMQNumber || !patientName || !procedureCode || !serviceDate || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const selectedProcedure = CDT_CODES.find(c => c.code === procedureCode);
      const claimData = {
        userId,
        leadId: leadId || null,
        patientName,
        patientRAMQNumber,
        procedureCode,
        procedureName: selectedProcedure?.name || procedureCode,
        serviceDate,
        amount: parseFloat(amount),
        notes: notes || null,
      };

      const response = await fetch('/api/dental/ramq/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimData),
      });

      if (response.ok) {
        toast.success('Claim created successfully');
        setShowSubmitForm(false);
        resetForm();
        await fetchClaims();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create claim');
      }
    } catch (error: any) {
      toast.error('Failed to submit claim: ' + error.message);
    }
  };

  const handleSubmitToRAMQ = async (claimId: string) => {
    try {
      const response = await fetch(`/api/dental/ramq/claims/${claimId}/submit`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Claim submitted to RAMQ');
        await fetchClaims();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit claim');
      }
    } catch (error: any) {
      toast.error('Failed to submit claim: ' + error.message);
    }
  };

  const resetForm = () => {
    setPatientRAMQNumber('');
    setPatientName('');
    setProcedureCode('');
    setServiceDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-500';
      case 'SUBMITTED':
        return 'bg-blue-500';
      case 'APPROVED':
        return 'bg-green-500';
      case 'REJECTED':
        return 'bg-red-500';
      case 'PAID':
        return 'bg-purple-500';
      case 'PENDING':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      case 'SUBMITTED':
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>RAMQ Claim Management</CardTitle>
              <CardDescription>
                Submit and track RAMQ insurance claims. Claims can be submitted via Facturation.net integration.
              </CardDescription>
            </div>
            <Button onClick={() => setShowSubmitForm(true)}>
              <FileText className="h-4 w-4 mr-2" />
              New Claim
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="claims">
            <TabsList>
              <TabsTrigger value="claims">Claims</TabsTrigger>
              <TabsTrigger value="submit">Submit New Claim</TabsTrigger>
            </TabsList>

            <TabsContent value="claims" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading claims...</p>
                </div>
              ) : claims.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No claims found</p>
                  <Button onClick={() => setShowSubmitForm(true)} className="mt-4">
                    Create First Claim
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {claims.map((claim) => (
                    <Card key={claim.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{claim.patientName}</h3>
                              <Badge className={getStatusColor(claim.status)}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(claim.status)}
                                  {claim.status}
                                </span>
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-semibold">RAMQ #:</span> {claim.patientRAMQNumber}
                              </div>
                              <div>
                                <span className="font-semibold">Procedure:</span> {claim.procedureCode} - {claim.procedureName}
                              </div>
                              <div>
                                <span className="font-semibold">Service Date:</span> {new Date(claim.serviceDate).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-semibold">Amount:</span> ${claim.amount.toFixed(2)}
                              </div>
                            </div>
                            {claim.claimNumber && (
                              <div className="mt-2 text-sm">
                                <span className="font-semibold">Claim #:</span> {claim.claimNumber}
                              </div>
                            )}
                            {claim.rejectionReason && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                <span className="font-semibold">Rejection Reason:</span> {claim.rejectionReason}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {claim.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                onClick={() => handleSubmitToRAMQ(claim.id)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Submit
                              </Button>
                            )}
                            {claim.status === 'APPROVED' && (
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedClaim(claim)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="submit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Submit New RAMQ Claim</CardTitle>
                  <CardDescription>
                    Enter claim information. Claims will be submitted through Facturation.net integration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patientName">Patient Name *</Label>
                      <Input
                        id="patientName"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Enter patient name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ramqNumber">RAMQ Number *</Label>
                      <Input
                        id="ramqNumber"
                        value={patientRAMQNumber}
                        onChange={(e) => setPatientRAMQNumber(e.target.value)}
                        placeholder="Enter RAMQ number"
                        maxLength={12}
                      />
                    </div>
                    <div>
                      <Label htmlFor="procedureCode">Procedure Code *</Label>
                      <Select value={procedureCode} onValueChange={setProcedureCode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select procedure" />
                        </SelectTrigger>
                        <SelectContent>
                          {CDT_CODES.map((code) => (
                            <SelectItem key={code.code} value={code.code}>
                              {code.code} - {code.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="serviceDate">Service Date *</Label>
                      <Input
                        id="serviceDate"
                        type="date"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount ($) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes or comments"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSubmitClaim}>
                      <Send className="h-4 w-4 mr-2" />
                      Create Claim
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Claim Detail Dialog */}
      {selectedClaim && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Claim Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedClaim(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient Name</Label>
                <p className="font-semibold">{selectedClaim.patientName}</p>
              </div>
              <div>
                <Label>RAMQ Number</Label>
                <p className="font-semibold">{selectedClaim.patientRAMQNumber}</p>
              </div>
              <div>
                <Label>Procedure</Label>
                <p className="font-semibold">{selectedClaim.procedureCode} - {selectedClaim.procedureName}</p>
              </div>
              <div>
                <Label>Amount</Label>
                <p className="font-semibold">${selectedClaim.amount.toFixed(2)}</p>
              </div>
              <div>
                <Label>Service Date</Label>
                <p className="font-semibold">{new Date(selectedClaim.serviceDate).toLocaleDateString()}</p>
              </div>
              <div>
                <Label>Status</Label>
                <Badge className={getStatusColor(selectedClaim.status)}>
                  {selectedClaim.status}
                </Badge>
              </div>
              {selectedClaim.claimNumber && (
                <div>
                  <Label>Claim Number</Label>
                  <p className="font-semibold">{selectedClaim.claimNumber}</p>
                </div>
              )}
              {selectedClaim.submissionDate && (
                <div>
                  <Label>Submitted</Label>
                  <p className="font-semibold">{new Date(selectedClaim.submissionDate).toLocaleString()}</p>
                </div>
              )}
              {selectedClaim.responseDate && (
                <div>
                  <Label>Response Date</Label>
                  <p className="font-semibold">{new Date(selectedClaim.responseDate).toLocaleString()}</p>
                </div>
              )}
            </div>
            {selectedClaim.notes && (
              <div>
                <Label>Notes</Label>
                <p className="text-sm text-muted-foreground">{selectedClaim.notes}</p>
              </div>
            )}
            {selectedClaim.rejectionReason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <Label className="text-red-800">Rejection Reason</Label>
                <p className="text-sm text-red-800">{selectedClaim.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

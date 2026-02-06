/**
 * Dental Components Test Page
 * Test page for odontogram and document upload components
 */

'use client';

import { useState, useEffect } from 'react';
import { Odontogram } from '@/components/dental/odontogram';
import { DocumentUpload } from '@/components/dental/document-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Activity } from 'lucide-react';

export default function DentalTestPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [odontogramData, setOdontogramData] = useState<any>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (selectedLeadId) {
      fetchOdontogram();
    }
  }, [selectedLeadId]);

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

  const handleDocumentUploadComplete = () => {
    toast.success('Document uploaded successfully');
    // Optionally refresh document list
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
          <TabsList>
            <TabsTrigger value="odontogram" className="gap-2">
              <Activity className="h-4 w-4" />
              Odontogram
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Document Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="odontogram">
            <Odontogram
              leadId={selectedLeadId}
              initialData={odontogramData}
              onSave={handleSaveOdontogram}
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentUpload
              leadId={selectedLeadId}
              onUploadComplete={handleDocumentUploadComplete}
            />
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

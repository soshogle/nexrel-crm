/**
 * Dental Procedure Activity Log Component
 * Timeline view of procedures with CDT codes and status tracking
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Plus, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import { ProcedureStatus } from '@prisma/client';
import { CDT_CODES, getCDTCodeByCode } from '@/lib/dental/cdt-codes';

interface ProcedureLogProps {
  leadId: string;
  treatmentPlanId?: string;
  readOnly?: boolean;
}

interface Procedure {
  id?: string;
  procedureCode: string;
  procedureName: string;
  description?: string;
  teethInvolved?: string[];
  status: ProcedureStatus;
  cost: number;
  insuranceCoverage?: number;
  scheduledDate?: string;
  performedDate?: string;
  performedBy?: string;
  notes?: string;
}

export function ProcedureLog({ leadId, treatmentPlanId, readOnly = false }: ProcedureLogProps) {
  const t = useTranslations('dental.procedureLog');
  const tToasts = useTranslations('dental.toasts');
  const tCommon = useTranslations('common');
  
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [newProcedure, setNewProcedure] = useState<Partial<Procedure>>({
    procedureCode: '',
    procedureName: '',
    status: ProcedureStatus.SCHEDULED,
    cost: 0,
    teethInvolved: [],
  });

  useEffect(() => {
    loadProcedures();
  }, [leadId, treatmentPlanId, selectedStatus]);

  const loadProcedures = async () => {
    try {
      setLoading(true);
      let url = `/api/dental/procedures?leadId=${leadId}`;
      if (treatmentPlanId) url += `&treatmentPlanId=${treatmentPlanId}`;
      if (selectedStatus !== 'all') url += `&status=${selectedStatus}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setProcedures(data.procedures || []);
      }
    } catch (error) {
      console.error('Failed to load procedures:', error);
      toast.error(tToasts('procedureAddFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddProcedure = async () => {
    if (!newProcedure.procedureCode || !newProcedure.procedureName) {
      toast.error(t('codeRequired'));
      return;
    }

    try {
      const response = await fetch('/api/dental/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          treatmentPlanId,
          ...newProcedure,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(tToasts('procedureAdded'));
        setShowAddDialog(false);
        setNewProcedure({
          procedureCode: '',
          procedureName: '',
          status: ProcedureStatus.SCHEDULED,
          cost: 0,
          teethInvolved: [],
        });
        loadProcedures();
      } else {
        toast.error(data.error || tToasts('procedureAddFailed'));
      }
    } catch (error: any) {
      toast.error(tToasts('procedureAddFailed') + ': ' + error.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: ProcedureStatus) => {
    try {
      const response = await fetch('/api/dental/procedures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          performedDate: status === ProcedureStatus.COMPLETED ? new Date().toISOString() : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(tToasts('procedureStatusUpdated'));
        loadProcedures();
      }
    } catch (error) {
      toast.error(tToasts('procedureStatusFailed'));
    }
  };

  const getStatusIcon = (status: ProcedureStatus) => {
    switch (status) {
      case ProcedureStatus.COMPLETED:
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case ProcedureStatus.CANCELLED:
        return <XCircle className="h-4 w-4 text-red-600" />;
      case ProcedureStatus.IN_PROGRESS:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: ProcedureStatus) => {
    switch (status) {
      case ProcedureStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case ProcedureStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case ProcedureStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCDTCodeSelect = (code: string) => {
    const cdtCode = getCDTCodeByCode(code);
    if (cdtCode) {
      setNewProcedure({
        ...newProcedure,
        procedureCode: cdtCode.code,
        procedureName: cdtCode.name,
        cost: cdtCode.typicalCost || 0,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Procedure Activity Log</CardTitle>
            <CardDescription>
              Track procedures, CDT codes, and treatment timeline
            </CardDescription>
          </div>
          {!readOnly && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Procedure
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Procedure</DialogTitle>
                  <DialogDescription>
                    Record a procedure with CDT code and details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>CDT Code</Label>
                    <Select
                      value={newProcedure.procedureCode}
                      onValueChange={handleCDTCodeSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CDT code" />
                      </SelectTrigger>
                      <SelectContent>
                        {CDT_CODES.map(code => (
                          <SelectItem key={code.code} value={code.code}>
                            {code.code} - {code.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Procedure Name</Label>
                    <Input
                      value={newProcedure.procedureName}
                      onChange={(e) =>
                        setNewProcedure({ ...newProcedure, procedureName: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cost ($)</Label>
                      <Input
                        type="number"
                        value={newProcedure.cost}
                        onChange={(e) =>
                          setNewProcedure({
                            ...newProcedure,
                            cost: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={newProcedure.status}
                        onValueChange={(value) =>
                          setNewProcedure({
                            ...newProcedure,
                            status: value as ProcedureStatus,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ProcedureStatus.SCHEDULED}>Scheduled</SelectItem>
                          <SelectItem value={ProcedureStatus.IN_PROGRESS}>In Progress</SelectItem>
                          <SelectItem value={ProcedureStatus.COMPLETED}>Completed</SelectItem>
                          <SelectItem value={ProcedureStatus.CANCELLED}>Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Teeth Involved</Label>
                    <Input
                      value={newProcedure.teethInvolved?.join(', ') || ''}
                      onChange={(e) =>
                        setNewProcedure({
                          ...newProcedure,
                          teethInvolved: e.target.value
                            .split(',')
                            .map(t => t.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="1, 2, 3"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newProcedure.description || ''}
                      onChange={(e) =>
                        setNewProcedure({ ...newProcedure, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProcedure}>Add Procedure</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <Label>Filter by Status:</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={ProcedureStatus.SCHEDULED}>Scheduled</SelectItem>
              <SelectItem value={ProcedureStatus.IN_PROGRESS}>In Progress</SelectItem>
              <SelectItem value={ProcedureStatus.COMPLETED}>Completed</SelectItem>
              <SelectItem value={ProcedureStatus.CANCELLED}>Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading procedures...</div>
        ) : procedures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No procedures found. Add a procedure to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {procedures.map((procedure) => (
              <Card key={procedure.id || Math.random()}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(procedure.status)}
                        <div>
                          <div className="font-semibold">{procedure.procedureCode}</div>
                          <div className="text-sm text-gray-600">{procedure.procedureName}</div>
                        </div>
                        <Badge className={getStatusColor(procedure.status)}>
                          {procedure.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {procedure.description && (
                        <div className="text-sm text-gray-600 mb-2">{procedure.description}</div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {procedure.scheduledDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Scheduled: {new Date(procedure.scheduledDate).toLocaleDateString()}
                          </div>
                        )}
                        {procedure.performedDate && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Performed: {new Date(procedure.performedDate).toLocaleDateString()}
                          </div>
                        )}
                        {procedure.teethInvolved && procedure.teethInvolved.length > 0 && (
                          <div>Teeth: {procedure.teethInvolved.join(', ')}</div>
                        )}
                        <div className="font-semibold text-green-600">
                          ${procedure.cost.toFixed(2)}
                        </div>
                      </div>
                      {procedure.performedBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          Performed by: {procedure.performedBy}
                        </div>
                      )}
                      {procedure.notes && (
                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                          <FileText className="h-4 w-4 inline mr-1" />
                          {procedure.notes}
                        </div>
                      )}
                    </div>
                    {!readOnly && procedure.status !== ProcedureStatus.COMPLETED && (
                      <div className="flex gap-2">
                        {procedure.status === ProcedureStatus.SCHEDULED && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(procedure.id!, ProcedureStatus.IN_PROGRESS)
                            }
                          >
                            Start
                          </Button>
                        )}
                        {procedure.status === ProcedureStatus.IN_PROGRESS && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(procedure.id!, ProcedureStatus.COMPLETED)
                            }
                          >
                            Complete
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(procedure.id!, ProcedureStatus.CANCELLED)
                          }
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

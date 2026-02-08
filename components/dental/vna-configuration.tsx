/**
 * VNA Configuration Component
 * Phase 2: Manage VNA configurations and routing rules
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, TestTube, Trash2, Edit, CheckCircle2, XCircle, Server, Cloud } from 'lucide-react';

interface VnaConfiguration {
  id: string;
  name: string;
  type: 'ORTHANC' | 'AWS_S3' | 'AZURE_BLOB' | 'CLOUD_VNA' | 'OTHER';
  endpoint?: string;
  aeTitle?: string;
  host?: string;
  port?: number;
  bucket?: string;
  region?: string;
  pathPrefix?: string;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  description?: string;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed' | 'pending';
  lastTestError?: string;
}

export function VnaConfigurationManager() {
  const { data: session } = useSession();
  const [vnas, setVnas] = useState<VnaConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVna, setEditingVna] = useState<VnaConfiguration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'ORTHANC' as VnaConfiguration['type'],
    endpoint: '',
    aeTitle: '',
    host: '',
    port: 8042,
    credentials: { username: '', password: '' },
    bucket: '',
    region: 'ca-central-1',
    pathPrefix: '',
    priority: 0,
    isDefault: false,
    description: '',
  });

  useEffect(() => {
    fetchVnas();
  }, []);

  const fetchVnas = async () => {
    try {
      const response = await fetch('/api/dental/vna');
      if (response.ok) {
        const data = await response.json();
        setVnas(data.vnas || []);
      }
    } catch (error) {
      console.error('Error fetching VNAs:', error);
      toast.error('Failed to load VNA configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/dental/vna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('VNA configuration created');
        setIsDialogOpen(false);
        resetForm();
        fetchVnas();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create VNA');
      }
    } catch (error) {
      toast.error('Failed to create VNA configuration');
    }
  };

  const handleUpdate = async () => {
    if (!editingVna) return;

    try {
      const response = await fetch('/api/dental/vna', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingVna.id,
          ...formData,
        }),
      });

      if (response.ok) {
        toast.success('VNA configuration updated');
        setIsDialogOpen(false);
        setEditingVna(null);
        resetForm();
        fetchVnas();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update VNA');
      }
    } catch (error) {
      toast.error('Failed to update VNA configuration');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this VNA configuration?')) return;

    try {
      const response = await fetch(`/api/dental/vna?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('VNA configuration deleted');
        fetchVnas();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete VNA');
      }
    } catch (error) {
      toast.error('Failed to delete VNA configuration');
    }
  };

  const handleTest = async (vna: VnaConfiguration) => {
    setTestingId(vna.id);
    try {
      const response = await fetch(`/api/dental/vna/${vna.id}/test`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success && data.testResult.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(data.testResult.error || 'Connection test failed');
      }
      fetchVnas();
    } catch (error) {
      toast.error('Failed to test connection');
    } finally {
      setTestingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'ORTHANC',
      endpoint: '',
      aeTitle: '',
      host: '',
      port: 8042,
      credentials: { username: '', password: '' },
      bucket: '',
      region: 'ca-central-1',
      pathPrefix: '',
      priority: 0,
      isDefault: false,
      description: '',
    });
  };

  const openEditDialog = (vna: VnaConfiguration) => {
    setEditingVna(vna);
    setFormData({
      name: vna.name,
      type: vna.type,
      endpoint: vna.endpoint || '',
      aeTitle: vna.aeTitle || '',
      host: vna.host || '',
      port: vna.port || 8042,
      credentials: { username: '', password: '' },
      bucket: vna.bucket || '',
      region: vna.region || 'ca-central-1',
      pathPrefix: vna.pathPrefix || '',
      priority: vna.priority,
      isDefault: vna.isDefault,
      description: vna.description || '',
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading VNA configurations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">VNA Configurations</h3>
          <p className="text-sm text-gray-600">Manage your VNA (Vendor Neutral Archive) connections</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingVna(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add VNA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVna ? 'Edit VNA Configuration' : 'Add VNA Configuration'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Clinic VNA"
                />
              </div>

              <div>
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v: any) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORTHANC">Orthanc DICOM Server</SelectItem>
                    <SelectItem value="AWS_S3">AWS S3 Storage</SelectItem>
                    <SelectItem value="AZURE_BLOB">Azure Blob Storage</SelectItem>
                    <SelectItem value="CLOUD_VNA">Cloud VNA (Dentitek, etc.)</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'ORTHANC' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Host</Label>
                      <Input
                        value={formData.host}
                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                        placeholder="localhost or IP address"
                      />
                    </div>
                    <div>
                      <Label>Port</Label>
                      <Input
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 8042 })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>AE Title</Label>
                    <Input
                      value={formData.aeTitle}
                      onChange={(e) => setFormData({ ...formData, aeTitle: e.target.value })}
                      placeholder="NEXREL-CRM"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Username</Label>
                      <Input
                        type="password"
                        value={formData.credentials.username}
                        onChange={(e) => setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, username: e.target.value },
                        })}
                      />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={formData.credentials.password}
                        onChange={(e) => setFormData({
                          ...formData,
                          credentials: { ...formData.credentials, password: e.target.value },
                        })}
                      />
                    </div>
                  </div>
                </>
              )}

              {(formData.type === 'AWS_S3' || formData.type === 'AZURE_BLOB') && (
                <>
                  <div>
                    <Label>Bucket/Container</Label>
                    <Input
                      value={formData.bucket}
                      onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
                      placeholder="bucket-name or container-name"
                    />
                  </div>
                  <div>
                    <Label>Region</Label>
                    <Input
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      placeholder="ca-central-1"
                    />
                  </div>
                  <div>
                    <Label>Path Prefix (optional)</Label>
                    <Input
                      value={formData.pathPrefix}
                      onChange={(e) => setFormData({ ...formData, pathPrefix: e.target.value })}
                      placeholder="dicom/"
                    />
                  </div>
                </>
              )}

              {formData.type === 'CLOUD_VNA' && (
                <div>
                  <Label>Endpoint URL</Label>
                  <Input
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    placeholder="https://api.vna-provider.com"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower number = higher priority</p>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label>Set as default VNA</Label>
                </div>
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional notes about this VNA..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={editingVna ? handleUpdate : handleCreate}>
                  {editingVna ? 'Update' : 'Create'} VNA
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* VNA List */}
      <div className="space-y-3">
        {vnas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-400">
              No VNA configurations. Click "Add VNA" to create one.
            </CardContent>
          </Card>
        ) : (
          vnas.map((vna) => (
            <Card key={vna.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{vna.name}</CardTitle>
                      {vna.isDefault && (
                        <Badge variant="default">Default</Badge>
                      )}
                      {vna.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">Inactive</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {vna.type} {vna.host && `• ${vna.host}:${vna.port}`}
                      {vna.bucket && `• ${vna.bucket}`}
                    </CardDescription>
                    {vna.description && (
                      <p className="text-sm text-gray-600 mt-2">{vna.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {vna.lastTestStatus && (
                      <div className="flex items-center gap-1">
                        {vna.lastTestStatus === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-xs text-gray-600">
                          {vna.lastTestedAt ? new Date(vna.lastTestedAt).toLocaleDateString() : 'Never tested'}
                        </span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(vna)}
                      disabled={testingId === vna.id}
                    >
                      <TestTube className="w-4 h-4 mr-1" />
                      {testingId === vna.id ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(vna)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(vna.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

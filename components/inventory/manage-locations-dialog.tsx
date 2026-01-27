
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, MapPin, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface ManageLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: any[];
  onSuccess: () => void;
}

export default function ManageLocationsDialog({
  open,
  onOpenChange,
  locations,
  onSuccess,
}: ManageLocationsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'WAREHOUSE',
    isDefault: false,
  });

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('Location name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/general-inventory/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create location');
      }

      toast.success('Location created successfully');
      setFormData({ name: '', address: '', type: 'WAREHOUSE', isDefault: false });
      setShowAddForm(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/general-inventory/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || 'Failed to update location');
      }

      toast.success('Location updated successfully');
      setEditingId(null);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/general-inventory/locations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete location');
      }

      toast.success('Location deleted successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Manage Locations
          </DialogTitle>
          <DialogDescription>
            Add, edit, or delete storage locations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Location
            </Button>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Location Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Warehouse"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                      <SelectItem value="STORE">Store</SelectItem>
                      <SelectItem value="OFFICE">Office</SelectItem>
                      <SelectItem value="VEHICLE">Vehicle</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Set as Default Location</Label>
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="ml-2">Save</span>
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', address: '', type: 'WAREHOUSE', isDefault: false });
                  }} disabled={isLoading}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {locations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No locations yet</p>
              </div>
            ) : (
              locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  isEditing={editingId === location.id}
                  onEdit={() => setEditingId(location.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={(data: any) => handleUpdate(location.id, data)}
                  onDelete={() => handleDelete(location.id, location.name)}
                  isLoading={isLoading}
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LocationCard({ location, isEditing, onEdit, onCancelEdit, onUpdate, onDelete, isLoading }: any) {
  const [editData, setEditData] = useState({
    name: location.name,
    address: location.address || '',
    type: location.type || 'WAREHOUSE',
    isDefault: location.isDefault,
  });

  if (isEditing) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-2">
            <Label>Location Name *</Label>
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={editData.address}
              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={editData.type}
              onValueChange={(value) => setEditData({ ...editData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                <SelectItem value="STORE">Store</SelectItem>
                <SelectItem value="OFFICE">Office</SelectItem>
                <SelectItem value="VEHICLE">Vehicle</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Set as Default Location</Label>
            <Switch
              checked={editData.isDefault}
              onCheckedChange={(checked) => setEditData({ ...editData, isDefault: checked })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onUpdate(editData)} disabled={isLoading} size="sm">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-2">Save</span>
            </Button>
            <Button variant="outline" onClick={onCancelEdit} disabled={isLoading} size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-white">{location.name}</h4>
              {location.isDefault && (
                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                  Default
                </span>
              )}
            </div>
            {location.type && (
              <p className="text-sm text-gray-400 capitalize">{location.type.toLowerCase()}</p>
            )}
            {location.address && <p className="text-sm text-gray-400">{location.address}</p>}
            <p className="text-xs text-gray-500 pt-1">{location._count?.items || 0} items</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={isLoading}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={isLoading}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

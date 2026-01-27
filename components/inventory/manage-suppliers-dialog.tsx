
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Truck, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface ManageSuppliersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: any[];
  onSuccess: () => void;
}

export default function ManageSuppliersDialog({
  open,
  onOpenChange,
  suppliers,
  onSuccess,
}: ManageSuppliersDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    notes: '',
  });

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('Supplier name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/general-inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create supplier');
      }

      toast.success('Supplier created successfully');
      setFormData({ name: '', contactName: '', email: '', phone: '', address: '', website: '', notes: '' });
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
      const response = await fetch(`/api/general-inventory/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || 'Failed to update supplier');
      }

      toast.success('Supplier updated successfully');
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
      const response = await fetch(`/api/general-inventory/suppliers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete supplier');
      }

      toast.success('Supplier deleted successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Manage Suppliers
          </DialogTitle>
          <DialogDescription>
            Add, edit, or delete inventory suppliers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Supplier
            </Button>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="supplier@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
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
                  <Label>Website</Label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="ml-2">Save</span>
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', contactName: '', email: '', phone: '', address: '', website: '', notes: '' });
                  }} disabled={isLoading}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {suppliers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No suppliers yet</p>
              </div>
            ) : (
              suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  isEditing={editingId === supplier.id}
                  onEdit={() => setEditingId(supplier.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={(data: any) => handleUpdate(supplier.id, data)}
                  onDelete={() => handleDelete(supplier.id, supplier.name)}
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

function SupplierCard({ supplier, isEditing, onEdit, onCancelEdit, onUpdate, onDelete, isLoading }: any) {
  const [editData, setEditData] = useState({
    name: supplier.name,
    contactName: supplier.contactName || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    address: supplier.address || '',
    website: supplier.website || '',
    notes: supplier.notes || '',
  });

  if (isEditing) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier Name *</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input
                value={editData.contactName}
                onChange={(e) => setEditData({ ...editData, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={editData.address}
              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              type="url"
              value={editData.website}
              onChange={(e) => setEditData({ ...editData, website: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={2}
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
            <h4 className="font-medium text-white">{supplier.name}</h4>
            {supplier.contactName && <p className="text-sm text-gray-400">Contact: {supplier.contactName}</p>}
            {supplier.email && <p className="text-sm text-gray-400">{supplier.email}</p>}
            {supplier.phone && <p className="text-sm text-gray-400">{supplier.phone}</p>}
            <p className="text-xs text-gray-500 pt-1">{supplier._count?.items || 0} items</p>
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

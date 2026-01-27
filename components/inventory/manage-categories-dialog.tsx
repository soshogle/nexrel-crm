
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FolderTree, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: any[];
  onSuccess: () => void;
}

export default function ManageCategoriesDialog({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: ManageCategoriesDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('Category name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/general-inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create category');
      }

      toast.success('Category created successfully');
      setFormData({ name: '', description: '' });
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
      const response = await fetch(`/api/general-inventory/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.error || 'Failed to update category');
      }

      toast.success('Category updated successfully');
      setEditingId(null);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/general-inventory/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete category');
      }

      toast.success('Category deleted successfully');
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
            <FolderTree className="h-5 w-5" />
            Manage Categories
          </DialogTitle>
          <DialogDescription>
            Add, edit, or delete inventory categories
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Category Button/Form */}
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Category
            </Button>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-sm">New Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Category name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description"
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
                    setFormData({ name: '', description: '' });
                  }} disabled={isLoading}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No categories yet</p>
              </div>
            ) : (
              categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isEditing={editingId === category.id}
                  onEdit={() => setEditingId(category.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={(data: any) => handleUpdate(category.id, data)}
                  onDelete={() => handleDelete(category.id, category.name)}
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

function CategoryCard({ category, isEditing, onEdit, onCancelEdit, onUpdate, onDelete, isLoading }: any) {
  const [editData, setEditData] = useState({
    name: category.name,
    description: category.description || '',
  });

  if (isEditing) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
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
          <div className="flex-1">
            <h4 className="font-medium text-white">{category.name}</h4>
            {category.description && (
              <p className="text-sm text-gray-400 mt-1">{category.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">{category._count?.items || 0} items</p>
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

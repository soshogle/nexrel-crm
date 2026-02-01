
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users, MapPin, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);

  // Form state
  const [tableName, setTableName] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [section, setSection] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reservations/tables');
      
      if (!response.ok) throw new Error('Failed to fetch tables');

      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingTable
        ? `/api/reservations/tables/${editingTable.id}`
        : '/api/reservations/tables';

      const response = await fetch(url, {
        method: editingTable ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          capacity: parseInt(capacity),
          section: section || null,
          isPremium,
        }),
      });

      if (!response.ok) throw new Error('Failed to save table');

      toast.success(editingTable ? 'Table updated' : 'Table created');
      setShowDialog(false);
      resetForm();
      fetchTables();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save table');
    }
  };

  const handleEdit = (table: any) => {
    setEditingTable(table);
    setTableName(table.tableName);
    setCapacity(table.capacity.toString());
    setSection(table.section || '');
    setIsPremium(table.isPremium);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      const response = await fetch(`/api/reservations/tables/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete table');

      toast.success('Table deleted');
      fetchTables();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete table');
    }
  };

  const handleToggleActive = async (table: any) => {
    try {
      const response = await fetch(`/api/reservations/tables/${table.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !table.isActive,
        }),
      });

      if (!response.ok) throw new Error('Failed to update table');

      toast.success(`Table ${!table.isActive ? 'activated' : 'deactivated'}`);
      fetchTables();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update table');
    }
  };

  const resetForm = () => {
    setEditingTable(null);
    setTableName('');
    setCapacity('4');
    setSection('');
    setIsPremium(false);
  };

  const handleDialogChange = (open: boolean) => {
    setShowDialog(open);
    if (!open) resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/reservations">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Reservations
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Restaurant Tables</h1>
          <p className="text-muted-foreground">
            Manage your restaurant floor plan and table configuration
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </DialogTitle>
              <DialogDescription>
                Configure your restaurant table details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tableName">Table Name *</Label>
                <Input
                  id="tableName"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g., Table 1, Booth A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Select value={capacity} onValueChange={setCapacity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8, 10, 12].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} seats
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Section (Optional)</Label>
                <Input
                  id="section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g., Patio, Main Dining, Bar"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isPremium" className="cursor-pointer">
                  Premium Table (window seat, best view, etc.)
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTable ? 'Update Table' : 'Create Table'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No tables configured yet</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id} className={!table.isActive ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{table.tableName}</CardTitle>
                    {table.section && (
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {table.section}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {table.isPremium && (
                      <Badge variant="secondary" className="text-xs">
                        Premium
                      </Badge>
                    )}
                    <Badge
                      variant={table.isActive ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {table.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Capacity: {table.capacity} seats</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(table)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(table)}
                    className="flex-1"
                  >
                    {table.isActive ? (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(table.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && tables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Tables</p>
                <p className="text-2xl font-bold">{tables.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Tables</p>
                <p className="text-2xl font-bold">
                  {tables.filter((t) => t.isActive).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Capacity</p>
                <p className="text-2xl font-bold">
                  {tables.reduce((sum, t) => sum + (t.isActive ? t.capacity : 0), 0)} seats
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

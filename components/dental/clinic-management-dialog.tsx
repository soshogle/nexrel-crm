/**
 * Clinic Management Dialog
 * Create, edit, and manage clinics for multi-clinic support
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Plus, Pencil, Trash2, Save, X, MapPin, Phone, Mail, Globe, Clock, DollarSign, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useClinic } from '@/lib/dental/clinic-context';

interface Clinic {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  logo?: string;
  primaryColor?: string;
  isActive: boolean;
  role: string;
  isPrimary: boolean;
  membershipId: string;
}

interface ClinicManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinics: Clinic[];
  onSuccess: () => void;
}

const TIMEZONES = [
  'America/Toronto',
  'America/Vancouver',
  'America/Edmonton',
  'America/Winnipeg',
  'America/Halifax',
  'America/St_Johns',
];

const CURRENCIES = ['CAD', 'USD', 'EUR'];
const LANGUAGES = ['en', 'fr'];

export function ClinicManagementDialog({
  open,
  onOpenChange,
  clinics,
  onSuccess,
}: ClinicManagementDialogProps) {
  const { activeClinic, setActiveClinic, refreshClinics } = useClinic();
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Canada',
    phone: '',
    email: '',
    website: '',
    timezone: 'America/Toronto',
    currency: 'CAD',
    language: 'en',
    logo: '',
    primaryColor: '#9333ea',
    isActive: true,
  });

  useEffect(() => {
    if (!open) {
      setShowAddForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Canada',
        phone: '',
        email: '',
        website: '',
        timezone: 'America/Toronto',
        currency: 'CAD',
        language: 'en',
        logo: '',
        primaryColor: '#9333ea',
        isActive: true,
      });
    }
  }, [open]);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Clinic name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create clinic');
      }

      const result = await response.json();
      toast.success('Clinic created successfully');
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Canada',
        phone: '',
        email: '',
        website: '',
        timezone: 'America/Toronto',
        currency: 'CAD',
        language: 'en',
        logo: '',
        primaryColor: '#9333ea',
        isActive: true,
      });
      setShowAddForm(false);
      await refreshClinics();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingId(clinic.id);
    setFormData({
      name: clinic.name,
      address: clinic.address || '',
      city: clinic.city || '',
      state: clinic.state || '',
      zipCode: clinic.zipCode || '',
      country: clinic.country || 'Canada',
      phone: clinic.phone || '',
      email: clinic.email || '',
      website: clinic.website || '',
      timezone: clinic.timezone || 'America/Toronto',
      currency: clinic.currency || 'CAD',
      language: clinic.language || 'en',
      logo: clinic.logo || '',
      primaryColor: clinic.primaryColor || '#9333ea',
      isActive: clinic.isActive,
    });
    setShowAddForm(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!formData.name.trim()) {
      toast.error('Clinic name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/clinics/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update clinic');
      }

      toast.success('Clinic updated successfully');
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Canada',
        phone: '',
        email: '',
        website: '',
        timezone: 'America/Toronto',
        currency: 'CAD',
        language: 'en',
        logo: '',
        primaryColor: '#9333ea',
        isActive: true,
      });
      await refreshClinics();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (clinicId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/clinics/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set primary clinic');
      }

      await refreshClinics();
      toast.success('Primary clinic updated');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Canada',
      phone: '',
      email: '',
      website: '',
      timezone: 'America/Toronto',
      currency: 'CAD',
      language: 'en',
      logo: '',
      primaryColor: '#9333ea',
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Manage Clinics
          </DialogTitle>
          <DialogDescription>
            Create, edit, and manage your clinic locations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add/Edit Form */}
          {(showAddForm || editingId) && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {editingId ? 'Edit Clinic' : 'Create New Clinic'}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Clinic Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Downtown Dental Clinic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Toronto"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Province/State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="ON"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">Postal Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="M5H 2N2"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="info@clinic.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://clinic.com"
                      />
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={formData.timezone}
                        onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz.replace('America/', '')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr} value={curr}>
                              {curr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={formData.language}
                        onValueChange={(value) => setFormData({ ...formData, language: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang === 'en' ? 'English' : 'Français'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Branding */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="logo">Logo URL</Label>
                      <Input
                        id="logo"
                        value={formData.logo}
                        onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="w-20"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          placeholder="#9333ea"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button onClick={editingId ? handleUpdate : handleAdd} disabled={isLoading}>
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingId ? 'Update Clinic' : 'Create Clinic'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clinics List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your Clinics</h3>
              {!showAddForm && !editingId && (
                <Button onClick={() => setShowAddForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Clinic
                </Button>
              )}
            </div>

            {clinics.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No clinics found. Create your first clinic to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {clinics.map((clinic) => (
                  <Card key={clinic.id} className={activeClinic?.id === clinic.id ? 'border-purple-500' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{clinic.name}</h4>
                            {clinic.isPrimary && (
                              <Badge variant="default" className="bg-purple-600">Primary</Badge>
                            )}
                            {clinic.role === 'OWNER' && (
                              <Badge variant="outline">Owner</Badge>
                            )}
                            {clinic.role === 'ADMIN' && (
                              <Badge variant="outline">Admin</Badge>
                            )}
                            {!clinic.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            {clinic.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>
                                  {clinic.address}
                                  {clinic.city && `, ${clinic.city}`}
                                  {clinic.state && ` ${clinic.state}`}
                                  {clinic.zipCode && ` ${clinic.zipCode}`}
                                </span>
                              </div>
                            )}
                            {clinic.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{clinic.phone}</span>
                              </div>
                            )}
                            {clinic.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span>{clinic.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{clinic.timezone?.replace('America/', '') || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                <span>{clinic.currency || 'CAD'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!clinic.isPrimary && (clinic.role === 'OWNER' || clinic.role === 'ADMIN') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetPrimary(clinic.id)}
                              disabled={isLoading}
                            >
                              Set Primary
                            </Button>
                          )}
                          {(clinic.role === 'OWNER' || clinic.role === 'ADMIN') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(clinic)}
                              disabled={isLoading || editingId !== null}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

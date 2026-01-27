
'use client';

/**
 * Payment Methods Manager Component
 * Manage customer payment methods
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Trash2, Star, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PaymentMethodsManager() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [type, setType] = useState<'card' | 'bank_account'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/soshogle/payment-methods');
      if (res.ok) {
        const data = await res.json();
        setMethods(data.methods || []);
      }
    } catch (error) {
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const last4 = cardNumber.slice(-4);
      const brand = detectCardBrand(cardNumber);

      const res = await fetch('/api/payments/soshogle/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          details: {
            last4,
            brand,
            expiryMonth: parseInt(expiryMonth, 10),
            expiryYear: parseInt(expiryYear, 10),
            cardNumber, // In production, use tokenization
            cvc,
          },
          isDefault,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add payment method');
      }

      toast.success('Payment method added successfully');
      setAddDialogOpen(false);
      resetForm();
      loadMethods();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const res = await fetch('/api/payments/soshogle/payment-methods/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methodId }),
      });

      if (!res.ok) {
        throw new Error('Failed to set default payment method');
      }

      toast.success('Default payment method updated');
      loadMethods();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      const res = await fetch(`/api/payments/soshogle/payment-methods?methodId=${methodId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete payment method');
      }

      toast.success('Payment method deleted');
      loadMethods();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setType('card');
    setCardNumber('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvc('');
    setIsDefault(false);
  };

  const detectCardBrand = (number: string): string => {
    const firstDigit = number.charAt(0);
    if (firstDigit === '4') return 'Visa';
    if (firstDigit === '5') return 'Mastercard';
    if (firstDigit === '3') return 'Amex';
    return 'Card';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Manage your saved payment methods</CardDescription>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>
                  Add a new payment method to your account
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddMethod} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(value: any) => setType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="bank_account">Bank Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {type === 'card' && (
                  <>
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={16}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Expiry Month</Label>
                        <Input
                          type="text"
                          value={expiryMonth}
                          onChange={(e) => setExpiryMonth(e.target.value)}
                          placeholder="MM"
                          maxLength={2}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Year</Label>
                        <Input
                          type="text"
                          value={expiryYear}
                          onChange={(e) => setExpiryYear(e.target.value)}
                          placeholder="YYYY"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>CVC</Label>
                      <Input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    Set as default payment method
                  </Label>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={adding} className="flex-1">
                    {adding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Payment Method'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {methods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No payment methods added yet</p>
            <p className="text-sm mt-1">Add a payment method to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {method.brand} •••• {method.last4}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(method.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

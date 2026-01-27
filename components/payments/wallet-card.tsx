
'use client';

/**
 * Wallet Card Component
 * Display and manage wallet balance
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Plus, Minus, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export function WalletCard() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments/soshogle/wallet');
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
      }
    } catch (error) {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      const res = await fetch('/api/payments/soshogle/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountValue,
          type: 'credit',
          description: 'Added funds to wallet',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add funds');
      }

      toast.success(`$${amountValue.toFixed(2)} added to wallet`);
      setAddDialogOpen(false);
      setAmount('');
      loadWallet();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
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
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Soshogle Wallet
            </CardTitle>
            <CardDescription>Your digital wallet balance</CardDescription>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Funds
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Funds to Wallet</DialogTitle>
                <DialogDescription>
                  Add money to your Soshogle wallet
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddFunds} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={processing} className="flex-1">
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Add Funds'
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
        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
            <p className="text-4xl font-bold">
              ${wallet?.balance?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {wallet?.currency || 'USD'}
            </p>
          </div>

          {wallet?.lastTransactionAt && (
            <p className="text-sm text-muted-foreground">
              Last transaction: {new Date(wallet.lastTransactionAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

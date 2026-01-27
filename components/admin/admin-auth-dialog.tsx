
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';

interface AdminAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (sessionToken: string) => void;
}

export default function AdminAuthDialog({ open, onOpenChange, onSuccess }: AdminAuthDialogProps) {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    try {
      setIsVerifying(true);

      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid password');
      }

      const data = await response.json();
      
      // Store session token in localStorage
      localStorage.setItem('adminSessionToken', data.sessionToken);
      localStorage.setItem('adminSessionExpiry', String(Date.now() + data.expiresIn * 1000));

      toast.success('Admin access granted');
      onSuccess(data.sessionToken);
      onOpenChange(false);
      setPassword('');
    } catch (error: any) {
      console.error('Admin auth error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-6 w-6 text-purple-500" />
            Admin Access Required
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Please verify your identity to access the admin section
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="bg-gray-800 border-gray-700 text-white"
              disabled={isVerifying}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setPassword('');
              }}
              disabled={isVerifying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isVerifying}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Verify
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-sm text-gray-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-500" />
              Session will auto-lock after 15 minutes of inactivity
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

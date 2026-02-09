/**
 * Account Management Tab Component
 * Manage Twilio accounts (add, edit, set primary)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Shield, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TwilioAccount {
  id: string;
  name: string;
  accountSid: string;
  isPrimary: boolean;
  isActive: boolean;
  status: string;
  healthStatus: string | null;
  lastHealthCheck: Date | null;
  _count: {
    voiceAgents: number;
    backupPhoneNumbers: number;
  };
}

export default function AccountManagementTab() {
  const [accounts, setAccounts] = useState<TwilioAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    accountSid: '',
    authToken: '',
    isPrimary: false,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/admin/twilio-failover/accounts');
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!formData.name || !formData.accountSid || !formData.authToken) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/admin/twilio-failover/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Account added successfully');
        setShowAddDialog(false);
        setFormData({ name: '', accountSid: '', authToken: '', isPrimary: false });
        fetchAccounts();
      } else {
        toast.error(data.error || 'Failed to add account');
      }
    } catch (error) {
      toast.error('Failed to add account');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Twilio Accounts</h2>
          <p className="text-gray-400">Manage primary and backup Twilio accounts</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Twilio Account</DialogTitle>
              <DialogDescription>
                Add a backup Twilio account for failover protection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Account Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Backup Account 1"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Account SID</label>
                <Input
                  value={formData.accountSid}
                  onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Auth Token</label>
                <Input
                  type="password"
                  value={formData.authToken}
                  onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                  placeholder="Your Twilio auth token"
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm">Set as primary account</label>
              </div>
              <Button onClick={handleAddAccount} className="w-full bg-purple-600 hover:bg-purple-700">
                Add Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {account.isPrimary && (
                    <Badge className="bg-blue-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                  <CardTitle>{account.name}</CardTitle>
                </div>
                <Badge variant={account.isActive ? 'default' : 'secondary'}>
                  {account.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Account SID:</span>
                  <span className="font-mono text-xs">{account.accountSid}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span>{account.status}</span>
                </div>
                {account.healthStatus && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Health:</span>
                    <Badge
                      className={
                        account.healthStatus === 'HEALTHY'
                          ? 'bg-green-600'
                          : account.healthStatus === 'DEGRADED'
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }
                    >
                      {account.healthStatus}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Voice Agents:</span>
                  <span>{account._count.voiceAgents}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Backup Numbers:</span>
                  <span>{account._count.backupPhoneNumbers}</span>
                </div>
                {account.lastHealthCheck && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Last Health Check:</span>
                    <span>{new Date(account.lastHealthCheck).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            No Twilio accounts configured. Add your first account to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

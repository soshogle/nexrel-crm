/**
 * Twilio Monitoring Tab Component
 * Shows real-time health status of Twilio accounts and agents
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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

interface HealthCheckResult {
  accountHealth: {
    type: string;
    status: 'PASS' | 'FAIL' | 'DEGRADED';
    details: any;
    responseTime?: number;
  };
  agentsHealth: Array<{
    agentId: string;
    agentName: string;
    status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
    issues: string[];
  }>;
  summary: {
    totalAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    failedAgents: number;
    failureRate: number;
  };
}

export default function TwilioMonitoringTab() {
  const [accounts, setAccounts] = useState<TwilioAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/admin/twilio-failover/accounts');
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0 && !selectedAccount) {
          setSelectedAccount(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load Twilio accounts');
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async (accountId: string) => {
    setCheckingHealth(true);
    try {
      const response = await fetch(`/api/admin/twilio-failover/health-check?accountId=${accountId}`);
      const data = await response.json();
      if (data.success) {
        setHealthCheck(data.healthCheck);
        toast.success('Health check completed');
        fetchAccounts(); // Refresh accounts to update health status
      } else {
        toast.error(data.error || 'Health check failed');
      }
    } catch (error) {
      console.error('Error running health check:', error);
      toast.error('Failed to run health check');
    } finally {
      setCheckingHealth(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'HEALTHY':
        return <Badge className="bg-green-600">Healthy</Badge>;
      case 'DEGRADED':
        return <Badge className="bg-yellow-600">Degraded</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-600">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
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
      {/* Accounts Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Twilio Accounts</CardTitle>
          <CardDescription>Monitor health status of all Twilio accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAccount === account.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => {
                  setSelectedAccount(account.id);
                  setHealthCheck(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {account.isPrimary && (
                      <Badge className="bg-blue-600">Primary</Badge>
                    )}
                    <h3 className="font-semibold">{account.name}</h3>
                    {getStatusBadge(account.healthStatus)}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-400">
                      {account._count.voiceAgents} agents • {account._count.backupPhoneNumbers} backup numbers
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        runHealthCheck(account.id);
                      }}
                      disabled={checkingHealth}
                    >
                      {checkingHealth ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {account.lastHealthCheck && (
                  <div className="text-xs text-gray-500 mt-2">
                    Last check: {new Date(account.lastHealthCheck).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Check Results */}
      {selectedAccount && healthCheck && (
        <Card>
          <CardHeader>
            <CardTitle>Health Check Results</CardTitle>
            <CardDescription>Detailed health status for selected account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Health */}
            <div>
              <h3 className="font-semibold mb-2">Account Status</h3>
              <div className="flex items-center gap-2">
                {healthCheck.accountHealth.status === 'PASS' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={healthCheck.accountHealth.status === 'PASS' ? 'text-green-500' : 'text-red-500'}>
                  {healthCheck.accountHealth.status}
                </span>
                {healthCheck.accountHealth.responseTime && (
                  <span className="text-gray-400 text-sm">
                    ({healthCheck.accountHealth.responseTime}ms)
                  </span>
                )}
              </div>
              {healthCheck.accountHealth.details && (
                <div className="mt-2 text-sm text-gray-400">
                  {JSON.stringify(healthCheck.accountHealth.details, null, 2)}
                </div>
              )}
            </div>

            {/* Summary */}
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-800 rounded">
                  <div className="text-2xl font-bold">{healthCheck.summary.totalAgents}</div>
                  <div className="text-xs text-gray-400">Total Agents</div>
                </div>
                <div className="text-center p-3 bg-green-900/30 rounded">
                  <div className="text-2xl font-bold text-green-500">{healthCheck.summary.healthyAgents}</div>
                  <div className="text-xs text-gray-400">Healthy</div>
                </div>
                <div className="text-center p-3 bg-yellow-900/30 rounded">
                  <div className="text-2xl font-bold text-yellow-500">{healthCheck.summary.degradedAgents}</div>
                  <div className="text-xs text-gray-400">Degraded</div>
                </div>
                <div className="text-center p-3 bg-red-900/30 rounded">
                  <div className="text-2xl font-bold text-red-500">{healthCheck.summary.failedAgents}</div>
                  <div className="text-xs text-gray-400">Failed</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Failure Rate</span>
                  <span>{(healthCheck.summary.failureRate * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      healthCheck.summary.failureRate > 0.5
                        ? 'bg-red-500'
                        : healthCheck.summary.failureRate > 0.3
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${healthCheck.summary.failureRate * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Agent Details */}
            {healthCheck.agentsHealth.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Agent Details</h3>
                <div className="space-y-2">
                  {healthCheck.agentsHealth.map((agent) => (
                    <div
                      key={agent.agentId}
                      className="p-3 bg-gray-800 rounded flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{agent.agentName}</div>
                        {agent.issues.length > 0 && (
                          <div className="text-xs text-red-400 mt-1">
                            {agent.issues.join(', ')}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(agent.status)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  TestTube,
  Copy,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { testWebhookVerification, testWebhookMessageHandling } from '@/lib/instagram-webhook-test';

interface WebhookTestPanelProps {
  baseUrl?: string;
  verifyToken?: string;
}

export default function WebhookTestPanel({
  baseUrl = typeof window !== 'undefined' ? window.location.origin : '',
  verifyToken = process.env.NEXT_PUBLIC_INSTAGRAM_VERIFY_TOKEN || '',
}: WebhookTestPanelProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [messageResult, setMessageResult] = useState<any>(null);

  const webhookUrl = `${baseUrl}/api/instagram/webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
  };

  const copyVerifyToken = () => {
    navigator.clipboard.writeText(verifyToken);
    toast.success('Verify token copied to clipboard');
  };

  const runTests = async () => {
    setIsTesting(true);
    setVerificationResult(null);
    setMessageResult(null);
    toast.loading('Running webhook tests...');

    try {
      // Test 1: Webhook Verification
      const verifyResult = await testWebhookVerification(baseUrl, verifyToken);
      setVerificationResult(verifyResult);

      // Test 2: Message Handling
      const msgResult = await testWebhookMessageHandling(baseUrl);
      setMessageResult(msgResult);

      if (verifyResult.success && msgResult.success) {
        toast.success('✅ All webhook tests passed!');
      } else {
        toast.error('❌ Some tests failed. Check results below.');
      }
    } catch (error: any) {
      toast.error(`Test error: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const ResultBadge = ({ success }: { success: boolean }) => (
    <Badge
      variant={success ? 'default' : 'destructive'}
      className={success ? 'bg-green-600' : 'bg-red-600'}
    >
      {success ? (
        <>
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Passed
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </>
      )}
    </Badge>
  );

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-purple-500" />
          Instagram Webhook Testing
        </CardTitle>
        <CardDescription>
          Test your Instagram webhook endpoint to ensure it's responding correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook Configuration Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-300">Webhook URL</p>
              <p className="text-xs text-gray-400 font-mono mt-1">{webhookUrl}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={copyWebhookUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-300">Verify Token</p>
              <p className="text-xs text-gray-400 font-mono mt-1">
                {verifyToken ? '•'.repeat(20) : 'Not configured'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={copyVerifyToken} disabled={!verifyToken}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Test Button */}
        <Button
          onClick={runTests}
          disabled={isTesting || !verifyToken}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Run Webhook Tests
            </>
          )}
        </Button>

        {/* Configuration Warning */}
        {!verifyToken && (
          <Alert className="bg-yellow-900/20 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-200">
              Instagram verify token is not configured. Add <code>INSTAGRAM_VERIFY_TOKEN</code> to your environment variables.
            </AlertDescription>
          </Alert>
        )}

        {/* Test Results */}
        {(verificationResult || messageResult) && (
          <div className="space-y-3 mt-4">
            <h4 className="text-sm font-semibold text-gray-200">Test Results</h4>

            {/* Verification Test Result */}
            {verificationResult && (
              <div className="bg-gray-800 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Webhook Verification</span>
                  <ResultBadge success={verificationResult.success} />
                </div>
                <p className="text-xs text-gray-400">{verificationResult.message}</p>
                {verificationResult.details && (
                  <pre className="text-xs bg-gray-900 p-2 rounded text-gray-400 overflow-x-auto">
                    {JSON.stringify(verificationResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Message Handling Test Result */}
            {messageResult && (
              <div className="bg-gray-800 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Message Handling</span>
                  <ResultBadge success={messageResult.success} />
                </div>
                <p className="text-xs text-gray-400">{messageResult.message}</p>
                {messageResult.details && (
                  <pre className="text-xs bg-gray-900 p-2 rounded text-gray-400 overflow-x-auto">
                    {JSON.stringify(messageResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Setup Instructions Link */}
        <Alert className="bg-purple-900/20 border-purple-500/30">
          <AlertDescription className="text-purple-200 text-xs">
            <strong>Need help?</strong> Follow the{' '}
            <a
              href="https://developers.facebook.com/docs/instagram/webhooks/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-purple-300"
            >
              Instagram Webhooks Documentation
              <ExternalLink className="inline h-3 w-3 ml-1" />
            </a>{' '}
            to configure your webhook in the Meta Developer Console.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

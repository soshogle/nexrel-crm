'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestElevenLabsPage() {
  const [directTest, setDirectTest] = useState<any>(null);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDirectTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/docpen/test-elevenlabs-direct');
      const data = await response.json();
      setDirectTest(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/docpen/diagnose-agent-creation');
      const data = await response.json();
      setDiagnostic(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runBoth = async () => {
    setLoading(true);
    setError(null);
    setDirectTest(null);
    setDiagnostic(null);
    
    try {
      const [directResponse, diagnosticResponse] = await Promise.all([
        fetch('/api/docpen/test-elevenlabs-direct'),
        fetch('/api/docpen/diagnose-agent-creation'),
      ]);
      
      const directData = await directResponse.json();
      const diagnosticData = await diagnosticResponse.json();
      
      setDirectTest(directData);
      setDiagnostic(diagnosticData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ElevenLabs API Test</h1>
          <p className="text-muted-foreground mt-2">
            Test ElevenLabs API connection and agent creation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runDirectTest} disabled={loading}>
            Test Direct API
          </Button>
          <Button onClick={runDiagnostic} disabled={loading} variant="outline">
            Run Diagnostic
          </Button>
          <Button onClick={runBoth} disabled={loading} variant="default">
            Run Both
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Alert>
          <AlertDescription>Running tests... Please wait...</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Direct Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Direct API Test</CardTitle>
            <CardDescription>
              Tests ElevenLabs API directly, bypassing app logic
            </CardDescription>
          </CardHeader>
          <CardContent>
            {directTest ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">API Key Status</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(directTest.apiKey, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Test Results</h3>
                  {directTest.tests?.map((test: any, idx: number) => (
                    <div key={idx} className="mb-4 p-3 border rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{test.name}</span>
                        {test.success ? (
                          <span className="text-green-600">✅ Success</span>
                        ) : test.error ? (
                          <span className="text-red-600">❌ Failed</span>
                        ) : (
                          <span className="text-yellow-600">⚠️ Unknown</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {test.method} {test.endpoint}
                      </div>
                      <div className="text-sm">
                        Status: {test.status} {test.statusText}
                      </div>
                      {test.success && test.agentId && (
                        <div className="mt-2 p-2 bg-green-50 rounded">
                          <strong>Agent Created:</strong> {test.agentId}
                          <br />
                          <a
                            href={`https://elevenlabs.io/app/agents/${test.agentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View in ElevenLabs Dashboard
                          </a>
                        </div>
                      )}
                      {test.error && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                          <strong>Error:</strong> {test.error}
                        </div>
                      )}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
                          View Full Response
                        </summary>
                        <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(test, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>

                {directTest.errors && directTest.errors.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-600">Errors</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {directTest.errors.map((err: string, idx: number) => (
                        <li key={idx} className="text-sm text-red-600">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(directTest.summary, null, 2)}
                  </pre>
                </div>

                <details>
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    View Full JSON Response
                  </summary>
                  <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(directTest, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-muted-foreground">Click "Test Direct API" to run the test</p>
            )}
          </CardContent>
        </Card>

        {/* Diagnostic Results */}
        <Card>
          <CardHeader>
            <CardTitle>Full Diagnostic</CardTitle>
            <CardDescription>
              Tests using your app's logic (key manager, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {diagnostic ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">API Key Status</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(
                      {
                        envApiKey: diagnostic.envApiKey,
                        userKeys: diagnostic.userKeys,
                        activeApiKey: diagnostic.activeApiKey,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Test Steps</h3>
                  {diagnostic.steps?.map((step: any, idx: number) => (
                    <div key={idx} className="mb-2 p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{step.step}</span>
                        {step.status === 'success' && (
                          <span className="text-green-600">✅</span>
                        )}
                        {step.status === 'error' && (
                          <span className="text-red-600">❌</span>
                        )}
                        {step.status === 'skipped' && (
                          <span className="text-yellow-600">⏭️</span>
                        )}
                      </div>
                      {step.data && (
                        <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(step.data, null, 2)}
                        </pre>
                      )}
                      {step.error && (
                        <div className="mt-1 text-sm text-red-600">{step.error}</div>
                      )}
                    </div>
                  ))}
                </div>

                {diagnostic.testAgentCreated && (
                  <div className="p-3 bg-green-50 rounded">
                    <h3 className="font-semibold mb-2">Test Agent Created</h3>
                    <pre className="bg-white p-2 rounded text-sm">
                      {JSON.stringify(diagnostic.testAgentCreated, null, 2)}
                    </pre>
                  </div>
                )}

                {diagnostic.errors && diagnostic.errors.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-red-600">Errors</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostic.errors.map((err: string, idx: number) => (
                        <li key={idx} className="text-sm text-red-600">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(diagnostic.summary, null, 2)}
                  </pre>
                </div>

                <details>
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    View Full JSON Response
                  </summary>
                  <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(diagnostic, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-muted-foreground">Click "Run Diagnostic" to run the test</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

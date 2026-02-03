'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function DatabaseCheckPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/debug-auth');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking database configuration...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const dbUrlCheck = data?.checks?.find((c: any) => c.name === 'DATABASE_URL');
  const dbConnectionCheck = data?.checks?.find((c: any) => c.name === 'Database Connection');
  const hasErrors = data?.errors && data.errors.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database Connection Check</h1>
        <p className="text-muted-foreground mt-2">
          This page checks if your database is configured correctly
        </p>
      </div>

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Problems Found:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {data.errors.map((err: string, idx: number) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DATABASE_URL Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {dbUrlCheck?.status === 'present' && !dbUrlCheck?.containsHost ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Database URL Configuration
            </CardTitle>
            <CardDescription>
              Is your database connection string set correctly?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>Status:</strong>{' '}
              <span className={dbUrlCheck?.status === 'present' ? 'text-green-600' : 'text-red-600'}>
                {dbUrlCheck?.status === 'present' ? 'Found' : 'Missing'}
              </span>
            </div>

            {dbUrlCheck?.preview && (
              <div>
                <strong>Connection String Preview:</strong>
                <pre className="bg-muted p-2 rounded mt-1 text-sm overflow-auto">
                  {dbUrlCheck.preview}
                </pre>
              </div>
            )}

            {dbUrlCheck?.containsHost && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>❌ Problem Found:</strong> Your database URL contains a placeholder
                  "host:5432" instead of your real Neon database URL.
                  <br /><br />
                  <strong>How to Fix:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to Vercel → Your Project → Settings → Environment Variables</li>
                    <li>Find "DATABASE_URL"</li>
                    <li>Click "Edit"</li>
                    <li>Make sure it says: <code>postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require</code></li>
                    <li>Click "Save"</li>
                    <li>Redeploy your app</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}

            {dbUrlCheck?.containsNeon && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  ✅ Good! Your database URL contains "neon.tech" - this looks correct.
                </AlertDescription>
              </Alert>
            )}

            {!dbUrlCheck?.hasValue && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>❌ Problem:</strong> DATABASE_URL is not set in Vercel.
                  <br /><br />
                  <strong>How to Fix:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to Vercel → Your Project → Settings → Environment Variables</li>
                    <li>Click "Add New"</li>
                    <li>Name: <code>DATABASE_URL</code></li>
                    <li>Value: <code>postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require</code></li>
                    <li>Environments: Select "All Environments"</li>
                    <li>Click "Save"</li>
                    <li>Redeploy your app</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Database Connection Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {dbConnectionCheck?.status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Connection Test
            </CardTitle>
            <CardDescription>
              Can your app actually connect to the database?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>Status:</strong>{' '}
              <span className={dbConnectionCheck?.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                {dbConnectionCheck?.status === 'success' ? 'Connected ✅' : 'Failed ❌'}
              </span>
            </div>

            {dbConnectionCheck?.status === 'success' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Great! Your app can connect to the database successfully.
                </AlertDescription>
              </Alert>
            )}

            {dbConnectionCheck?.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Connection Error:</strong>
                  <pre className="bg-muted p-2 rounded mt-2 text-sm overflow-auto">
                    {dbConnectionCheck.error}
                  </pre>
                  <br />
                  This usually means:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>The DATABASE_URL is wrong or missing</li>
                    <li>The database server is not accessible</li>
                    <li>Your Neon database might be paused or deleted</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>Total Checks:</strong> {data?.summary?.totalChecks || 0}
            </div>
            <div>
              <strong>Passed:</strong>{' '}
              <span className="text-green-600">{data?.summary?.passedChecks || 0}</span>
            </div>
            <div>
              <strong>Failed:</strong>{' '}
              <span className="text-red-600">{data?.summary?.failedChecks || 0}</span>
            </div>
            <div>
              <strong>Errors:</strong>{' '}
              <span className="text-red-600">{data?.summary?.errors || 0}</span>
            </div>
          </div>

          {data?.summary?.allChecksPassed ? (
            <Alert className="mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                ✅ All checks passed! Your database is configured correctly.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ❌ Some checks failed. Follow the instructions above to fix the issues.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={checkDatabase}>Refresh Check</Button>
      </div>

      {/* Full JSON (for debugging) */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          View Full Technical Details
        </summary>
        <pre className="bg-muted p-4 rounded mt-2 text-xs overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

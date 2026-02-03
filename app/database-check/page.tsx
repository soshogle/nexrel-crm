'use client';

import { useState, useEffect } from 'react';

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
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Database Connection Check</h1>
          <p>Checking database configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-red-800">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const dbUrlCheck = data?.checks?.find((c: any) => c.name === 'DATABASE_URL');
  const dbConnectionCheck = data?.checks?.find((c: any) => c.name === 'Database Connection');
  const hasErrors = data?.errors && data.errors.length > 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-2">Database Connection Check</h1>
        <p className="text-gray-600">This page checks if your database is configured correctly</p>
      </div>

      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-3">❌ Problems Found</h2>
          <ul className="list-disc list-inside space-y-2 text-red-700">
            {data.errors.map((err: string, idx: number) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* DATABASE_URL Check */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          {dbUrlCheck?.status === 'present' && !dbUrlCheck?.containsHost ? (
            <span className="text-green-600">✅ Database URL Configuration</span>
          ) : (
            <span className="text-red-600">❌ Database URL Configuration</span>
          )}
        </h2>

        <div className="space-y-4">
          <div>
            <strong>Status:</strong>{' '}
            <span className={dbUrlCheck?.status === 'present' ? 'text-green-600' : 'text-red-600'}>
              {dbUrlCheck?.status === 'present' ? 'Found' : 'Missing'}
            </span>
          </div>

          {dbUrlCheck?.preview && (
            <div>
              <strong>Connection String Preview:</strong>
              <div className="bg-gray-100 p-3 rounded mt-2 text-sm font-mono break-all">
                {dbUrlCheck.preview}
              </div>
            </div>
          )}

          {dbUrlCheck?.containsHost && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <h3 className="font-bold text-red-800 mb-2">❌ Problem Found</h3>
              <p className="text-red-700 mb-4">
                Your database URL contains a placeholder "host:5432" instead of your real Neon database URL.
              </p>
              <div className="bg-white p-4 rounded border border-red-200">
                <h4 className="font-bold mb-2">How to Fix:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Vercel.com</a> and log in</li>
                  <li>Click on your project "nexrel-crm"</li>
                  <li>Click "Settings" in the top menu</li>
                  <li>Click "Environment Variables" in the left sidebar</li>
                  <li>Find "DATABASE_URL" and click "Edit"</li>
                  <li>Make sure the value is exactly this:
                    <div className="bg-gray-100 p-2 rounded mt-2 font-mono text-xs break-all">
                      postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
                    </div>
                  </li>
                  <li>Under "Environments", make sure "All Environments" is selected</li>
                  <li>Click "Save"</li>
                  <li>Go to "Deployments" tab and click "Redeploy" on the latest deployment</li>
                </ol>
              </div>
            </div>
          )}

          {dbUrlCheck?.containsNeon && !dbUrlCheck?.containsHost && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-green-700">✅ Good! Your database URL contains "neon.tech" - this looks correct.</p>
            </div>
          )}

          {!dbUrlCheck?.hasValue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <h3 className="font-bold text-red-800 mb-2">❌ Problem: DATABASE_URL Not Set</h3>
              <div className="bg-white p-4 rounded border border-red-200">
                <h4 className="font-bold mb-2">How to Fix:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Vercel.com</a> and log in</li>
                  <li>Click on your project "nexrel-crm"</li>
                  <li>Click "Settings" → "Environment Variables"</li>
                  <li>Click "Add New"</li>
                  <li>Name: <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code></li>
                  <li>Value: Copy this exactly:
                    <div className="bg-gray-100 p-2 rounded mt-2 font-mono text-xs break-all">
                      postgresql://neondb_owner:npg_MFCmq14EUpng@ep-noisy-meadow-ahhrsg4f-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
                    </div>
                  </li>
                  <li>Environments: Select "All Environments"</li>
                  <li>Click "Save"</li>
                  <li>Redeploy your app</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Database Connection Test */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          {dbConnectionCheck?.status === 'success' ? (
            <span className="text-green-600">✅ Connection Test</span>
          ) : (
            <span className="text-red-600">❌ Connection Test</span>
          )}
        </h2>

        <div className="space-y-4">
          <div>
            <strong>Status:</strong>{' '}
            <span className={dbConnectionCheck?.status === 'success' ? 'text-green-600' : 'text-red-600'}>
              {dbConnectionCheck?.status === 'success' ? 'Connected ✅' : 'Failed ❌'}
            </span>
          </div>

          {dbConnectionCheck?.status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700">Great! Your app can connect to the database successfully.</p>
            </div>
          )}

          {dbConnectionCheck?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-2">Connection Error:</h3>
              <div className="bg-white p-3 rounded text-sm font-mono break-all">
                {dbConnectionCheck.error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Summary</h2>
        <div className="space-y-2">
          <div><strong>Total Checks:</strong> {data?.summary?.totalChecks || 0}</div>
          <div><strong>Passed:</strong> <span className="text-green-600">{data?.summary?.passedChecks || 0}</span></div>
          <div><strong>Failed:</strong> <span className="text-red-600">{data?.summary?.failedChecks || 0}</span></div>
        </div>

        {data?.summary?.allChecksPassed ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <p className="text-green-700 font-bold">✅ All checks passed! Your database is configured correctly.</p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <p className="text-red-700 font-bold">❌ Some checks failed. Follow the instructions above to fix the issues.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={checkDatabase}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh Check
        </button>
      </div>
    </div>
  );
}

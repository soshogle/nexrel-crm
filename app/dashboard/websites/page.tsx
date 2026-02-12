'use client';

import { useEffect, useState } from 'react';
import { setWebsiteBuilderContext } from '@/lib/website-builder-context';
import { useSession } from 'next-auth/react';
import { Plus, Globe, Settings, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { toast } from 'sonner';

interface Website {
  id: string;
  name: string;
  type: string;
  status: string;
  buildProgress: number;
  vercelDeploymentUrl?: string;
  voiceAIEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export default function WebsitesPage() {
  const { data: session } = useSession();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [websiteToDelete, setWebsiteToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (session) {
      fetchWebsites();
    }
  }, [session]);

  useEffect(() => {
    setWebsiteBuilderContext({ page: 'list' });
  }, []);

  const [canCreateNew, setCanCreateNew] = useState(true);

  const fetchWebsites = async () => {
    try {
      const response = await fetch('/api/websites');
      if (response.ok) {
        const data = await response.json();
        setWebsites(data.websites || []);
        setCanCreateNew(data.canCreateNew !== false);
      }
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, progress: number) => {
    if (status === 'BUILDING') {
      return (
        <Badge variant="outline" className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Building ({progress}%)
        </Badge>
      );
    }
    if (status === 'READY') {
      return <Badge variant="default">Ready</Badge>;
    }
    if (status === 'PUBLISHED') {
      return <Badge variant="default" className="bg-green-600">Published</Badge>;
    }
    if (status === 'FAILED') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'REBUILT':
        return 'Rebuilt';
      case 'SERVICE_TEMPLATE':
        return 'Service Website';
      case 'PRODUCT_TEMPLATE':
        return 'Product Website';
      default:
        return type;
    }
  };

  const handleDeleteClick = (websiteId: string) => {
    setWebsiteToDelete(websiteId);
    setDeleteDialogOpen(true);
  };

  const handleFixStuckBuild = async (websiteId: string) => {
    try {
      const response = await fetch(`/api/websites/${websiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FAILED' }),
      });

      if (response.ok) {
        toast.success('Build status updated');
        await fetchWebsites();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error: any) {
      console.error('Error fixing stuck build:', error);
      toast.error(error.message || 'Failed to update build status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!websiteToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/websites/${websiteToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete website');
      }

      toast.success('Website deleted successfully');
      setDeleteDialogOpen(false);
      setWebsiteToDelete(null);
      
      // Refresh the websites list
      await fetchWebsites();
    } catch (error: any) {
      console.error('Error deleting website:', error);
      toast.error(error.message || 'Failed to delete website');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Websites</h1>
          <p className="text-muted-foreground mt-2">
            Manage your websites and create new ones
          </p>
        </div>
        <Link href={canCreateNew ? '/dashboard/websites/new' : '#'}>
          <Button disabled={!canCreateNew} title={!canCreateNew ? 'You already have a website. Manage it from the list below.' : undefined}>
            <Plus className="h-4 w-4 mr-2" />
            Create Website
          </Button>
        </Link>
      </div>

      {websites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No websites yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first website to get started
            </p>
            <Link href={canCreateNew ? '/dashboard/websites/new' : '#'}>
              <Button disabled={!canCreateNew} title={!canCreateNew ? 'You already have a website. Manage it from the list below.' : undefined}>
                <Plus className="h-4 w-4 mr-2" />
                Create Website
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((website) => (
            <Card key={website.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{website.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {getTypeLabel(website.type)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(website.status, website.buildProgress)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Voice AI</span>
                  {website.voiceAIEnabled ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </div>

                {website.vercelDeploymentUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={website.vercelDeploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      View Website
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Link 
                    href={`/dashboard/websites/${website.id}`} 
                    className="flex-1"
                    onClick={(e) => {
                      // Prevent navigation if website is in a problematic state
                      if (website.status === 'BUILDING' && website.buildProgress === 0) {
                        e.preventDefault();
                        toast.warning('Website is still building. Please wait or mark as failed first.');
                        return false;
                      }
                    }}
                  >
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  </Link>
                  {website.status === 'BUILDING' && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleFixStuckBuild(website.id)}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      title="Mark as failed if stuck"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleDeleteClick(website.id)}
                    disabled={deleting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Website</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this website? This action cannot be undone.
              All associated data, including deployments and integrations, will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CreateBusinessOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Storage key for persisting form data
const FORM_DATA_KEY = 'create-business-owner-form-data';

export default function CreateBusinessOwnerDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateBusinessOwnerDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    businessCategory: '',
  });
  const [createdUser, setCreatedUser] = useState<any>(null);

  // Load form data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem(FORM_DATA_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
          console.log('📋 Restored form data from localStorage');
        } catch (error) {
          console.error('Failed to parse saved form data:', error);
        }
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !createdUser) {
      localStorage.setItem(FORM_DATA_KEY, JSON.stringify(formData));
    }
  }, [formData, createdUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/platform-admin/create-business-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business owner');
      }

      console.log('✅ Business owner created:', data);
      setCreatedUser(data.user);
      toast.success('Business owner account created successfully!');

      // Clear the form data from localStorage after successful creation
      if (typeof window !== 'undefined') {
        localStorage.removeItem(FORM_DATA_KEY);
        console.log('🗑️ Cleared form data from localStorage after successful creation');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating business owner:', error);
      toast.error(error.message || 'Failed to create business owner');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Clear the form data
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      businessCategory: '',
    });
    setCreatedUser(null);
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FORM_DATA_KEY);
      console.log('🗑️ Cleared form data from localStorage');
    }
    
    onOpenChange(false);
  };

  const handleDialogChange = (isOpen: boolean) => {
    // Don't reset form data when dialog closes - let the data persist
    // Only reset when user explicitly clicks Cancel or Done (via handleClose)
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="h-5 w-5 text-purple-500" />
            Create Business Owner Account
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new business owner account. They will go through the full
            onboarding wizard on first login.
          </DialogDescription>
        </DialogHeader>

        {createdUser ? (
          <div className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-400 ml-2">
                Business owner account created successfully!
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h4 className="font-medium text-white">Account Details:</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Name:</span>{' '}
                  <span className="text-white font-medium">{createdUser.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>{' '}
                  <span className="text-white font-medium">{createdUser.email}</span>
                </div>
                <div>
                  <span className="text-gray-400">Role:</span>{' '}
                  <span className="text-purple-400 font-medium">{createdUser.role}</span>
                </div>
              </div>
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/50">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300 ml-2 text-sm">
                <strong>Next Steps:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Share the login credentials with the business owner</li>
                  <li>They should visit the sign-in page</li>
                  <li>On first login, they'll be redirected to complete onboarding</li>
                  <li>They'll select their industry and configure settings</li>
                </ul>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="owner@example.com"
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter a secure password"
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="John Doe"
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white">
                Phone (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1234567890"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessCategory" className="text-white">
                Business Category (Optional)
              </Label>
              <Input
                id="businessCategory"
                type="text"
                value={formData.businessCategory}
                onChange={(e) =>
                  setFormData({ ...formData, businessCategory: e.target.value })
                }
                placeholder="e.g., Pharmacy, Restaurant, Healthcare"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/50">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-300 ml-2 text-sm">
                The account will have <strong>onboardingCompleted: false</strong>,
                so they'll go through the full onboarding wizard on first login.
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Business Owner
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

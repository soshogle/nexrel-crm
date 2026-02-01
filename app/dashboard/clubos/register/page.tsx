
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  Users,
  Calendar,
  DollarSign,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import RegistrationPaymentForm from '@/components/clubos/registration-payment-form';

interface Program {
  id: string;
  name: string;
  description?: string;
  programType: string;
  status: string;
  startDate: string;
  endDate: string;
  baseFee: number;
  familyDiscount?: number;
  earlyBirdDiscount?: number;
  earlyBirdDeadline?: string;
  maxParticipants?: number;
  currentParticipants: number;
  divisions: Division[];
}

interface Division {
  id: string;
  name: string;
  ageMin: number;
  ageMax: number;
  gender?: string;
  practiceDay?: string;
  practiceTime?: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
}

interface Household {
  id: string;
  members: Member[];
}

export default function ClubOSRegisterPage() {
  const { data: session } = useSession() || {};
  const [programs, setPrograms] = useState<Program[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [createdRegistration, setCreatedRegistration] = useState<any>(null);
  const [registrationDetails, setRegistrationDetails] = useState<{
    message: string;
    division?: string;
    fee?: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch programs
      const programsRes = await fetch('/api/clubos/programs');
      const programsData = await programsRes.json();

      if (programsData.success) {
        // Only show OPEN programs
        const openPrograms = programsData.programs.filter(
          (p: Program) => p.status === 'OPEN'
        );
        setPrograms(openPrograms);
      }

      // Fetch household
      const householdsRes = await fetch('/api/clubos/households');
      const householdsData = await householdsRes.json();

      if (householdsData.success && householdsData.households.length > 0) {
        setHousehold(householdsData.households[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load registration data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProgram || !selectedMember) {
      toast.error('Please select a program and player');
      return;
    }

    if (!household) {
      toast.error('No household found. Please complete your profile first.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/clubos/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: household.id,
          memberId: selectedMember,
          programId: selectedProgram,
          specialRequests: specialRequests || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Registration created - now show payment form
        toast.success('Registration created! Please complete payment to finalize.');
        setCreatedRegistration(data.registration);
        setShowPayment(true); // Show payment form
      } else {
        toast.error(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePaymentSuccess() {
    // Called after payment completes successfully
    setShowPayment(false);
    setRegistrationComplete(true);
    setRegistrationDetails({
      message: 'Registration confirmed and paid!',
      division: createdRegistration?.division?.name,
      fee: createdRegistration?.totalAmount,
    });
    toast.success('Payment successful! Registration complete.');
  }

  function resetForm() {
    setSelectedProgram('');
    setSelectedMember('');
    setSpecialRequests('');
    setRegistrationComplete(false);
    setRegistrationDetails(null);
    setShowPayment(false);
    setCreatedRegistration(null);
  }

  const selectedProgramData = programs.find((p) => p.id === selectedProgram);
  const selectedMemberData = household?.members.find(
    (m) => m.id === selectedMember
  );

  // Calculate age for division assignment
  const memberAge = selectedMemberData
    ? new Date().getFullYear() -
      new Date(selectedMemberData.dateOfBirth).getFullYear()
    : null;

  // Find appropriate division
  const suggestedDivision =
    selectedProgramData && memberAge
      ? selectedProgramData.divisions.find(
          (d) =>
            d.ageMin <= memberAge &&
            d.ageMax >= memberAge &&
            (d.gender === selectedMemberData?.gender ||
              d.gender === null ||
              d.gender === 'OTHER')
        )
      : null;

  // Calculate fee
  const calculateFee = () => {
    if (!selectedProgramData) return 0;

    let fee = selectedProgramData.baseFee;

    // Apply early bird discount
    if (
      selectedProgramData.earlyBirdDiscount &&
      selectedProgramData.earlyBirdDeadline &&
      new Date() < new Date(selectedProgramData.earlyBirdDeadline)
    ) {
      fee -= selectedProgramData.earlyBirdDiscount;
    }

    // Note: Family discount would be applied server-side after checking existing registrations

    return Math.max(0, fee);
  };

  const estimatedFee = calculateFee();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Show payment form after registration is created
  if (showPayment && createdRegistration) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Payment</h2>
          <p className="text-gray-600 mt-1">
            Registration for {createdRegistration.member?.firstName} {createdRegistration.member?.lastName} - {createdRegistration.program?.name}
          </p>
        </div>
        <RegistrationPaymentForm
          registration={createdRegistration}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    );
  }

  if (registrationComplete && registrationDetails) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-500 p-2">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-green-900">
                Registration Confirmed!
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-800">{registrationDetails.message}</p>

            {registrationDetails.division && (
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Division Assigned</p>
                <p className="font-semibold text-gray-900">
                  {registrationDetails.division}
                </p>
              </div>
            )}

            {registrationDetails.fee && (
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600">Registration Fee</p>
                <p className="font-semibold text-gray-900">
                  ${(registrationDetails.fee / 100).toFixed(2)}
                </p>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-sm text-green-900">
                <strong>All Set!</strong> Your registration is confirmed and payment has been processed. You will receive a confirmation email shortly with all the details.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={resetForm} className="flex-1">
                Register Another Player
              </Button>
              <Button
                onClick={() => (window.location.href = '/dashboard/clubos/admin')}
                variant="outline"
                className="flex-1"
              >
                View My Registrations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Program Registration</h1>
        <p className="text-gray-500 mt-1">
          Register your child for sports programs and activities
        </p>
      </div>

      {/* No household warning */}
      {!household && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-900">
                Please complete your household profile before registering for
                programs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No programs available */}
      {programs.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="text-blue-900">
                No programs are currently open for registration. Please check back
                later.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Form */}
      {household && programs.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Program Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Program
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="program">Program</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger id="program">
                    <SelectValue placeholder="Choose a program..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name} - {program.programType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProgramData && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-900">
                      {selectedProgramData.description || 'No description available'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Start Date</p>
                      <p className="font-semibold">
                        {new Date(selectedProgramData.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">End Date</p>
                      <p className="font-semibold">
                        {new Date(selectedProgramData.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Availability</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          selectedProgramData.maxParticipants &&
                          selectedProgramData.currentParticipants >=
                            selectedProgramData.maxParticipants
                            ? 'destructive'
                            : 'default'
                        }
                      >
                        {selectedProgramData.currentParticipants} /{' '}
                        {selectedProgramData.maxParticipants || '∞'} registered
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Player
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="member">Player</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger id="member">
                    <SelectValue placeholder="Choose a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {household.members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} (Age:{' '}
                        {new Date().getFullYear() -
                          new Date(member.dateOfBirth).getFullYear()}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {suggestedDivision && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 font-semibold mb-2">
                    Recommended Division
                  </p>
                  <p className="text-blue-800">{suggestedDivision.name}</p>
                  {suggestedDivision.practiceDay && (
                    <p className="text-sm text-blue-700 mt-1">
                      Practice: {suggestedDivision.practiceDay}{' '}
                      {suggestedDivision.practiceTime}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Special Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Special Requests (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special requests, accommodations, or notes..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Fee Summary */}
          {selectedProgram && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Registration Fee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Base Fee</span>
                  <span className="font-semibold">
                    ${(selectedProgramData?.baseFee || 0) / 100}
                  </span>
                </div>

                {selectedProgramData?.earlyBirdDiscount &&
                  selectedProgramData?.earlyBirdDeadline &&
                  new Date() < new Date(selectedProgramData.earlyBirdDeadline) && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>Early Bird Discount</span>
                      <span>
                        -${selectedProgramData.earlyBirdDiscount / 100}
                      </span>
                    </div>
                  )}

                {selectedProgramData?.familyDiscount && (
                  <div className="text-sm text-gray-500">
                    * Family discount will be applied if you have other active
                    registrations
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-bold text-lg">Estimated Total</span>
                  <span className="font-bold text-lg">
                    ${(estimatedFee / 100).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!selectedProgram || !selectedMember || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Registration
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

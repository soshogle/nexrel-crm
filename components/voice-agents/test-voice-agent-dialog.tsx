
'use client';

import { useState, useRef, useEffect } from 'react';
import { Phone, Loader2, CheckCircle, XCircle, AlertTriangle, MessageSquare, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface TestVoiceAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: any;
  onConfigureAgent?: () => void;
  onAgentConfigured?: () => void; // Callback when auto-configuration succeeds
}

export function TestVoiceAgentDialog({
  open,
  onOpenChange,
  agent,
  onConfigureAgent,
  onAgentConfigured,
}: TestVoiceAgentDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testScenario, setTestScenario] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  
  // Use a ref to prevent multiple auto-configuration attempts for the same agent
  const lastConfiguredAgentId = useRef<string | null>(null);
  
  // Reset state when dialog is closed
  useEffect(() => {
    if (!open) {
      setPhoneNumber('');
      setTestScenario('');
      setTestResult(null);
      setIsLoading(false);
      setIsFixing(false);
      setIsConfiguring(false);
      lastConfiguredAgentId.current = null;
    }
  }, [open]);
  
  // Reset configuration tracking when agent changes
  useEffect(() => {
    if (agent?.id && lastConfiguredAgentId.current !== agent.id) {
      // Only reset if the agent has elevenLabsAgentId (already configured)
      if (agent.elevenLabsAgentId) {
        lastConfiguredAgentId.current = null;
      }
    }
  }, [agent?.id, agent?.elevenLabsAgentId]);

  const handleAutoConfigure = async () => {
    if (!agent) {
      toast.error('No agent selected');
      return;
    }

    // Prevent multiple configuration attempts for the same agent
    if (isConfiguring || lastConfiguredAgentId.current === agent.id) {
      console.log('⚠️ Auto-configuration already in progress or completed for this agent');
      return;
    }

    setIsConfiguring(true);
    lastConfiguredAgentId.current = agent.id;
    
    try {
      toast.info('🤖 Configuring Voice AI...', {
        description: 'Setting up Soshogle AI integration automatically',
        duration: 3000,
      });

      console.log('🔧 Starting auto-configure for agent:', agent.id, agent.name);

      const response = await fetch(`/api/voice-agents/${agent.id}/auto-configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Auto-configure response status:', response.status);

      let result;
      try {
        result = await response.json();
        console.log('📦 Auto-configure result:', result);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to configure voice agent');
      }

      console.log('✅ Auto-configure successful!', result);

      toast.success('✅ Voice AI Configured!', {
        description: result.message || 'Your agent is now ready for voice calls. You can test it now!',
        duration: 5000,
      });

      // Fetch the updated agent data to get the new elevenLabsAgentId
      console.log('🔄 Refreshing agent data after configuration...');
      try {
        const agentResponse = await fetch(`/api/voice-agents/${agent.id}`);
        if (agentResponse.ok) {
          const updatedAgent = await agentResponse.json();
          console.log('✅ Agent data refreshed:', updatedAgent);
          // Update local agent object so the dialog shows updated status
          Object.assign(agent, updatedAgent);
        }
      } catch (refreshError) {
        console.error('⚠️ Failed to refresh agent data (non-critical):', refreshError);
      }

      // Refresh agent list in parent component
      if (onAgentConfigured) {
        onAgentConfigured();
      }

      // Close the warning by refreshing parent component
      // The warning will disappear once agent.elevenLabsAgentId is set
    } catch (error: any) {
      console.error('❌ Auto-configure error:', error);
      toast.error('Configuration failed', {
        description: error.message || 'Could not configure Voice AI. Please check your Soshogle AI API key.',
        duration: 6000,
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleAutoFix = async () => {
    setIsFixing(true);
    try {
      // Check if agent exists
      if (!agent) {
        toast.error('No agent selected');
        setIsFixing(false);
        return;
      }

      // Check if this is an "agent not found in ElevenLabs" issue
      if (testResult?.message?.includes('not found in Soshogle AI') || testResult?.message?.includes('not found in ElevenLabs')) {
        toast.info('Recreating voice agent...', {
          description: 'This will recreate the agent in Soshogle AI',
        });

        const response = await fetch(`/api/voice-agents/${agent.id}/auto-configure`, {
          method: 'POST',
        });

        const result = await response.json();

        if (response.ok && result.success) {
          toast.success('✅ Voice agent recreated successfully!', {
            description: 'You can now try the test call again.',
          });
          setTestResult(null); // Clear error so user can retry
          // Refresh the agent data
          if (onAgentConfigured) {
            onAgentConfigured();
          }
        } else {
          const errorMsg = result.error || 'Could not recreate voice agent';
          toast.error('Auto-fix failed', {
            description: errorMsg,
            duration: 5000,
          });
        }
        setIsFixing(false);
        return;
      }

      // Check if agent has voice AI configuration
      if (!agent.elevenLabsAgentId) {
        toast.error('Voice agent not configured', {
          description: 'Please configure voice AI integration in the agent settings first.',
          duration: 5000,
        });
        setIsFixing(false);
        return;
      }

      // Try to register the phone number
      if (agent.twilioPhoneNumber && agent.id) {
        toast.info('Registering phone number...', {
          description: 'This may take a few seconds',
        });

        const response = await fetch(`/api/voice-agents/${agent.id}/update-phone`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: agent.twilioPhoneNumber,
          }),
        });

        const result = await response.json();

        if (response.ok && result.elevenLabsRegistered) {
          toast.success('✅ Phone number registered successfully!', {
            description: 'You can now try the test call again.',
          });
          setTestResult(null); // Clear error so user can retry
        } else {
          const errorMsg = result.elevenLabsError || result.error || 'Could not register phone number';
          toast.error('Auto-fix failed', {
            description: errorMsg,
            duration: 5000,
          });
        }
      } else {
        toast.error('No phone number assigned', {
          description: 'Please assign a phone number to this voice agent first.',
        });
      }
    } catch (error: any) {
      console.error('Auto-fix error:', error);
      toast.error('Auto-fix failed', {
        description: error.message || 'An unexpected error occurred',
        duration: 5000,
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleGetHelp = () => {
    // Open AI assistant with context about the error
    const errorContext = `I'm having trouble testing my voice agent "${agent.name}". ${testResult?.message || 'The test call failed.'}`;
    toast.info('Opening AI Assistant...', {
      description: 'I can help you fix this issue!',
    });
    
    // Trigger AI assistant to open (you may need to add a global event or state management)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-ai-assistant', { 
        detail: { message: errorContext }
      }));
    }
  };

  const handleTestCall = async () => {
    if (!agent) {
      toast.error('No agent selected');
      return;
    }
    
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    // Clean and format phone number
    let formattedPhone = phoneNumber.replace(/[\s-()]/g, '');
    
    // Auto-add + if missing
    if (!formattedPhone.startsWith('+')) {
      // If it's a 10-digit US number, add +1
      if (formattedPhone.length === 10 && /^\d{10}$/.test(formattedPhone)) {
        formattedPhone = '+1' + formattedPhone;
        toast.info('Auto-formatted phone number', {
          description: `Using ${formattedPhone}`,
          duration: 2000,
        });
      } 
      // If it starts with 1 and has 11 digits (like 15149691050), add +
      else if (formattedPhone.startsWith('1') && formattedPhone.length === 11) {
        formattedPhone = '+' + formattedPhone;
        toast.info('Auto-formatted phone number', {
          description: `Using ${formattedPhone}`,
          duration: 2000,
        });
      }
      // Otherwise require proper format
      else {
        toast.error('Invalid phone number format', {
          description: 'Please use E.164 format: +1 for US (e.g., +15149691050)',
          duration: 4000,
        });
        return;
      }
    }

    // Validate E.164 format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(formattedPhone)) {
      toast.error('Invalid phone number format', {
        description: 'Please use E.164 format: +1 for US (e.g., +15149691050)',
        duration: 4000,
      });
      return;
    }
    
    // Update the displayed phone number
    setPhoneNumber(formattedPhone);

    setIsLoading(true);
    setTestResult(null);

    try {
      console.log('📞 Starting test call for agent:', agent.id, 'to:', formattedPhone);
      
      // Create an immediate test call using the outbound calls API
      const response = await fetch('/api/outbound-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceAgentId: agent.id,
          phoneNumber: formattedPhone,
          name: `Test Call - ${agent.name}`,
          purpose: testScenario || 'Testing voice agent functionality',
          scheduledFor: new Date().toISOString(), // Immediate call
          callType: 'TEST',
          immediate: true, // Request immediate call
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Test call creation failed:', error);
        
        // Provide more specific error messages
        if (error.error?.includes('not configured')) {
          throw new Error('Voice agent is not fully configured. Please use "Auto-Configure Now" to set up the agent.');
        }
        throw new Error(error.error || 'Failed to initiate test call');
      }

      const callData = await response.json();
      console.log('✅ Test call created:', callData);

      // Check if call was initiated immediately
      if (callData.callInitiated === false) {
        throw new Error(callData.error || 'Failed to initiate the call. The agent may not be properly configured in Soshogle AI.');
      }

      setTestResult({
        success: true,
        callId: callData.callId || callData.id,
        message: 'Test call initiated successfully! You should receive a call within a few seconds.',
        details: {
          agentId: callData.voiceAgentId,
          phoneNumber: formattedPhone,
          callId: callData.callId,
        },
      });

      toast.success('Test call initiated! Check your phone.', {
        description: `Calling ${formattedPhone}...`,
      });
    } catch (error: any) {
      console.error('❌ Test call error:', error);
      
      // Parse error message to provide helpful context
      let errorMessage = error.message || 'Failed to initiate test call';
      let canAutoFix = false;
      let needsConfiguration = false;
      
      // Check for specific error patterns
      if (errorMessage.includes('Not Found') || errorMessage.includes('not properly configured') || errorMessage.includes('not found in') || errorMessage.includes('ElevenLabs')) {
        errorMessage = 'Voice agent not found in Soshogle AI. The agent may have been deleted or not properly configured.';
        needsConfiguration = true;
        canAutoFix = true; // Changed to true - we can auto-fix this by recreating the agent
      } else if (errorMessage.includes('not configured')) {
        needsConfiguration = true;
        canAutoFix = false;
        errorMessage = 'Voice agent is not configured. Please edit the agent and complete the voice AI configuration first.';
      }
      // Check if it's a phone number registration issue
      else if (errorMessage.includes('phone number not registered') && !needsConfiguration) {
        canAutoFix = true;
        errorMessage = 'Phone number not registered with Soshogle Voice AI. This is required for voice calls.';
      }
      
      setTestResult({
        success: false,
        message: errorMessage,
        canAutoFix,
        error: error,
      });
      toast.error('Test call failed', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Clear state when closing
    setPhoneNumber('');
    setTestScenario('');
    setTestResult(null);
    setIsLoading(false);
    setIsFixing(false);
    setIsConfiguring(false);
    onOpenChange(false);
  };

  // Don't render if agent is not selected - but don't close the dialog automatically
  if (!agent && !open) {
    return null;
  }
  
  // If agent becomes null while dialog is open, keep showing but with error message
  if (!agent && open) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Test Voice Agent
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-muted-foreground">Agent not found. Please close and try again.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={handleClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Test Voice Agent
          </DialogTitle>
          <DialogDescription>
            Make a test call to verify {agent.name} is working correctly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Agent Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Agent:</span>
              <span className="font-semibold">{agent.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={agent.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {agent.status}
              </Badge>
            </div>
            {agent.twilioPhoneNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Agent Phone:</span>
                <span className="text-sm text-muted-foreground">{agent.twilioPhoneNumber}</span>
              </div>
            )}
          </div>

          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              Test Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+15149691050 or 5149691050"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Enter phone number in E.164 format. For US numbers: <code className="bg-muted px-1 rounded">+1</code> + 10 digits (e.g., +15149691050)
            </p>
          </div>

          {/* Test Scenario (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="testScenario">
              Test Scenario (Optional)
            </Label>
            <Textarea
              id="testScenario"
              placeholder="E.g., Test appointment booking flow, check business hours response, etc."
              value={testScenario}
              onChange={(e) => setTestScenario(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Describe what you want to test during this call
            </p>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`p-4 rounded-lg border-2 ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-sm">
                      {testResult.success ? 'Test Call Initiated!' : 'Test Call Failed'}
                    </p>
                    <p className="text-sm opacity-90 mt-1">{testResult.message}</p>
                    {testResult.callId && (
                      <p className="text-xs opacity-75 mt-1">Call ID: {testResult.callId}</p>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {testResult.success && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestResult(null)}
                        className="bg-white dark:bg-gray-800"
                      >
                        <Phone className="w-3 h-3 mr-2" />
                        Test Again
                      </Button>
                    )}
                    {!testResult.success && testResult.canAutoFix && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAutoFix}
                        disabled={isFixing}
                        className="bg-white dark:bg-gray-800"
                      >
                        {isFixing ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Fixing...
                          </>
                        ) : (
                          <>
                            <Wrench className="w-3 h-3 mr-2" />
                            Auto-Fix Issue
                          </>
                        )}
                      </Button>
                    )}
                    {!testResult.success && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGetHelp}
                        className="bg-white dark:bg-gray-800"
                      >
                        <MessageSquare className="w-3 h-3 mr-2" />
                        Get Help from AI Assistant
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Checks */}
          {!agent.elevenLabsAgentId && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-3">
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      🤖 Voice AI Not Configured
                    </p>
                    <p className="text-blue-800 dark:text-blue-200 mt-1">
                      This agent needs Soshogle AI Voice configuration before it can handle calls. Click below to configure automatically.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAutoConfigure}
                      disabled={isConfiguring}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isConfiguring ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Configuring...
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3 h-3 mr-2" />
                          Auto-Configure Now
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        if (onConfigureAgent) {
                          onConfigureAgent();
                        }
                      }}
                    >
                      Manual Setup
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Important Notes:
                </p>
                <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
                  <li>Ensure phone service credentials are configured</li>
                  <li>The agent must have a phone number assigned</li>
                  <li>Voice AI must be configured</li>
                  <li>Standard call charges may apply</li>
                  <li>You'll receive a call within a few seconds</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {testResult?.success ? 'Close' : 'Cancel'}
          </Button>
          {!testResult?.success && (
            <Button onClick={handleTestCall} disabled={isLoading || !phoneNumber}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initiating Call...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Start Test Call
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

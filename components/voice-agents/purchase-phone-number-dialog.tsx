
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Phone, Search, Check, MapPin, Plus, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

interface VoiceAgent {
  id: string;
  name: string;
  twilioPhoneNumber?: string | null;
  status: string;
}

interface PurchasePhoneNumberDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (phoneNumber: string) => void;
  onCreateVoiceAgent?: (phoneNumber: string) => void;
}

export default function PurchasePhoneNumberDialog({
  open,
  onClose,
  onSuccess,
  onCreateVoiceAgent
}: PurchasePhoneNumberDialogProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<PhoneNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [purchasedNumber, setPurchasedNumber] = useState<string | null>(null);
  
  const [countryCode, setCountryCode] = useState('US');
  const [areaCode, setAreaCode] = useState('');
  const [contains, setContains] = useState('');
  const [twilioAccountId, setTwilioAccountId] = useState<string | null>(null);

  // Post-purchase configuration
  const [showPostPurchase, setShowPostPurchase] = useState(false);
  const [configAction, setConfigAction] = useState<'existing' | 'new'>('new');
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Fetch voice agents when dialog opens
  useEffect(() => {
    if (open) {
      fetchVoiceAgents();
    }
  }, [open]);

  const fetchVoiceAgents = async () => {
    try {
      const response = await fetch('/api/voice-agents');
      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        setVoiceAgents(data);
      }
    } catch (error) {
      console.error('Failed to fetch voice agents:', error);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setAvailableNumbers([]);
    setSelectedNumber(null);

    try {
      const response = await fetch('/api/twilio/phone-numbers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode,
          areaCode: areaCode || undefined,
          contains: contains || undefined,
          smsEnabled: true,
          voiceEnabled: true,
          limit: 20
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search phone numbers');
      }

      if (data.numbers && data.numbers.length > 0) {
        setAvailableNumbers(data.numbers);
        setTwilioAccountId(data.twilioAccountId || null);
        toast.success(`Found ${data.numbers.length} available numbers`);
      } else {
        toast.info('No phone numbers found. Try different search criteria.');
      }

    } catch (error) {
      console.error('Search error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search phone numbers');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedNumber) {
      toast.error('Please select a phone number');
      return;
    }

    setIsPurchasing(true);

    try {
      const response = await fetch('/api/twilio/phone-numbers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber,
          friendlyName: 'Soshogle CRM Number',
          autoCreateAgent: true,
          twilioAccountId: twilioAccountId || undefined,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase phone number');
      }

      toast.success('Phone number purchased successfully!');
      setPurchasedNumber(data.phoneNumber);
      
      // If agent was auto-created, skip config and close with success
      if (data.voiceAgentId) {
        if (onSuccess) onSuccess(data.phoneNumber);
        handleClose();
        return;
      }
      
      // Show post-purchase configuration screen (create new vs assign)
      setShowPostPurchase(true);
      setAvailableNumbers([]);
      setSelectedNumber(null);

    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to purchase phone number');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleConfigureNumber = async () => {
    if (!purchasedNumber) return;

    if (configAction === 'new') {
      // Create new voice agent with this number
      if (onCreateVoiceAgent) {
        onCreateVoiceAgent(purchasedNumber);
      }
      handleClose();
    } else if (configAction === 'existing') {
      // Assign to existing agent
      if (!selectedAgentId) {
        toast.error('Please select a voice agent');
        return;
      }

      setIsConfiguring(true);

      try {
        const response = await fetch(`/api/voice-agents/${selectedAgentId}/update-phone`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: purchasedNumber
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update voice agent');
        }

        toast.success(`Phone number assigned to ${data.name}!`);
        
        if (onSuccess) {
          onSuccess(purchasedNumber);
        }

        handleClose();

      } catch (error) {
        console.error('Configuration error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to configure phone number');
      } finally {
        setIsConfiguring(false);
      }
    }
  };

  const handleClose = () => {
    // Reset all state
    setAvailableNumbers([]);
    setSelectedNumber(null);
    setPurchasedNumber(null);
    setTwilioAccountId(null);
    setShowPostPurchase(false);
    setConfigAction('new');
    setSelectedAgentId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {showPostPurchase ? 'Configure Your Number' : 'Purchase Twilio Phone Number'}
          </DialogTitle>
          <DialogDescription>
            {showPostPurchase 
              ? `Choose how you want to use ${purchasedNumber}`
              : 'Search and purchase a phone number for your voice agents and messaging.'
            }
          </DialogDescription>
        </DialogHeader>

        {!showPostPurchase ? (
          <div className="space-y-6">
            {/* Search Filters */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Criteria
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryCode">Country</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger id="countryCode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {/* North America */}
                      <SelectItem value="US">🇺🇸 United States</SelectItem>
                      <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                      <SelectItem value="MX">🇲🇽 Mexico</SelectItem>
                      <SelectItem value="PR">🇵🇷 Puerto Rico</SelectItem>
                      
                      {/* Europe */}
                      <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                      <SelectItem value="IE">🇮🇪 Ireland</SelectItem>
                      <SelectItem value="FR">🇫🇷 France</SelectItem>
                      <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                      <SelectItem value="ES">🇪🇸 Spain</SelectItem>
                      <SelectItem value="IT">🇮🇹 Italy</SelectItem>
                      <SelectItem value="NL">🇳🇱 Netherlands</SelectItem>
                      <SelectItem value="BE">🇧🇪 Belgium</SelectItem>
                      <SelectItem value="CH">🇨🇭 Switzerland</SelectItem>
                      <SelectItem value="AT">🇦🇹 Austria</SelectItem>
                      <SelectItem value="SE">🇸🇪 Sweden</SelectItem>
                      <SelectItem value="NO">🇳🇴 Norway</SelectItem>
                      <SelectItem value="DK">🇩🇰 Denmark</SelectItem>
                      <SelectItem value="FI">🇫🇮 Finland</SelectItem>
                      <SelectItem value="PL">🇵🇱 Poland</SelectItem>
                      <SelectItem value="CZ">🇨🇿 Czech Republic</SelectItem>
                      <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                      <SelectItem value="GR">🇬🇷 Greece</SelectItem>
                      <SelectItem value="RO">🇷🇴 Romania</SelectItem>
                      <SelectItem value="HU">🇭🇺 Hungary</SelectItem>
                      <SelectItem value="BG">🇧🇬 Bulgaria</SelectItem>
                      <SelectItem value="HR">🇭🇷 Croatia</SelectItem>
                      <SelectItem value="SK">🇸🇰 Slovakia</SelectItem>
                      <SelectItem value="SI">🇸🇮 Slovenia</SelectItem>
                      <SelectItem value="EE">🇪🇪 Estonia</SelectItem>
                      <SelectItem value="LV">🇱🇻 Latvia</SelectItem>
                      <SelectItem value="LT">🇱🇹 Lithuania</SelectItem>
                      <SelectItem value="LU">🇱🇺 Luxembourg</SelectItem>
                      
                      {/* Asia Pacific */}
                      <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                      <SelectItem value="NZ">🇳🇿 New Zealand</SelectItem>
                      <SelectItem value="JP">🇯🇵 Japan</SelectItem>
                      <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                      <SelectItem value="HK">🇭🇰 Hong Kong</SelectItem>
                      <SelectItem value="MY">🇲🇾 Malaysia</SelectItem>
                      <SelectItem value="PH">🇵🇭 Philippines</SelectItem>
                      <SelectItem value="TH">🇹🇭 Thailand</SelectItem>
                      <SelectItem value="ID">🇮🇩 Indonesia</SelectItem>
                      <SelectItem value="VN">🇻🇳 Vietnam</SelectItem>
                      <SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="KR">🇰🇷 South Korea</SelectItem>
                      <SelectItem value="TW">🇹🇼 Taiwan</SelectItem>
                      
                      {/* Middle East */}
                      <SelectItem value="IL">🇮🇱 Israel</SelectItem>
                      <SelectItem value="AE">🇦🇪 United Arab Emirates</SelectItem>
                      <SelectItem value="SA">🇸🇦 Saudi Arabia</SelectItem>
                      <SelectItem value="TR">🇹🇷 Turkey</SelectItem>
                      
                      {/* Latin America */}
                      <SelectItem value="BR">🇧🇷 Brazil</SelectItem>
                      <SelectItem value="AR">🇦🇷 Argentina</SelectItem>
                      <SelectItem value="CL">🇨🇱 Chile</SelectItem>
                      <SelectItem value="CO">🇨🇴 Colombia</SelectItem>
                      <SelectItem value="PE">🇵🇪 Peru</SelectItem>
                      <SelectItem value="VE">🇻🇪 Venezuela</SelectItem>
                      <SelectItem value="EC">🇪🇨 Ecuador</SelectItem>
                      <SelectItem value="CR">🇨🇷 Costa Rica</SelectItem>
                      <SelectItem value="PA">🇵🇦 Panama</SelectItem>
                      <SelectItem value="DO">🇩🇴 Dominican Republic</SelectItem>
                      
                      {/* Africa */}
                      <SelectItem value="ZA">🇿🇦 South Africa</SelectItem>
                      <SelectItem value="EG">🇪🇬 Egypt</SelectItem>
                      <SelectItem value="KE">🇰🇪 Kenya</SelectItem>
                      <SelectItem value="NG">🇳🇬 Nigeria</SelectItem>
                      
                      {/* Caribbean */}
                      <SelectItem value="JM">🇯🇲 Jamaica</SelectItem>
                      <SelectItem value="TT">🇹🇹 Trinidad and Tobago</SelectItem>
                      <SelectItem value="BB">🇧🇧 Barbados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaCode">Area Code (Optional)</Label>
                  <Input
                    id="areaCode"
                    placeholder="e.g., 415"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    maxLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contains">Contains (Optional)</Label>
                  <Input
                    id="contains"
                    placeholder="e.g., 555"
                    value={contains}
                    onChange={(e) => setContains(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Available Numbers
                  </>
                )}
              </Button>
            </div>

            {/* Available Numbers List */}
            {availableNumbers.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Available Numbers ({availableNumbers.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableNumbers.map((number) => (
                    <div
                      key={number.phoneNumber}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary ${
                        selectedNumber === number.phoneNumber
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                      onClick={() => setSelectedNumber(number.phoneNumber)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-medium text-lg">
                              {number.phoneNumber}
                            </span>
                            {selectedNumber === number.phoneNumber && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          
                          {(number.locality || number.region) && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {number.locality && <span>{number.locality}</span>}
                              {number.locality && number.region && <span>,</span>}
                              {number.region && <span>{number.region}</span>}
                            </div>
                          )}
                          
                          <div className="flex gap-2 mt-2">
                            {number.capabilities.voice && (
                              <Badge variant="secondary" className="text-xs">Voice</Badge>
                            )}
                            {number.capabilities.SMS && (
                              <Badge variant="secondary" className="text-xs">SMS</Badge>
                            )}
                            {number.capabilities.MMS && (
                              <Badge variant="secondary" className="text-xs">MMS</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Button */}
            {availableNumbers.length > 0 && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isPurchasing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchase}
                  disabled={!selectedNumber || isPurchasing}
                  className="flex-1"
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Purchasing...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Purchase Selected Number
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Post-Purchase Configuration */
          <div className="space-y-6">
            {/* Success Message */}
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <div>
                  <p className="font-medium">Phone Number Purchased!</p>
                  <p className="text-sm font-mono mt-1">{purchasedNumber}</p>
                  <p className="text-xs text-muted-foreground mt-2">This will be added to your next invoice.</p>
                </div>
              </div>
            </div>

            {/* Configuration Options */}
            <div className="space-y-4">
              <Label className="text-base font-medium">What would you like to do next?</Label>
              
              <RadioGroup value={configAction} onValueChange={(value) => setConfigAction(value as 'existing' | 'new')}>
                <div className="space-y-3">
                  {/* Create New Voice Agent */}
                  <div className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    configAction === 'new' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="new" id="new" className="mt-1" />
                    <div className="flex-1" onClick={() => setConfigAction('new')}>
                      <Label htmlFor="new" className="cursor-pointer">
                        <div className="flex items-center gap-2 font-medium">
                          <Plus className="h-4 w-4" />
                          Create New Voice Agent
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Build a new AI voice agent and configure it with this phone number
                        </p>
                      </Label>
                    </div>
                  </div>

                  {/* Use with Existing Agent */}
                  <div className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${
                    configAction === 'existing' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="existing" id="existing" className="mt-1" />
                    <div className="flex-1" onClick={() => setConfigAction('existing')}>
                      <Label htmlFor="existing" className="cursor-pointer">
                        <div className="flex items-center gap-2 font-medium">
                          <Settings className="h-4 w-4" />
                          Assign to Existing Voice Agent
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Connect this number to one of your existing voice agents
                        </p>
                      </Label>
                    </div>
                  </div>
                </div>
              </RadioGroup>

              {/* Voice Agent Selector (shown when 'existing' is selected) */}
              {configAction === 'existing' && (
                <div className="space-y-2 pl-6 animate-in fade-in slide-in-from-left-2">
                  <Label htmlFor="voiceAgent">Select Voice Agent</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger id="voiceAgent">
                      <SelectValue placeholder="Choose a voice agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceAgents.length === 0 ? (
                        <SelectItem value="no-agents" disabled>No voice agents available</SelectItem>
                      ) : (
                        voiceAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} {agent.twilioPhoneNumber ? `(${agent.twilioPhoneNumber})` : '(No number)'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {voiceAgents.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      You don't have any voice agents yet. Create a new one instead.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isConfiguring}
              >
                Skip for Now
              </Button>
              <Button
                onClick={handleConfigureNumber}
                disabled={isConfiguring || (configAction === 'existing' && !selectedAgentId)}
                className="flex-1"
              >
                {isConfiguring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configuring...
                  </>
                ) : configAction === 'new' ? (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Voice Agent
                  </>
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Assign to Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  PhoneCall,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Users,
  User,
  Home,
  Calendar,
  Clock,
  MessageSquare,
  FileText,
  Target,
  Zap,
  Brain,
  Sparkles,
  Settings,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Building,
  DollarSign,
  TrendingUp,
  Star,
  List,
  Grid,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Conversation } from '@elevenlabs/client';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  status: 'new' | 'contacted' | 'qualified' | 'appointment' | 'listing';
  source: string;
  listedPrice?: number;
  daysOnMarket?: number;
  lastContact?: string;
  notes?: string;
}

interface CallScript {
  id: string;
  name: string;
  description: string;
  category: 'fsbo' | 'expired' | 'followup' | 'appointment';
  prompts: string[];
}

interface CallLog {
  id: string;
  leadId: string;
  leadName: string;
  duration: number;
  outcome: 'answered' | 'voicemail' | 'no_answer' | 'callback' | 'appointment';
  notes: string;
  timestamp: Date;
  recording?: string;
}

export function VoiceAIPanel() {
  const [activeTab, setActiveTab] = useState('dialer');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedScript, setSelectedScript] = useState<CallScript | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAIAssistEnabled, setIsAIAssistEnabled] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  
  const conversationRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Demo call scripts
  const callScripts: CallScript[] = [
    {
      id: 'fsbo-intro',
      name: 'FSBO Introduction',
      description: 'Initial contact with For Sale By Owner sellers',
      category: 'fsbo',
      prompts: [
        'Hi, is this [NAME]? Great! My name is [AGENT] with [COMPANY].',
        "I noticed your property at [ADDRESS] is for sale. How's the selling process going so far?",
        'Have you had much interest from qualified buyers?',
        "I specialize in helping homeowners in your area. Would you be open to hearing how I've helped others in similar situations?",
      ],
    },
    {
      id: 'expired-listing',
      name: 'Expired Listing Outreach',
      description: 'Re-engage sellers whose listings have expired',
      category: 'expired',
      prompts: [
        'Hi [NAME], this is [AGENT] with [COMPANY].',
        "I see your home at [ADDRESS] was on the market. I'm sorry it didn't sell - that can be frustrating.",
        'What do you think prevented it from selling?',
        "I've developed a specific marketing strategy that's been very successful for homes in your area. Would you like to hear about it?",
      ],
    },
    {
      id: 'appointment-confirm',
      name: 'Appointment Confirmation',
      description: 'Confirm upcoming listing appointments',
      category: 'appointment',
      prompts: [
        'Hi [NAME], this is [AGENT] calling to confirm our appointment.',
        'We\'re scheduled for [DATE] at [TIME]. Does that still work for you?',
        "I'll be bringing a detailed market analysis for your property.",
        'Is there anything specific you\'d like me to address during our meeting?',
      ],
    },
  ];

  useEffect(() => {
    // Load real FSBO leads from API
    const loadLeads = async () => {
      try {
        const response = await fetch('/api/real-estate/fsbo');
        if (response.ok) {
          const data = await response.json();
          const fsboLeads = (data.leads || []).map((lead: any) => ({
            id: lead.id,
            name: lead.sellerName || 'Unknown Seller',
            phone: lead.phone || '',
            email: lead.sellerEmail || '',
            address: `${lead.address}, ${lead.city}`,
            status: lead.status || 'new',
            source: `FSBO - ${lead.source}`,
            listedPrice: lead.price || 0,
            daysOnMarket: lead.daysOnMarket || 0,
          }));
          setLeads(fsboLeads);
        }
      } catch (error) {
        console.error('Error loading leads:', error);
        setLeads([]);
      }
    };

    loadLeads();
    setCallLogs([]);
  }, []);

  useEffect(() => {
    if (isCallActive && !callTimerRef.current) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (!isCallActive && callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [isCallActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCall = async () => {
    if (!selectedLead) {
      toast.error('Please select a lead to call');
      return;
    }

    setIsConnecting(true);
    setTranscript([]);
    setCallDuration(0);

    try {
      // Get signed URL for real-time voice conversation (Soshogle AI)
      const response = await fetch('/api/real-estate/voice-agent/websocket-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'real-estate',
          context: {
            leadName: selectedLead.name,
            propertyAddress: selectedLead.address,
            listedPrice: selectedLead.listedPrice,
            daysOnMarket: selectedLead.daysOnMarket,
            script: selectedScript?.prompts || [],
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to connect' }));
        throw new Error(err.error || 'Failed to get connection URL');
      }

      const { signedUrl } = await response.json();
      if (!signedUrl) throw new Error('No connection URL');

      conversationRef.current = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        onConnect: () => {
          setIsConnecting(false);
          setIsCallActive(true);
          toast.success(`Connected to ${selectedLead?.name || 'contact'}`);
        },
        onDisconnect: () => {
          setIsCallActive(false);
          setIsConnecting(false);
        },
        onMessage: (message: any) => {
          if (message.message) {
            const role = message.source === 'ai' ? 'assistant' : 'user';
            setTranscript(prev => [...prev, { role, text: message.message }]);
            if (isAIAssistEnabled && role === 'user') {
              generateAISuggestion(message.message);
            }
          }
        },
        onError: (error: any) => {
          console.error('Conversation error:', error);
          toast.error('Call connection error');
          setIsConnecting(false);
        },
      });

    } catch (error) {
      console.error('Failed to start call:', error);
      setIsConnecting(false);
      toast.error(error instanceof Error ? error.message : 'Failed to start call');
    }
  };

  const endCall = async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
    }
    setIsCallActive(false);
    setIsConnecting(false);
    
    // Log the call
    if (selectedLead) {
      const newLog: CallLog = {
        id: `log-${Date.now()}`,
        leadId: selectedLead.id,
        leadName: selectedLead.name,
        duration: callDuration,
        outcome: 'answered',
        notes: 'Call completed',
        timestamp: new Date(),
      };
      setCallLogs(prev => [newLog, ...prev]);
    }

    toast.success(`Call ended - Duration: ${formatDuration(callDuration)}`);
    setCallDuration(0);
  };

  const generateAISuggestion = async (userMessage: string) => {
    // Simulate AI suggestion generation
    const suggestions = [
      'Consider asking about their timeline for selling.',
      'This might be a good time to mention your recent sales in the area.',
      'Ask about their biggest concerns with the selling process.',
      'Offer to send them a free market analysis.',
      'Suggest scheduling a no-obligation consultation.',
    ];
    setAiSuggestion(suggestions[Math.floor(Math.random() * suggestions.length)]);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || lead.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'contacted': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'qualified': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'appointment': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'listing': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900/50 border border-slate-700/50">
          <TabsTrigger value="dialer" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <Phone className="w-4 h-4 mr-2" />
            Soshogle AI Dialer
          </TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <Users className="w-4 h-4 mr-2" />
            Lead Queue
          </TabsTrigger>
          <TabsTrigger value="scripts" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <FileText className="w-4 h-4 mr-2" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
            <Clock className="w-4 h-4 mr-2" />
            Call History
          </TabsTrigger>
        </TabsList>

        {/* AI Dialer Tab */}
        <TabsContent value="dialer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dialer Card */}
            <Card className="lg:col-span-2 bg-slate-900/50 border-slate-700/50 backdrop-blur-xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PhoneCall className="w-6 h-6 text-emerald-400" />
                  Soshogle AI Voice Dialer
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Smart calling with real-time AI coaching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected Lead */}
                {selectedLead ? (
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-emerald-500/20 text-emerald-300">
                            {selectedLead.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-white font-medium">{selectedLead.name}</h3>
                          <p className="text-slate-400 text-sm">{selectedLead.phone}</p>
                          <p className="text-slate-500 text-xs">{selectedLead.address}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(selectedLead.status)}>
                        {selectedLead.status}
                      </Badge>
                    </div>
                    {selectedLead.listedPrice && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50">
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span className="text-white">${selectedLead.listedPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-slate-400">{selectedLead.daysOnMarket} days on market</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Building className="w-4 h-4 text-violet-400" />
                          <span className="text-slate-400">{selectedLead.source}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 rounded-lg bg-slate-800/30 border border-dashed border-slate-700 text-center">
                    <Users className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                    <p className="text-slate-400">Select a lead from the queue to start calling</p>
                  </div>
                )}

                {/* Call Script Selection */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Call Script</Label>
                  <Select
                    value={selectedScript?.id || ''}
                    onValueChange={(v) => setSelectedScript(callScripts.find(s => s.id === v) || null)}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                      <SelectValue placeholder="Select a call script" />
                    </SelectTrigger>
                    <SelectContent>
                      {callScripts.map((script) => (
                        <SelectItem key={script.id} value={script.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {script.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Assist Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/20">
                      <Brain className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                    <p className="text-white font-medium">Soshogle AI Call Assistant</p>
                    <p className="text-slate-400 text-sm">Real-time suggestions & coaching</p>
                    </div>
                  </div>
                  <Switch
                    checked={isAIAssistEnabled}
                    onCheckedChange={setIsAIAssistEnabled}
                  />
                </div>

                {/* Call Controls */}
                <div className="flex items-center justify-center gap-4">
                  {!isCallActive && !isConnecting ? (
                    <Button
                      size="lg"
                      onClick={startCall}
                      disabled={!selectedLead}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-12 py-6 text-lg"
                    >
                      <Phone className="w-6 h-6 mr-3" />
                      Start Call
                    </Button>
                  ) : isConnecting ? (
                    <Button size="lg" disabled className="px-12 py-6 text-lg">
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                      Connecting...
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-mono text-emerald-400">
                          {formatDuration(callDuration)}
                        </p>
                        <p className="text-slate-400 text-sm">Duration</p>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setIsMuted(!isMuted)}
                        className={`w-14 h-14 rounded-full ${isMuted ? 'bg-red-500/20 border-red-500' : 'border-slate-700'}`}
                      >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={endCall}
                        className="px-8 py-6 bg-red-500 hover:bg-red-600"
                      >
                        <PhoneOff className="w-6 h-6 mr-2" />
                        End Call
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Assistant & Transcript */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Live Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {transcript.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                        <p>Transcript will appear here during the call</p>
                      </div>
                    ) : (
                      transcript.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${
                            msg.role === 'assistant'
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : 'bg-slate-800/50 border border-slate-700/30'
                          }`}
                        >
                          <p className={`text-xs mb-1 ${
                            msg.role === 'assistant' ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            {msg.role === 'assistant' ? 'Soshogle AI' : 'Lead'}
                          </p>
                          <p className="text-white text-sm">{msg.text}</p>
                        </div>
                      ))
                    )}

                    {/* AI Suggestion */}
                    {aiSuggestion && isCallActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/30"
                      >
                        <p className="text-xs text-violet-400 mb-1 flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          AI Suggestion
                        </p>
                        <p className="text-white text-sm">{aiSuggestion}</p>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Script Preview */}
          {selectedScript && (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-400" />
                  {selectedScript.name}
                </CardTitle>
                <CardDescription>{selectedScript.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedScript.prompts.map((prompt, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-violet-500/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-slate-400 text-xs">Step {i + 1}</span>
                      </div>
                      <p className="text-white text-sm">{prompt}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lead Queue Tab */}
        <TabsContent value="leads" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-white">Lead Queue</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search leads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-800/50 border-slate-700 text-white w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36 bg-slate-800/50 border-slate-700 text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => { setSelectedLead(lead); setActiveTab('dialer'); }}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedLead?.id === lead.id
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-slate-700">
                            {lead.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-white font-medium">{lead.name}</h4>
                          <p className="text-slate-400 text-sm">{lead.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {lead.listedPrice && (
                          <span className="text-emerald-400 font-medium">
                            ${lead.listedPrice.toLocaleString()}
                          </span>
                        )}
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setActiveTab('dialer');
                          }}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {callScripts.map((script) => (
              <Card
                key={script.id}
                className="bg-slate-900/50 border-slate-700/50 hover:border-emerald-500/30 transition-colors cursor-pointer"
                onClick={() => { setSelectedScript(script); setActiveTab('dialer'); }}
              >
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    {script.name}
                  </CardTitle>
                  <CardDescription>{script.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className="mb-3">{script.category}</Badge>
                  <p className="text-slate-400 text-sm">
                    {script.prompts.length} conversation prompts
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Call History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Call History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {callLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-emerald-500/20">
                          <Phone className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{log.leadName}</h4>
                          <p className="text-slate-400 text-sm">{log.notes}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white">{formatDuration(log.duration)}</p>
                          <p className="text-slate-400 text-xs">
                            {log.timestamp.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={`${
                          log.outcome === 'appointment' ? 'bg-emerald-500/20 text-emerald-400' :
                          log.outcome === 'callback' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {log.outcome}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

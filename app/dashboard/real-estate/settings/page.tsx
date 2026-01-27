'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, MapPin, Phone, Mail, Building2, Key, Bell, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function RealEstateSettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Profile settings
  const [profile, setProfile] = useState({
    agentName: '',
    brokerageName: '',
    licenseNumber: '',
    email: '',
    phone: '',
    website: '',
    bio: '',
    serviceAreas: '',
  });

  // API settings
  const [apiSettings, setApiSettings] = useState({
    mlsApiKey: '',
    mlsProvider: 'rets',
    gammaApiKey: '',
    zillowApiKey: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    newFsboLeads: true,
    expiredListings: true,
    priceChanges: true,
    cmaCompleted: false,
    dailyDigest: true,
    smsAlerts: false,
  });

  // Voice AI settings
  const [voiceSettings, setVoiceSettings] = useState({
    autoDialEnabled: false,
    callRecording: true,
    maxCallsPerDay: '50',
    callHoursStart: '09:00',
    callHoursEnd: '18:00',
    voiceStyle: 'professional',
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast({
      title: 'Settings Saved',
      description: 'Your real estate settings have been updated.',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard/real-estate">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Real Estate Settings</h1>
              <p className="text-slate-400">Configure your real estate tools and integrations</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </motion.div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-600">
              <Building2 className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-purple-600">
              <Key className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-purple-600">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="voice-ai" className="data-[state=active]:bg-purple-600">
              <Zap className="w-4 h-4 mr-2" />
              Voice AI
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Agent Profile</CardTitle>
                  <CardDescription>Your professional information for presentations and communications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Agent Name</Label>
                      <Input
                        value={profile.agentName}
                        onChange={(e) => setProfile({ ...profile, agentName: e.target.value })}
                        placeholder="John Smith"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Brokerage Name</Label>
                      <Input
                        value={profile.brokerageName}
                        onChange={(e) => setProfile({ ...profile, brokerageName: e.target.value })}
                        placeholder="ABC Realty"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">License Number</Label>
                      <Input
                        value={profile.licenseNumber}
                        onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
                        placeholder="RE-123456"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Phone</Label>
                      <Input
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Email</Label>
                      <Input
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="agent@email.com"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Website</Label>
                      <Input
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        placeholder="www.yoursite.com"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Service Areas</Label>
                    <Input
                      value={profile.serviceAreas}
                      onChange={(e) => setProfile({ ...profile, serviceAreas: e.target.value })}
                      placeholder="Los Angeles, Orange County, San Diego"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Bio</Label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Tell clients about your experience and expertise..."
                      className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">MLS Integration</CardTitle>
                  <CardDescription>Connect to your MLS for real-time listing data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">MLS Provider</Label>
                    <Select defaultValue="rets">
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rets">RETS</SelectItem>
                        <SelectItem value="spark">Spark API</SelectItem>
                        <SelectItem value="bridge">Bridge Interactive</SelectItem>
                        <SelectItem value="trestle">Trestle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">MLS API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter your MLS API key"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Gamma Presentations</CardTitle>
                  <CardDescription>AI-powered presentation generation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Gamma API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter your Gamma API key"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    Get your API key from <a href="https://gamma.app" target="_blank" className="text-purple-400 hover:underline">gamma.app</a>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Notification Preferences</CardTitle>
                  <CardDescription>Choose what updates you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: 'newFsboLeads', label: 'New FSBO Leads', description: 'Get notified when new FSBO leads are found' },
                    { key: 'expiredListings', label: 'Expired Listings', description: 'Alerts for newly expired listings in your area' },
                    { key: 'priceChanges', label: 'Price Changes', description: 'Track price reductions on watched listings' },
                    { key: 'cmaCompleted', label: 'CMA Reports', description: 'Notification when CMA analysis is complete' },
                    { key: 'dailyDigest', label: 'Daily Digest', description: 'Summary email of daily activity' },
                    { key: 'smsAlerts', label: 'SMS Alerts', description: 'Receive urgent alerts via text message' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{item.label}</p>
                        <p className="text-sm text-slate-400">{item.description}</p>
                      </div>
                      <Switch
                        checked={(notifications as any)[item.key]}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Voice AI Tab */}
          <TabsContent value="voice-ai">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Voice AI Configuration</CardTitle>
                  <CardDescription>Configure automated calling and voice assistant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Auto-Dial Mode</p>
                      <p className="text-sm text-slate-400">Automatically dial leads from your queue</p>
                    </div>
                    <Switch
                      checked={voiceSettings.autoDialEnabled}
                      onCheckedChange={(checked) => setVoiceSettings({ ...voiceSettings, autoDialEnabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Call Recording</p>
                      <p className="text-sm text-slate-400">Record calls for training and compliance</p>
                    </div>
                    <Switch
                      checked={voiceSettings.callRecording}
                      onCheckedChange={(checked) => setVoiceSettings({ ...voiceSettings, callRecording: checked })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Max Calls Per Day</Label>
                      <Input
                        type="number"
                        value={voiceSettings.maxCallsPerDay}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, maxCallsPerDay: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Voice Style</Label>
                      <Select
                        value={voiceSettings.voiceStyle}
                        onValueChange={(value) => setVoiceSettings({ ...voiceSettings, voiceStyle: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Calling Hours Start</Label>
                      <Input
                        type="time"
                        value={voiceSettings.callHoursStart}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, callHoursStart: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Calling Hours End</Label>
                      <Input
                        type="time"
                        value={voiceSettings.callHoursEnd}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, callHoursEnd: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TabsContent } from '@/components/ui/tabs';
import { Info } from 'lucide-react';

interface RecordingPrivacyTabProps {
  formData: {
    enableCallRecording: boolean;
    enableTranscription: boolean;
    sendRecordingEmail: boolean;
    recordingEmailAddress: string;
  };
  setFormData: (updater: any) => void;
}

export function RecordingPrivacyTab({ formData, setFormData }: RecordingPrivacyTabProps) {
  const update = (fields: Record<string, any>) => setFormData((prev: any) => ({ ...prev, ...fields }));

  return (
    <TabsContent value="recording" className="space-y-4 mt-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>Configure call recording, transcription, and privacy settings</AlertDescription>
      </Alert>

      <div className="space-y-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="enableCallRecording" className="font-semibold">Enable Call Recording</Label>
            <p className="text-xs text-muted-foreground">Record all calls for quality assurance and training purposes</p>
          </div>
          <Switch id="enableCallRecording" checked={formData.enableCallRecording} onCheckedChange={(checked) => update({ enableCallRecording: checked })} />
        </div>

        {formData.enableCallRecording && (
          <>
            <div className="flex items-center justify-between ml-6 pt-2 border-t">
              <div className="space-y-1">
                <Label htmlFor="enableTranscription" className="font-semibold">Enable Transcription</Label>
                <p className="text-xs text-muted-foreground">Automatically transcribe call recordings to text</p>
              </div>
              <Switch id="enableTranscription" checked={formData.enableTranscription} onCheckedChange={(checked) => update({ enableTranscription: checked })} />
            </div>

            <div className="flex items-center justify-between ml-6 pt-2 border-t">
              <div className="space-y-1">
                <Label htmlFor="sendRecordingEmail" className="font-semibold">Email Recording & Transcript</Label>
                <p className="text-xs text-muted-foreground">Send call recording and transcript via email after each call</p>
              </div>
              <Switch id="sendRecordingEmail" checked={formData.sendRecordingEmail} onCheckedChange={(checked) => update({ sendRecordingEmail: checked })} />
            </div>

            {formData.sendRecordingEmail && (
              <div className="ml-6 pt-2">
                <Label htmlFor="recordingEmailAddress">
                  Email Address<span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="recordingEmailAddress" type="email"
                  value={formData.recordingEmailAddress}
                  onChange={(e) => update({ recordingEmailAddress: e.target.value })}
                  placeholder="recordings@yourcompany.com"
                  required={formData.sendRecordingEmail}
                />
                <p className="text-xs text-muted-foreground mt-1">Recordings and transcripts will be sent to this email address</p>
              </div>
            )}
          </>
        )}
      </div>

      <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Privacy & Compliance:</strong> Recording calls may require consent from all parties depending on your jurisdiction. Ensure you comply with local laws and regulations (e.g., two-party consent laws, GDPR, CCPA). Consider adding a recording disclosure to your greeting message.
        </AlertDescription>
      </Alert>

      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📞 How Call Recording Works</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <li>• Recordings are stored securely in Soshogle&apos;s cloud storage</li>
          <li>• Transcriptions are generated automatically using advanced AI</li>
          <li>• All recordings are linked to contact records for easy review</li>
          <li>• Call transcripts appear in the Messages section for each contact</li>
          <li>• You can disable recording anytime for security or privacy reasons</li>
        </ul>
      </div>
    </TabsContent>
  );
}

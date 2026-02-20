'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface PostConversationPanelProps {
  recordingUrl: string;
  onTestAgain: () => void;
  onBackToAgents: () => void;
}

export function PostConversationPanel({ recordingUrl, onTestAgain, onBackToAgents }: PostConversationPanelProps) {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <CheckCircle2 className="h-5 w-5 text-green-600" /> Conversation Complete
        </CardTitle>
        <CardDescription className="text-gray-600">Preview conversation saved successfully</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recordingUrl && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Audio Recording</h3>
            <audio controls src={recordingUrl} className="w-full" />
          </div>
        )}
        <div className="flex gap-3">
          <Button onClick={onTestAgain} className="flex-1 border-gray-300" variant="outline">Test Again</Button>
          <Button onClick={onBackToAgents} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">Back to Agents</Button>
        </div>
      </CardContent>
    </Card>
  );
}

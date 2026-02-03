'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Pause, Play, Clock, Brain, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DocpenRecorderProps {
  sessionId: string;
  onRecordingComplete?: (duration: number) => void;
  onStatusChange?: (status: 'idle' | 'recording' | 'paused' | 'processing') => void;
}

export function DocpenRecorder({
  sessionId,
  onRecordingComplete,
  onStatusChange,
}: DocpenRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🎤 [Docpen Recorder] Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Cancel animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      mediaRecorderRef.current = null;
    }
    
    console.log('🧹 [Docpen Recorder] Cleanup complete');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const analyzeAudio = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255);
    
    animationRef.current = requestAnimationFrame(analyzeAudio);
  };

  const startRecording = async () => {
    try {
      // Request microphone access (this will prompt the user)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Cleanup will be handled by cleanup() function
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.start(1000); // Capture in 1-second chunks
      setIsRecording(true);
      setIsPaused(false);
      onStatusChange?.('recording');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      // Start audio analysis
      analyzeAudio();
      
      toast.success('Recording started');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Microphone access denied. Please allow microphone permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please connect a microphone and try again.');
      } else {
        toast.error('Could not access microphone. Please check permissions.');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
        onStatusChange?.('recording');
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) clearInterval(timerRef.current);
        onStatusChange?.('paused');
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    setIsProcessing(true);
    onStatusChange?.('processing');
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop recording
    return new Promise<void>((resolve) => {
      if (!mediaRecorderRef.current) {
        cleanup();
        resolve();
        return;
      }
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Upload for transcription
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('sessionId', sessionId);
          
          const response = await fetch('/api/docpen/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.details || errorData.error || 'Transcription failed';
            throw new Error(errorMessage);
          }
          
          const result = await response.json();
          toast.success(`Transcribed ${result.segmentCount} segments`);
          onRecordingComplete?.(duration);
        } catch (error: any) {
          console.error('Error processing recording:', error);
          const errorMessage = error?.message || 'Failed to process recording';
          toast.error(errorMessage);
          
          // Show hint if API key is missing
          if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('API key')) {
            toast.error('Please configure OPENAI_API_KEY in your environment variables', { duration: 5000 });
          }
        } finally {
          setIsRecording(false);
          setIsPaused(false);
          setIsProcessing(false);
          setAudioLevel(0);
          onStatusChange?.('idle');
          
          // Cleanup microphone and resources
          cleanup();
          resolve();
        }
      };
      
      mediaRecorderRef.current.stop();
    });
  };

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Ambient Recording
          </CardTitle>
          <Badge variant={isRecording ? (isPaused ? 'secondary' : 'destructive') : 'outline'}>
            {isRecording ? (isPaused ? 'Paused' : 'Recording') : 'Ready'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Duration Display */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center gap-2 text-4xl font-mono font-bold">
              <Clock className="h-8 w-8 text-muted-foreground" />
              {formatDuration(duration)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isProcessing ? 'Processing audio...' : 'Session Duration'}
            </p>
          </div>
        </div>

        {/* Audio Level Indicator */}
        {isRecording && !isPaused && (
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <Button
              size="lg"
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
              onClick={startRecording}
              disabled={isProcessing}
            >
              <Mic className="h-8 w-8" />
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                className="h-14 w-14 rounded-full"
                onClick={pauseRecording}
                disabled={isProcessing}
              >
                {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="h-16 w-16 rounded-full"
                onClick={stopRecording}
                disabled={isProcessing}
              >
                <Square className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground">
          {!isRecording ? (
            <p>Click the microphone to start recording the consultation</p>
          ) : (
            <p>Recording in progress. Speak naturally - AI will identify speakers automatically.</p>
          )}
        </div>

        {/* Wake Word Hint */}
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-sm">
          <p className="font-medium text-purple-700 dark:text-purple-300">
            💡 Voice Assistant Available
          </p>
          <p className="text-purple-600 dark:text-purple-400 mt-1">
            Connect the Voice Assistant in the right panel for real-time AI help. Say "<span className="font-mono">Docpen</span>" followed by your question during recording.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

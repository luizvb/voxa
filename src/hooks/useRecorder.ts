import { useState, useCallback, useRef, useEffect } from 'react';
import { platform } from '../platform';

declare global {
  interface Window {
    recorder: any;
  }
}

export type CaptureMode = 'microphone' | 'shared';

type DisplayCaptureOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
  surfaceSwitching?: 'include' | 'exclude';
  systemAudio?: 'include' | 'exclude';
  windowAudio?: 'exclude' | 'system' | 'window';
};

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewBlob, setReviewBlob] = useState<{ blob: Blob; durationMs: number; url: string } | null>(null);
  
  const [status, setStatus] = useState('Ready');
  const [sessionName, setSessionName] = useState('');
  const [captureMode, setCaptureMode] = useState<CaptureMode>(platform.capabilities.kind === 'electron' ? 'shared' : 'microphone');
  
  // Timer state
  const [elapsedMs, setElapsedMs] = useState(0);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeCaptureModeRef = useRef<CaptureMode>(captureMode);
  
  // Time tracking
  const startedAtRef = useRef<number>(0);
  const totalElapsedBeforePauseRef = useRef<number>(0);
  const timerHandleRef = useRef<number | null>(null);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const stopStreams = () => {
    for (const stream of streamsRef.current) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    streamsRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const preferredMimeType = () => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'video/webm;codecs=opus', 'video/webm'];
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
  };

  const createCaptureStream = async (mode: CaptureMode) => {
    const warnings: string[] = [];
    let mic: MediaStream | null = null;
    let shared: MediaStream | null = null;

    if (!navigator.mediaDevices) throw new Error('Audio capture is not supported in this browser.');

    if (mode === 'shared') {
      if (!platform.capabilities.systemAudio || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Tab and screen audio sharing is not supported in this browser.');
      }

      try {
        const options: DisplayCaptureOptions = {
          audio: { suppressLocalAudioPlayback: false } as MediaTrackConstraints,
          video: true,
          preferCurrentTab: false,
          selfBrowserSurface: 'exclude',
          surfaceSwitching: 'include',
          systemAudio: 'include',
          windowAudio: 'system',
        };
        // getDisplayMedia must be the first permission awaited after the user's click.
        shared = await navigator.mediaDevices.getDisplayMedia(options);
        streamsRef.current.push(shared);
        shared.getVideoTracks().forEach((track) => track.stop());
        if (shared.getAudioTracks().length === 0) {
          throw new Error('The selected tab or screen did not share audio. Enable “Share audio” and try again.');
        }
      } catch (error: unknown) {
        const captureError = error as DOMException;
        if (captureError?.name === 'NotAllowedError') throw new Error('Tab or screen sharing was canceled.');
        throw error;
      }

      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamsRef.current.push(mic);
      } catch {
        warnings.push('Microphone permission was not granted. Recording shared audio only.');
      }
    } else {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamsRef.current.push(mic);
    }

    audioContextRef.current = new window.AudioContext();
    const destination = audioContextRef.current.createMediaStreamDestination();

    if (mic && shared) {
      // Preserve the known microphone and shared source on separate channels.
      const merger = audioContextRef.current.createChannelMerger(2);
      audioContextRef.current.createMediaStreamSource(mic).connect(merger, 0, 0);
      audioContextRef.current.createMediaStreamSource(shared).connect(merger, 0, 1);
      merger.connect(destination);
    } else {
      const onlySource = mic || shared;
      if (!onlySource) throw new Error('No audio source is available.');
      audioContextRef.current.createMediaStreamSource(onlySource).connect(destination);
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return { stream: destination.stream, warnings };
  };

  const startTimer = () => {
    startedAtRef.current = Date.now();
    timerHandleRef.current = window.setInterval(() => {
      setElapsedMs(totalElapsedBeforePauseRef.current + (Date.now() - startedAtRef.current));
    }, 100);
  };

  const stopTimer = () => {
    if (timerHandleRef.current) {
      clearInterval(timerHandleRef.current);
      timerHandleRef.current = null;
    }
  };

  const startRecording = useCallback(async (options: { captureMode?: CaptureMode } = {}) => {
    const nextCaptureMode = options.captureMode || (platform.capabilities.kind === 'electron' ? 'shared' : 'microphone');
    activeCaptureModeRef.current = nextCaptureMode;
    setCaptureMode(nextCaptureMode);
    setStatus('Preparing recording permissions...');
    
    // Clear previous review
    if (reviewBlob && reviewBlob.url) URL.revokeObjectURL(reviewBlob.url);
    setIsReviewing(false);
    setReviewBlob(null);

    try {
      chunksRef.current = [];
      const capture = await createCaptureStream(nextCaptureMode);
      const mimeType = preferredMimeType();
      
      mediaRecorderRef.current = new MediaRecorder(capture.stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      mediaRecorderRef.current.start(1000);
      
      setIsRecording(true);
      setIsPaused(false);
      setStatus(capture.warnings.length > 0
        ? capture.warnings.join(' ')
        : nextCaptureMode === 'shared' ? 'Recording microphone and shared audio...' : 'Recording computer microphone...');
      
      totalElapsedBeforePauseRef.current = 0;
      setElapsedMs(0);
      startTimer();
    } catch (error: any) {
      stopStreams();
      setStatus(`Recording permission failed: ${error.message}`);
    }
  }, [reviewBlob]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      stopTimer();
      totalElapsedBeforePauseRef.current += (Date.now() - startedAtRef.current);
      setIsPaused(true);
      setStatus('Paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      startedAtRef.current = Date.now();
      startTimer();
      setIsPaused(false);
      setStatus('Recording...');
    }
  }, []);

  const stopRecording = useCallback(async (options: { discard?: boolean, review?: boolean } = {}) => {
    return new Promise<any>((resolve, reject) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return resolve(undefined);
      
      stopTimer();
      
      mediaRecorderRef.current.addEventListener('stop', async () => {
        const durationMs = totalElapsedBeforePauseRef.current + (isPaused ? 0 : (Date.now() - startedAtRef.current));
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        
        stopStreams();
        setIsRecording(false);
        setIsPaused(false);

        if (options.discard) {
           setStatus('Discarded');
           return resolve(undefined);
        }

        if (options.review) {
           const url = URL.createObjectURL(blob);
           setReviewBlob({ blob, durationMs, url });
           setIsReviewing(true);
           setStatus('Reviewing');
           return resolve(undefined);
        }
        
        // Default: save immediately
        setStatus('Saving...');
        try {
          const bytes = await blob.arrayBuffer();
          const saved = await platform.saveRecording({
            name: sessionName || 'Untitled recording',
            durationMs,
            mode: activeCaptureModeRef.current === 'shared' ? 'shared' : 'mic',
            mimeType: blob.type || 'audio/webm',
            extension: 'webm',
            bytes
          });
          setStatus('Saved');
          resolve(saved);
        } catch (error: any) {
          setStatus(`Save failed: ${error.message}`);
          reject(error);
        }
      }, { once: true });

      mediaRecorderRef.current.stop();
    });
  }, [sessionName, isPaused]);

  const saveReview = useCallback(async () => {
    if (!reviewBlob) return;
    setStatus('Saving...');
    try {
      const bytes = await reviewBlob.blob.arrayBuffer();
      await platform.saveRecording({
        name: sessionName || 'Untitled recording',
        durationMs: reviewBlob.durationMs,
        mode: activeCaptureModeRef.current === 'shared' ? 'shared' : 'mic',
        mimeType: reviewBlob.blob.type || 'audio/webm',
        extension: 'webm',
        bytes
      });
      setStatus('Saved');
      setIsReviewing(false);
      URL.revokeObjectURL(reviewBlob.url);
      setReviewBlob(null);
    } catch (e: any) {
      setStatus(`Save failed: ${e.message}`);
    }
  }, [reviewBlob, sessionName]);

  const discardReview = useCallback(() => {
    if (reviewBlob && reviewBlob.url) {
      URL.revokeObjectURL(reviewBlob.url);
    }
    setIsReviewing(false);
    setReviewBlob(null);
    setStatus('Discarded');
  }, [reviewBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopStreams();
      if (reviewBlob && reviewBlob.url) {
        URL.revokeObjectURL(reviewBlob.url);
      }
    };
  }, [reviewBlob]);

  return {
    isRecording,
    isPaused,
    isReviewing,
    reviewBlob,
    status,
    captureMode,
    sessionName,
    setSessionName,
    elapsedMs,
    formattedTime: formatDuration(elapsedMs),
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveReview,
    discardReview
  };
}

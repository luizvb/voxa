import { useState, useCallback, useRef, useEffect } from 'react';

// Using window.recorder from preload
declare global {
  interface Window {
    recorder: any;
  }
}

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [sessionName, setSessionName] = useState('Voxa Session');
  
  // Timer state
  const [elapsedMs, setElapsedMs] = useState(0);

  // References to keep track of mutable recording state without triggering re-renders
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef<number>(0);
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

  const createCaptureStream = async () => {
    audioContextRef.current = new window.AudioContext();
    const destination = audioContextRef.current.createMediaStreamDestination();
    const warnings: string[] = [];

    let mic: MediaStream | null = null;
    let system: MediaStream | null = null;

    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamsRef.current.push(mic);
    } catch (e: any) {
      throw new Error(`Microphone permission denied: ${e.message}`);
    }

    try {
      // getDisplayMedia in Electron captures screen/system audio based on the handler in main.js
      system = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true // Video track is required by spec, we will drop it
      });
      
      // Stop the video track immediately as we only want audio
      system.getVideoTracks().forEach(track => track.stop());
      streamsRef.current.push(system);
    } catch (e: any) {
      warnings.push("System audio capture was skipped or denied.");
    }

    // Merge into stereo channels (Mic = Left, System = Right)
    const merger = audioContextRef.current.createChannelMerger(2);
    
    // Connect Mic to Channel 0 (Left)
    const micSource = audioContextRef.current.createMediaStreamSource(mic);
    micSource.connect(merger, 0, 0);

    // Connect System to Channel 1 (Right) if available
    if (system && system.getAudioTracks().length > 0) {
      const systemSource = audioContextRef.current.createMediaStreamSource(system);
      systemSource.connect(merger, 0, 1);
    }

    merger.connect(destination);

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return { stream: destination.stream, warnings };
  };

  const startRecording = useCallback(async () => {
    setStatus('Preparing recording permissions...');
    
    try {
      chunksRef.current = [];
      const capture = await createCaptureStream();
      const mimeType = preferredMimeType();
      
      mediaRecorderRef.current = new MediaRecorder(capture.stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      mediaRecorderRef.current.addEventListener('stop', async () => {
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        const bytes = await blob.arrayBuffer();
        
        try {
          await window.recorder.saveRecording({
            name: sessionName || 'Untitled recording',
            durationMs,
            mode: 'mic',
            mimeType: blob.type || 'audio/webm',
            extension: 'webm',
            bytes
          });
          setStatus('Saved');
        } catch (error: any) {
          setStatus(`Save failed: ${error.message}`);
        } finally {
          stopStreams();
        }
      });

      mediaRecorderRef.current.start(1000);
      
      setIsRecording(true);
      setStatus(capture.warnings.length > 0 ? capture.warnings.join(' ') : 'Recording microphone...');
      
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      timerHandleRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 250);

    } catch (error: any) {
      stopStreams();
      setStatus(`Recording permission failed: ${error.message}`);
    }
  }, [sessionName]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    
    if (timerHandleRef.current) {
      clearInterval(timerHandleRef.current);
    }
    
    setIsRecording(false);
    setStatus('Saving...');
    mediaRecorderRef.current.stop();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerHandleRef.current) clearInterval(timerHandleRef.current);
      stopStreams();
    };
  }, []);

  return {
    isRecording,
    status,
    sessionName,
    setSessionName,
    elapsedMs,
    formattedTime: formatDuration(elapsedMs),
    startRecording,
    stopRecording
  };
}

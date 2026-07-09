const toggleMode = document.getElementById('toggleMode');
const start = document.getElementById('start');
const stop = document.getElementById('stop');
const openFolder = document.getElementById('openFolder');
const includeSystem = document.getElementById('includeSystem');
const sessionName = document.getElementById('sessionName');
const statusText = document.getElementById('status');
const timer = document.getElementById('timer');
const player = document.getElementById('player');
const historyList = document.getElementById('historyList');
const recordCount = document.getElementById('recordCount');
const captureMode = document.getElementById('captureMode');
const storagePath = document.getElementById('storagePath');
const aiMode = document.getElementById('aiMode');
const maxQuality = document.getElementById('maxQuality');
const transcribe = document.getElementById('transcribe');
const transcriptStatus = document.getElementById('transcriptStatus');
const transcriptOutput = document.getElementById('transcriptOutput');

let mediaRecorder;
let chunks = [];
let streams = [];
let startedAt = 0;
let timerHandle;
let audioContext;
let activeMode = 'mic';
let selectedRecordingId;

function show(value) {
  console.log(value);
}

function setStatus(value) {
  statusText.textContent = value;
}

function updateCaptureMode() {
  captureMode.textContent = includeSystem.checked ? 'Mic + System' : 'Mic only';
}

function updateAiMode() {
  aiMode.textContent = maxQuality.checked ? 'Max' : 'Standard';
}

function setTranscriptStatus(value) {
  transcriptStatus.querySelector('span:last-child').textContent = value;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function startTimer() {
  startedAt = Date.now();
  timerHandle = setInterval(() => {
    timer.textContent = formatDuration(Date.now() - startedAt);
  }, 250);
}

function stopTimer() {
  clearInterval(timerHandle);
  timer.textContent = formatDuration(Date.now() - startedAt);
}

function stopStreams() {
  for (const stream of streams) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }
  streams = [];
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = undefined;
  }
}

function preferredMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'video/webm;codecs=opus', 'video/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

function renderTranscript(markdown) {
  transcriptOutput.classList.remove('empty');
  transcriptOutput.innerHTML = '';

  const blocks = markdown.split(/\n{2,}/).filter(Boolean);
  if (blocks.length === 0) {
    transcriptOutput.classList.add('empty');
    transcriptOutput.textContent = 'No transcript text returned.';
    return;
  }

  for (const block of blocks) {
    const [heading, ...body] = block.split('\n');
    const item = document.createElement('article');
    item.className = 'transcript-block';
    const speaker = document.createElement('strong');
    speaker.textContent = heading.replace(/\*\*/g, '');
    const text = document.createElement('p');
    text.textContent = body.join(' ').trim();
    item.append(speaker, text);
    transcriptOutput.appendChild(item);
  }
}

function selectRecording(recording) {
  selectedRecordingId = recording.id;
  transcribe.disabled = false;
  player.src = recording.playbackUrl;
  player.play().catch(() => {});
  setStatus(`Playing ${recording.name}`);

  if (recording.transcript) {
    setTranscriptStatus(`Transcript saved (${recording.transcript.quality}).`);
    window.recorder.getTranscript(recording.id).then((result) => {
      renderTranscript(result.markdown);
    }).catch((error) => {
      transcriptOutput.classList.add('empty');
      transcriptOutput.textContent = error.message;
    });
  } else {
    setTranscriptStatus('Ready to transcribe selected recording.');
    transcriptOutput.classList.add('empty');
    transcriptOutput.textContent = 'No transcript yet.';
  }
}

async function createCaptureStream() {
  audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const warnings = [];

  const mic = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true
    }
  });
  streams.push(mic);
  audioContext.createMediaStreamSource(mic).connect(destination);

  if (includeSystem.checked) {
    try {
      const system = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: {
          width: 16,
          height: 16,
          frameRate: 1
        }
      });
      streams.push(system);
      if (system.getAudioTracks().length === 0) {
        warnings.push('System audio unavailable; recording microphone only.');
      } else {
        activeMode = 'mic+system';
        audioContext.createMediaStreamSource(system).connect(destination);
      }
    } catch (error) {
      warnings.push(`System audio unavailable; recording microphone only. ${error.message}`);
    }
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  return {
    stream: destination.stream,
    warnings
  };
}

async function refreshHistory(selectId) {
  const recordings = await window.recorder.listRecordings();
  historyList.innerHTML = '';
  recordCount.textContent = String(recordings.length);

  if (recordings.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No recordings yet.';
    historyList.appendChild(empty);
    return;
  }

  for (const recording of recordings) {
    const item = document.createElement('button');
    item.className = 'history-item';
    item.type = 'button';
    const transcriptLabel = recording.transcript ? ` · transcript ${recording.transcript.quality}` : '';
    item.innerHTML = `
      <strong>${recording.name}</strong>
      <span>${new Date(recording.createdAt).toLocaleString()} · ${formatDuration(recording.durationMs)} · ${recording.mode}${transcriptLabel}</span>
    `;
    item.addEventListener('click', () => {
      selectRecording(recording);
    });
    historyList.appendChild(item);

    if (recording.id === selectId) {
      item.click();
    }
  }
}

async function finishRecording() {
  const durationMs = Date.now() - startedAt;
  const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
  const bytes = await blob.arrayBuffer();
  const saved = await window.recorder.saveRecording({
    name: sessionName.value || 'Untitled recording',
    durationMs,
    mode: activeMode,
    mimeType: blob.type || 'audio/webm',
    extension: 'webm',
    bytes
  });

  await refreshHistory(saved.id);
  show(saved);
  setStatus('Saved');
}

let isMinimalMode = false;
toggleMode.addEventListener('click', () => {
  isMinimalMode = !isMinimalMode;
  if (isMinimalMode) {
    document.body.classList.add('minimal-mode');
    toggleMode.textContent = 'Panel Mode';
    window.recorder.resizeWindow(400, 320);
  } else {
    document.body.classList.remove('minimal-mode');
    toggleMode.textContent = 'Minimal Mode';
    window.recorder.resizeWindow(860, 560);
  }
});

openFolder.addEventListener('click', async () => {
  try {
    setStatus(`Opened ${await window.recorder.openRecordingsFolder()}`);
  } catch (error) {
    setStatus(error.message);
  }
});

includeSystem.addEventListener('change', updateCaptureMode);
maxQuality.addEventListener('change', updateAiMode);

transcribe.addEventListener('click', async () => {
  if (!selectedRecordingId) return;

  transcribe.disabled = true;
  setTranscriptStatus(maxQuality.checked ? 'Running Deepgram max quality diarization...' : 'Running Deepgram diarization...');
  transcriptOutput.classList.add('empty');
  transcriptOutput.textContent = 'Transcribing...';

  try {
    const result = await window.recorder.transcribeWithDeepgram({
      recordingId: selectedRecordingId,
      maxQuality: maxQuality.checked
    });
    renderTranscript(result.markdown);
    setTranscriptStatus(`Transcript saved (${result.metadata.transcript.quality}).`);
    await refreshHistory(selectedRecordingId);
  } catch (error) {
    transcriptOutput.classList.add('empty');
    transcriptOutput.textContent = error.message;
    setTranscriptStatus('Transcription failed.');
  } finally {
    transcribe.disabled = false;
  }
});

start.addEventListener('click', async () => {
  start.disabled = true;
  stop.disabled = true;
  includeSystem.disabled = true;
  setStatus('Preparing recording permissions');
  activeMode = 'mic';

  try {
    chunks = [];
    const capture = await createCaptureStream();
    const mimeType = preferredMimeType();
    mediaRecorder = new MediaRecorder(capture.stream, mimeType ? { mimeType } : undefined);

    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    mediaRecorder.addEventListener('stop', () => {
      finishRecording().catch((error) => {
        show({ error: error.message });
        setStatus('Save failed');
      }).finally(stopStreams);
    });

    mediaRecorder.start(1000);
    stop.disabled = false;
    document.querySelector('.status-dot').classList.add('recording');
    setStatus(capture.warnings.length > 0 ? capture.warnings.join(' ') : activeMode === 'mic+system' ? 'Recording microphone + system audio' : 'Recording microphone');
    startTimer();
  } catch (error) {
    stopStreams();
    show({ error: error.message });
    start.disabled = false;
    stop.disabled = true;
    includeSystem.disabled = false;
    setStatus(`Recording permission failed: ${error.message}`);
  }
});

stop.addEventListener('click', () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  stop.disabled = true;
  start.disabled = false;
  includeSystem.disabled = false;
  stopTimer();
  document.querySelector('.status-dot').classList.remove('recording');
  setStatus('Saving');
  mediaRecorder.stop();
});

refreshHistory().catch((error) => {
  show({ error: error.message });
});

window.recorder.recordingsRoot().then((root) => {
  storagePath.textContent = root;
}).catch(() => {
  storagePath.textContent = 'Recordings are stored locally.';
});

updateCaptureMode();
updateAiMode();

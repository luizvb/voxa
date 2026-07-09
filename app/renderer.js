const output = document.getElementById('output');
const probe = document.getElementById('probe');
const simulated = document.getElementById('simulated');
const start = document.getElementById('start');
const stop = document.getElementById('stop');
const openFolder = document.getElementById('openFolder');
const includeSystem = document.getElementById('includeSystem');
const sessionName = document.getElementById('sessionName');
const statusText = document.getElementById('status');
const timer = document.getElementById('timer');
const player = document.getElementById('player');
const historyList = document.getElementById('historyList');

let recorder;
let chunks = [];
let streams = [];
let startedAt = 0;
let timerHandle;
let audioContext;

function show(value) {
  output.textContent = JSON.stringify(value, null, 2);
}

function setStatus(value) {
  statusText.textContent = value;
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

async function createCaptureStream() {
  audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true
    }
  });
  streams.push(mic);
  audioContext.createMediaStreamSource(mic).connect(destination);

  if (includeSystem.checked) {
    const system = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: {
        width: 4,
        height: 4,
        frameRate: 1
      }
    });
    streams.push(system);
    if (system.getAudioTracks().length === 0) {
      throw new Error('System audio was not available in the captured stream.');
    }
    audioContext.createMediaStreamSource(system).connect(destination);
  }

  return destination.stream;
}

async function refreshHistory(selectId) {
  const recordings = await window.recorder.listRecordings();
  historyList.innerHTML = '';

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
    item.innerHTML = `
      <strong>${recording.name}</strong>
      <span>${new Date(recording.createdAt).toLocaleString()} · ${formatDuration(recording.durationMs)} · ${recording.mode}</span>
    `;
    item.addEventListener('click', () => {
      player.src = recording.playbackUrl;
      player.play().catch(() => {});
      setStatus(`Playing ${recording.name}`);
    });
    historyList.appendChild(item);

    if (recording.id === selectId) {
      item.click();
    }
  }
}

async function finishRecording() {
  const durationMs = Date.now() - startedAt;
  const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
  const bytes = await blob.arrayBuffer();
  const saved = await window.recorder.saveRecording({
    name: sessionName.value || 'Untitled recording',
    durationMs,
    mode: includeSystem.checked ? 'mic+system' : 'mic',
    mimeType: blob.type || 'audio/webm',
    extension: 'webm',
    bytes
  });

  await refreshHistory(saved.id);
  show(saved);
  setStatus('Saved');
}

probe.addEventListener('click', async () => {
  try {
    show(await window.recorder.probe());
  } catch (error) {
    show({ error: error.message });
  }
});

simulated.addEventListener('click', async () => {
  try {
    const root = await window.recorder.recordingsRoot();
    show(await window.recorder.recordSimulated(`${root}/simulated-${Date.now()}`, 2));
  } catch (error) {
    show({ error: error.message });
  }
});

openFolder.addEventListener('click', async () => {
  try {
    setStatus(`Opened ${await window.recorder.openRecordingsFolder()}`);
  } catch (error) {
    setStatus(error.message);
  }
});

start.addEventListener('click', async () => {
  try {
    chunks = [];
    const stream = await createCaptureStream();
    const mimeType = preferredMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('stop', () => {
      finishRecording().catch((error) => {
        show({ error: error.message });
        setStatus('Save failed');
      }).finally(stopStreams);
    });

    recorder.start(1000);
    start.disabled = true;
    stop.disabled = false;
    includeSystem.disabled = true;
    setStatus(includeSystem.checked ? 'Recording microphone + system audio' : 'Recording microphone');
    startTimer();
  } catch (error) {
    stopStreams();
    show({ error: error.message });
    setStatus('Recording permission failed');
  }
});

stop.addEventListener('click', () => {
  if (!recorder || recorder.state === 'inactive') return;
  stop.disabled = true;
  start.disabled = false;
  includeSystem.disabled = false;
  stopTimer();
  setStatus('Saving');
  recorder.stop();
});

refreshHistory().catch((error) => {
  show({ error: error.message });
});

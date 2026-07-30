export function parseTranscriptTimestamp(value: string): number | null {
  const timestamp = value.trim().split(/\s+(?:-|\u2013|\u2014)\s+/)[0];
  const parts = timestamp.split(':');
  if (parts.length !== 2 && parts.length !== 3) return null;

  const values = parts.map(Number);
  if (values.some((part) => !Number.isFinite(part) || part < 0)) return null;

  const seconds = values[values.length - 1];
  const minutes = values[values.length - 2];
  if (seconds >= 60 || (parts.length === 3 && minutes >= 60)) return null;

  return parts.length === 3
    ? values[0] * 3600 + minutes * 60 + seconds
    : minutes * 60 + seconds;
}

export function findTranscriptSegmentEnd(
  starts: Array<number | null>,
  index: number,
  durationSeconds: number,
): number {
  const currentStart = starts[index];
  if (currentStart === null || currentStart === undefined) return durationSeconds;
  return starts.slice(index + 1).find((value) => value !== null && value > currentStart) ?? durationSeconds;
}

export function safeAudioSegmentName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'voxa-audio';
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function createWavSegment(audio: AudioBuffer, startSeconds: number, endSeconds: number): Blob {
  const startFrame = Math.max(0, Math.min(audio.length, Math.floor(startSeconds * audio.sampleRate)));
  const endFrame = Math.max(startFrame, Math.min(audio.length, Math.ceil(endSeconds * audio.sampleRate)));
  const frameCount = endFrame - startFrame;
  if (frameCount === 0) throw new RangeError('The audio segment is empty.');

  const channelCount = audio.numberOfChannels;
  const bytesPerSample = 2;
  const dataSize = frameCount * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: channelCount }, (_, channel) => audio.getChannelData(channel));
  let offset = 44;
  for (let frame = startFrame; frame < endFrame; frame += 1) {
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

import { useEffect } from 'react';
import { Check, Mic, Pause, Play, Square, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useKeyboardActions } from '../hooks/useKeyboardActions';
import { useRecorder } from '../hooks/useRecorder';
import { useLanguage } from '../contexts/LanguageContext';

function Waveform({ active }: { active: boolean }) {
  const heights = [7, 12, 18, 11, 25, 19, 31, 16, 27, 22, 34, 18, 29, 13, 24, 9];

  return (
    <div className={active ? 'widget-waveform is-active' : 'widget-waveform'} aria-hidden>
      {heights.map((height, index) => (
        <motion.span
          key={index}
          animate={{ height: active ? [5, height, 5] : 5 }}
          transition={active ? { duration: 0.72 + (index % 4) * 0.08, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.15 }}
        />
      ))}
    </div>
  );
}

export default function MiniWidget() {
  const { t } = useLanguage();
  const {
    isRecording,
    isPaused,
    isReviewing,
    reviewBlob,
    formattedTime,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveReview,
    discardReview,
  } = useRecorder();

  const hideWidget = () => window.recorder?.hideWidget?.();
  useKeyboardActions({ onEscape: hideWidget });

  useEffect(() => {
    if (isRecording || isReviewing) return;
    const timeout = window.setTimeout(hideWidget, 3000);
    return () => window.clearTimeout(timeout);
  }, [isRecording, isReviewing]);

  return (
    <div className="mini-widget drag-region">
      <div className="widget-status no-drag">
        <span className={isRecording && !isPaused ? 'widget-dot is-live' : 'widget-dot'} />
        <div className="widget-signal">
          {isReviewing && reviewBlob ? (
            <audio src={reviewBlob.url} controls aria-label={t('widget', 'review')} />
          ) : (
            <Waveform active={isRecording && !isPaused} />
          )}
        </div>
        <time>{formattedTime}</time>
      </div>

      <div className="widget-actions no-drag">
        {!isRecording && !isReviewing ? (
          <button type="button" className="widget-button is-primary" onClick={() => startRecording()} aria-label={t('recorder', 'start')} data-keyboard-primary="true">
            <Mic />
          </button>
        ) : isReviewing ? (
          <>
            <button type="button" className="widget-button" onClick={discardReview} aria-label={t('widget', 'discard')} data-keyboard-cancel="true"><X /></button>
            <button type="button" className="widget-button is-success" onClick={saveReview} aria-label={t('widget', 'save')} data-keyboard-primary="true"><Check /></button>
          </>
        ) : (
          <>
            <button type="button" className="widget-button" onClick={isPaused ? resumeRecording : pauseRecording} aria-label={isPaused ? t('recorder', 'resume') : t('recorder', 'pause')}>
              {isPaused ? <Play /> : <Pause />}
            </button>
            <button type="button" className="widget-button is-danger" onClick={() => stopRecording({ review: true })} aria-label={t('recorder', 'stop')} data-keyboard-primary="true"><Square /></button>
            <button type="button" className="widget-button" onClick={() => stopRecording({ discard: true })} aria-label={t('common', 'cancel')} data-keyboard-cancel="true"><X /></button>
          </>
        )}
      </div>
    </div>
  );
}

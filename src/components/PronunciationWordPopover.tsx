import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import type { PronunciationWord, PronunciationWordLevel } from '../lib/pronunciation-word';

export type PronunciationWordPopoverLabels = {
  details: string;
  score: string;
  error: string;
  weakPhonemes: string;
  listenOriginal: string;
  pauseOriginal: string;
  listenCorrect: string;
  stopCorrect: string;
  originalUnavailable: string;
  correctUnavailable: string;
};

type PronunciationWordPopoverProps = {
  token: string;
  word: PronunciationWord;
  level: Exclude<PronunciationWordLevel, ''>;
  originalAvailable: boolean;
  originalPlaying: boolean;
  correctAvailable: boolean;
  correctPlaying: boolean;
  labels: PronunciationWordPopoverLabels;
  onPlayOriginal: () => void;
  onSpeakCorrect: () => void;
};

export default function PronunciationWordPopover({
  token,
  word,
  level,
  originalAvailable,
  originalPlaying,
  correctAvailable,
  correctPlaying,
  labels,
  onPlayOriginal,
  onSpeakCorrect,
}: PronunciationWordPopoverProps) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const keyboardOpenRef = useRef(false);
  const contentId = useId();
  const weakPhonemes = word.phonemes.filter(
    (phoneme) => phoneme.accuracyScore !== null && phoneme.accuracyScore < 80,
  );

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement !== triggerRef.current && !contentRef.current?.contains(activeElement)) {
        setOpen(false);
      }
    }, 140);
  };

  useEffect(() => () => cancelScheduledClose(), []);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <button
          ref={triggerRef}
          type="button"
          className={`pronunciation-word ${level}`}
          aria-expanded={open}
          aria-controls={contentId}
          aria-haspopup="dialog"
          aria-label={`${labels.details}: ${word.word}, ${labels.score} ${word.accuracyScore === null ? '-' : Math.round(word.accuracyScore)}`}
          onMouseEnter={() => {
            keyboardOpenRef.current = false;
            cancelScheduledClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          onFocus={(event) => {
            keyboardOpenRef.current = event.currentTarget.matches(':focus-visible');
            cancelScheduledClose();
            setOpen(true);
          }}
          onClick={() => {
            keyboardOpenRef.current = false;
            cancelScheduledClose();
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
              keyboardOpenRef.current = true;
              setOpen(true);
            }
          }}
        >
          {token}
        </button>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          ref={contentRef}
          id={contentId}
          className="pronunciation-word-popover"
          side="top"
          sideOffset={8}
          collisionPadding={12}
          avoidCollisions
          aria-label={`${labels.details}: ${word.word}`}
          onMouseEnter={cancelScheduledClose}
          onMouseLeave={scheduleClose}
          onOpenAutoFocus={(event) => {
            if (!keyboardOpenRef.current) event.preventDefault();
          }}
          onEscapeKeyDown={() => {
            setOpen(false);
            window.requestAnimationFrame(() => triggerRef.current?.focus());
          }}
        >
          <div className="pronunciation-word-popover-heading">
            <strong>{word.word}</strong>
            <span className={`pronunciation-word-score ${level}`}>
              {word.accuracyScore === null ? '-' : `${Math.round(word.accuracyScore)}/100`}
            </span>
          </div>
          {word.errorType !== 'None' && (
            <p><b>{labels.error}:</b> {word.errorType}</p>
          )}
          {weakPhonemes.length > 0 && (
            <p>
              <b>{labels.weakPhonemes}:</b>{' '}
              {weakPhonemes.map((phoneme) => (
                <span key={`${phoneme.phoneme}-${phoneme.accuracyScore}`}>
                  /{phoneme.phoneme}/ {Math.round(phoneme.accuracyScore || 0)}
                </span>
              )).reduce<ReactNode[]>((items, item, index) => (
                index ? [...items, ', ', item] : [item]
              ), [])}
            </p>
          )}
          <div className="pronunciation-word-actions">
            <button
              type="button"
              onClick={onPlayOriginal}
              disabled={!originalAvailable}
              aria-pressed={originalPlaying}
              title={originalAvailable ? undefined : labels.originalUnavailable}
            >
              {originalPlaying ? <Pause /> : <Play />}
              <span>{originalPlaying ? labels.pauseOriginal : labels.listenOriginal}</span>
            </button>
            <button
              type="button"
              onClick={onSpeakCorrect}
              disabled={!correctAvailable}
              aria-pressed={correctPlaying}
              title={correctAvailable ? undefined : labels.correctUnavailable}
            >
              {correctPlaying ? <Square /> : <Volume2 />}
              <span>{correctPlaying ? labels.stopCorrect : labels.listenCorrect}</span>
            </button>
          </div>
          {!originalAvailable && <small>{labels.originalUnavailable}</small>}
          {!correctAvailable && <small>{labels.correctUnavailable}</small>}
          <Popover.Arrow className="pronunciation-word-popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileAudio, Loader2, UploadCloud, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { platform, type Recording } from '../platform';

interface AudioImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (recording: Recording) => void;
}

export default function AudioImportDialog({ open, onClose, onImported }: AudioImportDialogProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (open) return;
    setFile(null);
    setTitle('');
    setStatus('');
    setIsImporting(false);
  }, [open]);

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    setStatus('');
    if (nextFile && !title.trim()) setTitle(nextFile.name.replace(/\.webm$/i, ''));
  };

  const handleImport = async () => {
    if (!file || !title.trim()) return;
    setIsImporting(true);
    setStatus(t('history', 'protectingAudio'));
    try {
      const recording = await platform.importRecording({ name: title.trim(), file });
      onImported(recording);
      onClose();
    } catch (error: any) {
      setStatus(`${error?.message || t('history', 'importAudioFailed')} ${t('history', 'importAudioRecoveryHint')}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section
            className="import-dialog audio-import-dialog"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-audio-title"
            aria-busy={isImporting}
          >
            <button type="button" className="icon-button confirm-close" onClick={onClose} disabled={isImporting} aria-label={t('common', 'close')}><X /></button>
            <span className="import-icon"><FileAudio /></span>
            <h3 id="import-audio-title">{t('history', 'importAudioTitle')}</h3>
            <p>{t('history', 'importAudioDescription')}</p>
            <label>
              <span>{t('history', 'audioFile')}</span>
              <input
                className="audio-file-input"
                type="file"
                accept=".webm,audio/webm,video/webm"
                onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                disabled={isImporting}
                autoFocus
              />
            </label>
            {file && <div className="selected-audio-file"><FileAudio /><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></span></div>}
            <label>
              <span>{t('history', 'conversationTitle')}</span>
              <input value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} placeholder={t('history', 'conversationTitlePlaceholder')} disabled={isImporting} />
            </label>
            {status && <p className={isImporting ? 'form-status' : 'form-error'} role={isImporting ? 'status' : 'alert'} aria-live="polite">{status}</p>}
            <div className="confirm-actions">
              <button type="button" className="button button-secondary" onClick={onClose} disabled={isImporting}>{t('common', 'cancel')}</button>
              <button type="button" className="button button-primary" onClick={handleImport} disabled={isImporting || !file || !title.trim()}>
                {isImporting ? <Loader2 className="spin" /> : <UploadCloud />}
                {isImporting ? t('history', 'importingAudio') : t('history', 'importAudioAction')}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

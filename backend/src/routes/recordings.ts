import express from 'express';
import multer from 'multer';
import {
  analyzeRecording,
  assessSegmentPronunciation,
  createRecordingUploadToken,
  deleteRecording,
  getAnalysis,
  getAnalysisById,
  getTranscript,
  getRecordingStatus,
  importTranscript,
  listAnalyses,
  streamRecording,
  listRecordings,
  transcribeRecording,
  uploadRecording
} from '../controllers/recordings';
import { requireVoxaPro } from '../billing/entitlement';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});
const router = express.Router();

router.post('/upload', createRecordingUploadToken);
router.post('/import-transcript', importTranscript);
router.post('/', upload.single('audio'), uploadRecording);
router.get('/', listRecordings);
router.post('/:id/transcribe', requireVoxaPro, transcribeRecording);
router.get('/:id/status', getRecordingStatus);
router.get('/:id/media', streamRecording);
router.post('/:id/analyze', requireVoxaPro, analyzeRecording);
router.get('/:id/transcript', getTranscript);
router.post('/:id/transcript/segments/:segmentId/pronunciation', requireVoxaPro, upload.single('audio'), assessSegmentPronunciation);
router.get('/:id/analyses', listAnalyses);
router.get('/:id/analyses/:analysisId', getAnalysisById);
router.get('/:id/analysis', getAnalysis);
router.delete('/:id', deleteRecording);

export default router;

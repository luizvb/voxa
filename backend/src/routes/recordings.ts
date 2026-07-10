import express from 'express';
import multer from 'multer';
import {
  analyzeRecording,
  createRecordingUploadToken,
  deleteRecording,
  getAnalysis,
  getTranscript,
  listRecordings,
  transcribeRecording,
  uploadRecording
} from '../controllers/recordings';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});
const router = express.Router();

router.post('/upload', createRecordingUploadToken);
router.post('/', upload.single('audio'), uploadRecording);
router.get('/', listRecordings);
router.post('/:id/transcribe', transcribeRecording);
router.post('/:id/analyze', analyzeRecording);
router.get('/:id/transcript', getTranscript);
router.get('/:id/analysis', getAnalysis);
router.delete('/:id', deleteRecording);

export default router;

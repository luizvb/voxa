import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadRecording, listRecordings, transcribeRecording, analyzeRecording } from '../controllers/recordings';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext)
  }
});

const upload = multer({ storage: storage });
const router = express.Router();

router.post('/', upload.single('audio'), uploadRecording);
router.get('/', listRecordings);
router.post('/:id/transcribe', transcribeRecording);
router.post('/:id/analyze', analyzeRecording);

export default router;

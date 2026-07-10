import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import recordingsRouter from './routes/recordings';

const app = express();
const PORT = process.env.PORT || 3000;

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  req.user = { id: (req.headers['x-user-id'] as string) || 'local-user' };
  next();
});

app.use('/api/recordings', recordingsRouter);

app.listen(PORT, () => {
  console.log(`Voxa API running on port ${PORT}`);
});

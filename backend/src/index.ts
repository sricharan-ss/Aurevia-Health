import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import patientRoutes from './routes/patients';
import consultationRoutes from './routes/consultations';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' })); // Be explicit for hackathon

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

import fs from 'fs';
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/consultation', consultationRoutes);

app.get('/', (req, res) => {
    res.send('Aurevia Health Backend is running.');
});

const server = app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

// WebSocket Setup
import { WebSocketServer } from 'ws';
import { handleLiveStream } from './ai-engine/deepgramLive';

const wss = new WebSocketServer({ server, path: '/api/consultation/live' });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection established for live consultation');
    handleLiveStream(ws);
});

import express from 'express';
import cors from 'cors';
import { createServer as createHttpServer, type Server } from 'http';
import { WebSocketServer } from 'ws';
import patientRoutes from './routes/patients';
import consultationRoutes from './routes/consultations';
import { appConfig, type AppConfig, warnForMissingProviderKeys } from './config';
import { sendApiError } from './http/errors';
import { DeepgramService, LiveSessionManager, type UpstreamFactory } from './ai-engine/deepgramLive';
import { openDb, type AppDatabase } from './db';
import { getConsultation, isValidConsultationId, recoverConsultations } from './db/consultations';
import { groqEngine } from './ai-engine/groqEngine';
import type { ConsultationEngine } from './controllers/consultationController';

export interface ServerOptions { engine?: ConsultationEngine; upstreamFactory?: UpstreamFactory; }

export function createApp(config: AppConfig = appConfig, db: AppDatabase = openDb(':memory:'), engine: ConsultationEngine = groqEngine, liveSessions = new LiveSessionManager()) {
    const app = express();

    app.use(express.static('public'));

    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.use(cors({
        origin(origin, callback) {
            callback(null, !origin || config.frontendOrigins.includes(origin));
        }
    }));

    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });

    app.use('/api/patients', patientRoutes(db));
    app.use('/api/consultation', consultationRoutes(db, engine, liveSessions));

    app.get('/', (_req, res) => {
        res.send('Aurevia Health Backend is running.');
    });

    app.use((err: { status?: number; statusCode?: number }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (res.headersSent) return next(err);
        const status = err.statusCode ?? err.status ?? 500;
        if (status === 413) return sendApiError(res, 413, 'VALIDATION_ERROR', 'Request body exceeds the 1 MB limit.');
        return sendApiError(res, status, 'INTERNAL', 'Request could not be completed.');
    });

    return app;
}

export function createApplicationServer(config: AppConfig = appConfig, db: AppDatabase = openDb(), options: ServerOptions = {}) {
    const liveSessions = new LiveSessionManager();
    const app = createApp(config, db, options.engine ?? groqEngine, liveSessions);
    const server = createHttpServer(app);
    const deepgram = new DeepgramService(config, options.upstreamFactory);
    const recovered = recoverConsultations(db);
    if (recovered > 0) console.log(`[Consultation] Recovered ${recovered} unfinished consultation(s).`);
    const webSocketServer = new WebSocketServer({
        server,
        path: '/api/consultation/live',
        verifyClient: (info, callback) => {
            const origin = info.origin;
            if (origin && !config.frontendOrigins.includes(origin)) {
                callback(false, 403, 'Forbidden Origin');
                return;
            }
            callback(true);
        }
    });
    server.on('close', () => { if (db.open) db.close(); });

    webSocketServer.on('connection', (ws, request) => {
        console.log('New WebSocket connection established for live consultation');
        const consultationId = new URL(request.url ?? '/', 'http://localhost').searchParams.get('consultationId');
        const closeInvalid = (code: number, message: string) => {
            ws.send(JSON.stringify({ type: 'error', message }));
            ws.close(code, message);
        };
        if (!consultationId || !isValidConsultationId(consultationId)) return closeInvalid(4400, 'A valid consultationId is required.');
        const consultation = getConsultation(db, consultationId);
        if (!consultation) return closeInvalid(4404, 'Consultation not found.');
        if (consultation.status !== 'active') return closeInvalid(4409, 'Consultation is not active.');
        void deepgram.handleLiveStream(ws, consultationId, db, liveSessions);
    });

    return { app, server, webSocketServer, liveSessions };
}

export function startServer(): Server {
    warnForMissingProviderKeys(appConfig);
    const { server } = createApplicationServer(appConfig);
    server.listen(appConfig.port, () => console.log(`Server is listening on port ${appConfig.port}`));
    return server;
}

if (require.main === module) startServer();

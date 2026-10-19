import express from 'express';
import cors from 'cors';
import { createServer as createHttpServer, type Server } from 'http';
import { WebSocketServer } from 'ws';
import patientRoutes from './routes/patients';
import consultationRoutes from './routes/consultations';
import { appConfig, type AppConfig, warnForMissingProviderKeys } from './config';
import { sendApiError } from './http/errors';
import { handleLiveStream } from './ai-engine/deepgramLive';

export function createApp(config: AppConfig = appConfig) {
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

    app.use('/api/patients', patientRoutes);
    app.use('/api/consultation', consultationRoutes);

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

export function createApplicationServer(config: AppConfig = appConfig): { app: ReturnType<typeof createApp>; server: Server; webSocketServer: WebSocketServer } {
    const app = createApp(config);
    const server = createHttpServer(app);
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

    webSocketServer.on('connection', ws => {
        console.log('New WebSocket connection established for live consultation');
        handleLiveStream(ws);
    });

    return { app, server, webSocketServer };
}

export function startServer(): Server {
    warnForMissingProviderKeys(appConfig);
    const { server } = createApplicationServer(appConfig);
    server.listen(appConfig.port, () => console.log(`Server is listening on port ${appConfig.port}`));
    return server;
}

if (require.main === module) startServer();

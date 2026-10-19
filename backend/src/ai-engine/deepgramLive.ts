import WebSocket from 'ws';
import { appConfig, type AppConfig } from '../config';
import type { AppDatabase } from '../db';
import { appendTranscriptSegment } from '../db/consultations';

export type UpstreamFactory = (url: string, options: WebSocket.ClientOptions) => WebSocket;
interface Session { upstream: WebSocket; closed: Promise<void>; closeStream: () => void; }

export class LiveSessionManager {
    private readonly sessions = new Map<string, Session>();

    get(id: string): Session | undefined { return this.sessions.get(id); }
    set(id: string, session: Session): void { this.sessions.set(id, session); }
    remove(id: string, session: Session): void { if (this.sessions.get(id) === session) this.sessions.delete(id); }

    async closeAndWait(id: string, timeoutMs = 5000): Promise<boolean> {
        const session = this.sessions.get(id);
        if (!session) return true;
        session.closeStream();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timedOut = await Promise.race([
            session.closed.then(() => false),
            new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(true), timeoutMs); })
        ]);
        if (timer) clearTimeout(timer);
        if (timedOut) session.upstream.terminate();
        return !timedOut;
    }
}

export class DeepgramService {
    constructor(private readonly config: AppConfig = appConfig, private readonly upstreamFactory: UpstreamFactory = (url, options) => new WebSocket(url, options)) {}

    async handleLiveStream(clientWs: WebSocket, consultationId: string, db: AppDatabase, sessions: LiveSessionManager): Promise<void> {
        console.log('[Deepgram] Received client connection request');
        await sessions.closeAndWait(consultationId, 5000);
        const apiKey = this.config.deepgramApiKey;
        if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
            clientWs.send(JSON.stringify({ type: 'transcript', chunk: { speaker: 'doctor', text: '[MOCK MODE] Please provide a valid Deepgram key for live STT.' } }));
            return;
        }

        const url = 'wss://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&smart_format=true&interim_results=false&endpointing=300';
        const upstream = this.upstreamFactory(url, { headers: { Authorization: `Token ${apiKey}` } });
        let resolveClosed!: () => void;
        const closed = new Promise<void>(resolve => { resolveClosed = resolve; });
        const session: Session = {
            upstream, closed,
            closeStream: () => {
                if (upstream.readyState === WebSocket.OPEN) upstream.send(JSON.stringify({ type: 'CloseStream' }));
            }
        };
        sessions.set(consultationId, session);
        let speakerMap: Record<number, 'doctor' | 'patient'> = {};
        let firstSpeakerDetected = false;
        const audioBuffer: Buffer[] = [];

        upstream.on('open', () => {
            console.log('[Deepgram] Connected to live transcription provider');
            while (audioBuffer.length && upstream.readyState === WebSocket.OPEN) upstream.send(audioBuffer.shift()!);
        });
        upstream.on('message', message => {
            try {
                const response = JSON.parse(message.toString()) as { is_final?: boolean; channel?: { alternatives?: Array<{ transcript?: string; words?: Array<{ speaker?: number }> }> } };
                const alternative = response.channel?.alternatives?.[0];
                const transcript = alternative?.transcript;
                const words = alternative?.words ?? [];
                if (!response.is_final || !transcript?.trim() || words.length === 0) return;
                const speakerId = words[0].speaker ?? 0;
                if (!firstSpeakerDetected) { speakerMap[speakerId] = 'doctor'; firstSpeakerDetected = true; }
                else if (!(speakerId in speakerMap)) speakerMap[speakerId] = 'patient';
                const speaker = speakerMap[speakerId] ?? 'patient';
                const seq = appendTranscriptSegment(db, consultationId, speaker, transcript, 'speech');
                if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'transcript', chunk: { speaker, text: transcript }, seq }));
            } catch { console.error('[Deepgram] Failed to parse upstream message.'); }
        });
        upstream.on('error', () => {
            console.error('Deepgram WebSocket connection failed.');
            if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'error', message: 'Deepgram connection failed' }));
        });
        upstream.on('close', code => {
            console.log(`[Deepgram] Connection closed. Code: ${code}`);
            sessions.remove(consultationId, session);
            resolveClosed();
            if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
        });
        clientWs.on('message', data => {
            if (Buffer.isBuffer(data)) {
                if (upstream.readyState === WebSocket.OPEN) upstream.send(data);
                else if (upstream.readyState === WebSocket.CONNECTING) audioBuffer.push(data);
            }
        });
        clientWs.on('close', () => { session.closeStream(); audioBuffer.length = 0; });
    }
}

export const deepgramService = new DeepgramService();
export const handleLiveStream = (ws: WebSocket) => {
    ws.close(1011, 'Consultation session is required.');
};

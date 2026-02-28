import WebSocket from 'ws';
import { TranscriptChunk } from '../types';

export class DeepgramService {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.DEEPGRAM_API_KEY;
    }

    private getMockTranscript(role: "doctor" | "patient"): TranscriptChunk[] {
        return [
            { speaker: role, text: "Consultation is currently in mock mode because Deepgram API Key is missing." }
        ];
    }

    /**
     * Handles a live WebSocket stream from the frontend
     * Proxies it to Deepgram and manages speaker mapping
     */
    public handleLiveStream(clientWs: WebSocket) {
        console.log("[Deepgram] Received client connection request");
        const isRealKey = this.apiKey && this.apiKey !== 'YOUR_KEY_HERE';

        if (!isRealKey) {
            console.warn("Deepgram API Key missing or invalid. Falling back to mock.");
            // Send a mock message initially
            clientWs.send(JSON.stringify({
                type: 'transcript',
                chunk: { speaker: 'doctor', text: '[MOCK MODE] Please provide a valid Deepgram key for live STT.' }
            }));
            return;
        }

        // Added endpointing, utterance_end_ms, and interim_results to give context parsing time.
        const deepgramUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&diarize=true&punctuate=true&smart_format=true&interim_results=false&endpointing=300';
        const deepgramWs = new WebSocket(deepgramUrl, {
            headers: {
                Authorization: `Token ${this.apiKey}`
            }
        });

        // Speaker mapping state
        let speakerMap: Record<number, "doctor" | "patient"> = {};
        let firstSpeakerDetected = false;
        let audioBuffer: Buffer[] = [];

        deepgramWs.on('open', () => {
            console.log('[Deepgram] Connected to Deepgram Live API');
            // Flush buffered audio
            if (audioBuffer.length > 0) {
                console.log(`[Deepgram] Flushing ${audioBuffer.length} buffered chunks`);
                while (audioBuffer.length > 0) {
                    const chunk = audioBuffer.shift();
                    if (chunk) deepgramWs.send(chunk);
                }
            }
        });

        deepgramWs.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());

                // Only process final (non-interim) endpointed utterances
                if (response.is_final && response.channel && response.channel.alternatives[0].transcript) {
                    const transcript = response.channel.alternatives[0].transcript;
                    const words = response.channel.alternatives[0].words || [];

                    if (words.length > 0 && transcript.trim().length > 0) {
                        // Diarization logic: The first person to speak is the Doctor (Speaker 0 mapping)
                        const rawSpeakerId = words[0].speaker || 0;

                        if (!firstSpeakerDetected) {
                            speakerMap[rawSpeakerId] = "doctor";
                            firstSpeakerDetected = true;
                            console.log(`[Deepgram Diarization] Assigned Speaker ${rawSpeakerId} as DOCTOR`);
                        } else if (!(rawSpeakerId in speakerMap)) {
                            speakerMap[rawSpeakerId] = "patient";
                            console.log(`[Deepgram Diarization] Assigned Speaker ${rawSpeakerId} as PATIENT`);
                        }

                        const mappedRole = speakerMap[rawSpeakerId] || "patient";

                        console.log(`[Deepgram] Transcript received: [${mappedRole}] ${transcript}`);

                        clientWs.send(JSON.stringify({
                            type: 'transcript',
                            chunk: {
                                speaker: mappedRole,
                                text: transcript
                            }
                        }));
                    }
                }
            } catch (err) {
                console.error("[Deepgram] Error parsing Deepgram message:", err);
            }
        });

        deepgramWs.on('error', (err) => {
            console.error("Deepgram WebSocket Error:", err);
            clientWs.send(JSON.stringify({ type: 'error', message: 'Deepgram connection failed' }));
        });

        deepgramWs.on('close', (code, reason) => {
            console.log(`[Deepgram] Connection closed. Code: ${code}, Reason: ${reason}`);
            clientWs.close();
        });

        // Backend proxy: Frontend -> Backend -> Deepgram
        clientWs.on('message', (message) => {
            if (Buffer.isBuffer(message)) {
                if (deepgramWs.readyState === WebSocket.OPEN) {
                    deepgramWs.send(message);
                } else if (deepgramWs.readyState === WebSocket.CONNECTING) {
                    // Buffer audio until deepgram is ready
                    audioBuffer.push(message);
                    if (audioBuffer.length % 10 === 0) {
                        console.log(`[Deepgram] Buffering audio... (${audioBuffer.length} chunks)`);
                    }
                } else {
                    console.warn(`[Deepgram] Received audio but Deepgram WS state is ${deepgramWs.readyState}`);
                }
            } else {
                console.log(`[Deepgram] Received non-binary message from client: ${message.toString()}`);
            }
        });

        clientWs.on('close', () => {
            console.log("Client WebSocket closed");
            if (deepgramWs.readyState === WebSocket.OPEN) {
                deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
                deepgramWs.close();
            }
            audioBuffer = [];
        });
    }

    // Keep the old method for backward compatibility if needed, but we'll focus on the new stream handler
    async transcribeLive(audioBuffer: Buffer): Promise<TranscriptChunk[]> {
        // ... (legacy implementation)
        return [];
    }
}

export const deepgramService = new DeepgramService();

// Exported wrapper for the WebSocket server
export const handleLiveStream = (ws: WebSocket) => {
    deepgramService.handleLiveStream(ws);
};

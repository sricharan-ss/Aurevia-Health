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

        const deepgramUrl = 'wss://api.deepgram.com/v1/listen?diarize=true&punctuate=true&smart_format=true';
        const deepgramWs = new WebSocket(deepgramUrl, {
            headers: {
                Authorization: `Token ${this.apiKey}`
            }
        });

        // Speaker mapping state
        let speakerMap: Record<number, "doctor" | "patient"> = {};
        let firstSpeakerDetected = false;

        deepgramWs.on('open', () => {
            console.log('Connected to Deepgram Live API');
        });

        deepgramWs.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.channel && response.channel.alternatives[0].transcript) {
                    const transcript = response.channel.alternatives[0].transcript;
                    const words = response.channel.alternatives[0].words || [];

                    if (words.length > 0) {
                        // Diarization logic: The first person to speak is the Doctor (Speaker 0 mapping)
                        const rawSpeakerId = words[0].speaker || 0;

                        if (!firstSpeakerDetected) {
                            speakerMap[rawSpeakerId] = "doctor";
                            firstSpeakerDetected = true;
                        } else if (!(rawSpeakerId in speakerMap)) {
                            speakerMap[rawSpeakerId] = "patient";
                        }

                        const mappedRole = speakerMap[rawSpeakerId] || "patient";

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
                console.error("Error parsing Deepgram message:", err);
            }
        });

        deepgramWs.on('error', (err) => {
            console.error("Deepgram WebSocket Error:", err);
            clientWs.send(JSON.stringify({ type: 'error', message: 'Deepgram connection failed' }));
        });

        deepgramWs.on('close', () => {
            console.log("Deepgram connection closed");
            clientWs.close();
        });

        // Backend proxy: Frontend -> Backend -> Deepgram
        clientWs.on('message', (message) => {
            if (deepgramWs.readyState === WebSocket.OPEN) {
                deepgramWs.send(message);
            }
        });

        clientWs.on('close', () => {
            console.log("Client WebSocket closed");
            if (deepgramWs.readyState === WebSocket.OPEN) {
                deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
                deepgramWs.close();
            }
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

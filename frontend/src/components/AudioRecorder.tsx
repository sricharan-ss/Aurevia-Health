"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { apiUrl, wsUrl } from "@/lib/config";
import type { ConsultationInsights } from "@/types/clinical";

interface TranscriptChunk { speaker: "doctor" | "patient"; text: string; }
interface AudioRecorderProps {
    consultationId: string;
    onTranscriptChunk: (chunk: TranscriptChunk) => void;
    onProcessingComplete: (data: ConsultationInsights) => void;
}
export interface AudioRecorderHandle { stopRecording: () => Promise<void>; }

const AudioRecorder = forwardRef<AudioRecorderHandle, AudioRecorderProps>(function AudioRecorder({ consultationId, onTranscriptChunk, onProcessingComplete }, ref) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [socketError, setSocketError] = useState("");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const chunkBufferRef = useRef<TranscriptChunk[]>([]);
    const aiThrottleRef = useRef<number>(0);

    const stopRecording = async () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            await new Promise<void>(resolve => {
                recorder.addEventListener('stop', () => resolve(), { once: true });
                recorder.stop();
            });
            recorder.stream.getTracks().forEach(track => track.stop());
        }
        const socket = socketRef.current;
        if (socket && socket.readyState < WebSocket.CLOSING) {
            await new Promise<void>(resolve => {
                const timeout = window.setTimeout(resolve, 1000);
                socket.addEventListener('close', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
                socket.close();
            });
        }
        setIsRecording(false);
    };
    useImperativeHandle(ref, () => ({ stopRecording }));

    const triggerAIProcessing = async () => {
        const now = Date.now();
        if (!chunkBufferRef.current.length || now - aiThrottleRef.current < 30000) return;
        setIsProcessing(true);
        aiThrottleRef.current = now;
        chunkBufferRef.current = [];
        try {
            const response = await fetch(apiUrl('/api/consultation/process'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultationId })
            });
            if (!response.ok) throw new Error('Live analysis could not be refreshed.');
            const data = await response.json() as ConsultationInsights;
            onProcessingComplete(data);
        } catch { setSocketError('Live analysis could not be refreshed.'); }
        finally { setIsProcessing(false); }
    };

    const startRecording = async () => {
        setSocketError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            const socket = new WebSocket(wsUrl('/api/consultation/live', { consultationId }));
            socketRef.current = socket;
            socket.onopen = () => setIsRecording(true);
            socket.onmessage = event => {
                const data = JSON.parse(event.data) as { type: string; chunk?: TranscriptChunk; message?: string };
                if (data.type === 'error') { setSocketError(data.message || 'Live transcription failed.'); return; }
                if (data.type === 'transcript' && data.chunk) {
                    onTranscriptChunk(data.chunk);
                    chunkBufferRef.current.push(data.chunk);
                    void triggerAIProcessing();
                }
            };
            socket.onerror = () => setSocketError('The live transcription connection failed.');
            socket.onclose = event => {
                if (event.code >= 4400) setSocketError(event.reason || 'This consultation is no longer active.');
                setIsRecording(false);
            };
            mediaRecorder.ondataavailable = event => { if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(event.data); };
            mediaRecorder.start(500);
        } catch {
            setSocketError('Microphone access is required for ambient transcription.');
        }
    };

    return (
        <div className="flex items-center gap-3">
            {!isRecording ? (
                <button onClick={() => void startRecording()} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium cursor-pointer">
                    <Mic className="w-3.5 h-3.5" /> Connect Ambient Mic
                </button>
            ) : (
                <button onClick={() => void stopRecording()} className="flex items-center gap-2 px-3 py-1.5 bg-alert text-white rounded-lg hover:bg-alert/90 animate-pulse transition-colors text-xs font-medium cursor-pointer">
                    <Square className="w-3.5 h-3.5 fill-current" /> Disconnect Mic
                </button>
            )}
            {(isRecording || isProcessing) && (
                <span className="text-[10px] text-alert font-bold tracking-tight animate-pulse uppercase flex items-center gap-2">
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isProcessing ? "AI is analyzing the conversation..." : "Ambient Listening..."}
                </span>
            )}
            {socketError && <span className="text-[10px] text-alert" role="status">{socketError}</span>}
        </div>
    );
});

export default AudioRecorder;

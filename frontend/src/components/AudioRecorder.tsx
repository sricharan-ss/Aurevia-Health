"use client";

import React, { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

interface TranscriptChunk {
    speaker: "doctor" | "patient";
    text: string;
}

interface AudioRecorderProps {
    patientId: string;
    role: "doctor" | "patient";
    onTranscriptChunk: (chunk: { speaker: "doctor" | "patient", text: string }) => void;
    onProcessingComplete: (data: any) => void;
}

export default function AudioRecorder({ patientId, role, onTranscriptChunk, onProcessingComplete }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            // Open WebSocket to Backend
            const socket = new WebSocket('ws://localhost:3001/api/consultation/live');
            socketRef.current = socket;

            socket.onopen = () => {
                console.log("WebSocket stream opened");
                setIsRecording(true);
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'transcript') {
                    const chunk = data.chunk;
                    // Live UI Update
                    onTranscriptChunk(chunk);
                    // AI Intelligence Feed
                    triggerAIProcessing(chunk);
                }
            };

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                    socket.send(e.data);
                }
            };

            // Stream in 500ms chunks for real-time feel
            mediaRecorder.start(500);
        } catch (err) {
            console.error("Mic access or WS failed:", err);
            alert("Mic access is required for Ambient Clinical Copilot.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (socketRef.current) {
            socketRef.current.close();
        }
        setIsRecording(false);
    };

    const triggerAIProcessing = async (chunk: TranscriptChunk) => {
        setIsProcessing(true);
        try {
            const res = await fetch("http://localhost:3001/api/consultation/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId,
                    speaker: chunk.speaker,
                    text: chunk.text,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                onProcessingComplete(data);
            }
        } catch (err) {
            console.error("AI intelligence pipeline failed:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {!isRecording ? (
                <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium cursor-pointer"
                >
                    <Mic className="w-3.5 h-3.5" />
                    Connect Ambient Mic
                </button>
            ) : (
                <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-3 py-1.5 bg-alert text-white rounded-lg hover:bg-alert/90 animate-pulse transition-colors text-xs font-medium cursor-pointer"
                >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Disconnect Mic
                </button>
            )}
            {(isRecording || isProcessing) && (
                <span className="text-[10px] text-alert font-bold tracking-tight animate-pulse uppercase flex items-center gap-2">
                    {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isProcessing ? "Gemini Reasoning..." : "Ambient Listening..."}
                </span>
            )}
        </div>
    );
}

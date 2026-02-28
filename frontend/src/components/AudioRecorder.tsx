"use client";

import React, { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

interface TranscriptChunk {
    speaker: "doctor" | "patient";
    text: string;
}

export default function AudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = handleStopRecording;

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Failed to acquire microphone access", err);
            alert("Microphone access is required to use this feature.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleStopRecording = async () => {
        // 1. Convert chunks to Blob
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        // Stop all audio tracks from the microphone
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        // 2. Wrap blob in FormData
        const formData = new FormData();
        formData.append("audio", audioBlob, "consultation.webm");

        setIsProcessing(true);

        try {
            // 3. Send audio to `/api/consultation/transcribe`
            const transcribeRes = await fetch("http://localhost:3001/api/consultation/transcribe", {
                method: "POST",
                body: formData,
            });

            if (!transcribeRes.ok) {
                throw new Error("Failed to transcribe audio.");
            }

            const { transcript, error } = await transcribeRes.json();

            if (error || !transcript) {
                throw new Error(error || "No transcript returned.");
            }

            // 4. Iterate over chunks and send to `/api/consultation/process`
            for (const chunk of transcript as TranscriptChunk[]) {
                const processRes = await fetch("http://localhost:3001/api/consultation/process", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        patientId: "pat_001", // Hardcoded mock patient for demo
                        speaker: chunk.speaker,
                        text: chunk.text,
                    }),
                });

                if (!processRes.ok) {
                    console.error("Failed to process chunk:", chunk);
                }
            }

            // Notify the frontend to refresh the SOAP notes (if you had a global state block here)
            // For this demo, we simply finish processing.

        } catch (err) {
            console.error("Audio processing pipeline failed:", err);
            alert("Error processing audio. See console for details.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-slate-50 border-slate-200">
            <div className="flex items-center space-x-4">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        disabled={isProcessing}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                        <span>{isProcessing ? "Processing..." : "Start Recording"}</span>
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 animate-pulse"
                    >
                        <Square className="w-5 h-5 fill-current" />
                        <span>Stop Recording</span>
                    </button>
                )}
            </div>
            {isRecording && (
                <p className="mt-3 text-sm text-red-500 font-medium animate-pulse">
                    Recording live consultation...
                </p>
            )}
        </div>
    );
}

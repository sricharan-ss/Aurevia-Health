"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { User, Clock, Radio, Square, Send, Loader2 } from "lucide-react";
import { patients } from "@/data/mockData";
import type { Patient, AlertData, TranscriptMessage, SOAPData } from "@/types/clinical";
import TranscriptPanel from "./TranscriptPanel";
import CopilotPanel from "./CopilotPanel";
import ExplainabilityModal from "./ExplainabilityModal";
import AudioRecorder from "./AudioRecorder";
import SOAPPanel from "./SOAPPanel";
import PatientSummaryPanel from "./PatientSummary";

function getPatientById(id: string): Patient | undefined {
    return patients.find((p) => p.id === id);
}



export default function LiveConsultationLayout() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const patientId = searchParams.get("patientId") || patients[0].id;
    const patient = getPatientById(patientId) || patients[0];

    const [elapsed, setElapsed] = useState(0);
    const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [soap, setSoap] = useState<any>(null);
    const [summary, setSummary] = useState<string>("");
    const [dummyMessage, setDummyMessage] = useState("");
    const [speaker, setSpeaker] = useState<"doctor" | "patient">("patient");
    const [isThinking, setIsThinking] = useState(false);

    // Initialize consultation on backend
    useEffect(() => {
        // Clear old summary state to prevent data bleed
        sessionStorage.removeItem(`session_${patientId}`);

        fetch("http://localhost:3001/api/consultation/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientId }),
        }).catch(err => console.error("Failed to start consultation:", err));
    }, [patientId]);

    useEffect(() => {
        const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const handleTranscriptChunk = (chunk: { speaker: "doctor" | "patient", text: string }) => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        setTranscript(prev => [...prev, { role: chunk.speaker, text: chunk.text, timestamp }]);
    };

    const handleEndConsultation = async () => {
        setIsThinking(true);
        try {
            const res = await fetch("http://localhost:3001/api/consultation/end", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patientId }),
            });

            if (res.ok) {
                const finalData = await res.json();

                // Persist session data for the summary page
                const sessionData = {
                    transcript,
                    alerts,
                    soap: finalData.soap,
                    summary: finalData.aiSummary.narrative,
                    medications: finalData.aiSummary.medications,
                    warnings: finalData.aiSummary.warnings
                };
                sessionStorage.setItem(`session_${patientId}`, JSON.stringify(sessionData));
                router.push(`/consultation/summary?patientId=${patientId}&duration=${elapsed}`);
            }
        } catch (err) {
            console.error("End consultation failed:", err);
            // Fallback: still go to summary with whatever we have
            router.push(`/consultation/summary?patientId=${patientId}&duration=${elapsed}`);
        } finally {
            setIsThinking(false);
        }
    };

    const handleProcessingComplete = (data: any) => {
        setAlerts(data.alerts);
        setSuggestedQuestions(data.suggestedQuestions);
        setSoap(data.soap);
        setSummary(data.patientSummary);
    };

    const handleSendMessage = async () => {
        if (!dummyMessage.trim() || isThinking) return;

        const messageText = dummyMessage;
        setDummyMessage("");
        setIsThinking(true);

        try {
            const res = await fetch("http://localhost:3001/api/consultation/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId,
                    chunks: [{
                        speaker,
                        text: messageText,
                    }],
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                setTranscript(prev => [...prev, { role: speaker, text: messageText, timestamp }]);
                setAlerts(data.alerts);
                setSuggestedQuestions(data.suggestedQuestions);
                setSoap(data.soap);
                setSummary(data.patientSummary);
            }
        } catch (err) {
            console.error("Failed to process message:", err);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="h-[calc(100vh-56px-48px)] flex flex-col -m-6">
            {/* Header */}
            <div className="shrink-0 px-6 py-3 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary/[0.08] flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-foreground">{patient.name}</h1>
                        <p className="text-xs text-muted">
                            {patient.id} · {patient.age} yrs · {patient.gender}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <AudioRecorder
                        patientId={patientId}
                        role={speaker}
                        onTranscriptChunk={handleTranscriptChunk}
                        onProcessingComplete={handleProcessingComplete}
                    />

                    <div className="flex items-center bg-surface rounded-lg p-1 border border-border/50">
                        <button
                            onClick={() => setSpeaker("patient")}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${speaker === "patient" ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
                        >
                            PATIENT
                        </button>
                        <button
                            onClick={() => setSpeaker("doctor")}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${speaker === "doctor" ? "bg-card text-primary shadow-sm" : "text-muted hover:text-foreground"}`}
                        >
                            DOCTOR
                        </button>
                    </div>

                    <div className="flex items-center gap-2 border-l border-border pl-5">
                        <input
                            type="text"
                            value={dummyMessage}
                            onChange={(e) => setDummyMessage(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                            placeholder="Type dummy message..."
                            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 w-48"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isThinking}
                            className={`w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors ${isThinking ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {isThinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted border-l border-border pl-5">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono font-medium text-foreground">{formatTime(elapsed)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-alert"></span>
                        </span>
                        <span className="text-xs font-medium text-alert">LIVE</span>
                    </div>
                </div>
            </div>

            {/* Main content — 2-pane split (Transcript & Copilot) */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left 60% — Transcript */}
                <div className="w-[60%] border-r border-border flex flex-col">
                    <TranscriptPanel messages={transcript} />
                </div>

                {/* Right 40% — Copilot */}
                <div className="w-[40%] flex flex-col overflow-auto">
                    <CopilotPanel
                        alerts={alerts}
                        suggestedQuestions={suggestedQuestions}
                        onAlertClick={(alert) => setSelectedAlert(alert)}
                    />
                    <div className="mt-4 border-t border-border pt-4 px-4 pb-20">
                        <PatientSummaryPanel summary={summary} />
                    </div>
                </div>
            </div>

            {/* Sticky End Consultation button */}
            <div className="shrink-0 px-6 py-3 border-t border-border bg-card flex justify-end">
                <button
                    onClick={handleEndConsultation}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-alert hover:bg-alert/90 transition-colors duration-150 cursor-pointer"
                >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    End Consultation
                </button>
            </div>

            {/* Modal */}
            {selectedAlert && (
                <ExplainabilityModal
                    alert={selectedAlert as any}
                    onClose={() => setSelectedAlert(null)}
                />
            )}
        </div>
    );
}

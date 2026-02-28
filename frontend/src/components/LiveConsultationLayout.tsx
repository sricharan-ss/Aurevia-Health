"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { User, Clock, Radio, Square } from "lucide-react";
import { patients, transcriptMessages, alertsData, type Patient } from "@/data/mockData";
import TranscriptPanel from "./TranscriptPanel";
import CopilotPanel from "./CopilotPanel";
import ExplainabilityModal from "./ExplainabilityModal";
import AudioRecorder from "./AudioRecorder";

function getPatientById(id: string): Patient | undefined {
    return patients.find((p) => p.id === id);
}

export default function LiveConsultationLayout() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const patientId = searchParams.get("patientId") || patients[0].id;
    const patient = getPatientById(patientId) || patients[0];

    const [elapsed, setElapsed] = useState(0);
    const [selectedAlert, setSelectedAlert] = useState<typeof alertsData[0] | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const handleEndConsultation = () => {
        router.push(`/consultation/summary?patientId=${patientId}&duration=${elapsed}`);
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
                    {/* Inject AudioRecorder Here */}
                    <AudioRecorder />

                    <div className="flex items-center gap-2 text-xs text-muted">
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

            {/* Main content — 60/40 split */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left 60% — Transcript */}
                <div className="w-[60%] border-r border-border flex flex-col">
                    <TranscriptPanel />
                </div>

                {/* Right 40% — Copilot */}
                <div className="w-[40%] flex flex-col overflow-auto">
                    <CopilotPanel
                        alerts={alertsData}
                        onAlertClick={(alert) => setSelectedAlert(alert)}
                    />
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
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                />
            )}
        </div>
    );
}

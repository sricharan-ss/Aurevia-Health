"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { Patient, TranscriptMessage, SOAPData, AlertData } from "@/types/clinical";
import { alertsData } from "@/data/mockData";
import PatientSnapshot from "./PatientSnapshot";
import SOAPPanel from "./SOAPPanel";
import TranscriptPanel from "./TranscriptPanel";
import AlertCard from "./AlertCard";
import ExplainabilityModal from "./ExplainabilityModal";
import PatientSummaryPanel from "./PatientSummary";

interface ConsultationViewProps {
    patient: Patient;
}

export default function ConsultationView({ patient }: ConsultationViewProps) {
    const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
    const [messages, setMessages] = useState<TranscriptMessage[]>([]);
    const [soapData, setSoapData] = useState<SOAPData | null>(null);
    const [summary, setSummary] = useState<string>("");

    return (
        <div className="max-w-[1400px]">
            {/* Patient Snapshot */}
            <PatientSnapshot patient={patient} />

            {/* Three-panel consultation layout */}
            <div className="grid grid-cols-[1fr_1fr_280px] gap-4 h-[calc(100vh-280px)]">
                {/* Left — SOAP Panel */}
                <SOAPPanel data={soapData} />

                {/* Center — Transcript */}
                <TranscriptPanel messages={messages} />

                {/* Right — Alerts */}
                <div className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-border shrink-0">
                        <h2 className="text-sm font-semibold text-foreground">Alerts</h2>
                        <p className="text-[11px] text-muted-light mt-0.5">Real-time clinical safety</p>
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                        {alertsData.length > 0 ? (
                            <div className="space-y-3">
                                {alertsData.map((alert) => (
                                    <AlertCard
                                        key={alert.id}
                                        alert={alert}
                                        onClick={() => setSelectedAlert(alert)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                                    <ShieldCheck className="w-6 h-6 text-secondary" />
                                </div>
                                <p className="text-sm font-medium text-foreground mb-1">No critical alerts</p>
                                <p className="text-xs text-muted-light">
                                    All safety checks passed
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Patient Summary */}
            <PatientSummaryPanel summary={summary} />

            {/* Explainability Modal */}
            {selectedAlert && (
                <ExplainabilityModal
                    alert={selectedAlert}
                    onClose={() => setSelectedAlert(null)}
                />
            )}
        </div>
    );
}

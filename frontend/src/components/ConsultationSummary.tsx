"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    User, Clock, CheckCircle2, Pill, AlertTriangle,
    ClipboardList, Stethoscope, Brain, ListChecks,
    MessageSquare, ShieldAlert, ArrowLeft, Download
} from "lucide-react";
import { patients, soapNote, transcriptMessages, alertsData, patientSummary } from "@/data/mockData";
import type { Patient, AlertData, TranscriptMessage, SOAPData } from "@/types/clinical";
import Link from "next/link";

export default function ConsultationSummary() {
    const searchParams = useSearchParams();
    const patientId = searchParams.get("patientId") || patients[0].id;
    const durationSeconds = parseInt(searchParams.get("duration") || "387", 10);
    const patient = patients.find((p) => p.id === patientId) || patients[0];

    const [mounted, setMounted] = useState(false);
    const [sessionData, setSessionData] = useState<any>(null);

    useEffect(() => {
        setMounted(true);
        const stored = sessionStorage.getItem(`session_${patientId}`);
        if (stored) {
            setSessionData(JSON.parse(stored));
        }
    }, [patientId]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m} min ${s} sec`;
    };

    if (!mounted) return null;

    // Merge session data with mock fallbacks
    const currentSoap = sessionData?.soap || soapNote;
    const currentTranscript = sessionData?.transcript || transcriptMessages;
    const currentAlerts = sessionData?.alerts || alertsData;
    const currentSummary = sessionData?.summary ? {
        diagnosis: [sessionData.summary], // Simplified wrap for summary string
        medications: patientSummary.medications,
        warnings: patientSummary.warnings
    } : patientSummary;

    return (
        <div className="max-w-4xl mx-auto space-y-5">
            {/* Back link */}
            <Link
                href="/patients"
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
                <ArrowLeft className="w-3 h-3" />
                Back to Patients
            </Link>

            {/* Patient Header */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/[0.08] flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">{patient.name}</h1>
                            <p className="text-sm text-muted">
                                {patient.id} · {patient.age} yrs · {patient.gender} · {patient.bloodGroup}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-muted-light">Consultation Duration</p>
                            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5 justify-end">
                                <Clock className="w-3.5 h-3.5 text-muted" />
                                {formatDuration(durationSeconds)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-light">Visit Reason</p>
                            <p className="text-sm font-medium text-foreground">{patient.visitReason}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SOAP Note */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">SOAP Note</h2>
                    <p className="text-[11px] text-muted-light mt-0.5">Final generated clinical documentation</p>
                </div>
                <div className="p-5 space-y-5">
                    {[
                        { key: "subjective", label: "Subjective", icon: ClipboardList, data: currentSoap.subjective, accent: "text-primary", bg: "bg-primary/[0.06]" },
                        { key: "objective", label: "Objective", icon: Stethoscope, data: currentSoap.objective, accent: "text-secondary", bg: "bg-secondary/[0.06]" },
                        { key: "assessment", label: "Assessment", icon: Brain, data: currentSoap.assessment, accent: "text-amber-600", bg: "bg-amber-50" },
                        { key: "plan", label: "Plan", icon: ListChecks, data: currentSoap.plan, accent: "text-violet-600", bg: "bg-violet-50" },
                    ].map((section) => {
                        const Icon = section.icon;
                        return (
                            <div key={section.key}>
                                <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg ${section.bg}`}>
                                    <Icon className={`w-3.5 h-3.5 ${section.accent}`} />
                                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${section.accent}`}>
                                        {section.label}
                                    </h3>
                                </div>
                                <ul className="space-y-1.5 pl-1">
                                    {(section.data || []).map((item: string, i: number) => (
                                        <li key={i} className="text-xs text-foreground leading-relaxed flex items-start gap-2">
                                            <span className="w-1 h-1 rounded-full bg-muted-light mt-1.5 shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Transcript */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted" />
                        Transcript
                    </h2>
                    <p className="text-[11px] text-muted-light mt-0.5">{currentTranscript.length} messages captured</p>
                </div>
                <div className="p-5 space-y-3 max-h-80 overflow-auto">
                    {currentTranscript.map((msg: any, i: number) => (
                        <div
                            key={i}
                            className={`flex ${msg.role === "doctor" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`
                  max-w-[80%] rounded-xl px-3.5 py-2.5
                  ${msg.role === "doctor"
                                        ? "bg-primary text-white rounded-br-md"
                                        : "bg-surface text-foreground rounded-bl-md"
                                    }
                `}
                            >
                                <p className="text-xs leading-relaxed">{msg.text}</p>
                                <p className={`text-[10px] mt-1 ${msg.role === "doctor" ? "text-white/60" : "text-muted-light"}`}>
                                    {msg.timestamp}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alerts Encountered */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-alert" />
                        Alerts Encountered
                    </h2>
                    <p className="text-[11px] text-muted-light mt-0.5">{currentAlerts.length} alert(s) during consultation</p>
                </div>
                <div className="p-5">
                    {currentAlerts.map((alert: any) => (
                        <div key={alert.id} className="border border-alert/20 bg-alert/[0.03] rounded-lg p-4 mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-alert/10 text-alert">
                                    {(alert.severity || "high").toUpperCase()}
                                </span>
                                <span className="text-sm font-semibold text-alert">{alert.title}</span>
                            </div>
                            <p className="text-xs text-foreground leading-relaxed mb-2">{alert.reasoning}</p>
                            <p className="text-[11px] text-muted-light">
                                Medications: {(alert.medications || []).join(" ↔ ")}
                            </p>
                        </div>
                    ))}
                    {currentAlerts.length === 0 && (
                        <p className="text-xs text-muted italic">No clinical alerts were triggered during this session.</p>
                    )}
                </div>
            </div>

            {/* Final Consultation Results */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">AI Summary & Logic</h2>
                </div>
                <div className="p-5 grid grid-cols-3 gap-5">
                    {/* Diagnosis */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-primary" /> Narrative
                        </p>
                        <div className="bg-primary/[0.04] border border-primary/10 rounded-lg p-3">
                            <p className="text-xs text-foreground leading-relaxed italic">
                                "{sessionData?.summary || "Direct AI summary of the interaction."}"
                            </p>
                        </div>
                    </div>
                    {/* Medications */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Pill className="w-3 h-3 text-secondary" /> Medications
                        </p>
                        <ul className="space-y-1.5">
                            {currentSummary.medications.map((m: string, i: number) => (
                                <li key={i} className="text-xs text-foreground leading-relaxed flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0"></span>
                                    {m}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Warnings */}
                    <div>
                        <p className="text-[11px] font-medium text-alert uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> Warnings
                        </p>
                        <div className="bg-alert/[0.04] border border-alert/15 rounded-lg p-3">
                            <ul className="space-y-2">
                                {currentSummary.warnings.map((w: string, i: number) => (
                                    <li key={i} className="text-xs text-alert/90 leading-relaxed flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-alert mt-1.5 shrink-0"></span>
                                        {w}
                                    </li>
                                ))}
                                {currentSummary.warnings.length === 0 && (
                                    <li className="text-xs text-muted-light">No critical warnings.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pb-6">
                <Link
                    href="/patients"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface border border-border transition-colors"
                >
                    Back to Patients
                </Link>
                <button
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors cursor-pointer"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export Summary
                </button>
            </div>
        </div>
    );
}

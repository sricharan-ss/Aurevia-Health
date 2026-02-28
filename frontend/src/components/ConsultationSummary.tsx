"use client";

import { useSearchParams } from "next/navigation";
import {
    User, Clock, CheckCircle2, Pill, AlertTriangle,
    ClipboardList, Stethoscope, Brain, ListChecks,
    MessageSquare, ShieldAlert, ArrowLeft, Download
} from "lucide-react";
import { patients, soapNote, transcriptMessages, alertsData, patientSummary } from "@/data/mockData";
import Link from "next/link";

export default function ConsultationSummary() {
    const searchParams = useSearchParams();
    const patientId = searchParams.get("patientId") || patients[0].id;
    const durationSeconds = parseInt(searchParams.get("duration") || "387", 10);
    const patient = patients.find((p) => p.id === patientId) || patients[0];

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m} min ${s} sec`;
    };

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
                    <p className="text-[11px] text-muted-light mt-0.5">Auto-generated clinical documentation</p>
                </div>
                <div className="p-5 space-y-5">
                    {[
                        { key: "subjective", label: "Subjective", icon: ClipboardList, data: soapNote.subjective, accent: "text-primary", bg: "bg-primary/[0.06]" },
                        { key: "objective", label: "Objective", icon: Stethoscope, data: soapNote.objective, accent: "text-secondary", bg: "bg-secondary/[0.06]" },
                        { key: "assessment", label: "Assessment", icon: Brain, data: soapNote.assessment, accent: "text-amber-600", bg: "bg-amber-50" },
                        { key: "plan", label: "Plan", icon: ListChecks, data: soapNote.plan, accent: "text-violet-600", bg: "bg-violet-50" },
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
                                    {section.data.map((item, i) => (
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
                    <p className="text-[11px] text-muted-light mt-0.5">{transcriptMessages.length} messages captured</p>
                </div>
                <div className="p-5 space-y-3 max-h-80 overflow-auto">
                    {transcriptMessages.map((msg, i) => (
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
                    <p className="text-[11px] text-muted-light mt-0.5">{alertsData.length} alert(s) during consultation</p>
                </div>
                <div className="p-5">
                    {alertsData.map((alert) => (
                        <div key={alert.id} className="border border-alert/20 bg-alert/[0.03] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-alert/10 text-alert">
                                    {alert.severity.toUpperCase()}
                                </span>
                                <span className="text-sm font-semibold text-alert">{alert.title}</span>
                            </div>
                            <p className="text-xs text-foreground leading-relaxed mb-2">{alert.reasoning}</p>
                            <p className="text-[11px] text-muted-light">
                                Medications: {alert.medicationsInvolved.join(" ↔ ")}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Consultation Summary */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">Consultation Summary</h2>
                </div>
                <div className="p-5 grid grid-cols-3 gap-5">
                    {/* Diagnosis */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-primary" /> Diagnosis
                        </p>
                        <ul className="space-y-1.5">
                            {patientSummary.diagnosis.map((d, i) => (
                                <li key={i} className="text-xs text-foreground leading-relaxed flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                                    {d}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Medications */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Pill className="w-3 h-3 text-secondary" /> Medications
                        </p>
                        <ul className="space-y-1.5">
                            {patientSummary.medications.map((m, i) => (
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
                                {patientSummary.warnings.map((w, i) => (
                                    <li key={i} className="text-xs text-alert/90 leading-relaxed flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-alert mt-1.5 shrink-0"></span>
                                        {w}
                                    </li>
                                ))}
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

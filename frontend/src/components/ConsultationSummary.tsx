"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
    User, Clock, CheckCircle2, Pill, AlertTriangle,
    ClipboardList, Stethoscope, Brain, ListChecks,
    MessageSquare, ShieldAlert, ArrowLeft, Download,
    Loader2, AlertCircle
} from "lucide-react";
import type { AlertData, TranscriptMessage, SOAPData, Patient } from "@/types/clinical";
import Link from "next/link";
import { format } from "date-fns";
import { apiUrl } from "@/lib/config";
import { getPatient } from "@/lib/api/patients";
import { normalizeReport } from "@/lib/normalizeReport";
import { RESEARCH_DISCLAIMER } from "@/lib/constants";

interface ConsultationSessionData {
    transcript?: TranscriptMessage[];
    alerts?: AlertData[];
    soap?: SOAPData;
    summary?: string;
    medications?: string[];
    warnings?: string[];
}

interface PersistedConsultation {
    patient?: Patient;
    transcript?: Array<{ speaker: "doctor" | "patient"; text: string; timestamp?: string | null }>;
    report?: {
        soap?: SOAPData;
        aiSummary?: {
            narrative?: string;
            medications?: string[];
            warnings?: string[];
        };
    };
}

const subscribeHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export default function ConsultationSummary() {
    const searchParams = useSearchParams();
    const patientId = searchParams.get("patientId") || "";
    const durationSeconds = parseInt(searchParams.get("duration") || "387", 10);
    const [patient, setPatient] = useState<Patient | null>(null);

    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState("");
    const mounted = useSyncExternalStore(subscribeHydration, getClientHydrationSnapshot, getServerHydrationSnapshot);
    const [sessionData, setSessionData] = useState<ConsultationSessionData | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);

    useEffect(() => {
        const reportId = searchParams.get("id");
        let active = true;
        const load = async () => {
            setIsLoadingReport(true);
            try {
                if (reportId) {
                    const response = await fetch(apiUrl(`/api/consultation/report/${encodeURIComponent(reportId)}`));
                    if (!response.ok) throw new Error("Report could not be loaded.");
                    const data = await response.json() as PersistedConsultation;
                    if (active) {
                        setPatient(data.patient ?? null);
                        setSessionData({ summary: data.report?.aiSummary?.narrative, soap: data.report?.soap,
                            transcript: data.transcript?.map(segment => ({ role: segment.speaker, text: segment.text, timestamp: segment.timestamp ?? "" })),
                            medications: data.report?.aiSummary?.medications, warnings: data.report?.aiSummary?.warnings });
                    }
                } else {
                    const stored = sessionStorage.getItem(`session_${reportId || patientId}`);
                    if (stored && active) setSessionData(JSON.parse(stored) as ConsultationSessionData);
                    if (patientId) {
                        const currentPatient = await getPatient(patientId);
                        if (active) setPatient(currentPatient);
                    }
                }
            } catch {
                if (active) setSessionData(null);
            } finally { if (active) setIsLoadingReport(false); }
        };
        void load();
        return () => { active = false; };
    }, [patientId, searchParams]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m} min ${s} sec`;
    };

    if (!mounted || isLoadingReport) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted">
                <Loader2 className="w-10 h-10 animate-spin mb-4 opacity-20" />
                <p className="text-sm font-medium">Fetching consultation report...</p>
            </div>
        );
    }

    if (!sessionData || !patient) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted">
                <AlertCircle className="w-10 h-10 mb-4 opacity-20" />
                <p className="text-sm font-medium">Report not found</p>
                <Link href="/consultation" className="mt-4 text-xs text-primary hover:underline">Return to Dashboard</Link>
            </div>
        );
    }

    const generatePDF = async () => {
        setIsExporting(true);
        setExportError("");
        try {
            const { jsPDF } = await import("jspdf");
            const autoTable = (await import("jspdf-autotable")).default;

            const doc = new jsPDF();
            const timestamp = format(new Date(), "PPpp");

            // Header
            doc.setFontSize(22);
            doc.setTextColor(37, 99, 235); // primary
            doc.text("Aurevia Health", 14, 22);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Clinical Consultation Summary", 14, 28);
            doc.text(`Generated: ${timestamp}`, 150, 22);

            // Patient Info Box
            doc.setDrawColor(230);
            doc.setFillColor(249, 250, 251);
            doc.roundedRect(14, 35, 182, 30, 3, 3, "FD");

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(patient.name, 20, 45);

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(`ID: ${patient.id}  |  Age: ${patient.age}  |  Gender: ${patient.gender}`, 20, 52);
            doc.text(`Visit Reason: ${patient.visitReason}`, 20, 59);

            // SOAP Note Sections
            let yPos = 75;
            const sections = [
                { title: "Subjective", data: currentSoap.subjective },
                { title: "Objective", data: currentSoap.objective },
                { title: "Assessment", data: currentSoap.assessment },
                { title: "Plan", data: currentSoap.plan }
            ];

            sections.forEach(section => {
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(37, 99, 235);
                doc.text(section.title.toUpperCase(), 14, yPos);

                autoTable(doc, {
                    startY: yPos + 2,
                    body: section.data.map((item: string) => [item]),
                    theme: "plain",
                    styles: { fontSize: 9, cellPadding: 1, textColor: [50, 50, 50] },
                    columnStyles: { 0: { cellWidth: 180 } },
                    margin: { left: 14 }
                });

                const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
                yPos = (finalY ?? yPos + 2) + 8;
            });

            // Summary Table
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("AI SUMMARY & RECOMMENDATIONS", 14, yPos);

            autoTable(doc, {
                startY: yPos + 2,
                head: [["Category", "Details"]],
                body: [
                    ["Narrative", normalizedReport.summary || "N/A"],
                    ["Medications", currentSummary.medications.join(", ")],
                    ["Warnings", currentSummary.warnings.join(", ")]
                ],
                theme: "striped",
                headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
                styles: { fontSize: 9 },
                columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" }, 1: { cellWidth: 150 } }
            });

            for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
                doc.setPage(page);
                doc.setFontSize(7);
                doc.setTextColor(110);
                doc.text(RESEARCH_DISCLAIMER, 14, 290, { maxWidth: 180 });
            }
            doc.save(`Aurevia_Summary_${patient.name.replace(/\s/g, "_")}.pdf`);
        } catch {
            setExportError("PDF export failed. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    if (!mounted) return null;

    // Render only data from this consultation; never substitute fixture content.
    const normalizedReport = normalizeReport(sessionData);
    const currentSoap = normalizedReport.soap;
    const currentTranscript = sessionData?.transcript || [];
    const currentAlerts = sessionData?.alerts || [];
    const currentSummary = { diagnosis: normalizedReport.summary ? [normalizedReport.summary] : [], medications: normalizedReport.medications, warnings: normalizedReport.warnings };

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
                    {currentTranscript.map((msg: TranscriptMessage, i: number) => (
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
                    {currentAlerts.map((alert: AlertData) => (
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
                    <p className="mt-1 text-[10px] text-muted-light">{RESEARCH_DISCLAIMER}</p>
                </div>
                <div className="p-5 grid grid-cols-3 gap-5">
                    {/* Diagnosis */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-primary" /> Narrative
                        </p>
                        <div className="bg-primary/[0.04] border border-primary/10 rounded-lg p-3">
                            <p className="text-xs text-foreground leading-relaxed italic">
                                &quot;{normalizedReport.summary}&quot;
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
                {exportError && <p className="mr-auto self-center text-xs text-alert" role="alert">{exportError}</p>}
                <Link
                    href="/patients"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface border border-border transition-colors"
                >
                    Back to Patients
                </Link>
                <button
                    onClick={generatePDF}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {isExporting ? "Exporting..." : "Export Summary"}
                </button>
            </div>
        </div>
    );
}

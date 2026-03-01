"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    User, Clock, CheckCircle2, Pill, AlertTriangle,
    ClipboardList, Stethoscope, Brain, ListChecks,
    MessageSquare, ShieldAlert, ArrowLeft, Download,
    Loader2, AlertCircle
} from "lucide-react";
import { patients, soapNote, transcriptMessages, alertsData, patientSummary } from "@/data/mockData";
import type { Patient, AlertData, TranscriptMessage, SOAPData } from "@/types/clinical";
import Link from "next/link";
import { format } from "date-fns";

export default function ConsultationSummary() {
    const searchParams = useSearchParams();
    const patientId = searchParams.get("patientId") || patients[0].id;
    const durationSeconds = parseInt(searchParams.get("duration") || "387", 10);
    const patient = patients.find((p) => p.id === patientId) || patients[0];

    const [isExporting, setIsExporting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [sessionData, setSessionData] = useState<any>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);

    useEffect(() => {
        setMounted(true);
        const reportId = searchParams.get("id");
        const stored = sessionStorage.getItem(`session_${patientId}`);

        if (stored) {
            console.log("[Summary] Loading from session storage");
            setSessionData(JSON.parse(stored));
        } else if (reportId) {
            console.log("[Summary] Session storage empty, fetching from backend:", reportId);
            setIsLoadingReport(true);
            fetch(`http://localhost:3001/api/consultation/report/${reportId}`)
                .then(res => res.json())
                .then(data => {
                    // Adapt backend format to summary components
                    setSessionData({
                        summary: data.report.aiSummary.narrative,
                        soap: data.report.soap,
                        medications: data.report.aiSummary.medications,
                        warnings: data.report.aiSummary.warnings
                    });
                })
                .catch(err => console.error("[Summary] Fetch failed:", err))
                .finally(() => setIsLoadingReport(false));
        }
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

    if (!sessionData) {
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

                yPos = (doc as any).lastAutoTable.finalY + 8;
            });

            // Summary Table
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("AI SUMMARY & RECOMMENDATIONS", 14, yPos);

            autoTable(doc, {
                startY: yPos + 2,
                head: [["Category", "Details"]],
                body: [
                    ["Narrative", sessionData?.summary || "N/A"],
                    ["Medications", currentSummary.medications.join(", ")],
                    ["Warnings", currentSummary.warnings.join(", ")]
                ],
                theme: "striped",
                headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
                styles: { fontSize: 9 },
                columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" }, 1: { cellWidth: 150 } }
            });

            doc.save(`Aurevia_Summary_${patient.name.replace(/\s/g, "_")}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            setIsExporting(false);
        }
    };

    if (!mounted) return null;

    // Merge session data with mock fallbacks
    const currentSoap = sessionData?.soap || soapNote;
    const currentTranscript = sessionData?.transcript || transcriptMessages;
    const currentAlerts = sessionData?.alerts || alertsData;
    const currentSummary = {
        diagnosis: sessionData?.summary ? [sessionData.summary] : patientSummary.diagnosis,
        medications: sessionData?.medications || patientSummary.medications,
        warnings: sessionData?.warnings || patientSummary.warnings
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

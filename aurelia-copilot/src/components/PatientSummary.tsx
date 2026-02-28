"use client";

import { FileText, Pill, AlertTriangle, CheckCircle2 } from "lucide-react";
import { patientSummary } from "@/data/mockData";

export default function PatientSummary() {
    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 mt-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted" />
                Consultation Summary
            </h2>

            <div className="grid grid-cols-3 gap-5">
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
                    <p className="text-[11px] font-medium text-alert uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[11px] font-medium">
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
    );
}

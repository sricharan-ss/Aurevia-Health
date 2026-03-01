"use client";

import { User, Droplet, Heart, Pill, AlertTriangle, FlaskConical, FileText } from "lucide-react";
import type { Patient } from "@/types/clinical";

interface PatientSnapshotProps {
    patient: Patient;
}

export default function PatientSnapshot({ patient }: PatientSnapshotProps) {
    return (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 mb-5">
            <div className="grid grid-cols-3 gap-6">
                {/* Column 1 — Demographics */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/[0.08] flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{patient.name}</p>
                            <p className="text-xs text-muted">{patient.id}</p>
                        </div>
                    </div>
                    <div className="space-y-1.5 pl-[52px]">
                        <p className="text-xs text-muted">
                            {patient.age} yrs · {patient.gender}
                        </p>
                        <p className="text-xs text-muted flex items-center gap-1.5">
                            <Droplet className="w-3 h-3 text-alert" />
                            {patient.bloodGroup}
                        </p>
                    </div>
                </div>

                {/* Column 2 — Conditions & Medications */}
                <div className="space-y-3">
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Heart className="w-3 h-3" /> Conditions
                        </p>
                        <ul className="space-y-1">
                            {patient.conditions.map((c, i) => (
                                <li key={i} className="text-xs text-foreground leading-relaxed">{c}</li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Pill className="w-3 h-3" /> Medications
                        </p>
                        <ul className="space-y-1">
                            {patient.medications.map((m, i) => (
                                <li key={i} className="text-xs text-muted leading-relaxed">{m}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Column 3 — Allergies, Labs, Visit Reason */}
                <div className="space-y-3">
                    {patient.allergies.length > 0 && (
                        <div className="bg-alert/[0.06] border border-alert/20 rounded-lg p-3">
                            <p className="text-[11px] font-medium text-alert uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3" /> Allergies
                            </p>
                            <ul className="space-y-0.5">
                                {patient.allergies.map((a, i) => (
                                    <li key={i} className="text-xs text-alert font-medium">{a}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <FlaskConical className="w-3 h-3" /> Last Abnormal Lab
                        </p>
                        <p className="text-xs text-foreground">{patient.lastAbnormalLab}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-medium text-muted-light uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <FileText className="w-3 h-3" /> Visit Reason
                        </p>
                        <p className="text-xs text-foreground">{patient.visitReason}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

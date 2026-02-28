"use client";

import { Calendar, Clock } from "lucide-react";
import { patients } from "@/data/mockData";

interface DashboardProps {
    onPatientClick: (index: number) => void;
}

const statusColors: Record<string, { dot: string; label: string }> = {
    waiting: { dot: "bg-amber-400", label: "Waiting" },
    "in-progress": { dot: "bg-primary", label: "In Progress" },
    completed: { dot: "bg-secondary", label: "Completed" },
};

export default function Dashboard({ onPatientClick }: DashboardProps) {
    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-foreground tracking-tight">
                        Today&apos;s Patients
                    </h1>
                    <p className="text-sm text-muted mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {today}
                    </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        {patients.filter((p) => p.status === "waiting").length} Waiting
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        {patients.filter((p) => p.status === "in-progress").length} In Progress
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        {patients.filter((p) => p.status === "completed").length} Completed
                    </span>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-x-6 px-5 py-3 border-b border-border text-xs font-medium text-muted-light uppercase tracking-wider">
                    <span>Status</span>
                    <span>Patient</span>
                    <span>ID</span>
                    <span>Visit Reason</span>
                    <span className="text-right">Time</span>
                </div>
                {patients.map((patient, index) => {
                    const status = statusColors[patient.status];
                    return (
                        <button
                            key={patient.id}
                            onClick={() => onPatientClick(index)}
                            className="w-full grid grid-cols-[auto_1fr_auto_1fr_auto] gap-x-6 px-5 py-3.5 border-b border-border/50 last:border-b-0 hover:bg-surface/60 transition-colors duration-100 text-left cursor-pointer group"
                        >
                            <span className="flex items-center">
                                <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                            </span>
                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-100">
                                {patient.name}
                            </span>
                            <span className="text-xs text-muted font-mono">
                                {patient.id}
                            </span>
                            <span className="text-sm text-muted">
                                {patient.visitReason}
                            </span>
                            <span className="text-xs text-muted-light flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                09:30
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

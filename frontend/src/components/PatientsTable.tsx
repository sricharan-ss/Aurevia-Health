"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { patients } from "@/data/mockData";
import type { Patient } from "@/types/clinical";

type StatusFilter = "all" | "waiting" | "in-progress" | "completed";

const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "waiting", label: "Waiting" },
    { id: "in-progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
];

const statusColors: Record<string, { dot: string; label: string }> = {
    waiting: { dot: "bg-amber-400", label: "Waiting" },
    "in-progress": { dot: "bg-primary", label: "In Progress" },
    completed: { dot: "bg-secondary", label: "Completed" },
};

export default function PatientsTable() {
    const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
    const router = useRouter();

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const filteredPatients =
        activeFilter === "all"
            ? patients
            : patients.filter((p) => p.status === activeFilter);

    const handleStartConsultation = (e: React.MouseEvent, patient: Patient) => {
        e.stopPropagation();
        router.push(`/consultation/live?patientId=${patient.id}`);
    };

    return (
        <div className="max-w-6xl">
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

                {/* Filter tabs */}
                <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border/50">
                    {filterTabs.map((tab) => {
                        const isActive = activeFilter === tab.id;
                        const count =
                            tab.id === "all"
                                ? patients.length
                                : patients.filter((p) => p.status === tab.id).length;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveFilter(tab.id)}
                                className={`
                  px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer
                  ${isActive
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted hover:text-foreground"
                                    }
                `}
                            >
                                {tab.label}
                                <span className={`ml-1.5 ${isActive ? "text-primary" : "text-muted-light"}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] gap-x-5 px-5 py-3 border-b border-border text-xs font-medium text-muted-light uppercase tracking-wider">
                    <span>Status</span>
                    <span>Patient</span>
                    <span>ID</span>
                    <span>Visit Reason</span>
                    <span>Time</span>
                    <span className="text-right">Action</span>
                </div>
                {filteredPatients.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-muted">
                        No patients matching this filter.
                    </div>
                ) : (
                    filteredPatients.map((patient) => {
                        const status = statusColors[patient.status];
                        return (
                            <div
                                key={patient.id}
                                className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] gap-x-5 px-5 py-3.5 border-b border-border/50 last:border-b-0 hover:bg-surface/60 transition-colors duration-100 items-center group"
                            >
                                <span className="flex items-center">
                                    <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {patient.name}
                                </span>
                                <span className="text-xs text-muted font-mono">
                                    {patient.id}
                                </span>
                                <span className="text-sm text-muted truncate">
                                    {patient.visitReason}
                                </span>
                                <span className="text-xs text-muted-light flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    09:30
                                </span>
                                <span>
                                    <button
                                        onClick={(e) => handleStartConsultation(e, patient)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-primary hover:bg-primary/90 transition-all duration-150 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    >
                                        Start
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

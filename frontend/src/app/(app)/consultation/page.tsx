"use client";

import { useState, useEffect } from "react";
import {
    Clock,
    User,
    ChevronRight,
    Plus,
    Search,
    Calendar,
    MessageSquare,
    ClipboardList,
    AlertCircle,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function ConsultationDashboard() {
    const [consultations, setConsultations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        console.log("[Dashboard] Fetching recent consultations...");
        fetch("http://localhost:3001/api/consultation/recent")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("[Dashboard] Consultations received:", data);
                setConsultations(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("[Dashboard] Failed to fetch consultations:", err);
                setLoading(false);
            });
    }, []);

    const filtered = consultations.filter(c =>
        c.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.patientId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Consultations</h1>
                    <p className="text-sm text-muted mt-1">Manage and review your clinical sessions</p>
                </div>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Consultation
                </Link>
            </div>

            {/* Stats & Search */}
            <div className="grid grid-cols-[1fr_280px] gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        placeholder="Search by patient name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
                <div className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">Total Sessions</span>
                    <span className="text-sm font-bold text-foreground">{consultations.length}</span>
                </div>
            </div>

            {/* List */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-surface/30 flex items-center justify-between font-semibold text-xs text-muted uppercase tracking-wider">
                    <div className="flex-[2]">Patient Details</div>
                    <div className="flex-1">Date & Time</div>
                    <div className="flex-[2]">Summary Snippet</div>
                    <div className="w-20 text-right">Actions</div>
                </div>

                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-muted">
                            <Loader2 className="w-8 h-8 animate-spin mb-3 opacity-20" />
                            <p className="text-sm">Loading consultation history...</p>
                        </div>
                    ) : filtered.length > 0 ? (
                        filtered.map((session) => (
                            <div key={session.id} className="group px-6 py-4 hover:bg-surface/50 transition-colors flex items-center gap-4">
                                <div className="flex-[2] flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/[0.08] flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{session.patientName}</p>
                                        <p className="text-xs text-muted">{session.patientId}</p>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                        <Calendar className="w-3.5 h-3.5 text-muted" />
                                        {format(new Date(session.date), "MMM d, yyyy")}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {format(new Date(session.date), "hh:mm a")}
                                    </div>
                                </div>

                                <div className="flex-[2]">
                                    <p className="text-xs text-muted-light line-clamp-2 leading-relaxed italic">
                                        "{session.summary || "No summary available for this session."}"
                                    </p>
                                </div>

                                <div className="w-20 text-right">
                                    <Link
                                        href={`/consultation/summary?patientId=${session.patientId}&id=${session.id}`}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-muted hover:text-primary hover:border-primary/30 transition-all group-hover:shadow-sm"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
                                <ClipboardList className="w-8 h-8 text-muted/30" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">No sessions found</h3>
                            <p className="text-xs text-muted mt-1.5 max-w-[240px]">
                                {searchTerm ? "Try adjusting your search terms" : "Start your first consultation to see history here"}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

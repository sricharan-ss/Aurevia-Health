"use client";

import { AlertTriangle, ShieldAlert, FlaskConical } from "lucide-react";
import type { AlertData } from "@/data/mockData";

interface AlertCardProps {
    alert: AlertData;
    onClick: () => void;
}

const iconMap: Record<string, React.ElementType> = {
    "drug-interaction": ShieldAlert,
    allergy: AlertTriangle,
    "lab-critical": FlaskConical,
};

const severityStyles: Record<string, { border: string; bg: string; text: string; badge: string }> = {
    high: {
        border: "border-alert/30",
        bg: "bg-alert/[0.04]",
        text: "text-alert",
        badge: "bg-alert/10 text-alert",
    },
    medium: {
        border: "border-amber-300/50",
        bg: "bg-amber-50/50",
        text: "text-amber-600",
        badge: "bg-amber-100 text-amber-700",
    },
    low: {
        border: "border-border",
        bg: "bg-surface/50",
        text: "text-muted",
        badge: "bg-surface text-muted",
    },
};

export default function AlertCard({ alert, onClick }: AlertCardProps) {
    const Icon = iconMap[alert.type] || AlertTriangle;
    const style = severityStyles[alert.severity];

    return (
        <button
            onClick={onClick}
            className={`w-full text-left border ${style.border} ${style.bg} rounded-xl p-4 transition-all duration-150 hover:shadow-md hover:scale-[1.01] cursor-pointer group`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${style.badge} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm font-semibold ${style.text}`}>{alert.title}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                            {alert.severity.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {alert.medicationsInvolved.join(" ↔ ")}
                    </p>
                    <p className="text-[11px] text-muted-light mt-1.5">
                        {alert.timestamp} · Click for details
                    </p>
                </div>
            </div>
        </button>
    );
}

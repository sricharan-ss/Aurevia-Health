import { Stethoscope } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="h-full flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/[0.06] flex items-center justify-center mx-auto mb-4">
                    <Stethoscope className="w-8 h-8 text-primary/50" />
                </div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    Select a patient to begin consultation
                </h2>
                <p className="text-sm text-muted mt-1.5">
                    Today&apos;s activity will appear here
                </p>
            </div>
        </div>
    );
}

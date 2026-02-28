"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Stethoscope } from "lucide-react";

type NavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    matchPaths: string[];
};

const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, matchPaths: ["/dashboard"] },
    { href: "/patients", label: "Patients", icon: Users, matchPaths: ["/patients"] },
    { href: "/consultation/live", label: "Consultation", icon: Stethoscope, matchPaths: ["/consultation"] },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <aside className="w-56 border-r border-border bg-card shrink-0 flex flex-col">
            <nav className="flex flex-col gap-1 p-3 pt-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.matchPaths.some((p) => pathname.startsWith(p));
                    return (
                        <button
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150 cursor-pointer
                ${isActive
                                    ? "bg-primary/[0.08] text-primary"
                                    : "text-muted hover:bg-surface hover:text-foreground"
                                }
              `}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
            <div className="mt-auto p-4 border-t border-border">
                <div className="text-[11px] text-muted-light leading-relaxed">
                    <p className="font-medium text-muted mb-0.5">Aurevia Health</p>
                    <p>Clinical Copilot v1.0</p>
                </div>
            </div>
        </aside>
    );
}

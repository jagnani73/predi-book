"use client";

import { VenueStatusBadge } from "./VenueStatusBadge";
import type { VenueStatus } from "@/hooks/useOrderbook";
import { formatRelative } from "@/lib/format";
import { Activity, ChevronLeft } from "lucide-react";
import Link from "next/link";

type Props = {
    label: string;
    backHref?: string;
    polyStatus: VenueStatus;
    kalshiStatus: VenueStatus;
    updatedAt: string | null;
};

export function Header({
    label,
    backHref,
    polyStatus,
    kalshiStatus,
    updatedAt,
}: Props) {
    return (
        <header className="sticky top-0 z-30 border-b border-white/8 bg-zinc-950/80 backdrop-blur-md">
            <div className="mx-auto max-w-5xl px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Title + optional back link */}
                    <div className="flex items-center gap-2">
                        {backHref && (
                            <Link
                                href={backHref}
                                className="mr-1 flex items-center gap-1 font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Markets
                            </Link>
                        )}
                        <Activity className="h-4 w-4 text-indigo-400" />
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {label}
                        </h1>
                    </div>

                    {/* Venue status + timestamp */}
                    <div className="flex flex-wrap items-center gap-2">
                        <VenueStatusBadge
                            venue="Polymarket"
                            status={polyStatus}
                        />
                        <VenueStatusBadge
                            venue="Kalshi"
                            status={kalshiStatus}
                        />
                        {updatedAt && (
                            <span className="font-mono text-[11px] text-zinc-600">
                                {formatRelative(updatedAt)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

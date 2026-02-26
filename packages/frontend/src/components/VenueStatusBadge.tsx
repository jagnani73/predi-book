"use client"

import type { VenueStatus } from "@/hooks/useOrderbook"

type Props = {
    venue: "Polymarket" | "Kalshi"
    status: VenueStatus
}

const CONFIG = {
    live: {
        container: "bg-green-500/10 text-green-400",
        dot: "bg-green-400",
        pulse: false,
        label: "live",
    },
    stale: {
        container: "bg-yellow-500/10 text-yellow-400",
        dot: "bg-yellow-400",
        pulse: true,
        label: "stale",
    },
    offline: {
        container: "bg-red-500/10 text-red-400",
        dot: "bg-red-400",
        pulse: false,
        label: "offline",
    },
    connecting: {
        container: "bg-zinc-800 text-zinc-400",
        dot: "bg-zinc-500",
        pulse: true,
        label: "connecting",
    },
    reconnecting: {
        container: "bg-orange-500/10 text-orange-400",
        dot: "bg-orange-400",
        pulse: true,
        label: "reconn",
    },
}

export function VenueStatusBadge({ venue, status }: Props) {
    const cfg = CONFIG[status]

    return (
        <div
            role="status"
            aria-label={`${venue}: ${cfg.label}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ${cfg.container}`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? "animate-pulse" : ""}`}
            />
            <span>{venue}</span>
            <span className="text-current/60">·</span>
            <span>{cfg.label}</span>
        </div>
    )
}

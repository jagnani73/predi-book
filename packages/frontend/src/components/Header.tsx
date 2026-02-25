"use client"

import { Activity } from "lucide-react"
import { MARKET } from "@/config/market"
import type { VenueStatus } from "@/hooks/useOrderbook"
import { formatRelative } from "@/lib/format"
import { VenueStatusBadge } from "./VenueStatusBadge"

type Props = {
    polyStatus: VenueStatus
    kalshiStatus: VenueStatus
    updatedAt: string | null
}

export function Header({ polyStatus, kalshiStatus, updatedAt }: Props) {
    return (
        <header className="sticky top-0 z-30 border-b border-white/8 bg-zinc-950/80 backdrop-blur-md">
            <div className="mx-auto max-w-5xl px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Title */}
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-400" />
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            {MARKET.label}
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
    )
}

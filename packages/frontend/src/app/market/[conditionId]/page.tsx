"use client";

import { DebugPanel } from "@/components/DebugPanel";
import { Header } from "@/components/Header";
import { OrderBookPanel } from "@/components/OrderBookPanel";
import { QuotePanel } from "@/components/QuotePanel";
import { useOrderbook } from "@/hooks/useOrderbook";
import { useQuote } from "@/hooks/useQuote";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";

type Props = {
    params: Promise<{ conditionId: string }>;
};

export default function MarketPage({ params }: Props) {
    const { conditionId } = use(params);
    const searchParams = useSearchParams();
    const kalshiTicker = searchParams.get("k") ?? "";
    const label = searchParams.get("label") ?? "Market";

    const {
        book,
        polyStatus,
        kalshiStatus,
        socketStatus,
        polyLastUpdated,
        kalshiLastUpdated,
        polyMessageCount,
        kalshiMessageCount,
        updatesPerSec,
        snapshotAt,
    } = useOrderbook(conditionId, kalshiTicker);
    const quote = useQuote(book);

    const [devMode, setDevMode] = useState(false);

    const isConnecting =
        socketStatus === "connecting" || socketStatus === "disconnected";

    return (
        <main className="min-h-screen bg-zinc-950">
            <Header
                label={label}
                backHref="/"
                polyStatus={polyStatus}
                kalshiStatus={kalshiStatus}
                updatedAt={book?.updatedAt ?? null}
            />

            <div className="mx-auto max-w-5xl px-4">
                {/* Dev mode toggle */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={() => setDevMode((s) => !s)}
                        className={`rounded border px-2 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors ${
                            devMode
                                ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
                                : "border-white/8 text-zinc-600 hover:text-zinc-400"
                        }`}
                    >
                        Dev
                    </button>
                </div>

                <div className="grid gap-6 py-4 lg:grid-cols-[3fr_2fr]">
                    <OrderBookPanel
                        book={book}
                        isConnecting={isConnecting}
                        polyStatus={polyStatus}
                        kalshiStatus={kalshiStatus}
                        polyLastUpdated={polyLastUpdated}
                        kalshiLastUpdated={kalshiLastUpdated}
                        polyMessageCount={polyMessageCount}
                        kalshiMessageCount={kalshiMessageCount}
                        updatesPerSec={updatesPerSec}
                        snapshotAt={snapshotAt}
                    />
                    <QuotePanel
                        quote={quote}
                        isConnecting={isConnecting}
                        book={book}
                    />
                </div>

                {devMode && (
                    <div className="pb-6">
                        <DebugPanel
                            book={book}
                            polyStatus={polyStatus}
                            kalshiStatus={kalshiStatus}
                            polyLastUpdated={polyLastUpdated}
                            kalshiLastUpdated={kalshiLastUpdated}
                            polyMessageCount={polyMessageCount}
                            kalshiMessageCount={kalshiMessageCount}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}

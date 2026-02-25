import { MarketCard } from "@/components/MarketCard";
import { MARKETS } from "@/config/markets";
import { Activity } from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-zinc-950">
            {/* Simple home header */}
            <header className="border-b border-white/8 bg-zinc-950/80 backdrop-blur-md">
                <div className="mx-auto max-w-5xl px-4 py-4">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-400" />
                        <h1 className="text-xl font-bold tracking-tight text-white">
                            Predi-Book
                        </h1>
                        <span className="font-mono text-xs text-zinc-600">
                            · Prediction Market Aggregator
                        </span>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="mb-5">
                    <h2 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                        Markets
                    </h2>
                </div>

                {MARKETS.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-16 text-center">
                        <p className="text-sm text-zinc-500">
                            No markets configured yet.
                        </p>
                        <p className="font-mono text-xs text-zinc-700">
                            Add pairs to{" "}
                            <code className="text-zinc-600">
                                src/config/markets.ts
                            </code>
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {MARKETS.map((market) => (
                            <MarketCard key={market.id} market={market} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

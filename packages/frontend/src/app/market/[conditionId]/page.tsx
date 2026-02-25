"use client";

import { Header } from "@/components/Header";
import { OrderBookPanel } from "@/components/OrderBookPanel";
import { QuotePanel } from "@/components/QuotePanel";
import { useOrderbook } from "@/hooks/useOrderbook";
import { useQuote } from "@/hooks/useQuote";
import { useSearchParams } from "next/navigation";
import { use } from "react";

type Props = {
    params: Promise<{ conditionId: string }>;
};

export default function MarketPage({ params }: Props) {
    const { conditionId } = use(params);
    const searchParams = useSearchParams();
    const kalshiTicker = searchParams.get("k") ?? "";
    const label = searchParams.get("label") ?? "Market";

    const { book, polyStatus, kalshiStatus, socketStatus } = useOrderbook(
        conditionId,
        kalshiTicker,
    );
    const quote = useQuote(book);

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
                <div className="grid gap-6 py-6 lg:grid-cols-[3fr_2fr]">
                    <OrderBookPanel book={book} isConnecting={isConnecting} />
                    <QuotePanel quote={quote} isConnecting={isConnecting} />
                </div>
            </div>
        </main>
    );
}

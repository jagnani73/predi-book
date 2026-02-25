"use client"

import { Header } from "@/components/Header"
import { OrderBookPanel } from "@/components/OrderBookPanel"
import { QuotePanel } from "@/components/QuotePanel"
import { useOrderbook } from "@/hooks/useOrderbook"
import { useQuote } from "@/hooks/useQuote"

export default function Home() {
    const { book, polyStatus, kalshiStatus, socketStatus } = useOrderbook()
    const quote = useQuote(book)

    const isConnecting = socketStatus === "connecting" || socketStatus === "disconnected"

    return (
        <main className="min-h-screen bg-zinc-950">
            <Header
                polyStatus={polyStatus}
                kalshiStatus={kalshiStatus}
                updatedAt={book?.updatedAt ?? null}
            />

            <div className="mx-auto max-w-5xl px-4">
                <div className="grid gap-6 py-6 lg:grid-cols-[3fr_2fr]">
                    {/* Left: Order book */}
                    <OrderBookPanel book={book} isConnecting={isConnecting} />

                    {/* Right: Quote panel */}
                    <QuotePanel quote={quote} isConnecting={isConnecting} />
                </div>
            </div>
        </main>
    )
}

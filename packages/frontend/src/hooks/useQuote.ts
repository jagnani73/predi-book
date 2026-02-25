"use client"

import { useMemo, useState } from "react"
import type { AggregatedBook } from "@/lib/types"
import { simulateFill, type QuoteResult } from "@/lib/quote"

export type QuoteSide = "YES" | "NO"

export type QuoteState = {
    amount: number
    setAmount: (v: number) => void
    side: QuoteSide
    setSide: (s: QuoteSide) => void
    result: QuoteResult | null
}

export function useQuote(book: AggregatedBook | null): QuoteState {
    const [amount, setAmount] = useState<number>(0)
    const [side, setSide] = useState<QuoteSide>("YES")

    const result = useMemo<QuoteResult | null>(() => {
        if (!book || amount <= 0) return null
        return simulateFill(book, amount, side)
    }, [book, amount, side])

    return { amount, setAmount, side, setSide, result }
}

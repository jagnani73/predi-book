import type { AggregatedBook, AggregatedLevel } from "./types"

export type FillLine = {
    venue: "polymarket" | "kalshi" | "both"
    price: number
    shares: number
    cost: number
}

export type QuoteResult = {
    totalShares: number
    avgPrice: number
    totalCost: number
    fills: FillLine[]
    venueSplit: {
        polymarket: { cost: number; pct: number }
        kalshi: { cost: number; pct: number }
    }
    fullyFilled: boolean
}

/**
 * Simulate a market order fill against the aggregated book.
 *
 * YES side: walks asks ascending (cheapest ask first).
 * NO side:  walks bids descending (highest YES bid = cheapest NO).
 *           Price per NO share = 1 − YES bid price.
 */
export function simulateFill(
    book: AggregatedBook,
    dollarAmount: number,
    side: "YES" | "NO",
): QuoteResult {
    const levels: AggregatedLevel[] =
        side === "YES"
            ? [...book.asks].sort(
                  (a, b) => parseFloat(a.price) - parseFloat(b.price),
              )
            : [...book.bids].sort(
                  (a, b) => parseFloat(b.price) - parseFloat(a.price),
              )

    let remaining = dollarAmount
    let totalShares = 0
    let polymarketCost = 0
    let kalshiCost = 0
    const fills: FillLine[] = []

    for (const level of levels) {
        if (remaining <= 0.001) break

        const rawPrice = parseFloat(level.price)
        const pricePerShare = side === "YES" ? rawPrice : 1 - rawPrice
        if (pricePerShare <= 0) continue

        const levelSize = parseFloat(level.size)
        const availableCost = pricePerShare * levelSize
        const take = Math.min(remaining, availableCost)
        const sharesAtLevel = take / pricePerShare

        fills.push({
            venue: level.venue,
            price: pricePerShare,
            shares: sharesAtLevel,
            cost: take,
        })

        // Attribute cost to venues
        if (level.venue === "polymarket") {
            polymarketCost += take
        } else if (level.venue === "kalshi") {
            kalshiCost += take
        } else {
            // 'both' — split 50/50
            polymarketCost += take / 2
            kalshiCost += take / 2
        }

        totalShares += sharesAtLevel
        remaining -= take
    }

    const totalCost = dollarAmount - remaining
    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0
    const venueTotal = polymarketCost + kalshiCost

    return {
        totalShares,
        avgPrice,
        totalCost,
        fills,
        venueSplit: {
            polymarket: {
                cost: polymarketCost,
                pct: venueTotal > 0 ? (polymarketCost / venueTotal) * 100 : 0,
            },
            kalshi: {
                cost: kalshiCost,
                pct: venueTotal > 0 ? (kalshiCost / venueTotal) * 100 : 0,
            },
        },
        fullyFilled: remaining < 0.01,
    }
}

/**
 * Format a 0–1 probability price for display.
 * Shows 4 decimal places for tight prices (< 0.10 from 0 or 1), 2 otherwise.
 */
export function formatPrice(price: string | number): string {
    const p = typeof price === "string" ? parseFloat(price) : price
    const distFromEdge = Math.min(p, 1 - p)
    const decimals = distFromEdge < 0.1 ? 4 : 2
    return p.toFixed(decimals)
}

/**
 * Format a share size with K suffix for large values.
 */
export function formatSize(size: string | number): string {
    const n = typeof size === "string" ? parseFloat(size) : size
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    if (n >= 100) return Math.round(n).toString()
    return n.toFixed(2)
}

/**
 * Format a dollar amount with 2 decimal places.
 */
export function formatUsd(amount: number): string {
    return `$${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

/**
 * Format an ISO timestamp as a relative time string.
 */
export function formatRelative(ts: string | null | undefined): string {
    if (!ts) return "—"
    const diffMs = Date.now() - new Date(ts).getTime()
    const s = Math.floor(diffMs / 1000)
    if (s < 60) return `${s}s ago`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    return `${Math.floor(m / 60)}h ago`
}

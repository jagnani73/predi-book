# Predi-Book Frontend — Implementation Plan

> **Page:** `/` (Single market view — aggregated order book + quote panel)
> **Inherits from:** `DESIGN_SYSTEM.md`
> **Backend contract:** `packages/backend/CLAUDE.md`

---

## 1. Tech Stack

| Concern          | Choice                      | Reason                                              |
| ---------------- | --------------------------- | --------------------------------------------------- |
| Framework        | **Next.js 15** (App Router) | Already scaffolded; RSC for static shell            |
| Styling          | **Tailwind CSS v4**         | Already installed; token-based, fast iteration      |
| WebSocket client | **socket.io-client**        | Matches BE socket.io server exactly                 |
| Icons            | **lucide-react**            | Consistent, tree-shakeable                          |
| Animations       | **CSS transitions only**    | Price flash is a simple bg-fade — no lib needed     |
| State            | **React hooks only**        | Two state slices: book + quote input. No lib needed |
| Types            | Inline (mirrored from BE)   | No shared package — copy `AggregatedBook` type      |

No Redux, Zustand, Jotai, React Query, or SWR. The data model is a single live stream — hooks handle it cleanly.

---

## 2. Folder / File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout — fonts, metadata, bg color
│   ├── page.tsx            # Single page — wires up all panels
│   └── globals.css         # Tailwind base + scrollbar + flash keyframe
│
├── components/
│   ├── Header.tsx          # Market title + venue status badges
│   ├── OrderBookPanel.tsx  # Panel wrapper — asks + spread + bids
│   ├── BookTable.tsx       # Renders a sorted list of BookRows
│   ├── BookRow.tsx         # Single price level row (memoized)
│   ├── SpreadBand.tsx      # Spread + mid price display between halves
│   ├── VenueStatusBadge.tsx# Connected / stale / disconnected indicator
│   ├── QuotePanel.tsx      # Dollar input + YES/NO toggle + result
│   └── FillBreakdown.tsx   # Per-venue fill amounts and percentages
│
├── hooks/
│   ├── useOrderbook.ts     # Socket.io connection + AggregatedBook state
│   └── useQuote.ts         # Pure quote simulation — walks book levels
│
├── lib/
│   ├── types.ts            # AggregatedBook, PriceLevel, VenueBook types
│   ├── format.ts           # formatPrice(), formatSize(), formatUsd()
│   └── quote.ts            # simulateFill() — pure function, testable
│
└── config/
    └── market.ts           # CONDITION_ID, KALSHI_TICKER constants
```

---

## 3. Component Inventory

| Component          | File                              | Responsibility                                                   |
| ------------------ | --------------------------------- | ---------------------------------------------------------------- |
| `Header`           | `components/Header.tsx`           | Market question title, last update timestamp, venue status row   |
| `OrderBookPanel`   | `components/OrderBookPanel.tsx`   | Panel card wrapping asks + spread band + bids                    |
| `BookTable`        | `components/BookTable.tsx`        | Receives sorted `AggregatedLevel[]`, renders rows. No logic.     |
| `BookRow`          | `components/BookRow.tsx`          | Single level: depth bar + price + size + venue tag. `React.memo` |
| `SpreadBand`       | `components/SpreadBand.tsx`       | Calculates and displays spread + mid from best bid/ask           |
| `VenueStatusBadge` | `components/VenueStatusBadge.tsx` | Shows live/stale/disconnected per venue                          |
| `QuotePanel`       | `components/QuotePanel.tsx`       | Dollar input, YES/NO toggle, calls `useQuote`, renders result    |
| `FillBreakdown`    | `components/FillBreakdown.tsx`    | Renders per-venue fill rows from `QuoteResult`                   |

---

## 4. Data Flow

```
Backend (socket.io /orderbook)
  │
  ▼
useOrderbook hook
  ├── socket connects to ws://localhost:8000/orderbook
  ├── emits subscribe({ conditionId, kalshiTicker })
  ├── on 'data': sets AggregatedBook state
  ├── tracks venueStatus { polymarket: 'live'|'stale'|'offline',
  │                         kalshi:     'live'|'stale'|'offline' }
  │   (stale = no change to sub-book for > 5s)
  └── on disconnect: sets status 'offline', attempts reconnect
        (socket.io auto-reconnect handles this)

AggregatedBook state
  │
  ├──▶ OrderBookPanel
  │      BookTable (asks) ──▶ BookRow × N
  │      SpreadBand
  │      BookTable (bids) ──▶ BookRow × N
  │
  └──▶ QuotePanel
         useQuote(book, amount, side)
           └──▶ simulateFill() in lib/quote.ts
                  └──▶ QuoteResult { shares, avgPrice, fills[] }
                         └──▶ FillBreakdown
```

---

## 5. `useOrderbook` Hook

```ts
// hooks/useOrderbook.ts

type VenueStatus = "connecting" | "live" | "stale" | "offline";

type OrderbookState = {
    book: AggregatedBook | null;
    polyStatus: VenueStatus;
    kalshiStatus: VenueStatus;
    socketStatus: "connecting" | "connected" | "disconnected";
};
```

**Stale detection logic:**

- On every `data` event, compare `book.polymarket` with previous `book.polymarket` (shallow)
- If unchanged for 5 000ms → `polyStatus = 'stale'`
- If changed → reset timer, `polyStatus = 'live'`
- Same for `kalshi`

**Note:** A cleaner approach — add `polymarketUpdatedAt` and `kalshiUpdatedAt` ISO timestamps to the BE's `AggregatedBook` payload. The FE can then compare these directly instead of diffing sub-books. **This is a planned BE change** — add to `buildAggregatedBook()` in `microservices/orderbook/orderbook.service.ts`.

---

## 6. `useQuote` Hook + `simulateFill`

```ts
// lib/quote.ts

type FillLine = {
    venue: "polymarket" | "kalshi" | "both";
    price: number;
    shares: number;
    cost: number;
};

type QuoteResult = {
    totalShares: number;
    avgPrice: number;
    totalCost: number;
    fills: FillLine[]; // one per price level consumed
    venueSplit: {
        polymarket: { cost: number; pct: number };
        kalshi: { cost: number; pct: number };
    };
    fullyFilled: boolean; // false if book too thin
};
```

**Algorithm** (walk asks for YES, bids for NO — best price first):

```
remaining = dollarAmount
for each level (sorted best price first):
    available_cost = level.price × level.size
    take = min(remaining, available_cost)
    shares_at_level = take / level.price
    accumulate fills, venueSplit
    remaining -= take
    if remaining ≤ 0: break
fullyFilled = remaining < 0.01
```

Runs in `useMemo` inside `useQuote` — recalculates on every `book` or `amount` change. Pure function so it's trivially testable.

---

## 7. Types (mirrored from BE)

```ts
// lib/types.ts — mirrors packages/backend/utils/types/services.types.ts

export type PriceLevel = { price: string; size: string };
export type AggregatedLevel = PriceLevel & {
    venue: "polymarket" | "kalshi" | "both";
};
export type VenueBook = { bids: PriceLevel[]; asks: PriceLevel[] };
export type AggregatedBook = {
    bids: AggregatedLevel[];
    asks: AggregatedLevel[];
    polymarket: VenueBook;
    kalshi: VenueBook;
    updatedAt: string;
};
```

These are manually mirrored — no shared package. If the BE type changes, update this file.

---

## 8. Market Config

```ts
// config/market.ts
export const MARKET = {
    conditionId: process.env.NEXT_PUBLIC_CONDITION_ID ?? "",
    kalshiTicker: process.env.NEXT_PUBLIC_KALSHI_TICKER ?? "",
    label: process.env.NEXT_PUBLIC_MARKET_LABEL ?? "Prediction Market",
};
```

Market pair is set via env vars in `.env.local`. Hardcoded to a single market — no market browser.

---

## 9. Performance Rules

| Rule                      | Implementation                                              |
| ------------------------- | ----------------------------------------------------------- |
| Stable row keys           | `key={level.price}` on every `BookRow`                      |
| No render-path sorting    | Sort in `useOrderbook` on data event, store sorted arrays   |
| Memoize row component     | `export default React.memo(BookRow)`                        |
| Memoize quote result      | `useMemo(() => simulateFill(...), [book, amount, side])`    |
| No unnecessary re-renders | `book` state uses structural equality check before setState |
| Depth bar widths          | Compute `maxSize` once per render, pass as prop to table    |

---

## 10. Pending Backend Change

Before starting FE venue stall detection, add per-venue timestamps to `AggregatedBook`:

**File:** `packages/backend/microservices/orderbook/orderbook.service.ts`

In `buildAggregatedBook()`, add:

```ts
polymarketUpdatedAt: state.polyUpdatedAt?.toISOString() ?? null,
kalshiUpdatedAt:     state.kalshiUpdatedAt?.toISOString() ?? null,
```

Update `RoomState` to track `polyUpdatedAt: Date | null` and `kalshiUpdatedAt: Date | null`, set on every listener callback.

Update `AggregatedBook` type in both BE and FE accordingly.

---

## 11. Implementation Order

1. **Types + config** — `lib/types.ts`, `config/market.ts`, `.env.local`
2. **`useOrderbook` hook** — socket connection, subscribe, AggregatedBook state, reconnect, stale detection
3. **Order book rendering** — `OrderBookPanel` → `BookTable` → `BookRow` + `SpreadBand`. Get data displaying correctly before any styling.
4. **Header + venue status** — `Header` + `VenueStatusBadge` using `polyStatus`/`kalshiStatus` from hook
5. **Quote panel** — `lib/quote.ts` `simulateFill()`, `useQuote`, `QuotePanel`, `FillBreakdown`
6. **Polish** — depth bars, price flash animation, responsive layout, loading/connecting state

---

## 12. ENV Variables (Frontend)

```
NEXT_PUBLIC_WS_URL          # http://localhost:8000 (backend)
NEXT_PUBLIC_CONDITION_ID    # Polymarket condition ID
NEXT_PUBLIC_KALSHI_TICKER   # Kalshi market ticker
NEXT_PUBLIC_MARKET_LABEL    # Human-readable market name for the header
```

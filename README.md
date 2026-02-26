# Predi-Book

Real-time aggregated order book viewer for **Polymarket** and **Kalshi** prediction markets, with live quote simulation.

---

## Overview

Predi-Book streams live order books from two prediction market venues simultaneously, merges them into a single aggregated view, and simulates fill execution for a given dollar amount — giving traders a unified view of liquidity and realistic slippage estimates across both venues.

**Key capabilities:**

- Live merged order book — bids and asks aggregated across Polymarket + Kalshi at matching price levels
- Per-venue transparency — see which venue contributes each level, and at what split
- Quote simulator — enter a dollar amount, select YES or NO, and see level-by-level fill simulation with avg price, slippage, and price impact
- Venue health monitoring — per-venue connection status, freshness timestamps, message counts, and update rate
- YES/NO perspective toggle — flip the book to view from the NO side with automatically inverted prices
- Cumulative depth chart — visual representation of order book depth across both venues
- Debug panel — raw venue books, normalised combined book, and live stats

---

## Architecture

```
packages/
  backend/    Express + Socket.io relay server
  frontend/   Next.js 15 App Router client
```

### Backend

A lightweight **Express** + **Socket.io** server that:

1. Connects to **Polymarket CLOB** WebSocket (`wss://ws-subscriptions-clob.polymarket.com/ws/market`) as a client — handles `book` (snapshot) and `price_change` (delta) events
2. Connects to **Kalshi** WebSocket (`wss://api.elections.kalshi.com/trade-api/ws/v2`) as a client — handles `orderbook_snapshot` and `orderbook_delta` events; normalises cent prices (1–99) to 0–1 decimals
3. Merges both books with `mergeLevels()` — combines size at matching prices, tags venue as `polymarket | kalshi | both`
4. Emits the `AggregatedBook` payload to all subscribed frontend clients via the `/orderbook` Socket.io namespace

Services use a **singleton-per-market** pattern: `PolymarketService.getOrCreate(conditionId)` and `KalshiService.getOrCreate(ticker)`. When the last subscriber leaves, the outbound WS connections are torn down automatically.

### Frontend

A **Next.js 15** single-page app (App Router) using **React hooks only** — no Redux, Zustand, or React Query.

```
src/
├── app/
│   ├── layout.tsx               Root layout — fonts + metadata
│   ├── globals.css              Tailwind base + price-flash keyframe
│   └── market/[conditionId]/
│       └── page.tsx             Market page — wires all panels
│
├── components/
│   ├── Header.tsx               Market title + venue status badges
│   ├── OrderBookPanel.tsx       Asks + spread band + bids + depth chart
│   ├── BookTable.tsx            Sorted AggregatedLevel[] rows
│   ├── BookRow.tsx              Single price level (React.memo)
│   ├── SpreadBand.tsx           Spread, mid, implied probability, venue comparison
│   ├── DepthChart.tsx           Cumulative depth area chart (recharts)
│   ├── VenueStatusBadge.tsx     live / stale / reconnecting / offline
│   ├── QuotePanel.tsx           Dollar input + YES/NO + fill result
│   ├── FillBreakdown.tsx        Per-venue cost split + slippage + fills table
│   └── DebugPanel.tsx           Raw books + stats (dev mode only)
│
├── hooks/
│   ├── useOrderbook.ts          Socket.io connection, stale detection, rate tracking
│   └── useQuote.ts              simulateFill() wrapper with midPrice
│
└── lib/
    ├── types.ts                 AggregatedBook, PriceLevel, VenueBook
    ├── format.ts                formatPrice, formatSize, formatUsd, formatRelative
    ├── quote.ts                 simulateFill() — pure, walks book levels
    └── socket.ts                Socket.io singleton factory
```

### Data flow

```
Polymarket WS ──┐
                ├──▶ mergeLevels() ──▶ Socket.io /orderbook ──▶ useOrderbook
Kalshi WS ──────┘                                                    │
                                                                     ├──▶ OrderBookPanel
                                                                     └──▶ useQuote ──▶ QuotePanel
```

---

## WebSocket Protocol

**Namespace:** `/orderbook`

| Direction       | Event          | Payload                                         |
| --------------- | -------------- | ----------------------------------------------- |
| Client → Server | `subscribe`    | `{ conditionId: string, kalshiTicker: string }` |
| Client → Server | `unsubscribe`  | `{ conditionId: string, kalshiTicker: string }` |
| Server → Client | `subscribed`   | `{ success: boolean, room?: string }`           |
| Server → Client | `unsubscribed` | `{ success: boolean, room?: string }`           |
| Server → Client | `data`         | `AggregatedBook`                                |

**`AggregatedBook` shape:**

```ts
{
  bids: AggregatedLevel[]   // sorted best-first (desc price)
  asks: AggregatedLevel[]   // sorted best-first (asc price)
  polymarket: VenueBook     // raw Polymarket levels
  kalshi: VenueBook         // raw Kalshi levels
  updatedAt: string         // ISO timestamp of last emission
  snapshotAt?: string       // ISO timestamp of first snapshot
}

type AggregatedLevel = { price: string; size: string; venue: "polymarket" | "kalshi" | "both" }
type PriceLevel      = { price: string; size: string }
type VenueBook       = { bids: PriceLevel[]; asks: PriceLevel[] }
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

### Install

```bash
pnpm install
```

### Environment

**Backend** — `packages/backend/.env`:

```env
PORT=8000
LOG_LEVEL=info
NODE_ENV=development
KALSHI_API_KEY=your_kalshi_api_key
```

**Frontend** — `packages/frontend/.env.local`:

```env
NEXT_PUBLIC_WS_URL=http://localhost:8000
NEXT_PUBLIC_CONDITION_ID=<polymarket_condition_id>
NEXT_PUBLIC_KALSHI_TICKER=<kalshi_ticker>
NEXT_PUBLIC_MARKET_LABEL=My Market
```

### Run

```bash
# Backend (auto-rebuilds on change)
cd packages/backend
pnpm dev

# Frontend
cd packages/frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

For mock data (no live API keys required), set the condition ID to a mock market ID — the backend falls back to a local mock generator with realistic drift and variable depth.

---

## Tech Stack

| Layer      | Choice                   |
| ---------- | ------------------------ |
| Backend    | Express + Socket.io + ws |
| Frontend   | Next.js 15 (App Router)  |
| Styling    | Tailwind CSS v4          |
| Charts     | recharts                 |
| Validation | yup (backend)            |
| Monorepo   | pnpm workspaces          |

---

## Features

### Order Book

- **Aggregated view** — bids and asks merged across both venues; shared price levels show combined size with PM/KX percentage split
- **YES / NO toggle** — flip perspective; NO prices are inverted (`1 − price`)
- **Per-venue view** — switch to Polymarket-only or Kalshi-only tabs
- **Liquidity walls** — levels with size > 2× average are highlighted in orange
- **Cumulative depth** — hover any row to see running total; depth chart below the book
- **Depth imbalance** — bid vs ask depth comparison across the top 10 levels
- **Quote-fill shading** — rows consumed by the active quote simulation are highlighted in amber

### Spread Band

- Spread, mid price, and implied probability (%)
- Best bid/ask per venue with winner indicator (★)
- Cross-venue improvement chip when aggregation beats either solo venue
- Aggregated liquidity advantage — shows % depth improvement over solo venues
- Mid price drift indicator (↑/↓ with %) over a 2-minute rolling window

### Quote Simulator

- Enter a dollar amount; choose YES or NO
- Level-by-level fill breakdown with venue badge per fill
- Effective avg price vs mid — slippage coloured amber (>1%) / red (>3%)
- Price impact bar — proportion of total book depth consumed
- Partial fill warning with max fillable amount when book is thin

### Venue Health

- Per-venue status badge: `live` / `stale` / `reconnecting` / `offline`
- Freshness timestamp with colour coding: <2s green, 2–5s amber, >5s red
- Per-venue message count and rolling update rate (upd/s)
- Snapshot timestamp (time since last full book snapshot)
- Reconnect banner with attempt counter on degraded connections

### Developer Tools

- **Dev mode** toggle (top-right) reveals a debug panel with:
    - Raw Polymarket book (JSON)
    - Raw Kalshi book (JSON)
    - Normalised combined book
    - Live stats: message counts, last update timestamps, venue status

---

## Project Structure Notes

- No database or Redis — purely in-memory stateful relay
- No REST routes on the backend except `GET /healthcheck`
- Polymarket market metadata (title, token IDs) fetched via CLOB REST at subscription time
- Kalshi prices are in cents (1–99); normalised to 0–1 before emitting
- Frontend uses React hooks only — no external state management library
- `simulateFill()` in `lib/quote.ts` is a pure function — walks sorted levels, accumulates fills until the dollar amount is consumed

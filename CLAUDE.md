# Predi-Book

Real-time aggregated order book viewer for Polymarket + Kalshi prediction markets.

## Objective

See `objective.pdf`. The core goal is a frontend-heavy tool that displays a merged live order book across both venues, with quote simulation (simulated fills).

---

## Monorepo Structure

```
packages/
  backend/   Express + Socket.io server — WebSocket relay for order book feeds
  frontend/  Next.js app (to be built)
```

---

## Backend (`packages/backend`)

### Stack
- **Express** — minimal HTTP server (healthcheck only, no REST routes)
- **Socket.io** — WebSocket server for streaming order books to clients
- **ws** — outbound WebSocket client to Polymarket CLOB and Kalshi
- **yup** — WS payload validation

### Architecture

**Entry point**: `index.ts`

**Services** (`services/`):
- `polymarket.service.ts` — Singleton per `conditionId`. Connects to Polymarket CLOB WS (`wss://ws-subscriptions-clob.polymarket.com/ws/market`). Handles `book` (snapshot) and `price_change` (delta) events. Also exposes `fetchMarketInfo()` static helper via CLOB REST.
- `kalshi.service.ts` — Singleton per `ticker`. Connects to Kalshi WS (`wss://api.elections.kalshi.com/trade-api/ws/v2`). Handles `orderbook_snapshot` and `orderbook_delta` events. Normalises cent prices to 0–1 decimals.
- `ws.service.ts` — Socket.io server setup. Accepts route registrations at init time.
- `stream.service.ts` — Subscription metadata tracker (room → socket mappings, room cleanup callbacks). No data emission.
- `logger.service.ts` — Scoped JSON logger.

**Singleton pattern** (both venue services):
- `static getOrCreate(key)` — returns existing instance or creates + connects a new one
- `addListener(cb)` / `removeListener(cb)` — fan-out; auto-stops and removes from registry when listener count hits 0

**Microservices** (`microservices/`):
- `orderbook/` — Socket.io namespace `/orderbook`
  - Manages `activeRooms` map (one entry per market pair with subscribers)
  - On subscribe: calls `PolymarketService.getOrCreate` + `KalshiService.getOrCreate`, registers per-room listeners, starts emitting merged books
  - On last unsubscribe: `StreamService` cleanup fires → `removeListener` on both singletons → connections tear down
  - Contains `mergeLevels` aggregation (combines bids/asks at matching prices, tags venue as `polymarket | kalshi | both`)

**Types**: `utils/types/services.types.ts`
**Error utilities**: `utils/errors.ts` (inlined — no `common` package dependency)

### WebSocket Protocol

Namespace: `/orderbook`

| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `subscribe` | `{ conditionId: string, kalshiTicker: string }` |
| Client → Server | `unsubscribe` | `{ conditionId: string, kalshiTicker: string }` |
| Server → Client | `subscribed` | `{ success: boolean, room?: string, message?: string }` |
| Server → Client | `unsubscribed` | `{ success: boolean, room?: string }` |
| Server → Client | `data` | `AggregatedBook` |

`AggregatedBook` shape:
```ts
{
  bids: { price: string, size: string, venue: "polymarket"|"kalshi"|"both" }[],
  asks: { price: string, size: string, venue: "polymarket"|"kalshi"|"both" }[],
  polymarket: { bids: PriceLevel[], asks: PriceLevel[] },
  kalshi:     { bids: PriceLevel[], asks: PriceLevel[] },
  updatedAt: string
}
```

### ENV

```
NODE_ENV
PORT          (default 8000)
LOG_LEVEL
KALSHI_API_KEY
```

---

## Key Decisions

- No database, no Redis — purely stateful in-memory relay
- No REST routes except `/healthcheck`
- `common` workspace package removed — error utilities inlined in `utils/errors.ts`
- Polymarket market metadata (title, token IDs) fetched via CLOB REST at subscription time — no subgraph
- Kalshi prices are in cents (1–99); normalised to 0–1 before emitting

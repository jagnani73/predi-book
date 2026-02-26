# Prediction Market Aggregator — UI & UX Improvements Spec

This document outlines recommended improvements to enhance:

- Aggregation transparency
- Venue health visibility
- Liquidity clarity
- Quote correctness
- Long-running robustness
- Debuggability

---

# 1. Venue Health & Freshness Indicators

## 1.1 Per-Venue Last Updated Timestamp

### Add

Display a dynamic timestamp per venue:

Polymarket  
Last update: 1.4s ago

Kalshi  
Last update: 3.2s ago

### Behavior

- < 2s → green
- 2–5s → amber
- > 5s → red

### Implementation

- Store `lastUpdateTs` per venue.
- Update on each book message.
- Recalculate elapsed time via `setInterval` every 1 second.

```ts
const [lastUpdateTs, setLastUpdateTs] = useState<Record<string, number>>({});

Date.now() - lastUpdateTs["poly"];
```

## 1.2 Venue Connection Status State

### Add

Explicit connection states per venue:

- CONNECTED
- STALE
- DISCONNECTED
- RECONNECTING

Display a status badge near each venue tab.

### Behavior

- No update > threshold → STALE
- WebSocket closed → DISCONNECTED
- Attempting reconnect → RECONNECTING
- Receiving updates → CONNECTED

### Implementation

Maintain a per-venue state machine and update based on WebSocket lifecycle events.

```ts
type VenueStatus = "connected" | "stale" | "disconnected" | "reconnecting";
```

## 1.3 Total Messages Received

### Add

Display cumulative message count per venue:

Polymarket: 12,431 updates  
Kalshi: 10,993 updates

### Purpose

Signals long-running stability and streaming correctness.

### Implementation

Increment counter per update event.

```ts
const [messageCount, setMessageCount] = useState<Record<string, number>>({});
```

---

# 2. Aggregation Transparency

## 2.1 Explicit Best Bid / Ask Attribution

### Add

Above the book:

Best Bid: 0.59 (Polymarket)  
Best Ask: 0.64 (Kalshi)

### Purpose

Clarifies which venue sets the top of book.

### Implementation

Compute combined best levels and store origin venue.

```ts
const bestBid = max([...polyBids, ...kalshiBids]);
```

## 2.2 Cross-Venue Price Improvement Indicator

### Add

If aggregation improves price:

Aggregated book improves best ask by 0.01 vs Polymarket alone.

### Purpose

Demonstrates value of aggregation.

## 2.3 Per-Level Venue Contribution

### Add

At each price level show:

Total size: 1,200  
PM: 60%  
KX: 40%

### Purpose

Improves liquidity distribution visibility.

---

# 3. Liquidity Clarity Improvements

## 3.1 Cumulative Depth Display

### Add

On hover or side column:

Cumulative size at this level: 4,832

### Purpose

Helps users understand liquidity concentration.

### Implementation

Precompute cumulative sums during render.

## 3.2 Depth Imbalance Indicator

### Add

Bid depth (top N): 4,921  
Ask depth (top N): 3,102  
Imbalance: +37%

### Purpose

Provides directional market signal.

## 3.3 Mini Depth Curve Chart

### Add

Small cumulative depth chart beside book.

### Purpose

Visually highlights liquidity walls.

---

# 4. Quote Engine Enhancements

## 4.1 Execution Path Breakdown

### Add

Execution breakdown:

- 1.12 @ 0.64 (PM)
- 1.86 @ 0.65 (KX)

### Purpose

Shows level-by-level fill simulation.

## 4.2 Slippage Preview

### Add

Effective price: 0.638  
Mid price: 0.620  
Slippage: +2.9%

### Purpose

Improves pricing transparency.

## 4.3 Liquidity Exhaustion Warning

### Add

If order exceeds depth:

Insufficient liquidity to fully fill order.

### Purpose

Prevents misleading quotes.

## 4.4 Price Impact Visualization

### Add

Bar or indicator showing how deep into the book the order consumes liquidity.

---

# 5. Long-Running Behavior Indicators

## 5.1 Snapshot Timestamp

### Add

Last full snapshot: 2m ago

### Purpose

Signals state recovery and resilience.

## 5.2 Update Frequency Indicator

### Add

Updates/sec: 4.2 (rolling average)

### Purpose

Shows streaming stability.

## 5.3 Reconnect Banner

### Add

If venue becomes stale:

Kalshi connection stale — reconnecting...

### Purpose

Explicit degradation visibility.

## 5.4 Memory Guard

### Add

Current book levels: 12  
Max allowed: 50

### Purpose

Signals bounded memory handling.

---

# 6. Market Structure Enhancements

## 6.1 YES / NO Book Perspective Toggle

Allow flipping the order book between YES and NO.

## 6.2 Implied Probability Display

Mid: 0.62  
Implied probability: 62%

## 6.3 Tick Size Disclosure

Display normalized tick size:

Tick size: 0.01

---

# 7. Debug Mode Toggle

Add a "Dev Mode" toggle that reveals:

- Raw Polymarket book
- Raw Kalshi book
- Normalized combined book
- Message counts
- Last update timestamps
- Venue status states

---

# 8. Mock Data Realism Improvements

## 8.1 Variable Depth Levels

Randomize number of levels per update.

```ts
const levels = Math.floor(Math.random() \* 5) + 2;
```

## 8.2 Random Order Removal

Occasionally remove a level to simulate cancels.

## 8.3 Gradual Center Drift

Slowly shift price center over time to simulate trending markets.

```ts
centre += (Math.random() - 0.5) * 0.002;
```

---

# High-Impact Additions (If Time Constrained)

If only implementing a few upgrades, prioritize:

1. Per-venue last updated + connection state
2. Execution breakdown per price level
3. Cumulative depth display

These provide the strongest perceived improvement in correctness and robustness.

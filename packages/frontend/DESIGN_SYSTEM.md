# Predi-Book — Master Design System

> **Source of Truth** for all UI/UX decisions in the predi-book frontend.
> Stack: Next.js 15 + Tailwind CSS v4.

---

## 1. Brand Identity

| Attribute    | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| Product Type | Prediction Market Aggregator / Data Terminal                  |
| Aesthetic    | Dark-mode, clean fintech. Professional, calm, data-dense.     |
| Personality  | Precise, informative, trustworthy — NOT crypto-degen or noisy |
| Target User  | Someone who wants to understand prediction market liquidity   |

The design language is closer to a trading terminal (Bloomberg, TradingView) than a DeFi degen app. No neon glow overload. Colour is used purposefully to communicate meaning (venue, direction, status), not decoration.

---

## 2. Color Palette

### Core Semantic Colors

```css
--color-bg: #09090b /* zinc-950 — page background */ --color-surface-1: #18181b
    /* zinc-900 — panels, cards */ --color-surface-2: #27272a
    /* zinc-800 — hover, nested rows */
    --color-border: rgba(255, 255, 255, 0.08) /* subtle dividers */
    --color-border-strong: rgba(255, 255, 255, 0.14) /* card outlines */
    /* Direction */ --color-yes: #22c55e /* green-500 — YES outcome / bids */
    --color-no: #ef4444 /* red-500   — NO outcome / asks */ /* Venue identity */
    --color-polymarket: #6366f1 /* indigo-500 — Polymarket accent */
    --color-kalshi: #8b5cf6 /* violet-500 — Kalshi accent */
    --color-both: #a78bfa /* violet-400 — levels shared by both venues */
    /* Text hierarchy */ --color-text-primary: #ffffff
    --color-text-secondary: #a1a1aa /* zinc-400 */ --color-text-muted: #71717a
    /* zinc-500 */ --color-text-disabled: #52525b /* zinc-600 */;
```

### Color Meaning Rules

| Color    | Means                                     |
| -------- | ----------------------------------------- |
| Green    | YES outcome, bids, positive               |
| Red      | NO outcome, asks, negative/danger         |
| Indigo   | Polymarket-only liquidity                 |
| Violet   | Kalshi-only liquidity                     |
| Violet-4 | Liquidity present at both venues (merged) |
| Zinc     | Neutral data, labels, infrastructure      |

**Rule:** Venue identity must always be communicated with colour AND a text label/icon. Never rely on colour alone (accessibility).

### Depth Bar Fills

```css
/* Bid row background (YES/buy side) */
--depth-bid-fill: rgba(34, 197, 94, 0.08) /* green-500/8 */
    --depth-bid-fill-hover: rgba(34, 197, 94, 0.14)
    /* Ask row background (NO/sell side) */
    --depth-ask-fill: rgba(239, 68, 68, 0.08) /* red-500/8 */
    --depth-ask-fill-hover: rgba(239, 68, 68, 0.14);
```

---

## 3. Typography

### Font Stack

| Role        | Font               | Weight  | Class                                            |
| ----------- | ------------------ | ------- | ------------------------------------------------ |
| UI / Labels | **Inter**          | 400–700 | `font-sans`                                      |
| Headings    | **Inter**          | 700–800 | `font-bold tracking-tight`                       |
| Data / Mono | **JetBrains Mono** | 400–600 | `font-mono`                                      |
| Labels      | **Inter**          | 600     | `font-semibold tracking-wider uppercase text-xs` |

**Rule:** All prices, sizes, percentages, timestamps, and numeric values must use `font-mono`. This prevents layout shift as digits update and signals "this is live data."

### Type Scale

| Level | Size          | Weight | Usage                                |
| ----- | ------------- | ------ | ------------------------------------ |
| H1    | `text-xl`     | 700    | Market question title                |
| H2    | `text-base`   | 600    | Panel headers (ORDER BOOK, QUOTE)    |
| Body  | `text-sm`     | 400    | Descriptions, labels                 |
| Data  | `text-sm`     | 500    | Order book prices and sizes (mono)   |
| Label | `text-xs`     | 600    | `UPPERCASE TRACKING` section headers |
| Micro | `text-[11px]` | 500    | Venue tags, timestamps, status text  |

---

## 4. Spacing System

Tailwind 4px base scale. Key layout constants:

| Token       | Value  | Usage                           |
| ----------- | ------ | ------------------------------- |
| `p-4`       | 16px   | Panel padding                   |
| `gap-1`     | 4px    | Between order book rows         |
| `gap-2`     | 8px    | Within row (price / size / bar) |
| `gap-4`     | 16px   | Between major sections          |
| `gap-6`     | 24px   | Between panels                  |
| `max-w-5xl` | 1024px | Content container max-width     |

---

## 5. Z-Index Scale

```
z-0   — Static backgrounds, depth bars
z-10  — Order book rows (normal)
z-20  — Spread band, sticky column headers
z-30  — Header (sticky top-0)
z-50  — Tooltips, connection status toasts
```

---

## 6. Component Patterns

### 6.1 Order Book Row

```
Container:  flex items-center gap-2 px-3 py-1 relative cursor-default
            text-sm font-mono

Depth bar:  absolute inset-y-0 right-0 (bid) or left-0 (ask)
            width proportional to size / max visible size
            bg: --depth-bid-fill or --depth-ask-fill
            pointer-events-none z-0

Price:      font-mono font-medium text-sm
            bids: text-green-400
            asks: text-red-400

Size:       font-mono text-sm text-zinc-300 text-right

Venue tag:  text-[11px] font-semibold rounded px-1.5 py-0.5
            polymarket: bg-indigo-500/15 text-indigo-400
            kalshi:     bg-violet-500/15 text-violet-400
            both:       bg-violet-400/15 text-violet-300

Flash:      bg-white/10 opacity fades 0.3→0 over 600ms on size change
```

### 6.2 Spread Band

```
Container:  flex items-center justify-center gap-3 py-2 border-y border-white/8
            text-xs font-mono text-zinc-400
Content:    "SPREAD  0.04  ·  MID  0.62"
```

### 6.3 Venue Status Badge

```
Connected:    bg-green-500/10 text-green-400   + dot (filled green)
Stale:        bg-yellow-500/10 text-yellow-400 + dot (pulsing yellow)
Disconnected: bg-red-500/10 text-red-400       + dot (filled red)

Dot:          w-1.5 h-1.5 rounded-full
Stale pulse:  animate-pulse on dot only
Text:         "Polymarket  ●  live" or "Kalshi  ●  stale"
```

Rule: Status must be communicated with both colour AND text state label. Never colour alone.

### 6.4 Quote Panel Input

```
Dollar input:
  Base:     border border-zinc-700 bg-zinc-900 rounded-lg px-3 py-2
            font-mono text-sm text-white placeholder:text-zinc-600
  Focus:    border-indigo-500 ring-1 ring-indigo-500/30 outline-none
  Prefix:   "$" in zinc-500 (not inside input, left-side label)

YES/NO toggle:
  Container: grid grid-cols-2 rounded-lg border border-zinc-700 p-0.5
  Active YES: bg-green-500/20 text-green-300 border border-green-500/30
  Active NO:  bg-red-500/20 text-red-300 border border-red-500/30
  Inactive:   text-zinc-500 hover:text-zinc-300
```

### 6.5 Quote Result

```
Shares:       text-2xl font-mono font-bold text-white
Avg price:    text-sm font-mono text-zinc-400
Fill breakdown row:
  Venue badge + amount + percentage
  e.g. [Polymarket]  $56.00  80%
       [Kalshi]      $14.00  20%
```

### 6.6 Panel / Card

```
Base:     rounded-xl border border-white/8 bg-zinc-900
Header:   border-b border-white/6 px-4 py-3
          text-xs font-semibold tracking-wider uppercase text-zinc-500
Body:     px-0 (order book rows use own padding)
```

### 6.7 Loading / Skeleton

```
Skeleton row:  bg-zinc-800 animate-pulse rounded h-6 w-full
Spinner:       border-2 border-zinc-700 border-t-indigo-500
               rounded-full animate-spin h-5 w-5
```

### 6.8 Scrollbar

```
Width:  4px
Track:  #09090b
Thumb:  #27272a → hover #3f3f46
Radius: 2px
```

---

## 7. Animation Guidelines

### Timing

| Interaction             | Duration | Easing     |
| ----------------------- | -------- | ---------- |
| Hover state (color)     | 100ms    | `ease`     |
| Price flash (bg fade)   | 600ms    | `ease-out` |
| Row entrance            | 150ms    | `ease-out` |
| Status badge transition | 200ms    | `ease`     |
| Panel transitions       | 150ms    | `ease`     |

### Rules

- **Price flash:** When a row's size changes, flash `bg-white/10` then fade to transparent over 600ms. Use a CSS transition on `background-color`, not JS interval.
- **No layout shift on update.** Rows must have stable keys (use `price` string). The DOM structure must not change on every tick — only cell text content updates.
- **No sorting on every tick.** Sort the book array once on `data` event, memoize. Don't sort inside the render path.
- Respect `prefers-reduced-motion` — disable flash animation entirely.

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

## 8. Iconography

| Rule               | Specification                             |
| ------------------ | ----------------------------------------- |
| Library            | **Lucide React** only                     |
| Size standard      | `h-3.5 w-3.5` (small), `h-4 w-4` (medium) |
| Color              | `currentColor`                            |
| No emojis as icons | Use SVG equivalents                       |

Key icons used: `TrendingUp`, `TrendingDown`, `Wifi`, `WifiOff`, `Clock`, `Activity`, `ChevronUp`, `ChevronDown`

---

## 9. Accessibility Standards

| Requirement              | Implementation                                                       |
| ------------------------ | -------------------------------------------------------------------- |
| Color contrast           | Min 4.5:1 for text (WCAG AA)                                         |
| Focus rings              | `focus-visible:ring-2 focus-visible:ring-indigo-500/50 outline-none` |
| Touch targets            | Min 44×44px for interactive elements                                 |
| `aria-label`             | Required on icon-only buttons and status indicators                  |
| Live price updates       | Order book table rows: `aria-live="polite"` on size cell             |
| Venue status             | `role="status" aria-label="Polymarket: live"` on status badge        |
| Keyboard nav             | Quote input and YES/NO toggle fully keyboard accessible              |
| `prefers-reduced-motion` | Disable flash and entrance animations                                |

**Critical:** Venue identity must never be communicated by colour alone. Every venue-coloured element must also carry a text label ("Polymarket", "Kalshi") or an `aria-label`.

---

## 10. Responsive Breakpoints

This is a data terminal — primary target is desktop. Mobile is secondary.

| Breakpoint | Value  | Layout change                             |
| ---------- | ------ | ----------------------------------------- |
| `md`       | 768px  | Stack order book + quote panel vertically |
| `lg`       | 1024px | Side-by-side two-column layout            |

Desktop (lg+): Order book left (60%) | Quote panel right (40%)
Mobile (< lg): Order book full width, Quote panel below

---

## 11. Data Display Patterns

### Price Formatting

```
All prices are 0–1 probability values:
  Display as: "0.65" (2 decimal places minimum, 4 for tight spreads)
  Never as:   "65%" in the order book (confusing with USDC amounts)
  Spread:     absolute difference, e.g. "0.04"
  Mid price:  average of best bid + best ask
```

### Size Formatting

```
< 100:    "42.50"
100–999:  "142"
≥ 1000:   "1.4K"
```

### Venue Tag Labels

```
polymarket → "PM"  (abbreviated in tight spaces) or "Polymarket"
kalshi     → "KX"  (abbreviated) or "Kalshi"
both       → "AGG" (abbreviated) or both venue tags side by side
```

---

## 12. Anti-Patterns (Do NOT do these)

| Anti-Pattern                                    | Why                                         | Fix                                            |
| ----------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| Re-sorting book array inside render             | Causes flicker and layout shift every tick  | Sort once in `useOrderbook`, memoize           |
| Using `key={index}` on order book rows          | React loses row identity, flashes all rows  | Use `key={level.price}`                        |
| Colour-only venue identity                      | Inaccessible to colour-blind users          | Always pair colour with text label             |
| Displaying stale data without visual indication | User can't tell if book is live             | Show venue stale badge after 5s silence        |
| Resetting book state on every reconnect flash   | Causes jarring blank book                   | Keep last book state until new data arrives    |
| Sorting asks descending (high→low)              | Confusing — asks should show cheapest first | Asks: price ascending. Bids: price descending. |
| Running quote calculation in render             | Expensive on every keystroke                | Run in `useMemo` or `useQuote` hook            |
| Showing 0 size rows                             | Noise                                       | Filter out levels with size === "0"            |

---

## 13. Page Structure

```
<main>                                     # bg-zinc-950 min-h-screen
  <header sticky z-30>                     # backdrop-blur-md border-b
    market title + venue status badges
  <div.content max-w-5xl mx-auto px-4>
    <div.layout lg:grid lg:grid-cols-[3fr_2fr] gap-6 py-6>
      <OrderBookPanel>                     # left column
        <BookTable side="asks" />          # reversed, asks top
        <SpreadBand />
        <BookTable side="bids" />
      </OrderBookPanel>
      <QuotePanel>                         # right column (sticky on desktop)
        <QuoteInput />
        <QuoteSummary />
        <FillBreakdown />
      </QuotePanel>
</main>
```

---

## 14. Design Checklist (Pre-Delivery)

### Visual Quality

- [ ] Prices and sizes use `font-mono`
- [ ] Venue identity uses colour + text label, never colour alone
- [ ] Depth bars render behind text (z-0), not over it
- [ ] Spread band clearly separates bids and asks
- [ ] No emojis used as icons

### Data Correctness

- [ ] Asks sorted ascending (cheapest first, nearest spread at bottom)
- [ ] Bids sorted descending (highest first, nearest spread at top)
- [ ] Prices display as 0–1 decimals (not percentages)
- [ ] Stale venue shows visual indicator after 5s of no updates
- [ ] Reconnect preserves last known book state (no blank flash)

### Interaction

- [ ] Quote input updates result in real time (no submit button needed)
- [ ] YES/NO toggle is keyboard accessible
- [ ] All interactive elements have `cursor-pointer`

### Performance

- [ ] Order book rows use stable `key={level.price}` (not index)
- [ ] Book array sorted in hook, not in render
- [ ] `React.memo` applied to `BookRow`

### Accessibility

- [ ] Price cells have `aria-live="polite"`
- [ ] Venue status badges have `role="status"` and `aria-label`
- [ ] `prefers-reduced-motion` disables flash animations
- [ ] Focus rings visible on all interactive elements

# PortWhizz — Freight Forwarding Demo

**Run the shipment. Not the spreadsheet.**
*One shipment. One job file. One source of truth.*

An interactive product demo for the PortWhizz **Freight Forwarding** module: the digital operating layer a freight forwarder uses to run a job from enquiry through to settlement.

Every record, rate, margin, milestone and document in this environment is **simulated**.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm run typecheck    # tsc --noEmit, strict
npm test             # metric reconciliation + product-boundary guard
npm run lint
```

Requires Node 18+. No environment variables, no backend, no network calls — the whole demo runs from seeded local state.

---

## The demo path

The product makes its argument in a particular order. `/freight-forwarding-demo/dashboard/help` has this walkthrough in-app.

| # | Do this | What it demonstrates |
|---|---|---|
| 1 | Land on `/freight-forwarding-demo` | The first view is a **working freight search bar** over real harbour footage, not a headline over a gradient. Type a port code, a port name or a city — all three land on the same option. |
| 2 | Open **Cargo & equipment** | Tactile equipment tiles and a quantity stepper. Switch the tab to Packages (Air, LCL) and the cargo fields change with the mode — **chargeable weight is derived**, not typed. |
| 3 | **Search freight options** | Three simulated options. Expand the charge categories: *confirmed*, *conditional* and *exposure-only* are three different things. |
| 4 | Select one → **Create Enquiry** | One transaction mints the enquiry, creates a linked job, writes a timeline event, activity and audit records, and pre-populates the quote builder. **Reload the page — it survives.** |
| 5 | Scroll through the journey | Scroll position scrubs the vessel's approach frame by frame, with a caption per beat. Below it, the **customer view** of `PW-2026-004281` is assembled from the same records the app renders — the timeline is filtered on `customerVisible`, not rewritten for the brochure. |
| 6 | **Track an existing shipment** | Lands on `PW-2026-004281` — 15-event timeline, two containers (one with VGM outstanding), full charge structure, audit trail. |
| 7 | Resolve the **Shipping Instruction Cutoff** exception | **One action, six consequences** — queue, job risk, timeline, activity, audit, dashboard count. This is the whole product argument. |
| 8 | Match a vendor bill, raise the invoice | Margin basis moves *estimated → provisional → final*; the closure checklist derives its state from the job file. |
| 9 | Switch roles in the topbar | Six roles, same records. Arjun opens on cutoffs, Meera on margin, Priya sees only her own shipments. |

---

## Product boundary — freight forwarding only

This demo is **strictly** the Freight Forwarding module. The customs checklist product is separate and does not appear here in any form.

Customs exists as exactly one thing: **External customs coordination** — a status on the freight job, with an assigned partner and an update history. Five statuses, and nothing else:

```
External customs partner required
Customs partner assigned
Clearance status pending partner update
Clearance dependency open
Partner clearance update received
```

**This is enforced mechanically, not by convention.** `lib/boundaries.ts` holds the allow-list and a forbidden-term list; `tests/boundaries.test.ts` walks `app/`, `components/`, `data/`, `store/`, `hooks/` and `types/` and **fails the build** if any of the excluded product's vocabulary appears. It has already caught one violation in this repo's own copy.

**Positioning:** PortWhizz owns the digital layer — enquiry, quote, booking, cargo, milestones, exceptions, documents, costs, margin, audit, partner coordination. Carriers, transporters, terminals, CFS operators, warehouses, clearance partners and financiers execute. PortWhizz is never presented as a carrier, transporter, warehouse, customs broker, lender, government platform or live marketplace.

---

## Two rules that keep the demo from rotting

**1 · The demo clock is fixed.** `lib/demo-clock.ts` pins `DEMO_NOW` to **16 Aug 2026, 09:20 IST**. Every countdown, age and "arriving today" resolves through it. That is what makes the hero shipment permanently mid-ocean, the 15-event timeline read correctly, and the headline cutoff read exactly `2h 18m` rather than approximately. `useDemoClock()` ticks from that instant only after mount, so server and client HTML always agree.

**2 · Nothing is random.** `lib/seed.ts` provides a seeded PRNG. There is no `Math.random()` or bare `new Date()` in any render path, so the same inputs always produce the same options, and a figure pointed at in a meeting is still there afterwards.

---

## Architecture

```
app/
  freight-forwarding-demo/
    page.tsx                    customer-facing landing — light theme, harbour footage
    dashboard/
      layout.tsx                app shell — sidebar, topbar, ⌘K palette
      page.tsx                  role-ordered operations dashboard
      shipments/[id]            8 tabs, deep-linkable via ?tab=
      enquiries · quotes/[id] · bookings · cargo · milestones · exceptions
      job-costs · invoices · receivables · credit · rates
      control-tower · customer-portal · analytics
      documents/[id] · legal · clearance-handoff · settings · help
components/  brand · ui · search · intake · marketing · globe · shell · ops · shipment · exceptions
data/        seeded records — ports, lanes, jobs, quotes, bookings, exceptions, documents…
lib/         demo-clock · seed · format · motion · lifecycle · boundaries · geo · indicative-options
store/       freight-store (persisted) · session-store · intake-store · selectors · hooks
public/media harbour footage — loop, scrub and poster encodes
```

**Load-bearing files**

| File | Why it matters |
|---|---|
| `lib/lifecycle.ts` | All six state machines. The UI asks `nextStates(current)` and renders the answer — buttons can never offer an illegal transition. |
| `store/freight-store.ts` | `withAudit()` wraps every mutation, so an activity + audit event is structurally unavoidable. |
| `store/hooks.ts` | Derived-state hooks. Selectors build fresh objects; passing one straight to `useFreightStore` causes an infinite render loop under zustand v5. Everything derives through here. |
| `store/selectors.ts` | `selectJobFile()` assembles the one-source-of-truth view. Metrics are **computed, never typed into a tile**. |
| `lib/boundaries.ts` | The forbidden-term list behind the guard test. |
| `data/copy.ts` | Every disclaimer, in one auditable place. |

### Two surfaces, one design system

**The customer surface is light. The operations console is dark.** Both are the same components and the same semantic tokens — `bg-surface`, `text-text`, `border-hairline`, `bg-signal` — re-declared on a scope:

```
[data-pw-theme='light'] { --color-ink: #f7fafc; --color-signal: #1769ff; … }
```

`components/providers/light-scope.tsx` puts that attribute on the marketing wrapper (so the first paint is already light, with no flash) and on `<html>` (so overscroll and the scrollbar gutter are light too), then removes it on unmount. Navigating from the landing page into the dashboard leaves the console exactly as dark as it was.

Two consequences worth knowing before editing:

- **`text-on-accent`, not `text-ink`, for a label on a filled accent.** Dark-theme fills are bright and take near-black text; light-theme fills are saturated and take white. `--color-ink` is the *page ground*, and using it for this inverts illegibly the moment the theme flips.
- **Portalled content inherits from `<html>`**, which is why dialogs and popovers opened from the landing page come out light. The one belt-and-braces `data-pw-theme="light"` on the cargo popover covers the window before the effect runs.

Every light value is contrast-checked against white: text 15.7:1, muted 6.1:1, signal 4.7:1, route 5.4:1, amber 5.2:1, critical 5.7:1.

### The harbour footage

`public/media/` holds three encodes of one clip of a container vessel coming alongside:

| File | Use | Notes |
|---|---|---|
| `port-approach.mp4` (2.0 MB) | hero loop | 1440×960, cut so the last frame cross-dissolves into the first — it loops with no jump |
| `port-approach-sm.mp4` (836 KB) | hero loop, ≤700px | same cut at 960×640 |
| `port-approach-scrub.mp4` (2.3 MB) | scroll story | 1024×684, **all-intra** (`-g 1`) so scroll-driven seeking lands on a frame instantly instead of decoding back to a keyframe |
| `port-approach-poster.jpg` (205 KB) | poster + fallback | the loop's wrap frame, so the video fades in over an identical still |

The source clip carried two burned-in watermarks and a pillarboxed overlay on both edges. Those are cropped out of the delivered encodes rather than covered up, and the clip is trimmed before the point where the source dissolves into a second, visibly warped scene. Re-cutting from a new source means redoing the crop, the trim and the loop dissolve together — the loop only works because the trim and the dissolve agree.

### Resilience

- **Reduced motion** → the hero holds its poster frame, the scroll story becomes a still plate with the captions stacked and readable, and transitions collapse to fades. The branch is taken *after* mount (`hooks/use-safe-reduced-motion.ts`), because choosing markup from a media query the server cannot read is a hydration mismatch for exactly the users who asked for less motion.
- **Video blocked, refused or `saveData`** → the poster is already in the HTML and simply stays. There is no state in which the hero is a black rectangle.
- **Narrow viewports** → the scroll story drops to the static plate (2.3 MB is not a mobile asset), the search bar stacks, mode labels shorten so all three fit without a scrolling tab strip, and the hero wash turns vertical because a diagonal cannot clear full-width text.
- **No WebGL** → the 3D network falls back to a 2D map with the same ports, lanes and exception markers.

---

## Metrics reconcile to the seed

The headline figures are computed from the seeded records and **locked by tests** — change the seed and you must consciously change the expectation:

| Metric | Value |
|---|---|
| Active Freight Jobs | 128 |
| At Risk | 07 |
| Arriving Today | 12 |
| Cutoffs Today | 09 |
| Open Exceptions | 14 |
| Pending Vendor Bills | 18 |
| Estimated Margin | ₹8.42L |

All 14 open exceptions are authored in full, so **every row in the queue opens a real record** — the tile count never exceeds the records behind it. Where a headline exceeds what is authored (128 active jobs against 24 detailed ones), the difference is a named constant, not a magic number.

`tests/metrics.test.ts` also asserts the §17 worked example holds: Ocean Freight margin USD 300, Origin Handling USD 80, Documentation USD 25.

---

## Known deviation from the brief

The brief specifies an estimated margin of **₹1.82L** on the hero shipment, and separately fixes its charge lines (Ocean Freight 1200/1350, Origin Handling 180/220, Documentation 50/75). Those two are not compatible: on a 2 × 40HC Shanghai–Nhava Sheva job those lines produce a sell of roughly ₹3.9L, so ₹1.82L would be a **46% freight margin** — several times what the trade actually earns.

The demo shows the **honest computed figure** (~₹65K, ~16%), which reconciles with the charge structure on the Costs tab. Pinning it to ₹1.82L is a one-line change in `data/quotes.ts` if the headline matters more than the internal consistency.

---

*Illustrative demo document set. Requires legal review before production use.*

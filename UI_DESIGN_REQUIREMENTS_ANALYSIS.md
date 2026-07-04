# TaskFlow — UI / Design Requirements Analysis

> A senior-engineer + design-systems audit of the TaskFlow client (`client/`),
> read component-by-component and page-by-page (2026-07-04). It covers what the
> UI has, what it lacks against a professional SaaS design bar, and the concrete
> requirements to close the gap. Every finding cites the file it came from.

**Legend:** 🔴 must fix before calling the UI professional · 🟠 high · 🟡 medium · ⚪ polish

---

## 1. Executive summary

The UI has a **genuinely good foundation for its size**: a documented token file
(`lib/ui.ts`), shared primitives (`Card`, `Badge`, `StatCard`, `SectionHeader`,
`EmptyState`), consistent role/status/priority badge palettes, skeleton and
empty states on most pages, optimistic-UI feedback (shimmer + "Saving…"), and
scattered but real accessibility effort (`aria-label`s, `role="alert"`,
`aria-expanded`, `useId` labels).

What keeps it below a professional bar is not lack of effort — it's
**fragmentation and unfinished edges**:

1. **Three competing design systems coexist.** A `components/ui` primitive
   library that is mostly **dead code**, a `lib/ui.ts` class-string token file
   that most pages actually use, and raw ad-hoc Tailwind on the board pages.
   The same app ships three different button designs and three input designs.
2. **Placeholder content shipped to the two most-seen screens** — the login and
   register pages both display *"Lorem ipsum dolor sit amet…"* as their brand
   panel copy, and login has a "Remember me" checkbox wired to nothing.
3. **The Kanban board — the core feature — is mouse-only.** HTML5 drag & drop
   does not work on touch devices and has no keyboard path, so the product's
   centerpiece is unusable on tablets/phones and for keyboard users.
4. **Modals are not real dialogs** (no `role="dialog"`, focus trap, or Escape),
   several text styles fail WCAG contrast, and there is no reduced-motion
   handling — the app would not pass an accessibility review today.
5. Assorted broken/incoherent details: the skeleton shimmer animation never
   actually animates (its keyframes are never emitted), the server and client
   disagree on the default project color (neon green `#00ff41` vs indigo
   `#6366f1`), and two divergent priority color maps exist.

---

## 2. Inventory — what the design layer is today

| Layer | Contents | Actually used? |
| --- | --- | --- |
| `tailwind.config.js` | `brand` palette (50/100/500/600/700 only), shimmer keyframes | ✅ (partially — see §6.1) |
| `lib/ui.ts` | Documented class-string tokens: `pageBg`, `btnPrimary`, `btnGhost`, `card`, `inputPill(+Error)`, `iconBadge`, `sectionLabel`, 4 badge color maps, `cx()` | ✅ — the de-facto design system |
| `components/ui/index.tsx` | `Card`, `SectionHeader`, `Badge`, `IconBadge`, `StatCard`, `EmptyState` | ✅ widely used |
| `components/ui/Button.tsx` | 3-variant button w/ spinner, focus rings | ❌ **never imported** |
| `components/ui/Field.tsx` | Labeled input w/ `useId`, hint, focus ring | ❌ **never imported** |
| `components/ui/Alert.tsx` | 3-variant alert w/ `role="alert"` | ❌ **never imported** |
| `components/ui/Logo.tsx` | Brand logo | ❌ only imported by dead `AuthLayout` |
| `components/auth/AuthLayout.tsx` | Split-panel auth shell w/ highlights | ❌ **never imported** — login/register built a different design inline |
| `components/ui/Toaster.tsx` + `store/toastStore` | Custom toast system | ✅ (note: `react-hot-toast` also sits unused in `package.json`) |
| Icons | Hand-inlined SVG blobs per file; emoji for feature/empty-state art | ✅ but duplicated & mixed-language |

The pattern is clear: a "proper" component library was started
(`Button`/`Field`/`Alert`/`AuthLayout`), then abandoned in favor of the
token-string approach, and both were left in the tree.

---

## 3. 🔴 Blockers to a professional look

### 3.1 Lorem ipsum on the auth screens
`app/login/page.tsx:239` and `app/register/page.tsx:98` — the branded welcome
panel of both pages ships literal *"Lorem ipsum dolor sit amet, consectetur
adipiscing elit…"*. These are the first screens every customer sees.
*(Adjacent: the dead `AuthLayout.tsx` already contains real, well-written
benefit copy — it was just never used.)*

### 3.2 One product, three button/input systems
- **Buttons:** `lib/ui.btnPrimary` (pill, gradient, `hover:scale`, uppercase on
  login), `components/ui/Button` (rounded-lg, flat, unused), and raw one-off
  buttons on the board toolbar and in the create-task modal
  (`app/projects/[projectId]/tasks/page.tsx:170-181, 322-335` — plain
  `rounded-lg bg-brand-600 text-xs`). Three different primary-button designs
  are visible in a single session.
- **Inputs:** gray icon-pill (`inputPill`, auth pages), bordered field
  (`Field.tsx`, unused), and raw bordered inputs (create-task modal, Kanban
  quick-add). The board's inputs have `outline-none` with **no focus ring
  replacement** — invisible keyboard focus.
- Because tokens have no size/variant API, pages fight them with `!important`
  overrides throughout (`!px-5 !py-2`, `!p-5`, `!text-base`,
  `!bg-gradient-to-br` — `app/page.tsx`, `AppHeader.tsx`, `dashboard/page.tsx`).

*Requirement:* pick **one** system — promote the primitive components
(`Button`/`Field`/`Alert`) to be the only way to render a control, give them
size + variant props, rebuild `btnPrimary`-style visuals inside them, and
delete the losers (`AuthLayout`, unused tokens, `react-hot-toast` dep). One
button, one input, one alert, used everywhere.

### 3.3 The Kanban board excludes touch and keyboard users
`KanbanColumn.tsx` implements native HTML5 DnD (`draggable`, `onDragStart`…):
- **Touch:** HTML5 DnD does not fire on mobile browsers — cards cannot be
  moved at all on phones/tablets. There is no fallback (no long-press, no
  "move to column" menu).
- **Keyboard:** no way to pick up/move a card without a mouse; no
  announcements (`aria-live`) of moves for screen readers.
- Card actions (open detail, delete) are `opacity-0 group-hover:opacity-100`
  (`TaskCard.tsx:108,118`) — **hover-revealed**, therefore invisible on touch
  and to keyboard users; title editing requires a **double-click**
  (`TaskCard.tsx:79`) with no alternative.

*Requirement:* a pointer-agnostic DnD library (`@dnd-kit` — keyboard + touch
sensors built in) or an explicit non-drag fallback (status dropdown / "move"
menu on the card, which also fixes keyboard), always-visible-on-focus actions,
and an edit affordance that isn't double-click-only.

### 3.4 Modals aren't dialogs
The create-task modal (`tasks/page.tsx:261-340`) and the inline delete
confirms: no `role="dialog"` / `aria-modal`, no focus trap (Tab walks the page
behind the overlay), no Escape-to-close, no scroll lock, no focus restoration,
and the backdrop doesn't dismiss. A repo-wide grep finds **zero**
`role="dialog"`/`aria-modal` anywhere.

*Requirement:* one shared `<Modal>` primitive (or `<dialog>`/Radix/Headless UI)
with trap + Escape + scroll lock + `aria-labelledby`, used for every overlay.

### 3.5 WCAG contrast & legibility failures
- `text-gray-400` on white is used for **meaningful content** — hints, dates,
  empty states, nav links, footer (~2.8:1; AA requires 4.5:1 for body text).
  Login's "Forgot password?" link is gray-400.
- The toast `warning` variant is **white on `yellow-500`** (`Toaster.tsx:9`) —
  roughly 1.7:1, unreadable.
- 10px type (`text-[10px]` avatar initials, badge counter) is below any
  professional floor for interactive UI.

*Requirement:* an accessible neutral ramp rule (gray-500 minimum for
secondary text on white), amber toast with dark text, 11–12px minimum type.

---

## 4. 🟠 High — consistency & interaction patterns

### 4.1 Two visual identities in one app
Marketing/auth speak "glassy gradient" (slate-gradient `pageBg`, rounded-3xl
cards, pill gradient buttons, radial-dot hero panels), while the board pages
speak "flat utility" (plain `bg-gray-50`, square-ish `rounded-lg` cards, tiny
bordered buttons, un-tokenized toolbar — `tasks/page.tsx:152-211`). The
transition from dashboard → board feels like switching products. Radii span
`lg/xl/2xl/3xl/full` with no rule for what shape means what.

*Requirement:* a written mini-spec — radius scale (e.g. control=lg, card=2xl,
pill=full), elevation scale, and page-background rule — then sweep the board
screens to comply. They're the most-used screens and currently the least
styled.

### 4.2 Destructive actions are inconsistent and unsafe
Task detail and project settings use a nice inline confirm
(`confirmDelete` two-step). But the Kanban card **and** list view delete
a task instantly on a single click of a hover-revealed `×`
(`TaskCard.tsx:115`, `tasks/page.tsx:248`) — no confirm, no undo toast.
Optimistic rollback exists for *failures*, not for *mistakes*.

*Requirement:* one destructive-action pattern everywhere — either confirm
first, or delete-with-undo-toast (better for flow). Never bare instant delete.

### 4.3 Iconography is emoji + hand-copied SVGs
Feature cards and `EmptyState` use emoji (🗂️ ⚡ 👥 📭 ✅ 📋) which render
differently on every OS and clash with the stroke-SVG icon set; meanwhile
bell/check/chevron/settings SVGs are copy-pasted between files
(`AppHeader.tsx`, `page.tsx` duplicate `checkIcon`). Logo exists in two
implementations (`Logo.tsx` rounded-xl vs `IconBadge` circle used as logo in
`AppHeader`/landing).

*Requirement:* one icon component set (lucide-react matches the current
stroke style, ~1:1 swap), emoji reserved for playful empty-state art at most,
and a single Logo component.

### 4.4 States that lie or drift
- **"Remember me" does nothing** — state is never read (`login/page.tsx:28`).
- **Landing advertises "@mentions"** (`page.tsx:36`) — the feature doesn't
  exist server-side (see `REQUIREMENTS_GAP_ANALYSIS.md`).
- **Overdue due dates render in the same gray** as future ones
  (`TaskCard.tsx:98`) — no urgency signal on the one field that has urgency.
  Dates are raw `toLocaleDateString()` with no relative form ("due tomorrow").
- **WIP limit** (`KanbanColumn.tsx:7`, hard-coded 10) turns the counter red
  but blocks nothing and is explained nowhere — it reads as an error state.
- **List view is a second-class citizen**: no assignees, no due date, no link
  to task detail, no reordering (`tasks/page.tsx:232-256`) — feature parity
  with the board is roughly 30%.

### 4.5 Avatars can't distinguish people
Every avatar is `name[0]` on the **same** brand gradient
(`AssigneePicker`, `AppHeader`, dashboard team list). Three teammates named
Anna, Adam, Aisha are visually identical. No image upload path exists
(`Tenant.logoUrl` is also never surfaced).

*Requirement:* deterministic per-user color from a hash of the id (the badge
palette already has 8+ hues), two-letter initials, and an upload path later.

---

## 5. 🟡 Medium — platform & polish gaps

- **No dark mode** — no `darkMode` config, no CSS variables; the token file
  hard-codes light values (`lib/ui.ts`), shimmer hard-codes light grays
  (`globals.css`). Fine as a decision, but the token architecture (raw
  Tailwind classes in strings) makes retrofitting expensive; moving tokens to
  CSS variables now is cheap insurance.
- **No `prefers-reduced-motion` handling** for `hover:scale`, spinner, shimmer.
- **No per-page metadata** — every tab says just "TaskFlow"
  (`app/layout.tsx:7`); no Open Graph/Twitter tags, so shared links unfurl
  bare. The landing page is a `"use client"` component reading the auth store,
  which hurts what should be a static, SEO-able page (swap to a server page
  with a client header slot).
- **Marketing chrome is copy-pasted, not shared** — each of `/`,
  `/pricing`, `/about`, `/features`, `/contact` re-implements the header nav
  (with drifting link sets — `features/page.tsx` differs) and only the landing
  page has a footer. One `MarketingLayout` fixes drift permanently.
- **No route-level `loading.tsx` / `error.tsx` anywhere** — page transitions
  show nothing and a render error white-screens the app (App Router provides
  these for one file each).
- **Toasts aren't announced** — `Toaster.tsx` has no `aria-live`/`role=status`,
  auto-dismisses on a fixed timer with no pause-on-hover.
- **Focus rings are inconsistent** — good `focus-visible:ring` on token
  buttons; `outline-none` with no replacement on board inputs, selects, and
  quick-add (most pages had exactly 1 focus-ring hit in a repo grep — the
  coverage is thin).
- **Modal sizing on small screens** — `max-w-md p-6` with no `max-h`/scroll;
  a long assignee list can push actions off-screen.

---

## 6. Small verified bugs (design-adjacent)

1. **The skeleton shimmer never animates.** `.shimmer` in `globals.css` sets
   `animation: shimmer 1.5s…`, but the `shimmer` keyframes live only in
   `tailwind.config.js` and Tailwind emits keyframes **only when the
   `animate-shimmer` utility is used** — which it never is (only the raw
   `.shimmer` class, `TaskCard.tsx:65`). The gradient renders frozen. Fix:
   define `@keyframes shimmer` in `globals.css` (or use `animate-shimmer`).
2. **Server and client disagree on the default project color** — Prisma
   default is neon green `#00ff41` (`schema.prisma:90`), the client fallback
   is indigo `#6366f1` (hard-coded in **6 files** — dashboard, projects list,
   overview, settings ×2, my-tasks, new). Pick one, export it once from
   `@taskflow/shared`.
3. **Two divergent priority color maps** — `lib/ui.priorityBadge` uses
   `sky-100` for MEDIUM and `rose` for URGENT; `TaskCard.tsx:8-13` re-declares
   its own map with `blue-100` and `red`. The same priority renders different
   colors on the card vs everywhere else.
4. **Dead dependency** — `react-hot-toast` is in `client/package.json` but
   never imported (the custom `toastStore` is the real system).

---

## 7. Requirements spec — what "professional" means here

A concrete definition of done for the design layer:

| # | Requirement | Acceptance criteria |
| --- | --- | --- |
| R1 | **Single component library** | `Button`, `Input/Field`, `Select`, `Modal`, `Alert`, `Toast`, `Badge`, `Card`, `Avatar`, `EmptyState`, `Skeleton` exist once, with variant/size props; zero raw `bg-brand-600` buttons in pages; dead components/`AuthLayout`/`react-hot-toast` removed |
| R2 | **Token spec** | Full brand ramp (50–900), semantic tokens (success/warning/danger/info), radius + elevation + spacing scales written down; no `!important` overrides of tokens; shared constants (default project color) in `@taskflow/shared` |
| R3 | **Accessibility baseline WCAG 2.1 AA** | All modals are real dialogs (trap/Escape/labelledby); every interactive element has a visible focus state; text contrast ≥ 4.5:1; toasts `aria-live`; DnD has keyboard + touch paths; no hover-only actions; reduced-motion respected |
| R4 | **Real content** | No lorem ipsum; no controls that do nothing; no advertised features that don't exist; overdue dates visibly flagged |
| R5 | **One visual identity** | Board/toolbar screens restyled with the same tokens as the rest; written radius/background rules; single Logo and icon system |
| R6 | **Route-level resilience** | `loading.tsx` + `error.tsx` at least at root and per major section; per-page `<title>`; OG metadata on marketing pages; server-render the landing page |
| R7 | **Feature-parity list view** | List view shows assignees/due date/priority, links to detail, and supports status change |
| R8 | **Consistent destructive pattern** | Confirm-or-undo on every delete, including board card and list row |

---

## 8. Prioritized plan

**P0 — days, high visibility**
1. Replace lorem ipsum with the copy already written in `AuthLayout.tsx`; wire
   or remove "Remember me" (§3.1, §4.4).
2. Fix the four §6 bugs (shimmer keyframes, default color constant, unify
   priority map, drop dead dep) — small diffs, immediate coherence.
3. Contrast pass: gray-400→500 for meaningful text, amber toast fix, kill
   10px type (§3.5).
4. Confirm-or-undo for card/list delete (§4.2).

**P1 — the consolidation (1–2 weeks)**
5. Promote the component library, delete the parallel systems, sweep pages
   (§3.2, R1/R2).
6. Shared `Modal` with proper dialog semantics; focus-ring sweep (§3.4).
7. Restyle board toolbar/list to tokens; write the radius/background rules
   (§4.1); parity list view (R7).
8. `loading.tsx`/`error.tsx`, per-page titles, MarketingLayout with shared
   nav/footer, server-rendered landing (§5).

**P2 — reach**
9. `@dnd-kit` migration for keyboard + touch DnD, or explicit move-menu
   fallback (§3.3).
10. Deterministic avatar colors; icon library adoption (§4.3, §4.5).
11. CSS-variable tokens (dark-mode-ready), reduced-motion, relative dates,
    OG images (§5).

---

*Files read for this audit: `tailwind.config.js`, `globals.css`, `app/layout.tsx`,
`lib/ui.ts`, all of `components/` (ui, auth, tasks, layout), and the landing,
login, register, dashboard, board (Kanban/list/create-modal), task detail,
project settings, calendar, pricing/about/features/contact, admin, team,
my-tasks, notifications and settings pages, plus `store/toastStore.ts` and
`client/package.json`. Where this document and the code disagree, the code wins.*

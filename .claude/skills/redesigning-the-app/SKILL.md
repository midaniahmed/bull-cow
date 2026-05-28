---
name: redesigning-the-app
description: Redesign the Bulls & Cows PvP web app with a cool, modern, animated look. Establishes an opinionated house design system (neon decoder-terminal by default), motion language, and signature in-game moments, then applies it screen-by-screen across the mobile-first React frontend. Touches only apps/web — never the server contract. Automatically use when the user asks to "redesign the app", "make it look cool/modern", "give it a fresh UI", "add animations", "improve the visual design", "make a new theme", or "polish the look and feel".
---

# Redesigning the App

Redesign the Bulls & Cows PvP web app so it looks and feels like a polished, modern, animated game — not a form. This skill encodes an opinionated **design system** and **motion language**, then applies them screen-by-screen across the mobile-first React frontend. The output is a cohesive, cool experience, not a pile of unrelated tweaks.

The game is a code-breaking duel (the ancestor of Mastermind). The default house style leans into that: a **neon decoder-terminal** — you are cracking a hidden code against a live opponent. Everything below serves that fantasy. If the user wants a different direction, offer the alternates in **Aesthetic Directions** before committing.

## When to Use This Skill

- "Redesign the app" / "make it look cool" / "give it a modern UI"
- "Add animations" / "make it feel alive" / "more juice"
- "New theme" / "change the color scheme" / "make a dark neon look"
- "Polish the look and feel" / "the UI looks like a boring form"
- Any visual/motion overhaul of `apps/web`

## Hard Constraints (read first — these are non-negotiable)

This is a **frontend-only, presentation-layer** skill. It must not change how the game works.

**DO NOT:**
- Touch `apps/server`, `packages/shared`, the socket event names, payload schemas, or any game logic. Redesign consumes the existing store state and emits the existing events — nothing more.
- Rename or change the canonical socket events (`room_created`, `room_joined`, `player_ready`, `match_started`, `guess_submitted`, `result_calculated`, `turn_changed`, `match_ended`, …).
- Move authoritative logic to the client. Scoring, validation, and turn ownership stay server-side; the client still treats every server payload as truth. Animations are cosmetic — never gate a real action on an animation finishing.
- Break the mobile-first contract: `100dvh`, `env(safe-area-inset-*)`, 44px+ tap targets, numeric keypads (`inputMode="numeric"`), one-handed reach (primary CTAs in the lower half).
- Add heavy new dependencies. `framer-motion`, `clsx`, and Tailwind are already in. Prefer CSS/Tailwind + Framer Motion over new packages. A confetti/particle effect can be hand-rolled with Framer Motion or a few divs — do not pull in a 3D engine.

**ALWAYS:**
- Respect `prefers-reduced-motion`: gate non-essential motion behind it (see **Motion System → Reduced motion**). Reduced motion must still be fully usable and good-looking — it degrades to opacity/instant, never to broken layout.
- Keep it performant on a mid-range phone: animate `transform` and `opacity` only (GPU-friendly), avoid animating `width`/`height`/`top`/`left`/`box-shadow` in hot loops, and never animate during scroll jank. Target 60fps.
- Keep contrast accessible (WCAG AA for text), keep focus states visible, and keep tap targets ≥44px even when they look like glowing chips.

## Files You Will Touch

```
apps/web/
├── tailwind.config.js              # design tokens: colors, shadows (glow), fonts, keyframes, animations
├── index.html                      # font <link>, theme-color meta, background gradient on <body>
├── src/styles.css                  # @layer base/components: theme primitives, glass/glow utility classes, base bg
├── src/components/
│   ├── primitives/                 # Button, Card, Modal, Countdown, NicknameTag, SnackbarLayer — restyle these first; everything composes from them
│   ├── layout/AppShell.tsx         # header, background field, connection pill, page transitions
│   ├── inputs/                     # DigitInput, DigitCells, RoomCodeInput, NicknameInput — the tactile core
│   ├── room/                       # the stage views — the screens players actually live in
│   │   ├── EmptyLobbyView.tsx / LobbyView.tsx
│   │   ├── SecretSubmissionView.tsx
│   │   ├── RPSView.tsx
│   │   ├── PlayingView.tsx / GuessLogList.tsx
│   │   ├── ResultView.tsx
│   │   └── AbandonedView.tsx
│   ├── emote/                      # EmotePanel, EmoteToastLayer — already animation-friendly
│   └── presence/                   # DisconnectBanner, ReclaimTabBanner
├── src/pages/                      # Landing/Home/Create/Join/Room/NotFound — mostly compose room + primitives
└── (optional) src/motion/          # NEW: shared Framer Motion variants + spring presets (see Motion System)
```

**Where the leverage is:** restyle the **primitives** and **tokens** first. `Button`, `Card`, and the digit cells are used everywhere — getting them right propagates the new look across the whole app for free. Then do the **stage views** in order of how much time players spend there: `PlayingView` > `ResultView` > `LobbyView` > `SecretSubmissionView` > `RPSView` > the rest.

## Workflow

1. **Read the current state.** Open `tailwind.config.js`, `styles.css`, `AppShell.tsx`, `Button.tsx`, and `Card.tsx` to see the existing tokens and primitive structure. Open the stage views you plan to touch. The current theme is a plain dark-slate palette with a single cyan accent — capable bones, no personality yet.
2. **Confirm the direction.** Default to the house style (neon decoder-terminal). If the user expressed any preference, or the request is open-ended and stakes are high, present **Aesthetic Directions** via AskUserQuestion and let them pick. If they said "just make it cool / whatever you want," skip the question and go with the house style — that delegation is real, don't pester.
3. **Lay the foundation (tokens + primitives).** Extend `tailwind.config.js` with the token set, add the glass/glow utilities and keyframes to `styles.css`, wire fonts in `index.html`, create `src/motion/` with the shared variants. Restyle `Button`, `Card`, `Modal`, `Countdown`. Verify the app still builds and looks coherent before touching screens.
4. **Redesign screens in priority order** using the per-screen blueprints below. Each screen reuses the tokens, primitives, and motion variants — never one-off colors or ad-hoc easing.
5. **Add the signature moments.** Wire up the bull/cow reveal, the win sequence, the turn handoff, and the RPS clash — these are what make it feel like a game.
6. **Pass the checklist** (reduced-motion, performance, a11y, mobile, contract-safety) before declaring done.
7. **Show your work.** Run the app (`pnpm dev:web`) and, where possible, screenshot or describe the result so the user can see the redesign rather than just read about it.

Make foundation changes (step 3) as one coherent pass, then iterate per screen. Don't redesign one screen with bespoke styles and another with the system — the whole point is cohesion.

## Aesthetic Directions

The **house style is "Neon Decoder-Terminal."** Offer these alternates only when the user wants to choose. All three are dark-first, mobile-first, and built from the same token/motion machinery — only the personality differs.

**A. Neon Decoder-Terminal (default).** A hacker's code-cracking console. Near-black background with a faint scanline/grid field, glassmorphism panels with subtle inner glow, a neon-cyan→violet accent gradient, monospace tabular numerals that feel like a readout. Bulls glow gold-amber, cows glow cyan. Motion is crisp and electric: snappy springs, glow pulses, a digit-flip on reveal. Fits the code-breaking fantasy exactly.

**B. Soft Neo-Glass Arcade.** Friendlier and more playful. Deep indigo/plum background with floating blurred gradient blobs, frosted-glass cards with soft rounded corners, candy accent gradients (magenta→orange), chunky tactile buttons. Bouncier springs, squash-and-stretch on the digit pad, confetti-heavy win. Reads as a polished casual mobile game.

**C. Minimal Mono Editorial.** Restrained and premium. Off-black or paper-dark, one decisive accent, generous whitespace, large confident type, hairline borders instead of glow. Motion is subtle and tasteful — smooth fades, slow reveals, no flash. For users who think neon is "too much."

When asking, use `AskUserQuestion` with these as options and a one-line description each; make the default (A) the first option labeled "(Recommended)".

## Design System

The tokens below are the **Neon Decoder-Terminal** values. For directions B/C, keep the same token *names* and swap the values — every component references tokens, so a re-theme is a token edit, not a component rewrite.

### Color tokens (`tailwind.config.js → theme.extend.colors`)

Keep the existing semantic names (`bg`, `panel`, `panel2`, `ink`, `muted`, `accent`, `danger`, `success`, `warn`) so nothing downstream breaks — just deepen and enrich them, and add a few new ones.

```js
colors: {
  bg:      '#070b14',   // near-black, deeper than the old slate-900
  bg2:     '#0b1120',   // secondary background for layered panels
  panel:   'rgba(20,28,46,0.6)',   // glass — pair with backdrop-blur
  panel2:  'rgba(45,58,86,0.5)',   // glass border / raised glass
  ink:     '#e8eefc',
  muted:   '#8a97b5',
  accent:  '#3ee0ff',   // neon cyan — primary
  accent2: '#a875ff',   // neon violet — gradient partner
  bull:    '#ffc04d',   // gold-amber — exact-position hits
  cow:     '#3ee0ff',   // cyan — right-digit-wrong-place (can alias accent)
  danger:  '#ff5d6c',
  success: '#5cf2a3',
  warn:    '#ffc04d',
},
```

Add the signature accent gradient as a reusable utility (see `styles.css` below): `--grad-accent: linear-gradient(120deg, #3ee0ff, #a875ff)`.

### Glow & depth tokens (`theme.extend.boxShadow`)

Glow is what sells "neon." Define it once; never hand-write shadow values in components.

```js
boxShadow: {
  glow:      '0 0 20px -2px rgba(62,224,255,0.45)',
  'glow-lg': '0 0 40px -4px rgba(62,224,255,0.55)',
  'glow-bull':'0 0 24px -2px rgba(255,192,77,0.6)',
  'glow-violet':'0 0 28px -2px rgba(168,117,255,0.5)',
  glass:     '0 8px 32px -8px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.06)',
},
```

### Typography

- **Display / UI:** a modern geometric sans. `Space Grotesk` or `Sora` (Google Fonts) reads as "techy game" without being a gimmick. Wire via `<link>` in `index.html` and add to `fontFamily.sans`.
- **Numerals / code:** a tabular monospace. Keep the existing `font-mono`, but prefer `JetBrains Mono` or `Space Mono` for the digit cells and guess log — tabular figures keep the readout from jittering. Use `font-variant-numeric: tabular-nums`.
- Scale: large, confident headers (the room code, the active number). Small, quiet metadata (status, hints). Let type size carry hierarchy so you need fewer borders.

### Surfaces — glassmorphism

Panels are frosted glass over the animated background, not flat fills.

```css
/* styles.css @layer components */
.glass {
  @apply rounded-2xl border border-white/10 shadow-glass;
  background: rgba(20,28,46,0.55);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}
.glass-raised { @apply glass shadow-glow; }
```

Replace `.card` to compose `.glass`. Keep the class name so existing usages upgrade for free.

### The animated background field

A subtle living background separates "app" from "game." Put it in `AppShell` behind `main`, `pointer-events-none`, `fixed inset-0 -z-10`:

- A faint radial gradient that drifts (slow `background-position` or a transformed blurred blob).
- An optional fine grid or scanline overlay at very low opacity for the terminal feel.
- Keep it cheap: one or two blurred `div`s animated with `transform`, not a canvas particle storm. Disable its motion under `prefers-reduced-motion` (the static gradient stays).

### Radii, spacing, borders

- Radii: `rounded-2xl` for panels, `rounded-xl` for chips/cells, `rounded-full` for status pills and avatars. Bigger radii read as "softer, more modern."
- Borders: prefer `border-white/10` hairlines + glow over heavy solid borders.
- Spacing: give the active number and primary CTA room to breathe. Crowded = "form"; spacious = "game."

## Motion System

Create `apps/web/src/motion/` with a small shared module so every animation pulls from the same vocabulary. Inconsistent easing is the #1 thing that makes a redesign feel amateur.

### `src/motion/index.ts` — spring presets & variants

```ts
// Spring presets — name them, reuse them.
export const spring = {
  snappy: { type: 'spring', stiffness: 500, damping: 30 },   // buttons, chips
  soft:   { type: 'spring', stiffness: 260, damping: 24 },   // panels, cards
  bouncy: { type: 'spring', stiffness: 400, damping: 14 },   // celebratory pops
} as const;

// Reusable variants
export const fadeRise = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: spring.soft },
  exit:   { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const popIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show:   { opacity: 1, scale: 1, transition: spring.bouncy },
};

// Stagger container for lists (guess log, lobby players, digit cells)
export const stagger = (gap = 0.05) => ({
  show: { transition: { staggerChildren: gap } },
});
```

### Page transitions

Wrap routed content in `<AnimatePresence mode="wait">` (in `AppShell` or the router outlet) and animate page mount/unmount with `fadeRise`. Use `key={location.pathname}` so route changes cross-fade instead of snapping.

### Micro-interactions (the "juice")

- **Buttons:** `whileTap={{ scale: 0.96 }}` + `whileHover` glow brightening. Make the primary button a `motion.button` (wrap the existing `Button` or add Framer Motion props). Loading state = an animated glow sweep, not a `…`.
- **Digit cells:** active cell scales up slightly + glow-ring; on entry, each cell `popIn` with stagger; on a committed guess, a quick flip or settle.
- **Snackbars/toasts:** slide+fade from the bottom with `spring.snappy`; `AnimatePresence` on exit.
- **Emotes:** `EmoteToastLayer` should pop and float upward with a slight rotate, then fade — exaggerate it, emotes are pure delight.

### Signature moments (these make it a *game*)

These are the high-value animations. Build them deliberately.

1. **Bull/Cow result reveal** (`PlayingView` / result row): when `result_calculated` lands, animate the score in. Each **bull** lands as a gold pip that scales in with `glow-bull` and a tiny pop; each **cow** as a cyan pip. Stagger them (bulls first, then cows) so the reveal has rhythm. Optionally flip each digit of the guessed number to "lock in." Pair with a vibration tick (existing `use-vibration` hook) and respect reduced-motion.
2. **Turn handoff** (`turn_changed`): a clear, satisfying transition — the active-player indicator slides across, the input area for the now-active player lights up (glow border breathes), the timer ring re-arms. Make it unmistakable whose turn it is.
3. **Win sequence** (`ResultView`, `match_ended` with a winner): the payoff. The winning number unmasks digit-by-digit, a burst of confetti/particles (hand-rolled: ~20 `motion.div` pips with randomized `transform` trajectories — vary by index, not `Math.random()` at module scope), the winner's name scales in with `glow-lg`. Loser/draw gets a dignified, calmer variant. This is the screenshot moment — make it land.
4. **RPS clash** (`RPSView`): the two choices slide in from opposite sides and "clash" in the center with a flash/shake, then the winner's pick pulses. Short, punchy.
5. **Countdown / timer ring** (`Countdown`): render the turn timer as an SVG ring that depletes (animate `stroke-dashoffset` via `transform`-friendly approach or `pathLength`), shifting from `accent` → `warn` → `danger` as time runs low, with a glow pulse in the final seconds.

### Reduced motion

```ts
// Use Framer Motion's hook
import { useReducedMotion } from 'framer-motion';
const reduce = useReducedMotion();
```

When `reduce` is true: drop springs to instant or simple opacity fades, kill the background drift, skip confetti (or render a single static "Winner" flourish), and never auto-scroll. The screen must remain fully functional and still look intentional — reduced motion is a first-class variant, not an afterthought.

## Per-Screen Blueprints

Apply the system; don't invent new tokens per screen. Each blueprint says what the screen should *feel* like and which signature moments belong there.

### Landing / Home / Create / Join (`pages/`)
- Big confident wordmark with the accent gradient (`bg-clip-text`), the animated background field behind it, primary CTA glowing in the lower half. Entrances use `fadeRise` + stagger.
- Room-code input (`RoomCodeInput`): large monospace cells, each cell `popIn`, active cell glows. Make entering a code feel like punching in a launch code.
- Create flow: the generated room code reveals with a flip/scramble-settle effect; a prominent "copy" affordance that confirms with a glow flash + the existing clipboard hook.

### Empty Lobby / Lobby (`room/EmptyLobbyView`, `room/LobbyView`)
- The room code is the hero — huge, monospace, glowing, with a QR (`react-qr-code`) styled to match (round the container, glass frame). "Waiting for opponent" = a calm breathing pulse, not a spinner.
- When the opponent joins (`room_joined`), they `popIn` into the player slot with a vibration tick — a real "they're here!" moment.
- Ready toggles glow when armed; both-ready triggers a brief charge-up before `match_started`.

### Secret Submission (`room/SecretSubmissionView`)
- The tactile core. Digit pad with the upgraded cells, live rule readout (length, duplicates allowed) as quiet glowing hints. The secret should feel like it's being "encrypted/locked in" on submit — a lock animation + glow seal. Reinforce privacy ("only you can see this") since secrets are server-protected.

### Playing (`room/PlayingView`, `room/GuessLogList`)
- Where players live — spend the most polish here. Clear whose-turn-it-is state (signature **turn handoff**). The active number entry is front and center, lower-half, thumb-reachable.
- **Guess log:** each entry is a glass row with the monospace guess and animated bull/cow pips (signature **reveal**). New entries slide in at the top/bottom with stagger; the latest is highlighted. Tabular nums so the column doesn't jitter.
- Timer ring visible and breathing. Emote panel one tap away; incoming emotes float over the board.

### Result (`room/ResultView`)
- The payoff screen. Signature **win sequence** for the winner; calm, classy variant for loss/draw. Reveal both secrets now that the match is `ended` (they're finally allowed off the server). Big "rematch" / "home" CTAs glowing in the lower half. This is the most shareable screen — make it screenshot-worthy.

### Abandoned / Disconnect / Reclaim (`room/AbandonedView`, `presence/*`)
- Keep these calm and legible — no celebration. Glassy banners that slide in from the top with `spring.snappy`, clear status, a single obvious action. The disconnect/reconnect banner should reassure, not alarm: a gentle pulsing dot, not a red flash.

## Checklist (pass before declaring done)

- [ ] **Contract-safe:** zero changes under `apps/server` / `packages/shared`; no socket event renames; no game logic moved client-side; no real action gated on an animation completing.
- [ ] **Cohesion:** every color, shadow, radius, font, and easing comes from the shared tokens / `src/motion/` — no one-off hex values or ad-hoc `transition` strings.
- [ ] **Primitives first:** `Button`, `Card`, `Modal`, digit cells, `Countdown` carry the new look so it propagates everywhere.
- [ ] **Signature moments wired:** bull/cow reveal, turn handoff, win sequence, RPS clash, timer ring all in place and tied to the right store events.
- [ ] **Reduced motion:** `prefers-reduced-motion` honored everywhere; reduced variant is still polished and fully usable.
- [ ] **Performance:** animations use `transform`/`opacity`; no layout-thrashing properties in hot loops; smooth on a mid-range phone.
- [ ] **Mobile:** `100dvh`, safe-area insets, ≥44px targets, numeric keypads, primary CTAs in the lower half — all intact.
- [ ] **Accessibility:** AA text contrast on the new dark surfaces, visible focus states, glow never the *only* signifier of state.
- [ ] **Builds & runs:** `pnpm typecheck` clean; ran `pnpm dev:web` and verified the redesign in the browser (screenshot/describe for the user).

## Notes

- The whole skill is theme-swappable: components reference token names, so shipping direction B or C later is a `tailwind.config.js` + `styles.css` edit, not a component rewrite. Keep it that way — never inline a raw color or shadow.
- When in doubt about "is this too much?": the signature moments (win, reveal, turn) should be expressive; everything ambient (background, idle states, transitions) should be subtle. Loud everywhere = noise; loud at the right moments = a game.
- Don't redesign behind the user's back into a direction they didn't pick. If they chose a style, stay in it. If they said "surprise me," the house style is the surprise — commit fully and show them the result.

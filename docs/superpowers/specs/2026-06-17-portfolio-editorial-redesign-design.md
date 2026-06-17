# Portfolio Redesign — "A Working Catalogue"

**Date:** 2026-06-17
**Author:** Shivam Kumar (design w/ Claude)
**Status:** Approved — ready for implementation plan

## Goal

Redesign every section of the existing single-page portfolio so it reads as
*authored by a person*, not as a templated/AI-generated "impressive dev
portfolio." Keep it light, very clean, and editorial. The personality must come
from typography, whitespace, and editorial page furniture — not from effects.

The current site is competent but leans on a now-clichéd combo (grid-line
background + grain + mono eyebrows + electric accent + custom cursor + tech
marquee) that reads as generated. The redesign removes those tells and replaces
them with an editorial point of view.

## Constraints (fixed)

- **Stack stays:** hand-coded static site — `index.html`, `styles.css`,
  `script.js`, GSAP for motion. No build step. (Footer already says "Hand-coded,
  no build step.")
- **Content stays:** all copy, projects, links, dates, and the five sections
  (Hero, Selected Work, Capabilities, Experience, Contact) are preserved. We
  re-present content; we do not rewrite it. No vanity stats.
- **Light theme only.** No dark mode.
- **Accessibility preserved:** skip link, semantic HTML, keyboard nav, color
  contrast (AA+), `prefers-reduced-motion` honored.

## Approved direction (from brainstorming)

| Axis | Decision |
| --- | --- |
| Creative direction | Editorial / typographic |
| Color | New cool accent tone (off electric blue) |
| Motion | Strip to clean — remove gimmicks, keep subtle reveals only |
| Display typeface | Fraunces (characterful modern old-style serif) |

## Concept

Treat the page like a well-set **printed dossier / journal** about a software
developer. Editorial page furniture carries the design: folios, chapter
openers (`§01 — Selected Work`), captions, a narrow right **margin column** for
notes/metadata, and **pull-quotes** lifted from the project descriptions.

## Design system

### Type
- **Display:** Fraunces — headlines, case titles, big statements. Use roman +
  italic; italic for accent phrases. Variable weights ~300–600, optical sizing.
- **Body / UI:** Inter — paragraphs, nav, buttons, lists.
- **Mono:** IBM Plex Mono — small technical captions ONLY (indices, dates, tags,
  metadata). Used sparingly.

The Fraunces × Inter contrast does most of the editorial work.

### Color tokens
- `--paper` background: `#FAFAFB` (near-white, faint cool tint)
- `--surface`: `#FFFFFF` (used sparingly; mostly the page is paper)
- `--ink`: `#111318` (deep cool near-black)
- `--ink-2` / `--muted` / `--faint`: cool-grey text steps
- `--accent`: **`#1B2AD4`** ultramarine ink (richer/"printed" vs. old neon
  `#1f3bff`; tunable). Used sparingly: section numbers, hairline accents, links,
  one block.
- `--line` / `--line-soft`: hairline rules

### Grid & layout
- 12-col editorial grid, max width ~1200–1280px, generous margins.
- Deliberate asymmetry: a wide main column + a narrow right **margin column**
  for notes/metadata.
- Hairline rules for structure — far fewer than the current design.
- Strong vertical rhythm and whitespace.

### Removed (the "templated tells")
- Custom cursor (`.cursor`)
- Grain overlay (`.grain`)
- Tech-stack marquee (`.hero__marquee`, scroll-velocity marquee JS)
- Magnetic buttons (`[data-magnetic]` behavior)
- Grid-line background (`.grid-lines`)
- Hero "spec bar" meta boxes and the bordered capability-card grid

### Motion (kept, refined)
- Gentle, slow scroll-reveals (fade + small rise), fewer and softer than now.
- Refined hero headline reveal (lines rise once on load).
- Editorial hover states only: color shift, underline, thin accent rule — no
  large gradient sweeps.
- All motion gated behind `prefers-reduced-motion`. Site fully usable without JS.

## Section-by-section

### Hero — cover / masthead
- Thin mono kicker line: role · stack · location.
- Huge Fraunces statement headline; closing phrase ("in production.") set in
  **italic accent**.
- Two-column editorial block: intro paragraph as a magazine "standfirst" (left,
  larger body), the *Currently / Focus* content as true **marginalia** (right,
  small).
- CTAs as refined editorial links/buttons (View selected work →, Download CV)
  plus a small GitHub/LinkedIn list.
- Removed: spec-bar meta boxes, marquee.

### Selected Work — the catalogue
- Chapter opener: `§01 — Selected Work` + standfirst note.
- Each project = an editorial **plate**:
  - Large folio number.
  - Fraunces title.
  - Mono caption: type · context (e.g., Maxaix · 2024).
  - Readable description with ONE sentence lifted as a **pull-quote**.
  - Highlights as a clean hairline-separated list (refined markers, not blue
    dashes).
  - Tags as understated mono captions in a row (no boxes).
  - Links underlined with ↗.
- Subtle hover: title → accent + thin accent rule. No gradient sweep / no
  translate-on-hover.
- Generous spacing; hairline separators between plates.

### Capabilities — skills ledger
- Drop the 6 bordered cards (the templated tell).
- Becomes a numbered editorial **definition list**: each capability =
  heading + description + inline tags, hairline-separated rows.
- Foundations line stays as a colophon caption.

### Experience — the record
- Editorial timeline: dates in the mono **margin column**; role / company /
  summary in the main column with Fraunces titles; hairline separators; no
  boxes.
- Linked projects as small inline mono links/tags.
- Education as a compact captioned two-item list.

### Contact — sign-off / colophon
- Large Fraunces closer: *"Let's build something solid."*
- Email as an oversized editorial link.
- Details as a clean hairline **definition list** (mono label, body value).
- Footer reads as a colophon: name · year · "Hand-coded, no build step" · back to
  top.

## Responsive
- Margin columns collapse under the main column; everything stacks.
- Type scale degrades gracefully via `clamp()`.
- Existing breakpoints (~1024 / 860 / 600) revisited for the new layout.

## Success criteria
- Reads as an editorial/printed catalogue, not a tech template.
- No dark theme; background stays light/clean.
- All original content, links, and sections present.
- The five "templated tells" are gone.
- Fraunces × Inter × Plex Mono system applied consistently.
- Loads fast, works without JS, AA contrast, reduced-motion safe.
- Responsive from mobile to wide desktop.

## Out of scope
- Rewriting copy or adding new projects.
- Adding a build step, framework, or backend.
- Dark mode / theme switching.
- New pages or routing (stays single-page).

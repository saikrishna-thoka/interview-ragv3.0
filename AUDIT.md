# AI-Slop UI & UX Audit Report

**Date:** November 26, 2026  
**Auditor:** Senior Product Designer & Frontend Engineer  
**Project:** InterviewAI (RAG & Groq Mock Interview Platform)  
**Status:** Completed Phase 1 (No application logic or route changes)

---

## Executive Summary

A comprehensive scan of the application's user interface (`tailwind.config.ts`, `globals.css`, `layout.tsx`, navigation, landing page, authentication views, candidate portal, mock interview room, and administrative consoles) revealed significant markers of generic, unopinionated "AI-generated" frontend design. 

While the functional architecture (pgvector similarity, Groq evaluation, and Supabase auth) is resilient, the visual presentation suffers from hallmark AI-slop characteristics:
1. Monolithic reliance on boilerplate shadcn/Tailwind default HSL variables (`221.2 83.2% 53.3%` primary blue) across all components.
2. Single overused font (`Inter`) with no typographic scale or distinct display heading font.
3. Ubiquitous copy-pasted `rounded-xl border border-border bg-card p-6 shadow-sm` containers without depth, backdrop refraction, or elevated layering.
4. Stock "hero + 3-card grid" landing page structure.
5. Inconsistent micro-interactions, lacking `:focus-visible` styling, active states, and reduced-motion considerations.
6. A critical runtime database permission denial on the Resume ATS upload workflow (`Failed to record resume in database: permission denied for table resumes`).

Below is the structured breakdown of findings, ranked from **Critical** to **Low** severity.

---

## 1. Audit Findings Ranked by Severity

### Critical Severity

#### Issue C1: Database Permission Denied on Resume Ingestion
- **File Path:** `src/app/api/resume/upload/route.ts` (L65–L77) & `src/app/(protected)/resume/page.tsx`
- **What's Wrong:** The resume upload route uses the client session (`createClient()` from `@/lib/supabase/server`) to insert into the `resumes` table. When PostgreSQL privileges or RLS policies for role `authenticated` are missing or unapplied, uploads fail with:
  ```
  Failed to record resume in database: permission denied for table resumes
  ```
  This immediately crashes user progress at step 2 of the candidate onboarding flow and displays an unstyled destructive alert banner.
- **Fix:** In `src/app/api/resume/upload/route.ts`, verify the user session using `supabase.auth.getUser()`, then execute the database insert and storage operations via `createAdminClient()` (using `process.env.SUPABASE_SERVICE_ROLE_KEY`) which holds superuser bypass privileges on the schema.

---

### High Severity

#### Issue H1: Generic Boilerplate Palette & Missing Glass Design Tokens
- **File Path:** `tailwind.config.ts` (L10–L53) & `src/app/globals.css` (L5–L67)
- **What's Wrong:** The application uses stock shadcn CSS variables with zero custom tokens for glassmorphism. Backgrounds in dark mode are flat solid dark gray (`222.2 84% 4.9%`), with cards at `222.2 84% 6.5%`. There are no tokens for glass backgrounds (`rgba(255, 255, 255, 0.08–0.18)`), frosted borders (`rgba(255, 255, 255, 0.20–0.30)`), backdrop blur (`blur(16px)` to `blur(24px)` with `saturate(140%)`), or multi-layered box shadows with top/left inner highlights.
- **Fix:** Define formal glass tokens in `globals.css` and `tailwind.config.ts`:
  - Glass card background: `rgba(255, 255, 255, 0.05)` (dark) / `rgba(255, 255, 255, 0.70)` (light).
  - Glass borders: `rgba(255, 255, 255, 0.12)` (dark) / `rgba(0, 0, 0, 0.08)` (light).
  - Inner highlight: `inset 0 1px 0 0 rgba(255, 255, 255, 0.15)`.
  - Ambient mesh gradient background with blurred cyan/violet color blobs so translucent glass surfaces have dynamic depth to blur and refract.

#### Issue H2: Single Overused Font (`Inter`) with Absent Typographic Hierarchy
- **File Path:** `src/app/layout.tsx` (L8, L23)
- **What's Wrong:** Only `Inter` is loaded and applied across the entire app. Headers (`h1`, `h2`, `h3`), metrics, buttons, and body copy all share the identical sans-serif typeface. This causes visual fatigue and gives the product the unmistakable aesthetic of a rapid AI prototype.
- **Fix:** Introduce a distinctive two-font pairing using `next/font/google`:
  - **Display / Heading Font:** `Outfit` or `Plus Jakarta Sans` with tracking `-0.02em` to `-0.03em` and semibold/extrabold weights for headings, scores, and badges.
  - **Body / Interface Font:** `Plus Jakarta Sans` or retain clean geometric sans for UI controls and readable technical questions.

#### Issue H3: Card-with-Shadow Duplication Across Every Screen
- **File Path:** 
  - `src/app/page.tsx` (L71, L81, L91)
  - `src/app/(auth)/login/page.tsx` (L69)
  - `src/app/(auth)/register/page.tsx` (L88)
  - `src/app/(protected)/dashboard/page.tsx` (L85, L102, L122, L143)
  - `src/app/(protected)/resume/page.tsx` (L282, L323, L411, L502, L526, L551)
  - `src/app/(protected)/interview/new/page.tsx` (L162, L199, L248, L294)
  - `src/app/(protected)/interview/[sessionId]/page.tsx` (L361, L404, L420, L438, L457, L554)
- **What's Wrong:** The exact same style string `rounded-xl border border-border bg-card p-6 shadow-sm` is copy-pasted over 30 times across client components. It lacks modularity, creates flat surfaces with zero physical elevation, and offers no hover or refraction cues.
- **Fix:** Build a unified primitive `GlassCard` component (`src/components/ui/glass-card.tsx`) supporting variant elevations (`flat`, `elevated`, `interactive`), subtle top-edge specularity, backdrop blur with fallback, and standardized padding scale.

---

### Medium Severity

#### Issue M1: Stock "Hero + 3 Cards" Pattern and Generic Landing Page
- **File Path:** `src/app/page.tsx` (L20–L101)
- **What's Wrong:** The landing page layout is the quintessential AI template:
  1. A pill badge (`Sparkles` icon + "RAG-Grounded AI Technical Interview Simulator").
  2. Centered large headline with a single blue highlighted phrase.
  3. Two action buttons in a row.
  4. A row of static pill tags.
  5. A 3-column feature grid with `Bot`, `FileText`, and `Target` icons.
- **Fix:** Redesign the landing page with layered glass cards showing interactive live-preview mockups of an ATS gauge, a realistic RAG similarity match inspection card, and a simulated Groq question-answer stream. Replace stock layout with asymmetrical editorial grid and frosted floating glass badges.

#### Issue M2: Inconsistent Color Accents and Lack of Semantic Tokens
- **File Path:** 
  - `src/app/(protected)/interview/[sessionId]/page.tsx` (L315–L319, L412, L428, L568, L574)
  - `src/app/(protected)/resume/page.tsx` (L226–L230, L516–L520, L540–L544)
- **What's Wrong:** Arbitrary inline colors are sprinkled throughout without semantic token mapping (`text-emerald-500`, `bg-emerald-500/10`, `text-purple-600`, `text-blue-600`, `text-amber-500`, `bg-amber-500/10`). In dark mode, some of these colors lack sufficient contrast or clash with the electric blue primary.
- **Fix:** Consolidate into a restrained 1 Primary (Electric Cyan/Indigo `hsl(215, 95%, 60%)`) + 1 Accent (Emerald Violet/Amber for status only), wrapped in typed Tailwind utility classes.

#### Issue M3: Missing Focus-Visible, Active States, and Keyboard Affordances
- **File Path:** `src/app/(protected)/resume/page.tsx` (L296–L309), `src/app/(protected)/interview/new/page.tsx` (L177–L194)
- **What's Wrong:** Role selection pills and difficulty buttons use `button` elements that lack explicit `:focus-visible:ring-2` focus rings and active push-down animations (`active:scale-[0.98]`). Keyboard users navigating via Tab cannot clearly identify current focus.
- **Fix:** Replace ad-hoc buttons with a `GlassButton` primitive with unified `:focus-visible:ring-2 :focus-visible:ring-offset-2`, `active:scale-[0.98]`, and 200ms cubic-bezier transitions.

#### Issue M4: Input Controls Lack Cohesive Glass Styling
- **File Path:** `src/app/(auth)/login/page.tsx` (L96, L116), `src/app/(auth)/register/page.tsx` (L114, L135), `src/app/(protected)/interview/[sessionId]/page.tsx` (L601)
- **What's Wrong:** Inputs use basic `border border-input bg-background pl-10 pr-4 py-2.5` styling with flat borders and no glass depth. Textareas and inputs feel disconnected from the container cards.
- **Fix:** Build a `GlassInput` and `GlassTextarea` primitive featuring subtle semi-transparent dark/light glass backgrounds, frosted inner glow on focus, floating label support, and icon adornment slots.

---

### Low Severity

#### Issue L1: Missing Motion Preferences (`prefers-reduced-motion`)
- **File Path:** `src/app/globals.css` & `src/app/(protected)/resume/page.tsx` (L429)
- **What's Wrong:** SVG gauge animations (`transition-all duration-1000 ease-out`) and page transitions run indiscriminately without checking `prefers-reduced-motion: reduce`.
- **Fix:** Add `@media (prefers-reduced-motion: reduce)` rules in `globals.css` and use utility `motion-reduce:transition-none` on dynamic SVG gauges.

#### Issue L2: Placeholder / Generic Form Filler Copy
- **File Path:** `src/app/(auth)/login/page.tsx` (L94), `src/app/page.tsx` (L30)
- **What's Wrong:** Text contains generic filler copy ("Access your interview sessions and resume ATS insights", "admin@rag or you@example.com").
- **Fix:** Update copy to be concrete and technical: e.g. "Simulate production AI/ML engineering interviews with verified pgvector question banks and Groq LPU sub-second evaluation."

#### Issue L3: Mobile Navigation and Header Compactness
- **File Path:** `src/components/shared/navbar.tsx` (L66–L120)
- **What's Wrong:** On mobile viewports under 640px, the navigation links wrap or crowd the right side of the navbar without a clean responsive glass menu or mobile drawer.
- **Fix:** Refactor into a `GlassNavbar` with a responsive mobile menu toggle, sticky frosted glass blur, and rounded pill containers.

---

## 2. Phase 2 Implementation Plan (Glass Redesign)

1. **Tokens & Theme:**
   - Define `--glass-bg`, `--glass-border`, `--glass-highlight`, `--glass-blur`, and mesh gradient background blobs in `globals.css` and `tailwind.config.ts`.
   - Setup Google fonts pairing: `Plus Jakarta Sans` (Display/Headings) + `Inter` / `Outfit`.

2. **Core Reusable Glass Primitives:**
   - `src/components/ui/glass-card.tsx` (Elevations, highlights, rounded corners)
   - `src/components/ui/glass-button.tsx` (Variants: primary, secondary, ghost, danger)
   - `src/components/ui/glass-input.tsx` (Text inputs, textareas with glass focus rings)
   - `src/components/ui/glass-navbar.tsx` (Sticky glass container with backdrop filter)
   - `src/components/ui/glass-modal.tsx` (Accessible dialog wrapper with backdrop blur)

3. **Page Restyling:**
   - **Shared Layout:** Add ambient floating gradient orbs in `RootLayout`.
   - **Auth Pages:** Glass cards with frosted depth for Login and Registration.
   - **Dashboard & Resume ATS:** Frosted scorecards, illuminated circular SVG gauge, glass file dropzone.
   - **Mock Interview Room:** Question display in an illuminated glass console, real-time response textarea, and polished coaching report card.
   - **Admin Console:** Translucent metrics cards and glass batch progress bars.
   - **Backend Fix:** Update resume upload to utilize `createAdminClient()` ensuring zero permission errors.

4. **Verification:**
   - `npm run lint` and `npm run build` verification.
   - Responsive verification for desktop (1440px) and mobile (375px/390px).

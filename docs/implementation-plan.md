# HANGOUT VN — Implementation Plan

## 1. Objective
Build **HANGOUT VN** ("Discover. Eat. Chill. Repeat."), a production-quality, frontend-only Vietnamese youth food and hangout discovery platform covering all **34 provinces and cities of Vietnam** (under Resolution 202/2025/QH15).

## 2. Core Architecture & Constraints
- **Frontend-only static export** (`output: "export"` in `next.config.ts`) deployable directly to Vercel or any static host.
- **Zero backend, database, auth, or API server.**
- **Local JSON data layer** (`src/data/locations.json`, `src/data/provinces.json`, `src/data/categories.json`) validated with **Zod** and generated from the provided 1,362-location dataset + reusable Excel/CSV importer script (`scripts/import-excel.mjs`).
- **Google Maps URL integration** (no API key required): `getGoogleMapsSearchUrl` and `getGoogleMapsDirectionUrl`.

## 3. Milestones

### Phase 1: Foundation & Design System
- Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui-inspired custom components.
- Custom design tokens matching Warm Cream (`#FFF8ED`), Orange (`#FF7043`), Yellow (`#FFD166`), Dark (`#242424`), Mint (`#B7E4C7`), and Pink (`#FFB4C2`).
- Typography: **Be Vietnam Pro** (headings) + **Inter** (body) via `next/font/google`.
- Responsive floating navigation, footer, and smooth scrolling (Lenis + GSAP ScrollTrigger).

### Phase 2: Data Layer & Excel Importer
- Extract and normalize the provided 1,362-location dataset across all 34 provinces/cities (6 socio-economic regions).
- Build `scripts/import-excel.mjs` supporting `.xlsx` and `.csv` with automatic column detection, normalization, Zod schema validation, duplicate detection, and JSON + validation report export.
- Generate `src/data/locations.json`, `src/data/provinces.json`, and `src/data/categories.json`.
- Implement Vietnamese diacritic-insensitive search (`removeVietnameseTones`) and efficient client-side filtering/sorting/pagination.

### Phase 3: 3D Food Assets (Blender MCP) & Three.js Hero
- Use connected Blender MCP (`execute_blender_code`) to create stylized, low-poly/mid-poly optimized 3D food models and export GLB files to `public/models/food/`:
  1. `banh-mi.glb` (Vietnamese Bánh Mì)
  2. `bubble-tea.glb` (Trà Sữa Trân Châu)
  3. `donut.glb` (Glazed Donut)
  4. `burger.glb` (Cheeseburger)
  5. `fries.glb` (French Fries Cup)
  6. `vietnamese-snack.glb` (Bánh Tráng Trộn / Street Snack Bowl)
- Build modular R3F components: `FoodCanvas`, `FoodScene`, `FoodModel`, `CameraController`, `FloatingFood`, `SceneFallback`.
- Lazy-load Canvas with `next/dynamic` (`ssr: false`), `IntersectionObserver` pause-when-offscreen, adaptive DPR, reduced-motion & low-power mobile fallback.

### Phase 4: GSAP ScrollTrigger Storytelling & Pages
- **Home (`/`)**: Full-screen 3D hero ("Đi đâu hôm nay?") + 4-scene GSAP ScrollTrigger narrative (Welcome → Taste the city → Find your vibe → Explore) + Featured destinations & quick vibe launcher.
- **Explore (`/explore`)**: Real-time diacritic-free search, province/category/budget/vibe filters, price/name sorting, clear filters, responsive grid + mobile Filter Sheet, efficient pagination / load-more.
- **Place Detail (`/places/[id]`)**: Static generation via `generateStaticParams`, full details, price for two, opening hours, vibe tags, Google Maps Search & Directions buttons, similar nearby places, friendly not-found state.
- **Random Recommendation (`/random`)**: Interactive "Đi đâu hôm nay?" generator with province, budget, companion, activity, and vibe selectors, slot-machine/shuffle reveal animation, real filter-respecting algorithm, match explanation, and empty state.
- **Map Explorer (`/map`)**: Address-first regional & province directory with transparent Google Maps URL integration notice and direct search/directions actions.

### Phase 5: SEO, Accessibility, Performance & QA
- Metadata, Open Graph, `robots.txt`, `sitemap.ts` (static-export compatible).
- Verify `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Live browser verification across desktop & mobile viewports.

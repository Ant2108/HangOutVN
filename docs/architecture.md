# HANGOUT VN — System Architecture

## 1. High-Level Overview
HANGOUT VN is a **100% static frontend application** built with Next.js App Router (`output: "export"`). Every page — including all 1,362 `/places/[id]` routes — is pre-rendered at build time.

```
d:\FoodWeb
├── docs/                      # Architecture, schema, design system, plan
├── data/raw/                  # Raw CSV/XLSX source files (build/dev time)
├── scripts/
│   └── import-excel.mjs       # Reusable XLSX/CSV -> JSON converter + validator
├── public/
│   ├── models/food/           # Optimized GLB 3D assets exported from Blender
│   ├── images/                # Curated category/fallback posters & OG image
│   └── robots.txt
└── src/
    ├── app/
    │   ├── layout.tsx         # Root layout, fonts, SmoothScroll, Navbar, Footer
    │   ├── page.tsx           # Home (3D Hero + GSAP Storytelling + Highlights)
    │   ├── explore/page.tsx   # Full location search & filter discovery
    │   ├── places/[id]/       # Pre-rendered place detail pages
    │   ├── random/page.tsx    # Interactive "Đi đâu hôm nay?" recommender
    │   ├── map/page.tsx       # Regional & province Google Maps explorer
    │   ├── not-found.tsx      # Custom 404 page
    │   └── sitemap.ts         # Static sitemap generator
    ├── components/
    │   ├── ui/                # Customized shadcn/ui primitives
    │   ├── layout/            # FloatingNavbar, Footer, PageHeader
    │   ├── three/             # FoodCanvas, FoodScene, FoodModel, CameraController, FloatingFood, SceneFallback
    │   ├── motion/            # SmoothScroll (Lenis+GSAP), ScrollScene, TextReveal
    │   └── places/            # PlaceCard, PlaceGrid, FilterSidebar, FilterSheet, GoogleMapsActions
    ├── data/
    │   ├── locations.json     # Validated 1,362 locations
    │   ├── provinces.json     # Official 34 provinces/cities (Resolution 202/2025/QH15)
    │   └── categories.json    # 6 core hangout categories + metadata
    ├── lib/
    │   ├── types.ts           # TypeScript interfaces + Zod schemas
    │   ├── data.ts            # Typed data accessors & similarity matching
    │   ├── search.ts          # Vietnamese diacritic removal & filtering/sorting
    │   ├── maps.ts            # Google Maps Search & Direction URL builders
    │   ├── recommender.ts     # Filter-strict random recommendation engine
    │   └── utils.ts           # cn(), currency formatters, visual helpers
    └── styles/                # Global CSS tokens & editorial utilities
```

## 2. Performance & Bundle Strategy
- **Route-level isolation of Three.js**: Three.js, `@react-three/fiber`, and `@react-three/drei` are ONLY imported inside `src/components/three/` and dynamically loaded on `/` (`ssr: false`). `/explore`, `/places/[id]`, `/random`, and `/map` ship zero WebGL bundle overhead.
- **Viewport-aware rendering**: `FoodCanvas` uses `IntersectionObserver` to set `frameloop="never"` when scrolled past the hero, eliminating GPU work during reading/browsing.
- **Low-power & reduced-motion fallback**: Detects `prefers-reduced-motion: reduce` and constrained viewports/hardware concurrency to render `SceneFallback` (styled editorial 3D showcase poster) instead of WebGL.
- **Efficient client-side dataset**: 1,362 locations (~450KB raw JSON, ~90KB gzipped) with memoized diacritic-stripped search index and paginated rendering (24 cards per page / load-more) to keep DOM node count low and INP < 200ms.

## 3. Animation Architecture (GSAP + Lenis + Framer Motion)
- `SmoothScroll` initializes Lenis, syncs it with `ScrollTrigger.update`, and drives `lenis.raf` from `gsap.ticker` with `lagSmoothing(0)`. Disabled automatically under `prefers-reduced-motion`.
- `useGSAP` with explicit `scope` refs guarantees deterministic cleanup of timelines and ScrollTriggers on route transitions.
- Framer Motion is reserved exclusively for lightweight UI micro-interactions (modals, filter sheets, randomizer slot animation, hover lifts).

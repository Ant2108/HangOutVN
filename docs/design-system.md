# HANGOUT VN — Design System

## 1. Visual Direction
**3D Immersive + Modern Editorial + Gen Z Lifestyle**
Inspired by contemporary Saigon/Hanoi creative studios and editorial zines: warm sunlit paper tones, expressive oversized typography, tactile 3D street-food sculptures, generous whitespace, and crisp ink borders.

## 2. Color Tokens
| Token | Hex | Usage |
|---|---|---|
| `--bg-cream` | `#FFF8ED` | Primary page canvas (warm paper cream) |
| `--bg-surface` | `#FFFFFF` | Elevated cards, inputs, modals |
| `--bg-cream-deep` | `#F7ECDA` | Secondary bands, subtle editorial panels |
| `--ink-dark` | `#242424` | Primary text, editorial borders, dark contrast buttons |
| `--ink-muted` | `#5E5852` | Secondary copy, metadata (≥ 5.5:1 contrast on `#FFF8ED`) |
| `--accent-orange` | `#FF7043` | Primary brand CTA, active highlights, warmth |
| `--accent-orange-deep` | `#D84E24` | Accessible orange text on light surfaces (≥ 4.6:1 contrast) |
| `--accent-yellow` | `#FFD166` | Playful editorial highlights, star accents, stickers |
| `--accent-mint` | `#B7E4C7` | Fresh tags, chill/coffee accents, success states |
| `--accent-pink` | `#FFB4C2` | Date/sweet accents, secondary sticker badges |

## 3. Typography
- **Display & Headings**: `Be Vietnam Pro` (weights 600, 700, 800) — tight tracking (`-0.03em`), crisp Vietnamese diacritic rendering.
- **Body & UI**: `Inter` (weights 400, 500, 600) — base `16px`, line-height `1.6`.
- **Editorial Scale**:
  - Hero H1: `clamp(3rem, 7vw, 6.25rem)` (48px–100px), leading `0.98`
  - Section H2: `clamp(2rem, 4.2vw, 3.5rem)`, leading `1.08`
  - Card Title: `1.125rem` – `1.25rem`, weight `700`

## 4. Surfaces, Radius & Elevation
- **Cards**: `rounded-[22px]`, subtle `1px solid rgba(36, 36, 36, 0.10)`, warm offset hover elevation (`translateY(-4px)` + soft warm shadow).
- **Navigation**: Floating warm-cream pill bar (`top-4`, subtle backdrop blur `bg-[#FFF8ED]/88`, crisp `1px solid rgba(36,36,36,0.12)`).
- **Texture**: Subtle SVG film-grain overlay at `2.5%` opacity (`pointer-events-none`) for editorial print warmth.
- **Avoid**: Generic dark SaaS dashboards, neon purple gradients, heavy glassmorphism, or excessive pill clutter.

## 5. Accessibility & Motion
- Minimum 4.5:1 text contrast everywhere (use `#242424` on `#FF7043`/`#FFD166`/`#B7E4C7`/`#FFB4C2` or `#FFFFFF` on `#242424`/`#D84E24`).
- Visible `2px solid #FF7043` focus rings with `2px` offset.
- Minimum `44x44px` touch targets on mobile interactive controls.
- Full `prefers-reduced-motion` support across CSS, GSAP, Lenis, Framer Motion, and Three.js.

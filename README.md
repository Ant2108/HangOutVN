# HANGOUT VN — Discover. Eat. Chill. Repeat.

Nền tảng khám phá địa điểm ăn uống, cà phê, hẹn hò, workshop và tọa độ chill dành cho giới trẻ Việt Nam trên khắp **34 tỉnh/thành** (theo Nghị quyết 202/2025/QH15).

## Kiến trúc & Công nghệ

- **100% Frontend-only Static Export** (`output: "export"`), triển khai tĩnh trực tiếp trên Vercel hoặc bất kỳ static host nào.
- **Core**: Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Lucide React.
- **3D**: Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei` (chỉ lazy-load trên trang chủ `/`).
- **Animation**: GSAP, GSAP ScrollTrigger, `@gsap/react`, Lenis smooth scrolling, Framer Motion.
- **Data**: Local JSON (`src/data/locations.json`, `src/data/provinces.json`, `src/data/categories.json`) được kiểm duyệt bằng Zod từ file Excel nguồn (1.362 địa điểm thực tế).
- **Maps**: Liên kết chính thức Google Maps Search & Directions URLs (không yêu cầu API key).

## Chạy dự án cục bộ

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Nhập dữ liệu từ Excel

```bash
npm run import:data
# hoặc chỉ định đường dẫn file Excel khác:
node scripts/import-excel.mjs path/to/file.xlsx
```

Script tự động nhận diện cột, chuẩn hóa dữ liệu, kiểm tra schema với Zod, phát hiện trùng lặp và xuất `src/data/locations.json`, `src/data/provinces.json`, `src/data/categories.json` cùng báo cáo `docs/import-report.json`.

## Build tĩnh (Static Export)

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Thư mục đầu ra tĩnh được tạo tại `out/`, bao gồm toàn bộ 1.362 trang chi tiết `/places/[id]`.

# HANGOUT VN — Data Schema & Pipeline

## 1. Administrative Classification
HANGOUT VN uses the **34 provinces and cities of Vietnam** under **Resolution 202/2025/QH15 (12/06/2025)** grouped into 6 socio-economic regions:
1. Trung du & Miền núi phía Bắc (9)
2. Đồng bằng sông Hồng (6)
3. Bắc Trung Bộ & Duyên hải miền Trung (8)
4. Tây Nguyên (3)
5. Đông Nam Bộ (3)
6. Đồng bằng sông Cửu Long (5)

Legacy districts / merged provinces are preserved in `district` for fast local lookup (e.g., `Quận 1`, `Đà Lạt`, `Hội An`, `Sa Pa`).

## 2. Place Interface (`src/lib/types.ts`)
```ts
export interface Place {
  id: string;
  name: string;
  province: string;
  region?: string;
  district?: string;
  address: string;
  category: CategoryId[]; // "food" | "coffee" | "date" | "chill" | "fun" | "travel"
  primaryType?: string;   // Original source type (e.g., "Ăn uống", "Cà phê", "Workshop - Trải nghiệm")
  subTag?: string;        // Original dish/tag detail (e.g., "Cà phê săn mây", "Bánh tráng")
  priceMin?: number;      // VND per person
  priceMax?: number;      // VND per person
  priceForTwo?: number;   // Estimated VND for two people (2x average per person)
  priceRangeLabel?: string;
  budgetTier?: string;    // "Miễn phí" | "Thấp" | "Trung bình" | "Trung bình - Cao"
  openingHours?: string;
  vibe: string[];         // Normalized atmosphere/vibe tags
  description?: string;
  images: string[];       // Local curated visual paths (no broken external URLs)
  googleMapsUrl?: string; // Generated dynamically via official Google Maps URL pattern
  sourceChannel?: string; // Original discovery channel (e.g., "TikTok / Google Reviews")
  sourceRef?: string;     // Original source reference
  featured?: boolean;
}
```

## 3. Category Mapping
Source `Loại hình chính` + `Chi tiết món / Tag` + notes are mapped deterministically into the 6 HANGOUT VN discovery categories:
- `food`: Ăn uống, Ăn vặt - Hàng rong, nhà hàng, bún/phở/cơm/lẩu/nướng
- `coffee`: Cà phê, trà sữa, matcha, rooftop cafe, study/working space
- `date`: Quán hẹn hò, rooftop, view hoàng hôn/sông/biển, nhà hàng Âu, workshop đôi
- `chill`: Sân vườn, yên tĩnh, acoustic, ven hồ, đồi chè, cà phê đọc sách
- `fun`: Workshop - Trải nghiệm, gốm, vẽ tranh, nến thơm, GoKart, VR, karaoke box, phố đi bộ
- `travel`: Ngắm cảnh, dạo chơi ngoài trời, săn mây, bãi biển, quảng trường, làng nghề

## 4. Budget Buckets (Estimated Cost for Two)
- `under-100k`: 0 – 100,000 VNĐ (includes Free & street food)
- `100k-200k`: 100,000 – 200,000 VNĐ
- `200k-300k`: 200,000 – 300,000 VNĐ
- `300k-500k`: 300,000 – 500,000 VNĐ
- `above-500k`: > 500,000 VNĐ

## 5. Excel / CSV Importer (`scripts/import-excel.mjs`)
1. Reads `.xlsx` (via `xlsx`) or `.csv` input file.
2. Auto-detects header row and maps columns without guessing ambiguous columns.
3. Normalizes province names, parses VND prices, computes `priceForTwo`, extracts normalized categories & vibe tags.
4. Validates every record against the Zod `PlaceSchema`.
5. Detects potential duplicates (normalized `name + province + address`).
6. Writes `src/data/locations.json`, `src/data/provinces.json`, and `docs/import-report.json`.

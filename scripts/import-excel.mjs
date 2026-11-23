#!/usr/bin/env node
/**
 * HANGOUT VN — Excel-to-JSON Importer & Validator
 * Usage: node scripts/import-excel.mjs [path-to-xlsx]
 *
 * 1. Reads provided XLSX workbook
 * 2. Detects columns automatically from header row
 * 3. Normalizes field names, prices, categories, vibes, and URLs
 * 4. Converts rows to the typed Place schema
 * 5. Validates every record with Zod
 * 6. Detects potential duplicates
 * 7. Exports src/data/locations.json, src/data/provinces.json, src/data/categories.json
 * 8. Writes validation report to docs/import-report.json
 */

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { z } from "zod";

const INPUT_PATH = process.argv[2] || path.resolve("data/raw/hangout-vn-data.xlsx");
const DATA_DIR = path.resolve("src/data");
const REPORT_PATH = path.resolve("docs/import-report.json");

const PlaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  province: z.string().min(1),
  region: z.string().optional(),
  district: z.string().optional(),
  address: z.string().min(1),
  category: z.array(z.enum(["food", "coffee", "date", "chill", "fun", "travel"])).min(1),
  primaryType: z.string().optional(),
  subTag: z.string().optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  priceForTwo: z.number().nonnegative().optional(),
  priceRangeLabel: z.string().optional(),
  budgetTier: z.string().optional(),
  openingHours: z.string().optional(),
  vibe: z.array(z.string()).min(1),
  description: z.string().optional(),
  images: z.array(z.string()).min(1),
  googleMapsUrl: z.string().url().optional(),
  menuUrl: z.string().url().optional(),
  reviewUrl: z.string().url().optional(),
  sourceChannel: z.string().optional(),
  sourceRef: z.string().optional(),
  featured: z.boolean().optional(),
});

function removeDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function cleanText(val) {
  if (val === undefined || val === null) return "";
  return String(val).replace(/\r\n/g, " ").replace(/\s+/g, " ").trim();
}

function cleanUrl(raw) {
  if (!raw) return undefined;
  let url = String(raw).replace(/&amp;/g, "&").trim();
  if (!/^https?:\/\//i.test(url)) return undefined;
  try {
    // Fix mojibake if xlsx decoded UTF-8 bytes as Latin-1
    if (/[ÃÂÄÆ]/.test(url)) {
      url = Buffer.from(url, "latin1").toString("utf8");
    }
    const u = new URL(url);
    return u.toString();
  } catch {
    return undefined;
  }
}

function parsePriceRange(rangeStr, avgPerPerson) {
  const avg = Number(avgPerPerson);
  const validAvg = Number.isFinite(avg) && avg >= 0 ? Math.round(avg) : undefined;
  const text = cleanText(rangeStr).toLowerCase();

  if (text === "0đ" || text === "0" || validAvg === 0) {
    return { priceMin: 0, priceMax: 0, priceForTwo: 0 };
  }

  // Extract numeric ranges like "40.000 - 70.000đ", "40 - 60k", "35k-50k", "200k"
  const cleaned = text.replace(/\./g, "").replace(/,/g, "");
  const nums = [];
  const regex = /(\d+)\s*(k|đ|d|vnd)?/g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    let n = parseInt(m[1], 10);
    if (!Number.isFinite(n)) continue;
    // Heuristic: values under 1000 with 'k' or in range context are thousands
    if (m[2] === "k" || (n > 0 && n < 2000 && text.includes("k"))) {
      n *= 1000;
    } else if (n > 0 && n < 1000 && !text.includes("h") && !text.includes("/")) {
      n *= 1000;
    }
    if (n >= 0 && n <= 10000000) nums.push(n);
  }

  let priceMin = validAvg;
  let priceMax = validAvg;
  if (nums.length >= 2) {
    priceMin = Math.min(nums[0], nums[1]);
    priceMax = Math.max(nums[0], nums[1]);
  } else if (nums.length === 1 && validAvg === undefined) {
    priceMin = nums[0];
    priceMax = nums[0];
  } else if (validAvg !== undefined) {
    priceMin = Math.round(validAvg * 0.75);
    priceMax = Math.round(validAvg * 1.25);
  }

  const perPerson = validAvg !== undefined ? validAvg : priceMin !== undefined && priceMax !== undefined ? Math.round((priceMin + priceMax) / 2) : 45000;
  return {
    priceMin,
    priceMax,
    priceForTwo: perPerson * 2,
  };
}

function deriveCategories(primaryType, subTag, desc, name) {
  const p = removeDiacritics(primaryType);
  const full = removeDiacritics(`${primaryType} ${subTag} ${desc} ${name}`);
  const cats = new Set();

  if (p.includes("an uong") || p.includes("an vat")) cats.add("food");
  if (p.includes("ca phe") || full.includes("cafe") || full.includes("coffee") || full.includes("tra sua") || full.includes("matcha")) {
    cats.add("coffee");
  }
  if (p.includes("workshop") || full.includes("workshop") || full.includes("gokart") || full.includes("karaoke") || full.includes("game") || full.includes("vr") || full.includes("chup anh") || full.includes("photobooth")) {
    cats.add("fun");
  }
  if (p.includes("ngam canh") || p.includes("dao choi") || full.includes("san may") || full.includes("bai bien") || full.includes("pho di bo") || full.includes("quang truong") || full.includes("doi che")) {
    cats.add("travel");
  }

  // Date signals
  if (
    full.includes("hen ho") ||
    full.includes("lang man") ||
    full.includes("cap doi") ||
    full.includes("rooftop") ||
    full.includes("hoang hon") ||
    full.includes("steak") ||
    full.includes("bistro") ||
    full.includes("workshop") ||
    full.includes("nen thom") ||
    full.includes("lam gom") ||
    full.includes("view")
  ) {
    cats.add("date");
  }

  // Chill signals
  if (
    full.includes("chill") ||
    full.includes("yen tinh") ||
    full.includes("san vuon") ||
    full.includes("acoustic") ||
    full.includes("ven ho") ||
    full.includes("ven song") ||
    full.includes("cay xanh") ||
    full.includes("hoc tap") ||
    full.includes("lam viec") ||
    full.includes("vintage") ||
    full.includes("binh yen")
  ) {
    cats.add("chill");
  }

  if (cats.size === 0) cats.add("food");
  return Array.from(cats);
}

function deriveVibes(primaryType, subTag, desc, budgetTier) {
  const full = removeDiacritics(`${primaryType} ${subTag} ${desc} ${budgetTier}`);
  const vibes = new Set();

  if (full.includes("chill") || full.includes("thu gian") || full.includes("binh yen")) vibes.add("Chill");
  if (full.includes("lang man") || full.includes("hen ho") || full.includes("cap doi") || full.includes("hoang hon")) vibes.add("Lãng mạn");
  if (full.includes("san vuon") || full.includes("cay xanh") || full.includes("thien nhien") || full.includes("doi")) vibes.add("Xanh mát");
  if (full.includes("vintage") || full.includes("hoai co") || full.includes("co dien") || full.includes("xua")) vibes.add("Vintage");
  if (full.includes("rooftop") || full.includes("tang thuong") || full.includes("sky") || full.includes("view") || full.includes("san may")) vibes.add("View đẹp");
  if (full.includes("via he") || full.includes("hem") || full.includes("hang rong") || full.includes("binh dan") || full.includes("sinh vien") || full.includes("an vat")) vibes.add("Đường phố");
  if (full.includes("yen tinh") || full.includes("hoc tap") || full.includes("lam viec") || full.includes("study") || full.includes("sach")) vibes.add("Yên tĩnh");
  if (full.includes("workshop") || full.includes("gom") || full.includes("ve tranh") || full.includes("thu cong") || full.includes("nen")) vibes.add("Sáng tạo");
  if (full.includes("check-in") || full.includes("aesthetic") || full.includes("chup anh") || full.includes("han quoc") || full.includes("toi gian")) vibes.add("Check-in");
  if (full.includes("soi dong") || full.includes("nhau") || full.includes("pho di bo") || full.includes("nhom") || full.includes("buffet") || full.includes("bbq")) vibes.add("Sôi động");
  if (full.includes("an dem") || full.includes("khuya") || full.includes("23:") || full.includes("02:") || full.includes("1h")) vibes.add("Đêm muộn");
  if (removeDiacritics(budgetTier) === "mien phi") vibes.add("Miễn phí");

  if (vibes.size === 0) {
    const p = removeDiacritics(primaryType);
    if (p.includes("ca phe")) vibes.add("Chill");
    else if (p.includes("an vat")) vibes.add("Đường phố");
    else if (p.includes("workshop")) vibes.add("Sáng tạo");
    else if (p.includes("ngam canh") || p.includes("dao choi")) vibes.add("View đẹp");
    else vibes.add("Bản địa");
  }

  return Array.from(vibes).slice(0, 4);
}

function pickCategoryImage(categories, primaryType, subTag) {
  const full = removeDiacritics(`${primaryType} ${subTag}`);
  if (full.includes("tra sua") || full.includes("matcha") || categories[0] === "coffee" || removeDiacritics(primaryType).includes("ca phe")) {
    return ["/images/places/coffee.jpg"];
  }
  if (categories.includes("fun") || removeDiacritics(primaryType).includes("workshop")) {
    return ["/images/places/fun.svg"];
  }
  if (categories.includes("travel") || removeDiacritics(primaryType).includes("ngam canh") || removeDiacritics(primaryType).includes("dao choi")) {
    return ["/images/places/travel.svg"];
  }
  if (categories.includes("date") && !full.includes("an vat")) {
    return ["/images/places/date.svg"];
  }
  if (full.includes("an vat") || full.includes("banh trang") || full.includes("banh mi") || full.includes("ca vien")) {
    return ["/images/places/streetfood.jpg"];
  }
  if (categories.includes("chill")) {
    return ["/images/places/chill.svg"];
  }
  return ["/images/places/food.jpg"];
}

function getCellHyperlink(ws, colIndex, rowIndex) {
  const addr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
  const cell = ws[addr];
  if (!cell || !cell.l || !cell.l.Target) return undefined;
  return cleanUrl(cell.l.Target);
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found: ${INPUT_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(INPUT_PATH);
  const dataSheetName = wb.SheetNames.find((n) => removeDiacritics(n).includes("dia_diem") || removeDiacritics(n).includes("du_lieu")) || wb.SheetNames[0];
  const ws = wb.Sheets[dataSheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Auto-detect header row
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const joined = rows[i].map((c) => removeDiacritics(c)).join("|");
    if (joined.includes("ten dia diem") && joined.includes("tinh/thanh")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) {
    console.error("Could not detect header row in sheet:", dataSheetName);
    process.exit(1);
  }

  const headers = rows[headerRowIdx].map((h) => cleanText(h));
  const colMap = {};
  headers.forEach((h, idx) => {
    const n = removeDiacritics(h);
    if (n.includes("ma dd") || n === "id") colMap.id = idx;
    else if (n.includes("vung mien")) colMap.region = idx;
    else if (n.includes("tinh/thanh moi") || n === "province") colMap.province = idx;
    else if (n.includes("ten dia diem") || n === "name") colMap.name = idx;
    else if (n.includes("khu vuc") || n.startsWith("quan")) colMap.district = idx;
    else if (n.includes("loai hinh")) colMap.primaryType = idx;
    else if (n.includes("chi tiet mon") || n.includes("tag")) colMap.subTag = idx;
    else if (n.includes("muc ngan sach")) colMap.budgetTier = idx;
    else if (n.includes("chi phi tb")) colMap.avgPrice = idx;
    else if (n.includes("khoang gia")) colMap.priceRange = idx;
    else if (n.includes("gio mo cua")) colMap.openingHours = idx;
    else if (n.includes("dia chi")) colMap.address = idx;
    else if (n === "menu") colMap.menu = idx;
    else if (n.includes("diem noi bat") || n.includes("ghi chu")) colMap.description = idx;
    else if (n.includes("kenh goi y")) colMap.sourceChannel = idx;
    else if (n.includes("nguon xac minh")) colMap.sourceRef = idx;
  });

  const places = [];
  const validationErrors = [];
  const duplicates = [];
  const seenKeys = new Map();

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => cleanText(c) === "")) continue;

    const rawId = cleanText(row[colMap.id]) || `DD${String(places.length + 1).padStart(4, "0")}`;
    const name = cleanText(row[colMap.name]);
    const province = cleanText(row[colMap.province]);
    const region = cleanText(row[colMap.region]) || undefined;
    const district = cleanText(row[colMap.district]) || undefined;
    const address = cleanText(row[colMap.address]) || `${district ? district + ", " : ""}${province}`;
    const primaryType = cleanText(row[colMap.primaryType]) || "Ăn uống";
    const subTag = cleanText(row[colMap.subTag]) || undefined;
    const budgetTier = cleanText(row[colMap.budgetTier]) || undefined;
    const priceRangeLabel = cleanText(row[colMap.priceRange]) || undefined;
    const openingHours = cleanText(row[colMap.openingHours]) || undefined;
    const description = cleanText(row[colMap.description]) || undefined;
    const sourceChannel = cleanText(row[colMap.sourceChannel]) || undefined;
    const sourceRef = cleanText(row[colMap.sourceRef]) || undefined;

    if (!name || !province) {
      validationErrors.push({ row: r + 1, id: rawId, reason: "Missing name or province" });
      continue;
    }

    const dupKey = `${removeDiacritics(name)}|${removeDiacritics(province)}|${removeDiacritics(address)}`;
    if (seenKeys.has(dupKey)) {
      duplicates.push({ row: r + 1, id: rawId, duplicateOf: seenKeys.get(dupKey), name, province });
    } else {
      seenKeys.set(dupKey, rawId);
    }

    const { priceMin, priceMax, priceForTwo } = parsePriceRange(priceRangeLabel, row[colMap.avgPrice]);
    const category = deriveCategories(primaryType, subTag, description, name);
    const vibe = deriveVibes(primaryType, subTag, description, budgetTier);
    const images = pickCategoryImage(category, primaryType, subTag);

    const googleMapsUrl = colMap.address !== undefined ? getCellHyperlink(ws, colMap.address, r) : undefined;
    const menuUrl = colMap.menu !== undefined ? getCellHyperlink(ws, colMap.menu, r) : undefined;
    const reviewUrl = colMap.sourceRef !== undefined ? getCellHyperlink(ws, colMap.sourceRef, r) : undefined;

    // Mark curated flagship places (rich descriptions from diverse provinces) as featured
    const isFeatured =
      Boolean(description && description.length > 55) &&
      (Number(rawId.replace(/\D/g, "")) <= 145 ||
        ["DD0143", "DD0145", "DD0146", "DD0177", "DD0184", "DD0187", "DD0192", "DD0195", "DD0213", "DD0216"].includes(rawId));

    const candidate = {
      id: rawId.toLowerCase(),
      name,
      province,
      region,
      district,
      address,
      category,
      primaryType,
      subTag,
      priceMin,
      priceMax,
      priceForTwo,
      priceRangeLabel,
      budgetTier,
      openingHours,
      vibe,
      description,
      images,
      googleMapsUrl,
      menuUrl,
      reviewUrl,
      sourceChannel,
      sourceRef,
      featured: isFeatured || undefined,
    };

    const parsed = PlaceSchema.safeParse(candidate);
    if (!parsed.success) {
      validationErrors.push({ row: r + 1, id: rawId, issues: parsed.error.issues });
      continue;
    }
    places.push(parsed.data);
  }

  // Parse official 34 provinces sheet
  const provSheetName = wb.SheetNames.find((n) => removeDiacritics(n).includes("34_tinh") || removeDiacritics(n).includes("danh_muc"));
  const provinces = [];
  if (provSheetName) {
    const pws = wb.Sheets[provSheetName];
    const prows = XLSX.utils.sheet_to_json(pws, { header: 1, defval: "" });
    for (let r = 0; r < prows.length; r++) {
      const row = prows[r];
      const stt = Number(row[0]);
      if (Number.isInteger(stt) && stt >= 1 && stt <= 34) {
        const name = cleanText(row[1]);
        const region = cleanText(row[2]);
        const mergedFrom = cleanText(row[3]);
        const count = places.filter((p) => p.province === name).length;
        const avgPerPerson = count > 0
          ? Math.round(places.filter((p) => p.province === name).reduce((acc, p) => acc + (p.priceForTwo || 0) / 2, 0) / count)
          : 0;
        provinces.push({
          code: stt,
          slug: removeDiacritics(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          name,
          region,
          mergedFrom,
          placeCount: count,
          avgPricePerPerson: avgPerPerson,
        });
      }
    }
  }

  const categories = [
    {
      id: "food",
      name: "Ăn uống",
      englishName: "Food",
      tagline: "Từ hẻm ăn vặt bình dân đến quán ngon bản địa",
      accent: "#FF7043",
      image: "/images/places/food.jpg",
      count: places.filter((p) => p.category.includes("food")).length,
    },
    {
      id: "coffee",
      name: "Cà phê & Trà sữa",
      englishName: "Coffee",
      tagline: "Cà phê aesthetic, matcha chuẩn vị & góc chạy deadline",
      accent: "#FFD166",
      image: "/images/places/coffee.jpg",
      count: places.filter((p) => p.category.includes("coffee")).length,
    },
    {
      id: "date",
      name: "Hẹn hò",
      englishName: "Date",
      tagline: "Rooftop hoàng hôn, bistro ấm cúng & tọa độ lãng mạn",
      accent: "#FFB4C2",
      image: "/images/places/date.svg",
      count: places.filter((p) => p.category.includes("date")).length,
    },
    {
      id: "chill",
      name: "Chill & Thư giãn",
      englishName: "Chill",
      tagline: "Sân vườn xanh mát, ven hồ gió lộng & acoustic tối",
      accent: "#B7E4C7",
      image: "/images/places/chill.svg",
      count: places.filter((p) => p.category.includes("chill")).length,
    },
    {
      id: "fun",
      name: "Vui chơi & Workshop",
      englishName: "Fun",
      tagline: "Làm gốm, nến thơm, photobooth, GoKart & trải nghiệm mới",
      accent: "#FFD166",
      image: "/images/places/fun.svg",
      count: places.filter((p) => p.category.includes("fun")).length,
    },
    {
      id: "travel",
      name: "Khám phá & Ngắm cảnh",
      englishName: "Travel",
      tagline: "Săn mây, phố đi bộ, bãi biển & check-in khắp 34 tỉnh thành",
      accent: "#FF7043",
      image: "/images/places/travel.svg",
      count: places.filter((p) => p.category.includes("travel")).length,
    },
  ];

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, "locations.json"), JSON.stringify(places, null, 2), "utf8");
  fs.writeFileSync(path.join(DATA_DIR, "provinces.json"), JSON.stringify(provinces, null, 2), "utf8");
  fs.writeFileSync(path.join(DATA_DIR, "categories.json"), JSON.stringify(categories, null, 2), "utf8");

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.basename(INPUT_PATH),
    sheetUsed: dataSheetName,
    detectedColumns: colMap,
    totalValidPlaces: places.length,
    totalProvinces: provinces.length,
    categoryCounts: Object.fromEntries(categories.map((c) => [c.id, c.count])),
    potentialDuplicatesCount: duplicates.length,
    potentialDuplicatesSample: duplicates.slice(0, 20),
    validationErrorsCount: validationErrors.length,
    validationErrors: validationErrors.slice(0, 20),
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log(`Imported ${places.length} places across ${provinces.length} provinces.`);
  console.log(`Categories:`, report.categoryCounts);
  console.log(`Potential duplicates detected: ${duplicates.length}`);
  console.log(`Validation errors: ${validationErrors.length}`);
}

main();

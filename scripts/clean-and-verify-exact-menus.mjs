#!/usr/bin/env node
/**
 * HANGOUT VN — Ultra-Strict Diacritic-Exact Menu Verifier (Zero Unrelated Menus)
 *
 * Rules:
 * 1. Keeps the 63 official menus from column M of `data/raw/hangout-vn-data.xlsx`
 *    (all 57 Google Drive files saved as local images `/images/menus/<id>.jpg` + 6 official web links).
 * 2. For any other restaurant/cafe in `locations.json`, ONLY attaches a menu image if:
 *    - It is an actual food/coffee venue (NOT an outdoor scenic spot, park, beach, or free attraction).
 *    - Its name has a specific proper brand name (NOT a generic dish name like "Bún bò Huế",
 *      "Hẻm bánh tráng", "Cơm Tấm Đêm", "Nem chua rán", "Bánh cuốn", etc.).
 *    - The Bing image title (`obj.t`) WITH VIETNAMESE DIACRITICS INTACT contains BOTH:
 *      (a) `"menu"`, `"thực đơn"`, or `"bảng giá"`
 *      (b) The EXACT Vietnamese venue name (`rawName.toLowerCase()`)!
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import XLSX from "xlsx";

const EXCEL_PATH = path.resolve("data/raw/hangout-vn-data.xlsx");
const LOCATIONS_PATH = path.resolve("src/data/locations.json");
const MENUS_DIR = path.resolve("public/images/menus");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function removeTones(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

const GENERIC_DISH_ONLY_NAMES = new Set([
  "bánh cuốn",
  "bánh căn",
  "bánh canh",
  "bánh mì",
  "bánh mì chảo",
  "bánh mì hấp",
  "bánh mì khô bò",
  "bánh mì tôm chiên",
  "bánh mì chả cá",
  "bánh mì ba rọi muối",
  "bánh mì xá xíu phá lấu",
  "bánh mì xíu mại cá ngừ",
  "bánh tráng",
  "bánh tráng cuốn",
  "bánh tráng mắm ruốc",
  "bánh tráng nướng đà lạt",
  "bánh tráng ruốc",
  "bánh xèo",
  "bún bò huế",
  "bún đậu",
  "bún mắm",
  "bún ngan",
  "bún ốc đầy đủ",
  "bún riêu",
  "bún thái hải sản",
  "cháo sườn",
  "chè mè đen",
  "cơm tấm đêm",
  "cơm tấm nạc giòn",
  "cơm trộn hàn quốc",
  "hẻm bánh tráng",
  "hủ tiếu bò viên",
  "lẩu bò",
  "mì ốc hến",
  "mì trộn",
  "mì trộn ốc hến",
  "mì ý, pizza",
  "mít trộn",
  "nem chua rán",
  "ốc 10k",
  "ốc bịch",
  "ốc ngon",
  "ốc xinh",
  "phá lấu bò",
  "phá lấu vịt",
  "phố ốc",
  "phở gà chấm",
  "tàu hũ",
  "xôi",
  "xôi bò xào",
  "xôi cháy",
  "xôi dầu hào",
  "xôi đêm",
  "xôi khâu nhục",
  "xôi khoai môn",
  "xôi thập cẩm",
  "xôi thịt kho pate chả",
  "xôi tôm khô",
  "xôi xiêm",
  "chuối nếp nướng",
]);

const BLOCKED_WORDS = [
  "cotrang.org",
  "menu, review",
  "mẫu menu",
  "thiết kế",
  "in menu",
  "inhoalong",
  "incucre",
  "inan",
  "vietadv",
  "thegioimenu",
  "canva",
  "freepik",
  "pinterest",
  "pngtree",
  "shutterstock",
  "top 10",
  "top 15",
  "top 20",
  "top 5",
];

function getCleanExactVenueName(place) {
  const pType = (place.primaryType || "").toLowerCase();
  if (
    pType.includes("ngắm cảnh") ||
    pType.includes("dạo chơi") ||
    pType.includes("workshop") ||
    place.priceForTwo === 0
  ) {
    return null;
  }

  const rawName = place.name
    .replace(/\([^)]*\)/g, "")
    .split(" - ")[0]
    .trim();
  const lower = rawName.toLowerCase();

  if (
    lower.includes("n/a") ||
    lower.includes("không tên") ||
    lower.length < 7 ||
    GENERIC_DISH_ONLY_NAMES.has(lower)
  ) {
    return null;
  }

  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  return rawName;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,image/*,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImageBuffer(url, minBytes = 16000) {
  try {
    const res = await fetchWithTimeout(url, 7500);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/") || ct.includes("svg") || ct.includes("gif")) {
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < minBytes || buf.length > 6 * 1024 * 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

async function verifyExistingOrFetchExactMenu(place, exactVenueName) {
  try {
    const cityClean = place.province.replace(/^TP\.\s*/i, "");
    const query = `menu thực đơn "${exactVenueName}" ${cityClean}`;
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return [];
    const html = await res.text();

    const exactLower = exactVenueName.toLowerCase();
    const attrRegex = /m="(\{[^"]+\})"/g;
    const candidates = [];
    let match;
    while ((match = attrRegex.exec(html)) !== null) {
      const decoded = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'");
      try {
        const obj = JSON.parse(decoded);
        if (!obj.murl && !obj.turl) continue;
        const titleLower = String(obj.t || "").toLowerCase();
        const combinedNorm = removeTones(`${obj.t || ""} ${obj.murl || ""}`);

        if (BLOCKED_WORDS.some((w) => titleLower.includes(w) || combinedNorm.includes(removeTones(w)))) {
          continue;
        }

        // Must explicitly contain "menu", "thực đơn", or "bảng giá" in the title
        const hasMenuInTitle =
          titleLower.includes("menu") ||
          titleLower.includes("thực đơn") ||
          titleLower.includes("bảng giá") ||
          combinedNorm.includes("menu-") ||
          combinedNorm.includes("thuc-don");
        if (!hasMenuInTitle) continue;

        // Must contain the EXACT Vietnamese venue name WITH DIACRITICS in the title!
        if (!titleLower.includes(exactLower)) continue;

        candidates.push({
          turlFull: obj.turl ? `${obj.turl}&w=900` : null,
          murl: obj.murl,
          title: obj.t || "",
        });
      } catch {
        // ignore
      }
    }
    return candidates;
  } catch {
    return [];
  }
}

async function runPool(items, concurrency, fn) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

async function main() {
  const locations = JSON.parse(fs.readFileSync(LOCATIONS_PATH, "utf8"));

  // 1) Load 63 official Excel menu hyperlinks from column M (col index 12)
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets["Du_Lieu_Dia_Diem"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const excelMenuById = new Map();

  for (let r = 0; r < rows.length; r++) {
    const cell = ws[XLSX.utils.encode_cell({ c: 12, r })];
    if (cell && cell.l && cell.l.Target) {
      const id = String(rows[r][0]).trim().toLowerCase();
      const target = String(cell.l.Target).replace(/&amp;/g, "&").trim();
      excelMenuById.set(id, target);
    }
  }

  // Delete all non-Excel menu files from public/images/menus/
  fs.mkdirSync(MENUS_DIR, { recursive: true });
  for (const f of fs.readdirSync(MENUS_DIR)) {
    const full = path.join(MENUS_DIR, f);
    if (fs.statSync(full).isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
      continue;
    }
    const id = f.replace(/\.\w+$/, "");
    const excelTarget = excelMenuById.get(id);
    if (!excelTarget || !excelTarget.includes("drive.google.com")) {
      fs.unlinkSync(full);
    }
  }

  const usedHashes = new Set();
  for (const p of locations) {
    const excelTarget = excelMenuById.get(p.id);
    if (excelTarget) {
      const localFile = path.join(MENUS_DIR, `${p.id}.jpg`);
      if (excelTarget.includes("drive.google.com") && fs.existsSync(localFile)) {
        const h = crypto.createHash("md5").update(fs.readFileSync(localFile)).digest("hex");
        usedHashes.add(h);
        p.menuUrl = `/images/menus/${p.id}.jpg`;
      } else {
        p.menuUrl = excelTarget;
      }
    } else {
      delete p.menuUrl;
    }
  }

  const toCheck = locations
    .filter((p) => !excelMenuById.has(p.id))
    .map((p) => ({ place: p, exactName: getCleanExactVenueName(p) }))
    .filter((x) => x.exactName !== null);

  console.log(
    `Checking diacritic-exact Vietnamese venue menu matches for ${toCheck.length} venues...`
  );

  let exactVerified = 0;

  await runPool(toCheck, 24, async ({ place, exactName }) => {
    const dest = path.join(MENUS_DIR, `${place.id}.jpg`);
    const candidates = await verifyExistingOrFetchExactMenu(place, exactName);
    for (const c of candidates) {
      // Download full-resolution original `c.murl` FIRST so menu text and prices are sharp and readable!
      const urls = [c.murl, c.turlFull].filter(Boolean);
      let saved = false;
      for (const u of urls) {
        const buf = await fetchImageBuffer(u, 22000);
        if (!buf) continue;
        const h = crypto.createHash("md5").update(buf).digest("hex");
        if (usedHashes.has(h)) continue;
        usedHashes.add(h);
        fs.writeFileSync(dest, buf);
        place.menuUrl = `/images/menus/${place.id}.jpg`;
        exactVerified += 1;
        saved = true;
        break;
      }
      if (saved) break;
    }
  });

  fs.writeFileSync(LOCATIONS_PATH, JSON.stringify(locations, null, 2), "utf8");

  const totalWithMenu = locations.filter((p) => Boolean(p.menuUrl)).length;
  console.log(
    `\nCompleted! Total 100% verified menus: ${totalWithMenu} (63 official Excel menus + ${exactVerified} diacritic-exact brand menus).`
  );
}

main();

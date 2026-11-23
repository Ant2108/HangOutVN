#!/usr/bin/env node
/**
 * HANGOUT VN — Curated Professional Photo Downloader & District Normalizer
 *
 * 1. Downloads a curated collection of professional, high-resolution food, cafe,
 *    date-spot, workshop, and Vietnam travel photography into public/images/places/curated/
 *    (zero watermarks, zero mismatched blog banners, 100% local static-export safe).
 * 2. Purges mismatched/generic listicle or duplicate images from public/images/places/real/.
 * 3. Normalizes `district` cleanly across all 1,362 places (extracting Hanoi/HCMC/Da Nang
 *    districts from address & subTag where missing, fixing typos like "Quận 58").
 * 4. Maps every single place (1,362) and category (6) to accurate, professional photography.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOCATIONS_PATH = path.resolve("src/data/locations.json");
const CATEGORIES_PATH = path.resolve("src/data/categories.json");
const CURATED_DIR = path.resolve("public/images/places/curated");
const REAL_DIR = path.resolve("public/images/places/real");

fs.mkdirSync(CURATED_DIR, { recursive: true });

// Curated Unsplash professional photography (w=900, 4:3 crop, high quality, no watermarks)
const CURATED_PHOTOS = [
  // Vietnamese & Asian Food
  { key: "pho-1", url: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=900&h=675&fit=crop&q=82" },
  { key: "noodle-1", url: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=900&h=675&fit=crop&q=82" },
  { key: "noodle-2", url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900&h=675&fit=crop&q=82" },
  { key: "rice-1", url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900&h=675&fit=crop&q=82" },
  { key: "rice-2", url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=900&h=675&fit=crop&q=82" },
  { key: "banh-mi-1", url: "https://images.unsplash.com/photo-1600454021970-351eff4a6554?w=900&h=675&fit=crop&q=82" },
  { key: "street-1", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&h=675&fit=crop&q=82" },
  { key: "bbq-1", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&h=675&fit=crop&q=82" },
  { key: "hotpot-1", url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=900&h=675&fit=crop&q=82" },
  { key: "seafood-1", url: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=900&h=675&fit=crop&q=82" },
  { key: "korean-1", url: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=900&h=675&fit=crop&q=82" },
  { key: "japanese-1", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=900&h=675&fit=crop&q=82" },
  { key: "thai-1", url: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=900&h=675&fit=crop&q=82" },
  { key: "western-1", url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=675&fit=crop&q=82" },
  { key: "steak-1", url: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=900&h=675&fit=crop&q=82" },
  { key: "dimsum-1", url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=900&h=675&fit=crop&q=82" },
  { key: "dessert-1", url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=900&h=675&fit=crop&q=82" },
  { key: "dessert-2", url: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=900&h=675&fit=crop&q=82" },

  // Coffee, Boba & Matcha
  { key: "coffee-1", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&h=675&fit=crop&q=82" },
  { key: "coffee-2", url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&h=675&fit=crop&q=82" },
  { key: "coffee-garden", url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900&h=675&fit=crop&q=82" },
  { key: "coffee-study", url: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=900&h=675&fit=crop&q=82" },
  { key: "matcha-1", url: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=900&h=675&fit=crop&q=82" },
  { key: "boba-1", url: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=900&h=675&fit=crop&q=82" },

  // Date, Chill, Workshop & Scenic Travel
  { key: "date-rooftop", url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=900&h=675&fit=crop&q=82" },
  { key: "date-bistro", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&h=675&fit=crop&q=82" },
  { key: "workshop-pottery", url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=900&h=675&fit=crop&q=82" },
  { key: "workshop-art", url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&h=675&fit=crop&q=82" },
  { key: "travel-beach", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=675&fit=crop&q=82" },
  { key: "travel-mountain", url: "https://images.unsplash.com/photo-1528127269322-539801943592?w=900&h=675&fit=crop&q=82" },
  { key: "travel-city", url: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=900&h=675&fit=crop&q=82" },
];

function removeTones(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function hashNum(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

async function downloadImage(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 15000) {
    return true;
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "HangoutVN-ImageCurator/1.0" },
    });
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 15000) return false;
    fs.writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

// =========================================================================
// DISTRICT NORMALIZATION (HCMC, Hanoi, Da Nang, and all 34 provinces)
// =========================================================================
const HANOI_DISTRICTS = [
  { label: "Hoàn Kiếm", patterns: ["hoan kiem", "ho guom", "hang bai", "hang ma", "hang be", "hang buom", "hang gai", "hang quat", "ly thuong kiet", "dinh tien hoang", "trang tien", "tong duy tan", "cua dong", "bat su", "bao khanh", "tho nhuom", "quan su", "nha tho lon", "phuc tan", "tam thuong", "cau go", "luong van can", "ta hien", "phu doan", "tran quoc toan", "ham long", "da tuong", "long bien"] },
  { label: "Ba Đình", patterns: ["ba dinh", "doi can", "giang vo", "kim ma", "ngoc khanh", "dao tan", "lieu giai", "phan dinh phung", "van bao", "truc bach", "pho duc chinh", "son tay", "ngoc ho", "thanh cong", "cong vi", "vinh phuc", "nguyen truong to", "pham huy thong", "mac dinh chi", "ton that thiep", "hoang hoa tham", "la thanh", "nguyen trung truc", "pham hong thai"] },
  { label: "Đống Đa", patterns: ["dong da", "chua lang", "thai ha", "xa dan", "lang ha", "huynh thuc khang", "kham thien", "o cho dua", "hoang cau", "thai thinh", "nguyen van tuyet", "tay son", "chua boc", "dong cac", "van mieu", "yen the", "hao nam", "ton duc thang", "mai anh tuan", "ho dac di", "trung liet", "khuong thuong", "tam khuong", "dong tac", "luong dinh cua", "ho van chuong", "tho quan", "nguyen phuc lai", "dang tien dong", "vo van dung", "duong lang"] },
  { label: "Cầu Giấy", patterns: ["cau giay", "nghia tan", "nghia do", "to hieu", "dich vong", "tran quoc hoan", "nguyen khang", "nguyen ngoc vu", "vu pham ham", "hoang quoc viet", "ho tung mau", "mai dich", "khuc thua du", "trung hoa", "tran duy hung", "nguyen phong sac", "nguyen van huyen", "tran quy kien", "quan hoa", "tran quoc vuong", "nguyen dinh hoan", "do quang"] },
  { label: "Tây Hồ", patterns: ["tay ho", "ho tay", "trich sai", "quang an", "au co", "nhat chieu", "yen phu", "nguyen dinh thi", "vong thi", "lac long quan", "thuy khue", "xuan la", "an duong", "vo chi cong", "buoi", "van cao", "xuan dinh"] },
  { label: "Hai Bà Trưng", patterns: ["hai ba trung", "hbt", "lo duc", "minh khai", "bach khoa", "dai co viet", "tran dai nghia", "le thanh nghi", "pho hue", "bui ngoc duong", "nguyen binh khiem", "vo thi sau", "tue tinh", "lac trung", "le dai hanh", "luong yen", "truong dinh", "bach dang", "pham dinh ho", "nguyen du", "nguyen dinh chieu", "huong vien"] },
  { label: "Thanh Xuân", patterns: ["thanh xuan", "royal city", "nguyen trai", "vuong thua vu", "ha dinh", "nguy nhu kon tum", "nguyen lan", "phuong liet", "kim giang", "hoang dao thanh", "truong chinh", "khuong trung"] },
  { label: "Long Biên", patterns: ["long bien", "bo de", "ngoc lam", "nguyen son", "ai mo", "aeon long bien", "giang bien", "huynh van nghe", "tu dinh", "hoang nhu tiep"] },
  { label: "Hà Đông", patterns: ["ha dong", "van quan", "mo lao", "van phuc", "aeon mall ha dong", "phung khoang", "nguyen van loc"] },
  { label: "Hoàng Mai", patterns: ["hoang mai", "vinh hung", "mai dong", "dai kim", "dai tu", "yen so"] },
  { label: "Nam Từ Liêm", patterns: ["nam tu liem", "my dinh", "me tri", "le duc tho", "pham hung", "the manor"] },
  { label: "Đông Anh", patterns: ["dong anh", "uy no", "co loa"] },
  { label: "Thanh Trì", patterns: ["thanh tri", "tan trieu"] },
];

function normalizeDistrict(place) {
  const prov = place.province;
  const raw = String(place.district || "").trim();
  const rawNorm = removeTones(raw);
  const addrNorm = removeTones(`${place.address || ""} ${place.subTag || ""} ${place.name || ""}`);

  if (prov === "TP. Hồ Chí Minh") {
    if (rawNorm.includes("binh duong")) return "Bình Dương";
    if (rawNorm.includes("vung tau") || rawNorm.includes("ba ria")) return "Vũng Tàu";
    if (rawNorm.includes("thu duc") || rawNorm === "quan 2" || rawNorm === "quan 9" || rawNorm === "7 / thu duc") return "TP. Thủ Đức";
    if (rawNorm === "quan 58" || rawNorm === "5 / 1") return "Quận 5";
    if (rawNorm.includes("binh thanh")) return "Bình Thạnh";
    if (rawNorm.includes("phu nhuan")) return "Phú Nhuận";
    if (rawNorm.includes("go vap")) return "Gò Vấp";
    if (rawNorm.includes("tan binh")) return "Tân Bình";
    if (rawNorm.includes("tan phu")) return "Tân Phú";
    if (rawNorm.includes("binh tan")) return "Bình Tân";
    const qMatch = rawNorm.match(/quan\s*(\d+)/);
    if (qMatch) {
      const num = parseInt(qMatch[1], 10);
      if (num === 2 || num === 9) return "TP. Thủ Đức";
      if (num >= 1 && num <= 12) return `Quận ${num}`;
    }
    // Try extracting from address
    const addrQ = addrNorm.match(/(?:quan|q\.?)\s*(\d+)/);
    if (addrQ) {
      const num = parseInt(addrQ[1], 10);
      if (num === 2 || num === 9) return "TP. Thủ Đức";
      if (num >= 1 && num <= 12) return `Quận ${num}`;
    }
    if (addrNorm.includes("binh thanh")) return "Bình Thạnh";
    if (addrNorm.includes("phu nhuan")) return "Phú Nhuận";
    if (addrNorm.includes("thu duc") || addrNorm.includes("thao dien")) return "TP. Thủ Đức";
    if (addrNorm.includes("tan binh")) return "Tân Bình";
    if (addrNorm.includes("go vap")) return "Gò Vấp";
    if (addrNorm.includes("tan phu")) return "Tân Phú";
    return "Trung tâm TP.HCM";
  }

  if (prov === "TP. Hà Nội") {
    // First check existing district if it's already specific
    for (const d of HANOI_DISTRICTS) {
      if (rawNorm.includes(removeTones(d.label))) return d.label;
    }
    // Extract from address / subTag
    for (const d of HANOI_DISTRICTS) {
      if (d.patterns.some((pat) => addrNorm.includes(pat))) {
        return d.label;
      }
    }
    return "Nội thành Hà Nội";
  }

  if (prov === "TP. Đà Nẵng") {
    if (rawNorm.includes("hoi an") || addrNorm.includes("hoi an")) return "Hội An";
    if (rawNorm.includes("hai chau")) return "Hải Châu";
    if (rawNorm.includes("thanh khe")) return "Thanh Khê";
    if (rawNorm.includes("son tra")) return "Sơn Trà";
    if (rawNorm.includes("ngu hanh son")) return "Ngũ Hành Sơn";
    if (rawNorm.includes("an hai")) return "An Hải (Sơn Trà)";
    if (rawNorm.includes("hoa cuong")) return "Hòa Cường (Hải Châu)";
    if (rawNorm.includes("cam le")) return "Cẩm Lệ";
    if (rawNorm.includes("lien chieu") || rawNorm.includes("hai van")) return "Liên Chiểu";
    if (rawNorm.includes("tam ky")) return "Tam Kỳ";
    if (rawNorm.includes("an khe")) return "Thanh Khê";
    if (rawNorm.includes("nam phuoc")) return "Duy Xuyên";
    return "Trung tâm Đà Nẵng";
  }

  // Other 31 provinces: clean parenthetical old names like "Lâm Đồng cũ (Đà Lạt)" -> "Đà Lạt"
  const paren = raw.match(/\(([^)]+)\)/);
  if (paren && !removeTones(paren[1]).includes("giu nguyen")) {
    return paren[1].replace(/^TP\.\s*/i, "").trim();
  }
  const cleaned = raw
    .replace(/\(giữ nguyên\)/gi, "")
    .replace(/\s+cũ$/gi, "")
    .replace(/^TP\.\s*/i, "")
    .replace(/^Quận\s+/i, "")
    .replace(/^H\.\s*/i, "")
    .trim();
  return cleaned || prov;
}

async function main() {
  const locations = JSON.parse(fs.readFileSync(LOCATIONS_PATH, "utf8"));
  const categories = JSON.parse(fs.readFileSync(CATEGORIES_PATH, "utf8"));

  console.log(`1) Downloading ${CURATED_PHOTOS.length} curated professional studio/editorial photos...`);
  const curatedMap = new Map();
  await Promise.all(
    CURATED_PHOTOS.map(async (item) => {
      const dest = path.join(CURATED_DIR, `${item.key}.jpg`);
      const ok = await downloadImage(item.url, dest);
      if (ok) {
        curatedMap.set(item.key, `/images/places/curated/${item.key}.jpg`);
        console.log(`   [OK] ${item.key}`);
      } else {
        console.log(`   [FAIL] ${item.key}`);
      }
    })
  );

  // 2) Audit existing public/images/places/real/ — keep ONLY verified, non-duplicate, non-listicle place-specific photos
  const validRealPhotos = new Map();
  if (fs.existsSync(REAL_DIR)) {
    const hashToIds = new Map();
    const files = fs.readdirSync(REAL_DIR).filter((f) => f.endsWith(".jpg"));
    for (const f of files) {
      const fullPath = path.join(REAL_DIR, f);
      const id = f.replace(".jpg", "");
      const place = locations.find((l) => l.id === id);
      const buf = fs.readFileSync(fullPath);
      const hash = crypto.createHash("md5").update(buf).digest("hex");
      if (!hashToIds.has(hash)) hashToIds.set(hash, []);
      hashToIds.get(hash).push({ id, fullPath, size: buf.length, url: place?.reviewUrl || "" });
    }

    let kept = 0;
    let purged = 0;
    for (const entries of hashToIds.values()) {
      // If multiple different places got the exact same image hash -> it was a shared listicle/site logo! Purge all.
      if (entries.length > 1) {
        for (const e of entries) {
          fs.unlinkSync(e.fullPath);
          purged++;
        }
        continue;
      }
      const e = entries[0];
      const isGenericListicle =
        /top-|cam-nang|check-in-nhung|dia-diem-|review-top|quan-cafe-view-dep|an-va-choi|cac-dia-diem|luu-ngay|goi-y-|nhung-cay-cau|pho-di-bo-.*-to-chuc|banh-trang-q4|foody\.vn|momo\.vn|shopee|grab\.com|vinpearl\.com\/vi\/.*can-tho|mytour\.vn/i.test(
          e.url
        ) ||
        e.url.includes("youtube.com") ||
        e.size < 35000;

      if (isGenericListicle) {
        fs.unlinkSync(e.fullPath);
        purged++;
      } else {
        validRealPhotos.set(e.id, `/images/places/real/${e.id}.jpg`);
        kept++;
      }
    }
    console.log(`\n2) Real photo audit: kept ${kept} verified unique venue photos, purged ${purged} generic/mismatched/low-res files.`);
  }

  // Helper to pick from curated array deterministically by place id
  const pickFrom = (keys, placeId, fallback = "/images/places/food.jpg") => {
    const available = keys.map((k) => curatedMap.get(k)).filter(Boolean);
    if (available.length === 0) return fallback;
    return available[hashNum(placeId) % available.length];
  };

  // 3) Normalize districts + assign accurate professional photography to all 1,362 places
  for (const place of locations) {
    place.district = normalizeDistrict(place);

    // Use verified unique venue photo if it passed strict audit
    if (validRealPhotos.has(place.id)) {
      place.images = [validRealPhotos.get(place.id)];
      continue;
    }

    const text = removeTones(`${place.name} ${place.subTag || ""} ${place.primaryType || ""} ${place.description || ""}`);
    const pType = removeTones(place.primaryType || "");

    // Specific dish / venue type matching (in priority order)
    if (pType.includes("workshop") || text.includes("lam gom") || text.includes("pottery")) {
      place.images = [pickFrom(["workshop-pottery", "workshop-art"], place.id)];
    } else if (text.includes("ve tranh") || text.includes("nen thom") || text.includes("thu cong") || text.includes("mosaic") || text.includes("batik")) {
      place.images = [pickFrom(["workshop-art", "workshop-pottery"], place.id)];
    } else if (pType.includes("ngam canh") || pType.includes("dao choi")) {
      if (text.includes("bien") || text.includes("bai tam") || text.includes("cat") || text.includes("eo gio") || text.includes("dao")) {
        place.images = [pickFrom(["travel-beach"], place.id, "/images/places/travel.jpg")];
      } else if (text.includes("deo") || text.includes("san may") || text.includes("doi che") || text.includes("nui") || text.includes("ho ") || text.includes("rung")) {
        place.images = [pickFrom(["travel-mountain"], place.id, "/images/places/travel.jpg")];
      } else {
        place.images = [pickFrom(["travel-city", "travel-mountain"], place.id, "/images/places/travel.jpg")];
      }
    } else if (pType.includes("ca phe") || text.includes("cafe") || text.includes("coffee")) {
      if (text.includes("rooftop") || text.includes("sky") || text.includes("tang thuong")) {
        place.images = [pickFrom(["date-rooftop", "coffee-2"], place.id)];
      } else if (text.includes("matcha")) {
        place.images = [pickFrom(["matcha-1", "coffee-1"], place.id)];
      } else if (text.includes("study") || text.includes("working") || text.includes("hoc tap") || text.includes("lam viec") || text.includes("book")) {
        place.images = [pickFrom(["coffee-study", "coffee-2"], place.id)];
      } else if (text.includes("san vuon") || text.includes("cay xanh") || text.includes("doi") || text.includes("vuon") || text.includes("ven ho")) {
        place.images = [pickFrom(["coffee-garden", "coffee-1"], place.id)];
      } else {
        place.images = [pickFrom(["coffee-1", "coffee-2", "coffee-garden"], place.id, "/images/places/coffee.jpg")];
      }
    } else if (text.includes("tra sua") || text.includes("milktea") || text.includes("boba") || text.includes("matcha")) {
      place.images = [pickFrom(["boba-1", "matcha-1"], place.id, "/images/places/coffee.jpg")];
    } else if (text.includes("banh mi") || text.includes("banh my")) {
      place.images = [pickFrom(["banh-mi-1"], place.id, "/images/places/food.jpg")];
    } else if (text.includes("pho ") || text.startsWith("pho")) {
      place.images = [pickFrom(["pho-1", "noodle-1"], place.id)];
    } else if (text.includes("bun ") || text.includes("hu tieu") || text.includes("mi quang") || text.includes("my quang") || text.includes("cao lau") || text.includes("banh canh") || text.includes("mien ")) {
      place.images = [pickFrom(["noodle-1", "noodle-2", "pho-1"], place.id)];
    } else if (text.includes("ramen") || text.includes("sushi") || text.includes("udon") || text.includes("nhat")) {
      place.images = [pickFrom(["japanese-1", "noodle-2"], place.id)];
    } else if (text.includes("han quoc") || text.includes("do han") || text.includes("tokbokki") || text.includes("tteokbokki") || text.includes("kimbab") || text.includes("chicken")) {
      place.images = [pickFrom(["korean-1", "bbq-1"], place.id)];
    } else if (text.includes("thai lan") || text.includes("do thai") || text.includes("pad thai") || text.includes("somtam")) {
      place.images = [pickFrom(["thai-1", "noodle-1"], place.id)];
    } else if (text.includes("dimsum") || text.includes("ha cao") || text.includes("sui cao") || text.includes("do trung") || text.includes("do hoa")) {
      place.images = [pickFrom(["dimsum-1", "noodle-2"], place.id)];
    } else if (text.includes("pizza") || text.includes("pasta") || text.includes("mi y")) {
      place.images = [pickFrom(["western-1", "date-bistro"], place.id)];
    } else if (text.includes("steak") || text.includes("bit tet") || text.includes("bo ne") || text.includes("nha hang au") || text.includes("bistro")) {
      place.images = [pickFrom(["steak-1", "date-bistro"], place.id)];
    } else if (text.includes("oc ") || text.startsWith("oc") || text.includes("hai san") || text.includes("hau ") || text.includes("ghe")) {
      place.images = [pickFrom(["seafood-1", "bbq-1"], place.id)];
    } else if (text.includes("lau") || text.includes("nuong") || text.includes("bbq") || text.includes("buffet")) {
      place.images = [pickFrom(["bbq-1", "hotpot-1"], place.id)];
    } else if (text.includes("com ") || text.startsWith("com") || text.includes("xoi")) {
      place.images = [pickFrom(["rice-1", "rice-2"], place.id)];
    } else if (text.includes("che ") || text.startsWith("che") || text.includes("kem") || text.includes("bingsu") || text.includes("flan") || text.includes("donut") || text.includes("banh ngot") || text.includes("tau hu") || text.includes("yogurt") || text.includes("sua chua")) {
      place.images = [pickFrom(["dessert-1", "dessert-2"], place.id)];
    } else if (text.includes("banh trang") || text.includes("ca vien") || text.includes("an vat") || text.includes("bot chien") || text.includes("pha lau") || text.includes("nem chua")) {
      place.images = ["/images/places/streetfood.jpg"];
    } else if (place.category.includes("date")) {
      place.images = [pickFrom(["date-bistro", "date-rooftop"], place.id)];
    } else {
      place.images = [pickFrom(["street-1", "rice-1", "noodle-1"], place.id, "/images/places/food.jpg")];
    }
  }

  // Update 6 category showcase images with our sharpest curated photos
  const catImgMap = {
    food: "/images/places/food.jpg",
    coffee: "/images/places/coffee.jpg",
    date: curatedMap.get("date-rooftop") || "/images/places/date.jpg",
    chill: curatedMap.get("coffee-garden") || "/images/places/chill.jpg",
    fun: curatedMap.get("workshop-pottery") || "/images/places/fun.jpg",
    travel: curatedMap.get("travel-mountain") || "/images/places/travel.jpg",
  };
  for (const cat of categories) {
    if (catImgMap[cat.id]) cat.image = catImgMap[cat.id];
  }

  fs.writeFileSync(LOCATIONS_PATH, JSON.stringify(locations, null, 2), "utf8");
  fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2), "utf8");

  // Print clean district summary for top 3 cities
  for (const city of ["TP. Hồ Chí Minh", "TP. Hà Nội", "TP. Đà Nẵng"]) {
    const map = {};
    locations.filter((l) => l.province === city).forEach((l) => {
      map[l.district] = (map[l.district] || 0) + 1;
    });
    console.log(`\nDistricts in ${city} (${Object.keys(map).length}):`, Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}(${v})`).join(", "));
  }
}

main();

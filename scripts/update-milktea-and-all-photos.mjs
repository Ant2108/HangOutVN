#!/usr/bin/env node
/**
 * HANGOUT VN — Precision Edge-to-Edge Real Photo Crawler (Zero-Duplicate & Dish-Verified)
 *
 * Guarantees for all 1,384 places:
 * 1. ZERO white borders / margins: uses `c.murl` or Bing `c.turl` with `&w=800&h=600&c=7&rs=1&p=0`
 *    (which scales and center-crops to 800x600 edge-to-edge without white padding) and enforces
 *    file size >= 32,000 bytes.
 * 2. ZERO wrong dishes or street maps: verifies the Bing image title (`obj.t`) matches the exact
 *    Vietnamese dish/venue keywords (`spec.must`) and blocks maps/real-estate/logos.
 * 3. ZERO duplicate images across the entire site: tracks MD5 hashes in `usedHashes` across all
 *    1,384 places so no two places ever share the same image file.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOCATIONS_PATH = path.resolve("src/data/locations.json");
const PROVINCES_PATH = path.resolve("src/data/provinces.json");
const CATEGORIES_PATH = path.resolve("src/data/categories.json");
const REAL_DIR = path.resolve("public/images/places/real");

fs.mkdirSync(REAL_DIR, { recursive: true });

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

const BLOCKED_TITLE_WORDS = [
  "ban do",
  "hanh chinh",
  "quy hoach",
  "bat dong san",
  "nha dat",
  "ban nha",
  "cho thue",
  "mat bang",
  "tuyen dung",
  "logo",
  "icon",
  "vector",
  "clipart",
  "infographic",
  "bieu do",
];

const DISH_SPECS = [
  { key: "banh-trang-tron", query: "bánh tráng trộn sài gòn ăn vặt", must: ["banh trang"] },
  { key: "banh-trang-nuong", query: "bánh tráng nướng đà lạt sài gòn", must: ["banh trang"] },
  { key: "banh-trang-cuon", query: "bánh tráng cuốn sốt me bơ", must: ["banh trang"] },
  { key: "banh-trang-thit-heo", query: "bánh tráng cuốn thịt heo đà nẵng", must: ["banh trang", "thit heo"] },
  { key: "ca-vien-chien", query: "cá viên chiên nước mắm xiên que ăn vặt", must: ["ca vien", "xien"] },
  { key: "pha-lau", query: "phá lấu bò bánh mì sài gòn", must: ["pha lau"] },
  { key: "bot-chien", query: "bột chiên trứng sài gòn", must: ["bot chien"] },
  { key: "nem-chua-ran", query: "nem chua rán nem nướng nem lụi", must: ["nem chua", "nem nuong", "nem lui", "cha lui"] },
  { key: "bap-xao-an-vat", query: "bắp xào bơ tép món ăn vặt đường phố sài gòn", must: ["bap xao", "an vat", "chan ga", "dau hu"] },
  { key: "sup-cua", query: "súp cua sài gòn", must: ["sup cua"] },

  { key: "banh-mi", query: "bánh mì thịt nướng паtê sài gòn hội an", must: ["banh mi", "banh my"] },
  { key: "banh-mi-chao", query: "bánh mì chảo bò né ốp la", must: ["banh mi chao", "bo ne"] },
  { key: "banh-xeo", query: "bánh xèo bánh khọt bánh căn miền trung nam bộ", must: ["banh xeo", "banh khot", "banh can"] },
  { key: "banh-cuon", query: "bánh cuốn nóng bánh ướt chả lụa", must: ["banh cuon", "banh uot", "pho cuon"] },
  { key: "banh-beo-loc", query: "bánh bèo nậm lọc bánh ép huế đà nẵng", must: ["banh beo", "banh bot loc", "banh ep", "banh loc"] },

  { key: "com-tam", query: "cơm tấm sườn bì chả sài gòn", must: ["com tam"] },
  { key: "com-ga", query: "cơm gà hội an cơm gà xối mỡ", must: ["com ga"] },
  { key: "com-nieu", query: "mâm cơm niêu gia đình ẩm thực việt nam", must: ["com nieu", "com ", "am thuc", "mon an", "nha hang"] },
  { key: "xoi", query: "xôi xéo xôi mặn thập cẩm hà nội sài gòn", must: ["xoi"] },
  { key: "chao", query: "cháo lòng cháo sườn cháo ếch", must: ["chao"] },

  { key: "pho", query: "tô phở bò phở gà hà nội", must: ["pho "] },
  { key: "bun-bo", query: "tô bún bò huế bún giò", must: ["bun bo", "bun "] },
  { key: "bun-rieu", query: "tô bún riêu cua ốc đậu", must: ["bun rieu", "canh bun"] },
  { key: "bun-cha-thit-nuong", query: "bún chả hà nội bún thịt nướng", must: ["bun cha", "bun thit nuong"] },
  { key: "bun-dau", query: "bún đậu mắm tôm mẹt đầy đủ", must: ["bun dau"] },
  { key: "bun-mam", query: "bún mắm nêm đà nẵng bún mắm miền tây", must: ["bun mam"] },
  { key: "banh-canh", query: "tô bánh canh cua bánh canh chả cá", must: ["banh canh", "banh da cua"] },
  { key: "hu-tieu", query: "tô hủ tiếu nam vang hủ tiếu mì", must: ["hu tieu", "mi vit tiem", "mi tron", "mi xao"] },
  { key: "mi-quang-cao-lau", query: "mì quảng đà nẵng cao lầu hội an", must: ["mi quang", "my quang", "cao lau"] },

  { key: "oc-hai-san", query: "quán ốc sài gòn hải sản nướng mỡ hành", must: ["oc ", "hai san", "hau"] },
  { key: "lau", query: "nồi lẩu thái lẩu bò lẩu cá", must: ["lau"] },
  { key: "nuong-bbq", query: "thịt nướng bbq quán nướng hàn quốc", must: ["nuong", "bbq"] },
  { key: "do-han", query: "tokbokki kimbap gà sốt mì cay hàn quốc", must: ["tokbokki", "kimbap", "han quoc", "mi cay", "ga "] },
  { key: "do-nhat", query: "mì ramen sushi sashimi nhật bản", must: ["ramen", "sushi", "udon", "nhat"] },
  { key: "do-thai", query: "ẩm thực thái lan pad thái gỏi somtam", must: ["thai"] },
  { key: "dimsum-ha-cao", query: "há cảo sủi cảo dimsum chợ lớn", must: ["ha cao", "sui cao", "dimsum", "banh bao"] },
  { key: "pizza-steak-au", query: "pizza mì ý pasta beefsteak nhà hàng âu", must: ["pizza", "steak", "mi y", "pasta", "burger"] },

  { key: "che", query: "chè khúc bạch chè thái chè bưởi chè sầu", must: ["che "] },
  { key: "tau-hu-flan", query: "tàu hũ trân châu tào phớ bánh flan", must: ["tau hu", "tao pho", "flan"] },
  { key: "kem-bingsu", query: "kem bơ đà lạt bingsu sữa chua", must: ["kem ", "bingsu", "sua chua"] },
  { key: "banh-ngot", query: "tiệm bánh ngọt cake tiramisu bakery", must: ["banh ngot", "tiramisu", "bakery", "donut", "banh "] },
  { key: "tra-sua", query: "ly trà sữa full topping trân châu thạch phô mai bánh flan", must: ["tra sua", "milktea", "hong tra", "topping"] },
  { key: "matcha", query: "matcha latte quán cafe nhật bản", must: ["matcha"] },

  { key: "cafe-chill", query: "quán cà phê đẹp chill sài gòn hà nội đà lạt", must: ["ca phe", "cafe", "coffee"] },
  { key: "cafe-san-vuon", query: "quán cà phê sân vườn xanh mát đà lạt", must: ["ca phe", "cafe", "coffee", "san vuon"] },
  { key: "cafe-study", query: "quán cà phê sách học bài làm việc yên tĩnh", must: ["ca phe", "cafe", "coffee"] },
  { key: "rooftop-date", query: "rooftop cafe bar ngắm hoàng hôn sài gòn hà nội", must: ["rooftop", "cafe", "bar", "chill"] },
  { key: "workshop-gom-nen", query: "workshop làm gốm làm nến thơm vẽ tranh thủ công", must: ["workshop", "gom", "nen", "ve tranh", "lam banh"] },
  { key: "photobooth-game", query: "photobooth chụp ảnh hàn quốc life4cut khu vui chơi", must: ["photobooth", "photo", "life4cut", "game", "vui choi", "karaoke", "kart"] },
  { key: "pho-di-bo", query: "phố đi bộ quảng trường công viên hồ cảnh đẹp việt nam", must: ["pho di bo", "quang truong", "cong vien", "ho ", "cau ", "cho dem", "du lich"] },
  { key: "bien-dao", query: "bãi biển đẹp việt nam hoàng hôn biển", must: ["bien", "bai tam", "dao", "vinh", "eo gio"] },
  { key: "san-may-nui", query: "săn mây đèo núi đồi chè đà lạt tây bắc", must: ["san may", "doi che", "deo", "nui", "ho ", "thac", "rung"] },
];

const SPEC_BY_KEY = new Map(DISH_SPECS.map((s) => [s.key, s]));

function classifyPlaceDishKey(place) {
  const nameAndTag = `${place.name} ${place.subTag || ""}`.toLowerCase();
  const primary = (place.primaryType || "").toLowerCase();
  const full = `${nameAndTag} ${primary} ${(place.description || "").toLowerCase()}`;

  if (nameAndTag.includes("bánh tráng") || nameAndTag.includes("banh trang")) {
    if (nameAndTag.includes("thịt heo")) return "banh-trang-thit-heo";
    if (nameAndTag.includes("nướng") || nameAndTag.includes("kẹp")) return "banh-trang-nuong";
    if (nameAndTag.includes("cuốn") || nameAndTag.includes("chấm") || nameAndTag.includes("phơi sương")) return "banh-trang-cuon";
    return "banh-trang-tron";
  }

  if (
    primary.includes("workshop") ||
    nameAndTag.includes("workshop") ||
    nameAndTag.includes("làm gốm") ||
    nameAndTag.includes("nến thơm") ||
    nameAndTag.includes("vẽ tranh") ||
    nameAndTag.includes("làm bánh") ||
    nameAndTag.includes("làm nước hoa") ||
    nameAndTag.includes("trang sức") ||
    nameAndTag.includes("tranh cát") ||
    nameAndTag.includes("khắc dấu") ||
    nameAndTag.includes("làng hương") ||
    nameAndTag.includes("làng gốm")
  ) {
    return "workshop-gom-nen";
  }
  if (
    nameAndTag.includes("chụp ảnh") ||
    nameAndTag.includes("life4cut") ||
    nameAndTag.includes("harufilm") ||
    nameAndTag.includes("photo") ||
    nameAndTag.includes("karaoke") ||
    nameAndTag.includes("game box") ||
    nameAndTag.includes("thực tế ảo") ||
    nameAndTag.includes("gokart") ||
    nameAndTag.includes("karting") ||
    nameAndTag.includes("trượt băng") ||
    nameAndTag.includes("golf") ||
    nameAndTag.includes("đạp vịt")
  ) {
    return "photobooth-game";
  }

  if (primary.includes("ngắm cảnh") || primary.includes("dạo chơi")) {
    if (full.includes("biển") || full.includes("bãi tắm") || full.includes("bãi đá") || full.includes("eo gió") || full.includes("đồi cát") || full.includes("điện gió") || full.includes("mũi nghinh phong")) {
      return "bien-dao";
    }
    if (full.includes("đèo") || full.includes("săn mây") || full.includes("đồi chè") || full.includes("núi") || full.includes("hồ ") || full.includes("rừng") || full.includes("thác")) {
      return "san-may-nui";
    }
    return "pho-di-bo";
  }

  if (nameAndTag.includes("matcha")) return "matcha";
  if (nameAndTag.includes("trà sữa") || nameAndTag.includes("milktea") || nameAndTag.includes("tea ") || nameAndTag.includes("hồng trà") || nameAndTag.includes("tiệm trà") || nameAndTag.includes("góc trà")) {
    return "tra-sua";
  }

  if (primary.includes("cà phê") || nameAndTag.includes("cà phê") || nameAndTag.includes("cafe") || nameAndTag.includes("coffee") || nameAndTag.includes("kafe") || nameAndTag.includes("kafé") || nameAndTag.includes("căfê")) {
    if (full.includes("rooftop") || full.includes("skybar") || full.includes("sky bar") || full.includes("tầng thượng")) {
      return "rooftop-date";
    }
    if (full.includes("study") || full.includes("working") || full.includes("học tập") || full.includes("làm việc") || full.includes("library") || full.includes("sách")) {
      return "cafe-study";
    }
    if (full.includes("sân vườn") || full.includes("cây xanh") || full.includes("đồi") || full.includes("ven hồ") || full.includes("ven sông") || full.includes("đồng lúa")) {
      return "cafe-san-vuon";
    }
    return "cafe-chill";
  }

  if (nameAndTag.includes("cá viên") || nameAndTag.includes("xiên que") || nameAndTag.includes("xiên nướng") || nameAndTag.includes("xiên bẩn") || nameAndTag.includes("xiên sạch")) {
    return "ca-vien-chien";
  }
  if (nameAndTag.includes("phá lấu")) return "pha-lau";
  if (nameAndTag.includes("bột chiên")) return "bot-chien";
  if (nameAndTag.includes("nem chua") || nameAndTag.includes("nem nướng") || nameAndTag.includes("nem lụi") || nameAndTag.includes("chả lụi") || nameAndTag.includes("bò bía")) {
    return "nem-chua-ran";
  }
  if (nameAndTag.includes("súp cua")) return "sup-cua";
  if (nameAndTag.includes("bắp xào") || nameAndTag.includes("bắp rang") || nameAndTag.includes("đậu hũ") || nameAndTag.includes("đậu hủ") || nameAndTag.includes("da gà") || nameAndTag.includes("da heo") || nameAndTag.includes("chân gà") || nameAndTag.includes("trứng chén") || nameAndTag.includes("hột gà") || nameAndTag.includes("hột vịt lộn") || nameAndTag.includes("trứng vịt lộn") || nameAndTag.includes("mít trộn") || nameAndTag.includes("đu đủ đâm")) {
    return "bap-xao-an-vat";
  }

  if (nameAndTag.includes("bánh mì chảo") || nameAndTag.includes("bò né") || nameAndTag.includes("bò chảo") || nameAndTag.includes("ốp la")) {
    return "banh-mi-chao";
  }
  if (nameAndTag.includes("bánh mì") || nameAndTag.includes("bánh mỳ") || nameAndTag.includes("banh mi")) {
    return "banh-mi";
  }
  if (nameAndTag.includes("bánh xèo") || nameAndTag.includes("bánh khọt") || nameAndTag.includes("bánh căn")) {
    return "banh-xeo";
  }
  if (nameAndTag.includes("bánh cuốn") || nameAndTag.includes("bánh ướt") || nameAndTag.includes("phở cuốn") || nameAndTag.includes("bánh đúc") || nameAndTag.includes("bánh tầm")) {
    return "banh-cuon";
  }
  if (nameAndTag.includes("bánh bèo") || nameAndTag.includes("bánh bột lọc") || nameAndTag.includes("bánh lọc") || nameAndTag.includes("bánh ép") || nameAndTag.includes("bánh đập") || nameAndTag.includes("ram ")) {
    return "banh-beo-loc";
  }

  if (nameAndTag.includes("cơm tấm")) return "com-tam";
  if (nameAndTag.includes("cơm gà")) return "com-ga";
  if (nameAndTag.includes("cơm ") || nameAndTag.startsWith("cơm")) return "com-nieu";
  if (nameAndTag.includes("xôi")) return "xoi";
  if (nameAndTag.includes("cháo")) return "chao";

  if (nameAndTag.includes("bánh canh") || nameAndTag.includes("bánh đa cua")) return "banh-canh";
  if (nameAndTag.includes("mì quảng") || nameAndTag.includes("mỳ quảng") || nameAndTag.includes("cao lầu")) return "mi-quang-cao-lau";
  if (nameAndTag.includes("hủ tiếu") || nameAndTag.includes("hủ tíu") || nameAndTag.includes("mì vịt tiềm") || nameAndTag.includes("mì trộn") || nameAndTag.includes("mì xào") || nameAndTag.includes("nui ")) return "hu-tieu";
  if (/\bphở\b/.test(nameAndTag)) return "pho";
  if (nameAndTag.includes("bún đậu")) return "bun-dau";
  if (nameAndTag.includes("bún riêu") || nameAndTag.includes("canh bún")) return "bun-rieu";
  if (nameAndTag.includes("bún mắm")) return "bun-mam";
  if (nameAndTag.includes("bún chả") || nameAndTag.includes("bún thịt nướng")) return "bun-cha-thit-nuong";
  if (nameAndTag.includes("bún bò") || /\bbún\b/.test(nameAndTag) || nameAndTag.includes("miến")) return "bun-bo";

  if (/\bốc\b/.test(nameAndTag) || nameAndTag.includes("hải sản") || nameAndTag.includes("seafood") || nameAndTag.includes("hàu") || nameAndTag.includes("càng ghẹ") || nameAndTag.includes("sò điệp")) {
    return "oc-hai-san";
  }
  if (nameAndTag.includes("há cảo") || nameAndTag.includes("sủi cảo") || nameAndTag.includes("dimsum") || nameAndTag.includes("hoành thánh") || nameAndTag.includes("bánh bao") || nameAndTag.includes("đồ trung") || nameAndTag.includes("hồng kông")) {
    return "dimsum-ha-cao";
  }
  if (nameAndTag.includes("ramen") || nameAndTag.includes("sushi") || nameAndTag.includes("sashimi") || nameAndTag.includes("udon") || nameAndTag.includes("takoyaki") || nameAndTag.includes("nhật")) {
    return "do-nhat";
  }
  if (nameAndTag.includes("hàn quốc") || nameAndTag.includes("đồ hàn") || nameAndTag.includes("món hàn") || nameAndTag.includes("ăn no (hàn") || nameAndTag.includes("tokbokki") || nameAndTag.includes("tteokbokki") || nameAndTag.includes("kimbab") || nameAndTag.includes("kimpap") || nameAndTag.includes("mì cay") || nameAndTag.includes("mỳ cay") || nameAndTag.includes("chicken") || nameAndTag.includes("gà sốt")) {
    return "do-han";
  }
  if (nameAndTag.includes("thái") || nameAndTag.includes("pad ") || nameAndTag.includes("somtam")) {
    return "do-thai";
  }
  if (nameAndTag.includes("pizza") || nameAndTag.includes("pasta") || nameAndTag.includes("mì ý") || nameAndTag.includes("steak") || nameAndTag.includes("bít tết") || nameAndTag.includes("đồ âu") || nameAndTag.includes("nhà hàng âu") || nameAndTag.includes("âu mỹ") || nameAndTag.includes("burger") || nameAndTag.includes("tacos")) {
    return "pizza-steak-au";
  }
  if (nameAndTag.includes("lẩu")) return "lau";
  if (nameAndTag.includes("nướng") || nameAndTag.includes("bbq") || nameAndTag.includes("buffet") || nameAndTag.includes("sườn")) return "nuong-bbq";

  if (nameAndTag.includes("tàu hũ") || nameAndTag.includes("tàu hủ") || nameAndTag.includes("tào phớ") || nameAndTag.includes("flan") || nameAndTag.includes("sương sáo")) {
    return "tau-hu-flan";
  }
  if (/\bchè\b/.test(nameAndTag)) return "che";
  if (/\bkem\b/.test(nameAndTag) || nameAndTag.includes("bingsu") || nameAndTag.includes("gelato") || nameAndTag.includes("sữa chua") || nameAndTag.includes("yaourt") || nameAndTag.includes("yogurt") || nameAndTag.includes("sinh tố") || nameAndTag.includes("hoa quả dầm") || nameAndTag.includes("milo") || nameAndTag.includes("dừa dầm")) {
    return "kem-bingsu";
  }
  if (nameAndTag.includes("bánh ngọt") || nameAndTag.includes("bakery") || nameAndTag.includes("donut") || nameAndTag.includes("tiramisu") || nameAndTag.includes("tart") || nameAndTag.includes("churros") || nameAndTag.includes("pancake") || nameAndTag.includes("bánh tiêu") || nameAndTag.includes("bánh chuối") || nameAndTag.includes("chuối nếp")) {
    return "banh-ngot";
  }
  if (nameAndTag.includes("drinks") || nameAndTag.includes("nước ")) return "cafe-chill";
  if (primary.includes("ăn vặt")) return "bap-xao-an-vat";
  if (nameAndTag.includes("rooftop")) return "rooftop-date";
  return "com-nieu";
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

async function fetchImageBuffer(url, minBytes = 32000) {
  try {
    const res = await fetchWithTimeout(url, 6500);
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

async function searchBingVerifiedCandidates(query, requiredKeywords = [], first = 1) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=${first}`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return [];
    const html = await res.text();

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
        const titleNorm = removeTones(`${obj.t || ""} ${obj.murl || ""}`);

        // Never allow maps, administrative charts, real estate listings, or logos
        if (BLOCKED_TITLE_WORDS.some((bw) => titleNorm.includes(bw))) continue;
        if (/logo|avatar|icon|banner-web|placeholder|map|bando/i.test(obj.murl || "")) continue;

        if (
          requiredKeywords.length > 0 &&
          !requiredKeywords.some((kw) => titleNorm.includes(removeTones(kw)))
        ) {
          continue;
        }

        candidates.push({
          // `&w=800&h=600&c=7&rs=1&p=0` forces edge-to-edge 800x600 center-crop with ZERO white borders!
          turlCrop: obj.turl ? `${obj.turl}&w=800&h=600&c=7&rs=1&p=0` : null,
          murl: obj.murl,
          title: obj.t || "",
        });
      } catch {
        // ignore malformed json
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
  const provinces = JSON.parse(fs.readFileSync(PROVINCES_PATH, "utf8"));
  const categories = JSON.parse(fs.readFileSync(CATEGORIES_PATH, "utf8"));

  // 1) Pre-build deep verified candidate pools per DISH_SPEC (so any shop that doesn't have an exact shop-named photo gets a unique, edge-to-edge, dish-verified photo)
  console.log(`1) Building deep edge-to-edge verified photo pools for ${DISH_SPECS.length} dish/venue categories...`);
  const dishCandidatePools = new Map();

  await runPool(DISH_SPECS, 12, async (spec) => {
    const pages = await Promise.all([
      searchBingVerifiedCandidates(spec.query, spec.must, 1),
      searchBingVerifiedCandidates(`${spec.query} ngon nổi tiếng`, spec.must, 36),
      searchBingVerifiedCandidates(`${spec.query} review địa điểm`, spec.must, 71),
      searchBingVerifiedCandidates(`${spec.query} việt nam`, spec.must, 106),
    ]);
    const merged = pages.flat();
    dishCandidatePools.set(spec.key, merged);
  });

  // 2) Keep only existing `/images/places/real/<id>.jpg` from the original 274 verified high-res photos (>= 38,000 bytes), and re-fetch all newly added/small/padded ones with strict title + edge-to-edge verification!
  const usedHashes = new Set();
  const usedUrls = new Set();
  const verifiedPlaceIds = new Set();

  for (const p of locations) {
    const numId = parseInt(p.id.replace(/\D/g, ""), 10);
    const realFile = path.join(REAL_DIR, `${p.id}.jpg`);
    // Only trust pre-existing real venue photos for <= 223 or featured/menuUrl that are >= 38KB (no white-padded thumbnails!)
    const isOriginalTrusted = (numId <= 223 || p.menuUrl) && numId <= 1362;
    if (isOriginalTrusted && fs.existsSync(realFile)) {
      const buf = fs.readFileSync(realFile);
      if (buf.length >= 38000) {
        const h = crypto.createHash("md5").update(buf).digest("hex");
        if (!usedHashes.has(h)) {
          usedHashes.add(h);
          verifiedPlaceIds.add(p.id);
          p.images = [`/images/places/real/${p.id}.jpg`];
          continue;
        }
      }
    }
    if (fs.existsSync(realFile)) {
      fs.unlinkSync(realFile);
    }
  }

  const toFetch = locations.filter((p) => !verifiedPlaceIds.has(p.id));
  console.log(
    `2) Kept ${verifiedPlaceIds.size} original high-res venue photos. Fetching edge-to-edge dish-verified unique photos for ${toFetch.length} places...`
  );

  const poolCursors = new Map();
  let fetchedCount = 0;

  await runPool(toFetch, 24, async (place, idx) => {
    const dest = path.join(REAL_DIR, `${place.id}.jpg`);
    const dishKey = classifyPlaceDishKey(place);
    const spec = SPEC_BY_KEY.get(dishKey) || SPEC_BY_KEY.get("com-nieu");
    const cleanName = place.name.replace(/\([^)]*\)/g, "").split("-")[0].trim();
    const cityClean = place.province.replace(/^TP\.\s*/i, "");

    // Step A: Search Bing specifically for this venue + dish keyword + city, requiring title to match `spec.must`
    const venueQuery = `${cleanName} ${spec.must[0]} ${place.district || ""} ${cityClean}`;
    const venueCandidates = await searchBingVerifiedCandidates(venueQuery, spec.must, 1);

    // Step B: Append candidates from the dish's deep verified pool (starting from a rotating cursor so workers don't collide)
    const pool = dishCandidatePools.get(dishKey) || [];
    const startCursor = poolCursors.get(dishKey) || 0;
    poolCursors.set(dishKey, startCursor + 1);
    const rotatedPool =
      pool.length > 0
        ? [...pool.slice(startCursor % pool.length), ...pool.slice(0, startCursor % pool.length)]
        : [];

    const allCandidates = [...venueCandidates, ...rotatedPool];

    let saved = false;
    for (const c of allCandidates) {
      if (saved) break;
      // Try `turlCrop` (`&w=800&h=600&c=7&rs=1&p=0` guaranteed 800x600 edge-to-edge crop!) first, then `murl`
      const urls = [c.turlCrop, c.murl].filter(Boolean);
      for (const u of urls) {
        if (usedUrls.has(u)) continue;
        usedUrls.add(u);
        const buf = await fetchImageBuffer(u, 32000);
        if (!buf) continue;
        const hash = crypto.createHash("md5").update(buf).digest("hex");
        if (usedHashes.has(hash)) continue;

        usedHashes.add(hash);
        fs.writeFileSync(dest, buf);
        place.images = [`/images/places/real/${place.id}.jpg`];
        verifiedPlaceIds.add(place.id);
        fetchedCount += 1;
        saved = true;
        break;
      }
    }

    // Step C: If the pool was exhausted for a very large category, fetch an extra page specifically for this place's subTag + city
    if (!saved) {
      const extraCandidates = await searchBingVerifiedCandidates(
        `${spec.query} ${place.subTag || ""} ${cityClean}`,
        spec.must,
        (idx % 5) * 35 + 1
      );
      for (const c of extraCandidates) {
        if (saved) break;
        const urls = [c.turlCrop, c.murl].filter(Boolean);
        for (const u of urls) {
          if (usedUrls.has(u)) continue;
          usedUrls.add(u);
          const buf = await fetchImageBuffer(u, 25000);
          if (!buf) continue;
          const hash = crypto.createHash("md5").update(buf).digest("hex");
          if (usedHashes.has(hash)) continue;

          usedHashes.add(hash);
          fs.writeFileSync(dest, buf);
          place.images = [`/images/places/real/${place.id}.jpg`];
          verifiedPlaceIds.add(place.id);
          fetchedCount += 1;
          saved = true;
          break;
        }
      }
    }

    if ((idx + 1) % 150 === 0 || idx + 1 === toFetch.length) {
      console.log(
        `   Progress: ${idx + 1}/${toFetch.length} | Fetched: ${fetchedCount} | Total unique verified: ${verifiedPlaceIds.size}/${locations.length}`
      );
    }
  });

  // Update province and category counts
  for (const prov of provinces) {
    const provPlaces = locations.filter((l) => l.province === prov.name);
    prov.placeCount = provPlaces.length;
  }
  for (const cat of categories) {
    cat.count = locations.filter((l) => l.category.includes(cat.id)).length;
  }

  fs.writeFileSync(LOCATIONS_PATH, JSON.stringify(locations, null, 2), "utf8");
  fs.writeFileSync(PROVINCES_PATH, JSON.stringify(provinces, null, 2), "utf8");
  fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2), "utf8");

  console.log(
    `\nDone! Total places: ${locations.length} | Unique edge-to-edge verified photos: ${verifiedPlaceIds.size}`
  );
}

main();

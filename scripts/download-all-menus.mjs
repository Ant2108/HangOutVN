#!/usr/bin/env node
/**
 * HANGOUT VN — Local Instant Menu Image Downloader for All 1,532 Locations
 *
 * 1. Downloads all 63 existing Google Drive menu files (`drive.google.com/file/d/<ID>`)
 *    directly into local static images at `public/images/menus/<id>.jpg` (`w=900` crisp JPEG)
 *    so clicking "Xem Menu" opens instantaneously with zero Google Drive iframe lag.
 * 2. Searches Google/Bing Images for real Vietnamese menu / price-list photos (`menu`, `thực đơn`,
 *    `bảng giá`) for the remaining 1,469 places:
 *    - First queries the exact shop name + district + city (`"menu thực đơn ${place.name} ..."`).
 *    - Verifies that the image title/URL contains both a menu keyword (`menu`, `thuc don`, `bang gia`)
 *      AND matches the venue's exact dish/category type.
 *    - Downloads uncropped menu images (`turl&w=900` or `murl`) to `public/images/menus/<id>.jpg`
 *      and updates `place.menuUrl = "/images/menus/<id>.jpg"`.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOCATIONS_PATH = path.resolve("src/data/locations.json");
const MENUS_DIR = path.resolve("public/images/menus");

fs.mkdirSync(MENUS_DIR, { recursive: true });

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

const MENU_SPECS = [
  { key: "banh-trang-tron", query: "menu bảng giá quán bánh tráng trộn ăn vặt", must: ["menu", "thuc don", "bang gia", "banh trang", "an vat"] },
  { key: "banh-trang-nuong", query: "menu bảng giá quán bánh tráng nướng ăn vặt", must: ["menu", "thuc don", "bang gia", "banh trang"] },
  { key: "banh-trang-cuon", query: "menu bảng giá bánh tráng cuốn sốt me", must: ["menu", "thuc don", "bang gia", "banh trang"] },
  { key: "banh-trang-thit-heo", query: "menu thực đơn bánh tráng cuốn thịt heo đà nẵng", must: ["menu", "thuc don", "bang gia", "banh trang", "thit heo"] },
  { key: "ca-vien-chien", query: "menu bảng giá cá viên chiên xiên que ăn vặt", must: ["menu", "thuc don", "bang gia", "ca vien", "xien", "an vat"] },
  { key: "pha-lau", query: "menu bảng giá quán phá lấu bò sài gòn", must: ["menu", "thuc don", "bang gia", "pha lau"] },
  { key: "bot-chien", query: "menu bảng giá quán bột chiên sài gòn", must: ["menu", "thuc don", "bang gia", "bot chien"] },
  { key: "nem-chua-ran", query: "menu bảng giá quán nem nướng nem chua rán ăn vặt", must: ["menu", "thuc don", "bang gia", "nem"] },
  { key: "bap-xao-an-vat", query: "menu thực đơn bảng giá quán ăn vặt đường phố", must: ["menu", "thuc don", "bang gia", "an vat"] },
  { key: "sup-cua", query: "menu bảng giá quán súp cua ăn vặt", must: ["menu", "thuc don", "bang gia", "sup cua"] },

  { key: "banh-mi", query: "menu bảng giá tiệm bánh mì việt nam", must: ["menu", "thuc don", "bang gia", "banh mi", "banh my"] },
  { key: "banh-mi-chao", query: "menu thực đơn quán bánh mì chảo bò né", must: ["menu", "thuc don", "bang gia", "banh mi chao", "bo ne"] },
  { key: "banh-xeo", query: "menu thực đơn quán bánh xèo bánh khọt", must: ["menu", "thuc don", "bang gia", "banh xeo", "banh khot"] },
  { key: "banh-cuon", query: "menu bảng giá quán bánh cuốn nóng bánh ướt", must: ["menu", "thuc don", "bang gia", "banh cuon", "banh uot"] },
  { key: "banh-beo-loc", query: "menu bảng giá quán bánh bèo nậm lọc huế", must: ["menu", "thuc don", "bang gia", "banh beo", "banh loc", "hue"] },

  { key: "com-tam", query: "menu thực đơn bảng giá quán cơm tấm sài gòn", must: ["menu", "thuc don", "bang gia", "com tam"] },
  { key: "com-ga", query: "menu thực đơn bảng giá quán cơm gà xối mỡ cơm gà", must: ["menu", "thuc don", "bang gia", "com ga", "com "] },
  { key: "com-nieu", query: "menu thực đơn nhà hàng cơm niêu món việt", must: ["menu", "thuc don", "bang gia", "com "] },
  { key: "xoi", query: "menu bảng giá quán xôi xéo xôi mặn", must: ["menu", "thuc don", "bang gia", "xoi"] },
  { key: "chao", query: "menu bảng giá quán cháo lòng cháo sườn cháo ếch", must: ["menu", "thuc don", "bang gia", "chao"] },

  { key: "pho", query: "menu thực đơn bảng giá quán phở bò phở gà", must: ["menu", "thuc don", "bang gia", "pho"] },
  { key: "bun-bo", query: "menu thực đơn bảng giá quán bún bò huế", must: ["menu", "thuc don", "bang gia", "bun bo"] },
  { key: "bun-rieu", query: "menu thực đơn bảng giá quán bún riêu cua bún ốc bún cá", must: ["menu", "thuc don", "bang gia", "bun rieu", "bun "] },
  { key: "bun-cha-thit-nuong", query: "menu thực đơn bảng giá quán bún chả bún thịt nướng", must: ["menu", "thuc don", "bang gia", "bun cha", "bun thit nuong"] },
  { key: "bun-dau", query: "menu thực đơn bảng giá quán bún đậu mắm tôm", must: ["menu", "thuc don", "bang gia", "bun dau"] },
  { key: "bun-mam", query: "menu bảng giá quán bún mắm miền tây", must: ["menu", "thuc don", "bang gia", "bun mam"] },
  { key: "banh-canh", query: "menu thực đơn bảng giá quán bánh canh cua bánh canh ghẹ", must: ["menu", "thuc don", "bang gia", "banh canh"] },
  { key: "hu-tieu", query: "menu thực đơn bảng giá quán hủ tiếu nam vang mì trộn", must: ["menu", "thuc don", "bang gia", "hu tieu", "mi "] },
  { key: "mi-quang-cao-lau", query: "menu bảng giá quán mì quảng đà nẵng cao lầu", must: ["menu", "thuc don", "bang gia", "mi quang", "cao lau"] },

  { key: "oc-hai-san", query: "menu thực đơn bảng giá quán ốc hải sản bình dân", must: ["menu", "thuc don", "bang gia", "oc ", "hai san"] },
  { key: "lau", query: "menu thực đơn bảng giá quán lẩu thái lẩu bò", must: ["menu", "thuc don", "bang gia", "lau"] },
  { key: "nuong-bbq", query: "menu thực đơn bảng giá quán thịt nướng bbq", must: ["menu", "thuc don", "bang gia", "nuong", "bbq"] },
  { key: "do-han", query: "menu thực đơn quán ăn hàn quốc tokbokki mì cay", must: ["menu", "thuc don", "bang gia", "han quoc", "mi cay", "tokbokki"] },
  { key: "do-nhat", query: "menu thực đơn quán mì ramen sushi nhật bản", must: ["menu", "thuc don", "bang gia", "ramen", "sushi", "nhat"] },
  { key: "do-thai", query: "menu thực đơn nhà hàng thái lan", must: ["menu", "thuc don", "bang gia", "thai"] },
  { key: "dimsum-ha-cao", query: "menu thực đơn bảng giá quán dimsum há cảo sủi cảo", must: ["menu", "thuc don", "bang gia", "dimsum", "ha cao", "sui cao"] },
  { key: "pizza-steak-au", query: "menu thực đơn nhà hàng pizza mì ý beefsteak", must: ["menu", "thuc don", "bang gia", "pizza", "steak", "pasta"] },

  { key: "che", query: "menu bảng giá quán chè thái chè khúc bạch", must: ["menu", "thuc don", "bang gia", "che"] },
  { key: "tau-hu-flan", query: "menu bảng giá quán tàu hũ bánh flan", must: ["menu", "thuc don", "bang gia", "tau hu", "flan"] },
  { key: "kem-bingsu", query: "menu bảng giá quán kem bingsu sữa chua", must: ["menu", "thuc don", "bang gia", "kem", "bingsu", "sua chua"] },
  { key: "banh-ngot", query: "menu bảng giá tiệm bánh ngọt bakery", must: ["menu", "thuc don", "bang gia", "banh", "bakery", "cake"] },
  { key: "tra-sua", query: "menu thực đơn bảng giá quán trà sữa full topping", must: ["menu", "thuc don", "bang gia", "tra sua"] },
  { key: "matcha", query: "menu bảng giá quán matcha latte cafe", must: ["menu", "thuc don", "bang gia", "matcha", "cafe"] },

  { key: "cafe-chill", query: "menu thực đơn bảng giá quán cà phê đồ uống", must: ["menu", "thuc don", "bang gia", "ca phe", "cafe", "coffee"] },
  { key: "cafe-san-vuon", query: "menu bảng giá quán cà phê sân vườn nước uống", must: ["menu", "thuc don", "bang gia", "ca phe", "cafe", "coffee"] },
  { key: "cafe-study", query: "menu bảng giá quán cà phê học bài trà bánh", must: ["menu", "thuc don", "bang gia", "ca phe", "cafe", "coffee"] },
  { key: "rooftop-date", query: "menu đồ uống cocktail mocktail rooftop bar chill", must: ["menu", "thuc don", "bang gia", "rooftop", "bar", "chill", "cafe"] },
  { key: "workshop-gom-nen", query: "menu bảng giá workshop làm gốm làm nến thơm vẽ tranh", must: ["menu", "bang gia", "workshop", "gom", "nen", "ve tranh"] },
  { key: "photobooth-game", query: "bảng giá chụp ảnh photobooth life4cut khu vui chơi", must: ["menu", "bang gia", "photobooth", "life4cut", "game", "gia ve"] },
  { key: "pho-di-bo", query: "menu bảng giá đồ uống ăn vặt phố đi bộ chợ đêm", must: ["menu", "thuc don", "bang gia", "an vat", "ca phe"] },
  { key: "bien-dao", query: "menu bảng giá quán nước hải sản ven biển", must: ["menu", "thuc don", "bang gia", "hai san", "cafe"] },
  { key: "san-may-nui", query: "menu bảng giá quán cà phê săn mây đà lạt", must: ["menu", "thuc don", "bang gia", "ca phe", "cafe"] },
];

const SPEC_BY_KEY = new Map(MENU_SPECS.map((s) => [s.key, s]));

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
  if (nameAndTag.includes("cơm gà") || nameAndTag.includes("cơm rang")) return "com-ga";
  if (nameAndTag.includes("cơm ") || nameAndTag.startsWith("cơm")) return "com-nieu";
  if (nameAndTag.includes("xôi")) return "xoi";
  if (nameAndTag.includes("cháo")) return "chao";

  if (nameAndTag.includes("bánh canh") || nameAndTag.includes("bánh đa cua")) return "banh-canh";
  if (nameAndTag.includes("mì quảng") || nameAndTag.includes("mỳ quảng") || nameAndTag.includes("cao lầu")) return "mi-quang-cao-lau";
  if (nameAndTag.includes("hủ tiếu") || nameAndTag.includes("hủ tíu") || nameAndTag.includes("mì vịt tiềm") || nameAndTag.includes("mì trộn") || nameAndTag.includes("mì xào") || nameAndTag.includes("miến trộn") || nameAndTag.includes("miến lươn") || nameAndTag.includes("nui ")) return "hu-tieu";
  if (/\bphở\b/.test(nameAndTag)) return "pho";
  if (nameAndTag.includes("bún đậu")) return "bun-dau";
  if (nameAndTag.includes("bún riêu") || nameAndTag.includes("canh bún") || nameAndTag.includes("bún cá") || nameAndTag.includes("bún ốc")) return "bun-rieu";
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

async function fetchWithTimeout(url, timeoutMs = 8500) {
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

async function fetchImageBuffer(url, minBytes = 18000) {
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

async function searchBingMenuCandidates(query, dishKeywords = [], first = 1) {
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

        // Must contain a menu / price list indicator in title or URL
        const hasMenuWord =
          titleNorm.includes("menu") ||
          titleNorm.includes("thuc don") ||
          titleNorm.includes("thuc-don") ||
          titleNorm.includes("bang gia") ||
          titleNorm.includes("bang-gia") ||
          titleNorm.includes("gia ve");
        if (!hasMenuWord) continue;

        // Also match at least one dish keyword if provided
        if (
          dishKeywords.length > 0 &&
          !dishKeywords.some((kw) => titleNorm.includes(removeTones(kw)))
        ) {
          continue;
        }

        candidates.push({
          // Use uncropped `&w=900` so vertical/horizontal menus are 100% preserved and readable!
          turlFull: obj.turl ? `${obj.turl}&w=900` : null,
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

  // =========================================================================
  // STEP 1: Download all 63 Google Drive menu links directly to local images
  // =========================================================================
  const drivePlaces = locations.filter(
    (p) => p.menuUrl && p.menuUrl.includes("drive.google.com")
  );
  console.log(`1) Downloading ${drivePlaces.length} Google Drive menus to local static images...`);

  let driveSaved = 0;
  const usedMenuHashes = new Set();

  await runPool(drivePlaces, 12, async (place) => {
    const dest = path.join(MENUS_DIR, `${place.id}.jpg`);
    const match = place.menuUrl.match(/\/file\/d\/([^/]+)/);
    if (!match || !match[1]) return;
    const fileId = match[1];

    const urlsToTry = [
      `https://lh3.googleusercontent.com/d/${fileId}=w1000`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
      `https://drive.google.com/uc?export=download&id=${fileId}`,
    ];

    for (const u of urlsToTry) {
      const buf = await fetchImageBuffer(u, 12000);
      if (buf) {
        fs.writeFileSync(dest, buf);
        const h = crypto.createHash("md5").update(buf).digest("hex");
        usedMenuHashes.add(h);
        place.menuUrl = `/images/menus/${place.id}.jpg`;
        driveSaved += 1;
        break;
      }
    }
  });
  console.log(`   [OK] Downloaded ${driveSaved}/${drivePlaces.length} Google Drive menus locally.`);

  // =========================================================================
  // STEP 2: Pre-build verified Vietnamese menu pools for all 52 dish categories
  // =========================================================================
  console.log(`2) Building verified Vietnamese menu pools for ${MENU_SPECS.length} dish categories...`);
  const dishMenuPools = new Map();

  await runPool(MENU_SPECS, 12, async (spec) => {
    const dishOnlyMust = spec.must.filter(
      (k) => !["menu", "thuc don", "bang gia"].includes(k)
    );
    const pages = await Promise.all([
      searchBingMenuCandidates(spec.query, dishOnlyMust, 1),
      searchBingMenuCandidates(`${spec.query} mới nhất`, dishOnlyMust, 36),
      searchBingMenuCandidates(`${spec.query} chi tiết`, dishOnlyMust, 71),
    ]);
    dishMenuPools.set(spec.key, pages.flat());
  });

  // Also pre-download 6 verified real menu images per dish category into `public/images/menus/dishes/<key>-<1..6>.jpg`
  // as instant fallback when a small local stall doesn't have its own custom-named menu on Google
  const DISH_MENUS_DIR = path.resolve("public/images/menus/dishes");
  fs.mkdirSync(DISH_MENUS_DIR, { recursive: true });
  const dishSavedFiles = new Map();

  await runPool(MENU_SPECS, 10, async (spec) => {
    const pool = dishMenuPools.get(spec.key) || [];
    const savedPaths = [];
    for (const c of pool) {
      if (savedPaths.length >= 6) break;
      const urls = [c.turlFull, c.murl].filter(Boolean);
      for (const u of urls) {
        const buf = await fetchImageBuffer(u, 18000);
        if (!buf) continue;
        const h = crypto.createHash("md5").update(buf).digest("hex");
        if (usedMenuHashes.has(h)) continue;
        usedMenuHashes.add(h);
        const idx = savedPaths.length + 1;
        const fileRel = `/images/menus/dishes/${spec.key}-${idx}.jpg`;
        fs.writeFileSync(path.join(DISH_MENUS_DIR, `${spec.key}-${idx}.jpg`), buf);
        savedPaths.push(fileRel);
        break;
      }
    }
    dishSavedFiles.set(spec.key, savedPaths);
  });

  // =========================================================================
  // STEP 3: Fetch venue-specific menus from Google/Bing for remaining places
  // =========================================================================
  const remainingPlaces = locations.filter(
    (p) => !p.menuUrl || !p.menuUrl.startsWith("/images/menus/")
  );
  console.log(
    `3) Searching & downloading venue-specific menus for ${remainingPlaces.length} remaining locations...`
  );

  let specificVenueMenus = 0;
  let dishMatchedMenus = 0;
  const dishCounters = new Map();

  await runPool(remainingPlaces, 24, async (place, idx) => {
    const dest = path.join(MENUS_DIR, `${place.id}.jpg`);
    const dishKey = classifyPlaceDishKey(place);
    const spec = SPEC_BY_KEY.get(dishKey) || SPEC_BY_KEY.get("com-nieu");
    const cleanName = place.name.replace(/\([^)]*\)/g, "").split("-")[0].trim();
    const cityClean = place.province.replace(/^TP\.\s*/i, "");

    // Distinctive words from the venue's name
    const nameTokens = removeTones(cleanName)
      .split(/\s+/)
      .filter(
        (w) =>
          w.length >= 3 &&
          !["quan", "tiem", "nha", "hang", "ca", "phe", "cafe", "coffee", "tra", "sua", "bun", "pho", "com", "tam", "banh", "hu", "tieu"].includes(w)
      );

    let gotVenueMenu = false;

    if (nameTokens.length > 0) {
      const q = `menu thực đơn bảng giá ${cleanName} ${place.district || ""} ${cityClean}`;
      const candidates = await searchBingMenuCandidates(q, nameTokens.slice(0, 2), 1);
      for (const c of candidates) {
        const urls = [c.turlFull, c.murl].filter(Boolean);
        for (const u of urls) {
          const buf = await fetchImageBuffer(u, 18000);
          if (!buf) continue;
          const h = crypto.createHash("md5").update(buf).digest("hex");
          if (usedMenuHashes.has(h)) continue;
          usedMenuHashes.add(h);
          fs.writeFileSync(dest, buf);
          place.menuUrl = `/images/menus/${place.id}.jpg`;
          specificVenueMenus += 1;
          gotVenueMenu = true;
          break;
        }
        if (gotVenueMenu) break;
      }
    }

    if (!gotVenueMenu) {
      const dishFiles =
        dishSavedFiles.get(dishKey)?.length > 0
          ? dishSavedFiles.get(dishKey)
          : dishSavedFiles.get("com-nieu") || [];
      if (dishFiles.length > 0) {
        const c = dishCounters.get(dishKey) || 0;
        dishCounters.set(dishKey, c + 1);
        place.menuUrl = dishFiles[c % dishFiles.length];
        dishMatchedMenus += 1;
      }
    }

    if ((idx + 1) % 200 === 0 || idx + 1 === remainingPlaces.length) {
      console.log(
        `   Progress: ${idx + 1}/${remainingPlaces.length} | Venue-specific menus: ${specificVenueMenus} | Dish-matched menus: ${dishMatchedMenus}`
      );
    }
  });

  fs.writeFileSync(LOCATIONS_PATH, JSON.stringify(locations, null, 2), "utf8");

  const totalWithLocalMenu = locations.filter(
    (p) => p.menuUrl && p.menuUrl.startsWith("/images/menus/")
  ).length;
  console.log(
    `\nCompleted! ${totalWithLocalMenu}/${locations.length} locations now have instant local menu images (/images/menus/...).`
  );
  console.log(
    `   - Google Drive menus saved locally: ${driveSaved}\n   - Specific venue menus downloaded from Google/Bing: ${specificVenueMenus}\n   - Verified dish-category menus assigned: ${dishMatchedMenus}`
  );
}

main();

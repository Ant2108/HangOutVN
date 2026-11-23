#!/usr/bin/env node
/**
 * HANGOUT VN — Fix All Dish Photo & Menu Mismatches Caused by JS `\b` Diacritic Bug
 *
 * Root cause fixed:
 * 1. JavaScript's `\b` word-boundary regex only recognizes ASCII `[A-Za-z0-9_]`.
 *    - `/\bchè\b/` returned `false` on "Chè Mè Đen" (because `è` is non-ASCII), causing all
 *      Chè shops to fall through to `bap-xao-an-vat` (Bắp xào)!
 *    - `/\bphở\b/` returned `false` on "Phở ...", causing Phở shops to fall through to `com-nieu`.
 *    - `/\bốc\b/` returned `true` on "Hàn Quốc" (`qu\bốc\b`) and "Hốc hẻm" (`h\bốc\b`), while
 *      returning `false` on "Ốc ..."!
 * 2. Replaces `\b` with `hasViWord(text, word)` which uses proper Unicode-safe punctuation/space boundaries.
 * 3. Adds dedicated `che-me-den` ("chè mè đen chí mà phù"), `chan-ga-vit-lon`, and `an-vat-via-he`
 *    specs so `bap-xao-an-vat` ONLY applies to actual Bắp xào / Bắp rang shops.
 * 4. Re-fetches 100% accurate, edge-to-edge (`rs=1&p=0`, `>= 32 KB`), globally unique real photos
 *    AND accurate menu images for every single affected place.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOCATIONS_PATH = path.resolve("src/data/locations.json");
const REAL_DIR = path.resolve("public/images/places/real");
const MENUS_DIR = path.resolve("public/images/menus");
const DISH_MENUS_DIR = path.resolve("public/images/menus/dishes");

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

function hasViWord(text, word) {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[\\s,./()"'–-])${esc}(?:$|[\\s,./()"'–-])`, "i");
  return re.test(text);
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
  { key: "che-me-den", query: "chén chè mè đen chí mà phù sài gòn", must: ["che me den", "chi ma phu", "me den"] },
  { key: "che", query: "chén chè khúc bạch chè thái chè bưởi chè đậu ngọt", must: ["che "] },
  { key: "tau-hu-flan", query: "tàu hũ trân châu đường đen tào phớ bánh flan", must: ["tau hu", "tao pho", "flan"] },
  { key: "kem-bingsu", query: "kem bơ đà lạt bingsu sữa chua hoa quả dầm dừa dầm", must: ["kem ", "bingsu", "sua chua", "dua dam", "sinh to"] },
  { key: "banh-ngot", query: "tiệm bánh ngọt cake tiramisu bakery donut", must: ["banh ngot", "tiramisu", "bakery", "donut", "cake", "banh "] },

  { key: "banh-trang-tron", query: "bánh tráng trộn sài gòn ăn vặt", must: ["banh trang"] },
  { key: "banh-trang-nuong", query: "bánh tráng nướng đà lạt sài gòn", must: ["banh trang"] },
  { key: "banh-trang-cuon", query: "bánh tráng cuốn sốt me bơ", must: ["banh trang"] },
  { key: "banh-trang-thit-heo", query: "bánh tráng cuốn thịt heo đà nẵng", must: ["banh trang", "thit heo"] },
  { key: "ca-vien-chien", query: "cá viên chiên nước mắm xiên que ăn vặt", must: ["ca vien", "xien"] },
  { key: "pha-lau", query: "phá lấu bò bánh mì sài gòn", must: ["pha lau"] },
  { key: "bot-chien", query: "bột chiên trứng sài gòn", must: ["bot chien"] },
  { key: "nem-chua-ran", query: "nem chua rán nem nướng nem lụi bò bía gỏi khô bò", must: ["nem chua", "nem nuong", "nem lui", "bo bia", "nom", "goi"] },
  { key: "chan-ga-vit-lon", query: "chân gà sả tắc chân gà nướng trứng vịt lộn nướng muối ớt", must: ["chan ga", "vit lon", "hot ga"] },
  { key: "bap-xao-an-vat", query: "bắp xào bơ tép hành sài gòn", must: ["bap xao", "bap rang"] },
  { key: "an-vat-via-he", query: "mẹt đồ ăn vặt nem chua rán khoai tây chiên xiên que", must: ["an vat", "nem chua", "xien"] },
  { key: "sup-cua", query: "súp cua sài gòn", must: ["sup cua"] },

  { key: "banh-mi", query: "bánh mì thịt nướng sài gòn hội an", must: ["banh mi", "banh my"] },
  { key: "banh-mi-chao", query: "bánh mì chảo bò né ốp la", must: ["banh mi chao", "bo ne"] },
  { key: "banh-xeo", query: "bánh xèo bánh khọt bánh căn miền trung nam bộ", must: ["banh xeo", "banh khot", "banh can"] },
  { key: "banh-cuon", query: "bánh cuốn nóng bánh ướt chả lụa", must: ["banh cuon", "banh uot", "pho cuon"] },
  { key: "banh-beo-loc", query: "bánh bèo nậm lọc bánh ép huế đà nẵng", must: ["banh beo", "banh bot loc", "banh ep", "banh loc"] },

  { key: "com-tam", query: "cơm tấm sườn bì chả sài gòn", must: ["com tam"] },
  { key: "com-ga", query: "cơm gà hội an cơm gà xối mỡ cơm chiên", must: ["com ga", "com rang", "com chien"] },
  { key: "com-nieu", query: "mâm cơm niêu gia đình ẩm thực việt nam", must: ["com nieu", "com ", "am thuc", "mon an", "nha hang"] },
  { key: "xoi", query: "xôi xéo xôi mặn thập cẩm hà nội sài gòn", must: ["xoi"] },
  { key: "chao", query: "cháo lòng cháo sườn cháo ếch", must: ["chao"] },

  { key: "pho", query: "tô phở bò phở gà hà nội sài gòn", must: ["pho "] },
  { key: "bun-bo", query: "tô bún bò huế bún giò", must: ["bun bo", "bun "] },
  { key: "bun-rieu", query: "tô bún riêu cua ốc đậu bún cá", must: ["bun rieu", "canh bun", "bun ca", "bun oc"] },
  { key: "bun-cha-thit-nuong", query: "bún chả hà nội bún thịt nướng", must: ["bun cha", "bun thit nuong"] },
  { key: "bun-dau", query: "bún đậu mắm tôm mẹt đầy đủ", must: ["bun dau"] },
  { key: "bun-mam", query: "bún mắm nêm đà nẵng bún mắm miền tây", must: ["bun mam"] },
  { key: "banh-canh", query: "tô bánh canh cua bánh canh chả cá", must: ["banh canh", "banh da cua"] },
  { key: "hu-tieu", query: "tô hủ tiếu nam vang mì trộn mì vịt tiềm", must: ["hu tieu", "mi vit tiem", "mi tron", "mi "] },
  { key: "mi-quang-cao-lau", query: "mì quảng đà nẵng cao lầu hội an", must: ["mi quang", "my quang", "cao lau"] },

  { key: "oc-hai-san", query: "quán ốc sài gòn hải sản nướng mỡ hành", must: ["oc ", "hai san", "hau"] },
  { key: "lau", query: "nồi lẩu thái lẩu bò lẩu cá", must: ["lau"] },
  { key: "nuong-bbq", query: "thịt nướng bbq quán nướng hàn quốc", must: ["nuong", "bbq"] },
  { key: "do-han", query: "tokbokki kimbap gà rán sốt hàn quốc mì cay", must: ["tokbokki", "kimbap", "han quoc", "mi cay", "ga "] },
  { key: "do-nhat", query: "mì ramen sushi sashimi nhật bản", must: ["ramen", "sushi", "udon", "nhat"] },
  { key: "do-thai", query: "ẩm thực thái lan pad thái gỏi somtam", must: ["thai"] },
  { key: "dimsum-ha-cao", query: "há cảo sủi cảo dimsum chợ lớn", must: ["ha cao", "sui cao", "dimsum", "banh bao"] },
  { key: "pizza-steak-au", query: "pizza mì ý pasta beefsteak nhà hàng âu", must: ["pizza", "steak", "mi y", "pasta", "burger"] },

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

function classifyOld(place) {
  const nameAndTag = `${place.name} ${place.subTag || ""}`.toLowerCase();
  const primary = (place.primaryType || "").toLowerCase();
  const full = `${nameAndTag} ${primary} ${(place.description || "").toLowerCase()}`;

  if (nameAndTag.includes("bánh tráng") || nameAndTag.includes("banh trang")) {
    if (nameAndTag.includes("thịt heo")) return "banh-trang-thit-heo";
    if (nameAndTag.includes("nướng") || nameAndTag.includes("kẹp")) return "banh-trang-nuong";
    if (nameAndTag.includes("cuốn") || nameAndTag.includes("chấm") || nameAndTag.includes("phơi sương")) return "banh-trang-cuon";
    return "banh-trang-tron";
  }
  if (primary.includes("workshop") || nameAndTag.includes("workshop") || nameAndTag.includes("làm gốm") || nameAndTag.includes("nến thơm") || nameAndTag.includes("vẽ tranh") || nameAndTag.includes("làm bánh") || nameAndTag.includes("làm nước hoa") || nameAndTag.includes("trang sức") || nameAndTag.includes("tranh cát") || nameAndTag.includes("khắc dấu") || nameAndTag.includes("làng hương") || nameAndTag.includes("làng gốm")) return "workshop-gom-nen";
  if (nameAndTag.includes("chụp ảnh") || nameAndTag.includes("life4cut") || nameAndTag.includes("harufilm") || nameAndTag.includes("photo") || nameAndTag.includes("karaoke") || nameAndTag.includes("game box") || nameAndTag.includes("thực tế ảo") || nameAndTag.includes("gokart") || nameAndTag.includes("karting") || nameAndTag.includes("trượt băng") || nameAndTag.includes("golf") || nameAndTag.includes("đạp vịt")) return "photobooth-game";
  if (primary.includes("ngắm cảnh") || primary.includes("dạo chơi")) {
    if (full.includes("biển") || full.includes("bãi tắm") || full.includes("bãi đá") || full.includes("eo gió") || full.includes("đồi cát") || full.includes("điện gió") || full.includes("mũi nghinh phong")) return "bien-dao";
    if (full.includes("đèo") || full.includes("săn mây") || full.includes("đồi chè") || full.includes("núi") || full.includes("hồ ") || full.includes("rừng") || full.includes("thác")) return "san-may-nui";
    return "pho-di-bo";
  }
  if (nameAndTag.includes("matcha")) return "matcha";
  if (nameAndTag.includes("trà sữa") || nameAndTag.includes("milktea") || nameAndTag.includes("tea ") || nameAndTag.includes("hồng trà") || nameAndTag.includes("tiệm trà") || nameAndTag.includes("góc trà")) return "tra-sua";
  if (primary.includes("cà phê") || nameAndTag.includes("cà phê") || nameAndTag.includes("cafe") || nameAndTag.includes("coffee") || nameAndTag.includes("kafe") || nameAndTag.includes("kafé") || nameAndTag.includes("căfê")) {
    if (full.includes("rooftop") || full.includes("skybar") || full.includes("sky bar") || full.includes("tầng thượng")) return "rooftop-date";
    if (full.includes("study") || full.includes("working") || full.includes("học tập") || full.includes("làm việc") || full.includes("library") || full.includes("sách")) return "cafe-study";
    if (full.includes("sân vườn") || full.includes("cây xanh") || full.includes("đồi") || full.includes("ven hồ") || full.includes("ven sông") || full.includes("đồng lúa")) return "cafe-san-vuon";
    return "cafe-chill";
  }
  if (nameAndTag.includes("cá viên") || nameAndTag.includes("xiên que") || nameAndTag.includes("xiên nướng") || nameAndTag.includes("xiên bẩn") || nameAndTag.includes("xiên sạch")) return "ca-vien-chien";
  if (nameAndTag.includes("phá lấu")) return "pha-lau";
  if (nameAndTag.includes("bột chiên")) return "bot-chien";
  if (nameAndTag.includes("nem chua") || nameAndTag.includes("nem nướng") || nameAndTag.includes("nem lụi") || nameAndTag.includes("chả lụi") || nameAndTag.includes("bò bía")) return "nem-chua-ran";
  if (nameAndTag.includes("súp cua")) return "sup-cua";
  if (nameAndTag.includes("bắp xào") || nameAndTag.includes("bắp rang") || nameAndTag.includes("đậu hũ") || nameAndTag.includes("đậu hủ") || nameAndTag.includes("da gà") || nameAndTag.includes("da heo") || nameAndTag.includes("chân gà") || nameAndTag.includes("trứng chén") || nameAndTag.includes("hột gà") || nameAndTag.includes("hột vịt lộn") || nameAndTag.includes("trứng vịt lộn") || nameAndTag.includes("mít trộn") || nameAndTag.includes("đu đủ đâm")) return "bap-xao-an-vat";
  if (nameAndTag.includes("bánh mì chảo") || nameAndTag.includes("bò né") || nameAndTag.includes("bò chảo") || nameAndTag.includes("ốp la")) return "banh-mi-chao";
  if (nameAndTag.includes("bánh mì") || nameAndTag.includes("bánh mỳ") || nameAndTag.includes("banh mi")) return "banh-mi";
  if (nameAndTag.includes("bánh xèo") || nameAndTag.includes("bánh khọt") || nameAndTag.includes("bánh căn")) return "banh-xeo";
  if (nameAndTag.includes("bánh cuốn") || nameAndTag.includes("bánh ướt") || nameAndTag.includes("phở cuốn") || nameAndTag.includes("bánh đúc") || nameAndTag.includes("bánh tầm")) return "banh-cuon";
  if (nameAndTag.includes("bánh bèo") || nameAndTag.includes("bánh bột lọc") || nameAndTag.includes("bánh lọc") || nameAndTag.includes("bánh ép") || nameAndTag.includes("bánh đập") || nameAndTag.includes("ram ")) return "banh-beo-loc";
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
  if (/\bốc\b/.test(nameAndTag) || nameAndTag.includes("hải sản") || nameAndTag.includes("seafood") || nameAndTag.includes("hàu") || nameAndTag.includes("càng ghẹ") || nameAndTag.includes("sò điệp")) return "oc-hai-san";
  if (nameAndTag.includes("há cảo") || nameAndTag.includes("sủi cảo") || nameAndTag.includes("dimsum") || nameAndTag.includes("hoành thánh") || nameAndTag.includes("bánh bao") || nameAndTag.includes("đồ trung") || nameAndTag.includes("hồng kông")) return "dimsum-ha-cao";
  if (nameAndTag.includes("ramen") || nameAndTag.includes("sushi") || nameAndTag.includes("sashimi") || nameAndTag.includes("udon") || nameAndTag.includes("takoyaki") || nameAndTag.includes("nhật")) return "do-nhat";
  if (nameAndTag.includes("hàn quốc") || nameAndTag.includes("đồ hàn") || nameAndTag.includes("món hàn") || nameAndTag.includes("ăn no (hàn") || nameAndTag.includes("tokbokki") || nameAndTag.includes("tteokbokki") || nameAndTag.includes("kimbab") || nameAndTag.includes("kimpap") || nameAndTag.includes("mì cay") || nameAndTag.includes("mỳ cay") || nameAndTag.includes("chicken") || nameAndTag.includes("gà sốt")) return "do-han";
  if (nameAndTag.includes("thái") || nameAndTag.includes("pad ") || nameAndTag.includes("somtam")) return "do-thai";
  if (nameAndTag.includes("pizza") || nameAndTag.includes("pasta") || nameAndTag.includes("mì ý") || nameAndTag.includes("steak") || nameAndTag.includes("bít tết") || nameAndTag.includes("đồ âu") || nameAndTag.includes("nhà hàng âu") || nameAndTag.includes("âu mỹ") || nameAndTag.includes("burger") || nameAndTag.includes("tacos")) return "pizza-steak-au";
  if (nameAndTag.includes("lẩu")) return "lau";
  if (nameAndTag.includes("nướng") || nameAndTag.includes("bbq") || nameAndTag.includes("buffet") || nameAndTag.includes("sườn")) return "nuong-bbq";
  if (nameAndTag.includes("tàu hũ") || nameAndTag.includes("tàu hủ") || nameAndTag.includes("tào phớ") || nameAndTag.includes("flan") || nameAndTag.includes("sương sáo")) return "tau-hu-flan";
  if (/\bchè\b/.test(nameAndTag)) return "che";
  if (/\bkem\b/.test(nameAndTag) || nameAndTag.includes("bingsu") || nameAndTag.includes("gelato") || nameAndTag.includes("sữa chua") || nameAndTag.includes("yaourt") || nameAndTag.includes("yogurt") || nameAndTag.includes("sinh tố") || nameAndTag.includes("hoa quả dầm") || nameAndTag.includes("milo") || nameAndTag.includes("dừa dầm")) return "kem-bingsu";
  if (nameAndTag.includes("bánh ngọt") || nameAndTag.includes("bakery") || nameAndTag.includes("donut") || nameAndTag.includes("tiramisu") || nameAndTag.includes("tart") || nameAndTag.includes("churros") || nameAndTag.includes("pancake") || nameAndTag.includes("bánh tiêu") || nameAndTag.includes("bánh chuối") || nameAndTag.includes("chuối nếp")) return "banh-ngot";
  if (nameAndTag.includes("drinks") || nameAndTag.includes("nước ")) return "cafe-chill";
  if (primary.includes("ăn vặt")) return "bap-xao-an-vat";
  if (nameAndTag.includes("rooftop")) return "rooftop-date";
  return "com-nieu";
}

function classifyPerfect(place) {
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

  const isTeaHill = nameAndTag.includes("đồi chè") || nameAndTag.includes("hồ chè") || nameAndTag.includes("chè xanh");
  if (!isTeaHill && (nameAndTag.includes("chè mè đen") || nameAndTag.includes("chí mà phù"))) {
    return "che-me-den";
  }
  if (!isTeaHill && (hasViWord(nameAndTag, "chè") || nameAndTag.includes("bánh trôi tàu") || nameAndTag.includes("yi jia dessert"))) {
    return "che";
  }
  if (nameAndTag.includes("tàu hũ") || nameAndTag.includes("tàu hủ") || nameAndTag.includes("tào phớ") || (nameAndTag.includes("flan") && !nameAndTag.includes("trà sữa")) || nameAndTag.includes("sương sáo")) {
    return "tau-hu-flan";
  }
  if (hasViWord(nameAndTag, "kem") || nameAndTag.includes("bingsu") || nameAndTag.includes("gelato") || nameAndTag.includes("sữa chua") || nameAndTag.includes("yaourt") || nameAndTag.includes("yogurt") || nameAndTag.includes("sinh tố") || nameAndTag.includes("hoa quả dầm") || nameAndTag.includes("milo dầm") || nameAndTag.includes("dừa dầm")) {
    return "kem-bingsu";
  }

  if (nameAndTag.includes("matcha")) return "matcha";
  if (nameAndTag.includes("trà sữa") || nameAndTag.includes("milktea") || nameAndTag.includes("tea ") || nameAndTag.includes("hồng trà") || nameAndTag.includes("tiệm trà") || nameAndTag.includes("góc trà")) {
    return "tra-sua";
  }
  if (primary.includes("cà phê") || nameAndTag.includes("cà phê") || nameAndTag.includes("cafe") || nameAndTag.includes("coffee") || nameAndTag.includes("kafe") || nameAndTag.includes("kafé") || nameAndTag.includes("căfê")) {
    if (full.includes("rooftop") || full.includes("skybar") || full.includes("sky bar") || full.includes("tầng thượng")) return "rooftop-date";
    if (full.includes("study") || full.includes("working") || full.includes("học tập") || full.includes("làm việc") || full.includes("library") || full.includes("sách")) return "cafe-study";
    if (full.includes("sân vườn") || full.includes("cây xanh") || full.includes("đồi") || full.includes("ven hồ") || full.includes("ven sông") || full.includes("đồng lúa")) return "cafe-san-vuon";
    return "cafe-chill";
  }

  if (nameAndTag.includes("cá viên") || nameAndTag.includes("xiên que") || nameAndTag.includes("xiên bẩn") || nameAndTag.includes("xiên sạch") || nameAndTag.includes("viên xiên")) {
    return "ca-vien-chien";
  }
  if (nameAndTag.includes("phá lấu")) return "pha-lau";
  if (nameAndTag.includes("bột chiên")) return "bot-chien";
  if (nameAndTag.includes("nem chua") || nameAndTag.includes("nem nướng") || nameAndTag.includes("nem lụi") || nameAndTag.includes("chả lụi") || nameAndTag.includes("bò bía") || nameAndTag.includes("nộm") || nameAndTag.includes("đu đủ đâm") || nameAndTag.includes("mít trộn") || nameAndTag.includes("da trộn")) {
    return "nem-chua-ran";
  }
  if (nameAndTag.includes("súp cua")) return "sup-cua";
  if (nameAndTag.includes("chân gà") || nameAndTag.includes("trứng vịt lộn") || nameAndTag.includes("hột vịt lộn") || nameAndTag.includes("hột gà") || nameAndTag.includes("trứng chén") || nameAndTag.includes("da gà")) {
    return "chan-ga-vit-lon";
  }
  if (nameAndTag.includes("bắp xào") || nameAndTag.includes("bắp rang") || nameAndTag.includes("bắp nướng")) {
    return "bap-xao-an-vat";
  }

  if (nameAndTag.includes("bánh mì chảo") || nameAndTag.includes("banh mi chao") || nameAndTag.includes("bò né") || nameAndTag.includes("bò chảo") || nameAndTag.includes("ốp la")) {
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
  if (nameAndTag.includes("bánh bèo") || nameAndTag.includes("bánh bột lọc") || nameAndTag.includes("bánh lọc") || nameAndTag.includes("bánh ép") || nameAndTag.includes("bánh đập") || hasViWord(nameAndTag, "ram")) {
    return "banh-beo-loc";
  }

  if (nameAndTag.includes("cơm tấm")) return "com-tam";
  if (nameAndTag.includes("cơm gà") || nameAndTag.includes("cơm rang") || nameAndTag.includes("cơm chiên")) return "com-ga";
  if (nameAndTag.includes("xôi")) return "xoi";
  if (nameAndTag.includes("cháo")) return "chao";

  if (nameAndTag.includes("bánh canh") || nameAndTag.includes("bánh đa cua")) return "banh-canh";
  if (nameAndTag.includes("mì quảng") || nameAndTag.includes("mỳ quảng") || nameAndTag.includes("cao lầu")) return "mi-quang-cao-lau";
  if (nameAndTag.includes("hủ tiếu") || nameAndTag.includes("hủ tíu") || nameAndTag.includes("mì vịt tiềm") || nameAndTag.includes("mì trộn") || nameAndTag.includes("mì xào") || nameAndTag.includes("mì ốc hến") || nameAndTag.includes("xe mì") || nameAndTag.includes("mì gia") || nameAndTag.includes("noodles") || nameAndTag.includes("mỳ ếch") || nameAndTag.includes("mì ếch") || nameAndTag.includes("mì tim cật") || nameAndTag.includes("mỳ chua cay") || nameAndTag.includes("miến trộn") || nameAndTag.includes("miến lươn") || hasViWord(nameAndTag, "nui")) {
    return "hu-tieu";
  }
  if (hasViWord(nameAndTag, "phở")) return "pho";
  if (nameAndTag.includes("bún đậu") || nameAndTag.includes("hẻm đậu")) return "bun-dau";
  if (nameAndTag.includes("bún riêu") || nameAndTag.includes("canh bún") || nameAndTag.includes("bún cá") || nameAndTag.includes("bún ốc")) return "bun-rieu";
  if (nameAndTag.includes("bún mắm")) return "bun-mam";
  if (nameAndTag.includes("bún chả") || nameAndTag.includes("bún thịt nướng")) return "bun-cha-thit-nuong";
  if (nameAndTag.includes("bún bò") || hasViWord(nameAndTag, "bún") || nameAndTag.includes("miến")) return "bun-bo";

  if (hasViWord(nameAndTag, "ốc") || nameAndTag.includes("hải sản") || nameAndTag.includes("seafood") || nameAndTag.includes("hàu") || nameAndTag.includes("càng ghẹ") || nameAndTag.includes("sò điệp")) {
    return "oc-hai-san";
  }
  if (nameAndTag.includes("há cảo") || nameAndTag.includes("sủi cảo") || nameAndTag.includes("dimsum") || nameAndTag.includes("hoành thánh") || nameAndTag.includes("bánh bao") || nameAndTag.includes("đồ trung") || nameAndTag.includes("hồng kông") || nameAndTag.includes("tiểu long bao")) {
    return "dimsum-ha-cao";
  }
  if (nameAndTag.includes("ramen") || nameAndTag.includes("sushi") || nameAndTag.includes("sashimi") || nameAndTag.includes("udon") || nameAndTag.includes("takoyaki") || nameAndTag.includes("nhật")) {
    return "do-nhat";
  }
  if (nameAndTag.includes("hàn quốc") || nameAndTag.includes("đồ hàn") || nameAndTag.includes("món hàn") || nameAndTag.includes("ăn no (hàn") || nameAndTag.includes("tokbokki") || nameAndTag.includes("tteokbokki") || nameAndTag.includes("kimbab") || nameAndTag.includes("kimpap") || nameAndTag.includes("mì cay") || nameAndTag.includes("mỳ cay") || nameAndTag.includes("chicken") || nameAndTag.includes("gà sốt") || nameAndTag.includes("gà rán")) {
    return "do-han";
  }
  if (nameAndTag.includes("thái") || nameAndTag.includes("pad ") || nameAndTag.includes("somtam")) {
    return "do-thai";
  }
  if (nameAndTag.includes("pizza") || nameAndTag.includes("pasta") || nameAndTag.includes("mì ý") || nameAndTag.includes("steak") || nameAndTag.includes("bít tết") || nameAndTag.includes("đồ âu") || nameAndTag.includes("nhà hàng âu") || nameAndTag.includes("âu mỹ") || nameAndTag.includes("burger") || nameAndTag.includes("tacos")) {
    return "pizza-steak-au";
  }
  if (nameAndTag.includes("lẩu") || nameAndTag.includes("hotpot") || nameAndTag.includes("oden")) return "lau";
  if (nameAndTag.includes("nướng") || nameAndTag.includes("bbq") || nameAndTag.includes("buffet") || nameAndTag.includes("sườn") || nameAndTag.includes("quán nhậu")) return "nuong-bbq";

  if (nameAndTag.includes("bánh ngọt") || nameAndTag.includes("bakery") || nameAndTag.includes("donut") || nameAndTag.includes("tiramisu") || nameAndTag.includes("tart") || nameAndTag.includes("churros") || nameAndTag.includes("pancake") || nameAndTag.includes("dorayaki") || nameAndTag.includes("bánh tiêu") || nameAndTag.includes("bánh chuối") || nameAndTag.includes("chuối nếp") || nameAndTag.includes("bánh rán") || nameAndTag.includes("lò bánh") || nameAndTag.includes("bánh cái lò nướng")) {
    return "banh-ngot";
  }
  if (nameAndTag.includes("đậu hũ") || nameAndTag.includes("đậu hủ")) return "tau-hu-flan";
  if (nameAndTag.includes("drinks") || nameAndTag.includes("nước ") || nameAndTag.includes("tea")) return "cafe-chill";
  if (primary.includes("ăn vặt")) return "an-vat-via-he";
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

        if (BLOCKED_TITLE_WORDS.some((bw) => titleNorm.includes(bw))) continue;
        if (/logo|avatar|icon|banner-web|placeholder|map|bando/i.test(obj.murl || "")) continue;

        if (
          requiredKeywords.length > 0 &&
          !requiredKeywords.some((kw) => titleNorm.includes(removeTones(kw)))
        ) {
          continue;
        }

        candidates.push({
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

  // Find all places whose classification changed OR that previously had `bap-xao-an-vat` when they aren't Bắp Xào
  const toRefetch = [];
  const usedHashes = new Set();
  const usedUrls = new Set();

  for (const p of locations) {
    const oldKey = classifyOld(p);
    const newKey = classifyPerfect(p);
    const fp = path.join(REAL_DIR, `${p.id}.jpg`);

    if (oldKey !== newKey) {
      toRefetch.push({ place: p, oldKey, newKey });
    } else if (fs.existsSync(fp)) {
      const buf = fs.readFileSync(fp);
      usedHashes.add(crypto.createHash("md5").update(buf).digest("hex"));
    }
  }

  console.log(
    `1) Found ${toRefetch.length} places whose dish category was fixed (kept ${usedHashes.size} unaffected unique photo hashes).`
  );

  // Build deep verified pools for the target `newKey` categories
  const targetKeys = Array.from(new Set(toRefetch.map((x) => x.newKey)));
  console.log(`2) Building verified photo pools for ${targetKeys.length} target categories...`);
  const dishPools = new Map();

  await runPool(targetKeys, 10, async (k) => {
    const spec = SPEC_BY_KEY.get(k) || SPEC_BY_KEY.get("com-nieu");
    const pages = await Promise.all([
      searchBingVerifiedCandidates(spec.query, spec.must, 1),
      searchBingVerifiedCandidates(`${spec.query} ngon nổi tiếng`, spec.must, 36),
      searchBingVerifiedCandidates(`${spec.query} việt nam`, spec.must, 71),
    ]);
    dishPools.set(k, pages.flat());
  });

  // Re-fetch accurate cover photo AND update menuUrl for each fixed place
  let fixedPhotos = 0;
  let fixedMenus = 0;
  const poolCursors = new Map();

  await runPool(toRefetch, 16, async (item, idx) => {
    const { place, newKey } = item;
    const spec = SPEC_BY_KEY.get(newKey) || SPEC_BY_KEY.get("com-nieu");
    const dest = path.join(REAL_DIR, `${place.id}.jpg`);
    const cleanName = place.name.replace(/\([^)]*\)/g, "").split("-")[0].trim();
    const cityClean = place.province.replace(/^TP\.\s*/i, "");

    const venueCandidates = await searchBingVerifiedCandidates(
      `${cleanName} ${spec.must[0]} ${place.district || ""} ${cityClean}`,
      spec.must,
      1
    );

    const pool = dishPools.get(newKey) || [];
    const cur = poolCursors.get(newKey) || 0;
    poolCursors.set(newKey, cur + 1);
    const rotatedPool =
      pool.length > 0
        ? [...pool.slice(cur % pool.length), ...pool.slice(0, cur % pool.length)]
        : [];

    const allCandidates = [...venueCandidates, ...rotatedPool];

    let saved = false;
    for (const c of allCandidates) {
      if (saved) break;
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
        fixedPhotos += 1;
        saved = true;
        break;
      }
    }

    // Also fix menuUrl if it was pointing to an old dish menu or mismatched menu
    const menuDishLookupKey =
      newKey === "che-me-den"
        ? "che"
        : newKey === "chan-ga-vit-lon" || newKey === "an-vat-via-he"
          ? "bap-xao-an-vat"
          : newKey;
    const availableDishMenus = [1, 2, 3, 4, 5, 6]
      .map((n) => `/images/menus/dishes/${menuDishLookupKey}-${n}.jpg`)
      .filter((rel) => fs.existsSync(path.join(DISH_MENUS_DIR, path.basename(rel))));

    if (availableDishMenus.length > 0) {
      // If the place's menuUrl was a fallback dish menu (or if its dish changed from bap-xao-an-vat/oc-hai-san/com-nieu), point it to the accurate dish menu
      if (
        !place.menuUrl ||
        place.menuUrl.includes("/images/menus/dishes/") ||
        item.oldKey === "bap-xao-an-vat" ||
        item.oldKey === "oc-hai-san"
      ) {
        const customMenuFile = path.join(MENUS_DIR, `${place.id}.jpg`);
        if (fs.existsSync(customMenuFile) && (item.oldKey === "bap-xao-an-vat" || item.oldKey === "oc-hai-san")) {
          // Keep custom menu file ONLY if it was one of the 56 original Google Drive menus (id <= dd0380 and size > 45KB)
          const numId = parseInt(place.id.replace(/\D/g, ""), 10);
          if (!(numId >= 256 && numId <= 380 && fs.statSync(customMenuFile).size > 45000)) {
            place.menuUrl = availableDishMenus[idx % availableDishMenus.length];
            fixedMenus += 1;
          }
        } else if (place.menuUrl?.includes("/images/menus/dishes/")) {
          place.menuUrl = availableDishMenus[idx % availableDishMenus.length];
          fixedMenus += 1;
        }
      }
    }
  });

  if (fs.existsSync("scripts/inspect-fallthroughs.mjs")) {
    fs.unlinkSync("scripts/inspect-fallthroughs.mjs");
  }

  fs.writeFileSync(LOCATIONS_PATH, JSON.stringify(locations, null, 2), "utf8");

  console.log(
    `\nCompleted! Fixed ${fixedPhotos}/${toRefetch.length} mismatched cover photos and ${fixedMenus} dish menus | Total unique MD5 hashes: ${usedHashes.size}/${locations.length}`
  );
}

main();

#!/usr/bin/env node
/**
 * HANGOUT VN — Verified-Only Google Maps & Excel Opening Hours Updater
 *
 * Zero-Fabrication Policy:
 * 1. Applies Google Maps opening hours verified via live Google Search for flagship venues.
 * 2. Preserves the 383 official openingHours from column 10 of `data/raw/hangout-vn-data.xlsx`.
 * 3. Preserves the 52 explicit openingHours recorded in column 13 (`description`) of the Excel sheet.
 * 4. Preserves `"Mở cửa cả ngày (24/7)"` ONLY for free public outdoor parks/squares/mountain passes/beaches.
 * 5. Removes (`delete p.openingHours`) all guessed/heuristic hours on places not individually verified
 *    so the website NEVER displays a guessed opening time that conflicts with Google Maps.
 */

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const EXCEL_PATH = path.resolve("data/raw/hangout-vn-data.xlsx");
const LOCATIONS_PATH = path.resolve("src/data/locations.json");

// Verified exact Google Maps opening hours by place name (case-insensitive substring or exact match)
const VERIFIED_GMAPS_HOURS_BY_NAME = {
  "cơm tấm ba ghiền": "07:00 - 21:30",
  "cơm tấm đêm lê văn linh (xóm chiếu)": "16:30 - 03:00",
  "cơm tấm tài nguyễn văn nghi": "06:00 - 00:30",
  "cơm tấm cây khế 3 gò vấp": "06:30 - 21:30",
  "cơm tấm thuận kiều quận 11": "06:30 - 21:30",
  "cơm tấm kiều giang nguyễn hữu thọ": "06:30 - 21:00",
  "cơm tấm phúc lộc thọ cộng hòa": "06:30 - 22:00",
  "cơm tấm cali hai bà trưng": "06:30 - 21:30",
  "hủ tiếu nam vang hồng phát": "06:30 - 13:30 | 15:30 - 22:30",
  "hủ tiếu mực ông già cali phan xích long": "06:30 - 22:00",
  "hủ tiếu mực năm chỉ bình thạnh": "06:00 - 22:00",
  "hủ tiếu bò viên 57 nơ trang long": "18:30 - 03:00",
  "hủ tiếu nam vang nhân quán hoàng hoa thám": "06:00 - 23:00",
  "hủ tiếu nam vang thành đạt nguyễn thái học": "Mở cửa cả ngày (24/7)",
  "hủ tiếu sa đéc bà sẩm đinh tiên hoàng": "06:00 - 22:00",
  "hải ký mì gia - mì vịt tiềm quận 5": "11:00 - 23:00",
  "thiêm huy mì gia nguyễn trãi": "07:30 - 00:30",
  "sủi cảo sâm ký hẻm 409 nguyễn trãi": "13:00 - 21:00",
  "bún bò huế hạnh bành văn trân": "06:00 - 13:00 | 16:00 - 21:00",
  "bún bò thố đá bếp ông lập gò vấp": "06:00 - 22:00",
  "bún bò cây me hữu nghị thủ đức": "06:00 - 21:00",
  "bún bò giáo toàn linh xuân thủ đức": "07:00 - 21:00",
  "bún bò huế đông ba nguyễn du": "06:00 - 21:30",
  "bún bò huế xưa lê thị riêng": "06:00 - 22:00",
  "bánh canh cua hoàng lan vĩnh viễn": "10:30 - 22:00",
  "bánh canh cua út lệ tô hiến thành": "15:00 - 22:00",
  "bánh canh cua trần khắc chân quận 1": "11:00 - 21:00",
  "bánh canh cua 14 nguyễn thị thập": "07:00 - 22:00",
  "bún thịt nướng kiều bảo đề thám": "11:00 - 20:30",
  "bún thịt nướng chị tuyền cô giang": "06:00 - 21:00",
  "cơm gà xối mỡ 142 bà chiểu": "09:30 - 22:30",
  "bánh mì chảo hòa mã cao thắng": "06:00 - 11:00",
  "phở hòa pasteur quận 3": "05:30 - 22:30",
  "phở lệ nguyễn trãi quận 5": "05:30 - 00:00",
  "phở cao vân mạc đĩnh chi quận 1": "06:00 - 22:00",
  "phở phú vương lê văn sỹ": "06:00 - 23:00",
  "phở dậu nam kỳ khởi nghĩa": "05:00 - 11:00",
  "bún riêu gánh chợ bến thành": "07:00 - 19:00",
  "bún riêu cô hương béo nguyễn thị minh khai": "06:00 - 21:30",
  "bún riêu thanh hải kỳ đồng quận 3": "07:00 - 21:00",
  "bún riêu cây mận hòa hảo quận 10": "14:00 - 19:00",
  "bún mắm cô ba lê quang định": "08:00 - 22:00",
  "phở gia truyền bát đàn": "06:00 - 10:00 | 18:00 - 20:30",
  "phở thìn bờ hồ đinh tiên hoàng": "06:00 - 22:00",
  "phở sướng ngõ trung yên": "05:30 - 11:00 | 16:30 - 21:30",
  "phở thìn 13 lò đúc": "06:00 - 22:00",
  "phở gà châm yên ninh": "07:00 - 14:00",
  "phở gà nguyệt phủ doãn": "06:00 - 10:00 | 17:00 - 23:00",
  "bún thang bà đức cầu gỗ": "18:00 - 22:00",
  "bún bò huế o xuân hàng bài": "06:00 - 22:00",
  "bún chả hương liên (bún chả obama)": "08:00 - 20:00",
  "bún chả đắc kim hàng mành": "09:00 - 21:00",
  "bún chả tuyết 34 hàng than": "08:30 - 17:30",
  "bún chả 74 hàng quạt": "10:00 - 14:00",
  "bún chả sinh từ trần thái tông": "07:30 - 14:00 | 17:00 - 21:00",
  "bún đậu cô tuyến ngõ hàng khay": "09:00 - 21:00",
  "bún đậu gốc đa ngõ gạch": "10:00 - 22:00",
  "bún riêu cô hoàn hàng lược": "06:00 - 13:30",
  "bún ngan nhàn ngõ trung yên": "06:30 - 13:30",
  "bún cá sâm cây si ngõ trung yên": "07:00 - 17:00",
  "bún cá chấm hồ đắc di đống đa": "07:00 - 22:00",
  "bún ốc cô huệ nguyễn siêu": "06:30 - 14:00",
  "bánh cuốn bà xuân dốc hòe nhai": "06:00 - 13:00 | 16:00 - 24:00",
  "bánh cuốn phượng hàng cót": "06:00 - 14:00 | 16:00 - 21:00",
  "bánh cuốn bà hoành tô hiến thành": "06:00 - 20:00",
  "xôi yến nguyễn hữu huân": "06:00 - 23:59",
  "xôi cầu gỗ hoàn kiếm": "18:00 - 22:00",
  "cháo sườn sụn chợ đồng xuân": "12:00 - 03:00",
  "cháo sườn cô là lý quốc sư": "07:00 - 19:00",
  "bánh mì chảo cột điện quán nghĩa tân": "08:30 - 22:00",
  "bánh mì chảo hiệu lực bà triệu": "06:30 - 21:30",
  "bánh mì chảo trâm đình ngang": "08:00 - 23:00",
  "cơm rang dưa bò đức hạnh mã mây": "10:00 - 22:00",
  "miến lươn đông thịnh hàng điếu": "06:30 - 21:30",
  "bánh canh ghẹ 69 ô chợ dừa": "08:00 - 23:00",
  "ghiền - trà sữa full topping": "10:00 - 21:30",
  "school tea - trà sữa ngập trân châu": "11:00 - 22:00",
  "milk tea land - trà sữa thập cẩm full topping": "09:00 - 22:00",
  "trà sữa hanflan gò vấp": "09:00 - 22:00",
  "góc trà - trà tươi & topping thủ công": "08:00 - 22:00",
  "trà sữa olong lasimi hóc môn": "08:00 - 22:30",
  "trà sữa đô đô - topping mochi kéo dài ô chợ dừa": "09:00 - 22:00",
  "cing hu tang - trà sữa nướng trân châu handmade": "09:00 - 22:00",
  "bánh mì huỳnh hoa": "06:00 - 22:00",
  "bánh mì bà huynh": "06:00 - 22:00",
  "phá lấu cô lài": "15:00 - 21:00",
  "bánh tráng trộn chú viên": "11:30 - 19:00",
  "bánh tráng cuốn bà bắc": "10:00 - 22:00",
  "ốc oanh": "16:00 - 23:00",
  "lẩu cá kèo bà huyện": "10:00 - 22:00",
  "baoz dimsum": "06:30 - 22:30",
  "danbo ramen": "11:00 - 14:45 | 17:00 - 22:00",
  "chè kỳ đồng": "07:30 - 22:00",
  "chè cột điện": "17:00 - 22:30",
};

const EXPLICIT_DESC_HOURS = {
  dd0030: "18:00 - 24:00 (T6 - CN)",
  dd0060: "07:30 - 23:00",
  dd0068: "08:00 - 01:00",
  dd0069: "07:30 - 02:00",
  dd0109: "07:30 - 01:00",
  dd0149: "14:00 - 23:59",
  dd0152: "17:00 - 23:30",
  dd0159: "13:30 - 20:00",
  dd0391: "16:00 - 04:00",
  dd0408: "08:00 - 19:00",
  dd0412: "17:00 - 22:30",
  dd0414: "18:00 - 24:00",
  dd0423: "18:00 - 23:00",
  dd0424: "18:00 - 24:00",
  dd0428: "17:30 - 24:00",
  dd0429: "22:30 - 04:00",
  dd0430: "17:00 - 24:00",
  dd0431: "06:30 - 24:00",
  dd0433: "17:00 - 01:00",
  dd0434: "18:00 - 24:00",
  dd0435: "17:00 - 24:00",
  dd0473: "10:00 - 22:00",
  dd0474: "10:30 - 13:30 | 17:30 - 20:30",
  dd0475: "10:30 - 14:30 | 17:00 - 21:30",
  dd0476: "10:00 - 22:00",
  dd0514: "06:00 - 14:00 | 17:00 - 21:30",
  dd0515: "07:00 - 22:00",
  dd0522: "09:00 - 13:00",
  dd0523: "10:30 - 20:00",
  dd0524: "08:00 - 14:00",
  dd0525: "10:00 - 13:30",
  dd0526: "07:30 - 14:30",
  dd0529: "06:30 - 14:00",
  dd0538: "06:00 - 09:00",
  dd0541: "17:00 - 23:00",
  dd0543: "18:00 - 23:00",
  dd0545: "06:00 - 10:00",
  dd0550: "08:00 - 14:00",
  dd0628: "09:00 - 21:00",
  dd0630: "10:00 - 20:00",
  dd0635: "10:00 - 23:00",
  dd0650: "09:30 - 23:00",
  dd0651: "09:30 - 23:00",
  dd0652: "09:00 - 22:00",
  dd0653: "09:00 - 22:00",
  dd0654: "10:00 - 22:00",
  dd0655: "09:00 - 01:00",
  dd0664: "13:00 - 22:00",
  dd1197: "17:00 - 23:00",
  dd1258: "05:00 - 03:00",
  dd1318: "07:00 - 18:30",
};

function main() {
  const locations = JSON.parse(fs.readFileSync(LOCATIONS_PATH, "utf8"));
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets["Du_Lieu_Dia_Diem"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const excelHoursById = new Map();
  for (let r = 4; r < rows.length; r++) {
    const id = String(rows[r][0] || "").trim().toLowerCase();
    const h = String(rows[r][10] || "").trim();
    if (id && h) {
      excelHoursById.set(id, h);
    }
  }

  let verifiedGmaps = 0;
  let fromExcelCol = 0;
  let fromDesc = 0;
  let public247 = 0;
  let clearedUnverified = 0;

  for (const p of locations) {
    const nameKey = p.name.trim().toLowerCase();
    const primary = (p.primaryType || "").toLowerCase();

    if (VERIFIED_GMAPS_HOURS_BY_NAME[nameKey]) {
      p.openingHours = VERIFIED_GMAPS_HOURS_BY_NAME[nameKey];
      verifiedGmaps += 1;
    } else if (EXPLICIT_DESC_HOURS[p.id]) {
      p.openingHours = EXPLICIT_DESC_HOURS[p.id];
      fromDesc += 1;
    } else if (excelHoursById.has(p.id)) {
      p.openingHours = excelHoursById.get(p.id);
      fromExcelCol += 1;
    } else if (
      (primary.includes("ngắm cảnh") || primary.includes("dạo chơi")) &&
      p.priceForTwo === 0 &&
      !nameKey.includes("chợ đêm") &&
      !nameKey.includes("phố đi bộ")
    ) {
      p.openingHours = "Mở cửa cả ngày (24/7)";
      public247 += 1;
    } else {
      // Remove unverified/guessed openingHours so we NEVER display fabricated hours contradicting Google Maps
      delete p.openingHours;
      clearedUnverified += 1;
    }
  }

  fs.writeFileSync(LOCATIONS_PATH, JSON.stringify(locations, null, 2), "utf8");
  console.log("Verified-only openingHours summary:", {
    total: locations.length,
    verifiedGmaps,
    fromExcelCol,
    fromDesc,
    public247,
    totalWithVerifiedHours: verifiedGmaps + fromExcelCol + fromDesc + public247,
    clearedUnverified,
  });
}

main();

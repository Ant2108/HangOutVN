#!/usr/bin/env node
/**
 * HANGOUT VN — Real Photo Fetcher (Static-Export Safe)
 *
 * 1. Fetches real photography from Wikimedia Commons API for Vietnamese dishes & categories
 *    (replacing any remaining SVG category artwork with real photos).
 * 2. Fetches real OpenGraph (og:image) / YouTube thumbnail photos from verified public
 *    `reviewUrl` links of featured places in src/data/locations.json.
 * 3. Downloads and verifies all images locally under public/images/places/real/
 *    (HTTP 200, valid image content-type, >8 KB) so static export never breaks on hotlinking.
 * 4. Updates src/data/locations.json & src/data/categories.json with the local real photo paths.
 */

import fs from "node:fs";
import path from "node:path";

const LOCATIONS_PATH = path.resolve("src/data/locations.json");
const CATEGORIES_PATH = path.resolve("src/data/categories.json");
const REAL_DIR = path.resolve("public/images/places/real");
const DISHES_DIR = path.resolve("public/images/places/dishes");

fs.mkdirSync(REAL_DIR, { recursive: true });
fs.mkdirSync(DISHES_DIR, { recursive: true });

const UA = "HangoutVN-AssetFetcher/1.0 (+https://hangout-vn.vercel.app)";

function removeTones(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,image/*,*/*;q=0.8",
        ...(options.headers || {}),
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImage(imageUrl, destPath) {
  try {
    const res = await fetchWithTimeout(imageUrl, {}, 10000);
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/") || ct.includes("svg")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000 || buf.length > 6 * 1024 * 1024) return false;
    fs.writeFileSync(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

async function searchWikimediaImage(query) {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: `${query} filetype:bitmap`,
      gsrlimit: "5",
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: "960",
      format: "json",
    });
    const res = await fetchWithTimeout(
      `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
      {},
      9000
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {});
    for (const p of pages) {
      const info = p?.imageinfo?.[0];
      if (!info) continue;
      if (!["image/jpeg", "image/png", "image/webp"].includes(info.mime)) continue;
      if ((info.width || 0) < 500 || (info.height || 0) < 350) continue;
      return info.thumburl || info.url;
    }
  } catch {
    return null;
  }
  return null;
}

async function extractOgImage(pageUrl) {
  try {
    const u = new URL(pageUrl);
    const host = u.hostname.toLowerCase();

    // Public YouTube thumbnail
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const v = u.searchParams.get("v") || (host.includes("youtu.be") ? u.pathname.slice(1) : null);
      if (v) return `https://i.ytimg.com/vi/${v}/hqdefault.jpg`;
      return null;
    }

    // Skip login-walled / anti-bot social platforms
    if (
      host.includes("facebook.com") ||
      host.includes("tiktok.com") ||
      host.includes("threads.net") ||
      host.includes("instagram.com") ||
      host.includes("shopee") ||
      host.includes("booking.com") ||
      host.includes("klook.com")
    ) {
      return null;
    }

    const res = await fetchWithTimeout(pageUrl, {}, 8000);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("text/html")) return null;
    const html = (await res.text()).slice(0, 60000);

    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) {
        const candidate = m[1].replace(/&amp;/g, "&").trim();
        if (candidate.startsWith("http")) return candidate;
        if (candidate.startsWith("//")) return `https:${candidate}`;
        if (candidate.startsWith("/")) return `${u.origin}${candidate}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

const WIKI_QUERIES = [
  // Category replacements (real photos replacing SVGs)
  { key: "date", query: "Saigon rooftop cafe sunset night view Vietnam", out: path.resolve("public/images/places/date.jpg") },
  { key: "chill", query: "Da Lat coffee shop garden Vietnam", out: path.resolve("public/images/places/chill.jpg") },
  { key: "fun", query: "Vietnamese pottery ceramic workshop Bat Trang", out: path.resolve("public/images/places/fun.jpg") },
  { key: "travel", query: "Hoan Kiem Lake Hanoi Vietnam sunset", out: path.resolve("public/images/places/travel.jpg") },

  // Authentic Vietnamese dish photos for smart per-dish matching across all 1,362 places
  { key: "pho", query: "Pho bo Vietnamese beef noodle soup bowl", out: path.join(DISHES_DIR, "pho.jpg") },
  { key: "bun-bo", query: "Bun bo Hue Vietnamese noodle soup", out: path.join(DISHES_DIR, "bun-bo.jpg") },
  { key: "com-tam", query: "Com tam suon bi cha Saigon", out: path.join(DISHES_DIR, "com-tam.jpg") },
  { key: "banh-mi", query: "Banh mi Vietnam sandwich", out: path.join(DISHES_DIR, "banh-mi.jpg") },
  { key: "banh-xeo", query: "Banh xeo Vietnamese crispy pancake", out: path.join(DISHES_DIR, "banh-xeo.jpg") },
  { key: "mi-quang", query: "Mi Quang Da Nang noodle", out: path.join(DISHES_DIR, "mi-quang.jpg") },
  { key: "che", query: "Che Vietnamese sweet dessert soup", out: path.join(DISHES_DIR, "che.jpg") },
  { key: "boba", query: "Bubble tea pearl milk tea cup", out: path.join(DISHES_DIR, "boba.jpg") },
  { key: "bbq", query: "Vietnamese hotpot lau nuong seafood", out: path.join(DISHES_DIR, "bbq.jpg") },
  { key: "ramen", query: "Japanese ramen sushi bowl", out: path.join(DISHES_DIR, "ramen.jpg") },
  { key: "xoi", query: "Xoi xeo Vietnamese sticky rice", out: path.join(DISHES_DIR, "xoi.jpg") },
  { key: "oc", query: "Vietnamese street food snails oc", out: path.join(DISHES_DIR, "oc.jpg") },
];

async function runPool(items, concurrency, fn) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await fn(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  const locations = JSON.parse(fs.readFileSync(LOCATIONS_PATH, "utf8"));
  const categories = JSON.parse(fs.readFileSync(CATEGORIES_PATH, "utf8"));

  console.log("1) Fetching real Wikimedia Commons photography for categories & signature dishes...");
  const availableDishes = new Set();

  await runPool(WIKI_QUERIES, 4, async (item) => {
    const imgUrl = await searchWikimediaImage(item.query);
    if (!imgUrl) {
      console.log(`   [skip] wiki ${item.key} (no match)`);
      return;
    }
    const ok = await downloadImage(imgUrl, item.out);
    if (ok) {
      availableDishes.add(item.key);
      console.log(`   [OK] wiki ${item.key} -> ${path.relative(process.cwd(), item.out)}`);
    } else {
      console.log(`   [fail] wiki ${item.key}`);
    }
  });

  // 2) Fetch real place-specific photos from ALL featured places with reviewUrls
  const featuredCandidates = locations.filter((p) => p.featured && p.reviewUrl);
  console.log(`\n2) Fetching real place-specific photos from ${featuredCandidates.length} featured places...`);
  const placeSpecificPhotos = new Map();

  await runPool(featuredCandidates, 10, async (place) => {
    const dest = path.join(REAL_DIR, `${place.id}.jpg`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 8000) {
      placeSpecificPhotos.set(place.id, `/images/places/real/${place.id}.jpg`);
      return;
    }
    const ogUrl = await extractOgImage(place.reviewUrl);
    if (!ogUrl) return;
    const ok = await downloadImage(ogUrl, dest);
    if (ok) {
      placeSpecificPhotos.set(place.id, `/images/places/real/${place.id}.jpg`);
      console.log(`   [OK] ${place.id} ${place.name} (${place.province})`);
    }
  });

  // Also fetch Wikimedia Commons real photos for iconic Vietnamese landmarks in featured list that didn't get og:image
  const iconicLandmarks = locations.filter(
    (p) =>
      p.featured &&
      !placeSpecificPhotos.has(p.id) &&
      (p.category.includes("travel") || p.primaryType?.includes("Ngắm cảnh") || p.primaryType?.includes("Dạo chơi"))
  ).slice(0, 24);

  console.log(`\n3) Fetching Wikimedia Commons photos for ${iconicLandmarks.length} scenic/landmark spots...`);
  await runPool(iconicLandmarks, 4, async (place) => {
    const dest = path.join(REAL_DIR, `${place.id}.jpg`);
    const imgUrl = await searchWikimediaImage(`${place.name} ${place.province} Vietnam`);
    if (!imgUrl) return;
    const ok = await downloadImage(imgUrl, dest);
    if (ok) {
      placeSpecificPhotos.set(place.id, `/images/places/real/${place.id}.jpg`);
      console.log(`   [OK] landmark ${place.id} ${place.name}`);
    }
  });

  // 4) Assign real photos to all 1,362 locations
  const pickRealPhoto = (place) => {
    if (placeSpecificPhotos.has(place.id)) {
      return placeSpecificPhotos.get(place.id);
    }
    const text = removeTones(`${place.name} ${place.subTag || ""} ${place.primaryType || ""}`);
    if (availableDishes.has("pho") && text.includes("pho ")) return "/images/places/dishes/pho.jpg";
    if (availableDishes.has("bun-bo") && (text.includes("bun bo") || text.includes("bun rieu") || text.includes("bun mam") || text.includes("bun "))) return "/images/places/dishes/bun-bo.jpg";
    if (availableDishes.has("com-tam") && (text.includes("com tam") || text.includes("com ga") || text.includes("com nieu") || text.includes("com "))) return "/images/places/dishes/com-tam.jpg";
    if (availableDishes.has("banh-mi") && (text.includes("banh mi") || text.includes("banh my"))) return "/images/places/dishes/banh-mi.jpg";
    if (availableDishes.has("banh-xeo") && (text.includes("banh xeo") || text.includes("banh cuon") || text.includes("banh beo"))) return "/images/places/dishes/banh-xeo.jpg";
    if (availableDishes.has("mi-quang") && (text.includes("mi quang") || text.includes("my quang") || text.includes("cao lau") || text.includes("hu tieu"))) return "/images/places/dishes/mi-quang.jpg";
    if (availableDishes.has("che") && (text.includes("che ") || text.includes("kem ") || text.includes("tau hu") || text.includes("flan"))) return "/images/places/dishes/che.jpg";
    if (availableDishes.has("boba") && (text.includes("tra sua") || text.includes("matcha") || text.includes("boba"))) return "/images/places/dishes/boba.jpg";
    if (availableDishes.has("bbq") && (text.includes("lau") || text.includes("nuong") || text.includes("bbq") || text.includes("buffet"))) return "/images/places/dishes/bbq.jpg";
    if (availableDishes.has("ramen") && (text.includes("ramen") || text.includes("sushi") || text.includes("nhat") || text.includes("han"))) return "/images/places/dishes/ramen.jpg";
    if (availableDishes.has("xoi") && text.includes("xoi")) return "/images/places/dishes/xoi.jpg";
    if (availableDishes.has("oc") && (text.includes("oc ") || text.includes("hai san"))) return "/images/places/dishes/oc.jpg";

    // Category real photos
    if (place.category.includes("coffee") || removeTones(place.primaryType).includes("ca phe")) {
      return "/images/places/coffee.jpg";
    }
    if (place.category.includes("fun") && availableDishes.has("fun")) {
      return "/images/places/fun.jpg";
    }
    if (place.category.includes("travel") && availableDishes.has("travel")) {
      return "/images/places/travel.jpg";
    }
    if (place.category.includes("date") && availableDishes.has("date")) {
      return "/images/places/date.jpg";
    }
    if (place.category.includes("chill") && availableDishes.has("chill")) {
      return "/images/places/chill.jpg";
    }
    if (text.includes("banh trang") || text.includes("an vat") || text.includes("ca vien")) {
      return "/images/places/streetfood.jpg";
    }
    return "/images/places/food.jpg";
  };

  // Ensure all 6 categories have real photography (no SVG fallbacks remaining)
  const fallbackCopies = [
    { key: "date", from: path.join(REAL_DIR, "dd0052.jpg"), to: path.resolve("public/images/places/date.jpg") },
    { key: "chill", from: path.join(REAL_DIR, "dd0086.jpg"), to: path.resolve("public/images/places/chill.jpg") },
    { key: "fun", from: path.join(REAL_DIR, "dd0084.jpg"), to: path.resolve("public/images/places/fun.jpg") },
  ];
  for (const fc of fallbackCopies) {
    if (!availableDishes.has(fc.key) && fs.existsSync(fc.from)) {
      fs.copyFileSync(fc.from, fc.to);
      availableDishes.add(fc.key);
    }
  }

  let specificCount = 0;
  for (const place of locations) {
    const photo = pickRealPhoto(place);
    if (placeSpecificPhotos.has(place.id)) specificCount++;
    place.images = [photo];
  }

  for (const cat of categories) {
    if (availableDishes.has(cat.id)) {
      cat.image = `/images/places/${cat.id}.jpg`;
    }
  }

  fs.writeFileSync(LOCATIONS_PATH, JSON.stringify(locations, null, 2), "utf8");
  fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2), "utf8");

  console.log(`\nDONE! Specific real place photos downloaded: ${specificCount}`);
  console.log(`Category & dish real photos downloaded: ${availableDishes.size}`);
}

main();

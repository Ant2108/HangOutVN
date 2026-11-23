import type {
  ActivityType,
  CompanionType,
  Place,
  RecommendationInput,
  RecommendationResult,
} from "./types";
import {
  BUDGET_OPTIONS,
  getPlaceOpenStatus,
  getPricePerPerson,
  matchesBudgetBucket,
} from "./utils";

const ACTIVITY_TO_CATEGORY: Record<Exclude<ActivityType, "any">, string> = {
  eating: "food",
  coffee: "coffee",
  entertainment: "fun",
  chill: "chill",
  date: "date",
};

const COMPANION_LABELS: Record<CompanionType, string> = {
  any: "ai cũng hợp",
  lover: "người yêu",
  friends: "hội bạn thân",
  family: "gia đình",
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  any: "mọi hoạt động",
  eating: "ăn uống & ăn vặt",
  coffee: "cà phê & trà sữa",
  entertainment: "vui chơi & workshop",
  chill: "chill & thư giãn",
  date: "hẹn hò lãng mạn",
};

function matchesCompanion(place: Place, companion: CompanionType): boolean {
  if (companion === "any") return true;
  if (companion === "lover") {
    return (
      place.category.includes("date") ||
      place.category.includes("coffee") ||
      place.category.includes("chill") ||
      place.vibe.some((v) => ["Lãng mạn", "View đẹp", "Chill", "Check-in", "Sáng tạo"].includes(v))
    );
  }
  if (companion === "friends") {
    return (
      place.category.includes("food") ||
      place.category.includes("fun") ||
      place.category.includes("coffee") ||
      place.vibe.some((v) => ["Đường phố", "Sôi động", "Sáng tạo", "Chill", "Đêm muộn"].includes(v))
    );
  }
  if (companion === "family") {
    return (
      place.category.includes("food") ||
      place.category.includes("travel") ||
      place.category.includes("chill") ||
      place.vibe.some((v) => ["Xanh mát", "Bản địa", "View đẹp", "Miễn phí"].includes(v))
    );
  }
  return true;
}

export function getMatchingRecommendationPool(
  places: Place[],
  input: RecommendationInput,
  now?: Date | null
): Place[] {
  const refTime = now === undefined ? new Date() : now;
  return places.filter((place) => {
    if (input.onlyOpenNow && refTime) {
      const status = getPlaceOpenStatus(place.openingHours, refTime);
      // Exclude places confirmed closed on Google Maps right now
      if (status !== null && !status.isOpen) return false;
    }
    if (input.province !== "all" && place.province !== input.province) {
      return false;
    }
    if (input.district !== "all" && place.district !== input.district) {
      return false;
    }
    if (!matchesBudgetBucket(getPricePerPerson(place), input.budget)) {
      return false;
    }
    if (input.activity !== "any") {
      const targetCat = ACTIVITY_TO_CATEGORY[input.activity];
      if (!place.category.includes(targetCat as Place["category"][number])) {
        return false;
      }
    }
    if (input.vibe !== "all" && !place.vibe.includes(input.vibe)) {
      return false;
    }
    if (!matchesCompanion(place, input.companion)) {
      return false;
    }
    return true;
  });
}

export function buildRecommendationResult(
  chosen: Place,
  input: RecommendationInput,
  matchCount: number,
  now?: Date | null
): RecommendationResult {
  const refTime = now === undefined ? new Date() : now;
  const reasons: string[] = [];
  const openStatus = refTime ? getPlaceOpenStatus(chosen.openingHours, refTime) : null;
  if (openStatus && openStatus.isOpen) {
    reasons.push(
      `Đang mở cửa theo Google Maps (${openStatus.detail.toLowerCase()})`
    );
  }
  if (input.province !== "all") {
    reasons.push(`Nằm ngay tại ${chosen.province}${chosen.district ? ` (${chosen.district})` : ""}`);
  } else {
    reasons.push(`Tọa độ nổi bật tại ${chosen.province}`);
  }

  if (input.budget !== "all") {
    const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === input.budget)?.label;
    if (budgetLabel) reasons.push(`Khớp ngân sách ${budgetLabel.toLowerCase()}`);
  } else if (chosen.priceForTwo === 0) {
    reasons.push("Trải nghiệm hoàn toàn miễn phí vé vào cổng");
  }

  if (input.activity !== "any") {
    reasons.push(`Chuẩn gu ${ACTIVITY_LABELS[input.activity]}`);
  }

  if (input.companion !== "any") {
    reasons.push(`Rất hợp đi cùng ${COMPANION_LABELS[input.companion]}`);
  }

  if (input.vibe !== "all") {
    reasons.push(`Đúng vibe "${input.vibe}" bạn đang tìm`);
  } else if (chosen.vibe.length > 0) {
    reasons.push(`Không khí nổi bật: ${chosen.vibe.slice(0, 2).join(" · ")}`);
  }

  return {
    place: chosen,
    reasons,
    matchCount,
  };
}

export function pickRandomRecommendation(
  places: Place[],
  input: RecommendationInput,
  excludeId?: string,
  now?: Date
): RecommendationResult | null {
  const refTime = now ?? new Date();
  const pool = getMatchingRecommendationPool(places, input, refTime);
  if (pool.length === 0) return null;

  const baseCandidates =
    pool.length > 1 && excludeId ? pool.filter((p) => p.id !== excludeId) : pool;

  // When filtering open places, prefer venues verified open on Google Maps if available
  let candidates = baseCandidates;
  if (input.onlyOpenNow) {
    const confirmedOpen = baseCandidates.filter((p) => {
      const st = getPlaceOpenStatus(p.openingHours, refTime);
      return st !== null && st.isOpen;
    });
    if (confirmedOpen.length > 0) {
      candidates = confirmedOpen;
    }
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return buildRecommendationResult(chosen, input, pool.length, refTime);
}

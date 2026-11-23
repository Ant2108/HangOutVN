"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coffee,
  Dices,
  Heart,
  MapPin,
  PartyPopper,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trees,
  Users,
  Utensils,
} from "lucide-react";
import type {
  ActivityType,
  BudgetBucket,
  CompanionType,
  Place,
  Province,
  RecommendationInput,
} from "@/lib/types";
import {
  buildRecommendationResult,
  getMatchingRecommendationPool,
  pickRandomRecommendation,
} from "@/lib/recommender";
import {
  BUDGET_OPTIONS,
  CATEGORY_LABELS,
  cn,
  formatPricePerPerson,
  getPlaceOpenStatus,
  getPricePerPerson,
} from "@/lib/utils";
import {
  readPersistedState,
  useIsClient,
  usePersistedFilterStore,
  useScrollPreservation,
} from "@/lib/filterPersistence";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { GoogleMapsActions } from "@/components/places/GoogleMapsActions";
import { MenuViewer } from "@/components/places/MenuViewer";

const RANDOM_STORAGE_KEY = "hangout:random:v1";

interface RandomizerClientProps {
  places: Place[];
  provinces: Province[];
  vibes: string[];
}

const COMPANIONS: { value: CompanionType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "any", label: "Bất kỳ", icon: Sparkles },
  { value: "lover", label: "Người yêu", icon: Heart },
  { value: "friends", label: "Hội bạn", icon: Users },
  { value: "family", label: "Gia đình", icon: Users },
];

const ACTIVITIES: { value: ActivityType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "any", label: "Gì cũng được", icon: Sparkles },
  { value: "eating", label: "Ăn uống", icon: Utensils },
  { value: "coffee", label: "Cà phê", icon: Coffee },
  { value: "date", label: "Hẹn hò", icon: Heart },
  { value: "chill", label: "Chill", icon: Trees },
  { value: "entertainment", label: "Vui chơi", icon: PartyPopper },
];

const INITIAL_INPUT: RecommendationInput = {
  province: "all",
  district: "all",
  budget: "all",
  companion: "any",
  activity: "any",
  vibe: "all",
  onlyOpenNow: true,
};

interface PersistedRandomState {
  input: RecommendationInput;
  resultPlaceId: string | null;
  hasSearched: boolean;
}

const SERVER_DEFAULT_RANDOM: PersistedRandomState = {
  input: INITIAL_INPUT,
  resultPlaceId: null,
  hasSearched: false,
};

function serializeRandomToParams(state: PersistedRandomState): URLSearchParams {
  const params = new URLSearchParams();
  const { input, resultPlaceId } = state;
  if (input.province !== "all") params.set("province", input.province);
  if (input.province !== "all" && input.district !== "all") {
    params.set("district", input.district);
  }
  if (input.budget !== "all") params.set("budget", input.budget);
  if (input.companion !== "any") params.set("companion", input.companion);
  if (input.activity !== "any") params.set("activity", input.activity);
  if (input.vibe !== "all") params.set("vibe", input.vibe);
  if (input.onlyOpenNow === false) params.set("open", "0");
  if (resultPlaceId) params.set("pick", resultPlaceId);
  return params;
}

export function RandomizerClient({
  places,
  provinces,
  vibes,
}: RandomizerClientProps) {
  const isClient = useIsClient();

  const resolveClientState = useCallback((): PersistedRandomState => {
    const saved = readPersistedState<PersistedRandomState>(RANDOM_STORAGE_KEY);
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

    const hasUrlFilter = [
      "province",
      "district",
      "budget",
      "companion",
      "activity",
      "vibe",
      "open",
      "pick",
    ].some((k) => params.has(k));

    if (hasUrlFilter) {
      const prov = params.get("province") || "all";
      const validProv = provinces.some((p) => p.name === prov) ? prov : "all";
      const budget = (params.get("budget") as BudgetBucket | null) || "all";
      const comp = (params.get("companion") as CompanionType | null) || "any";
      const act = (params.get("activity") as ActivityType | null) || "any";
      const vibe = params.get("vibe") || "all";
      const pick = params.get("pick");
      const validPick = pick && places.some((p) => p.id === pick) ? pick : null;

      return {
        input: {
          province: validProv,
          district: validProv !== "all" ? params.get("district") || "all" : "all",
          budget: BUDGET_OPTIONS.some((b) => b.value === budget) ? budget : "all",
          companion: COMPANIONS.some((c) => c.value === comp) ? comp : "any",
          activity: ACTIVITIES.some((a) => a.value === act) ? act : "any",
          vibe: vibes.includes(vibe) ? vibe : "all",
          onlyOpenNow: params.get("open") !== "0",
        },
        resultPlaceId: validPick,
        hasSearched: Boolean(validPick),
      };
    }

    if (saved && saved.input) {
      const validProv = provinces.some((p) => p.name === saved.input.province)
        ? saved.input.province
        : "all";
      const validPick =
        saved.resultPlaceId && places.some((p) => p.id === saved.resultPlaceId)
          ? saved.resultPlaceId
          : null;
      return {
        input: {
          ...INITIAL_INPUT,
          ...saved.input,
          province: validProv,
          district: validProv !== "all" ? saved.input.district || "all" : "all",
          budget: BUDGET_OPTIONS.some((b) => b.value === saved.input.budget)
            ? saved.input.budget
            : "all",
          companion: COMPANIONS.some((c) => c.value === saved.input.companion)
            ? saved.input.companion
            : "any",
          activity: ACTIVITIES.some((a) => a.value === saved.input.activity)
            ? saved.input.activity
            : "any",
          vibe: vibes.includes(saved.input.vibe) ? saved.input.vibe : "all",
        },
        resultPlaceId: validPick,
        hasSearched: Boolean(saved.hasSearched || validPick),
      };
    }

    return SERVER_DEFAULT_RANDOM;
  }, [places, provinces, vibes]);

  const [randomState, setRandomState, resetRandomState] =
    usePersistedFilterStore<PersistedRandomState>({
      storageKey: RANDOM_STORAGE_KEY,
      urlKey: "",
      serverDefault: SERVER_DEFAULT_RANDOM,
      resolveClientState,
      serializeToUrlParams: serializeRandomToParams,
    });

  useScrollPreservation(RANDOM_STORAGE_KEY, isClient);

  const { input, resultPlaceId, hasSearched } = randomState;
  const [isSpinning, setIsSpinning] = useState(false);
  const [rollingName, setRollingName] = useState<string>("");
  const timerRef = useRef<number | null>(null);

  const updateInput = (updater: (prev: RecommendationInput) => RecommendationInput) => {
    setRandomState((prev) => ({
      ...prev,
      input: updater(prev.input),
    }));
  };

  const districtsForProvince = useMemo(() => {
    if (input.province === "all") return [];
    const counts = new Map<string, number>();
    for (const p of places) {
      if (p.province === input.province && p.district) {
        counts.set(p.district, (counts.get(p.district) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [places, input.province]);

  const matchingPool = useMemo(
    () => getMatchingRecommendationPool(places, input, isClient ? new Date() : null),
    [places, input, isClient]
  );

  const result = useMemo(() => {
    if (!resultPlaceId) return null;
    const found = places.find((p) => p.id === resultPlaceId);
    if (!found) return null;
    return buildRecommendationResult(
      found,
      input,
      matchingPool.length,
      isClient ? new Date() : null
    );
  }, [resultPlaceId, places, input, matchingPool.length, isClient]);

  const handleGenerate = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (matchingPool.length === 0) {
      setRandomState((prev) => ({ ...prev, resultPlaceId: null, hasSearched: true }));
      setIsSpinning(false);
      return;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      const picked = pickRandomRecommendation(places, input, resultPlaceId || undefined);
      setRandomState((prev) => ({
        ...prev,
        resultPlaceId: picked?.place.id ?? null,
        hasSearched: true,
      }));
      return;
    }

    setIsSpinning(true);
    let ticks = 0;
    const totalTicks = 12;

    timerRef.current = window.setInterval(() => {
      ticks += 1;
      const preview = matchingPool[Math.floor(Math.random() * matchingPool.length)];
      setRollingName(preview.name);

      if (ticks >= totalTicks) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        const picked = pickRandomRecommendation(places, input, resultPlaceId || undefined);
        setRandomState((prev) => ({
          ...prev,
          resultPlaceId: picked?.place.id ?? null,
          hasSearched: true,
        }));
        setIsSpinning(false);
      }
    }, 65);
  };

  const resetAll = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsSpinning(false);
    resetRandomState(SERVER_DEFAULT_RANDOM);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#242424]/15 bg-[#FFD166] px-4 py-1.5 font-display text-xs font-extrabold uppercase tracking-wider text-[#242424]">
          <Dices className="h-3.5 w-3.5" aria-hidden="true" />
          Chốt kèo trong 1 giây
        </span>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-[#242424] sm:text-6xl">
          Đi đâu hôm nay?
        </h1>
        <p className="mt-3 text-sm text-[#5C564F] sm:text-base">
          Chọn đúng nhu cầu của bạn bên dưới — HANGOUT VN sẽ lọc từ dữ liệu thật
          và chọn ngẫu nhiên một địa điểm khớp 100% tiêu chí.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        {/* Left Controls Panel */}
        <div className="rounded-[26px] border border-[#242424]/14 bg-white p-6 sm:p-8 lg:col-span-5">
          <div className="space-y-6">
            {/* Province */}
            <div>
              <label
                htmlFor="random-province"
                className="mb-2 block font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]"
              >
                1. Tỉnh / Thành phố
              </label>
              <Select
                id="random-province"
                value={input.province}
                onChange={(e) =>
                  updateInput((p) => ({ ...p, province: e.target.value, district: "all" }))
                }
              >
                <option value="all">Toàn quốc (34 tỉnh/thành)</option>
                {provinces.map((prov) => (
                  <option key={prov.slug} value={prov.name}>
                    {prov.name} ({prov.placeCount})
                  </option>
                ))}
              </Select>
            </div>

            {/* District (optional when a province has multiple districts) */}
            {districtsForProvince.length > 1 && (
              <div>
                <label
                  htmlFor="random-district"
                  className="mb-2 block font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]"
                >
                  Quận / Huyện / Khu vực ({districtsForProvince.length})
                </label>
                <Select
                  id="random-district"
                  value={input.district}
                  onChange={(e) => updateInput((p) => ({ ...p, district: e.target.value }))}
                >
                  <option value="all">Tất cả quận tại {input.province}</option>
                  {districtsForProvince.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.count})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Budget */}
            <div>
              <label
                htmlFor="random-budget"
                className="mb-2 block font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]"
              >
                2. Ngân sách dự kiến (1 người)
              </label>
              <Select
                id="random-budget"
                value={input.budget}
                onChange={(e) =>
                  updateInput((p) => ({ ...p, budget: e.target.value as BudgetBucket }))
                }
              >
                {BUDGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Companion */}
            <div>
              <p className="mb-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                3. Bạn đi cùng ai?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {COMPANIONS.map((c) => {
                  const Icon = c.icon;
                  const active = input.companion === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateInput((p) => ({ ...p, companion: c.value }))}
                      className={cn(
                        "flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold cursor-pointer transition-all",
                        active
                          ? "border-[#242424] bg-[#FFB4C2] text-[#242424]"
                          : "border-[#242424]/14 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Activity */}
            <div>
              <p className="mb-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]">
                4. Hoạt động mong muốn
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACTIVITIES.map((a) => {
                  const Icon = a.icon;
                  const active = input.activity === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => updateInput((p) => ({ ...p, activity: a.value }))}
                      className={cn(
                        "flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold cursor-pointer transition-all",
                        active
                          ? "border-[#242424] bg-[#FFD166] text-[#242424]"
                          : "border-[#242424]/14 bg-[#FFF8ED] text-[#242424] hover:bg-[#F6EBD8]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferred Vibe */}
            <div>
              <label
                htmlFor="random-vibe"
                className="mb-2 block font-display text-xs font-bold uppercase tracking-wider text-[#5C564F]"
              >
                5. Vibe yêu thích
              </label>
              <Select
                id="random-vibe"
                value={input.vibe}
                onChange={(e) => updateInput((p) => ({ ...p, vibe: e.target.value }))}
              >
                <option value="all">Mọi vibe</option>
                {vibes.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>

            {/* Open Hours Filter Toggle */}
            <div>
              <button
                type="button"
                onClick={() =>
                  updateInput((p) => ({ ...p, onlyOpenNow: !p.onlyOpenNow }))
                }
                aria-pressed={Boolean(input.onlyOpenNow)}
                className={cn(
                  "flex min-h-[44px] w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-left text-xs font-bold cursor-pointer transition-all",
                  input.onlyOpenNow
                    ? "border-[#1E5631]/40 bg-[#B7E4C7]/65 text-[#1E5631]"
                    : "border-[#242424]/14 bg-[#FFF8ED] text-[#5C564F] hover:bg-[#F6EBD8]"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {input.onlyOpenNow
                      ? "Đang lọc: Không gợi ý quán đã đóng cửa"
                      : "Đang bật cả quán đã đóng cửa (xem cho ngày mai)"}
                  </span>
                </span>
                <span
                  className={cn(
                    "ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                    input.onlyOpenNow
                      ? "bg-[#1E5631] text-[#FFF8ED]"
                      : "bg-[#242424]/12 text-[#242424]"
                  )}
                >
                  {input.onlyOpenNow ? "Bật" : "Tắt"}
                </span>
              </button>
            </div>

            {/* Live Pool Indicator + Action */}
            <div className="border-t border-[#242424]/10 pt-5">
              <p className="mb-3 text-center text-xs font-semibold text-[#5C564F]">
                Hiện có{" "}
                <strong className="font-display text-sm font-extrabold text-[#D84B20]">
                  {matchingPool.length.toLocaleString("vi-VN")}
                </strong>{" "}
                địa điểm phù hợp với lựa chọn của bạn
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isSpinning}
                  className="flex-1"
                >
                  <Dices
                    className={cn("h-4 w-4", isSpinning && "animate-spin")}
                    aria-hidden="true"
                  />
                  {isSpinning ? "Đang chọn kèo..." : result ? "Đổi gợi ý khác" : "Gợi ý cho tôi"}
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  size="icon"
                  onClick={resetAll}
                  aria-label="Đặt lại lựa chọn"
                  className="h-13 w-13"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Result Stage */}
        <div className="flex flex-col lg:col-span-7">
          <div className="flex flex-1 flex-col justify-center rounded-[26px] border border-[#242424]/14 bg-[#F6EBD8]/65 p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {isSpinning ? (
                <motion.div
                  key="spinning"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF7043] text-[#242424] shadow-lg">
                    <RefreshCw className="h-7 w-7 animate-spin" aria-hidden="true" />
                  </div>
                  <p className="mt-5 font-display text-xs font-bold uppercase tracking-[0.18em] text-[#5C564F]">
                    Đang quay số từ {matchingPool.length} địa điểm...
                  </p>
                  <p className="mt-2 font-display text-2xl font-extrabold text-[#242424] sm:text-3xl">
                    {rollingName || "..."}
                  </p>
                </motion.div>
              ) : result ? (
                <motion.div
                  key={result.place.id}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden rounded-[22px] border border-[#242424]/14 bg-white shadow-sm"
                >
                  <div className="relative aspect-[16/9] w-full bg-[#F6EBD8]">
                    {(() => {
                      const st = isClient
                        ? getPlaceOpenStatus(result.place.openingHours, new Date())
                        : null;
                      return (
                        <>
                          <Image
                            src={result.place.images[0] || "/images/places/food.jpg"}
                            alt={result.place.name}
                            fill
                            sizes="(max-width: 1024px) 100vw, 600px"
                            className={cn(
                              "object-cover transition-all",
                              st && !st.isOpen && "grayscale-[82%] contrast-90"
                            )}
                          />
                          <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                            <span className="rounded-full bg-[#FFD166] px-3.5 py-1 font-display text-xs font-extrabold text-[#242424] shadow-sm">
                              Kèo chốt cho bạn!
                            </span>
                            {st && (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-xs font-extrabold shadow-sm",
                                  !st.isOpen
                                    ? "border-[#242424]/20 bg-[#242424]/90 text-[#FFF8ED]"
                                    : st.isClosingSoon
                                      ? "border-[#242424]/15 bg-[#FFD166] text-[#242424]"
                                      : "border-[#1E5631]/25 bg-[#B7E4C7] text-[#1E5631]"
                                )}
                              >
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                {st.label} · {st.detail}
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                    <span className="absolute bottom-4 left-4 rounded-full bg-[#242424]/85 px-3 py-1 text-xs font-semibold text-[#FFF8ED]">
                      {formatPricePerPerson(getPricePerPerson(result.place))}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {result.place.category.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-lg bg-[#FFF8ED] border border-[#242424]/12 px-2.5 py-0.5 text-xs font-bold text-[#242424]"
                        >
                          {CATEGORY_LABELS[cat]}
                        </span>
                      ))}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5C564F]">
                        <MapPin className="h-3.5 w-3.5 text-[#D84B20]" aria-hidden="true" />
                        {result.place.province}
                        {result.place.district && result.place.district !== result.place.province
                          ? ` · ${result.place.district}`
                          : ""}
                      </span>
                    </div>

                    <h2 className="mt-3 font-display text-2xl font-extrabold text-[#242424] sm:text-3xl">
                      {result.place.name}
                    </h2>

                    <p className="mt-2 text-sm leading-relaxed text-[#5C564F]">
                      {result.place.description || result.place.address}
                    </p>

                    {/* Match Reasons */}
                    <div className="mt-5 rounded-2xl border border-[#B7E4C7] bg-[#B7E4C7]/25 p-4">
                      <p className="font-display text-xs font-extrabold uppercase tracking-wider text-[#1E5631]">
                        Vì sao địa điểm này hợp với bạn
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {result.reasons.map((reason, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs font-medium text-[#242424] sm:text-sm"
                          >
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#1E5631]"
                              aria-hidden="true"
                            />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/places/${result.place.id}`}
                        className="inline-flex h-11 items-center gap-2 rounded-full bg-[#242424] px-5 font-display text-xs font-bold text-[#FFF8ED] transition-colors hover:bg-[#383532]"
                      >
                        Xem chi tiết địa điểm
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      {result.place.menuUrl && (
                        <MenuViewer
                          placeName={result.place.name}
                          menuUrl={result.place.menuUrl}
                          variant="card"
                          className="h-11 px-4"
                        />
                      )}
                      <GoogleMapsActions place={result.place} size="md" />
                    </div>
                  </div>
                </motion.div>
              ) : hasSearched && matchingPool.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center rounded-[22px] border border-[#242424]/12 bg-white px-6 py-16 text-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFB4C2]/45 text-[#242424]">
                    <Dices className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-extrabold text-[#242424]">
                    Không có địa điểm nào khớp toàn bộ tiêu chí này
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-[#5C564F]">
                    {input.onlyOpenNow
                      ? "Hiện tại đã khuya hoặc các quán thuộc bộ lọc này đã đóng cửa. Bạn có thể bật xem cả các quán đã đóng cửa để lên lịch cho ngày mai, hoặc mở rộng bộ lọc nhé!"
                      : "HANGOUT VN chỉ gợi ý từ dữ liệu thật và không tự bịa quán. Bạn hãy thử mở rộng mức ngân sách hoặc đổi Vibe về \u201cMọi vibe\u201d nhé!"}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {input.onlyOpenNow && (
                      <Button
                        type="button"
                        variant="dark"
                        onClick={() =>
                          updateInput((p) => ({ ...p, onlyOpenNow: false }))
                        }
                      >
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        Xem cả quán đã đóng cửa (cho ngày mai)
                      </Button>
                    )}
                    <Button type="button" onClick={resetAll}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Đặt lại tiêu chí
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#242424]/15 bg-[#FFD166] text-[#242424]">
                    <Dices className="h-9 w-9" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-extrabold text-[#242424]">
                    Sẵn sàng chốt kèo chưa?
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-[#5C564F]">
                    Chỉnh bộ lọc bên trái theo ý bạn rồi bấm{" "}
                    <strong className="text-[#242424]">&ldquo;Gợi ý cho tôi&rdquo;</strong> để
                    nhận một tọa độ thật kèm lý do khớp gu và nút mở Google Maps ngay.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

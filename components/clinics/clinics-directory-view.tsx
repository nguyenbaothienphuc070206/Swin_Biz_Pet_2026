"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MapPin, Star, Sparkles } from "lucide-react";
import {
  ClinicDetail,
  FEATURED_SERVICES,
} from "@/modules/clinics/mock-clinics";
import { rankByRating } from "@/modules/clinics/ranking";
import {
  localizeClinic,
  localizeClinicSpecialty,
} from "@/modules/i18n/localize-data";

export function ClinicsDirectoryView({
  initialClinics,
  locale,
}: {
  initialClinics: ClinicDetail[];
  locale: string;
}) {
  const isEn = locale === "en";

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>("all");
  const [selectedMinRating, setSelectedMinRating] = useState<number>(0);

  // Ranking Mode: "rating" | "distance" | "filter_match" | "all_sections"
  const [rankingMode, setRankingMode] = useState<
    "rating" | "distance" | "filter_match" | "all_sections"
  >("rating");

  // Toggle service selection
  const handleToggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      const exists = prev.includes(serviceId);
      return exists
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
    });
  };

  const clearFilters = () => {
    setSelectedServices([]);
    setSelectedFacilityType("all");
    setSelectedMinRating(0);
    setSearchQuery("");
  };

  // Dynamically normalize all clinics according to active locale
  const normalizedClinics = useMemo(() => {
    return initialClinics.map((c) => localizeClinic(c, isEn));
  }, [initialClinics, isEn]);

  // Base filtered list
  const baseClinics = useMemo(() => {
    return normalizedClinics.filter((clinic) => {
      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = clinic.name.toLowerCase().includes(q);
        const matchAddress = clinic.address.toLowerCase().includes(q);
        const matchDistrict = clinic.district.toLowerCase().includes(q);
        const matchSpec = clinic.specialties.some((s) =>
          s.toLowerCase().includes(q)
        );
        if (!matchName && !matchAddress && !matchDistrict && !matchSpec) {
          return false;
        }
      }

      // Facility Type filter
      if (selectedFacilityType !== "all") {
        if (selectedFacilityType === "clinic") {
          if (clinic.facilityType !== "clinic" && clinic.facilityType !== "hospital") return false;
        }
        if (selectedFacilityType === "spa") {
          if (clinic.facilityType !== "spa") return false;
        }
        if (selectedFacilityType === "shop") {
          if (clinic.facilityType !== "shop") return false;
        }
      }

      // Minimum Star Rating filter
      if (selectedMinRating > 0 && clinic.rating < selectedMinRating) {
        return false;
      }

      // If user selected specific services, require at least 1 match
      if (selectedServices.length > 0) {
        const clinicServices = clinic.featuredServices || [];
        const matchesCount = selectedServices.filter((s) =>
          clinicServices.includes(s)
        ).length;
        if (matchesCount === 0) return false;
      }

      return true;
    });
  }, [normalizedClinics, searchQuery, selectedFacilityType, selectedMinRating, selectedServices]);

  // Compute matched services count
  const getMatchScore = (clinic: ClinicDetail) => {
    if (selectedServices.length === 0) return 0;
    const clinicServices = clinic.featuredServices || [];
    return selectedServices.filter((s) => clinicServices.includes(s)).length;
  };

  // 1. Ranked by Ratings (Top Rated first, tie-break by review count, then distance)
  const rankedByRating = useMemo(() => {
    return rankByRating(baseClinics);
  }, [baseClinics]);

  // 2. Ranked by Distance (Nearest first)
  const rankedByDistance = useMemo(() => {
    return [...baseClinics].sort((a, b) => {
      const distA = a.distanceKm ?? 999;
      const distB = b.distanceKm ?? 999;
      return distA - distB;
    });
  }, [baseClinics]);

  // 3. Ranked by Filter Match Score
  const rankedByFilterMatch = useMemo(() => {
    return [...baseClinics].sort((a, b) => {
      const matchA = getMatchScore(a);
      const matchB = getMatchScore(b);
      if (matchB !== matchA) return matchB - matchA;
      return b.rating - a.rating;
    });
  }, [baseClinics, selectedServices]);

  // Current display list according to active ranking mode
  const currentDisplayList = useMemo(() => {
    switch (rankingMode) {
      case "rating":
        return rankedByRating;
      case "filter_match":
        return rankedByFilterMatch;
      case "distance":
        return rankedByDistance;
      default:
        return rankedByRating;
    }
  }, [rankingMode, rankedByRating, rankedByDistance, rankedByFilterMatch]);

  return (
    <div className="space-y-6">
      {/* Page Header (Đậm rõ ràng dễ nhìn trên theme trắng) */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 border-2 border-primary/30 px-3.5 py-1 text-xs font-black text-primary shadow-xs">
            {isEn
              ? "PawCare Veterinary, Spa & Pet Store Network"
              : "Mạng lưới Thú Y, Spa & Pet Shop PawCare"}
          </span>
        </div>

        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
          {isEn ? "Find Clinics / Spas / Shops" : "Tìm phòng khám/spa/shop"}
        </h1>

        <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-muted-foreground">
          {isEn
            ? "Discover veterinary clinics, grooming spas, and pet supply shops nearby with transparent pricing and direct booking."
            : "Tìm kiếm và kết nối các phòng khám thú y, pet spa làm đẹp và cửa hàng phụ kiện thú cưng uy tín theo dịch vụ và khoảng cách gần nhất."}
        </p>
      </div>

      {/* SEARCH AND FACILITY TYPE FILTER */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? "Search by name, address, or district (e.g. PetCare, Thao Dien, Pet Mart)..."
                : "Tìm theo tên cơ sở, địa chỉ, hoặc quận huyện (VD: PetCare, Thảo Điền, Pet Mart)..."
            }
            className="w-full rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground shadow-2xs focus:border-primary focus:outline-hidden font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full size-5 grid place-items-center bg-muted text-muted-foreground hover:text-foreground text-xs font-bold leading-none cursor-pointer"
              title={isEn ? "Clear search" : "Xóa tìm kiếm"}
            >
              ×
            </button>
          )}
        </div>

        {/* Facility Category Pill Toggle (Đậm nét, dễ nhìn) */}
        <div className="flex items-center gap-1.5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-card p-1 text-xs font-black shrink-0 w-full sm:w-auto overflow-x-auto shadow-xs">
          <button
            type="button"
            onClick={() => setSelectedFacilityType("all")}
            className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 ${
              selectedFacilityType === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-950 dark:border-white shadow-xs"
                : "border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200"
            }`}
          >
            {isEn ? "All" : "Tất cả"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedFacilityType("clinic")}
            className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 ${
              selectedFacilityType === "clinic"
                ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                : "border-emerald-500 text-emerald-950 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-950/70 hover:bg-emerald-200"
            }`}
          >
            {isEn ? "Vet Clinics" : "Phòng khám"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedFacilityType("spa")}
            className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 ${
              selectedFacilityType === "spa"
                ? "bg-purple-700 text-white border-purple-800 shadow-xs"
                : "border-purple-500 text-purple-950 dark:text-purple-100 bg-purple-100 dark:bg-purple-950/70 hover:bg-purple-200"
            }`}
          >
            {isEn ? "Pet Spa" : "Pet Spa"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedFacilityType("shop")}
            className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 ${
              selectedFacilityType === "shop"
                ? "bg-amber-700 text-white border-amber-800 shadow-xs"
                : "border-amber-500 text-amber-950 dark:text-amber-100 bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200"
            }`}
          >
            {isEn ? "Pet Shop" : "Pet Shop"}
          </button>
        </div>
      </div>

      {/* STAR RATING FILTER (Tùy chọn lọc theo số sao) */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold pt-1">
        <span className="text-muted-foreground mr-1 shrink-0 text-xs font-bold">
          {isEn ? "Stars Rating:" : "Lọc theo sao:"}
        </span>
        <button
          type="button"
          onClick={() => setSelectedMinRating(0)}
          className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 shrink-0 ${
            selectedMinRating === 0
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-950 dark:border-white shadow-xs"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {isEn ? "All Ratings" : "Tất cả sao"}
        </button>
        <button
          type="button"
          onClick={() => setSelectedMinRating(5.0)}
          className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 shrink-0 flex items-center gap-1.5 ${
            selectedMinRating === 5.0
              ? "bg-amber-500 text-white border-amber-600 shadow-xs"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span>5.0</span>
          <span className="text-[10px] opacity-80">({isEn ? "Top Choice" : "Tuyệt đối"})</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedMinRating(4.8)}
          className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 shrink-0 flex items-center gap-1.5 ${
            selectedMinRating === 4.8
              ? "bg-amber-500 text-white border-amber-600 shadow-xs"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span>4.8+</span>
          <span className="text-[10px] opacity-80">({isEn ? "Excellent" : "Xuất sắc"})</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedMinRating(4.5)}
          className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 shrink-0 flex items-center gap-1.5 ${
            selectedMinRating === 4.5
              ? "bg-amber-500 text-white border-amber-600 shadow-xs"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span>4.5+</span>
          <span className="text-[10px] opacity-80">({isEn ? "Very Good" : "Rất tốt"})</span>
        </button>
      </div>

      {/* CHỨC NĂNG 1: DỊCH VỤ TIÊU BIỂU */}
      <div className="rounded-3xl border-2 border-border/90 bg-muted/30 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs sm:text-sm text-foreground">
              {isEn ? "Featured Services:" : "Dịch vụ tiêu biểu:"}
            </span>
            {selectedServices.length > 0 && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black text-primary-foreground shadow-2xs">
                {selectedServices.length} {isEn ? "selected" : "đã chọn"}
              </span>
            )}
          </div>

          {selectedServices.length > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              {isEn ? "Reset filters" : "Xóa bộ lọc"}
            </button>
          )}
        </div>

        {/* Services Badges Grid (Đồng bộ chuẩn theme, không lạm dụng màu) */}
        <div className="flex flex-wrap gap-2 pt-0.5">
          {FEATURED_SERVICES.map((srv) => {
            const isSelected = selectedServices.includes(srv.id);

            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => handleToggleService(srv.id)}
                className={`rounded-2xl px-3.5 py-1.5 text-xs font-black transition cursor-pointer border-2 ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-foreground border-border hover:bg-muted hover:border-primary/50"
                }`}
              >
                {isEn ? srv.labelEn : srv.labelVi}
              </button>
            );
          })}
        </div>
      </div>

      {/* CHỨC NĂNG 2: BẢNG XẾP HẠNG MỖI NƠI MỘT HÀNG, KÉO XUỐNG TỪ TỪ */}
      <div className="space-y-4">
        {/* Segmented Ranking Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-border/80 pb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="text-muted-foreground mr-1">
              {isEn ? "Rank by:" : "Xếp hạng:"}
            </span>

            {/* 1. Theo Đánh giá sao cao nhất */}
            <button
              type="button"
              onClick={() => setRankingMode("rating")}
              className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 ${
                rankingMode === "rating"
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>{isEn ? "Top Rated (Stars)" : "Đánh giá sao cao nhất"}</span>
            </button>

            {/* 2. Theo Vị trí gần nhất */}
            <button
              type="button"
              onClick={() => setRankingMode("distance")}
              className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 ${
                rankingMode === "distance"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              }`}
            >
              {isEn ? "Nearest Distance" : "Vị trí gần nhất"}
            </button>

            {/* 3. Theo Bộ lọc dịch vụ của người dùng */}
            <button
              type="button"
              onClick={() => setRankingMode("filter_match")}
              className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 flex items-center gap-1.5 ${
                rankingMode === "filter_match"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>{isEn ? "Best Service Match" : "Khớp dịch vụ lọc"}</span>
              {selectedServices.length > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    rankingMode === "filter_match"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {selectedServices.length}
                </span>
              )}
            </button>

            {/* 4. Xem tất cả các bảng xếp hạng */}
            <button
              type="button"
              onClick={() => setRankingMode("all_sections")}
              className={`rounded-xl px-3 py-1.5 transition cursor-pointer border-2 ${
                rankingMode === "all_sections"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              }`}
            >
              {isEn ? "View All 3 Rankings" : "Xem cả 3 bảng"}
            </button>
          </div>

          <span className="text-xs text-muted-foreground font-bold">
            {isEn
              ? `Found ${currentDisplayList.length} locations`
              : `Tìm thấy ${currentDisplayList.length} địa điểm`}
          </span>
        </div>

        {/* IF USER SELECTED "ALL 3 RANKINGS VIEW" */}
        {rankingMode === "all_sections" ? (
          <div className="space-y-8 pt-1">
            {/* 1. Top Rated Facilities by Star Rating */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-2xs">
                  1
                </span>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                    {isEn
                      ? "Top Rated Venues (Star Rating & Trust)"
                      : "Bảng Xếp Hạng Đánh Giá Sao Cao Nhất"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {isEn
                      ? "Ranked by highest star rating and customer review counts"
                      : "Sắp xếp theo số sao đánh giá thực tế và số lượng phản hồi từ khách hàng"}
                  </p>
                </div>
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-2 scroll-smooth">
                {rankedByRating.map((clinic, index) => (
                  <ClinicRowItem
                    key={clinic.id}
                    clinic={clinic}
                    index={index}
                    locale={locale}
                    isEn={isEn}
                    matchScore={getMatchScore(clinic)}
                    rankingMode="rating"
                  />
                ))}
              </div>
            </div>

            {/* 2. Nearest Facilities by Distance */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-2xs">
                  2
                </span>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                    {isEn
                      ? "Nearest Facilities (Distance Proximity)"
                      : "Bảng Xếp Hạng Vị Trí Gần Nhất"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {isEn
                      ? "Sorted from closest to farthest distance from your location"
                      : "Sắp xếp từ khoảng cách gần nhất đến xa hơn từ vị trí của bạn"}
                  </p>
                </div>
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-2 scroll-smooth">
                {rankedByDistance.map((clinic, index) => (
                  <ClinicRowItem
                    key={clinic.id}
                    clinic={clinic}
                    index={index}
                    locale={locale}
                    isEn={isEn}
                    matchScore={getMatchScore(clinic)}
                    rankingMode="distance"
                  />
                ))}
              </div>
            </div>

            {/* 3. Best Matches by User Filter */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-primary text-primary-foreground font-black text-xs shrink-0 shadow-2xs">
                  3
                </span>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                    {isEn
                      ? "Best Service Matches (Filter Alignment)"
                      : "Bảng Xếp Hạng Khớp Theo Dịch Vụ Bạn Lọc"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {isEn
                      ? "Sorted by matching services you requested"
                      : "Sắp xếp theo số lượng dịch vụ khớp với yêu cầu của bạn"}
                  </p>
                </div>
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-2 scroll-smooth">
                {rankedByFilterMatch.map((clinic, index) => (
                  <ClinicRowItem
                    key={clinic.id}
                    clinic={clinic}
                    index={index}
                    locale={locale}
                    isEn={isEn}
                    matchScore={getMatchScore(clinic)}
                    rankingMode="filter_match"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* SINGLE RANKED LIST: MỖI NƠI MỘT HÀNG & KÉO XUỐNG TỪ TỪ */
          <div>
            {currentDisplayList.length === 0 ? (
              <Card className="p-12 text-center space-y-3 border-dashed border-2 border-border bg-card">
                <span className="mx-auto inline-flex items-center rounded-2xl bg-primary/15 border-2 border-primary/30 px-4 py-2 text-sm font-extrabold text-primary">
                  {isEn ? "No Matching Locations" : "Không tìm thấy cơ sở phù hợp"}
                </span>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isEn
                    ? "Try adjusting your search query, lowering minimum stars, or clearing some of the selected services."
                    : "Hãy thử bỏ bớt dịch vụ lọc, hạ mức sao tối thiểu hoặc tìm kiếm theo từ khóa chung hơn."}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-2 inline-flex items-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow cursor-pointer"
                >
                  {isEn ? "Clear All Filters" : "Xóa tất cả bộ lọc"}
                </button>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Scrollable Container: Mỗi nơi một hàng, có thể cuộn xuống từ từ */}
                <div className="max-h-[640px] overflow-y-auto space-y-3 pr-2 scroll-smooth">
                  {currentDisplayList.map((clinic, index) => (
                    <ClinicRowItem
                      key={clinic.id}
                      clinic={clinic}
                      index={index}
                      locale={locale}
                      isEn={isEn}
                      matchScore={getMatchScore(clinic)}
                      rankingMode={rankingMode}
                    />
                  ))}
                </div>

                {/* Subtle scroll footer hint */}
                {currentDisplayList.length > 4 && (
                  <div className="text-center pt-2">
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      {isEn
                        ? "Scroll down to browse more locations"
                        : "Cuộn xuống để xem thêm các cơ sở khác"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Full-width horizontal row for each venue ("Mỗi nơi một hàng")
function ClinicRowItem({
  clinic,
  index,
  locale,
  isEn,
  matchScore,
  rankingMode = "rating",
}: {
  clinic: ClinicDetail;
  index: number;
  locale: string;
  isEn: boolean;
  matchScore: number;
  rankingMode?: string;
}) {
  const isSpa = clinic.facilityType === "spa";
  const isShop = clinic.facilityType === "shop";

  return (
    <Link
      href={`/${locale}/clinics/${clinic.id}`}
      className="group flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border-2 border-border bg-card p-4 sm:p-5 shadow-xs transition hover:border-primary hover:shadow-md hover:bg-muted/40"
    >
      {/* Left: Rank + Badges + Name + Stars Rating + Address */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        {/* Rank Badge */}
        <div className="flex flex-col items-center shrink-0">
          <span
            className={`grid size-9 place-items-center rounded-2xl text-xs font-black shrink-0 ${
              index === 0
                ? "bg-amber-500 text-white shadow-xs"
                : index === 1
                ? "bg-slate-400 text-white shadow-xs"
                : index === 2
                ? "bg-amber-700 text-white shadow-xs"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            #{index + 1}
          </span>
          {rankingMode === "rating" && index < 3 && (
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {index === 0 ? (isEn ? "Top 1" : "Hạng 1") : index === 1 ? (isEn ? "Top 2" : "Hạng 2") : (isEn ? "Top 3" : "Hạng 3")}
            </span>
          )}
        </div>

        {/* Name, Badges, Stars & Address */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Facility Type Pill: Emerald for Clinic, Purple for Spa, Amber for Shop */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border-2 shrink-0 ${
                isShop
                  ? "bg-amber-100 dark:bg-amber-900/40 border-amber-500 dark:border-amber-400 text-amber-950 dark:text-amber-200"
                  : isSpa
                  ? "bg-purple-100 dark:bg-purple-900/40 border-purple-500 dark:border-purple-400 text-purple-950 dark:text-purple-200"
                  : "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 dark:border-emerald-400 text-emerald-950 dark:text-emerald-200"
              }`}
            >
              {isShop
                ? isEn
                  ? "Pet Shop"
                  : "Cửa hàng Pet Shop"
                : isSpa
                ? isEn
                  ? "Pet Spa & Hotel"
                  : "Spa & Khách sạn thú cưng"
                : isEn
                ? "Vet Clinic"
                : "Phòng khám"}
            </span>

            {/* 24/7 ER Badge */}
            {clinic.is_24_7 && (
              <span className="rounded-full bg-rose-100 dark:bg-rose-900/40 border-2 border-rose-500 dark:border-rose-400 px-2 py-0.5 text-[10px] font-black text-rose-950 dark:text-rose-200 shrink-0">
                {isEn ? "24/7 ER" : "Cấp cứu 24/7"}
              </span>
            )}
          </div>

          <h3 className="font-display text-base font-bold text-foreground transition group-hover:text-primary truncate max-w-sm sm:max-w-md">
            {clinic.name}
          </h3>

          {/* Detailed 5-star visual rating */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`size-3.5 ${
                    star <= Math.floor(clinic.rating)
                      ? "fill-amber-400 text-amber-400"
                      : star === Math.ceil(clinic.rating) && clinic.rating % 1 !== 0
                      ? "fill-amber-400/50 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-xs text-foreground">
              {clinic.rating.toFixed(1)} / 5.0
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              ({clinic.reviewCount} {isEn ? "reviews" : "đánh giá"})
            </span>
            {clinic.rating >= 4.9 && (
              <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:text-amber-400">
                {clinic.rating === 5.0
                  ? isEn
                    ? "⭐ 5-Star Excellence"
                    : "⭐ 5.0 Xuất sắc"
                  : isEn
                  ? "⭐ Top Choice"
                  : "⭐ Đánh giá cao"}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground truncate font-medium">
            {clinic.address}
          </p>
        </div>
      </div>

      {/* Middle: Distance & Services Chips */}
      <div className="flex flex-wrap md:flex-col items-start md:items-end justify-between md:justify-center gap-2 shrink-0 md:min-w-[180px]">
        {clinic.distanceKm !== undefined && (
          <div className="flex items-center gap-1 font-semibold text-muted-foreground text-xs">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span>{clinic.distanceKm} km {isEn ? "away" : "cách đây"}</span>
          </div>
        )}

        {/* Filter Match Pill */}
        {matchScore > 0 && (
          <span className="rounded-lg bg-muted border border-border px-2.5 py-0.5 text-[10px] font-bold text-foreground">
            {isEn ? `Matches ${matchScore} services` : `Khớp ${matchScore} dịch vụ`}
          </span>
        )}

        {/* Specialty tags */}
        <div className="hidden sm:flex flex-wrap gap-1 justify-end">
          {clinic.specialties.slice(0, 2).map((spec, idx) => (
            <span
              key={idx}
              className="rounded-lg bg-secondary border border-border px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground"
            >
              {localizeClinicSpecialty(spec, isEn)}
            </span>
          ))}
        </div>
      </div>

      {/* Right: Book Action (No arrow icon) */}
      <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 border-border/60 pt-2 md:pt-0">
        <span className="rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-xs font-black shadow-xs group-hover:opacity-90 transition">
          {isEn ? "View & Book" : "Xem & Đặt lịch"}
        </span>
      </div>
    </Link>
  );
}

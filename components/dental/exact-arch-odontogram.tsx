/**
 * Exact Arch Odontogram - matches reference futuristic dashboard image
 * Lavender/purple glassmorphism background, glow-outlined highlighted teeth,
 * type-based tooth shapes (molar/premolar/canine/incisor), click-to-select.
 *
 * Always shows existing conditions (fillings, crowns, etc.) with subtle color.
 * View mode controls which teeth get the GLOW emphasis.
 * Integrates optional periodontal data to show BOP dots and PD severity.
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CrownRootToothShape,
  getToothTypeFromNum,
  TOOTH_WIDTH,
  TOOTH_HEIGHT,
} from "@/components/dental/crown-root-tooth-shape";

interface ToothInfo {
  condition?:
    | "healthy"
    | "caries"
    | "crown"
    | "filling"
    | "missing"
    | "extraction"
    | "implant"
    | "root_canal";
  treatment?: string;
  completed?: boolean;
  date?: string;
  notes?: string;
}

interface PerioSite {
  pd?: number;
  bop?: boolean;
  recession?: number;
}

interface PerioToothData {
  mesial?: PerioSite;
  buccal?: PerioSite;
  distal?: PerioSite;
  lingual?: PerioSite;
}

type ViewMode = "treatments" | "conditions" | "completed" | "all";

interface ExactArchOdontogramProps {
  toothData?: Record<string, ToothInfo | any>;
  periodontalData?: Record<string, PerioToothData>;
  initialViewMode?: ViewMode;
  scanTeethIncluded?: string[];
  isExpanded?: boolean;
}

const CONDITION_COLORS: Record<
  string,
  { fill: string; stroke: string; glow: string }
> = {
  filling: {
    fill: "rgba(96,165,250,0.35)",
    stroke: "#60A5FA",
    glow: "#60A5FA",
  },
  caries: { fill: "rgba(251,146,60,0.45)", stroke: "#F97316", glow: "#F97316" },
  crown: { fill: "rgba(192,132,252,0.35)", stroke: "#A855F7", glow: "#A855F7" },
  root_canal: {
    fill: "rgba(192,132,252,0.35)",
    stroke: "#A855F7",
    glow: "#A855F7",
  },
  implant: {
    fill: "rgba(52,211,153,0.45)",
    stroke: "#34D399",
    glow: "#34D399",
  },
  missing: {
    fill: "rgba(156,163,175,0.5)",
    stroke: "#9CA3AF",
    glow: "#9CA3AF",
  },
  extraction: {
    fill: "rgba(251,146,60,0.45)",
    stroke: "#F97316",
    glow: "#F97316",
  },
};

const NORMAL_COLORS = {
  fill: "normal",
  stroke: "#c4b8d0",
  glow: undefined as string | undefined,
};

function getPerioWorstPd(perio?: PerioToothData): number {
  if (!perio) return 0;
  return Math.max(
    perio.mesial?.pd ?? 0,
    perio.buccal?.pd ?? 0,
    perio.distal?.pd ?? 0,
    perio.lingual?.pd ?? 0,
  );
}

function hasAnyBop(perio?: PerioToothData): boolean {
  if (!perio) return false;
  return !!(
    perio.mesial?.bop ||
    perio.buccal?.bop ||
    perio.distal?.bop ||
    perio.lingual?.bop
  );
}

export function ExactArchOdontogram({
  toothData,
  periodontalData,
  initialViewMode = "all",
  scanTeethIncluded,
  isExpanded = false,
}: ExactArchOdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const toothScale = isExpanded ? 1.58 : 1.12;
  const toothGapClass = isExpanded ? "gap-2" : "gap-1";

  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

  const getToothInfo = (toothNum: number): ToothInfo => {
    if (toothData?.[toothNum.toString()]) return toothData[toothNum.toString()];
    return { condition: "healthy" };
  };

  const getPerioData = (toothNum: number): PerioToothData | undefined => {
    return periodontalData?.[toothNum.toString()];
  };

  // Whether this tooth gets the GLOW emphasis (controlled by view mode filter)
  const shouldGlow = (info: ToothInfo): boolean => {
    if (info.condition === "healthy" || !info.condition) return false;
    if (viewMode === "all") return true;
    if (viewMode === "treatments") return !!info.treatment && !info.completed;
    if (viewMode === "conditions") return true;
    if (viewMode === "completed")
      return info.completed === true || info.condition === "implant";
    return false;
  };

  // Always return condition-specific colors for non-healthy teeth (subtle fill + stroke)
  // Glow is only applied when shouldGlow is true
  const getToothColors = (toothNum: number, info: ToothInfo) => {
    const isHealthy = !info.condition || info.condition === "healthy";
    if (isHealthy) return NORMAL_COLORS;

    const condColors =
      CONDITION_COLORS[info.condition!] || CONDITION_COLORS.filling;
    const glowActive = shouldGlow(info);

    return {
      fill: condColors.fill,
      stroke: condColors.stroke,
      glow: glowActive ? condColors.glow : undefined,
    };
  };

  const getToothTooltip = (toothNum: number, info: ToothInfo): string => {
    const parts: string[] = [];

    if (info.condition && info.condition !== "healthy") {
      const label =
        {
          implant: "Implant",
          filling: "Restoration",
          caries: "Caries",
          crown: "Crown",
          missing: "Missing",
          extraction: "Extraction",
          root_canal: "Root Canal",
        }[info.condition] ||
        info.treatment ||
        "";
      parts.push(label);
      if (info.completed) parts.push("(completed)");
    }

    const perio = getPerioData(toothNum);
    if (perio) {
      const worstPd = getPerioWorstPd(perio);
      const bop = hasAnyBop(perio);
      if (worstPd > 3) parts.push(`PD ${worstPd}mm`);
      if (bop) parts.push("BOP");
    }

    return parts.join(" · ");
  };

  // Summary stats for the legend
  const stats = useMemo(() => {
    const conditions: string[] = [];
    let bopCount = 0;
    let elevatedPdCount = 0;

    for (let t = 1; t <= 32; t++) {
      const info = (toothData?.[t.toString()] as ToothInfo | undefined) ?? {
        condition: "healthy",
      };
      if (info.condition && info.condition !== "healthy") {
        conditions.push(info.condition);
      }

      const perio = periodontalData?.[t.toString()];
      if (hasAnyBop(perio)) bopCount++;
      if (getPerioWorstPd(perio) > 3) elevatedPdCount++;
    }

    return {
      fillings: conditions.filter((c) => c === "filling").length,
      crowns: conditions.filter((c) => c === "crown").length,
      caries: conditions.filter((c) => c === "caries").length,
      implants: conditions.filter((c) => c === "implant").length,
      missing: conditions.filter((c) => c === "missing" || c === "extraction")
        .length,
      bopCount,
      elevatedPdCount,
    };
  }, [toothData, periodontalData]);

  const ToothItem = ({
    toothNum,
    isUpper,
  }: {
    toothNum: number;
    isUpper: boolean;
  }) => {
    const info = getToothInfo(toothNum);
    const perio = getPerioData(toothNum);
    const colors = getToothColors(toothNum, info);
    const tooltip = getToothTooltip(toothNum, info);
    const isSelected = selectedTooth === toothNum;
    const isHovered = hoveredTooth === toothNum.toString();
    const toothType = getToothTypeFromNum(toothNum);
    const shapeIsUpper = !isUpper;

    const fillColor = colors.fill === "normal" ? "#f8f6fc" : colors.fill;
    const strokeColor = isSelected ? "#3B82F6" : colors.stroke;
    const glowColor = isSelected ? "#60A5FA" : colors.glow;

    const hasBop = hasAnyBop(perio);
    const worstPd = getPerioWorstPd(perio);
    const pdSeverity =
      worstPd <= 3 ? "healthy" : worstPd <= 6 ? "moderate" : "severe";

    return (
      <div
        className={`relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
          isSelected ? "scale-110" : "hover:scale-105"
        }`}
        style={{ width: TOOTH_WIDTH[toothType] * toothScale }}
        onClick={() => setSelectedTooth(isSelected ? null : toothNum)}
        onMouseEnter={() => setHoveredTooth(toothNum.toString())}
        onMouseLeave={() => setHoveredTooth(null)}
      >
        {isUpper && (
          <span
            className={`${isExpanded ? "text-[10px]" : "text-[9px]"} font-medium ${isExpanded ? "mb-1" : "mb-0.5"} ${glowColor ? "text-gray-700" : "text-gray-500"}`}
          >
            {toothNum}
          </span>
        )}

        <div
          className="relative"
          style={{
            width: TOOTH_WIDTH[toothType] * toothScale,
            height: TOOTH_HEIGHT * toothScale,
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `scale(${toothScale})` }}
          >
            <CrownRootToothShape
              isUpper={shapeIsUpper}
              toothNum={toothNum}
              toothType={toothType}
              fillColor={fillColor}
              strokeColor={strokeColor}
              glowColor={glowColor}
              showImplantLines={info.condition === "implant"}
              isSelected={isSelected}
            />
          </div>

          {/* BOP indicator — small red dot at the gingival margin */}
          {hasBop && (
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                [shapeIsUpper ? "bottom" : "top"]: -1,
                width: 5,
                height: 5,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, #ef4444 40%, #dc2626 100%)",
                boxShadow: "0 0 4px rgba(239,68,68,0.8)",
                zIndex: 5,
              }}
            />
          )}

          {/* Elevated PD indicator — thin amber/red bar under tooth */}
          {pdSeverity !== "healthy" && (
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                [shapeIsUpper ? "bottom" : "top"]: -4,
                width: "80%",
                height: 2,
                borderRadius: 1,
                background: pdSeverity === "moderate" ? "#f59e0b" : "#ef4444",
                boxShadow: `0 0 3px ${pdSeverity === "moderate" ? "rgba(245,158,11,0.6)" : "rgba(239,68,68,0.6)"}`,
                zIndex: 4,
              }}
            />
          )}
        </div>

        {!isUpper && (
          <span
            className={`${isExpanded ? "text-[10px]" : "text-[9px]"} font-medium ${isExpanded ? "mt-1" : "mt-0.5"} ${glowColor ? "text-gray-700" : "text-gray-500"}`}
          >
            {toothNum}
          </span>
        )}

        {/* Tooltip */}
        {isHovered && tooltip && (
          <div
            className={`absolute z-30 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow-lg ${
              isUpper
                ? "-top-7 left-1/2 -translate-x-1/2"
                : "-bottom-7 left-1/2 -translate-x-1/2"
            }`}
          >
            {tooltip}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #c8b4e0 0%, #b8a4d4 40%, #a898c8 100%)",
        padding: isExpanded ? "26px 44px 20px" : "18px 30px 12px",
      }}
    >
      {/* Left arrow */}
      <button
        type="button"
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center shadow transition-colors"
      >
        <ChevronLeft className="h-4 w-4 text-gray-700" />
      </button>

      {/* Right arrow */}
      <button
        type="button"
        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center shadow transition-colors"
      >
        <ChevronRight className="h-4 w-4 text-gray-700" />
      </button>

      {/* Upper arch */}
      <div
        className={`flex justify-center items-end ${isExpanded ? "mb-5" : "mb-3"} ${toothGapClass}`}
      >
        {upperTeeth.map((n) => (
          <ToothItem key={n} toothNum={n} isUpper />
        ))}
      </div>

      {/* Lower arch */}
      <div className={`flex justify-center items-start ${toothGapClass}`}>
        {lowerTeeth.map((n) => (
          <ToothItem key={n} toothNum={n} isUpper={false} />
        ))}
      </div>

      {/* Inline legend — shows what's on the chart at a glance */}
      <div
        className={`flex items-center justify-center ${isExpanded ? "gap-4 mt-4" : "gap-3 mt-2"} flex-wrap`}
      >
        {stats.fillings > 0 && (
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: "rgba(96,165,250,0.7)" }}
            />
            <span className="text-[8px] text-gray-600">
              {stats.fillings} Filling{stats.fillings > 1 ? "s" : ""}
            </span>
          </div>
        )}
        {stats.crowns > 0 && (
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: "rgba(192,132,252,0.7)" }}
            />
            <span className="text-[8px] text-gray-600">
              {stats.crowns} Crown{stats.crowns > 1 ? "s" : ""}
            </span>
          </div>
        )}
        {stats.caries > 0 && (
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: "rgba(251,146,60,0.7)" }}
            />
            <span className="text-[8px] text-gray-600">
              {stats.caries} Caries
            </span>
          </div>
        )}
        {stats.implants > 0 && (
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: "rgba(52,211,153,0.7)" }}
            />
            <span className="text-[8px] text-gray-600">
              {stats.implants} Implant{stats.implants > 1 ? "s" : ""}
            </span>
          </div>
        )}
        {stats.bopCount > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[8px] text-gray-600">
              {stats.bopCount} BOP
            </span>
          </div>
        )}
        {stats.fillings === 0 &&
          stats.crowns === 0 &&
          stats.caries === 0 &&
          stats.bopCount === 0 && (
            <span className="text-[8px] text-gray-500">All teeth healthy</span>
          )}
      </div>
    </div>
  );
}

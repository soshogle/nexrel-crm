/**
 * Custom X-Ray Analysis Component
 *
 * Displays the REAL x-ray image from the DentalXRay record (fullUrl, previewUrl,
 * thumbnailUrl, or imageUrl) with AI-derived diagnostic overlays.
 * Falls back to a placeholder illustration only when no image is available.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";

interface XRayAnalysisProps {
  xrayData?: any;
  toothData?: Record<string, { condition?: string; treatment?: string }>;
  isAnalyzing?: boolean;
}

const EMPTY_FINDINGS = {
  restorations: [] as string[],
  boneLevel: "",
  periapical: "",
  boneDensity: "",
  summary: [] as string[],
};

function deriveFindings(
  xrayData?: any,
  toothData?: Record<string, any>,
): {
  restorations: string[];
  boneLevel: string;
  periapical: string;
  boneDensity: string;
  summary: string[];
} {
  const defaults = {
    restorations: [] as string[],
    boneLevel: "",
    periapical: "",
    boneDensity: "",
    summary: [] as string[],
  };

  const ai = xrayData?.aiAnalysis;
  if (!ai || typeof ai !== "object") {
    return EMPTY_FINDINGS;
  }

  if (Array.isArray(ai.findings)) {
    defaults.summary = ai.findings.filter((l: string) => typeof l === "string");
  } else if (typeof ai.findings === "string" && ai.findings.length > 0) {
    defaults.summary = ai.findings.split("\n").filter((l: string) => l.trim());
  }

  if (typeof ai.boneLevel === "string") defaults.boneLevel = ai.boneLevel;
  if (typeof ai.periapical === "string") defaults.periapical = ai.periapical;
  if (typeof ai.boneDensity === "string") defaults.boneDensity = ai.boneDensity;

  return defaults;
}

function resolveImageUrl(xrayData: any): string | null {
  if (!xrayData) return null;
  return (
    xrayData.fullUrl ||
    xrayData.previewUrl ||
    xrayData.thumbnailUrl ||
    xrayData.imageUrl ||
    null
  );
}

export function CustomXRayAnalysis({
  xrayData,
  toothData,
  isAnalyzing = false,
}: XRayAnalysisProps) {
  const imageUrl = useMemo(() => resolveImageUrl(xrayData), [xrayData]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [xrayData?.id, imageUrl]);

  const canShowAnalysis = Boolean(xrayData) && imageLoaded && !imageError;

  const findings = useMemo(
    () =>
      canShowAnalysis ? deriveFindings(xrayData, toothData) : EMPTY_FINDINGS,
    [canShowAnalysis, xrayData, toothData],
  );

  const hasFindings = findings.summary.length > 0;

  return (
    <div className="relative">
      {/* X-Ray Image Area */}
      <div className="relative w-full h-48 bg-black rounded-lg flex items-center justify-center mb-3 overflow-hidden">
        {/* Real image from database */}
        {imageUrl && !imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={
                xrayData?.xrayType
                  ? `${xrayData.xrayType} X-Ray`
                  : "Dental X-Ray"
              }
              className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              draggable={false}
            />
            {imageLoaded && (
              <div className="absolute top-1.5 left-1.5 bg-green-600/80 text-white text-[8px] px-1.5 py-0.5 rounded font-medium">
                {xrayData?.xrayType || "X-Ray"}
              </div>
            )}
          </>
        ) : (
          /* Placeholder when no real image is available */
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black opacity-90" />
            <div className="relative flex flex-col items-center justify-center text-center z-10">
              <ImageOff className="w-10 h-10 text-gray-600 mb-2" />
              <p className="text-[11px] text-gray-500 font-medium">
                {imageError
                  ? "Failed to load X-ray image"
                  : xrayData
                    ? "No X-ray file found on this record"
                    : "No X-ray image uploaded"}
              </p>
              <p className="text-[9px] text-gray-600 mt-0.5">
                Upload a DICOM, TIFF, or JPEG from your x-ray sensor
              </p>
            </div>
          </>
        )}

        {/* Diagnostic overlay badges — only when AI fields exist */}
        {canShowAnalysis &&
          (findings.boneLevel ||
            findings.periapical ||
            findings.boneDensity) && (
            <>
              {findings.boneLevel && (
                <div className="absolute top-1.5 right-1.5 bg-white/90 border border-purple-300 rounded px-1.5 py-0.5 shadow-sm z-10">
                  <div className="text-[9px] font-medium text-gray-900">
                    Bone Level
                  </div>
                  <div
                    className={`text-[9px] font-semibold ${findings.boneLevel.includes("Normal") || findings.boneLevel.includes("Healthy") ? "text-green-600" : "text-amber-600"}`}
                  >
                    {findings.boneLevel}
                  </div>
                </div>
              )}

              {findings.periapical && (
                <div className="absolute bottom-1.5 left-1.5 bg-white/90 border border-purple-300 rounded px-1.5 py-0.5 shadow-sm z-10">
                  <div className="text-[9px] font-medium text-gray-900">
                    Periapical
                  </div>
                  <div
                    className={`text-[9px] ${findings.periapical.includes("No pathology") ? "text-green-600" : "text-amber-600"}`}
                  >
                    {findings.periapical}
                  </div>
                </div>
              )}

              {findings.boneDensity && (
                <div className="absolute bottom-1.5 right-1.5 bg-white/90 border border-purple-300 rounded px-1.5 py-0.5 shadow-sm z-10">
                  <div className="text-[9px] font-medium text-gray-900">
                    Density
                  </div>
                  <div
                    className={`text-[9px] font-semibold ${findings.boneDensity.includes("Healthy") ? "text-green-600" : "text-amber-600"}`}
                  >
                    {findings.boneDensity}
                  </div>
                </div>
              )}
            </>
          )}
      </div>

      {/* AI findings text */}
      {canShowAnalysis && hasFindings && (
        <div className="space-y-1 text-xs text-gray-600 mt-2">
          {findings.summary.slice(0, 5).map((line, i) => (
            <div key={i} className="leading-snug">
              {line}
            </div>
          ))}
          {findings.summary.length > 5 && (
            <div className="text-[10px] text-purple-600 font-medium">
              + {findings.summary.length - 5} more findings...
            </div>
          )}
        </div>
      )}

      {canShowAnalysis && !hasFindings && isAnalyzing && (
        <div className="mt-2 text-xs text-indigo-600 font-medium">
          Running AI analysis for this X-ray...
        </div>
      )}

      {canShowAnalysis &&
        !hasFindings &&
        !isAnalyzing &&
        !xrayData?.aiAnalysis && (
          <div className="mt-2 text-xs text-gray-500">
            No saved AI analysis yet for this X-ray.
          </div>
        )}

      {canShowAnalysis && xrayData?.aiAnalysis?.recommendations && (
        <div className="mt-2 text-xs text-gray-600 leading-snug">
          <span className="font-medium text-gray-800">Recommendations:</span>{" "}
          {xrayData.aiAnalysis.recommendations}
        </div>
      )}

      {canShowAnalysis &&
        typeof xrayData?.aiAnalysis?.confidence === "number" && (
          <div className="mt-1 text-[11px] text-gray-500">
            Confidence: {Math.round(xrayData.aiAnalysis.confidence * 100)}%
          </div>
        )}

      {/* Disclaimer for AI analysis */}
      {canShowAnalysis && xrayData?.aiAnalysis && (
        <div className="mt-2 text-[9px] text-gray-400 italic">
          AI analysis for informational purposes only — not for diagnostic use.
          Professional review required.
        </div>
      )}
    </div>
  );
}

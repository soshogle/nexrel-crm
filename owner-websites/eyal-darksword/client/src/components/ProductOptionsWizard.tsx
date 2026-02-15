import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Check, Minus, Plus } from "lucide-react";

type VariationOption = {
  id: number;
  name: string;
  price: string | null;
  salePrice: string | null;
  regularPrice: string | null;
  priceModifier: string | null;
  stockStatus: string | null;
};

type AttributeOption = { value: string; colorHex?: string; isDefault?: boolean };

type WizardStep =
  | { type: "variation"; key: string; label: string; options: VariationOption[] }
  | { type: "attribute"; key: string; label: string; displayType: string; options: AttributeOption[] };

type ProductOptionsWizardProps = {
  variationGroups: Record<string, VariationOption[]>;
  attributes: Array<{
    id: number;
    attributeKey: string;
    attributeName: string;
    displayType: string;
    options: AttributeOption[];
  }>;
  selectedVariations: Record<string, string>;
  setSelectedVariations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedAttributes: Record<string, string>;
  setSelectedAttributes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAddToCart: () => void;
  displayPrice: number | null;
  isOutOfStock: boolean;
  qty: number;
  onQtyChange: (qty: number) => void;
};

export default function ProductOptionsWizard({
  variationGroups,
  attributes,
  selectedVariations,
  setSelectedVariations,
  selectedAttributes,
  setSelectedAttributes,
  onAddToCart,
  displayPrice,
  isOutOfStock,
  qty,
  onQtyChange,
}: ProductOptionsWizardProps) {
  // Build steps: variations first (Package), then attributes (Grip, Scabbard, etc.)
  // Deduplicate by key in case of API duplicates
  const steps = useMemo(() => {
    const seen = new Set<string>();
    const list: WizardStep[] = [];

    for (const [type, options] of Object.entries(variationGroups)) {
      if (options.length > 0 && !seen.has(`v:${type}`)) {
        seen.add(`v:${type}`);
        list.push({ type: "variation", key: type, label: type, options });
      }
    }

    for (const attr of attributes) {
      const opts = attr.options as AttributeOption[];
      if (opts.length > 0 && !seen.has(`a:${attr.attributeKey}`)) {
        seen.add(`a:${attr.attributeKey}`);
        list.push({
          type: "attribute",
          key: attr.attributeKey,
          label: attr.attributeName,
          displayType: attr.displayType,
          options: opts,
        });
      }
    }

    return list;
  }, [variationGroups, attributes]);

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const step = steps[currentStep];
  const isSimpleProduct = steps.length === 0;

  // Products with no variations/attributes: show wizard at Step 1 of 1 (ready for future attributes)
  if (isSimpleProduct) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <div className="h-1 flex-1 rounded-full bg-gold" />
        </div>
        <p className="text-xs text-muted-foreground tracking-wider uppercase">Step 1 of 1</p>
        <div className="min-h-[80px] flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Quantity:</span>
            <div className="flex items-center border border-border">
              <button onClick={() => onQtyChange(Math.max(1, qty - 1))} className="p-3 hover:bg-secondary transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center text-sm font-medium">{qty}</span>
              <button onClick={() => onQtyChange(qty + 1)} className="p-3 hover:bg-secondary transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {displayPrice && (
            <p className="text-2xl font-serif font-bold text-gold">USD${displayPrice.toFixed(2)}</p>
          )}
        </div>
        <div className="pt-2">
          <button
            onClick={onAddToCart}
            disabled={isOutOfStock}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      </div>
    );
  }

  const canProceed = () => {
    if (step.type === "variation") {
      return !!selectedVariations[step.key];
    }
    return !!selectedAttributes[step.key];
  };

  const handleNext = () => {
    if (isLastStep) {
      onAddToCart();
    } else {
      setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= currentStep ? "bg-gold" : "bg-[#333]"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground tracking-wider uppercase">
        Step {currentStep + 1} of {totalSteps}
      </p>

      {/* Step content */}
      <div className="min-h-[120px]">
        {step.type === "variation" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#FAF3E0]/90">
              Choose your {step.label}
            </label>
            {step.options.every((o) => o.stockStatus === "outofstock") && (
              <p className="text-sm text-amber-500/90 py-2">All options are currently out of stock.</p>
            )}
            <div className="space-y-2">
              {step.options.map((opt) => {
                const varPrice =
                  opt.salePrice && parseFloat(opt.salePrice) > 0
                    ? parseFloat(opt.salePrice)
                    : opt.price && parseFloat(opt.price) > 0
                      ? parseFloat(opt.price)
                      : null;
                const isSelected = selectedVariations[step.key] === opt.name;
                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setSelectedVariations((prev) => ({ ...prev, [step.key]: opt.name }))
                    }
                    disabled={opt.stockStatus === "outofstock"}
                    className={`w-full flex items-center justify-between px-4 py-3 border text-left transition-all ${
                      isSelected
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-[#333] hover:border-[#555] text-[#FAF3E0]"
                    } ${opt.stockStatus === "outofstock" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span>{opt.name}</span>
                    {varPrice && (
                      <span className="font-semibold">USD${varPrice.toFixed(2)}</span>
                    )}
                    {opt.stockStatus === "outofstock" && (
                      <span className="text-xs text-muted-foreground">(Out of Stock)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step.type === "attribute" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#FAF3E0]/90">
              Choose your {step.label}
            </label>
            {step.displayType === "color_swatch" ? (
              <div className="flex flex-wrap gap-3">
                {step.options.map((opt, i) => {
                  const isSelected = selectedAttributes[step.key] === opt.value;
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setSelectedAttributes((prev) => ({ ...prev, [step.key]: opt.value }))
                      }
                      title={opt.value}
                      className={`w-11 h-11 rounded-full border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-gold ring-2 ring-gold/30 scale-110"
                          : "border-[#444] hover:border-[#666]"
                      }`}
                      style={{ backgroundColor: opt.colorHex || "#666" }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {step.options.map((opt, i) => {
                  const isSelected = selectedAttributes[step.key] === opt.value;
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setSelectedAttributes((prev) => ({ ...prev, [step.key]: opt.value }))
                      }
                      className={`w-full px-4 py-3 border text-left transition-all ${
                        isSelected
                          ? "border-gold bg-gold/10 text-gold"
                          : "border-[#333] hover:border-[#555] text-[#FAF3E0]"
                      }`}
                    >
                      {opt.value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quantity (on last step) */}
      {isLastStep && (
        <div className="flex items-center gap-4 py-2">
          <span className="text-sm text-muted-foreground">Quantity:</span>
          <div className="flex items-center border border-border">
            <button
              onClick={() => onQtyChange(Math.max(1, qty - 1))}
              className="p-2 hover:bg-secondary transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button
              onClick={() => onQtyChange(qty + 1)}
              className="p-2 hover:bg-secondary transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Price (on last step) */}
      {isLastStep && displayPrice && (
        <p className="text-2xl font-serif font-bold text-gold">
          USD${displayPrice.toFixed(2)}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {!isFirstStep && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#333] text-[#FAF3E0] hover:border-gold hover:text-gold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed() || (isLastStep && isOutOfStock)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gold text-[#0D0D0D] text-sm font-semibold tracking-[0.1em] uppercase hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastStep ? (
            <>
              <Check className="w-4 h-4" />
              Add to Cart
            </>
          ) : (
            <>
              Next <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";

const tabs = [
  {
    id: "steel",
    label: "Steel & Forging",
    content: {
      title: "5160 High Carbon Steel",
      description: "All Darksword Armory swords are forged from 5160 high carbon steel — a spring steel alloy known for its exceptional toughness and edge retention. Each blade is individually heat treated and tempered to achieve a Rockwell hardness of 50-53 HRC.",
      specs: [
        { label: "Steel Type", value: "5160 High Carbon" },
        { label: "Hardness", value: "50-53 HRC" },
        { label: "Heat Treatment", value: "Oil Quenched & Tempered" },
        { label: "Edge", value: "Hand Sharpened" },
      ],
    },
  },
  {
    id: "construction",
    label: "Construction",
    content: {
      title: "Full Tang Construction",
      description: "Every sword features a full tang that extends through the entire handle, secured with a peened pommel. The grip is wrapped in genuine leather over a wooden core, providing an authentic feel and secure grip during use.",
      specs: [
        { label: "Tang", value: "Full Tang, Peened" },
        { label: "Grip", value: "Leather over Wood" },
        { label: "Guard", value: "Mild Steel, Hand Fitted" },
        { label: "Pommel", value: "Mild Steel, Peened" },
      ],
    },
  },
  {
    id: "quality",
    label: "Quality Assurance",
    content: {
      title: "Battle Ready Guarantee",
      description: "Each sword undergoes rigorous quality control including visual inspection, balance testing, and edge geometry verification. Our swords are designed to be fully functional — not decorative wall hangers. They are built to withstand the rigors of cutting practice and historical reenactment.",
      specs: [
        { label: "Inspection", value: "Individual QC" },
        { label: "Balance", value: "Historically Accurate" },
        { label: "Certification", value: "Battle Ready" },
        { label: "Warranty", value: "Lifetime Craftsmanship" },
      ],
    },
  },
];

export default function SpecsSection() {
  const [activeTab, setActiveTab] = useState("steel");
  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <section className="py-16 lg:py-24">
      <div className="container">
        <h2 className="font-serif text-3xl lg:text-4xl font-semibold text-center mb-4">
          Crafted with precision.
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Every detail matters when forging a blade that will last generations.
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-1 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-xs font-medium tracking-[0.12em] uppercase transition-all ${
                activeTab === tab.id
                  ? "bg-gold text-[#0D0D0D]"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto bg-card border border-border p-8 lg:p-12">
          <h3 className="font-serif text-2xl font-semibold mb-4 text-gold">
            {active.content.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            {active.content.description}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {active.content.specs.map((spec) => (
              <div key={spec.label} className="p-4 bg-secondary/50">
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1">
                  {spec.label}
                </p>
                <p className="text-sm font-semibold text-foreground">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

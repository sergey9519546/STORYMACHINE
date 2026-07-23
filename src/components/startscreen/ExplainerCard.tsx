import React, { useState } from "react";
import { Check } from "lucide-react";
import { ExplainerEntry } from "./explainers.config";

function ArcVisual({ arc, className = "" }: { arc: string; className?: string }) {
  const getPath = () => {
    switch (arc) {
      case "rags_to_riches":
        return "M 10 90 L 90 10";
      case "riches_to_rags":
        return "M 10 10 L 90 90";
      case "man_in_a_hole":
        return "M 10 10 Q 50 110 90 10";
      case "icarus":
        return "M 10 90 Q 50 -10 90 90";
      case "cinderella":
        return "M 10 90 L 40 10 L 60 90 L 90 10";
      case "oedipus":
        return "M 10 10 L 40 90 L 60 10 L 90 90";
      default:
        return "M 10 50 L 90 50";
    }
  };

  return (
    <svg viewBox="0 0 100 100" className={`w-12 h-12 ${className}`} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
      <path d={getPath()} className="transition-all duration-500" />
    </svg>
  );
}

interface ExplainerCardProps {
  options: Record<string, ExplainerEntry>;
  selectedValue: string;
  onSelect: (val: string) => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function ExplainerCard({ options, selectedValue, onSelect, title, icon: Icon }: ExplainerCardProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const activeKey = hoveredKey || selectedValue || Object.keys(options)[0];
  const activeData = options[activeKey];
  const isEmotionalArc = title === "Emotional Arc";

  return (
    <div className="flex flex-col h-full space-y-6">
      <h2 className="text-2xl font-bold text-black uppercase tracking-widest flex items-center gap-3 mb-2">
        <Icon className="w-8 h-8" />
        {title}
      </h2>
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[450px]">
        {/* Left: List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-3 overflow-y-auto pr-2 pb-4">
          {Object.entries(options).map(([key, data]) => {
            const isSelected = selectedValue === key;
            return (
              <button
                key={key}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => onSelect(key)}
                className={`text-left p-4 border-[2px] border-[var(--sm-ink)] transition-all flex items-center justify-between group  ${
                  isSelected
                    ? "sm-btn--ink border-black"
                    : "sm-btn hover:border-[var(--sm-stamp)]"
                }`}
              >
                <div className="flex items-center gap-4">
                  {isEmotionalArc && (
                    <div className={`p-1 sm-btn ${isSelected ? 'sm-btn' : 'sm-btn--ink'}`}>
                      <ArcVisual arc={key} className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <div className={`font-bold uppercase tracking-widest ${isSelected ? 'text-white' : 'group-hover:text-[var(--sm-stamp)]'}`}>
                      {data.title}
                    </div>
                    <div className={`text-[10px] font-mono uppercase mt-1 ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                      {data.vibe}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-[var(--sm-stamp)]" />}
              </button>
            );
          })}
        </div>

        {/* Right: Inspector */}
        <div className="w-full lg:w-2/3 bg-gray-50 border-[2px] border-[var(--sm-ink)] p-6 relative flex flex-col">
          <div className="absolute top-0 right-0 sm-btn--ink px-3 py-1 text-[10px] font-mono uppercase tracking-widest border-[2px] border-[var(--sm-ink)] border-t-0 border-r-0">
            {selectedValue === activeKey ? "Selected" : "Preview"}
          </div>

          <div className="mb-6 pr-20 flex items-start gap-6">
            {isEmotionalArc && (
              <div className="p-4 bg-black text-[var(--sm-stamp)] border-[2px] border-[var(--sm-ink)] shrink-0">
                <ArcVisual arc={activeKey} className="w-24 h-24" />
              </div>
            )}
            <div>
              <h3 className="text-3xl md:text-4xl font-display uppercase tracking-widest mb-2 text-black leading-none">{activeData.title}</h3>
              <span className="inline-block px-2 py-1 border-2 border-black text-xs font-mono uppercase tracking-widest text-[var(--sm-stamp)] font-bold mt-2">
                {activeData.vibe}
              </span>
            </div>
          </div>

          <div className="space-y-6 font-mono text-sm flex-1 overflow-y-auto pr-4">
            <div>
              <h4 className="font-bold uppercase border-b-2 border-black pb-1 mb-2 text-black">Director's Notes</h4>
              <p className="text-gray-700 leading-relaxed">{activeData.desc}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold uppercase border-b-2 border-black pb-1 mb-2 text-black">Mechanics</h4>
                <p className="text-gray-700 leading-relaxed">{activeData.mechanics}</p>
              </div>
              <div>
                <h4 className="font-bold uppercase border-b-2 border-black pb-1 mb-2 text-black">Ideal For</h4>
                <p className="text-gray-700 leading-relaxed">{activeData.idealFor}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold uppercase border-b-2 border-[var(--sm-stamp)] pb-1 mb-2 text-[var(--sm-stamp)]">Warning / Pitfalls</h4>
              <p className="text-gray-700 leading-relaxed">{activeData.warning}</p>
            </div>
          </div>

          <div className="mt-6 sm-btn--ink p-4 border-[2px] border-[var(--sm-ink)] shrink-0">
            <h4 className="font-bold uppercase mb-2 text-[var(--sm-stamp)] text-xs tracking-widest">Cinematic References</h4>
            <p className="text-gray-300 font-mono text-sm">{activeData.examples}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Sparkles, Settings, FileText, Upload, Info, ChevronRight, ChevronLeft, Check, Trash2, Database, UploadCloud, X, Eye, AlertTriangle, Cpu } from "lucide-react";
import { StoryConfig } from "../types";

type FileCategory = 'Lore' | 'Character' | 'Plot' | 'Rules' | 'Other';
interface UploadedFile {
  name: string;
  content: string;
  size: number;
  category: FileCategory;
}

const EXPLAINERS = {
  format: {
    film: {
      title: "Feature Film",
      vibe: "High Stakes & Focused",
      desc: "A self-contained narrative designed to be experienced in a single, breathless sitting. Focuses on a tight character arc and a singular central conflict.",
      mechanics: "A compressed 3-act structure. Every scene must ruthlessly drive the plot forward.",
      idealFor: "High-concept thrillers, tight character studies, and explosive action.",
      warning: "No room for meandering subplots. If it doesn't serve the main arc, cut it.",
      examples: "The Matrix, Parasite, Mad Max: Fury Road"
    },
    limited_series: {
      title: "Limited Series",
      vibe: "Slow Burn & Sprawling",
      desc: "An episodic journey allowing for deep psychological exploration, complex world-building, and multiple interwoven subplots.",
      mechanics: "Episodic arcs that build to a macro-resolution. Requires strong episode-to-episode hooks.",
      idealFor: "Ensemble casts, sprawling mysteries, and generational trauma.",
      warning: "Pacing can drag in the middle episodes if the central mystery isn't compelling enough.",
      examples: "True Detective, Chernobyl, The Queen's Gambit"
    }
  },
  structure: {
    save_the_cat: {
      title: "Save the Cat",
      vibe: "Commercial & Satisfying",
      desc: "The Hollywood gold standard. A 15-beat template that guarantees commercial pacing, clear character transformation, and satisfying payoffs.",
      mechanics: "15 precise beats. Inciting incident at 10%, midpoint false victory/defeat, and an 'all is lost' moment.",
      idealFor: "Commercial fiction, action, accessible thrillers, and blockbusters.",
      warning: "Can feel formulaic and predictable if the beats are hit too rigidly without subversion.",
      examples: "Star Wars, The Avengers, Die Hard"
    },
    dan_harmon: {
      title: "Story Circle",
      vibe: "Circular & Transformative",
      desc: "A protagonist descends into the unknown, adapts, gets what they want, pays a heavy price, and returns forever changed.",
      mechanics: "An 8-step circular journey focusing heavily on the psychological threshold between order and chaos.",
      idealFor: "Character-driven adventures, sci-fi, surrealism, and episodic television.",
      warning: "The 'price paid' must be meaningful, or the return to the status quo feels unearned.",
      examples: "Rick and Morty, Everything Everywhere All at Once, The Matrix"
    },
    john_yorke: {
      title: "John Yorke (5 Acts)",
      vibe: "Psychological Descent",
      desc: "Into the Woods. A 5-act descent into the psychological underworld. Focuses heavily on the protagonist's internal flaw mirroring the external antagonist.",
      mechanics: "5 acts. The protagonist's internal flaw is externalized as the antagonist they must defeat.",
      idealFor: "Tragedies, deep psychological dramas, and prestige television.",
      warning: "Requires a deeply flawed, complex protagonist to work effectively.",
      examples: "The Godfather, Breaking Bad, Hamlet"
    },
    freytag: {
      title: "Freytag's Pyramid",
      vibe: "Classic Tragedy",
      desc: "The classic tragic pyramid. A steady climb of rising action to a devastating climax, followed by an inevitable, crushing fall.",
      mechanics: "Symmetrical rise and fall. The climax occurs in the exact middle of the story.",
      idealFor: "Shakespearean tragedies, cautionary tales, and historical epics.",
      warning: "The falling action (second half) can drag if not paced carefully with new revelations.",
      examples: "Macbeth, There Will Be Blood, Romeo and Juliet"
    },
    sequence: {
      title: "Sequence Approach",
      vibe: "Relentless Pacing",
      desc: "Treats the story as eight 15-minute 'mini-movies', each with its own escalating tension and resolution. Relentless pacing.",
      mechanics: "Eight distinct sequences, each acting as a self-contained narrative loop with its own climax.",
      idealFor: "Action, heist films, survival thrillers, and relentless pacing.",
      warning: "Can feel episodic or exhausting without quiet moments to ground the characters.",
      examples: "The Dark Knight, Raiders of the Lost Ark, Speed"
    },
    kishotenketsu: {
      title: "Kishōtenketsu",
      vibe: "Discovery & Twist",
      desc: "A 4-act East Asian structure driven by discovery and a sudden twist, rather than direct conflict. Focuses on atmosphere and realization.",
      mechanics: "Introduction, Development, Twist, Conclusion. No central conflict required to drive the plot.",
      idealFor: "Atmospheric horror, slice-of-life, surreal mysteries, and philosophical narratives.",
      warning: "Western audiences might find the lack of direct, aggressive conflict jarring or slow.",
      examples: "Spirited Away, My Neighbor Totoro, Parasite (Act 1-3)"
    }
  },
  directorStyle: {
    fincher: {
      title: "David Fincher",
      vibe: "Procedural & Cynical",
      desc: "Procedural, obsessive, and cynical. Meticulous attention to grim details, sickly color palettes, and psychological manipulation.",
      mechanics: "Locked-off camera, precise tracking shots, sickly yellow/green color grading, and obsessive detailing.",
      idealFor: "Serial killer thrillers, corporate espionage, and dark procedurals.",
      warning: "Characters can feel cold, detached, or clinical, making it hard for the audience to empathize.",
      examples: "Se7en, Zodiac, Gone Girl"
    },
    hitchcock: {
      title: "Alfred Hitchcock",
      vibe: "Voyeuristic Suspense",
      desc: "The Master of Suspense. The audience knows the bomb is under the table, but the characters don't. Voyeurism, paranoia, and unbearable tension.",
      mechanics: "Subjective POV, MacGuffins, and ticking clocks visible to the audience but hidden from characters.",
      idealFor: "Paranoia thrillers, wrong-man scenarios, and contained suspense.",
      warning: "Relies heavily on dramatic irony; the audience must know more than the hero for it to work.",
      examples: "Vertigo, Psycho, Rear Window"
    },
    nolan: {
      title: "Christopher Nolan",
      vibe: "Cerebral & Grand",
      desc: "Cerebral, non-linear, and grand. Explores the malleability of time, memory, and subjective reality through massive practical set-pieces.",
      mechanics: "Cross-cutting multiple timelines, massive scale, and exposition-heavy dialogue.",
      idealFor: "Sci-fi thrillers, heist films, and mind-bending conceptual narratives.",
      warning: "The emotional core of the story can easily be buried under complex mechanics and exposition.",
      examples: "Inception, Memento, Interstellar"
    },
    villeneuve: {
      title: "Denis Villeneuve",
      vibe: "Atmospheric Dread",
      desc: "Atmospheric, brutal, and scale-driven. Existential dread wrapped in overwhelming, brutalist environments and slow-burning tension.",
      mechanics: "Brutalist architecture, overwhelming scale, slow deliberate pacing, and oppressive soundscapes.",
      idealFor: "Existential sci-fi, cartel thrillers, and slow-burn mysteries.",
      warning: "The slow, deliberate pacing can alienate audiences looking for quick action or easy answers.",
      examples: "Prisoners, Arrival, Dune, Sicario"
    },
    aster: {
      title: "Ari Aster",
      vibe: "Daylight Horror",
      desc: "Deeply unsettling psychological horror. Focuses on grief, toxic family dynamics, cults, and the complete breakdown of sanity.",
      mechanics: "Daylight horror, hidden background details, visceral grief, and shocking, abrupt violence.",
      idealFor: "Folk horror, family trauma, cult thrillers, and psychological breakdowns.",
      warning: "Extremely disturbing; relies on emotional devastation and trauma over traditional jump scares.",
      examples: "Hereditary, Midsommar, Beau is Afraid"
    },
    lynch: {
      title: "David Lynch",
      vibe: "Surreal Nightmare",
      desc: "Surreal, dreamlike, and terrifyingly abstract. Blurs the line between reality and nightmare, leaving the audience to piece together the subconscious puzzle.",
      mechanics: "Dream logic, ambient industrial soundscapes, uncanny valley performances, and non-sequiturs.",
      idealFor: "Surreal mysteries, psychological breakdowns, and neo-noir nightmares.",
      warning: "Narrative logic is often completely abandoned for emotional truth, which can frustrate viewers.",
      examples: "Mulholland Drive, Twin Peaks, Blue Velvet"
    }
  },
  emotionalArc: {
    rags_to_riches: {
      title: "Rags to Riches",
      vibe: "Triumphant Rise",
      desc: "A steady, hard-fought rise. The protagonist overcomes massive external and internal obstacles to achieve ultimate success.",
      mechanics: "Steady upward trajectory. Obstacles are increasingly difficult but ultimately surmountable.",
      idealFor: "Underdog stories, sports dramas, and triumphant thrillers.",
      warning: "Can lack internal conflict if the hero is too perfect or the obstacles are too easily overcome.",
      examples: "Rocky, Slumdog Millionaire, The Pursuit of Happyness"
    },
    riches_to_rags: {
      title: "Riches to Rags",
      vibe: "Tragic Fall",
      desc: "A tragic, inevitable fall. The protagonist loses everything due to a fatal flaw, hubris, or a cruel world.",
      mechanics: "Steady downward trajectory. The protagonist's flaw destroys them and those around them.",
      idealFor: "Cautionary tales, crime epics, and Shakespearean tragedies.",
      warning: "Can be too depressing if the protagonist isn't compelling or if there is no hope at all.",
      examples: "Goodfellas, Requiem for a Dream, Scarface"
    },
    man_in_a_hole: {
      title: "Man in a Hole",
      vibe: "Fall, then Rise",
      desc: "The protagonist gets into deep trouble, hits rock bottom, and must claw their way back out.",
      mechanics: "Status quo -> Disaster -> Recovery. The classic survival structure.",
      idealFor: "Survival thrillers, redemption arcs, and classic action movies.",
      warning: "The 'hole' (rock bottom) must feel genuinely inescapable for the rise to be satisfying.",
      examples: "The Martian, Die Hard, Alice in Wonderland"
    },
    icarus: {
      title: "Icarus",
      vibe: "Rise, then Fall",
      desc: "The protagonist achieves incredible heights, but their ambition or arrogance causes a spectacular crash.",
      mechanics: "Rapid ascent fueled by ambition, followed by a catastrophic, self-inflicted crash.",
      idealFor: "Biopics, financial thrillers, and hubris-driven tragedies.",
      warning: "The audience must enjoy the rise and the protagonist's success to truly care about the fall.",
      examples: "The Wolf of Wall Street, The Social Network, Citizen Kane"
    },
    cinderella: {
      title: "Cinderella",
      vibe: "Rise, Fall, Rise",
      desc: "Initial success is ripped away by a devastating setback, forcing a final, triumphant comeback.",
      mechanics: "Rise (hope) -> Fall (despair) -> Rise (triumph). The emotional rollercoaster.",
      idealFor: "Coming-of-age stories, romantic thrillers, and superhero origins.",
      warning: "The false victory must feel real, and the subsequent fall must be devastating to make the climax work.",
      examples: "Cinderella, The Matrix, Spider-Man"
    },
    oedipus: {
      title: "Oedipus",
      vibe: "Fall, Rise, Fall",
      desc: "Starts low, achieves temporary, hopeful success, but ultimately meets a tragic, unavoidable end.",
      mechanics: "Fall (curse) -> Rise (false hope) -> Fall (ultimate doom).",
      idealFor: "Noir, fatalistic thrillers, and cosmic horror.",
      warning: "Extremely bleak. The protagonist's fate must feel inevitable, not just like bad luck.",
      examples: "Oedipus Rex, The Godfather Part II, Avengers: Infinity War"
    }
  }
};

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

function ChoiceStep({
  options,
  selectedValue,
  onSelect,
  title,
  icon: Icon
}: {
  options: Record<string, any>;
  selectedValue: string;
  onSelect: (val: string) => void;
  title: string;
  icon: any;
}) {
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
                className={`text-left p-4 brutal-border-thick transition-all flex items-center justify-between group brutal-shadow-hover ${
                  isSelected
                    ? "bg-black text-white border-black"
                    : "bg-white text-black hover:border-[#FF4444]"
                }`}
              >
                <div className="flex items-center gap-4">
                  {isEmotionalArc && (
                    <div className={`p-1 brutal-border ${isSelected ? 'bg-white text-black' : 'bg-black text-white'}`}>
                      <ArcVisual arc={key} className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <div className={`font-bold uppercase tracking-widest ${isSelected ? 'text-white' : 'group-hover:text-[#FF4444]'}`}>
                      {data.title}
                    </div>
                    <div className={`text-[10px] font-mono uppercase mt-1 ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
                      {data.vibe}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-[#FF4444]" />}
              </button>
            );
          })}
        </div>

        {/* Right: Inspector */}
        <div className="w-full lg:w-2/3 bg-gray-50 brutal-border-thick p-6 relative flex flex-col">
          <div className="absolute top-0 right-0 bg-black text-white px-3 py-1 text-[10px] font-mono uppercase tracking-widest brutal-border-thick border-t-0 border-r-0">
            {selectedValue === activeKey ? "Selected" : "Preview"}
          </div>
          
          <div className="mb-6 pr-20 flex items-start gap-6">
            {isEmotionalArc && (
              <div className="p-4 bg-black text-[#FF4444] brutal-border-thick shrink-0">
                <ArcVisual arc={activeKey} className="w-24 h-24" />
              </div>
            )}
            <div>
              <h3 className="text-3xl md:text-4xl font-display uppercase tracking-widest mb-2 text-black leading-none">{activeData.title}</h3>
              <span className="inline-block px-2 py-1 border-2 border-black text-xs font-mono uppercase tracking-widest text-[#FF4444] font-bold mt-2">
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
              <h4 className="font-bold uppercase border-b-2 border-[#FF4444] pb-1 mb-2 text-[#FF4444]">Warning / Pitfalls</h4>
              <p className="text-gray-700 leading-relaxed">{activeData.warning}</p>
            </div>
          </div>

          <div className="mt-6 bg-black text-white p-4 brutal-border-thick shrink-0">
            <h4 className="font-bold uppercase mb-2 text-[#FF4444] text-xs tracking-widest">Cinematic References</h4>
            <p className="text-gray-300 font-mono text-sm">{activeData.examples}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StartScreenProps {
  onStart: (config: StoryConfig) => void;
  isGenerating: boolean;
}

export default function StartScreen({
  onStart,
  isGenerating,
}: StartScreenProps) {
  const [theme, setTheme] = useState("");
  const [backstory, setBackstory] = useState("");
  const [format, setFormat] = useState<StoryConfig["format"]>("film");
  const [structure, setStructure] = useState<StoryConfig["structure"]>("save_the_cat");
  const [directorStyle, setDirectorStyle] = useState<StoryConfig["directorStyle"]>("fincher");
  const [emotionalArc, setEmotionalArc] = useState<StoryConfig["emotionalArc"]>("man_in_a_hole");
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          setUploadedFiles(prev => [...prev, { name: file.name, content: text, size: file.size, category: 'Lore' }]);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    const combinedBackstory = [
      backstory ? `--- MANUAL CONTEXT ---\n${backstory}` : "",
      ...uploadedFiles.map(f => `--- ${f.category.toUpperCase()} DOCUMENT: ${f.name} ---\n${f.content}`)
    ].filter(Boolean).join("\n\n");

    onStart({
      theme: theme || "A psychological thriller about betrayal",
      backstory: combinedBackstory,
      format,
      structure,
      directorStyle,
      emotionalArc,
    });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Brutalist Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 max-w-4xl w-full space-y-8 py-12"
      >
        <div className="space-y-6 border-b-[8px] border-black pb-8">
          <h1 className="text-5xl md:text-7xl font-display uppercase tracking-tighter text-black leading-[0.85]">
            STORY MACHINE
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-lg md:text-xl text-black font-semibold tracking-tight max-w-2xl leading-snug">
              Step {step} of 5
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-4 w-10 border-4 border-black transition-all duration-300 ${i <= step ? 'bg-[#FF4444] shadow-[2px_2px_0px_0px_#000000]' : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white brutal-border-thick brutal-shadow p-8 md:p-12 min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10 flex-1"
              >
                <div className="space-y-6 text-left">
                  <label className="text-xl font-bold text-black uppercase tracking-widest flex items-center gap-3">
                    <BookOpen className="w-8 h-8" />
                    Narrative Theme
                  </label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., A detective haunted by a cold case in a neon city..."
                    className="w-full bg-white brutal-border-thick px-8 py-6 text-black placeholder-gray-400 focus:outline-none focus:ring-0 focus:bg-gray-50 font-mono text-xl brutal-shadow-focus"
                    disabled={isGenerating}
                  />
                  <p className="text-sm font-mono text-gray-500 mt-2">
                    The core idea or logline of your story. Keep it concise.
                  </p>
                </div>

                <div 
                  className={`space-y-6 text-left border-t-4 border-black pt-8 relative transition-colors duration-300 ${isDragging ? 'bg-gray-50' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {isDragging && (
                    <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm border-4 border-dashed border-[#FF4444] flex flex-col items-center justify-center pointer-events-none">
                      <UploadCloud className="w-16 h-16 text-[#FF4444] mb-4 animate-bounce" />
                      <p className="text-2xl font-display uppercase tracking-widest text-[#FF4444]">Drop files to ingest</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <label className="text-xl font-bold text-black uppercase tracking-widest flex items-center gap-3">
                      <Database className="w-8 h-8" />
                      Lore & Knowledge Base
                    </label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 bg-black text-white px-4 py-2 font-mono text-sm uppercase tracking-wider hover:bg-[#FF4444] brutal-border-thick brutal-shadow-hover"
                      disabled={isGenerating}
                    >
                      <Upload className="w-4 h-4" /> Upload Documents
                    </button>
                    <input 
                      type="file" 
                      accept=".txt,.md,.csv,.json" 
                      multiple
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-2">
                      <textarea
                        value={backstory}
                        onChange={(e) => setBackstory(e.target.value)}
                        placeholder="Type manual context here... (e.g., character motivations, specific plot points, world rules)"
                        className="w-full bg-white brutal-border-thick px-6 py-4 text-black placeholder-gray-400 focus:outline-none focus:ring-0 focus:bg-gray-50 font-mono text-sm min-h-[200px] resize-y brutal-shadow-focus"
                        disabled={isGenerating}
                      />
                    </div>
                    
                    <div className="bg-gray-50 brutal-border-thick p-4 flex flex-col h-[200px] overflow-y-auto">
                      <h4 className="font-bold uppercase tracking-widest text-xs border-b-2 border-black pb-2 mb-3 flex justify-between items-center">
                        <span>Ingested Files</span>
                        <div className="flex items-center gap-3">
                          {uploadedFiles.length > 0 && (
                            <button onClick={() => setUploadedFiles([])} className="text-[10px] hover:text-[#FF4444] transition-colors uppercase font-bold">Clear All</button>
                          )}
                          <span className="bg-black text-white px-2 py-0.5">{uploadedFiles.length}</span>
                        </div>
                      </h4>
                      
                      {uploadedFiles.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-2 text-center">
                          <FileText className="w-8 h-8 opacity-50" />
                          <p className="text-xs font-mono">No files attached.<br/>Drag & drop .txt or .md</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="flex flex-col gap-2 bg-white brutal-border p-2 group hover:border-[#FF4444] brutal-shadow-hover">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FileText className="w-3 h-3 flex-shrink-0 text-[#FF4444]" />
                                  <span className="text-xs font-mono truncate" title={file.name}>{file.name}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-[10px] font-mono text-gray-500">{Math.round(file.size / 1024)}kb</span>
                                  <button onClick={() => setPreviewFile(file)} className="text-gray-400 hover:text-black transition-colors" title="Preview">
                                    <Eye className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-[#FF4444] transition-colors" title="Remove">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <select 
                                value={file.category} 
                                onChange={(e) => {
                                  const newFiles = [...uploadedFiles];
                                  newFiles[idx].category = e.target.value as FileCategory;
                                  setUploadedFiles(newFiles);
                                }}
                                className="text-[10px] font-mono p-1 brutal-border bg-gray-50 focus:outline-none cursor-pointer w-full"
                              >
                                <option value="Lore">Lore / Worldbuilding</option>
                                <option value="Character">Character Sheet</option>
                                <option value="Plot">Plot Outline</option>
                                <option value="Rules">Rules / Constraints</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Context Size Indicator */}
                  {(() => {
                    const estimatedTokens = Math.round((backstory.length + uploadedFiles.reduce((acc, f) => acc + f.content.length, 0)) / 4);
                    const maxSafeTokens = 100000;
                    const percentage = Math.min(100, (estimatedTokens / maxSafeTokens) * 100);
                    let barColor = "bg-[#FF4444]";
                    if (percentage > 90) barColor = "bg-red-600 animate-pulse";
                    else if (percentage > 70) barColor = "bg-yellow-500";

                    return (
                      <div className="flex items-center gap-2 bg-black text-white p-2 brutal-border-thick w-full max-w-[200px] ml-auto">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest mb-1">
                            <span className="opacity-0 w-0 overflow-hidden">Context Volume</span>
                            <span className={percentage > 90 ? "text-red-400" : ""}>
                              ~{estimatedTokens.toLocaleString()} Tokens
                            </span>
                          </div>
                          <div className="h-1 w-full bg-gray-800">
                            <div 
                              className={`h-full ${barColor} transition-all duration-500`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        {percentage > 90 ? (
                          <AlertTriangle className="w-3 h-3 text-red-400" title="Approaching context limit" />
                        ) : (
                          <Info className="w-3 h-3 text-gray-400" title="Estimated token count for AI context" />
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <ChoiceStep
                  title="Format"
                  icon={Settings}
                  options={EXPLAINERS.format}
                  selectedValue={format}
                  onSelect={setFormat}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <ChoiceStep
                  title="Structure"
                  icon={Settings}
                  options={EXPLAINERS.structure}
                  selectedValue={structure}
                  onSelect={setStructure}
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <ChoiceStep
                  title="Director Style"
                  icon={Settings}
                  options={EXPLAINERS.directorStyle}
                  selectedValue={directorStyle}
                  onSelect={setDirectorStyle}
                />
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <ChoiceStep
                  title="Emotional Arc"
                  icon={Settings}
                  options={EXPLAINERS.emotionalArc}
                  selectedValue={emotionalArc}
                  onSelect={setEmotionalArc}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center mt-12 pt-8 border-t-[8px] border-black">
            {step > 1 ? (
              <button
                onClick={prevStep}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-4 bg-white text-black brutal-border-thick hover:bg-gray-100 font-bold uppercase tracking-widest brutal-shadow-hover disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
            ) : (
              <div></div> // Spacer
            )}

            {step < 5 ? (
              <button
                onClick={nextStep}
                disabled={isGenerating || (step === 1 && !theme)}
                className="flex items-center gap-2 px-8 py-4 bg-black text-white brutal-border-thick hover:bg-[#FF4444] hover:border-[#FF4444] disabled:opacity-50 font-bold uppercase tracking-widest brutal-shadow-hover disabled:pointer-events-none"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isGenerating}
                className="flex items-center gap-2 px-8 py-4 bg-black text-white brutal-border-thick hover:bg-[#FF4444] hover:border-[#FF4444] disabled:opacity-50 font-bold uppercase tracking-widest brutal-shadow-hover disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    Begin Sequence <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm md:text-base text-black font-mono uppercase tracking-widest space-y-2 border-t-[8px] border-black pt-8 flex flex-col items-center">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-story-machine'))}
            className="mb-8 px-6 py-2 bg-black text-white font-mono text-sm uppercase tracking-widest hover:bg-[#FF4444] transition-colors brutal-border-thick brutal-shadow-hover flex items-center gap-2"
          >
            <Cpu className="w-4 h-4" /> Open OASIS Story Machine
          </button>
          <p className="font-bold">Powered by Gemini 3.1 Pro & Flash Image Preview</p>
          <p className="text-gray-600">
            Experience Management • Dynamic Generation • Psychological Modeling
          </p>
        </div>
      </motion.div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white brutal-border-thick brutal-shadow w-full max-w-3xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b-4 border-black bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#FF4444]" />
                  <h3 className="font-bold uppercase tracking-widest text-sm truncate max-w-[300px]">{previewFile.name}</h3>
                  <span className="text-[10px] font-mono bg-black text-white px-2 py-1 uppercase">{previewFile.category}</span>
                </div>
                <button onClick={() => setPreviewFile(null)} className="p-1 hover:bg-gray-200 transition-colors brutal-border">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-gray-800 flex-1">
                {previewFile.content}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

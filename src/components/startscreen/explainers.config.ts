export interface ExplainerEntry {
  title: string;
  vibe: string;
  desc: string;
  mechanics: string;
  idealFor: string;
  warning: string;
  examples: string;
}

export interface Explainers {
  format: Record<string, ExplainerEntry>;
  structure: Record<string, ExplainerEntry>;
  directorStyle: Record<string, ExplainerEntry>;
  emotionalArc: Record<string, ExplainerEntry>;
}

export const EXPLAINERS: Explainers = {
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

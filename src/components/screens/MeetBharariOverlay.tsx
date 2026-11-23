import { ArrowRight, Feather, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { GREET_REACTIONS, MEET_BHARARI_DIALOGUES } from '../../data/dialogue';

interface MeetBharariOverlayProps {
  bharariScreenPos: { x: number; y: number; visible: boolean };
  onGreetBharari: () => void;
  onStartFlyingJourney: () => void;
  onGoDirectlyToVillage: () => void;
}

/**
 * Screen 2 — Meet Bharari Screen
 * Displays a curvilinear storybook speech bubble with an organic teardrop tail
 * oriented toward Bharari, plus interactive greeting and launch into the Flying Journey.
 */
export function MeetBharariOverlay({
  bharariScreenPos,
  onGreetBharari,
  onStartFlyingJourney,
  onGoDirectlyToVillage,
}: MeetBharariOverlayProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [greetCount, setGreetCount] = useState(0);
  const [reactionText, setReactionText] = useState<string | null>(null);

  const currentLine = MEET_BHARARI_DIALOGUES[lineIndex];

  const handleSayHello = () => {
    onGreetBharari();
    setReactionText(GREET_REACTIONS[greetCount % GREET_REACTIONS.length]);
    setGreetCount((c) => c + 1);
  };

  const handleNextLine = () => {
    setReactionText(null);
    if (lineIndex < MEET_BHARARI_DIALOGUES.length - 1) {
      setLineIndex((i) => i + 1);
      onGreetBharari();
    } else {
      onStartFlyingJourney();
    }
  };

  // Determine whether Bharari is to the left or right of center for tail orientation
  const isBharariOnLeft =
    typeof window !== 'undefined' && bharariScreenPos.visible
      ? bharariScreenPos.x < window.innerWidth * 0.52
      : true;

  return (
    <section
      aria-label="Meet Bharari"
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-end px-4 pb-5 pt-16 md:justify-center md:px-10 md:py-20"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center md:items-end">
        {/* Curvilinear Storybook Speech Bubble */}
        <div className="garad-glass pointer-events-auto relative w-full max-w-[380px] rounded-[1.75rem] p-5">
          {/* Organic SVG teardrop tail pointing toward Bharari on desktop */}
          <svg
            aria-hidden="true"
            viewBox="0 0 28 36"
            className={`pointer-events-none absolute top-1/2 hidden h-8 w-6 -translate-y-1/2 md:block ${
              isBharariOnLeft ? '-left-5' : '-right-5 scale-x-[-1]'
            }`}
          >
            <path
              d="M28 2 C18 8, 8 14, 2 18 C8 22, 18 28, 28 34 Z"
              fill="rgba(255, 250, 244, 0.88)"
              stroke="rgba(255, 255, 255, 0.92)"
              strokeWidth="1.2"
            />
          </svg>

          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold tracking-wide text-[#006783]">
            <span>Meet Bharari · Your Village Guide</span>
            <span className="tabular-nums text-[#8c7169]">
              {lineIndex + 1} / {MEET_BHARARI_DIALOGUES.length}
            </span>
          </div>

          <h2 className="mt-2 text-xl font-bold leading-snug tracking-[-0.015em] text-[#1f1b16] md:text-[23px]">
            {currentLine.headline}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-[#2b2621]">
            {reactionText ?? currentLine.body}
          </p>

          {/* Interactive Bharari Greeting & Story Progression */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSayHello}
              className="garad-pill-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#d85a2a]" aria-hidden="true" />
              <span>Say Hello to Bharari</span>
            </button>

            {lineIndex < MEET_BHARARI_DIALOGUES.length - 1 ? (
              <button
                type="button"
                onClick={handleNextLine}
                className="garad-pill-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartFlyingJourney}
                className="garad-pill-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold"
              >
                <Feather className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Fly Over the Village</span>
              </button>
            )}
          </div>

          {/* Direct Flight / Overview Links */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#e0c0b6]/45 pt-3 text-xs">
            <button
              type="button"
              onClick={onStartFlyingJourney}
              className="font-semibold text-[#a53604] underline-offset-4 hover:underline"
            >
              Start Flying Journey
            </button>
            <button
              type="button"
              onClick={onGoDirectlyToVillage}
              className="font-semibold text-[#58423a] underline-offset-4 hover:text-[#1f1b16] hover:underline"
            >
              Go to Connected Village
            </button>
          </div>

          {/* Honest Replaceable Character Module Disclosure */}
          <p className="mt-2.5 text-[11px] leading-snug text-[#8c7169]">
            Stylized procedural stand-in preserving Bharari’s approved blue, teal, orange,
            and schoolbag identity; structured as a replaceable 3D character module.
          </p>
        </div>
      </div>
    </section>
  );
}

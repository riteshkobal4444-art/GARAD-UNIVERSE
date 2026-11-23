import { ArrowRight, Footprints } from 'lucide-react';

interface WelcomeOverlayProps {
  onExplore: () => void;
  onJumpToVillage: () => void;
  onEnterSchoolAdventure: () => void;
}

/**
 * Screen 1 — Welcome Screen
 * Frames the sunlit 3D panorama of Garad Village with storybook typography
 * and the focal "Explore Garad Universe" action.
 */
export function WelcomeOverlay({
  onExplore,
  onJumpToVillage,
  onEnterSchoolAdventure,
}: WelcomeOverlayProps) {
  return (
    <section
      aria-label="Welcome to Garad Universe"
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between px-5 pb-6 pt-20 md:px-10 md:pb-10 md:pt-24"
    >
      {/* Light editorial title lockup leaving the sunlit village & Bharari unobstructed */}
      <div className="pointer-events-auto max-w-lg">
        <p className="text-xs font-bold tracking-[0.06em] text-[#822700]">
          Garad Foundation · Interactive 3D Village
        </p>

        <h1 className="mt-2.5 text-4xl font-extrabold leading-[1.06] tracking-[-0.03em] text-[#1f1b16] drop-shadow-[0_2px_14px_rgba(255,248,244,0.9)] md:text-[54px]">
          Garad Universe
        </h1>

        <p className="mt-2 text-lg font-semibold tracking-[-0.01em] text-[#58423a] drop-shadow-[0_1px_10px_rgba(255,248,244,0.9)] md:text-2xl">
          A Little World. A Thousand Dreams.
        </p>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#2b2621]/90 drop-shadow-[0_1px_8px_rgba(255,248,244,0.95)]">
          Journey alongside Bharari through a connected village celebrating education,
          youth development, and community empowerment.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onExplore}
            className="garad-pill-primary inline-flex items-center gap-2 whitespace-nowrap rounded-full px-6 py-3 text-sm font-bold tracking-[0.01em]"
          >
            <span>Explore Garad Universe</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onEnterSchoolAdventure}
            className="garad-pill-secondary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4.5 py-3 text-sm font-semibold"
          >
            <Footprints className="h-4 w-4 text-[#d85a2a]" aria-hidden="true" />
            <span>Mission Bharari School</span>
          </button>

          <button
            type="button"
            onClick={onJumpToVillage}
            className="garad-pill-secondary inline-flex items-center whitespace-nowrap rounded-full px-4.5 py-3 text-sm font-semibold"
          >
            Village Overview
          </button>
        </div>
      </div>

      {/* Subtle bottom attribution */}
      <div className="pointer-events-none flex items-end justify-between">
        <span className="garad-glass-subtle rounded-full px-3.5 py-1.5 text-[11px] font-medium text-[#58423a]">
          Interactive Animated World
        </span>
      </div>
    </section>
  );
}

import { Compass } from 'lucide-react';
import { DESTINATIONS_BY_ID } from '../../data/destinations';
import type { DestinationId } from '../../types/universe';

interface FlyingJourneyOverlayProps {
  progress: number;
  activeLandmark: DestinationId;
  onLandInVillage: () => void;
}

/**
 * Screen 3 — Flying Journey Screen
 * Minimal cinematic HUD framing Bharari's aerial tour across the connected village.
 */
export function FlyingJourneyOverlay({
  progress,
  activeLandmark,
  onLandInVillage,
}: FlyingJourneyOverlayProps) {
  const landmark = DESTINATIONS_BY_ID[activeLandmark];
  const pct = Math.round(Math.min(100, Math.max(0, progress * 100)));

  return (
    <section
      aria-label="Flying Journey over Garad Village"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-10 flex flex-col items-center px-4 md:bottom-6 md:px-10"
    >
      <div className="garad-glass pointer-events-auto w-full max-w-xl rounded-[1.5rem] px-4 py-3 md:px-5 md:py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold tracking-wide text-[#006783]">
              Flying Journey · {landmark.name} — {landmark.programmeTitle}
            </p>
            <p className="mt-0.5 text-xs font-bold leading-snug text-[#1f1b16] md:text-sm">
              {landmark.flyoverCaption}
            </p>
          </div>

          <button
            type="button"
            onClick={onLandInVillage}
            className="garad-pill-secondary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Land in Village</span>
          </button>
        </div>

        {/* Golden-Saffron Journey Progress Scrubber */}
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e0c0b6]/50">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #D85A2A 0%, #F5B738 100%)',
              }}
            />
          </div>
          <span className="tabular-nums text-[11px] font-semibold text-[#58423a]">
            {pct}%
          </span>
        </div>
      </div>
    </section>
  );
}

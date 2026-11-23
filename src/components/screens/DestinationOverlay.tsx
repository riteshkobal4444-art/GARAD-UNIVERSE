import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Sparkles,
} from 'lucide-react';
import {
  DESTINATIONS_BY_ID,
  getAdjacentDestination,
  VILLAGE_DESTINATIONS,
} from '../../data/destinations';
import type { DestinationId } from '../../types/universe';

interface DestinationOverlayProps {
  destinationId: DestinationId;
  dockCollapsed: boolean;
  onDiscoverMore: () => void;
  onEnterSchoolAdventure: () => void;
  onBackToVillage: () => void;
  onSelectDestination: (id: DestinationId) => void;
  onGreetBharari: () => void;
}

/**
 * Screen 5 — Destination Experience
 * Frames the focused 3D landmark while giving the visitor Bharari's welcoming note,
 * "Discover More" (opens Screen 6), "Back to Village", and seamless next/prev hopping.
 */
export function DestinationOverlay({
  destinationId,
  dockCollapsed,
  onDiscoverMore,
  onEnterSchoolAdventure,
  onBackToVillage,
  onSelectDestination,
  onGreetBharari,
}: DestinationOverlayProps) {
  const destination = DESTINATIONS_BY_ID[destinationId];
  const prevDest = getAdjacentDestination(destinationId, 'prev');
  const nextDest = getAdjacentDestination(destinationId, 'next');
  const isPlayableSchool = destinationId === 'village-school';

  return (
    <section
      aria-label={`${destination.name} — ${destination.programmeTitle}`}
      className={`pointer-events-none fixed inset-x-0 z-10 flex justify-center px-4 transition-all duration-200 md:justify-start md:px-8 ${
        dockCollapsed ? 'bottom-12 md:bottom-14' : 'bottom-[4.5rem] md:bottom-24'
      }`}
    >
      <div className="garad-glass pointer-events-auto w-full max-w-[376px] rounded-[1.75rem] p-4 md:p-5">
        {/* Quiet editorial metadata — zero static pill clutter */}
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#58423a]">
          <span style={{ color: destination.accentHex }}>
            0{destination.order}. {destination.programmeTitle}
          </span>
          <span className="tabular-nums text-[#8c7169]">
            {destination.order} / {VILLAGE_DESTINATIONS.length}
          </span>
        </div>

        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-[#1f1b16] md:text-[24px]">
          {destination.name}
        </h2>

        <p className="mt-0.5 text-xs font-medium text-[#58423a]">
          {destination.themeLabel} · {destination.shortSubtitle}
        </p>

        {/* Bharari's local welcoming dialogue */}
        <div className="mt-3 rounded-[1.1rem] border border-white/75 bg-[#fffaf4]/78 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#2b2621]">
          <p>“{destination.bharariGreeting}”</p>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#8c7169]">
            <span>— Bharari</span>
            <button
              type="button"
              onClick={onGreetBharari}
              className="inline-flex items-center gap-1 font-semibold text-[#006783] hover:underline"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              <span>Wave to Bharari</span>
            </button>
          </div>
        </div>

        {/* Primary & Secondary Destination Actions */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {isPlayableSchool && (
            <button
              type="button"
              onClick={onEnterSchoolAdventure}
              className="garad-pill-primary inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold md:text-[13px]"
            >
              <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Enter Mission Bharari School (Playable 3D)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDiscoverMore}
            className={`${
              isPlayableSchool ? 'garad-pill-secondary' : 'garad-pill-primary'
            } inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold md:flex-none md:text-[13px]`}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Discover More</span>
          </button>

          <button
            type="button"
            onClick={onBackToVillage}
            className="garad-pill-secondary inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2.5 text-xs font-bold md:text-[13px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Village</span>
          </button>
        </div>

        {/* Connected Village Prev / Next Destination Stepping */}
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#e0c0b6]/45 pt-2.5 text-xs">
          <button
            type="button"
            onClick={() => onSelectDestination(prevDest.id)}
            className="inline-flex items-center gap-1 font-semibold text-[#58423a] transition-colors hover:text-[#1f1b16]"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{prevDest.name}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectDestination(nextDest.id)}
            className="inline-flex items-center gap-1 font-semibold text-[#58423a] transition-colors hover:text-[#1f1b16]"
          >
            <span>{nextDest.name}</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

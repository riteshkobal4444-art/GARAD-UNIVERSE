import { MapPin } from 'lucide-react';
import { VILLAGE_DESTINATIONS } from '../../data/destinations';
import type { DestinationId, ProjectedPin } from '../../types/universe';

interface VillageOverviewOverlayProps {
  pins: Record<DestinationId, ProjectedPin> | null;
  hoveredDestination: DestinationId | null;
  visitedDestinations: DestinationId[];
  onSelectDestination: (id: DestinationId) => void;
  onHoverDestination: (id: DestinationId | null) => void;
}

/**
 * Screen 4 — Connected Village Overview
 * Renders 3D-projected interactive landmark pins anchored directly above each
 * village building so visitors can click either the 3D architecture or its floating
 * storybook label. On mobile, pins stay compact and work alongside the bottom strip.
 */
export function VillageOverviewOverlay({
  pins,
  hoveredDestination,
  visitedDestinations,
  onSelectDestination,
  onHoverDestination,
}: VillageOverviewOverlayProps) {
  return (
    <section
      aria-label="Connected Village Overview"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      {/* Subtle non-obstructive top guidance banner */}
      <div className="mt-[4.25rem] flex justify-center px-4 md:mt-[4.5rem]">
        <div className="garad-glass-subtle pointer-events-auto rounded-full px-3.5 py-1 text-center text-[11px] font-medium text-[#58423a]">
          Select any destination in Garad Village to fly there with Bharari · Drag to orbit
        </div>
      </div>

      {/* 3D-Projected Interactive Destination Pins */}
      {pins &&
        VILLAGE_DESTINATIONS.map((dest) => {
          const pin = pins[dest.id];
          if (!pin || !pin.visible) return null;

          // Keep pins comfortably inside the visible stage bounds
          const isHovered = hoveredDestination === dest.id;
          const isVisited = visitedDestinations.includes(dest.id);

          return (
            <button
              key={dest.id}
              type="button"
              onClick={() => onSelectDestination(dest.id)}
              onMouseEnter={() => onHoverDestination(dest.id)}
              onMouseLeave={() => onHoverDestination(null)}
              style={{
                transform: `translate3d(${Math.round(pin.x)}px, ${Math.round(pin.y)}px, 0) translate(-50%, -100%)`,
              }}
              className={`pointer-events-auto absolute left-0 top-0 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-left transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738] sm:inline-flex ${
                isHovered
                  ? 'z-20 bg-[#d85a2a] text-white shadow-[0_0_0_3px_rgba(245,183,56,0.4),0_10px_22px_-4px_rgba(43,38,33,0.28)]'
                  : 'garad-glass z-10 text-[#1f1b16] hover:bg-white/95'
              }`}
              aria-label={`Visit ${dest.name} — ${dest.programmeTitle}`}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                style={{
                  backgroundColor: isHovered ? 'rgba(255,255,255,0.22)' : dest.accentHex,
                }}
                aria-hidden="true"
              >
                <MapPin className="h-3 w-3" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="whitespace-nowrap text-[11px] font-bold">{dest.name}</span>
                <span
                  className={`whitespace-nowrap text-[10px] font-medium ${
                    isHovered ? 'text-white/90' : 'text-[#58423a]'
                  }`}
                >
                  {dest.programmeTitle}
                  {isVisited ? ' · Visited' : ''}
                </span>
              </span>
            </button>
          );
        })}
    </section>
  );
}

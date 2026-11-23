import { ChevronDown, ChevronUp, Compass, Plane } from 'lucide-react';
import { VILLAGE_DESTINATIONS } from '../../data/destinations';
import type { DestinationId, ScreenId } from '../../types/universe';

interface VillageDockProps {
  screen: ScreenId;
  selectedDestination: DestinationId | null;
  hoveredDestination: DestinationId | null;
  visitedDestinations: DestinationId[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectDestination: (id: DestinationId) => void;
  onHoverDestination: (id: DestinationId | null) => void;
  onBackToVillage: () => void;
  onReplayFlight: () => void;
}

/**
 * Collapsible bottom village navigation dock & mobile simplified switcher.
 * Keeps the central 3D viewport unobstructed while giving one-tap access to
 * all five connected Garad Village destinations.
 */
export function VillageDock({
  screen,
  selectedDestination,
  hoveredDestination,
  visitedDestinations,
  collapsed,
  onToggleCollapsed,
  onSelectDestination,
  onHoverDestination,
  onBackToVillage,
  onReplayFlight,
}: VillageDockProps) {
  if (screen !== 'village-overview' && screen !== 'destination') {
    return null;
  }

  const activeIndex = selectedDestination
    ? VILLAGE_DESTINATIONS.findIndex((d) => d.id === selectedDestination)
    : -1;
  const progressPercent =
    activeIndex >= 0
      ? ((activeIndex + 1) / VILLAGE_DESTINATIONS.length) * 100
      : Math.max(8, (visitedDestinations.length / VILLAGE_DESTINATIONS.length) * 100);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2.5 z-20 flex flex-col items-center px-3 md:bottom-4 md:px-6">
      {/* Collapse / Expand Cinema Toggle (desktop & tablet) */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="garad-glass-subtle pointer-events-auto mb-1 hidden items-center gap-1 rounded-full px-3 py-0.5 text-[11px] font-semibold text-[#58423a] transition-colors hover:bg-white hover:text-[#1f1b16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738] md:inline-flex"
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <>
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
            <span>Show Map</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
            <span>Hide</span>
          </>
        )}
      </button>

      {/* Main Compact Dock Container */}
      <div
        className={`garad-glass pointer-events-auto w-full max-w-[860px] rounded-full px-2.5 py-2 transition-all duration-200 md:px-4 md:py-2 ${
          collapsed
            ? 'pointer-events-none translate-y-14 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Slender Saffron-to-Gold Journey Progress Scrubber */}
        <div
          className="mb-1.5 hidden h-[3px] w-full overflow-hidden rounded-full bg-[#e0c0b6]/45 md:block"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #D85A2A 0%, #F5B738 100%)',
            }}
          />
        </div>

        {/* Desktop & Mobile Responsive Destination Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto md:justify-between md:overflow-visible">
          {/* Overview Button */}
          <button
            type="button"
            onClick={onBackToVillage}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738] ${
              screen === 'village-overview'
                ? 'bg-[#2b2621] text-white'
                : 'bg-[#f7ece4]/80 text-[#2b2621] hover:bg-white'
            }`}
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Village</span>
          </button>

          {/* Five Connected Village Waypoints */}
          <div
            className="flex items-center gap-1 md:gap-1.5"
            role="navigation"
            aria-label="Village destinations"
          >
            {VILLAGE_DESTINATIONS.map((dest) => {
              const isSelected = selectedDestination === dest.id && screen === 'destination';
              const isHovered = hoveredDestination === dest.id;
              const isVisited = visitedDestinations.includes(dest.id);

              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => onSelectDestination(dest.id)}
                  onMouseEnter={() => onHoverDestination(dest.id)}
                  onMouseLeave={() => onHoverDestination(null)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738] ${
                    isSelected
                      ? 'bg-[#d85a2a] text-white shadow-sm'
                      : isHovered
                        ? 'bg-white text-[#1f1b16] ring-1 ring-[#f5b738]'
                        : 'bg-white/65 text-[#2b2621] hover:bg-white'
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: isSelected
                        ? '#ffffff'
                        : isVisited
                          ? dest.accentHex
                          : '#c9b39a',
                    }}
                    aria-hidden="true"
                  />
                  <span>{dest.name}</span>
                </button>
              );
            })}
          </div>

          {/* Replay Flying Tour shortcut (desktop) */}
          <button
            type="button"
            onClick={onReplayFlight}
            title="Fly over the village again"
            className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#bde9ff]/55 px-3 py-1.5 text-xs font-semibold text-[#004d64] transition-colors hover:bg-[#bde9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738] lg:flex"
          >
            <Plane className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Fly Tour</span>
          </button>
        </div>
      </div>
    </div>
  );
}

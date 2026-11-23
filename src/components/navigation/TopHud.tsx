import {
  Compass,
  Moon,
  RotateCcw,
  Settings,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ScreenId, TimeOfDayMode } from '../../types/universe';

interface TopHudProps {
  screen: ScreenId;
  timeOfDay: TimeOfDayMode;
  soundEnabled: boolean;
  onChangeTimeOfDay: (mode: TimeOfDayMode) => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onGoCentralHub: () => void;
  onGoHome: () => void;
  onGoMeetBharari: () => void;
  onGoVillage: () => void;
  onEnterSchoolAdventure: () => void;
  onReplayFlight: () => void;
  onResetCamera: () => void;
}

const TIME_MODES: Array<{
  id: TimeOfDayMode;
  label: string;
  title: string;
  Icon: typeof Sun;
  activeClass: string;
}> = [
  {
    id: 'day',
    label: 'Day',
    title: 'Bright natural daylight',
    Icon: Sun,
    activeClass: 'bg-[#f5b738] text-[#1f1b16]',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    title: 'Warm golden sunset',
    Icon: Sunset,
    activeClass: 'bg-[#d85a2a] text-white',
  },
  {
    id: 'night',
    label: 'Night',
    title: 'Starlit village night with fireflies',
    Icon: Moon,
    activeClass: 'bg-[#1c3563] text-[#f9e8b8]',
  },
];

export function TopHud({
  screen,
  timeOfDay,
  soundEnabled,
  onChangeTimeOfDay,
  onToggleSound,
  onOpenSettings,
  onGoCentralHub,
  onGoHome,
  onGoMeetBharari,
  onGoVillage,
  onEnterSchoolAdventure,
  onReplayFlight,
  onResetCamera,
}: TopHudProps) {
  const showStageLinks = screen !== 'welcome';
  const showCameraReset = screen === 'village-overview' || screen === 'destination';

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 py-3 md:gap-3 md:px-8 md:py-5">
      {/* Zone 1: Clean single-line brand wordmark -> returns to Central Hub */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onGoCentralHub}
          className="garad-glass-subtle flex items-center gap-2 rounded-full px-3 py-1.5 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738] md:px-3.5"
          aria-label="Return to Central Hub Island"
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d85a2a] text-[11px] font-extrabold text-white"
            aria-hidden="true"
          >
            G
          </span>
          <span className="whitespace-nowrap text-[13px] font-extrabold tracking-tight text-[#1f1b16] md:text-sm">
            Central Hub
          </span>
        </button>
      </div>

      {/* Zone 2: Minimal lightweight stage navigation links on desktop */}
      {showStageLinks && (
        <nav
          aria-label="Experience stages"
          className="garad-glass-subtle pointer-events-auto hidden items-center gap-0.5 rounded-full p-1 lg:flex"
        >
          <button
            type="button"
            onClick={onGoHome}
            className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-[#58423a] transition-colors hover:bg-white/75 hover:text-[#1f1b16]"
          >
            Welcome
          </button>
          <button
            type="button"
            onClick={onGoMeetBharari}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              screen === 'meet-bharari'
                ? 'bg-[#d85a2a] text-white'
                : 'text-[#58423a] hover:bg-white/75 hover:text-[#1f1b16]'
            }`}
          >
            Meet Bharari
          </button>
          <button
            type="button"
            onClick={onReplayFlight}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              screen === 'flying-journey'
                ? 'bg-[#d85a2a] text-white'
                : 'text-[#58423a] hover:bg-white/75 hover:text-[#1f1b16]'
            }`}
          >
            Flying Journey
          </button>
          <button
            type="button"
            onClick={onGoVillage}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              screen === 'village-overview' || screen === 'destination'
                ? 'bg-[#d85a2a] text-white'
                : 'text-[#58423a] hover:bg-white/75 hover:text-[#1f1b16]'
            }`}
          >
            Village
          </button>
          <button
            type="button"
            onClick={onEnterSchoolAdventure}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              screen === 'school-adventure'
                ? 'bg-[#d85a2a] text-white'
                : 'text-[#58423a] hover:bg-white/75 hover:text-[#1f1b16]'
            }`}
          >
            School Adventure
          </button>
        </nav>
      )}

      {/* Zone 3: Compact Time-of-Day selector + camera reset + sound + settings */}
      <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 md:gap-2">
        <div
          role="group"
          aria-label="Village time of day"
          className="garad-glass-subtle flex items-center gap-0.5 rounded-full p-1"
        >
          {TIME_MODES.map(({ id, label, title, Icon, activeClass }) => {
            const active = timeOfDay === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeTimeOfDay(id)}
                title={title}
                aria-label={title}
                aria-pressed={active}
                className={`flex h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738] sm:px-2.5 ${
                  active
                    ? activeClass
                    : 'text-[#58423a] hover:bg-white/75 hover:text-[#1f1b16]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {screen === 'meet-bharari' && (
          <button
            type="button"
            onClick={onGoVillage}
            className="garad-glass-subtle flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[#005b74] transition-colors hover:bg-white lg:hidden"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Village</span>
          </button>
        )}

        {showCameraReset && (
          <button
            type="button"
            onClick={onResetCamera}
            title="Reset camera view"
            aria-label="Reset camera view"
            className="garad-glass-subtle flex h-10 w-10 items-center justify-center rounded-full text-[#1f1b16] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute soundscape' : 'Enable soundscape'}
          aria-label={soundEnabled ? 'Mute soundscape' : 'Enable soundscape'}
          aria-pressed={soundEnabled}
          className={`garad-glass-subtle flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738] ${
            soundEnabled ? 'text-[#d85a2a]' : 'text-[#58423a]'
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="World settings"
          aria-label="World settings"
          className="garad-glass-subtle flex h-10 w-10 items-center justify-center rounded-full text-[#1f1b16] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b738]"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

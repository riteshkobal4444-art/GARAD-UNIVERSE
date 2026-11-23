import {
  Compass,
  Moon,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  ExplorerSettings,
  GraphicsQuality,
  ScreenId,
  TimeOfDayMode,
} from '../../types/universe';

interface SettingsModalProps {
  open: boolean;
  screen: ScreenId;
  timeOfDay: TimeOfDayMode;
  settings: ExplorerSettings;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<ExplorerSettings>) => void;
  onUpdateAudio: (patch: Partial<ExplorerSettings['audio']>) => void;
  onChangeTimeOfDay: (mode: TimeOfDayMode) => void;
  onNavigateScreen: (screen: ScreenId) => void;
  onReplayCloudArrival: () => void;
}

const TIME_OPTIONS: Array<{ id: TimeOfDayMode; label: string; Icon: typeof Sun }> = [
  { id: 'day', label: 'Day', Icon: Sun },
  { id: 'sunset', label: 'Sunset', Icon: Sunset },
  { id: 'night', label: 'Night', Icon: Moon },
];

export function SettingsModal({
  open,
  screen,
  timeOfDay,
  settings,
  onClose,
  onUpdateSettings,
  onUpdateAudio,
  onChangeTimeOfDay,
  onNavigateScreen,
  onReplayCloudArrival,
}: SettingsModalProps) {
  if (!open) return null;

  const { audio } = settings;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14100c]/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="garad-settings-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-[#e3d3b8] bg-[#fdf8ee] p-6 text-[#1f1b16] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8dcc8] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d85a2a] text-white">
              <Sliders className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="garad-settings-title"
                className="text-lg font-extrabold tracking-tight text-[#1f1b16]"
              >
                World Settings
              </h2>
              <p className="text-xs font-medium text-[#6b5344]">
                Audio balance, camera comfort &amp; world travel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e3d3b8] bg-white text-[#4f3c31] transition-colors hover:bg-[#f4ebdc]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* 1. Audio Mix */}
          <section aria-label="Audio controls">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a5d48]">
                Immersive Audio
              </h3>
              <button
                type="button"
                onClick={() => onUpdateAudio({ muted: !audio.muted })}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  audio.muted
                    ? 'border border-[#dfd1bc] bg-white text-[#5d473a]'
                    : 'bg-[#d85a2a] text-white'
                }`}
              >
                {audio.muted ? (
                  <>
                    <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    Muted
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Sound On
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 space-y-3 rounded-xl border border-[#eadfcf] bg-white/85 p-4">
              {(
                [
                  { key: 'master', label: 'Master Volume', val: audio.master },
                  { key: 'music', label: 'World Music', val: audio.music },
                  { key: 'environment', label: 'Nature & Ambience', val: audio.environment },
                  { key: 'footsteps', label: 'Footsteps', val: audio.footsteps },
                  { key: 'sfx', label: 'Interactions & Bharari', val: audio.sfx },
                ] as const
              ).map((row) => (
                <div key={row.key} className="grid grid-cols-[125px_1fr_36px] items-center gap-3">
                  <label
                    htmlFor={`audio-${row.key}`}
                    className="text-xs font-semibold text-[#3f3026]"
                  >
                    {row.label}
                  </label>
                  <input
                    id={`audio-${row.key}`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={row.val}
                    disabled={audio.muted}
                    onChange={(e) =>
                      onUpdateAudio({ [row.key]: Number(e.target.value) })
                    }
                    className="h-1.5 w-full cursor-pointer accent-[#d85a2a] disabled:opacity-45"
                  />
                  <span className="text-right text-[11px] font-bold tabular-nums text-[#6d5648]">
                    {Math.round(row.val * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Camera Sensitivity & Graphics Quality */}
          <section aria-label="Camera and visual quality" className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#eadfcf] bg-white/85 p-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="camera-sensitivity"
                  className="text-xs font-bold uppercase tracking-wider text-[#7a5d48]"
                >
                  Camera Sensitivity
                </label>
                <span className="text-xs font-bold tabular-nums text-[#3f3026]">
                  {settings.cameraSensitivity.toFixed(1)}×
                </span>
              </div>
              <input
                id="camera-sensitivity"
                type="range"
                min={0.4}
                max={2.0}
                step={0.1}
                value={settings.cameraSensitivity}
                onChange={(e) =>
                  onUpdateSettings({ cameraSensitivity: Number(e.target.value) })
                }
                className="mt-3 h-1.5 w-full cursor-pointer accent-[#d85a2a]"
              />
              <div className="mt-1.5 flex justify-between text-[10px] font-medium text-[#7e6757]">
                <span>Gentle</span>
                <span>Standard</span>
                <span>Responsive</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#eadfcf] bg-white/85 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7a5d48]">
                Graphics Quality
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {(['high', 'balanced'] as GraphicsQuality[]).map((q) => {
                  const active = settings.graphicsQuality === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onUpdateSettings({ graphicsQuality: q })}
                      className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition-colors ${
                        active
                          ? 'bg-[#1f4d5e] text-white'
                          : 'border border-[#e4d8c4] bg-[#faf4e8] text-[#4e3b2f] hover:bg-[#f2e7d5]'
                      }`}
                    >
                      {q}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-[#7a6456]">
                Balanced lowers pixel ratio for older laptops &amp; phones.
              </p>
            </div>
          </section>

          {/* 3. Sky & Time of Day */}
          <section aria-label="Time of day">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a5d48]">
              Atmosphere &amp; Sky
            </h3>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map(({ id, label, Icon }) => {
                const active = timeOfDay === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeTimeOfDay(id)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
                      active
                        ? 'bg-[#d85a2a] text-white'
                        : 'border border-[#e4d8c4] bg-white text-[#4b382d] hover:bg-[#f5ecdd]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Direct World Navigation */}
          <section aria-label="World navigation">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a5d48]">
              Explore Worlds
            </h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateScreen('central-hub');
                }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                  screen === 'central-hub'
                    ? 'border-[#d85a2a] bg-[#fff1e6] text-[#a93f18]'
                    : 'border-[#e4d8c4] bg-white text-[#3b2c23] hover:bg-[#f5ecdd]'
                }`}
              >
                <Compass className="h-4 w-4 shrink-0 text-[#d85a2a]" aria-hidden="true" />
                Central Hub Island
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReplayCloudArrival();
                }}
                className="flex items-center gap-2 rounded-xl border border-[#e4d8c4] bg-white px-3 py-2.5 text-left text-xs font-bold text-[#3b2c23] transition-colors hover:bg-[#f5ecdd]"
              >
                <RotateCcw className="h-4 w-4 shrink-0 text-[#1d7465]" aria-hidden="true" />
                Replay Cloud Arrival
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateScreen('school-adventure');
                }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                  screen === 'school-adventure'
                    ? 'border-[#d85a2a] bg-[#fff1e6] text-[#a93f18]'
                    : 'border-[#e4d8c4] bg-white text-[#3b2c23] hover:bg-[#f5ecdd]'
                }`}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[#d85a2a]" aria-hidden="true" />
                Mission Bharari Village
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateScreen('village-overview');
                }}
                className="flex items-center gap-2 rounded-xl border border-[#e4d8c4] bg-white px-3 py-2.5 text-left text-xs font-bold text-[#3b2c23] transition-colors hover:bg-[#f5ecdd]"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[#c97b23]" aria-hidden="true" />
                Village Aerial Overview
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateScreen('abhivyakta-world');
                }}
                className="flex items-center gap-2 rounded-xl border border-[#e4d8c4] bg-white px-3 py-2.5 text-left text-xs font-bold text-[#3b2c23] transition-colors hover:bg-[#f5ecdd]"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[#c97b23]" aria-hidden="true" />
                Abhivyaktā Stage
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateScreen('sankalp-world');
                }}
                className="flex items-center gap-2 rounded-xl border border-[#e4d8c4] bg-white px-3 py-2.5 text-left text-xs font-bold text-[#3b2c23] transition-colors hover:bg-[#f5ecdd]"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-[#1d7465]" aria-hidden="true" />
                Sankalp Courtyard
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  DoorOpen,
  FastForward,
  Footprints,
  Settings,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  MobileInputState,
  PortalId,
  WorldExplorerSnapshot,
} from '../../types/universe';

interface WorldExplorerOverlayProps {
  snapshot: WorldExplorerSnapshot;
  soundMuted: boolean;
  onSkipArrival: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
  onTriggerInteract: () => void;
  onEnterPortalDirect: (portalId: PortalId) => void;
  onReturnToHub: () => void;
  onCloseExhibit: () => void;
  onMobileInputChange: (input: MobileInputState) => void;
  onMobileLookDelta: (dx: number, dy: number) => void;
}

/**
 * Minimal, clean HUD for Cloud Arrival, Central Hub Island, Abhivyaktā Amphitheatre,
 * and Sankalp Community Courtyard.
 *
 * Follows strict visual restraint:
 * - Top-Left: Quiet Garad Foundation identity & subtle location label
 * - Top-Right: Clean Settings button (+ Return to Hub inside sub-worlds)
 * - No permanent navbar, no cluttered overlays, no backdrop-blur over WebGL
 * - Contextual ENTER / Inspect prompt appears ONLY when close to a portal or exhibit
 */
export function WorldExplorerOverlay({
  snapshot,
  soundMuted,
  onSkipArrival,
  onOpenSettings,
  onToggleMute,
  onTriggerInteract,
  onEnterPortalDirect,
  onReturnToHub,
  onCloseExhibit,
  onMobileInputChange,
  onMobileLookDelta,
}: WorldExplorerOverlayProps) {
  const {
    screen,
    locationLabel,
    arrivalProgress,
    showLandingCaption,
    transitionVeilOpacity,
    activePrompt,
    activeExhibit,
    portalMarkers,
  } = snapshot;

  // Mobile floating joystick + right-side look drag state
  const joyPointerId = useRef<number | null>(null);
  const joyOrigin = useRef({ x: 0, y: 0 });
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const [mobileRunning, setMobileRunning] = useState(false);

  const lookPointerId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  const isCloudArrival = screen === 'cloud-arrival';
  const isFirstPersonWorld =
    screen === 'central-hub' ||
    screen === 'abhivyakta-world' ||
    screen === 'sankalp-world';
  const isSubWorld = screen === 'abhivyakta-world' || screen === 'sankalp-world';

  const emitJoy = (nx: number, ny: number, running: boolean) => {
    onMobileInputChange({ moveX: nx, moveY: ny, running });
  };

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== null) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    joyPointerId.current = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    joyOrigin.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joyPointerId.current) return;
    e.stopPropagation();
    const maxR = 38;
    const dx = e.clientX - joyOrigin.current.x;
    const dy = e.clientY - joyOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    setJoyKnob({ x: kx, y: ky });
    emitJoy(kx / maxR, -ky / maxR, mobileRunning);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joyPointerId.current) return;
    e.stopPropagation();
    joyPointerId.current = null;
    setJoyKnob({ x: 0, y: 0 });
    emitJoy(0, 0, mobileRunning);
  };

  const toggleMobileRun = () => {
    const next = !mobileRunning;
    setMobileRunning(next);
    emitJoy(joyKnob.x / 38, -joyKnob.y / 38, next);
  };

  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    lookLast.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lookPointerId.current) return;
    const dx = e.clientX - lookLast.current.x;
    const dy = e.clientY - lookLast.current.y;
    lookLast.current = { x: e.clientX, y: e.clientY };
    onMobileLookDelta(dx * 1.15, dy * 1.15);
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lookPointerId.current) return;
    lookPointerId.current = null;
  };

  return (
    <>
      {/* Smooth Warm Atmospheric Portal Transition Veil (active across world handoffs) */}
      {transitionVeilOpacity > 0.01 && (
        <div
          className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-100"
          style={{
            opacity: Math.min(1, transitionVeilOpacity),
            background:
              'radial-gradient(circle at 50% 48%, rgba(255,250,234,0.98) 0%, rgba(248,225,176,0.95) 55%, rgba(226,184,126,0.94) 100%)',
          }}
          aria-hidden="true"
        />
      )}

      {/* === 1. CINEMATIC CLOUD ARRIVAL OVERLAY === */}
      {isCloudArrival && (
        <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-5 md:p-8">
          {/* Top-Left Quiet Brand */}
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-[#1d1712]/72 px-3.5 py-2 text-[#fff8eb]">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#f6cc7a]">
                Garad Foundation
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={soundMuted ? 'Unmute audio' : 'Mute audio'}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d1712]/72 text-[#fff8eb] transition-colors hover:bg-[#1d1712]/90"
            >
              {soundMuted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4 text-[#f6cc7a]" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Centerpiece Title Reveal during Cloud Descent (fades smoothly as island opens) */}
          <div
            className="mx-auto max-w-2xl text-center transition-opacity duration-700"
            style={{
              opacity: arrivalProgress < 0.68 ? 1 : Math.max(0, 1 - (arrivalProgress - 0.68) / 0.24),
            }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#3a2818]">
              Garad Universe
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#1f160f] drop-shadow-sm sm:text-5xl md:text-6xl">
              THE WORLD OF LITTLE DREAMS
            </h1>
            <p className="mt-3 text-sm font-semibold tracking-wide text-[#46311f] sm:text-base">
              A Little World. A Thousand Dreams.
            </p>
          </div>

          {/* Bottom-Right Skip Intro Button */}
          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={onSkipArrival}
              className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#f2d6a0]/60 bg-[#1f1812]/82 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#fff6e3] shadow-lg transition-colors hover:bg-[#2c2118]"
            >
              <span>Skip Intro</span>
              <FastForward className="h-3.5 w-3.5 text-[#f6cc7a]" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* === 2. CENTRAL HUB, ABHIVYAKTĀ & SANKALP MINIMAL GAME-GRADE HUD === */}
      {isFirstPersonWorld && (
        <div className="pointer-events-none fixed inset-0 z-20">
          {/* Minimal Top Bar: Top-Left Identity + Location | Top-Right Return (sub-world) & Settings */}
          <header className="flex items-start justify-between p-4 md:p-6">
            <div className="rounded-xl border border-[#e7d7bd]/70 bg-[#fbf5e8]/92 px-3.5 py-2 shadow-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#b94a21]">
                Garad Foundation
              </p>
              <p className="text-sm font-extrabold tracking-tight text-[#1f1b16]">
                {locationLabel}
              </p>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              {isSubWorld && (
                <button
                  type="button"
                  onClick={onReturnToHub}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-[#e5d5bc] bg-[#fbf5e8]/95 px-3.5 text-xs font-bold text-[#1f1b16] shadow-sm transition-colors hover:bg-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-[#d85a2a]" aria-hidden="true" />
                  <span>Central Hub</span>
                </button>
              )}

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={soundMuted ? 'Unmute audio' : 'Mute audio'}
                title={soundMuted ? 'Unmute audio' : 'Mute audio'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5d5bc] bg-[#fbf5e8]/95 text-[#3f3128] shadow-sm transition-colors hover:bg-white"
              >
                {soundMuted ? (
                  <VolumeX className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="h-4 w-4 text-[#d85a2a]" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Open settings"
                title="World settings (Esc)"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5d5bc] bg-[#fbf5e8]/95 text-[#1f1b16] shadow-sm transition-colors hover:bg-white"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* Brief Elegant Landing Caption on Central Island Arrival */}
          {screen === 'central-hub' && showLandingCaption && (
            <div className="pointer-events-none fixed inset-x-0 top-20 flex justify-center px-4 md:top-24">
              <div className="rounded-xl bg-[#1c150f]/80 px-5 py-2.5 text-center shadow-lg">
                <p className="font-serif text-base font-semibold tracking-wide text-[#fff6e2] md:text-xl">
                  Three Worlds. Countless Stories. One Dream.
                </p>
              </div>
            </div>
          )}

          {/* Clean Floating Architectural Typography above each Portal (zero heavy boxes obstructing roofs) */}
          {screen === 'central-hub' && !activeExhibit && (
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              {portalMarkers.map((m) => {
                if (!m.visible || m.distance > 28) return null;
                const opacity = m.isApproaching
                  ? 1
                  : Math.max(0.55, Math.min(0.96, 1 - (m.distance - 9) / 20));
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onEnterPortalDirect(m.id)}
                    style={{
                      transform: `translate3d(${m.x}px, ${m.y}px, 0) translate(-50%, -100%)`,
                      opacity,
                    }}
                    className="group pointer-events-auto absolute left-0 top-0 px-2.5 py-1 text-center transition-transform hover:-translate-y-0.5 focus:outline-none"
                  >
                    <span
                      className="block font-serif text-xs font-bold tracking-[0.2em] text-[#fffaf0] sm:text-[13px]"
                      style={{
                        textShadow:
                          '0 2px 10px rgba(24, 16, 10, 0.85), 0 1px 3px rgba(24, 16, 10, 0.95)',
                      }}
                    >
                      {m.title}
                    </span>
                    <span
                      className={`mx-auto my-1 block h-[1.5px] transition-all ${
                        m.isApproaching
                          ? 'w-14 bg-[#f8cf7a]'
                          : 'w-8 bg-[#f4cf84]/75 group-hover:w-12 group-hover:bg-[#f8cf7a]'
                      }`}
                    />
                    <span
                      className="block text-[10px] font-semibold italic tracking-wide text-[#ffebb8]"
                      style={{
                        textShadow:
                          '0 1px 8px rgba(20, 14, 8, 0.92), 0 1px 2px rgba(20, 14, 8, 0.95)',
                      }}
                    >
                      {m.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Contextual Proximity Action Prompt — Appears ONLY when close */}
          {activePrompt && !activeExhibit && (
            <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 md:bottom-10">
              <button
                type="button"
                onClick={onTriggerInteract}
                className="pointer-events-auto flex items-center gap-3 rounded-2xl border-2 border-[#f4c668] bg-[#211710]/92 px-5 py-3.5 text-left text-[#fff9ec] shadow-xl transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d85a2a] text-white">
                  <DoorOpen className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <span className="block text-xs font-extrabold tracking-[0.12em] text-[#f7ce77]">
                    {activePrompt.actionLabel}
                  </span>
                  <span className="block text-[11px] font-medium text-[#e9dcc7]">
                    {activePrompt.subtitle}
                  </span>
                </div>
                <span className="ml-1 hidden rounded-lg border border-[#f4c668]/50 bg-[#36261a] px-2 py-1 text-[10px] font-bold text-[#fae0a8] md:inline-block">
                  E
                </span>
              </button>
            </div>
          )}

          {/* Quiet Desktop Controls Hint (Bottom-Left) */}
          {!activeExhibit && (
            <div className="pointer-events-none fixed bottom-5 left-6 hidden rounded-xl bg-[#1d1610]/74 px-3.5 py-2 text-[11px] font-medium text-[#f5ead7] lg:block">
              <span className="font-bold text-[#f7ce77]">WASD</span> Move ·{' '}
              <span className="font-bold text-[#f7ce77]">Shift</span> Run ·{' '}
              <span className="font-bold text-[#f7ce77]">Drag</span> Look ·{' '}
              <span className="font-bold text-[#f7ce77]">E</span> Interact
            </div>
          )}

          {/* Mobile Touch Controls (Left Floating Joystick + Hold-to-Run + Right-Side Look Area) */}
          {!activeExhibit && (
            <div className="lg:hidden">
              {/* Right-side invisible touch drag look zone */}
              <div
                onPointerDown={handleLookDown}
                onPointerMove={handleLookMove}
                onPointerUp={handleLookUp}
                onPointerCancel={handleLookUp}
                className="pointer-events-auto fixed bottom-0 right-0 top-16 w-1/2 touch-none"
                aria-label="Drag to look around"
              />

              {/* Left-side floating virtual joystick + Run toggle */}
              <div className="pointer-events-auto fixed bottom-6 left-5 z-30 flex items-end gap-3">
                <div
                  onPointerDown={handleJoyDown}
                  onPointerMove={handleJoyMove}
                  onPointerUp={handleJoyUp}
                  onPointerCancel={handleJoyUp}
                  className="relative flex h-24 w-24 touch-none items-center justify-center rounded-full border-2 border-[#f4d7a1]/70 bg-[#1e1711]/55"
                  aria-label="Movement joystick"
                >
                  <div
                    style={{
                      transform: `translate3d(${joyKnob.x}px, ${joyKnob.y}px, 0)`,
                    }}
                    className="h-10 w-10 rounded-full border border-[#fff3d6] bg-[#d85a2a]/92 shadow-md"
                  />
                </div>

                <button
                  type="button"
                  onClick={toggleMobileRun}
                  aria-pressed={mobileRunning}
                  className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold shadow-md ${
                    mobileRunning
                      ? 'border-[#f5c768] bg-[#d85a2a] text-white'
                      : 'border-[#e6d6bc]/80 bg-[#1f1711]/78 text-[#f5ead6]'
                  }`}
                >
                  <Footprints className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{mobileRunning ? 'Running' : 'Run'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Exhibit Inspection Drawer (Abhivyaktā & Sankalp Data-Driven Records) */}
          {activeExhibit && (
            <div
              className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#140f0b]/62 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="world-exhibit-title"
              onClick={onCloseExhibit}
            >
              <article
                className="w-full max-w-xl max-h-[84vh] overflow-y-auto rounded-2xl border border-[#e3d2b5] bg-[#fdf8ee] p-6 text-[#1f1b16] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#e8dcc7] pb-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b94a21]">
                      {activeExhibit.category}
                    </p>
                    <h2
                      id="world-exhibit-title"
                      className="mt-1 font-serif text-2xl font-bold text-[#1f1b16]"
                    >
                      {activeExhibit.title}
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-[#6b5344]">
                      {activeExhibit.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseExhibit}
                    aria-label="Close exhibit"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e3d2b5] bg-white text-[#4f3c31] hover:bg-[#f4ebdc]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#35281f]">
                  {activeExhibit.summary}
                </p>

                <div className="mt-5 space-y-4">
                  {activeExhibit.entries.map((entry) => (
                    <div
                      key={entry.heading}
                      className="rounded-xl border border-[#eadfcf] bg-white/90 p-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-extrabold text-[#1f1b16]">
                          {entry.heading}
                        </h3>
                        {entry.meta && (
                          <span className="text-[11px] font-semibold text-[#8c5a36]">
                            {entry.meta}
                          </span>
                        )}
                      </div>
                      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#46362b]">
                        {entry.details.map((detail) => (
                          <li key={detail} className="flex gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d85a2a]" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>

                      {entry.photoPlaceholder && (
                        <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-dashed border-[#cdb694] bg-[#faf3e5] px-3 py-2.5 text-xs font-medium text-[#755b42]">
                          <Camera className="h-4 w-4 shrink-0 text-[#a0764a]" aria-hidden="true" />
                          <span>{entry.photoPlaceholder}</span>
                        </div>
                      )}

                      {entry.verificationNote && (
                        <p className="mt-2.5 text-[11px] italic text-[#7a6454]">
                          {entry.verificationNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {activeExhibit.verificationNote && (
                  <p className="mt-4 border-t border-[#eae0cf] pt-3 text-[11px] font-medium text-[#745e4e]">
                    {activeExhibit.verificationNote}
                  </p>
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={onCloseExhibit}
                    className="rounded-xl bg-[#d85a2a] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#bf4d21]"
                  >
                    Continue Exploring
                  </button>
                </div>
              </article>
            </div>
          )}
        </div>
      )}
    </>
  );
}

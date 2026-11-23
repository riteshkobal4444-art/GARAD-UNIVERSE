import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  FileText,
  Footprints,
  Hand,
  MapPin,
  Sliders,
  Type,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { PROJECT_CONTENT_BY_ID } from '../../data/projectContentData';
import type {
  CameraViewMode,
  MobileInputState,
  SchoolProgressSnapshot,
} from '../../types/universe';

interface SchoolAdventureOverlayProps {
  snapshot: SchoolProgressSnapshot;
  soundMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onInteract: () => void;
  onTurnBookPage: (dir: -1 | 1) => void;
  onCloseBook: () => void;
  onDismissToast: () => void;
  onReturnToHub: () => void;
  onCycleCameraMode: () => void;
  onMobileInputChange: (input: MobileInputState) => void;
  onMobileJump: () => void;
  onMobileLookDelta: (dx: number, dy: number) => void;
  onMobilePinchZoom: (deltaAmount: number) => void;
}

const CAMERA_MODE_LABELS: Record<CameraViewMode, { label: string; shortLabel: string }> = {
  'close-third': { label: '3rd-Person', shortLabel: '3rd' },
  'far-third': { label: 'Wide View', shortLabel: 'Wide' },
  'first-person': { label: 'First-Person', shortLabel: '1st' },
};

// Configurable floating joystick tuning
const JOYSTICK_MAX_RADIUS = 52;
const JOYSTICK_DEAD_ZONE = 0.14;
const JOYSTICK_RESPONSE_POWER = 1.55;

/**
 * Minimal, unobtrusive HUD & Dual-Thumb Touch Layer for Mission Bharari School Adventure.
 *
 * Mobile controls architecture:
 * - Left thumb zone: Floating virtual joystick appears right where the thumb first touches,
 *   with dead zone, progressive response curve, normalized diagonal speed, and smooth center return.
 * - Right thumb zone: Completely independent camera drag + two-finger pinch-to-zoom.
 *   Supports simultaneous left-thumb movement and right-thumb camera rotation.
 * - Dedicated hold-to-run, jump, camera-view toggle, and contextual interact buttons
 *   inset comfortably away from screen edges and device safe areas.
 */
export function SchoolAdventureOverlay({
  snapshot,
  soundMuted,
  onToggleMute,
  onOpenSettings,
  onInteract,
  onTurnBookPage,
  onCloseBook,
  onDismissToast,
  onReturnToHub,
  onCycleCameraMode,
  onMobileInputChange,
  onMobileJump,
  onMobileLookDelta,
  onMobilePinchZoom,
}: SchoolAdventureOverlayProps) {
  const [showBookNotes, setShowBookNotes] = useState(false);
  const [largeReaderText, setLargeReaderText] = useState(false);
  const [holdRunActive, setHoldRunActive] = useState(false);
  const [isTouchViewport, setIsTouchViewport] = useState(false);

  // Floating joystick visual & tracking state
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickOrigin, setJoystickOrigin] = useState({ x: 0, y: 0 });
  const [joystickKnob, setJoystickKnob] = useState({ x: 0, y: 0 });

  const moveZoneRef = useRef<HTMLDivElement | null>(null);
  const movePointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const axisRef = useRef({ moveX: 0, moveY: 0 });
  const holdRunRef = useRef(false);
  const runPointerIdRef = useRef<number | null>(null);

  // Independent right-side multi-touch tracker (supports 1-finger drag AND 2-finger pinch!)
  const lookPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);

  const openBook = snapshot.openBookId ? PROJECT_CONTENT_BY_ID[snapshot.openBookId] : null;
  const activePages = openBook
    ? [
        openBook.pages[snapshot.openBookSpreadIndex * 2],
        openBook.pages[snapshot.openBookSpreadIndex * 2 + 1],
      ].filter((p): p is NonNullable<typeof p> => Boolean(p))
    : [];
  const camMeta = CAMERA_MODE_LABELS[snapshot.cameraMode];

  const emitMobileInput = useCallback(
    (moveX: number, moveY: number, running: boolean) => {
      axisRef.current = { moveX, moveY };
      onMobileInputChange({ moveX, moveY, running });
    },
    [onMobileInputChange],
  );

  // Show dual-thumb touch layer on mobile viewports (<1024px) or coarse-pointer tablets
  useEffect(() => {
    const updateTouchMode = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setIsTouchViewport(coarse || window.innerWidth < 1024);
    };
    updateTouchMode();
    window.addEventListener('resize', updateTouchMode);
    return () => window.removeEventListener('resize', updateTouchMode);
  }, []);

  // Reset book drawer & any held mobile input cleanly when opening a book
  useEffect(() => {
    if (!openBook) {
      setShowBookNotes(false);
    } else {
      movePointerIdRef.current = null;
      runPointerIdRef.current = null;
      holdRunRef.current = false;
      setHoldRunActive(false);
      setJoystickActive(false);
      setJoystickKnob({ x: 0, y: 0 });
      lookPointersRef.current.clear();
      lastPinchDistRef.current = null;
      emitMobileInput(0, 0, false);
    }
  }, [openBook, emitMobileInput]);

  // Auto-dismiss simple toasts after 7s; keep rich multi-entry inspection panels open until closed (or 24s)
  useEffect(() => {
    if (!snapshot.discoveryToast) return;
    const hasStructuredEntries = (snapshot.discoveryToast.entries?.length ?? 0) > 0;
    const id = window.setTimeout(
      () => {
        onDismissToast();
      },
      hasStructuredEntries ? 24000 : 7000,
    );
    return () => window.clearTimeout(id);
  }, [snapshot.discoveryToast, onDismissToast]);

  // Ensure clean release on unmount
  useEffect(() => {
    return () => {
      onMobileInputChange({ moveX: 0, moveY: 0, running: false });
    };
  }, [onMobileInputChange]);

  /* ==========================================================================
   * LEFT THUMB ZONE — FLOATING VIRTUAL JOYSTICK
   * ========================================================================== */
  const applyJoystickVector = (localX: number, localY: number) => {
    let dx = localX - originRef.current.x;
    let dy = localY - originRef.current.y;
    const rawDist = Math.hypot(dx, dy);

    if (rawDist > JOYSTICK_MAX_RADIUS && rawDist > 0) {
      const clampScale = JOYSTICK_MAX_RADIUS / rawDist;
      dx *= clampScale;
      dy *= clampScale;
    }

    setJoystickKnob({ x: dx, y: dy });

    const normDist = Math.min(rawDist / JOYSTICK_MAX_RADIUS, 1);
    if (normDist <= JOYSTICK_DEAD_ZONE) {
      emitMobileInput(0, 0, holdRunRef.current);
      return;
    }

    // Progressive smooth response curve: gentle thumb tilt = slow walk, full deflection = max speed
    const rescaled = (normDist - JOYSTICK_DEAD_ZONE) / (1 - JOYSTICK_DEAD_ZONE);
    const progressiveMag = Math.pow(rescaled, JOYSTICK_RESPONSE_POWER);
    const invLen = rawDist > 0 ? 1 / rawDist : 0;

    // Normalized unit vector * progressiveMag guarantees identical max speed in all 360° directions
    const outX = dx * invLen * progressiveMag;
    const outY = -dy * invLen * progressiveMag; // Up on screen = forward (+Y)
    emitMobileInput(outX, outY, holdRunRef.current);
  };

  const handleMoveZoneDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (openBook || movePointerIdRef.current !== null) return;
    e.stopPropagation();
    const zone = moveZoneRef.current;
    if (!zone) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    movePointerIdRef.current = e.pointerId;

    const rect = zone.getBoundingClientRect();
    const pad = JOYSTICK_MAX_RADIUS + 14;
    const lx = Math.max(pad, Math.min(rect.width - pad, e.clientX - rect.left));
    const ly = Math.max(pad, Math.min(rect.height - pad, e.clientY - rect.top));

    originRef.current = { x: lx, y: ly };
    setJoystickOrigin({ x: lx, y: ly });
    setJoystickKnob({ x: 0, y: 0 });
    setJoystickActive(true);
    emitMobileInput(0, 0, holdRunRef.current);
  };

  const handleMoveZoneMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== movePointerIdRef.current) return;
    e.stopPropagation();
    const zone = moveZoneRef.current;
    if (!zone) return;
    const rect = zone.getBoundingClientRect();
    applyJoystickVector(e.clientX - rect.left, e.clientY - rect.top);
  };

  const releaseMoveJoystick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== movePointerIdRef.current) return;
    e.stopPropagation();
    movePointerIdRef.current = null;
    setJoystickKnob({ x: 0, y: 0 });
    setJoystickActive(false);
    emitMobileInput(0, 0, holdRunRef.current);
  };

  /* ==========================================================================
   * RIGHT THUMB ZONE — INDEPENDENT CAMERA LOOK + TWO-FINGER PINCH ZOOM
   * ========================================================================== */
  const computePinchDistance = (): number | null => {
    const pts = Array.from(lookPointersRef.current.values());
    if (pts.length < 2) return null;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const handleLookZoneDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (openBook) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    lookPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (lookPointersRef.current.size >= 2) {
      lastPinchDistRef.current = computePinchDistance();
    } else {
      lastPinchDistRef.current = null;
    }
  };

  const handleLookZoneMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = lookPointersRef.current.get(e.pointerId);
    if (!prev || openBook) return;
    e.stopPropagation();

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    lookPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (lookPointersRef.current.size >= 2) {
      // Two-finger pinch zoom smoothly adjusts camera distance
      const nextDist = computePinchDistance();
      if (nextDist !== null && lastPinchDistRef.current !== null) {
        const pinchDelta = lastPinchDistRef.current - nextDist; // pinch closer = positive = zoom out
        if (Math.abs(pinchDelta) > 0.4) {
          onMobilePinchZoom(pinchDelta * 4.5);
        }
      }
      lastPinchDistRef.current = nextDist;
    } else {
      // Single right-thumb drag rotates camera independently of left-thumb movement
      onMobileLookDelta(dx, dy);
    }
  };

  const handleLookZoneUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lookPointersRef.current.has(e.pointerId)) return;
    e.stopPropagation();
    lookPointersRef.current.delete(e.pointerId);
    lastPinchDistRef.current = lookPointersRef.current.size >= 2 ? computePinchDistance() : null;
  };

  /* ==========================================================================
   * HOLD-TO-RUN BUTTON (MOBILE)
   * ========================================================================== */
  const handleRunDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    runPointerIdRef.current = e.pointerId;
    holdRunRef.current = true;
    setHoldRunActive(true);
    emitMobileInput(axisRef.current.moveX, axisRef.current.moveY, true);
  };

  const handleRunRelease = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (runPointerIdRef.current !== null && e.pointerId !== runPointerIdRef.current) return;
    e.stopPropagation();
    runPointerIdRef.current = null;
    holdRunRef.current = false;
    setHoldRunActive(false);
    emitMobileInput(axisRef.current.moveX, axisRef.current.moveY, false);
  };

  const isArriving = snapshot.arrivalActive;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between"
      style={{
        paddingTop: 'max(1rem, calc(env(safe-area-inset-top) + 0.75rem))',
        paddingBottom: 'max(1.1rem, calc(env(safe-area-inset-bottom) + 0.85rem))',
        paddingLeft: 'max(1rem, calc(env(safe-area-inset-left) + 0.75rem))',
        paddingRight: 'max(1rem, calc(env(safe-area-inset-right) + 0.75rem))',
      }}
    >
      {/* MOBILE / TABLET DUAL-THUMB TOUCH LAYER (sits strictly underneath HUD buttons) */}
      {!isArriving && !openBook && isTouchViewport && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 top-20 z-0 flex">
          {/* LEFT MOVEMENT ZONE — Floating Virtual Joystick */}
          <div
            ref={moveZoneRef}
            onPointerDown={handleMoveZoneDown}
            onPointerMove={handleMoveZoneMove}
            onPointerUp={releaseMoveJoystick}
            onPointerCancel={releaseMoveJoystick}
            onLostPointerCapture={releaseMoveJoystick}
            aria-label="Touch and drag to move"
            className="pointer-events-auto relative h-full w-[46%] touch-none select-none"
          >
            {!joystickActive && (
              <div
                className="pointer-events-none absolute flex h-24 w-24 items-center justify-center rounded-full border border-[#fffaf0]/55 bg-[#1f1b16]/18"
                style={{
                  left: 'max(1.5rem, calc(env(safe-area-inset-left) + 1.25rem))',
                  bottom: 'max(1.75rem, calc(env(safe-area-inset-bottom) + 1.25rem))',
                }}
              >
                <div className="h-9 w-9 rounded-full border border-[#fffaf0]/70 bg-[#fffaf0]/55" />
              </div>
            )}

            <div
              className={`pointer-events-none absolute flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#fffaf0]/80 bg-[#1f1b16]/28 transition-opacity duration-150 ${
                joystickActive ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                left: `${joystickOrigin.x}px`,
                top: `${joystickOrigin.y}px`,
              }}
            >
              <div
                className="h-11 w-11 rounded-full border border-white/90 bg-[#fffaf0]/92 shadow-md transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${joystickKnob.x}px, ${joystickKnob.y}px)`,
                }}
              />
            </div>
          </div>

          {/* RIGHT CAMERA LOOK & TWO-FINGER PINCH ZONE */}
          <div
            onPointerDown={handleLookZoneDown}
            onPointerMove={handleLookZoneMove}
            onPointerUp={handleLookZoneUp}
            onPointerCancel={handleLookZoneUp}
            onLostPointerCapture={handleLookZoneUp}
            aria-label="Drag to rotate camera or pinch to zoom"
            className="pointer-events-auto h-full w-[54%] touch-none select-none"
          />
        </div>
      )}

      {/* TEMPORARY VILLAGE ARRIVAL TITLE — Brief, calm, fades out automatically */}
      <div
        className={`pointer-events-none fixed inset-x-0 top-[18%] z-20 flex flex-col items-center text-center transition-opacity duration-700 ${
          snapshot.showArrivalLabel ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
      >
        <div className="rounded-2xl bg-[#1c1611]/55 px-6 py-3 backdrop-blur-sm">
          <p className="font-serif text-xl font-bold tracking-[0.22em] text-[#fdf6e7] sm:text-2xl">
            MISSION BHARARI
          </p>
        </div>
      </div>

      {/* MINIMAL TOP BAR: Compact Place Name + Essential Controls Only */}
      {!isArriving ? (
        <div className="relative z-10 flex items-center justify-between gap-2 md:px-3">
          {/* Quiet top-left place name (zero scoreboards or clutter) */}
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#e6d5be]/80 bg-[#fffaf0]/88 px-3.5 py-2 shadow-sm backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#b84c27]" aria-hidden="true" />
            <span className="text-xs font-extrabold tracking-wide text-[#1f1b16]">
              {snapshot.zoneLabel}
            </span>
          </div>

          {/* Clean top-right action cluster matching Central Hub */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onReturnToHub}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e6d5be]/85 bg-[#fffaf0]/90 px-3 py-2 text-xs font-bold text-[#1f1b16] shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              <Compass className="h-3.5 w-3.5 text-[#c75127]" aria-hidden="true" />
              <span className="hidden sm:inline">Central Hub</span>
            </button>

            {!openBook && (
              <button
                type="button"
                onClick={onCycleCameraMode}
                title="Switch camera view (V)"
                className="hidden items-center gap-1.5 rounded-full border border-[#e6d5be]/85 bg-[#fffaf0]/90 px-3 py-2 text-xs font-bold text-[#1f1b16] shadow-sm backdrop-blur-sm transition-colors hover:bg-white lg:inline-flex"
              >
                {snapshot.cameraMode === 'first-person' ? (
                  <Eye className="h-3.5 w-3.5 text-[#185d7c]" aria-hidden="true" />
                ) : (
                  <Video className="h-3.5 w-3.5 text-[#c75127]" aria-hidden="true" />
                )}
                <span>{camMeta.label}</span>
                <span className="rounded bg-[#efe2ce] px-1.5 py-0.5 text-[10px] font-extrabold text-[#58423a]">
                  V
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={soundMuted ? 'Unmute audio' : 'Mute audio'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e6d5be]/85 bg-[#fffaf0]/90 text-[#1f1b16] shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              {soundMuted ? (
                <VolumeX className="h-4 w-4 text-[#8c6b58]" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4 text-[#1d7465]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e6d5be]/85 bg-[#fffaf0]/90 text-[#1f1b16] shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              <Sliders className="h-4 w-4 text-[#4b382d]" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* NON-BLOCKING INSPECTION CARD / DISCOVERY PANEL */}
      {snapshot.discoveryToast && !openBook && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto relative z-20 mx-auto max-h-[54vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#e3cca9] bg-[#fff9ee]/96 p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#ecdcc3] pb-2.5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#b84a27]">
                {snapshot.discoveryToast.subtitle}
              </p>
              <h3 className="mt-0.5 text-sm font-extrabold text-[#1f1b16]">
                {snapshot.discoveryToast.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onDismissToast}
              aria-label="Close inspection panel"
              className="rounded-full p-1 text-[#6b5344] hover:bg-[#f2e2cb] hover:text-[#1f1b16]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-[#2e2620]">
            {snapshot.discoveryToast.body}
          </p>

          {snapshot.discoveryToast.entries && snapshot.discoveryToast.entries.length > 0 && (
            <div className="mt-3 space-y-2.5">
              {snapshot.discoveryToast.entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#e9d8be] bg-[#fffdf8] p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                    <h4 className="text-xs font-extrabold text-[#184a6e]">{entry.heading}</h4>
                    {entry.meta && (
                      <span className="text-[11px] font-semibold text-[#8f3e1e]">
                        {entry.meta}
                      </span>
                    )}
                  </div>
                  <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[#2b2621]">
                    {entry.details.map((d, di) => (
                      <li key={di}>• {d}</li>
                    ))}
                  </ul>
                  {entry.photoPlaceholder && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#c9b293] bg-[#f6ebd7] px-2.5 py-1 text-[11px] font-semibold text-[#5b4530]">
                      <Camera className="h-3.5 w-3.5 text-[#8f5e34]" aria-hidden="true" />
                      <span>{entry.photoPlaceholder}</span>
                    </div>
                  )}
                  {entry.verificationNote && (
                    <p className="mt-1.5 text-[11px] italic text-[#6b5344]">
                      {entry.verificationNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {snapshot.discoveryToast.note && (
            <p className="mt-3 border-l-2 border-[#d85a2a] pl-2.5 text-[11px] italic text-[#6b5344]">
              {snapshot.discoveryToast.note}
            </p>
          )}
        </div>
      )}

      {/* BOTTOM REGION: Either 3D Living Book Controls OR Contextual Prompt + Action Controls */}
      <div className="relative z-10 flex flex-col items-center gap-2.5">
        {openBook && activePages.length > 0 ? (
          <>
            {showBookNotes && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto max-h-[54vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#dfd0b8] bg-[#fffaf0]/98 p-4 shadow-xl sm:p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#eadac2] pb-2.5">
                  <div>
                    <p className="text-xs font-extrabold text-[#1f1b16]">
                      {openBook.bookNumber} · {openBook.title} — Pages{' '}
                      {activePages.map((p) => p.pageNumber).join('–')} of {openBook.pages.length}
                    </p>
                    <p className="text-[11px] text-[#6b5344]">
                      {openBook.subtitle} · {openBook.shelfLocation}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLargeReaderText((v) => !v)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        largeReaderText
                          ? 'bg-[#185d7c] text-white'
                          : 'border border-[#dfd0b8] bg-white text-[#1f1b16] hover:bg-[#f6ebd7]'
                      }`}
                    >
                      <Type className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{largeReaderText ? 'Large Text On' : 'Larger Text'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBookNotes(false)}
                      className="rounded-full p-1 text-[#6b5344] hover:bg-[#f2e2cb]"
                      aria-label="Hide reader panel"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {activePages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="flex flex-col justify-between space-y-2.5 rounded-xl border border-[#ebdcc4] bg-[#fffdf8] p-3.5"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#185d7c]">
                            {page.kicker}
                          </p>
                          <span className="text-[10px] font-bold text-[#8a735c]">
                            Page {page.pageNumber}
                          </span>
                        </div>
                        <h4
                          className={`font-extrabold text-[#1f1b16] ${
                            largeReaderText ? 'text-lg' : 'text-sm'
                          }`}
                        >
                          {page.title}
                        </h4>
                        {page.dateLocation && (
                          <p
                            className={`italic text-[#7c5838] ${
                              largeReaderText ? 'text-xs' : 'text-[11px]'
                            }`}
                          >
                            {page.dateLocation}
                          </p>
                        )}

                        {page.photo && (
                          <div className="overflow-hidden rounded-lg border border-dashed border-[#c9b293] bg-[#f4e9d6]">
                            {page.photo.imageUrl ? (
                              <img
                                src={page.photo.imageUrl}
                                alt={page.photo.caption}
                                loading="lazy"
                                className="h-36 w-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center px-3 py-5 text-center">
                                <Camera
                                  className="mb-1.5 h-5 w-5 text-[#7a5b3c]"
                                  aria-hidden="true"
                                />
                                <p className="text-xs font-extrabold text-[#4d3826]">
                                  {page.photo.placeholderLabel}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[#6d5540]">
                                  {page.photo.caption}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {page.bodyParagraphs.map((para, pi) => (
                          <p
                            key={pi}
                            className={`leading-relaxed text-[#2b2621] ${
                              largeReaderText ? 'text-sm' : 'text-xs'
                            }`}
                          >
                            {para}
                          </p>
                        ))}

                        {page.highlights && page.highlights.length > 0 && (
                          <ul
                            className={`space-y-1 pt-0.5 font-semibold text-[#184a6e] ${
                              largeReaderText ? 'text-xs' : 'text-[11px]'
                            }`}
                          >
                            {page.highlights.map((hl, hi) => (
                              <li key={hi}>• {hl}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {page.verificationNote && (
                        <p className="rounded-lg border-l-2 border-[#d85a2a] bg-[#f6ead7] px-2.5 py-1.5 text-[11px] text-[#5c4432]">
                          {page.verificationNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#e3cca9] bg-[#fffaf0]/95 px-3 py-2 shadow-md">
              <div className="hidden items-center gap-1.5 border-r border-[#e4d3ba] pr-3 sm:flex">
                <BookOpen className="h-4 w-4 text-[#c75127]" aria-hidden="true" />
                <span className="text-xs font-extrabold text-[#1f1b16]">
                  {openBook.bookNumber} · {openBook.title}
                </span>
              </div>

              <button
                type="button"
                disabled={snapshot.openBookSpreadIndex <= 0}
                onClick={() => onTurnBookPage(-1)}
                className="inline-flex items-center gap-1 rounded-full border border-[#dfd0b8] bg-white px-3 py-1.5 text-xs font-bold text-[#1f1b16] transition-colors hover:bg-[#f8efe0] disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Prev</span>
              </button>

              <span className="px-1.5 text-xs font-bold tabular-nums text-[#58423a]">
                Pages {activePages.map((p) => p.pageNumber).join('–')} / {openBook.pages.length}
              </span>

              <button
                type="button"
                disabled={snapshot.openBookSpreadIndex >= snapshot.openBookTotalSpreads - 1}
                onClick={() => onTurnBookPage(1)}
                className="inline-flex items-center gap-1 rounded-full border border-[#dfd0b8] bg-white px-3 py-1.5 text-xs font-bold text-[#1f1b16] transition-colors hover:bg-[#f8efe0] disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setShowBookNotes((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  showBookNotes
                    ? 'bg-[#185d7c] text-white'
                    : 'border border-[#dfd0b8] bg-white text-[#1f1b16] hover:bg-[#f8efe0]'
                }`}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{showBookNotes ? 'Hide Reader' : 'Larger Text'}</span>
              </button>

              <button
                type="button"
                onClick={onCloseBook}
                className="inline-flex items-center gap-1 rounded-full bg-[#d85a2a] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#be4a1f]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Return Book</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Contextual Proximity Interaction Prompt */}
            {!isArriving && snapshot.activePrompt && (
              <button
                type="button"
                onClick={onInteract}
                className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-[#dfb465] bg-[#fffaf0]/94 px-4 py-2 text-left shadow-md backdrop-blur-sm transition-transform hover:-translate-y-0.5 active:scale-95"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c95228] text-[11px] font-extrabold text-white">
                  E
                </span>
                <span className="leading-tight">
                  <span className="block text-xs font-extrabold text-[#1f1b16]">
                    {snapshot.activePrompt.actionVerb} · {snapshot.activePrompt.label}
                  </span>
                </span>
              </button>
            )}

            {/* Mobile / Tablet Right-Side Action Cluster */}
            {!isArriving && isTouchViewport && (
              <div className="pointer-events-none flex w-full items-end justify-end pr-2 pb-2">
                <div className="pointer-events-auto flex flex-col items-end gap-2.5">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onCycleCameraMode}
                    aria-label={`Switch camera view, currently ${camMeta.label}`}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#e6d5be] bg-[#fffaf0]/92 px-3 text-[11px] font-extrabold text-[#1f1b16] shadow active:scale-95"
                  >
                    {snapshot.cameraMode === 'first-person' ? (
                      <Eye className="h-3.5 w-3.5 text-[#185d7c]" aria-hidden="true" />
                    ) : (
                      <Video className="h-3.5 w-3.5 text-[#c75127]" aria-hidden="true" />
                    )}
                    <span>{camMeta.shortLabel}</span>
                  </button>

                  {snapshot.activePrompt && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={onInteract}
                      className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#d85a2a] px-4 text-xs font-extrabold text-white shadow-md active:scale-95"
                    >
                      <Hand className="h-4 w-4" aria-hidden="true" />
                      <span>{snapshot.activePrompt.actionVerb}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onPointerDown={handleRunDown}
                      onPointerUp={handleRunRelease}
                      onPointerCancel={handleRunRelease}
                      onLostPointerCapture={handleRunRelease}
                      aria-label="Hold to run"
                      aria-pressed={holdRunActive}
                      className={`flex h-12 w-12 touch-none flex-col items-center justify-center rounded-full border text-[10px] font-extrabold shadow transition-colors ${
                        holdRunActive
                          ? 'scale-95 border-[#e59824] bg-[#f5b738] text-[#1f1b16]'
                          : 'border-[#e6d5be] bg-[#fffaf0]/92 text-[#1f1b16]'
                      }`}
                    >
                      <Footprints className="h-4 w-4" aria-hidden="true" />
                      <span>Run</span>
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onMobileJump();
                      }}
                      className="flex h-12 w-12 touch-none items-center justify-center rounded-full border border-[#e6d5be] bg-[#fffaf0]/92 text-[11px] font-extrabold text-[#1f1b16] shadow active:scale-95"
                    >
                      Jump
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quiet single-line Desktop Key Controls Hint */}
            {!isArriving && !isTouchViewport && (
              <div className="flex items-center gap-2.5 rounded-full border border-[#e6d5be]/75 bg-[#fffaf0]/82 px-3.5 py-1 text-[11px] font-medium text-[#58423a] shadow-sm backdrop-blur-sm">
                <span>
                  <strong className="text-[#1f1b16]">WASD</strong> Move
                </span>
                <span>·</span>
                <span>
                  <strong className="text-[#1f1b16]">Shift</strong> Run
                </span>
                <span>·</span>
                <span>
                  <strong className="text-[#1f1b16]">Drag</strong> Look
                </span>
                <span>·</span>
                <span>
                  <strong className="text-[#1f1b16]">V</strong> View
                </span>
                <span>·</span>
                <span>
                  <strong className="text-[#1f1b16]">E</strong> Interact
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

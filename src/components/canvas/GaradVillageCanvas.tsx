import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { GaradWorldEngine } from '../../three/GaradWorldEngine';
import type {
  DestinationId,
  FootstepSurface,
  GraphicsQuality,
  MobileInputState,
  PortalId,
  SchoolProgressSnapshot,
  SchoolZoneId,
  ScreenId,
  ScreenProjectionSnapshot,
  TimeOfDayMode,
  WorldExplorerSnapshot,
} from '../../types/universe';

export interface GaradCanvasHandle {
  triggerBharariGreet: () => void;
  resetCameraView: () => void;
  setExternalHover: (id: DestinationId | null) => void;
  setMobileInput: (input: MobileInputState) => void;
  triggerSchoolJump: () => void;
  addSchoolLookDelta: (dx: number, dy: number) => void;
  adjustSchoolCameraZoom: (deltaAmount: number) => void;
  toggleFirstPersonCamera: () => void;
  cycleSchoolCameraMode: () => void;
  triggerSchoolInteract: () => void;
  turnLivingBookPage: (dir: -1 | 1) => void;
  closeLivingBook: () => void;
  dismissSchoolToast: () => void;
  teleportSchoolZone: (zone: SchoolZoneId) => void;
  // Complete Experience Upgrade handles
  skipCloudArrival: () => void;
  enterPortal: (portalId: PortalId) => void;
  returnToCentralHub: () => void;
  triggerWorldInteract: () => void;
  closeActiveExhibit: () => void;
  addWorldLookDelta: (dx: number, dy: number) => void;
  setWorldMobileInput: (input: MobileInputState) => void;
}

interface GaradVillageCanvasProps {
  screen: ScreenId;
  selectedDestination: DestinationId | null;
  timeOfDay: TimeOfDayMode;
  cameraSensitivity: number;
  graphicsQuality: GraphicsQuality;
  settingsModalOpen: boolean;
  onDestinationHover: (id: DestinationId | null) => void;
  onDestinationSelect: (id: DestinationId) => void;
  onJourneyProgress: (progress: number, activeLandmark: DestinationId) => void;
  onJourneyComplete: () => void;
  onProjectionsUpdate: (snapshot: ScreenProjectionSnapshot) => void;
  onBharariCue?: (cue: 'takeoff' | 'introduction') => void;
  onSchoolStateUpdate?: (snapshot: SchoolProgressSnapshot) => void;
  onSchoolBookPageTurn?: () => void;
  onSchoolExitToVillage?: () => void;
  onWorldStateUpdate?: (snapshot: WorldExplorerSnapshot) => void;
  onWorldScreenChange?: (screen: ScreenId) => void;
  onWorldAudioCue?: (
    cue:
      | 'cloud-reveal'
      | 'portal-approach'
      | 'portal-enter'
      | 'return-hub'
      | 'exhibit-open'
      | 'wing-flap'
      | 'guide-chirp',
    portalId?: PortalId,
  ) => void;
  onFootstep?: (surface: FootstepSurface, isRunning: boolean) => void;
  onEscapeKey?: () => void;
}

/**
 * Isolated WebGL canvas host.
 * Initializes GaradWorldEngine once inside a dedicated ref container so React HUD
 * state updates never tear down the 3D scene or reset camera motion.
 */
export const GaradVillageCanvas = forwardRef<GaradCanvasHandle, GaradVillageCanvasProps>(
  function GaradVillageCanvas(
    {
      screen,
      selectedDestination,
      timeOfDay,
      cameraSensitivity,
      graphicsQuality,
      settingsModalOpen,
      onDestinationHover,
      onDestinationSelect,
      onJourneyProgress,
      onJourneyComplete,
      onProjectionsUpdate,
      onBharariCue,
      onSchoolStateUpdate,
      onSchoolBookPageTurn,
      onSchoolExitToVillage,
      onWorldStateUpdate,
      onWorldScreenChange,
      onWorldAudioCue,
      onFootstep,
      onEscapeKey,
    },
    ref,
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const engineRef = useRef<GaradWorldEngine | null>(null);
    const [webglUnavailable, setWebglUnavailable] = useState(false);
    const [contextLost, setContextLost] = useState(false);
    const [sceneReady, setSceneReady] = useState(false);

    // Keep latest callbacks in refs so engine never needs re-initialization
    const callbacksRef = useRef({
      onDestinationHover,
      onDestinationSelect,
      onJourneyProgress,
      onJourneyComplete,
      onProjectionsUpdate,
      onBharariCue,
      onSchoolStateUpdate,
      onSchoolBookPageTurn,
      onSchoolExitToVillage,
      onWorldStateUpdate,
      onWorldScreenChange,
      onWorldAudioCue,
      onFootstep,
      onEscapeKey,
    });
    callbacksRef.current = {
      onDestinationHover,
      onDestinationSelect,
      onJourneyProgress,
      onJourneyComplete,
      onProjectionsUpdate,
      onBharariCue,
      onSchoolStateUpdate,
      onSchoolBookPageTurn,
      onSchoolExitToVillage,
      onWorldStateUpdate,
      onWorldScreenChange,
      onWorldAudioCue,
      onFootstep,
      onEscapeKey,
    };

    useImperativeHandle(ref, () => ({
      triggerBharariGreet: () => engineRef.current?.triggerBharariGreet(),
      resetCameraView: () => engineRef.current?.resetCameraView(),
      setExternalHover: (id) => engineRef.current?.setExternalHoveredDestination(id),
      setMobileInput: (input) => engineRef.current?.setMobileInput(input),
      triggerSchoolJump: () => engineRef.current?.triggerSchoolJump(),
      addSchoolLookDelta: (dx, dy) => engineRef.current?.addSchoolLookDelta(dx, dy),
      adjustSchoolCameraZoom: (delta) => engineRef.current?.adjustSchoolCameraZoom(delta),
      toggleFirstPersonCamera: () => engineRef.current?.toggleFirstPersonCamera(),
      cycleSchoolCameraMode: () => engineRef.current?.cycleSchoolCameraMode(),
      triggerSchoolInteract: () => engineRef.current?.triggerSchoolInteract(),
      turnLivingBookPage: (dir) => engineRef.current?.turnLivingBookPage(dir),
      closeLivingBook: () => engineRef.current?.closeLivingBook(),
      dismissSchoolToast: () => engineRef.current?.dismissSchoolToast(),
      teleportSchoolZone: (zone) => engineRef.current?.teleportSchoolZone(zone),
      skipCloudArrival: () => engineRef.current?.skipCloudArrival(),
      enterPortal: (portalId) => engineRef.current?.enterPortal(portalId),
      returnToCentralHub: () => engineRef.current?.returnToCentralHub(),
      triggerWorldInteract: () => engineRef.current?.triggerWorldInteract(),
      closeActiveExhibit: () => engineRef.current?.closeActiveExhibit(),
      addWorldLookDelta: (dx, dy) => engineRef.current?.addWorldLookDelta(dx, dy),
      setWorldMobileInput: (input) => engineRef.current?.setWorldMobileInput(input),
    }));

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      try {
        const engine = new GaradWorldEngine(container, {
          onDestinationHover: (id) => callbacksRef.current.onDestinationHover(id),
          onDestinationSelect: (id) => callbacksRef.current.onDestinationSelect(id),
          onJourneyProgress: (progress, landmark) =>
            callbacksRef.current.onJourneyProgress(progress, landmark),
          onJourneyComplete: () => callbacksRef.current.onJourneyComplete(),
          onProjectionsUpdate: (snap) => callbacksRef.current.onProjectionsUpdate(snap),
          onContextLost: (lost) => setContextLost(lost),
          onBharariCue: (cue) => callbacksRef.current.onBharariCue?.(cue),
          onSchoolStateUpdate: (snap) => callbacksRef.current.onSchoolStateUpdate?.(snap),
          onSchoolBookPageTurn: () => callbacksRef.current.onSchoolBookPageTurn?.(),
          onSchoolExitToVillage: () => callbacksRef.current.onSchoolExitToVillage?.(),
          onWorldStateUpdate: (snap) => callbacksRef.current.onWorldStateUpdate?.(snap),
          onWorldScreenChange: (next) => callbacksRef.current.onWorldScreenChange?.(next),
          onWorldAudioCue: (cue, portalId) =>
            callbacksRef.current.onWorldAudioCue?.(cue, portalId),
          onFootstep: (surface, isRunning) =>
            callbacksRef.current.onFootstep?.(surface, isRunning),
          onEscapeKey: () => callbacksRef.current.onEscapeKey?.(),
          onReady: () => setSceneReady(true),
        });
        engineRef.current = engine;
        return () => {
          engine.dispose();
          engineRef.current = null;
        };
      } catch {
        setWebglUnavailable(true);
        setSceneReady(true);
        return undefined;
      }
    }, []);

    useEffect(() => {
      engineRef.current?.setStageState(screen, selectedDestination);
    }, [screen, selectedDestination]);

    useEffect(() => {
      engineRef.current?.setTimeOfDay(timeOfDay);
    }, [timeOfDay]);

    useEffect(() => {
      engineRef.current?.setCameraSensitivity(cameraSensitivity);
    }, [cameraSensitivity]);

    useEffect(() => {
      engineRef.current?.setGraphicsQuality(graphicsQuality);
    }, [graphicsQuality]);

    useEffect(() => {
      engineRef.current?.setSettingsModalOpen(settingsModalOpen);
    }, [settingsModalOpen]);

    return (
      <div className="fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#69b5e4] via-[#d8edf6] to-[#7aa65a]">
        {/* Dedicated empty container exclusively managed by Three.js */}
        <div ref={mountRef} className="h-full w-full" aria-label="Interactive 3D Garad Universe" />

        {/* Subtle cinematic corner vignette */}
        <div className="garad-vignette fixed inset-0 z-[1]" aria-hidden="true" />

        {/* Smooth loading veil while the 3D living world compiles its first frame */}
        {!sceneReady && !webglUnavailable && (
          <div
            className="fixed inset-0 z-[3] flex items-center justify-center bg-gradient-to-b from-[#69b5e4] via-[#d8edf6] to-[#8bb368] p-6 transition-opacity duration-500"
            role="status"
            aria-live="polite"
          >
            <div className="garad-glass max-w-xs rounded-[1.75rem] px-6 py-5 text-center">
              <p className="text-base font-extrabold tracking-tight text-[#1f1b16]">
                Opening The World of Little Dreams
              </p>
              <p className="mt-1 text-xs font-medium text-[#58423a]">
                Preparing sunlit clouds, portals &amp; Bharari…
              </p>
            </div>
          </div>
        )}

        {/* Graceful fallback if WebGL is disabled or context temporarily lost */}
        {(webglUnavailable || contextLost) && (
          <div className="fixed inset-0 z-[2] flex items-center justify-center bg-gradient-to-b from-[#69b5e4] via-[#d8edf6] to-[#74985a] p-6">
            <div className="garad-glass max-w-md rounded-[2rem] p-6 text-center">
              <p className="text-lg font-bold text-[#1f1b16]">
                {contextLost
                  ? 'Restoring the 3D village view…'
                  : '3D Village Preview Unavailable'}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#58423a]">
                You can still navigate every Garad Village destination and read all
                programme panels using the navigation controls below.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  },
);

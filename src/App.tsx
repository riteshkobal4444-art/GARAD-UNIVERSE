import { useCallback, useEffect, useRef, useState } from 'react';
import { ambientSoundscape } from './audio/ambientSoundscape';
import {
  GaradVillageCanvas,
  type GaradCanvasHandle,
} from './components/canvas/GaradVillageCanvas';
import { TopHud } from './components/navigation/TopHud';
import { VillageDock } from './components/navigation/VillageDock';
import { ProgrammeInfoPanel } from './components/panels/ProgrammeInfoPanel';
import { DestinationOverlay } from './components/screens/DestinationOverlay';
import { FlyingJourneyOverlay } from './components/screens/FlyingJourneyOverlay';
import { MeetBharariOverlay } from './components/screens/MeetBharariOverlay';
import { SchoolAdventureOverlay } from './components/screens/SchoolAdventureOverlay';
import { SettingsModal } from './components/screens/SettingsModal';
import { VillageOverviewOverlay } from './components/screens/VillageOverviewOverlay';
import { WelcomeOverlay } from './components/screens/WelcomeOverlay';
import { WorldExplorerOverlay } from './components/screens/WorldExplorerOverlay';
import type {
  DestinationId,
  ExplorerSettings,
  FootstepSurface,
  MobileInputState,
  PortalId,
  SchoolProgressSnapshot,
  ScreenId,
  ScreenProjectionSnapshot,
  TimeOfDayMode,
  WorldExplorerSnapshot,
} from './types/universe';

const NEW_EXPERIENCE_SCREENS = new Set<ScreenId>([
  'cloud-arrival',
  'central-hub',
  'abhivyakta-world',
  'sankalp-world',
]);

export default function App() {
  const canvasRef = useRef<GaradCanvasHandle | null>(null);

  // Start cleanly in the Cinematic Cloud Arrival -> Central Hub Island experience
  const [screen, setScreen] = useState<ScreenId>('cloud-arrival');
  const [selectedDestination, setSelectedDestination] = useState<DestinationId | null>(null);
  const [hoveredDestination, setHoveredDestination] = useState<DestinationId | null>(null);
  const [visitedDestinations, setVisitedDestinations] = useState<DestinationId[]>([]);
  const [isProgrammePanelOpen, setIsProgrammePanelOpen] = useState(false);

  const [journeyProgress, setJourneyProgress] = useState(0);
  const [flyoverLandmark, setFlyoverLandmark] = useState<DestinationId>('village-school');

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayMode>('day');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [explorerSettings, setExplorerSettings] = useState<ExplorerSettings>(() => ({
    cameraSensitivity: 1.0,
    graphicsQuality: 'high',
    audio: ambientSoundscape.getSettings(),
  }));

  const [projections, setProjections] = useState<ScreenProjectionSnapshot>({
    bharariScreenPos: { x: 400, y: 360, visible: true },
    destinationPins: {
      'village-school': { id: 'village-school', x: 0, y: 0, visible: false },
      'village-library': { id: 'village-library', x: 0, y: 0, visible: false },
      'activity-ground': { id: 'activity-ground', x: 0, y: 0, visible: false },
      'community-centre': { id: 'community-centre', x: 0, y: 0, visible: false },
      'dream-hill': { id: 'dream-hill', x: 0, y: 0, visible: false },
    },
  });

  const [schoolSnapshot, setSchoolSnapshot] = useState<SchoolProgressSnapshot>({
    zone: 'village-street',
    zoneLabel: 'Mission Bharari',
    cameraMode: 'first-person',
    discoveredIds: [],
    totalDiscoverables: 12,
    activePrompt: null,
    openBookId: null,
    openBookSpreadIndex: 0,
    openBookTotalSpreads: 0,
    discoveryToast: null,
    arrivalActive: false,
    showArrivalLabel: false,
  });

  const [worldSnapshot, setWorldSnapshot] = useState<WorldExplorerSnapshot>({
    screen: 'cloud-arrival',
    locationLabel: 'Arriving in Garad Universe',
    arrivalProgress: 0,
    arrivalPhase: 'clouds',
    showLandingCaption: false,
    transitioningPortal: null,
    transitionVeilOpacity: 0,
    approachingPortal: null,
    activePrompt: null,
    activeExhibit: null,
    portalMarkers: [],
  });

  // Unlock Web Audio cleanly on first user interaction (respecting user mute preference)
  useEffect(() => {
    const unlock = () => {
      ambientSoundscape.unlockFromUserGesture();
      setExplorerSettings((prev) => ({
        ...prev,
        audio: ambientSoundscape.getSettings(),
      }));
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Sync layered ambient soundscape with active world, destination, school zone & time of day
  useEffect(() => {
    ambientSoundscape.setContext(
      timeOfDay,
      screen,
      selectedDestination,
      screen === 'school-adventure' ? schoolSnapshot.zone : null,
    );
  }, [timeOfDay, screen, selectedDestination, schoolSnapshot.zone]);

  // Clean up procedural audio on unmount
  useEffect(() => {
    return () => {
      ambientSoundscape.dispose();
    };
  }, []);

  // Keyboard shortcuts: 'H' toggles bottom dock in village modes; 'Escape' toggles settings outside first-person worlds
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isProgrammePanelOpen
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        if (screen === 'village-overview' || screen === 'destination') {
          setDockCollapsed((prev) => !prev);
        }
      } else if (e.key === 'Escape' && !NEW_EXPERIENCE_SCREENS.has(screen)) {
        if (settingsOpen) {
          setSettingsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, isProgrammePanelOpen, settingsOpen]);

  const handleUpdateSettings = useCallback((patch: Partial<ExplorerSettings>) => {
    setExplorerSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleUpdateAudio = useCallback((patch: Partial<ExplorerSettings['audio']>) => {
    const updated = ambientSoundscape.updateSettings(patch);
    setExplorerSettings((prev) => ({ ...prev, audio: updated }));
  }, []);

  const handleToggleSound = useCallback(() => {
    ambientSoundscape.toggle();
    setExplorerSettings((prev) => ({ ...prev, audio: ambientSoundscape.getSettings() }));
  }, []);

  const handleChangeTimeOfDay = useCallback((mode: TimeOfDayMode) => {
    ambientSoundscape.unlockFromUserGesture();
    setTimeOfDay(mode);
  }, []);

  const handleGoCentralHub = useCallback(() => {
    setIsProgrammePanelOpen(false);
    setSelectedDestination(null);
    setHoveredDestination(null);
    canvasRef.current?.returnToCentralHub();
  }, []);

  const handleNavigateDirectScreen = useCallback((nextScreen: ScreenId) => {
    setIsProgrammePanelOpen(false);
    setHoveredDestination(null);
    if (nextScreen === 'school-adventure') {
      setSelectedDestination('village-school');
    } else {
      setSelectedDestination(null);
    }
    setScreen(nextScreen);
  }, []);

  const handleReplayCloudArrival = useCallback(() => {
    setIsProgrammePanelOpen(false);
    setSelectedDestination(null);
    setHoveredDestination(null);
    setScreen('cloud-arrival');
  }, []);

  const handleSkipArrival = useCallback(() => {
    ambientSoundscape.unlockFromUserGesture();
    canvasRef.current?.skipCloudArrival();
  }, []);

  const handleWorldScreenChange = useCallback((nextScreen: ScreenId) => {
    setIsProgrammePanelOpen(false);
    setHoveredDestination(null);
    if (nextScreen !== 'destination') {
      setSelectedDestination(null);
    }
    setScreen(nextScreen);
  }, []);

  const handleWorldAudioCue = useCallback(
    (
      cue:
        | 'cloud-reveal'
        | 'portal-approach'
        | 'portal-enter'
        | 'return-hub'
        | 'exhibit-open'
        | 'wing-flap'
        | 'guide-chirp',
      portalId?: PortalId,
    ) => {
      switch (cue) {
        case 'cloud-reveal':
          ambientSoundscape.playCloudRevealChime();
          break;
        case 'portal-approach':
          if (portalId) ambientSoundscape.playPortalApproach(portalId);
          break;
        case 'portal-enter':
          if (portalId) ambientSoundscape.playPortalEnter(portalId);
          break;
        case 'return-hub':
          ambientSoundscape.playPortalEnter('return-hub');
          break;
        case 'exhibit-open':
          ambientSoundscape.playExhibitOpen();
          break;
        case 'wing-flap':
          ambientSoundscape.playWingFlap();
          break;
        case 'guide-chirp':
          ambientSoundscape.playChirp('guide');
          break;
      }
    },
    [],
  );

  const handleWorldEscapeKey = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  const handleWorldInteract = useCallback(() => {
    canvasRef.current?.triggerWorldInteract();
  }, []);

  const handleEnterPortalDirect = useCallback((portalId: PortalId) => {
    canvasRef.current?.enterPortal(portalId);
  }, []);

  const handleCloseWorldExhibit = useCallback(() => {
    canvasRef.current?.closeActiveExhibit();
  }, []);

  const handleWorldMobileInput = useCallback((input: MobileInputState) => {
    canvasRef.current?.setWorldMobileInput(input);
  }, []);

  const handleWorldMobileLook = useCallback((dx: number, dy: number) => {
    canvasRef.current?.addWorldLookDelta(dx, dy);
  }, []);

  // === EXISTING VILLAGE & SCHOOL HANDLERS (100% PRESERVED) ===
  const handleExploreUniverse = useCallback(() => {
    setIsProgrammePanelOpen(false);
    setSelectedDestination(null);
    setScreen('meet-bharari');
    ambientSoundscape.playChirp('happy');
  }, []);

  const handleStartFlyingJourney = useCallback(() => {
    setIsProgrammePanelOpen(false);
    setSelectedDestination(null);
    setJourneyProgress(0);
    setFlyoverLandmark('village-school');
    setScreen('flying-journey');
    ambientSoundscape.playChirp('fly');
  }, []);

  const handleGoToVillageOverview = useCallback(() => {
    setIsProgrammePanelOpen(false);
    setSelectedDestination(null);
    setScreen('village-overview');
    ambientSoundscape.playChirp('select');
  }, []);

  const handleGoHome = useCallback(() => {
    setIsProgrammePanelOpen(false);
    setSelectedDestination(null);
    setScreen('welcome');
  }, []);

  const handleEnterSchoolAdventure = useCallback(() => {
    setIsProgrammePanelOpen(false);
    setHoveredDestination(null);
    setSelectedDestination('village-school');
    setScreen('school-adventure');
    ambientSoundscape.playChirp('happy');
  }, []);

  const handleSchoolBookPageTurn = useCallback(() => {
    ambientSoundscape.playPageTurn();
  }, []);

  const handleMobileInputChange = useCallback((input: MobileInputState) => {
    canvasRef.current?.setMobileInput(input);
  }, []);

  const handleMobileJump = useCallback(() => {
    canvasRef.current?.triggerSchoolJump();
  }, []);

  const handleSchoolInteract = useCallback(() => {
    canvasRef.current?.triggerSchoolInteract();
  }, []);

  const handleTurnBookPage = useCallback((dir: -1 | 1) => {
    canvasRef.current?.turnLivingBookPage(dir);
  }, []);

  const handleCloseBook = useCallback(() => {
    canvasRef.current?.closeLivingBook();
  }, []);

  const handleDismissSchoolToast = useCallback(() => {
    canvasRef.current?.dismissSchoolToast();
  }, []);

  const handleFootstep = useCallback((surface: FootstepSurface, isRunning: boolean) => {
    ambientSoundscape.playFootstep(surface, isRunning);
  }, []);

  const handleCycleCameraMode = useCallback(() => {
    canvasRef.current?.cycleSchoolCameraMode();
  }, []);

  const handleMobileLookDelta = useCallback((dx: number, dy: number) => {
    canvasRef.current?.addSchoolLookDelta(dx, dy);
  }, []);

  const handleMobilePinchZoom = useCallback((deltaAmount: number) => {
    canvasRef.current?.adjustSchoolCameraZoom(deltaAmount);
  }, []);

  const handleSelectDestination = useCallback((id: DestinationId) => {
    setSelectedDestination(id);
    setHoveredDestination(null);
    setIsProgrammePanelOpen(false);
    setScreen('destination');
    setVisitedDestinations((prev) => (prev.includes(id) ? prev : [...prev, id]));
    ambientSoundscape.playChirp('select');
  }, []);

  const handleSwitchDestinationFromPanel = useCallback((id: DestinationId) => {
    setSelectedDestination(id);
    setScreen('destination');
    setVisitedDestinations((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setIsProgrammePanelOpen(true);
    ambientSoundscape.playChirp('select');
  }, []);

  const handleGreetBharari = useCallback(() => {
    canvasRef.current?.triggerBharariGreet();
    ambientSoundscape.playChirp('happy');
  }, []);

  const handleResetCamera = useCallback(() => {
    canvasRef.current?.resetCameraView();
  }, []);

  const handleExternalHover = useCallback((id: DestinationId | null) => {
    setHoveredDestination(id);
    canvasRef.current?.setExternalHover(id);
  }, []);

  const handleJourneyProgress = useCallback(
    (progress: number, activeLandmark: DestinationId) => {
      setJourneyProgress(progress);
      setFlyoverLandmark(activeLandmark);
    },
    [],
  );

  const handleJourneyComplete = useCallback(() => {
    setScreen('village-overview');
    ambientSoundscape.playChirp('happy');
  }, []);

  const handleBharariCue = useCallback((cue: 'takeoff' | 'introduction') => {
    ambientSoundscape.playChirp(cue === 'takeoff' ? 'fly' : 'happy');
  }, []);

  const isNewExperienceScreen = NEW_EXPERIENCE_SCREENS.has(screen);
  const soundEnabled = !explorerSettings.audio.muted;

  return (
    <main className="relative h-screen w-screen overflow-hidden select-none">
      {/* Persistent Continuous Single-Renderer 3D Universe Canvas */}
      <GaradVillageCanvas
        ref={canvasRef}
        screen={screen}
        selectedDestination={selectedDestination}
        timeOfDay={timeOfDay}
        cameraSensitivity={explorerSettings.cameraSensitivity}
        graphicsQuality={explorerSettings.graphicsQuality}
        settingsModalOpen={settingsOpen}
        onDestinationHover={setHoveredDestination}
        onDestinationSelect={handleSelectDestination}
        onJourneyProgress={handleJourneyProgress}
        onJourneyComplete={handleJourneyComplete}
        onProjectionsUpdate={setProjections}
        onBharariCue={handleBharariCue}
        onSchoolStateUpdate={setSchoolSnapshot}
        onSchoolBookPageTurn={handleSchoolBookPageTurn}
        onSchoolExitToVillage={handleGoCentralHub}
        onWorldStateUpdate={setWorldSnapshot}
        onWorldScreenChange={handleWorldScreenChange}
        onWorldAudioCue={handleWorldAudioCue}
        onFootstep={handleFootstep}
        onEscapeKey={handleWorldEscapeKey}
      />

      {/* Minimal Game-Grade HUD & Portal Transition Veil for Cloud Arrival, Central Hub, Abhivyaktā & Sankalp */}
      <WorldExplorerOverlay
        snapshot={worldSnapshot}
        soundMuted={explorerSettings.audio.muted}
        onSkipArrival={handleSkipArrival}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleMute={handleToggleSound}
        onTriggerInteract={handleWorldInteract}
        onEnterPortalDirect={handleEnterPortalDirect}
        onReturnToHub={handleGoCentralHub}
        onCloseExhibit={handleCloseWorldExhibit}
        onMobileInputChange={handleWorldMobileInput}
        onMobileLookDelta={handleWorldMobileLook}
      />

      {/* Existing Top HUD — shown only for Legacy Village Diorama & Bharari Showcase screens */}
      {!isNewExperienceScreen && screen !== 'school-adventure' && (
        <TopHud
          screen={screen}
          timeOfDay={timeOfDay}
          soundEnabled={soundEnabled}
          onChangeTimeOfDay={handleChangeTimeOfDay}
          onToggleSound={handleToggleSound}
          onOpenSettings={() => setSettingsOpen(true)}
          onGoCentralHub={handleGoCentralHub}
          onGoHome={handleGoHome}
          onGoMeetBharari={handleExploreUniverse}
          onGoVillage={handleGoToVillageOverview}
          onEnterSchoolAdventure={handleEnterSchoolAdventure}
          onReplayFlight={handleStartFlyingJourney}
          onResetCamera={handleResetCamera}
        />
      )}

      {/* Screen 1: Welcome Screen (Preserved) */}
      {screen === 'welcome' && (
        <WelcomeOverlay
          onExplore={handleExploreUniverse}
          onJumpToVillage={handleGoToVillageOverview}
          onEnterSchoolAdventure={handleEnterSchoolAdventure}
        />
      )}

      {/* Screen 2: Meet Bharari Screen (Preserved) */}
      {screen === 'meet-bharari' && (
        <MeetBharariOverlay
          bharariScreenPos={projections.bharariScreenPos}
          onGreetBharari={handleGreetBharari}
          onStartFlyingJourney={handleStartFlyingJourney}
          onGoDirectlyToVillage={handleGoToVillageOverview}
        />
      )}

      {/* Screen 3: Flying Journey Screen (Preserved) */}
      {screen === 'flying-journey' && (
        <FlyingJourneyOverlay
          progress={journeyProgress}
          activeLandmark={flyoverLandmark}
          onLandInVillage={handleGoToVillageOverview}
        />
      )}

      {/* Screen 4: Connected Village Overview (Preserved) */}
      {screen === 'village-overview' && (
        <VillageOverviewOverlay
          pins={projections.destinationPins}
          hoveredDestination={hoveredDestination}
          visitedDestinations={visitedDestinations}
          onSelectDestination={handleSelectDestination}
          onHoverDestination={handleExternalHover}
        />
      )}

      {/* Screen 5: Destination Experience (Preserved) */}
      {screen === 'destination' && selectedDestination && !isProgrammePanelOpen && (
        <DestinationOverlay
          destinationId={selectedDestination}
          dockCollapsed={dockCollapsed}
          onDiscoverMore={() => setIsProgrammePanelOpen(true)}
          onEnterSchoolAdventure={handleEnterSchoolAdventure}
          onBackToVillage={handleGoToVillageOverview}
          onSelectDestination={handleSelectDestination}
          onGreetBharari={handleGreetBharari}
        />
      )}

      {/* Mission Bharari Village Main Street, Village School & Garad Granthalay */}
      {screen === 'school-adventure' && (
        <SchoolAdventureOverlay
          snapshot={schoolSnapshot}
          timeOfDay={timeOfDay}
          onChangeTimeOfDay={handleChangeTimeOfDay}
          soundMuted={explorerSettings.audio.muted}
          onToggleMute={handleToggleSound}
          onOpenSettings={() => setSettingsOpen(true)}
          onInteract={handleSchoolInteract}
          onTurnBookPage={handleTurnBookPage}
          onCloseBook={handleCloseBook}
          onDismissToast={handleDismissSchoolToast}
          onReturnToHub={handleGoCentralHub}
          onCycleCameraMode={handleCycleCameraMode}
          onMobileInputChange={handleMobileInputChange}
          onMobileJump={handleMobileJump}
          onMobileLookDelta={handleMobileLookDelta}
          onMobilePinchZoom={handleMobilePinchZoom}
        />
      )}

      {/* Collapsible Bottom Village Dock (Only in Village / Destination / Bharari Screens) */}
      {!isNewExperienceScreen && !isProgrammePanelOpen && screen !== 'school-adventure' && (
        <VillageDock
          screen={screen}
          selectedDestination={selectedDestination}
          hoveredDestination={hoveredDestination}
          visitedDestinations={visitedDestinations}
          collapsed={dockCollapsed}
          onToggleCollapsed={() => setDockCollapsed((c) => !c)}
          onSelectDestination={handleSelectDestination}
          onHoverDestination={handleExternalHover}
          onBackToVillage={handleGoToVillageOverview}
          onReplayFlight={handleStartFlyingJourney}
        />
      )}

      {/* Screen 6: Programme Information Panel (Preserved) */}
      {isProgrammePanelOpen && selectedDestination && (
        <ProgrammeInfoPanel
          destinationId={selectedDestination}
          onClose={() => setIsProgrammePanelOpen(false)}
          onBackToVillage={handleGoToVillageOverview}
          onSwitchDestination={handleSwitchDestinationFromPanel}
        />
      )}

      {/* Global Accessible Settings Modal (Audio Mix, Camera Sensitivity, Quality, Sky, Worlds) */}
      <SettingsModal
        open={settingsOpen}
        screen={screen}
        timeOfDay={timeOfDay}
        settings={explorerSettings}
        onClose={() => setSettingsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onUpdateAudio={handleUpdateAudio}
        onChangeTimeOfDay={handleChangeTimeOfDay}
        onNavigateScreen={handleNavigateDirectScreen}
        onReplayCloudArrival={handleReplayCloudArrival}
      />
    </main>
  );
}

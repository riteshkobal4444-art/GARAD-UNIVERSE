import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VILLAGE_DESTINATIONS } from '../data/destinations';
import { ALL_WORLD_EXHIBITS_BY_ID, WORLD_PORTALS_BY_ID } from '../data/worldPortalsData';
import type {
  DestinationId,
  FootstepSurface,
  GraphicsQuality,
  IBharariCharacter,
  IPlayerCharacter,
  LivingBookId,
  MobileInputState,
  PortalId,
  ProjectedPin,
  ProjectedPortalMarker,
  SchoolDiscoveryToast,
  SchoolProgressSnapshot,
  SchoolZoneId,
  ScreenId,
  ScreenProjectionSnapshot,
  TimeOfDayMode,
  WorldExhibitRecord,
  WorldExplorerSnapshot,
  WorldProximityPrompt,
} from '../types/universe';
import { BharariAnimationStateMachine } from './animation/bharariStateMachine';
import {
  buildFlyingJourneySpline,
  getFlyoverDestinationAtProgress,
} from './animation/cameraChoreography';
import { CinematicCameraController } from './animation/cinematicCamera';
import { createBharariCharacter } from './character/BharariCharacter';
import {
  buildVillageCharacters,
  type VillageCharactersResult,
} from './characters/villageCharacters';
import {
  createAmbientWildlife,
  type AmbientWildlifeResult,
} from './environment/ambientWildlife';
import {
  createTimeOfDaySystem,
  type TimeOfDaySystem,
} from './environment/timeOfDaySystem';
import { createWindSystem, type WindSystem } from './environment/windSystem';
import { BharariCompanionController } from './school/BharariCompanion';
import {
  buildSchoolCampus,
  type SchoolCampusBuildResult,
} from './school/buildSchoolCampus';
import { InteractionManager } from './school/InteractionManager';
import { LivingBook3D } from './school/LivingBook3D';
import { createPlayerCharacter } from './school/PlayerCharacter';
import { PlayerController } from './school/PlayerController';
import {
  SCHOOL_ZONE_LABELS,
  SchoolCollisionWorld,
} from './school/SchoolCollisionAndZones';
import { ThirdPersonCamera } from './school/ThirdPersonCamera';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import {
  buildVillageDestinations,
  type DestinationsBuildResult,
} from './village/buildDestinations';
import {
  buildVillageEnvironment,
  type VillageEnvironmentResult,
} from './village/buildVillageEnvironment';
import { AbhivyaktaScene } from './worlds/AbhivyaktaScene';
import { CentralHubScene } from './worlds/CentralHubScene';
import { CloudArrivalScene } from './worlds/CloudArrivalScene';
import { FirstPersonExplorerController } from './worlds/FirstPersonExplorerController';
import { SankalpScene } from './worlds/SankalpScene';

export interface GaradWorldCallbacks {
  onDestinationHover: (id: DestinationId | null) => void;
  onDestinationSelect: (id: DestinationId) => void;
  onJourneyProgress: (progress: number, activeLandmark: DestinationId) => void;
  onJourneyComplete: () => void;
  onProjectionsUpdate: (snapshot: ScreenProjectionSnapshot) => void;
  onContextLost: (lost: boolean) => void;
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
  onReady?: () => void;
}

// Reusable scratch vectors allocated once outside the animation loop (zero GC)
const _vPos = new THREE.Vector3();
const _vTangent = new THREE.Vector3();
const _vProj = new THREE.Vector3();
const _vPrevDir = new THREE.Vector3();
const _vNextDir = new THREE.Vector3();
const _vCross = new THREE.Vector3();
const _vWelcomeLook = new THREE.Vector3();
const _vArrivalCam = new THREE.Vector3();
const _vArrivalLook = new THREE.Vector3();
const _vArrivalBird = new THREE.Vector3();
const _vArrivalBirdNext = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export class GaradWorldEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: GaradWorldCallbacks;
  private readonly isSoftwareGl: boolean;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly clock: THREE.Clock;

  private readonly textures: ProceduralTextureSet;
  private readonly wind: WindSystem;
  private readonly timeOfDay: TimeOfDaySystem;
  private readonly environment: VillageEnvironmentResult;
  private readonly destinations: DestinationsBuildResult;
  private readonly wildlife: AmbientWildlifeResult;
  private readonly characters: VillageCharactersResult;
  private readonly bharari: IBharariCharacter;
  private readonly stateMachine: BharariAnimationStateMachine;
  private readonly cameraController: CinematicCameraController;
  private readonly envMapTexture: THREE.Texture;

  // Stage 3 — Playable Mission Bharari School Adventure modules
  private readonly schoolCollision: SchoolCollisionWorld;
  private readonly schoolInteractions: InteractionManager;
  private readonly schoolCampus: SchoolCampusBuildResult;
  private readonly playerCharacter: IPlayerCharacter;
  private readonly playerController: PlayerController;
  private readonly thirdPersonCamera: ThirdPersonCamera;
  private readonly bharariCompanion: BharariCompanionController;
  private readonly livingBook3D: LivingBook3D;

  // Complete Experience Upgrade — Cloud Arrival, Central Hub Island, Abhivyaktā & Sankalp Worlds
  private readonly firstPersonController: FirstPersonExplorerController;
  private readonly cloudArrival: CloudArrivalScene;
  private readonly centralHub: CentralHubScene;
  private readonly abhivyaktaWorld: AbhivyaktaScene;
  private readonly sankalpWorld: SankalpScene;

  private graphicsQuality: GraphicsQuality = 'high';
  private worldDragActive = false;
  private worldDragPointerId: number | null = null;
  private worldLastPointer = { x: 0, y: 0 };
  private worldArrivalProgress = 0;
  private worldArrivalPhase: WorldExplorerSnapshot['arrivalPhase'] = 'clouds';
  private landingCaptionTimer = 0;
  private activeWorldPrompt: WorldProximityPrompt | null = null;
  private activeWorldExhibit: WorldExhibitRecord | null = null;
  private approachingPortal: PortalId | null = null;
  private portalTransitionTarget: PortalId | 'return-hub' | null = null;
  private portalTransitionElapsed = 0;
  private portalTransitionSwitched = false;
  private portalTransitionVeil = 0;
  private readonly portalGlideStart = new THREE.Vector3();
  private readonly portalGlideEnd = new THREE.Vector3();
  private lastWorldEmitMs = 0;
  private settingsModalOpen = false;

  private schoolDragActive = false;
  private schoolDragPointerId: number | null = null;
  private schoolLastPointer = { x: 0, y: 0 };
  private schoolCurrentZone: SchoolZoneId = 'village-street';
  private schoolDiscoveryToast: SchoolDiscoveryToast | null = null;
  private lastSchoolSnapshotKey = '';

  // Phase 1 — Mission Bharari Flying Journey Arrival over rural village onto Main Street
  private missionArrivalActive = false;
  private missionArrivalElapsed = 0;
  private readonly missionArrivalDuration = 5.2;
  private missionArrivalLabelTimer = 0;
  private readonly missionArrivalCamCurve: THREE.CatmullRomCurve3;
  private readonly missionArrivalLookCurve: THREE.CatmullRomCurve3;
  private readonly missionArrivalBirdCurve: THREE.CatmullRomCurve3;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2(-10, -10);
  private pointerDownPos = { x: 0, y: 0 };
  private lastRaycastMs = 0;
  private lastProjectionEmitMs = 0;

  private screen: ScreenId = 'cloud-arrival';
  private selectedDestination: DestinationId | null = null;
  private hoveredDestination: DestinationId | null = null;

  // Flying Journey multi-phase spline state (Takeoff -> Scenic Banking Flight -> Settle)
  private readonly journeySpline: THREE.CatmullRomCurve3;
  private journeyProgress = 0;
  private readonly journeyDurationSec = 15.5;
  private journeyCompletedEmitted = false;
  private lastReportedFlyoverId: DestinationId | null = null;
  private journeyBharariYaw = Math.PI * 0.92;
  private journeyBharariPitch = 0;
  private isInDestinationTransit = false;

  private frameId = 0;
  private disposed = false;
  private isTabHidden = false;
  private readyEmitted = false;
  private prefersReducedMotion = false;

  private readonly boundResize: () => void;
  private readonly boundPointerMove: (e: PointerEvent) => void;
  private readonly boundPointerDown: (e: PointerEvent) => void;
  private readonly boundPointerUp: (e: PointerEvent) => void;
  private readonly boundWheel: (e: WheelEvent) => void;
  private readonly boundVisibilityChange: () => void;
  private readonly boundContextLost: (e: Event) => void;
  private readonly boundContextRestored: () => void;

  constructor(container: HTMLElement, callbacks: GaradWorldCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    // 1. Renderer setup with natural filmic ACESFilmic tone mapping & balanced exposure (no constant bloom)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene, Atmospheric Fog & Studio RoomEnvironment IBL (Default DAY, smoothly shifts via TimeOfDaySystem)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#D4EBF6');
    this.scene.fog = new THREE.FogExp2('#D4EBF6', 0.0056);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMapTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMapTexture;
    pmrem.dispose();

    // 3. Camera, OrbitControls & Stage 2 Cinematic Camera Controller
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 260);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.055;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.minPolarAngle = 0.24;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 58;
    this.controls.enablePan = true;
    this.controls.enabled = false;

    this.cameraController = new CinematicCameraController(this.camera, this.controls);
    this.controls.addEventListener('start', () => {
      this.cameraController.notifyUserControlStart(this.screen, this.isInDestinationTransit);
    });

    // 4. Balanced Natural Outdoor Lighting Rig (orchestrated by TimeOfDaySystem)
    const hemiLight = new THREE.HemisphereLight('#88B6D8', '#586744', 0.56);
    hemiLight.position.set(0, 65, 0);
    this.scene.add(hemiLight);

    const sunKey = new THREE.DirectionalLight('#FFF0D6', 1.72);
    sunKey.position.set(38, 44, 28);
    sunKey.castShadow = true;
    sunKey.shadow.mapSize.width = 2048;
    sunKey.shadow.mapSize.height = 2048;
    sunKey.shadow.camera.near = 6;
    sunKey.shadow.camera.far = 135;
    const d = 46;
    sunKey.shadow.camera.left = -d;
    sunKey.shadow.camera.right = d;
    sunKey.shadow.camera.top = d;
    sunKey.shadow.camera.bottom = -d;
    sunKey.shadow.bias = -0.00042;
    sunKey.shadow.normalBias = 0.026;
    sunKey.shadow.radius = 3.2;
    this.scene.add(sunKey);

    const rimLight = new THREE.DirectionalLight('#B2D0E6', 0.24);
    rimLight.position.set(-34, 24, -30);
    this.scene.add(rimLight);

    const valleyFill = new THREE.DirectionalLight('#A8C6DC', 0.18);
    valleyFill.position.set(-22, 18, 28);
    this.scene.add(valleyFill);

    // 5. Procedural Textures, Reusable Wind System, Time-of-Day System & Living Village World
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.wind = createWindSystem();
    this.timeOfDay = createTimeOfDaySystem(
      this.scene,
      this.renderer,
      { sunKey, hemiLight, rimLight, valleyFill },
      this.textures,
      'day',
    );
    this.scene.add(this.timeOfDay.skyGroup);

    this.environment = buildVillageEnvironment(
      this.textures,
      this.wind,
      this.timeOfDay,
      this.isSoftwareGl,
    );
    this.scene.add(this.environment.group);

    this.destinations = buildVillageDestinations(this.textures, this.wind, this.timeOfDay);
    this.scene.add(this.destinations.group);

    this.wildlife = createAmbientWildlife(this.textures, this.wind, this.isSoftwareGl);
    this.scene.add(this.wildlife.group);

    this.characters = buildVillageCharacters(this.textures);
    this.scene.add(this.characters.group);

    this.bharari = createBharariCharacter(this.textures);
    this.bharari.group.scale.setScalar(1.08);
    this.bharari.group.position.copy(this.environment.knollPerchPosition);
    this.bharari.group.rotation.y = Math.PI * 0.92;
    this.scene.add(this.bharari.group);

    // Stage 2 Reusable Animation State Machine
    this.stateMachine = new BharariAnimationStateMachine(
      this.environment.knollPerchPosition,
      Math.PI * 0.92,
    );
    _vWelcomeLook.set(0, this.environment.knollPerchPosition.y, 0);
    this.stateMachine.perchAt(this.environment.knollPerchPosition, _vWelcomeLook, false);

    // Stage 3 Playable Mission Bharari School Adventure (hosted cleanly inside shared WebGLRenderer)
    this.schoolCollision = new SchoolCollisionWorld();
    this.schoolInteractions = new InteractionManager();
    this.schoolInteractions.group.visible = false;
    this.scene.add(this.schoolInteractions.group);

    this.schoolCampus = buildSchoolCampus(
      this.textures,
      this.wind,
      this.timeOfDay,
      this.schoolCollision,
      this.schoolInteractions,
      {
        onOpenLivingBook: (bookId: LivingBookId) => {
          this.schoolDiscoveryToast = null;
          this.schoolCampus.setBookPickedUp(bookId);
          this.livingBook3D.openBook(bookId);
          this.playerController.setBookOpen(true);
          this.bharariCompanion.triggerCelebration();
          this.callbacks.onSchoolBookPageTurn?.();
          this.emitSchoolSnapshot(true);
        },
        onExitToVillage: () => {
          this.callbacks.onSchoolExitToVillage?.();
        },
      },
    );
    this.scene.add(this.schoolCampus.group);

    this.playerCharacter = createPlayerCharacter(this.textures);
    this.playerCharacter.group.visible = false;
    this.scene.add(this.playerCharacter.group);

    this.playerController = new PlayerController(this.playerCharacter, this.schoolCollision, {
      onInteractKey: () => this.triggerSchoolInteract(),
      onBookPageKey: (dir) => this.turnLivingBookPage(dir),
      onCloseBookKey: () => this.closeLivingBook(),
      onToggleCameraViewKey: () => this.toggleFirstPersonCamera(),
      onFootstep: (surface, isRunning) => this.callbacks.onFootstep?.(surface, isRunning),
    });
    this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.schoolCollision);
    this.bharariCompanion = new BharariCompanionController(this.bharari, this.schoolCampus.perches);
    this.livingBook3D = new LivingBook3D(maxAniso);
    this.scene.add(this.livingBook3D.group);

    // Pre-build smooth Mission Bharari aerial arrival curves descending onto Main Street entrance
    const entrancePerch =
      this.bharariCompanion.getPerchById('perch-village-entrance')?.position ??
      new THREE.Vector3(2.45, 3.62, 45.5);
    this.missionArrivalCamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(12.2, 21.5, 95.0),
      new THREE.Vector3(6.2, 13.0, 79.5),
      new THREE.Vector3(-2.0, 6.4, 65.8),
      new THREE.Vector3(-0.35, 2.75, 56.2),
      new THREE.Vector3(0.0, 1.52, 51.8),
    ]);
    this.missionArrivalLookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.8, 3.6, 12.0),
      new THREE.Vector3(0.8, 3.1, 22.0),
      new THREE.Vector3(0.0, 2.4, 32.0),
      new THREE.Vector3(0.0, 2.0, 39.5),
      new THREE.Vector3(0.0, 1.37, 45.8),
    ]);
    this.missionArrivalBirdCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(7.6, 18.0, 84.5),
      new THREE.Vector3(3.1, 10.4, 70.0),
      new THREE.Vector3(-1.2, 5.5, 57.2),
      new THREE.Vector3(1.15, 4.35, 49.2),
      entrancePerch.clone(),
    ]);

    // Complete Experience Upgrade — Cloud Arrival, Central Portal Hub, Abhivyaktā & Sankalp Worlds
    this.firstPersonController = new FirstPersonExplorerController(this.camera, {
      onInteractKey: () => this.triggerWorldInteract(),
      onEscapeKey: () => {
        if (this.activeWorldExhibit) {
          this.closeActiveExhibit();
        } else {
          this.callbacks.onEscapeKey?.();
        }
      },
      onFootstep: (isRunning) => {
        this.callbacks.onFootstep?.(this.resolveFirstPersonWorldSurface(), isRunning);
      },
    });
    this.cloudArrival = new CloudArrivalScene(this.isSoftwareGl);
    this.scene.add(this.cloudArrival.group);

    this.centralHub = new CentralHubScene(
      this.textures,
      this.wind,
      this.timeOfDay,
      this.isSoftwareGl,
    );
    this.scene.add(this.centralHub.group);

    this.abhivyaktaWorld = new AbhivyaktaScene(this.textures, this.wind, this.timeOfDay);
    this.scene.add(this.abhivyaktaWorld.group);

    this.sankalpWorld = new SankalpScene(this.textures, this.wind, this.timeOfDay);
    this.scene.add(this.sankalpWorld.group);

    this.raycaster.layers.set(1);
    this.journeySpline = buildFlyingJourneySpline();

    // Start cleanly in the Cinematic Cloud Arrival sequence
    this.syncWorldVisibility('cloud-arrival');
    this.cloudArrival.start();
    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events (including visibilitychange pause for inactive browser tabs)
    this.boundResize = this.handleResize.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
    this.boundContextLost = (e: Event) => {
      e.preventDefault();
      this.callbacks.onContextLost(true);
    };
    this.boundContextRestored = () => {
      this.callbacks.onContextLost(false);
    };

    window.addEventListener('resize', this.boundResize);
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    this.renderer.domElement.addEventListener('pointermove', this.boundPointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.boundPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.boundPointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.boundPointerUp);
    this.renderer.domElement.addEventListener('wheel', this.boundWheel, { passive: true });
    this.renderer.domElement.addEventListener('webglcontextlost', this.boundContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.boundContextRestored);

    this.clock = new THREE.Clock();
    this.tick();
  }

  public setTimeOfDay(mode: TimeOfDayMode): void {
    this.timeOfDay.setMode(mode, this.prefersReducedMotion);
  }

  public getBharariAssetNote(): string {
    return this.bharari.assetVersionNote;
  }

  private isFirstPersonWorld(screen: ScreenId): boolean {
    return (
      screen === 'central-hub' ||
      screen === 'abhivyakta-world' ||
      screen === 'sankalp-world'
    );
  }

  private syncWorldVisibility(screen: ScreenId): void {
    const isVillage =
      screen === 'welcome' ||
      screen === 'meet-bharari' ||
      screen === 'flying-journey' ||
      screen === 'village-overview' ||
      screen === 'destination';
    const isSchool = screen === 'school-adventure';
    const isHubOrClouds = screen === 'cloud-arrival' || screen === 'central-hub';

    this.environment.group.visible = isVillage;
    this.destinations.group.visible = isVillage;
    this.characters.group.visible = isVillage;
    this.wildlife.group.visible = isVillage;

    this.schoolCampus.group.visible = isSchool;
    this.schoolInteractions.group.visible = isSchool;
    this.playerCharacter.group.visible = isSchool;
    if (!isSchool) {
      this.livingBook3D.group.visible = false;
    }

    this.centralHub.group.visible = isHubOrClouds;
    this.cloudArrival.group.visible = screen === 'cloud-arrival';
    this.abhivyaktaWorld.group.visible = screen === 'abhivyakta-world';
    this.sankalpWorld.group.visible = screen === 'sankalp-world';

    this.bharari.group.visible = true;
    this.bharari.group.scale.setScalar(isVillage ? 1.08 : isSchool ? 0.72 : 0.92);
  }

  public setCameraSensitivity(multiplier: number): void {
    this.firstPersonController.setSensitivity(multiplier);
    this.thirdPersonCamera.setSensitivity(multiplier);
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    const maxDpr = quality === 'high' ? 2 : 1.25;
    const dpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && quality === 'high';
  }

  private renderSceneFrame(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private resolveFirstPersonWorldSurface(): FootstepSurface {
    const pos = this.firstPersonController.position;
    if (this.screen === 'central-hub') {
      const distCenter = Math.hypot(pos.x, pos.z);
      return distCenter < 10.2 ? 'stone' : 'grass';
    }
    if (this.screen === 'abhivyakta-world') {
      return Math.hypot(pos.x, pos.z) < 12.4 ? 'stone' : 'grass';
    }
    if (this.screen === 'sankalp-world') {
      return Math.hypot(pos.x, pos.z) < 11.2 ? 'stone' : 'grass';
    }
    return 'dirt';
  }

  public setSettingsModalOpen(open: boolean): void {
    this.settingsModalOpen = open;
    this.firstPersonController.setInputBlocked(open || this.activeWorldExhibit !== null);
    this.playerController.setInputBlocked(open || this.missionArrivalActive);
  }

  public skipCloudArrival(): void {
    if (this.screen !== 'cloud-arrival') return;
    this.cloudArrival.skipToEnd();
    this.worldArrivalProgress = 1;
    this.worldArrivalPhase = 'complete';
    this.landingCaptionTimer = 4.6;
    this.callbacks.onWorldAudioCue?.('guide-chirp');
    this.callbacks.onWorldScreenChange?.('central-hub');
  }

  public enterPortal(portalId: PortalId): void {
    if (this.portalTransitionTarget) return;
    if (this.screen === 'central-hub') {
      const { center } = this.centralHub.getPortalEntryTransform(portalId);
      this.portalGlideStart.copy(this.camera.position);
      this.portalGlideEnd.set(center.x, 1.9, center.z);
      this.centralHub.startPortalFlyThrough(portalId);
    } else {
      this.portalGlideStart.copy(this.camera.position);
      this.portalGlideEnd.copy(this.camera.position);
    }
    this.portalTransitionTarget = portalId;
    this.portalTransitionElapsed = 0;
    this.portalTransitionSwitched = false;
    this.activeWorldExhibit = null;
    this.firstPersonController.setInputBlocked(true);
    this.callbacks.onWorldAudioCue?.('portal-enter', portalId);
    this.emitWorldSnapshot(true);
  }

  public returnToCentralHub(): void {
    if (this.screen === 'central-hub') return;
    if (this.portalTransitionTarget) return;
    this.portalGlideStart.copy(this.camera.position);
    this.portalGlideEnd.copy(this.camera.position);
    this.portalTransitionTarget = 'return-hub';
    this.portalTransitionElapsed = 0;
    this.portalTransitionSwitched = false;
    this.activeWorldExhibit = null;
    this.firstPersonController.setInputBlocked(true);
    this.callbacks.onWorldAudioCue?.('return-hub');
    this.emitWorldSnapshot(true);
  }

  public triggerWorldInteract(): void {
    if (this.portalTransitionTarget) return;
    if (this.activeWorldExhibit) {
      this.closeActiveExhibit();
      return;
    }
    const prompt = this.activeWorldPrompt;
    if (!prompt) return;

    if (prompt.kind === 'portal' && prompt.portalId) {
      this.enterPortal(prompt.portalId);
    } else if (prompt.kind === 'return-hub') {
      this.returnToCentralHub();
    } else if (prompt.kind === 'exhibit' && prompt.exhibitId) {
      const record = ALL_WORLD_EXHIBITS_BY_ID[prompt.exhibitId];
      if (record) {
        this.activeWorldExhibit = record;
        this.firstPersonController.setInputBlocked(true);
        this.callbacks.onWorldAudioCue?.('exhibit-open');
        this.emitWorldSnapshot(true);
      }
    }
  }

  public closeActiveExhibit(): void {
    if (!this.activeWorldExhibit) return;
    this.activeWorldExhibit = null;
    this.firstPersonController.setInputBlocked(this.settingsModalOpen);
    this.emitWorldSnapshot(true);
  }

  public addWorldLookDelta(dx: number, dy: number): void {
    if (this.isFirstPersonWorld(this.screen) && !this.portalTransitionTarget) {
      this.firstPersonController.addLookDelta(dx, dy);
    }
  }

  public setWorldMobileInput(input: MobileInputState): void {
    this.firstPersonController.setMobileInput(input);
  }

  public setStageState(screen: ScreenId, destinationId: DestinationId | null): void {
    const prevScreen = this.screen;
    const prevDest = this.selectedDestination;
    this.screen = screen;
    this.selectedDestination = destinationId;

    const isCompact = this.container.clientWidth < 768;

    // Leave school adventure cleanly when moving to any other screen
    if (prevScreen === 'school-adventure' && screen !== 'school-adventure') {
      this.exitSchoolAdventureMode();
    }

    // Leave first-person worlds cleanly when moving to village/school/clouds
    if (!this.isFirstPersonWorld(screen)) {
      this.firstPersonController.setActive(false);
      this.activeWorldExhibit = null;
      this.activeWorldPrompt = null;
      this.worldDragActive = false;
      this.worldDragPointerId = null;
    }

    this.syncWorldVisibility(screen);

    // === NEW EXPERIENCE SCREENS: CLOUD ARRIVAL, CENTRAL HUB, ABHIVYAKTĀ, SANKALP ===
    if (screen === 'cloud-arrival') {
      this.controls.enabled = false;
      this.cloudArrival.start();
      this.worldArrivalProgress = 0;
      this.worldArrivalPhase = 'clouds';
      this.landingCaptionTimer = 0;
      this.portalTransitionVeil = 0;
      this.renderer.domElement.style.cursor = 'default';
      this.emitWorldSnapshot(true);
      return;
    }

    if (screen === 'central-hub') {
      this.controls.enabled = false;
      this.cloudArrival.stop();
      this.firstPersonController.setBounds({
        maxRadius: 21.2,
        obstacles: this.centralHub.getObstacles(),
      });
      const spawn = this.cloudArrival.getLandingSpawn();
      this.firstPersonController.spawnAt(spawn.x, spawn.z, spawn.yaw, spawn.pitch);
      this.firstPersonController.setActive(true);
      this.firstPersonController.setInputBlocked(this.settingsModalOpen);
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
      this.renderer.domElement.style.cursor = 'grab';

      if (prevScreen === 'cloud-arrival') {
        this.landingCaptionTimer = 4.6;
        this.centralHub.triggerArrivalWelcome(this.bharari);
      } else {
        this.centralHub.triggerWelcomeBack(this.firstPersonController.position, this.bharari);
      }
      this.emitWorldSnapshot(true);
      return;
    }

    if (screen === 'abhivyakta-world') {
      this.controls.enabled = false;
      this.firstPersonController.setBounds({
        maxRadius: 17.6,
        obstacles: this.abhivyaktaWorld.getObstacles(),
      });
      const spawn = this.abhivyaktaWorld.getSpawn();
      this.firstPersonController.spawnAt(spawn.x, spawn.z, spawn.yaw, spawn.pitch);
      this.firstPersonController.setActive(true);
      this.firstPersonController.setInputBlocked(this.settingsModalOpen);
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
      this.renderer.domElement.style.cursor = 'grab';
      this.emitWorldSnapshot(true);
      return;
    }

    if (screen === 'sankalp-world') {
      this.controls.enabled = false;
      this.firstPersonController.setBounds({
        maxRadius: 16.4,
        obstacles: this.sankalpWorld.getObstacles(),
      });
      const spawn = this.sankalpWorld.getSpawn();
      this.firstPersonController.spawnAt(spawn.x, spawn.z, spawn.yaw, spawn.pitch);
      this.firstPersonController.setActive(true);
      this.firstPersonController.setInputBlocked(this.settingsModalOpen);
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
      this.renderer.domElement.style.cursor = 'grab';
      this.emitWorldSnapshot(true);
      return;
    }

    // === MISSION BHARARI VILLAGE ARRIVAL, MAIN STREET, SCHOOL & GARAD GRANTHALAY ===
    if (screen === 'school-adventure') {
      const fromLegacyVillage = prevScreen === 'village-overview' || prevScreen === 'destination';
      this.enterSchoolAdventureMode(!fromLegacyVillage);
      return;
    }

    // Restore crisp village camera FOV when returning from first-person worlds
    if (this.camera.fov !== 44) {
      this.camera.fov = 44;
      this.camera.updateProjectionMatrix();
    }

    if (screen === 'welcome') {
      this.controls.enabled = false;
      this.cameraController.setPreset('welcome', null, isCompact);
      _vWelcomeLook.set(0, this.environment.knollPerchPosition.y, 0);

      if (this.bharari.group.position.distanceTo(this.environment.knollPerchPosition) > 0.6) {
        this.stateMachine.commandFlightTo({
          targetPosition: this.environment.knollPerchPosition,
          lookAtNoticePoint: this.environment.knollPerchPosition,
          faceTargetAfterLanding: _vWelcomeLook,
          destinationId: null,
          playIntroduction: false,
          skipNotice: true,
          instant: this.prefersReducedMotion,
        });
      } else {
        this.stateMachine.perchAt(this.environment.knollPerchPosition, _vWelcomeLook, false);
      }
      return;
    }

    if (screen === 'meet-bharari') {
      this.controls.enabled = false;
      this.cameraController.setPreset('meet-bharari', null, isCompact);
      const camTarget = this.cameraController.getTargetPosition();
      const targetPos = this.environment.knollPerchPosition;

      if (this.bharari.group.position.distanceTo(targetPos) > 0.6) {
        this.stateMachine.commandFlightTo({
          targetPosition: targetPos,
          lookAtNoticePoint: targetPos,
          faceTargetAfterLanding: camTarget,
          destinationId: null,
          playIntroduction: true,
          skipNotice: true,
          instant: this.prefersReducedMotion,
        });
      } else {
        this.stateMachine.perchAt(targetPos, camTarget, true);
      }
      return;
    }

    if (screen === 'flying-journey') {
      this.controls.enabled = false;
      this.journeyProgress = 0;
      this.journeyCompletedEmitted = false;
      this.lastReportedFlyoverId = null;
      this.isInDestinationTransit = false;
      this.journeyBharariYaw = this.bharari.group.rotation.y;
      this.journeyBharariPitch = 0;
      this.bharari.setLookTarget(null);
      this.bharari.setBehaviorState('TAKEOFF');
      this.bharari.setTransitionPhase(0);
      this.callbacks.onJourneyProgress(0, 'village-school');
      return;
    }

    if (screen === 'village-overview') {
      this.controls.enabled = true;
      this.controls.minDistance = 12;
      this.controls.maxDistance = 58;
      this.isInDestinationTransit = false;
      this.cameraController.setPreset('village-overview', null, isCompact);
      this.stateMachine.enterOverviewSoaring();
      return;
    }

    if (screen === 'destination' && destinationId) {
      this.controls.enabled = true;
      this.controls.minDistance = 6.5;
      this.controls.maxDistance = 26;
      this.cameraController.setPreset('destination', destinationId, isCompact);

      if (prevScreen !== 'destination' || prevDest !== destinationId) {
        const destNode = this.destinations.nodes[destinationId];
        this.stateMachine.commandFlightTo({
          targetPosition: destNode.perchPosition,
          lookAtNoticePoint: destNode.worldCenter,
          faceTargetAfterLanding: this.cameraController.getTargetPosition(),
          destinationId,
          playIntroduction: true,
          instant: this.prefersReducedMotion,
        });
      }
    }
  }

  public resetCameraView(): void {
    const isCompact = this.container.clientWidth < 768;
    this.cameraController.setPreset(this.screen, this.selectedDestination, isCompact);
  }

  public triggerBharariGreet(): void {
    this.bharari.triggerGreet();
    this.stateMachine.triggerIntroductionBeat();
  }

  public setExternalHoveredDestination(id: DestinationId | null): void {
    this.hoveredDestination = id;
    if (id) {
      this.stateMachine.setExternalHoverLook(this.destinations.nodes[id].worldCenter);
    } else {
      this.stateMachine.setExternalHoverLook(null);
    }
  }

  /* ============================================================================
   * STAGE 3 — SCHOOL ADVENTURE LIFECYCLE & PUBLIC INTERACTION CONTROLS
   * ============================================================================ */

  private enterSchoolAdventureMode(playFlyingArrival = true): void {
    this.controls.enabled = false;
    this.hoveredDestination = null;
    this.renderer.domElement.style.cursor = 'grab';

    // Hide legacy village diorama groups, reveal 1:1 walkable Mission Bharari Village & School
    this.environment.group.visible = false;
    this.destinations.group.visible = false;
    this.characters.group.visible = false;
    this.wildlife.group.visible = false;

    this.schoolCampus.group.visible = true;
    this.schoolInteractions.group.visible = true;

    this.livingBook3D.closeBook();
    this.playerController.setBookOpen(false);
    this.playerController.setActive(true);
    this.schoolDiscoveryToast = null;

    if (playFlyingArrival) {
      // Spawn standing on Village Main Street facing North toward the physical MISSION BHARARI sign
      this.playerController.spawnAt(0, 51.8, Math.PI);
      this.playerController.setFirstPersonMode(true);
      this.playerController.setInputBlocked(true);

      this.thirdPersonCamera.resetBehindPlayer(
        this.playerController.position,
        Math.PI,
        'first-person',
      );

      // Begin smooth aerial flying arrival descending over the rural landscape onto Main Street
      this.missionArrivalActive = true;
      this.missionArrivalElapsed = 0;
      this.missionArrivalLabelTimer = 0;

      this.missionArrivalCamCurve.getPoint(0, _vArrivalCam);
      this.missionArrivalLookCurve.getPoint(0, _vArrivalLook);
      this.camera.position.copy(_vArrivalCam);
      this.camera.lookAt(_vArrivalLook);
      this.camera.fov = 48;
      this.camera.updateProjectionMatrix();

      this.missionArrivalBirdCurve.getPoint(0, _vArrivalBird);
      this.bharari.group.position.copy(_vArrivalBird);
      this.bharari.group.scale.setScalar(0.76);
      this.bharari.setBehaviorState('FLYING');
      this.bharari.setLookTarget(null);
      this.callbacks.onWorldAudioCue?.('wing-flap');
    } else {
      // Direct entry from preserved legacy village diorama -> School Courtyard
      this.missionArrivalActive = false;
      this.missionArrivalElapsed = 0;
      this.missionArrivalLabelTimer = 3.2;
      this.playerController.spawnAt(-1.8, 8.2, Math.PI);
      this.playerController.setFirstPersonMode(true);
      this.playerController.setInputBlocked(this.settingsModalOpen);
      this.thirdPersonCamera.resetBehindPlayer(
        this.playerController.position,
        Math.PI,
        'first-person',
      );
      this.bharariCompanion.activate(this.playerController.position, 'courtyard');
    }

    this.schoolCurrentZone = this.schoolCollision.getZoneAt(
      this.playerController.position.x,
      this.playerController.position.z,
    );
    this.emitSchoolSnapshot(true);
  }

  private updateMissionArrivalFlight(delta: number, elapsed: number): void {
    const dt = Math.min(delta, 0.05);
    const totalDur = this.prefersReducedMotion ? 1.85 : this.missionArrivalDuration;
    this.missionArrivalElapsed = Math.min(totalDur, this.missionArrivalElapsed + dt);
    const rawT = THREE.MathUtils.clamp(this.missionArrivalElapsed / totalDur, 0, 1);

    // Smooth cinematic ease-in-out descending onto standing Main Street eye level
    const eased = rawT * rawT * (3 - 2 * rawT);

    this.missionArrivalCamCurve.getPoint(eased, _vArrivalCam);
    this.missionArrivalLookCurve.getPoint(eased, _vArrivalLook);
    this.camera.position.copy(_vArrivalCam);
    this.camera.lookAt(_vArrivalLook);

    const targetFov = THREE.MathUtils.lerp(48, 58, eased);
    if (Math.abs(this.camera.fov - targetFov) > 0.02) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    // Bharari flies gracefully ahead over the village and settles onto the entrance sign perch
    const birdU = THREE.MathUtils.clamp(rawT * 1.06, 0, 1);
    const birdEased = birdU * birdU * (3 - 2 * birdU);
    this.missionArrivalBirdCurve.getPoint(birdEased, _vArrivalBird);
    this.missionArrivalBirdCurve.getPoint(Math.min(1, birdEased + 0.03), _vArrivalBirdNext);

    this.bharari.group.position.copy(_vArrivalBird);
    this.bharari.group.scale.setScalar(THREE.MathUtils.lerp(0.76, 0.58, birdEased));

    const dx = _vArrivalBirdNext.x - _vArrivalBird.x;
    const dy = _vArrivalBirdNext.y - _vArrivalBird.y;
    const dz = _vArrivalBirdNext.z - _vArrivalBird.z;
    if (dx * dx + dz * dz > 1e-5) {
      this.bharari.group.rotation.y = Math.atan2(dx, dz);
      this.bharari.group.rotation.x = THREE.MathUtils.clamp(-dy * 0.25, -0.22, 0.22);
    }

    if (birdU > 0.84) {
      this.bharari.setBehaviorState('LANDING');
      this.bharari.setFlightTelemetry({
        phase: (birdU - 0.84) / 0.16,
        speed: 0.35,
        climbRate: -0.35,
        bankAngle: 0,
        isGliding: false,
      });
    } else {
      this.bharari.setBehaviorState('FLYING');
      this.bharari.setFlightTelemetry({
        phase: birdU,
        speed: 0.92,
        climbRate: -0.25,
        bankAngle: Math.sin(birdU * Math.PI) * 0.18,
        isGliding: birdU > 0.45 && birdU < 0.84,
      });
    }

    this.bharari.update(dt, elapsed);

    if (rawT >= 1) {
      this.missionArrivalActive = false;
      this.missionArrivalLabelTimer = 4.2;
      this.playerController.setInputBlocked(this.settingsModalOpen);
      this.thirdPersonCamera.resetBehindPlayer(
        this.playerController.position,
        Math.PI,
        'first-person',
      );
      this.bharariCompanion.activateFromPerch(
        'perch-village-entrance',
        this.playerController.position,
      );
      this.callbacks.onWorldAudioCue?.('guide-chirp');
      this.emitSchoolSnapshot(true);
    }
  }

  private exitSchoolAdventureMode(): void {
    this.missionArrivalActive = false;
    this.missionArrivalElapsed = 0;
    this.missionArrivalLabelTimer = 0;
    this.playerController.setActive(false);
    this.playerController.setInputBlocked(false);
    this.playerController.setFirstPersonMode(false);
    this.playerController.setBookOpen(false);
    this.schoolCampus.setBookPickedUp(null);
    this.livingBook3D.closeBook();
    this.bharariCompanion.deactivate();
    this.schoolDragActive = false;
    this.schoolDragPointerId = null;

    this.schoolCampus.group.visible = false;
    this.schoolInteractions.group.visible = false;
    this.playerCharacter.group.visible = false;
    this.livingBook3D.group.visible = false;

    // Restore camera FOV cleanly when leaving village exploration
    this.camera.fov = 44;
    this.camera.updateProjectionMatrix();
  }

  public setMobileInput(input: MobileInputState): void {
    this.playerController.setMobileInput(input);
  }

  public triggerSchoolJump(): void {
    this.playerController.queueJump();
  }

  public addSchoolLookDelta(dx: number, dy: number): void {
    if (
      this.screen === 'school-adventure' &&
      !this.missionArrivalActive &&
      !this.settingsModalOpen &&
      !this.livingBook3D.isBookOpen()
    ) {
      this.thirdPersonCamera.addLookDelta(dx, dy);
    }
  }

  public adjustSchoolCameraZoom(deltaAmount: number): void {
    if (
      this.screen !== 'school-adventure' ||
      this.missionArrivalActive ||
      this.settingsModalOpen ||
      this.livingBook3D.isBookOpen()
    ) {
      return;
    }
    this.thirdPersonCamera.adjustDistance(deltaAmount);
    this.playerController.setFirstPersonMode(this.thirdPersonCamera.isFirstPerson());
    this.emitSchoolSnapshot(false);
  }

  public toggleFirstPersonCamera(): void {
    if (
      this.screen !== 'school-adventure' ||
      this.missionArrivalActive ||
      this.livingBook3D.isBookOpen()
    ) {
      return;
    }
    this.thirdPersonCamera.toggleFirstPerson();
    this.playerController.setFirstPersonMode(this.thirdPersonCamera.isFirstPerson());
    this.emitSchoolSnapshot(true);
  }

  public cycleSchoolCameraMode(): void {
    if (
      this.screen !== 'school-adventure' ||
      this.missionArrivalActive ||
      this.livingBook3D.isBookOpen()
    ) {
      return;
    }
    this.thirdPersonCamera.cycleViewMode();
    this.playerController.setFirstPersonMode(this.thirdPersonCamera.isFirstPerson());
    this.emitSchoolSnapshot(true);
  }

  public triggerSchoolInteract(): void {
    if (this.screen !== 'school-adventure' || this.missionArrivalActive) return;
    if (this.livingBook3D.isBookOpen()) {
      this.closeLivingBook();
      return;
    }

    const result = this.schoolInteractions.triggerActive();
    if (!result) return;

    this.playerController.triggerInteractAnimation();
    if (result.toast) {
      this.schoolDiscoveryToast = result.toast;
    }
    if (result.newlyDiscovered) {
      this.bharariCompanion.triggerCelebration();
      this.callbacks.onBharariCue?.('introduction');
    }
    this.emitSchoolSnapshot(true);
  }

  public turnLivingBookPage(direction: -1 | 1): void {
    if (!this.livingBook3D.isBookOpen()) return;
    const turned = this.livingBook3D.turnPage(direction);
    if (turned) {
      this.callbacks.onSchoolBookPageTurn?.();
      this.emitSchoolSnapshot(true);
    }
  }

  public closeLivingBook(): void {
    if (!this.livingBook3D.isBookOpen()) return;
    this.livingBook3D.closeBook();
    this.schoolCampus.setBookPickedUp(null);
    this.playerController.setBookOpen(false);
    this.emitSchoolSnapshot(true);
  }

  public dismissSchoolToast(): void {
    if (this.schoolDiscoveryToast) {
      this.schoolDiscoveryToast = null;
      this.emitSchoolSnapshot(true);
    }
  }

  public teleportSchoolZone(zone: SchoolZoneId): void {
    if (this.screen !== 'school-adventure' || this.missionArrivalActive) return;
    this.closeLivingBook();
    const keepMode = this.thirdPersonCamera.getMode();
    switch (zone) {
      case 'village-street':
        this.playerController.spawnAt(0, 50.0, Math.PI);
        break;
      case 'courtyard':
        this.playerController.spawnAt(-1.8, 8.2, Math.PI);
        break;
      case 'veranda':
        this.playerController.spawnAt(-4.5, 0.75, Math.PI);
        break;
      case 'classroom':
        this.playerController.spawnAt(-5.2, -2.2, Math.PI);
        break;
      case 'library':
        this.playerController.spawnAt(14.6, 17.5, Math.PI * 0.5);
        break;
      case 'playground':
        this.playerController.spawnAt(-18.5, 2.5, -Math.PI * 0.5);
        break;
    }
    this.thirdPersonCamera.resetBehindPlayer(
      this.playerController.position,
      this.playerController.getFacingYaw(),
      keepMode,
    );
    this.playerController.setFirstPersonMode(this.thirdPersonCamera.isFirstPerson());
    this.emitSchoolSnapshot(true);
  }

  private emitSchoolSnapshot(force = false): void {
    if (!this.callbacks.onSchoolStateUpdate) return;
    const prompt = this.missionArrivalActive ? null : this.schoolInteractions.getActivePrompt();
    const discoveredIds = this.schoolInteractions.getDiscoveredIds();
    const spread = this.livingBook3D.getSpreadInfo();
    const openBookId = this.livingBook3D.getOpenBookId();
    const cameraMode = this.thirdPersonCamera.getMode();
    const showArrivalLabel = !this.missionArrivalActive && this.missionArrivalLabelTimer > 0;

    const key = [
      this.schoolCurrentZone,
      cameraMode,
      this.missionArrivalActive ? 'arriving' : 'ready',
      showArrivalLabel ? 'label' : 'nolabel',
      discoveredIds.join(','),
      prompt ? `${prompt.id}:${prompt.actionVerb}` : 'none',
      openBookId ?? 'closed',
      spread.index,
      this.schoolDiscoveryToast ? this.schoolDiscoveryToast.timestamp : 0,
    ].join('|');

    if (!force && key === this.lastSchoolSnapshotKey) return;
    this.lastSchoolSnapshotKey = key;

    this.callbacks.onSchoolStateUpdate({
      zone: this.schoolCurrentZone,
      zoneLabel: SCHOOL_ZONE_LABELS[this.schoolCurrentZone],
      cameraMode,
      discoveredIds,
      totalDiscoverables: this.schoolInteractions.getTotalDiscoverables(),
      activePrompt: prompt,
      openBookId,
      openBookSpreadIndex: spread.index,
      openBookTotalSpreads: spread.total,
      discoveryToast: this.schoolDiscoveryToast,
      arrivalActive: this.missionArrivalActive,
      showArrivalLabel,
    });
  }

  private handleVisibilityChange(): void {
    if (this.disposed) return;
    this.isTabHidden = document.hidden;
    if (this.isTabHidden) {
      cancelAnimationFrame(this.frameId);
      window.clearTimeout(this.frameId);
    } else {
      // Clear accumulated elapsed delta so resuming never causes an animation jump
      this.clock.getDelta();
      this.tick();
    }
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    const maxDpr = this.graphicsQuality === 'high' ? 2 : 1.25;
    const dpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr);
    this.renderer.setPixelRatio(dpr);
  }

  private updatePointerNdc(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleWheel(e: WheelEvent): void {
    if (this.screen === 'school-adventure' && !this.livingBook3D.isBookOpen()) {
      this.adjustSchoolCameraZoom(e.deltaY);
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.isFirstPersonWorld(this.screen)) {
      if (this.worldDragActive && e.pointerId === this.worldDragPointerId) {
        const dx = e.clientX - this.worldLastPointer.x;
        const dy = e.clientY - this.worldLastPointer.y;
        this.worldLastPointer = { x: e.clientX, y: e.clientY };
        if (!this.activeWorldExhibit && !this.portalTransitionTarget && !this.settingsModalOpen) {
          this.firstPersonController.addLookDelta(dx, dy);
        }
      }
      return;
    }

    if (this.screen === 'school-adventure') {
      if (this.schoolDragActive && e.pointerId === this.schoolDragPointerId) {
        const dx = e.clientX - this.schoolLastPointer.x;
        const dy = e.clientY - this.schoolLastPointer.y;
        this.schoolLastPointer = { x: e.clientX, y: e.clientY };
        if (
          !this.missionArrivalActive &&
          !this.settingsModalOpen &&
          !this.livingBook3D.isBookOpen()
        ) {
          this.thirdPersonCamera.addLookDelta(dx, dy);
        }
      }
      return;
    }

    if (this.screen !== 'village-overview' && this.screen !== 'destination') {
      if (this.hoveredDestination !== null) {
        this.hoveredDestination = null;
        this.renderer.domElement.style.cursor = 'default';
        this.callbacks.onDestinationHover(null);
      }
      return;
    }

    const now = performance.now();
    if (now - this.lastRaycastMs < 45) return;
    this.lastRaycastMs = now;

    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.destinations.hitProxies, false);

    const nextHover =
      hits.length > 0 ? ((hits[0].object.userData.destinationId as DestinationId) ?? null) : null;

    if (nextHover !== this.hoveredDestination) {
      this.hoveredDestination = nextHover;
      this.renderer.domElement.style.cursor = nextHover ? 'pointer' : 'grab';
      this.callbacks.onDestinationHover(nextHover);

      // Bharari looks curiously toward hovered village destinations!
      if (nextHover) {
        this.stateMachine.setExternalHoverLook(this.destinations.nodes[nextHover].worldCenter);
      } else {
        this.stateMachine.setExternalHoverLook(null);
      }
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    if (
      this.isFirstPersonWorld(this.screen) &&
      !this.activeWorldExhibit &&
      !this.portalTransitionTarget &&
      !this.settingsModalOpen
    ) {
      this.worldDragActive = true;
      this.worldDragPointerId = e.pointerId;
      this.worldLastPointer = { x: e.clientX, y: e.clientY };
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }

    if (
      this.screen === 'school-adventure' &&
      !this.missionArrivalActive &&
      !this.settingsModalOpen &&
      !this.livingBook3D.isBookOpen()
    ) {
      this.schoolDragActive = true;
      this.schoolDragPointerId = e.pointerId;
      this.schoolLastPointer = { x: e.clientX, y: e.clientY };
      this.renderer.domElement.style.cursor = 'grabbing';
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (this.isFirstPersonWorld(this.screen)) {
      if (e.pointerId === this.worldDragPointerId) {
        this.worldDragActive = false;
        this.worldDragPointerId = null;
        this.renderer.domElement.style.cursor = 'grab';
      }
      return;
    }

    if (this.screen === 'school-adventure') {
      if (e.pointerId === this.schoolDragPointerId) {
        this.schoolDragActive = false;
        this.schoolDragPointerId = null;
        this.renderer.domElement.style.cursor = 'grab';
      }
      return;
    }

    if (this.screen !== 'village-overview' && this.screen !== 'destination') return;

    const dragDist = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y,
    );
    if (dragDist > 7) return;

    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.destinations.hitProxies, false);
    if (hits.length > 0) {
      const destId = hits[0].object.userData.destinationId as DestinationId | undefined;
      if (destId) {
        this.callbacks.onDestinationSelect(destId);
      }
    }
  }

  private emitProjectionsIfNeeded(): void {
    const now = performance.now();
    if (now - this.lastProjectionEmitMs < 42) return;
    this.lastProjectionEmitMs = now;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width <= 0 || height <= 0) return;

    _vProj.copy(this.bharari.group.position);
    _vProj.y += 1.25;
    _vProj.project(this.camera);
    const bharariScreenPos = {
      x: ((_vProj.x + 1) / 2) * width,
      y: ((-_vProj.y + 1) / 2) * height,
      visible: _vProj.z < 1 && _vProj.z > -1,
    };

    const destinationPins = {} as Record<DestinationId, ProjectedPin>;
    for (const cfg of VILLAGE_DESTINATIONS) {
      const node = this.destinations.nodes[cfg.id];
      _vProj.copy(node.pinAnchor).project(this.camera);
      destinationPins[cfg.id] = {
        id: cfg.id,
        x: ((_vProj.x + 1) / 2) * width,
        y: ((-_vProj.y + 1) / 2) * height,
        visible: _vProj.z < 1 && _vProj.z > -1,
      };
    }

    this.callbacks.onProjectionsUpdate({
      bharariScreenPos,
      destinationPins,
    });
  }

  private updateBharariAndCamera(delta: number, elapsed: number): void {
    const dt = Math.min(delta, 0.05);

    // === SCREEN 3: SCENIC FLYING JOURNEY (Takeoff -> Banking Scenic Flight -> Glide Settle) ===
    if (this.screen === 'flying-journey') {
      const speedMultiplier = this.prefersReducedMotion ? 1.8 : 1.0;
      this.journeyProgress = Math.min(
        1,
        this.journeyProgress + (dt / this.journeyDurationSec) * speedMultiplier,
      );

      const rawT = this.journeyProgress;
      const takeoffEnd = 0.085;
      const landingStart = 0.88;

      if (rawT < takeoffEnd) {
        const phase = rawT / takeoffEnd;
        const splineT = THREE.MathUtils.smoothstep(phase, 0.35, 1.0) * 0.025;
        this.journeySpline.getPoint(splineT, _vPos);
        this.journeySpline.getTangent(splineT, _vTangent);
        this.bharari.group.position.lerpVectors(
          this.environment.knollPerchPosition,
          _vPos,
          THREE.MathUtils.smoothstep(phase, 0.32, 1.0),
        );
        const yaw = Math.atan2(_vTangent.x, _vTangent.z);
        this.journeyBharariYaw = dampAngle(this.journeyBharariYaw, yaw, 7, dt);
        this.journeyBharariPitch = THREE.MathUtils.damp(
          this.journeyBharariPitch,
          -0.16 * phase,
          6,
          dt,
        );
        this.bharari.group.rotation.y = this.journeyBharariYaw;
        this.bharari.group.rotation.x = this.journeyBharariPitch;

        this.bharari.setBehaviorState('TAKEOFF');
        this.bharari.setFlightTelemetry({
          phase,
          speed: phase * 0.65,
          climbRate: 0.45 * phase,
          bankAngle: 0,
          isGliding: false,
        });
        this.stateMachine.syncExternalPose(
          'TAKEOFF',
          this.bharari.group.position,
          this.journeyBharariYaw,
          this.journeyBharariPitch,
          { phase, speed: phase * 0.65, bankAngle: 0, isGliding: false },
        );
      } else {
        const flightU = THREE.MathUtils.clamp((rawT - takeoffEnd) / (1 - takeoffEnd), 0, 1);
        const eased =
          flightU < 0.5
            ? 2 * flightU * flightU
            : 1 - Math.pow(-2 * flightU + 2, 2) / 2;
        const splineT = 0.025 + eased * 0.975;

        this.journeySpline.getPoint(splineT, _vPos);
        this.journeySpline.getTangent(splineT, _vTangent);
        this.bharari.group.position.copy(_vPos);

        const targetYaw = Math.atan2(_vTangent.x, _vTangent.z);
        this.journeyBharariYaw = dampAngle(this.journeyBharariYaw, targetYaw, 6.8, dt);
        const targetPitch = THREE.MathUtils.clamp(-_vTangent.y * 0.55, -0.32, 0.28);
        this.journeyBharariPitch = THREE.MathUtils.damp(
          this.journeyBharariPitch,
          targetPitch,
          5.5,
          dt,
        );
        this.bharari.group.rotation.y = this.journeyBharariYaw;
        this.bharari.group.rotation.x = this.journeyBharariPitch;

        const prevT = Math.max(0, splineT - 0.025);
        const nextT = Math.min(1, splineT + 0.025);
        this.journeySpline.getTangent(prevT, _vPrevDir);
        this.journeySpline.getTangent(nextT, _vNextDir);
        _vCross.crossVectors(_vPrevDir, _vNextDir);
        const bank = THREE.MathUtils.clamp(-_vCross.y * 4.8, -0.48, 0.48);

        // Glide gracefully near Dream Hill crest and on final valley settle
        const isGliding =
          rawT > landingStart || (rawT > 0.46 && rawT < 0.62 && _vTangent.y < 0.05);
        const climbRate = THREE.MathUtils.clamp(_vTangent.y * 1.4, -1, 1);
        const speedNorm = 0.72 + Math.sin(flightU * Math.PI) * 0.45;

        this.bharari.setBehaviorState('FLYING');
        this.bharari.setFlightTelemetry({
          speed: speedNorm,
          climbRate,
          bankAngle: bank,
          phase: flightU,
          isGliding,
        });
        this.stateMachine.syncExternalPose(
          'FLYING',
          this.bharari.group.position,
          this.journeyBharariYaw,
          this.journeyBharariPitch,
          { speed: speedNorm, climbRate, bankAngle: bank, phase: flightU, isGliding },
        );
      }

      // Stage 2 Cinematic Journey Follow Camera with scenic village reveals & clearance safety
      this.cameraController.updateFlyingJourney(
        this.bharari.group.position,
        _vTangent,
        rawT,
        takeoffEnd,
        dt,
      );

      const flyoverDest = getFlyoverDestinationAtProgress(rawT);
      if (flyoverDest !== this.lastReportedFlyoverId || Math.floor(rawT * 100) % 2 === 0) {
        this.lastReportedFlyoverId = flyoverDest;
        this.callbacks.onJourneyProgress(rawT, flyoverDest);
      }

      if (this.journeyProgress >= 1 && !this.journeyCompletedEmitted) {
        this.journeyCompletedEmitted = true;
        this.callbacks.onJourneyComplete();
      }
      return;
    }

    // === ALL OTHER SCREENS: UNIFIED STAGE 2 STATE MACHINE + CINEMATIC CAMERA ===
    const sm = this.stateMachine.update(dt, elapsed);
    this.isInDestinationTransit = sm.isInDestinationTransit;

    this.bharari.group.position.copy(sm.position);
    this.bharari.group.rotation.y = sm.yaw;
    this.bharari.group.rotation.x = sm.pitch;
    this.bharari.setBehaviorState(sm.state);
    this.bharari.setFlightTelemetry(sm.telemetry);
    this.bharari.setLookTarget(sm.lookTarget);

    if (sm.justEnteredTakeoff) {
      this.callbacks.onBharariCue?.('takeoff');
    } else if (sm.justEnteredIntroduction) {
      this.callbacks.onBharariCue?.('introduction');
    }

    this.cameraController.updateStandardMode(
      this.screen,
      {
        bharariPos: sm.position,
        forwardDir: sm.forwardDir,
        behaviorState: sm.state,
        flightProgress: sm.flightProgress,
        isInDestinationTransit: sm.isInDestinationTransit,
        bankAngle: sm.telemetry.bankAngle,
      },
      dt,
      elapsed,
    );
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private updatePortalTransition(delta: number): void {
    if (!this.portalTransitionTarget) {
      if (this.portalTransitionVeil > 0.001) {
        this.portalTransitionVeil = Math.max(0, this.portalTransitionVeil - delta * 2.4);
      }
      return;
    }

    const totalSec = this.prefersReducedMotion ? 0.55 : 1.18;
    const switchAt = totalSec * 0.64;
    this.portalTransitionElapsed += Math.min(delta, 0.05);

    if (this.portalTransitionElapsed < switchAt) {
      const u = this.portalTransitionElapsed / switchAt;
      const eased = u * u * (3 - 2 * u);
      this.portalTransitionVeil = THREE.MathUtils.smoothstep(u, 0.28, 1.0);

      // Gentle camera forward glide into the portal light during Central Hub entry
      if (this.screen === 'central-hub' && this.portalTransitionTarget !== 'return-hub') {
        this.camera.position.lerpVectors(
          this.portalGlideStart,
          this.portalGlideEnd,
          eased * 0.58,
        );
        this.camera.lookAt(this.portalGlideEnd);
      }
    } else if (!this.portalTransitionSwitched) {
      this.portalTransitionSwitched = true;
      this.portalTransitionVeil = 1;
      const nextScreen: ScreenId =
        this.portalTransitionTarget === 'return-hub'
          ? 'central-hub'
          : WORLD_PORTALS_BY_ID[this.portalTransitionTarget].targetScreen;
      this.callbacks.onWorldScreenChange?.(nextScreen);
    } else {
      const fadeU = (this.portalTransitionElapsed - switchAt) / (totalSec - switchAt);
      this.portalTransitionVeil = Math.max(0, 1 - fadeU);
      if (fadeU >= 1) {
        this.portalTransitionTarget = null;
        this.portalTransitionElapsed = 0;
        this.portalTransitionSwitched = false;
        this.portalTransitionVeil = 0;
        this.firstPersonController.setInputBlocked(this.settingsModalOpen);
      }
    }
  }

  private emitWorldSnapshot(force = false): void {
    if (!this.callbacks.onWorldStateUpdate) return;
    const now = performance.now();
    if (!force && now - this.lastWorldEmitMs < 46) return;
    this.lastWorldEmitMs = now;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    const portalMarkers: ProjectedPortalMarker[] = [];
    if (this.screen === 'central-hub' && width > 0 && height > 0) {
      const targets = this.centralHub.getPortalTargets();
      for (const t of targets) {
        const meta = WORLD_PORTALS_BY_ID[t.id];
        _vProj.copy(t.markerAnchor).project(this.camera);
        const visible =
          _vProj.z < 1 &&
          _vProj.z > -1 &&
          _vProj.x > -1.08 &&
          _vProj.x < 1.08 &&
          _vProj.y > -1.08 &&
          _vProj.y < 1.08;
        const dist = this.firstPersonController.position.distanceTo(t.center);
        portalMarkers.push({
          id: t.id,
          title: meta.title,
          subtitle: meta.subtitle,
          x: ((_vProj.x + 1) / 2) * width,
          y: ((-_vProj.y + 1) / 2) * height,
          visible,
          distance: dist,
          isApproaching: this.approachingPortal === t.id,
        });
      }
    }

    const locationLabel =
      this.screen === 'cloud-arrival'
        ? 'Arriving in Garad Universe'
        : this.screen === 'central-hub'
          ? 'Central Hub'
          : this.screen === 'abhivyakta-world'
            ? 'Abhivyaktā Amphitheatre'
            : this.screen === 'sankalp-world'
              ? 'Sankalp Community Courtyard'
              : 'Garad Village';

    this.callbacks.onWorldStateUpdate({
      screen: this.screen,
      locationLabel,
      arrivalProgress: this.worldArrivalProgress,
      arrivalPhase: this.worldArrivalPhase,
      showLandingCaption: this.landingCaptionTimer > 0,
      transitioningPortal: this.portalTransitionTarget,
      transitionVeilOpacity: this.portalTransitionVeil,
      approachingPortal: this.approachingPortal,
      activePrompt: this.portalTransitionTarget ? null : this.activeWorldPrompt,
      activeExhibit: this.activeWorldExhibit,
      portalMarkers,
    });
  }

  private tick = (): void => {
    if (this.disposed || this.isTabHidden) return;
    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;

    const todFactors = this.timeOfDay.update(delta, elapsed);
    this.wind.update(elapsed, 1.0 - todFactors.nightWeight * 0.25);

    if (this.landingCaptionTimer > 0) {
      this.landingCaptionTimer = Math.max(0, this.landingCaptionTimer - delta);
    }
    this.updatePortalTransition(delta);

    if (this.screen === 'cloud-arrival') {
      const arrival = this.cloudArrival.update(
        delta,
        elapsed,
        this.camera,
        this.bharari,
        this.prefersReducedMotion,
      );
      this.worldArrivalProgress = arrival.progress;
      this.worldArrivalPhase = arrival.phase;

      // Keep island living environment gently animated beneath the clouds
      this.centralHub.update(
        delta,
        elapsed,
        todFactors.nightWeight,
        this.firstPersonController.position,
        this.bharari,
        null,
        0,
      );
      // Re-apply cloud arrival Bharari pose right before updating plumage/wings
      this.cloudArrival.update(
        0,
        elapsed,
        this.camera,
        this.bharari,
        this.prefersReducedMotion,
      );
      this.bharari.update(delta, elapsed);

      if (arrival.justRevealedClouds) {
        this.callbacks.onWorldAudioCue?.('cloud-reveal');
      }
      if (arrival.justLanded) {
        this.callbacks.onWorldAudioCue?.('guide-chirp');
      }
      if (arrival.completed) {
        this.callbacks.onWorldScreenChange?.('central-hub');
      }

      this.renderSceneFrame();
      this.emitWorldSnapshot(false);
    } else if (this.screen === 'central-hub') {
      if (!this.portalTransitionTarget) {
        this.firstPersonController.update(delta);
      }
      const transPortal =
        this.portalTransitionTarget && this.portalTransitionTarget !== 'return-hub'
          ? this.portalTransitionTarget
          : null;
      const transProgress = transPortal ? Math.min(1, this.portalTransitionElapsed / 0.8) : 0;

      const hubUpdate = this.centralHub.update(
        delta,
        elapsed,
        todFactors.nightWeight,
        this.firstPersonController.position,
        this.bharari,
        transPortal,
        transProgress,
      );
      const prox = this.centralHub.getProximityState(this.firstPersonController.position);
      this.approachingPortal = prox.approachingPortal;
      this.activeWorldPrompt = prox.prompt;

      if (hubUpdate.newlyApproachedPortal) {
        this.callbacks.onWorldAudioCue?.('portal-approach', hubUpdate.newlyApproachedPortal);
      }

      this.bharari.update(delta, elapsed);
      this.renderSceneFrame();
      this.emitWorldSnapshot(false);
    } else if (this.screen === 'abhivyakta-world') {
      if (!this.portalTransitionTarget) {
        this.firstPersonController.update(delta);
      }
      this.activeWorldPrompt = this.abhivyaktaWorld.getProximityPrompt(
        this.firstPersonController.position,
      );
      this.approachingPortal = null;
      this.abhivyaktaWorld.update(delta, elapsed, this.firstPersonController.position, this.bharari);
      this.bharari.update(delta, elapsed);
      this.renderSceneFrame();
      this.emitWorldSnapshot(false);
    } else if (this.screen === 'sankalp-world') {
      if (!this.portalTransitionTarget) {
        this.firstPersonController.update(delta);
      }
      this.activeWorldPrompt = this.sankalpWorld.getProximityPrompt(
        this.firstPersonController.position,
      );
      this.approachingPortal = null;
      this.sankalpWorld.update(delta, elapsed, this.firstPersonController.position, this.bharari);
      this.bharari.update(delta, elapsed);
      this.renderSceneFrame();
      this.emitWorldSnapshot(false);
    } else if (this.screen === 'school-adventure') {
      if (this.missionArrivalActive) {
        this.schoolCampus.update(delta, elapsed, todFactors.nightWeight);
        this.updateMissionArrivalFlight(delta, elapsed);
        this.renderSceneFrame();
        this.emitSchoolSnapshot(false);
        if (this.portalTransitionVeil > 0) {
          this.emitWorldSnapshot(false);
        }
      } else {
        if (this.missionArrivalLabelTimer > 0) {
          this.missionArrivalLabelTimer = Math.max(0, this.missionArrivalLabelTimer - delta);
        }
        const bookOpen = this.livingBook3D.isBookOpen();
        this.playerController.update(delta, elapsed, this.thirdPersonCamera.getCameraForwardYaw());
        this.schoolCurrentZone = this.schoolCollision.getZoneAt(
          this.playerController.position.x,
          this.playerController.position.z,
        );
        this.schoolCampus.update(delta, elapsed, todFactors.nightWeight);
        this.schoolInteractions.update(
          this.playerController.position,
          this.playerController.getFacingYaw(),
          bookOpen,
          elapsed,
        );
        const hintPos = this.schoolInteractions.findNearestUndiscoveredHint(
          this.playerController.position,
          7.5,
        );
        this.bharariCompanion.update(
          delta,
          this.playerController.position,
          this.schoolCurrentZone,
          hintPos,
        );
        this.bharari.update(delta, elapsed);
        this.thirdPersonCamera.update(
          this.playerController.position,
          this.playerController.velocityXZ,
          bookOpen,
          delta,
        );
        this.livingBook3D.update(delta, elapsed, this.camera);

        this.renderSceneFrame();
        this.emitSchoolSnapshot(false);
        if (this.portalTransitionVeil > 0) {
          this.emitWorldSnapshot(false);
        }
      }
    } else {
      this.environment.update(delta, elapsed, todFactors.nightWeight);
      this.destinations.update(delta, elapsed, this.hoveredDestination, this.selectedDestination);
      this.wildlife.update(delta, elapsed, todFactors);
      this.updateBharariAndCamera(delta, elapsed);
      this.characters.update(delta, elapsed, this.camera.position);
      this.bharari.update(delta, elapsed);

      this.renderSceneFrame();
      this.emitProjectionsIfNeeded();
      if (this.portalTransitionVeil > 0) {
        this.emitWorldSnapshot(false);
      }
    }

    if (!this.readyEmitted) {
      this.readyEmitted = true;
      this.callbacks.onReady?.();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);

    window.removeEventListener('resize', this.boundResize);
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    this.renderer.domElement.removeEventListener('pointermove', this.boundPointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.boundPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.boundPointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.boundPointerUp);
    this.renderer.domElement.removeEventListener('wheel', this.boundWheel);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.boundContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.boundContextRestored);

    this.firstPersonController.dispose();
    this.cloudArrival.dispose();
    this.centralHub.dispose();
    this.abhivyaktaWorld.dispose();
    this.sankalpWorld.dispose();

    this.playerController.dispose();
    this.playerCharacter.dispose();
    this.schoolInteractions.dispose();
    this.schoolCampus.dispose();
    this.livingBook3D.dispose();

    this.controls.dispose();
    this.bharari.dispose();
    this.characters.dispose();
    this.wildlife.dispose();
    this.destinations.dispose();
    this.environment.dispose();
    this.timeOfDay.dispose();
    this.textures.dispose();
    this.envMapTexture.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

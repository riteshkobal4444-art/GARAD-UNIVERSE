import type * as THREE from 'three';

export type ScreenId =
  | 'cloud-arrival'
  | 'central-hub'
  | 'abhivyakta-world'
  | 'sankalp-world'
  | 'welcome'
  | 'meet-bharari'
  | 'flying-journey'
  | 'village-overview'
  | 'destination'
  | 'school-adventure';

export type PortalId = 'mission-bharari' | 'abhivyakta' | 'sankalp';

export type GraphicsQuality = 'high' | 'balanced';

export interface AudioMixSettings {
  muted: boolean;
  master: number;
  music: number;
  environment: number;
  footsteps: number;
  sfx: number;
}

export type FootstepSurface = 'dirt' | 'stone' | 'grass' | 'school-floor' | 'wood';

export interface ExplorerSettings {
  cameraSensitivity: number;
  graphicsQuality: GraphicsQuality;
  audio: AudioMixSettings;
}

export interface PortalMetadata {
  id: PortalId;
  title: string;
  subtitle: string;
  actionLabel: string;
  shortTheme: string;
  accentHex: string;
  glowHex: string;
  targetScreen: ScreenId;
}

export interface WorldExhibitRecord {
  id: string;
  world: 'abhivyakta' | 'sankalp';
  title: string;
  category: string;
  subtitle: string;
  summary: string;
  entries: SchoolInspectionEntry[];
  verificationNote?: string;
}

export interface ProjectedPortalMarker {
  id: PortalId;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  visible: boolean;
  distance: number;
  isApproaching: boolean;
}

export interface WorldProximityPrompt {
  id: string;
  kind: 'portal' | 'exhibit' | 'return-hub';
  portalId?: PortalId;
  exhibitId?: string;
  title: string;
  subtitle: string;
  actionLabel: string;
}

export interface WorldExplorerSnapshot {
  screen: ScreenId;
  locationLabel: string;
  arrivalProgress: number;
  arrivalPhase: 'clouds' | 'descent' | 'landing' | 'complete';
  showLandingCaption: boolean;
  transitioningPortal: PortalId | 'return-hub' | null;
  transitionVeilOpacity: number;
  approachingPortal: PortalId | null;
  activePrompt: WorldProximityPrompt | null;
  activeExhibit: WorldExhibitRecord | null;
  portalMarkers: ProjectedPortalMarker[];
}

export type DestinationId =
  | 'village-school'
  | 'village-library'
  | 'activity-ground'
  | 'community-centre'
  | 'dream-hill';

export type TimeOfDayMode = 'day' | 'sunset' | 'night';

export type BharariBehaviorState =
  | 'IDLE'
  | 'NOTICE'
  | 'TAKEOFF'
  | 'FLYING'
  | 'LANDING'
  | 'INTRODUCTION';

export type BharariAnimationState =
  | 'idle-perch'
  | 'notice'
  | 'greeting'
  | 'curious-look'
  | 'takeoff'
  | 'flying'
  | 'gliding'
  | 'landing'
  | 'introduction'
  | 'celebrate';

export interface BharariFlightTelemetry {
  /** Normalized speed (0 = stopped, 1 = cruise, >1 = brisk dive/swoop) */
  speed: number;
  /** Vertical velocity component (-1 = diving, 0 = level, +1 = climbing) */
  climbRate: number;
  /** Aerodynamic bank roll angle in radians */
  bankAngle: number;
  /** Normalized progress within current transition state (0..1) */
  phase: number;
  /** True when Bharari is effortlessly gliding/soaring instead of actively flapping */
  isGliding: boolean;
}

export type Vec3Tuple = [number, number, number];

export interface CameraPreset {
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov?: number;
}

export interface DestinationConfig {
  id: DestinationId;
  order: number;
  name: string;
  programmeTitle: string;
  themeLabel: string;
  shortSubtitle: string;
  accentHex: string;
  accentColor: string;
  /** World X/Z center of the landmark in the connected village */
  worldPosition: [number, number];
  /** Offset from worldPosition where Bharari perches when visiting */
  bharariPerchOffset: Vec3Tuple;
  /** Camera framing for Destination Experience */
  cameraOffset: Vec3Tuple;
  cameraTargetOffset: Vec3Tuple;
  /** Height offset for the floating 3D pin above terrain */
  pinHeightOffset: number;
  /** Brief storybook line spoken by Bharari upon arrival */
  bharariGreeting: string;
  /** Brief caption shown while Bharari flies past during the Flying Journey */
  flyoverCaption: string;
}

export interface ProgrammePlaceholderSection {
  heading: string;
  placeholderBody: string;
}

export interface ProgrammeContent {
  destinationId: DestinationId;
  programmeName: string;
  locationName: string;
  pillarLabel: string;
  stageNotice: string;
  leadPlaceholder: string;
  sections: ProgrammePlaceholderSection[];
  focusPlaceholders: string[];
  mediaSlotNote: string;
  collaborationNote: string;
}

export interface ProjectedPin {
  id: DestinationId;
  x: number;
  y: number;
  visible: boolean;
}

export interface ScreenProjectionSnapshot {
  bharariScreenPos: { x: number; y: number; visible: boolean };
  destinationPins: Record<DestinationId, ProjectedPin>;
}

/**
 * Contract for Bharari's 3D representation.
 * Built as a clearly replaceable character adapter so a production-ready rigged
 * GLTF/GLB model can drop in seamlessly without modifying scene or UI code.
 */
export interface IBharariCharacter {
  readonly group: THREE.Group;
  readonly isPlaceholderModel: boolean;
  readonly assetVersionNote: string;
  setBehaviorState(state: BharariBehaviorState): void;
  getBehaviorState(): BharariBehaviorState;
  setAnimationState(state: BharariAnimationState): void;
  getAnimationState(): BharariAnimationState;
  /** Phase progress (0..1) used during notice, takeoff, landing, or introduction transitions */
  setTransitionPhase(phase: number): void;
  /** Real-time aerodynamic telemetry driving natural wingbeats, tail rudder & pitch */
  setFlightTelemetry(telemetry: Partial<BharariFlightTelemetry>): void;
  /** Target world point Bharari tracks with head & eyes */
  setLookTarget(worldPoint: THREE.Vector3 | null): void;
  /** Aerodynamic bank roll angle in radians during flight turns */
  setBankAngle(bankRad: number): void;
  triggerGreet(): void;
  update(delta: number, elapsed: number): void;
  dispose(): void;
}

/* ============================================================================
 * STAGE 3 — MISSION BHARARI PLAYABLE SCHOOL ADVENTURE TYPES
 * ============================================================================ */

export type SchoolZoneId =
  | 'village-street'
  | 'courtyard'
  | 'veranda'
  | 'classroom'
  | 'library'
  | 'playground';

export type LivingBookId =
  | 'mission-bharari'
  | 'abhivyakta'
  | 'garad-granthalay'
  | 'rainy-day-of-dreams'
  | 'young-voices';

export type VerificationStatus =
  | 'verified'
  | 'initial-record-awaiting-verification'
  | 'placeholder';

export interface ProjectPhotoEntry {
  id: string;
  caption: string;
  /** Relative or hosted path to an actual Garad Foundation photograph when available */
  imageUrl: string | null;
  /** Displayed honestly whenever imageUrl is null */
  placeholderLabel: string;
  subjectNote: string;
}

export interface ProjectBookPage {
  pageNumber: number;
  kind: 'cover' | 'content';
  kicker: string;
  title: string;
  dateLocation?: string;
  bodyParagraphs: string[];
  highlights?: string[];
  photo?: ProjectPhotoEntry;
  verificationNote?: string;
}

export interface ProjectContentRecord {
  id: LivingBookId;
  bookNumber: string;
  title: string;
  coverTitle: string;
  subtitle: string;
  category: string;
  theme: string;
  coverColor: string;
  accentColor: string;
  spineLabel: string;
  shelfLocation: string;
  activityDate: string;
  location: string;
  shortIntroduction: string;
  description: string;
  documentedOutcomes: string[];
  verifiedBeneficiaryFigure: string;
  reportReferences: string[];
  verificationStatus: VerificationStatus;
  photos: ProjectPhotoEntry[];
  pages: ProjectBookPage[];
}

export interface NoticeboardRecord {
  id: string;
  projectId: LivingBookId;
  title: string;
  category: string;
  accentColor: string;
  entries: string[];
  verificationNote: string;
}

export interface VerifiedMapLocation {
  id: string;
  name: string;
  districtLabel: string;
  projectId: LivingBookId;
  projectTitle: string;
  date: string;
  summary: string;
  verificationNote: string;
  /** Normalized position on the stylized Maharashtra map canvas (0..1) */
  mapX: number;
  mapY: number;
}

export type InteractableKind =
  | 'door'
  | 'book'
  | 'blackboard'
  | 'exhibition'
  | 'learning-wall'
  | 'activity-wall'
  | 'map-wall'
  | 'noticeboard'
  | 'sports'
  | 'exit';

export interface SchoolInteractablePrompt {
  id: string;
  kind: InteractableKind;
  label: string;
  actionVerb: string;
  subtitle?: string;
  bookId?: LivingBookId;
}

export interface SchoolInspectionEntry {
  heading: string;
  meta?: string;
  details: string[];
  photoPlaceholder?: string;
  verificationNote?: string;
}

export interface SchoolDiscoveryToast {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  entries?: SchoolInspectionEntry[];
  note?: string;
  timestamp: number;
}

export type CameraViewMode = 'close-third' | 'far-third' | 'first-person';

export interface SchoolProgressSnapshot {
  zone: SchoolZoneId;
  zoneLabel: string;
  cameraMode: CameraViewMode;
  arrivalActive: boolean;
  showArrivalLabel: boolean;
  discoveredIds: string[];
  totalDiscoverables: number;
  activePrompt: SchoolInteractablePrompt | null;
  openBookId: LivingBookId | null;
  openBookSpreadIndex: number;
  openBookTotalSpreads: number;
  discoveryToast: SchoolDiscoveryToast | null;
}

export type PlayerAnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'turn'
  | 'stop'
  | 'jump'
  | 'interact';

export interface PlayerMotionTelemetry {
  speed: number;
  maxSpeed: number;
  turnRate: number;
  grounded: boolean;
  verticalVelocity: number;
  isRunning: boolean;
}

/**
 * Replaceable Child Explorer contract.
 * Keeps character rendering & animation completely decoupled from school world,
 * physics, and UI so a rigged GLTF/GLB production model can drop in later.
 */
export interface IPlayerCharacter {
  readonly group: THREE.Group;
  readonly isPlaceholderModel: boolean;
  readonly assetVersionNote: string;
  setAnimationState(state: PlayerAnimationState): void;
  getAnimationState(): PlayerAnimationState;
  setMotionTelemetry(telemetry: PlayerMotionTelemetry): void;
  triggerInteractGesture(): void;
  update(delta: number, elapsed: number): void;
  dispose(): void;
}

export interface MobileInputState {
  /** Horizontal joystick axis -1..1 (right positive) */
  moveX: number;
  /** Vertical joystick axis -1..1 (forward positive) */
  moveY: number;
  /** Run toggle / hold */
  running: boolean;
}


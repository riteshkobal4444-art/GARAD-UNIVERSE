import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VILLAGE_DESTINATIONS } from '../../data/destinations';
import type { BharariBehaviorState, DestinationId, ScreenId } from '../../types/universe';
import { groundHeightAt } from '../terrain';
import { getCameraPresetForScreen } from './cameraChoreography';

interface BuildingExclusionZone {
  x: number;
  z: number;
  radius: number;
  roofHeight: number;
}

// Reusable scratch vectors allocated once at module scope (zero GC in render loop)
const _vCamDesired = new THREE.Vector3();
const _vLookDesired = new THREE.Vector3();
const _vTrailCam = new THREE.Vector3();
const _vTrailLook = new THREE.Vector3();
const _vHorizFwd = new THREE.Vector3();
const _vRight = new THREE.Vector3();
const _vUp = new THREE.Vector3(0, 1, 0);
const _vVillageCenter = new THREE.Vector3(0, 2.0, -3.5);

const BUILDING_ZONES: BuildingExclusionZone[] = [
  ...VILLAGE_DESTINATIONS.map((d) => ({
    x: d.worldPosition[0],
    z: d.worldPosition[1],
    radius: d.id === 'activity-ground' ? 5.2 : 4.8,
    roofHeight: groundHeightAt(d.worldPosition[0], d.worldPosition[1]) + (d.id === 'dream-hill' ? 6.2 : 5.4),
  })),
  // Central village crossroads banyan canopy
  {
    x: 0,
    z: 0,
    radius: 3.6,
    roofHeight: groundHeightAt(0, 0) + 5.8,
  },
];

/**
 * Enforces safe terrain clearance and gently pushes the camera outside building footprints
 * so cinematic camera transitions and user orbiting never clip into roofs or hillsides.
 */
export function enforceCameraClearance(pos: THREE.Vector3, minGroundClearance = 1.95): void {
  const groundY = groundHeightAt(pos.x, pos.z);
  const minY = groundY + minGroundClearance;
  if (pos.y < minY) {
    pos.y = minY;
  }

  for (let i = 0; i < BUILDING_ZONES.length; i++) {
    const zone = BUILDING_ZONES[i];
    if (pos.y > zone.roofHeight + 1.2) continue;

    const dx = pos.x - zone.x;
    const dz = pos.z - zone.z;
    const distSq = dx * dx + dz * dz;
    const minR = zone.radius;
    if (distSq < minR * minR) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.001) {
        const push = (minR - dist) / dist;
        pos.x += dx * push;
        pos.z += dz * push;
      } else {
        pos.z += minR;
      }
      // Re-check terrain after lateral push
      const newGround = groundHeightAt(pos.x, pos.z) + minGroundClearance;
      if (pos.y < newGround) {
        pos.y = newGround;
      }
    }
  }
}

export interface FlightCameraInput {
  bharariPos: THREE.Vector3;
  forwardDir: THREE.Vector3;
  behaviorState: BharariBehaviorState;
  flightProgress: number;
  isInDestinationTransit: boolean;
  bankAngle: number;
}

/**
 * Stage 2 Cinematic Camera Controller
 *
 * Delivers smooth, film-inspired camera choreography across every mode:
 * - Welcome: gentle golden-hour panoramic drift
 * - Meet Bharari: intimate hero framing on Bharari's branch
 * - Flying Journey: expressive trailing chase cam with scenic village vista reveals
 * - Destination Flight (NOTICE -> TAKEOFF -> FLYING -> LANDING):
 *     Trails Bharari smoothly through the sky, widens mid-arc to reveal the village,
 *     and seamlessly glides into the Destination framing showcasing Bharari + landmark together.
 * - Destination & Village Overview: user OrbitControls with non-clipping terrain/building safety.
 */
export class CinematicCameraController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;

  private readonly targetPos = new THREE.Vector3();
  private readonly targetLook = new THREE.Vector3();
  private targetFov = 44;

  private isTransitioning = true;
  private userHasOrbited = false;
  private isCompactViewport = false;

  // Smoothed lateral sway bias for graceful 3/4 trailing angles
  private trailSideBias = 1;

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
  }

  public getTargetPosition(): THREE.Vector3 {
    return this.targetPos;
  }

  public getTargetLook(): THREE.Vector3 {
    return this.targetLook;
  }

  public notifyUserControlStart(screen: ScreenId, isInTransit: boolean): void {
    // Allow user to freely orbit once settled in overview or destination
    if (!isInTransit && (screen === 'village-overview' || screen === 'destination')) {
      this.isTransitioning = false;
      this.userHasOrbited = true;
    }
  }

  public setPreset(
    screen: ScreenId,
    destinationId: DestinationId | null,
    isCompact: boolean,
    snapImmediate = false,
  ): void {
    this.isCompactViewport = isCompact;
    const preset = getCameraPresetForScreen(screen, destinationId, isCompact);
    this.targetPos.copy(preset.position);
    this.targetLook.copy(preset.target);
    this.targetFov = preset.fov;
    enforceCameraClearance(this.targetPos, 1.9);

    this.isTransitioning = true;
    this.userHasOrbited = false;

    // Pick a gentle 3/4 trailing side based on destination side of the village
    if (destinationId === 'activity-ground' || destinationId === 'community-centre') {
      this.trailSideBias = -1;
    } else {
      this.trailSideBias = 1;
    }

    if (snapImmediate) {
      this.camera.position.copy(this.targetPos);
      this.camera.fov = this.targetFov;
      this.camera.updateProjectionMatrix();
      this.controls.target.copy(this.targetLook);
      this.controls.update();
      this.isTransitioning = false;
    }
  }

  /**
   * Updates camera during Screen 3 (Scenic Flying Journey over all 5 landmarks).
   */
  public updateFlyingJourney(
    bharariPos: THREE.Vector3,
    forwardDir: THREE.Vector3,
    journeyProgress: number,
    takeoffEnd: number,
    dt: number,
  ): void {
    _vHorizFwd.set(forwardDir.x, 0, forwardDir.z);
    if (_vHorizFwd.lengthSq() < 0.001) _vHorizFwd.set(0, 0, -1);
    _vHorizFwd.normalize();
    _vRight.crossVectors(_vHorizFwd, _vUp).normalize();

    // Gently widen and elevate around mid-journey vistas (e.g. Library -> Dream Hill -> Community)
    // to reveal the connected village valley while keeping Bharari clearly in hero view
    const vistaReveal = Math.sin(THREE.MathUtils.clamp(journeyProgress, 0, 1) * Math.PI);
    const trailDist = 8.6 + vistaReveal * 3.8 + (this.isCompactViewport ? 2.2 : 0);
    const trailHeight = 3.7 + vistaReveal * 2.1;
    const lateralSweep = Math.sin(journeyProgress * Math.PI * 2.2) * 2.4;

    _vCamDesired
      .copy(bharariPos)
      .addScaledVector(_vHorizFwd, -trailDist)
      .addScaledVector(_vUp, trailHeight)
      .addScaledVector(_vRight, lateralSweep);

    enforceCameraClearance(_vCamDesired, 2.4);

    // Look slightly ahead of Bharari, subtly pulling toward the sunlit village center during wide reveals
    _vLookDesired
      .copy(bharariPos)
      .addScaledVector(_vHorizFwd, 5.2)
      .addScaledVector(_vUp, -0.7);
    _vLookDesired.lerp(_vVillageCenter, vistaReveal * 0.16);

    const posLambda = journeyProgress < takeoffEnd ? 2.4 : 2.9;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _vCamDesired.x, posLambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _vCamDesired.y, posLambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _vCamDesired.z, posLambda, dt);

    this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _vLookDesired.x, 3.8, dt);
    this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _vLookDesired.y, 3.8, dt);
    this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _vLookDesired.z, 3.8, dt);

    const desiredFov = (journeyProgress < takeoffEnd ? 43 : 47 + vistaReveal * 3.5) + (this.isCompactViewport ? 4 : 0);
    this.dampFov(desiredFov, 2.6, dt);
    this.camera.lookAt(this.controls.target);
  }

  /**
   * Updates camera across Welcome, Meet Bharari, Village Overview, and Destination modes—
   * including dynamic trailing follow whenever Bharari flies between destinations.
   */
  public updateStandardMode(
    screen: ScreenId,
    flight: FlightCameraInput,
    dt: number,
    elapsed: number,
  ): void {
    // 1. Welcome screen gentle panoramic breath
    if (screen === 'welcome') {
      const driftX = Math.sin(elapsed * 0.24) * 1.1;
      const driftY = Math.cos(elapsed * 0.19) * 0.3;
      _vCamDesired.set(
        this.targetPos.x + driftX,
        this.targetPos.y + driftY,
        this.targetPos.z,
      );
      enforceCameraClearance(_vCamDesired, 2.0);
      this.dampPosition(_vCamDesired, 2.6, dt);
      this.dampLookTarget(this.targetLook, 3.2, dt);
      this.dampFov(this.targetFov, 2.8, dt);
      this.camera.lookAt(this.controls.target);
      return;
    }

    // 2. Active Destination Flight Follow (NOTICE -> TAKEOFF -> FLYING -> LANDING)
    if (screen === 'destination' && flight.isInDestinationTransit && !this.userHasOrbited) {
      this.isTransitioning = true;
      _vHorizFwd.set(flight.forwardDir.x, 0, flight.forwardDir.z);
      if (_vHorizFwd.lengthSq() < 0.001) _vHorizFwd.set(0, 0, 1);
      _vHorizFwd.normalize();
      _vRight.crossVectors(_vHorizFwd, _vUp).normalize();

      const p = flight.flightProgress;
      // Mid-arc village reveal bell curve (peaks smoothly around mid-flight)
      const midArcReveal = Math.sin(THREE.MathUtils.clamp((p - 0.12) / 0.78, 0, 1) * Math.PI);

      // Build an attractive 3/4 trailing camera position behind and slightly above Bharari
      const distBehind = 8.0 + midArcReveal * 4.2 + (this.isCompactViewport ? 2.4 : 0);
      const heightAbove = 3.2 + midArcReveal * 2.5;
      const sideOffset = this.trailSideBias * (2.6 + midArcReveal * 1.8);

      _vTrailCam
        .copy(flight.bharariPos)
        .addScaledVector(_vHorizFwd, -distBehind)
        .addScaledVector(_vUp, heightAbove)
        .addScaledVector(_vRight, sideOffset);
      enforceCameraClearance(_vTrailCam, 2.4);

      _vTrailLook
        .copy(flight.bharariPos)
        .addScaledVector(_vHorizFwd, 2.6)
        .addScaledVector(_vUp, 0.35);
      // Subtly reveal the surrounding village valley during high mid-flight arc
      _vTrailLook.lerp(_vVillageCenter, midArcReveal * 0.14);

      // Smoothly hand off from trailing flight camera into the Destination hero framing
      // during the final approach & landing flare (progress 0.62 -> 1.0)
      const destBlend = THREE.MathUtils.smoothstep(p, 0.6, 0.98);

      _vCamDesired.lerpVectors(_vTrailCam, this.targetPos, destBlend);
      _vLookDesired.lerpVectors(_vTrailLook, this.targetLook, destBlend);
      enforceCameraClearance(_vCamDesired, 2.1);

      const followLambda = flight.behaviorState === 'NOTICE' ? 2.6 : 3.4;
      this.dampPosition(_vCamDesired, followLambda, dt);
      this.dampLookTarget(_vLookDesired, 4.4, dt);

      const dynamicFov = this.targetFov + midArcReveal * 3.8 * (1 - destBlend);
      this.dampFov(dynamicFov, 3.0, dt);

      if (this.controls.enabled) {
        this.controls.update();
      } else {
        this.camera.lookAt(this.controls.target);
      }
      return;
    }

    // 3. Smooth transition into static / orbitable presets (Meet Bharari, Village Overview, Destination settle)
    if (this.isTransitioning) {
      const lambda = screen === 'meet-bharari' ? 3.6 : 3.9;
      this.dampPosition(this.targetPos, lambda, dt);
      this.dampLookTarget(this.targetLook, lambda, dt);
      this.dampFov(this.targetFov, lambda, dt);

      if (this.controls.enabled) {
        this.controls.update();
      } else {
        this.camera.lookAt(this.controls.target);
      }

      if (
        this.camera.position.distanceTo(this.targetPos) < 0.06 &&
        this.controls.target.distanceTo(this.targetLook) < 0.06
      ) {
        this.isTransitioning = false;
      }
      return;
    }

    // 4. Free user OrbitControls with continuous terrain clearance safety
    if (this.controls.enabled) {
      this.controls.update();
      const minY = groundHeightAt(this.camera.position.x, this.camera.position.z) + 1.5;
      if (this.camera.position.y < minY) {
        this.camera.position.y = minY;
      }
    } else {
      this.camera.lookAt(this.controls.target);
    }
  }

  private dampPosition(desired: THREE.Vector3, lambda: number, dt: number): void {
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desired.x, lambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desired.y, lambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desired.z, lambda, dt);
  }

  private dampLookTarget(desired: THREE.Vector3, lambda: number, dt: number): void {
    this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, desired.x, lambda, dt);
    this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, desired.y, lambda, dt);
    this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, desired.z, lambda, dt);
  }

  private dampFov(desiredFov: number, lambda: number, dt: number): void {
    const nextFov = THREE.MathUtils.damp(this.camera.fov, desiredFov, lambda, dt);
    if (Math.abs(nextFov - this.camera.fov) > 0.02) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }
}

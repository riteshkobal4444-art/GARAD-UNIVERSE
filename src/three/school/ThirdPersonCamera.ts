import * as THREE from 'three';
import type { CameraViewMode } from '../../types/universe';
import type { SchoolCollisionWorld } from './SchoolCollisionAndZones';

const _focusTarget = new THREE.Vector3();
const _desiredPos = new THREE.Vector3();
const _resolvedPos = new THREE.Vector3();
const _lookAtPos = new THREE.Vector3();
const _fpEyePos = new THREE.Vector3();
const _fpLookDir = new THREE.Vector3();

const CLOSE_THIRD_DISTANCE = 2.45;
const FAR_THIRD_DISTANCE = 4.35;
const MIN_THIRD_DISTANCE = 1.65;
const MAX_THIRD_DISTANCE = 5.6;
const FAR_MODE_THRESHOLD = 3.35;

/**
 * Smooth multi-perspective player camera for Mission Bharari School Adventure.
 *
 * Supports 3 seamless modes:
 * A. Close third-person (default) — warm, connected framing behind & slightly above shoulder
 * B. Farther third-person — wider outdoor view for courtyard & playground exploration
 * C. First-person — child's eye height with body hidden, retaining exact third-person distance on return
 *
 * Features:
 * - Frame-rate-independent exponential damping (zero snapping or jitter)
 * - Subtle directional look-ahead along player movement velocity
 * - Mouse wheel & mobile two-finger pinch smooth distance zoom
 * - Indoor room-size adaptation (Classroom & Library smoothly pull closer and clamp below ceiling)
 * - Multi-feeler wall/bookshelf collision avoidance so camera never clips or gets stuck
 */
export class ThirdPersonCamera {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly collisionWorld: SchoolCollisionWorld;

  private mode: CameraViewMode = 'close-third';
  /** Remembered outdoor third-person distance restored when returning from first-person */
  private preferredDistance = CLOSE_THIRD_DISTANCE;
  private currentDistance = CLOSE_THIRD_DISTANCE;

  /** Horizontal orbit yaw around the player (camera sits at +sin(yaw), +cos(yaw) from target) */
  private yaw = 0;
  /** Vertical pitch in radians (positive = looking slightly downward in 3rd person; centered in 1st person) */
  private pitch = 0.2;
  /** Dedicated first-person vertical pitch (+ = looking up, - = looking down) */
  private fpPitch = -0.04;

  private readonly currentPos = new THREE.Vector3();
  private readonly currentLookAt = new THREE.Vector3();
  private readonly smoothLookAhead = new THREE.Vector3();
  private initialized = false;
  private sensitivity = 1.0;

  constructor(camera: THREE.PerspectiveCamera, collisionWorld: SchoolCollisionWorld) {
    this.camera = camera;
    this.collisionWorld = collisionWorld;
  }

  public setSensitivity(multiplier: number): void {
    this.sensitivity = THREE.MathUtils.clamp(multiplier, 0.35, 2.2);
  }

  public getMode(): CameraViewMode {
    return this.mode;
  }

  public isFirstPerson(): boolean {
    return this.mode === 'first-person';
  }

  public setMode(nextMode: CameraViewMode): void {
    if (nextMode === this.mode) return;
    const prevMode = this.mode;
    this.mode = nextMode;

    if (nextMode === 'close-third') {
      this.preferredDistance = CLOSE_THIRD_DISTANCE;
      if (prevMode === 'first-person') {
        this.pitch = THREE.MathUtils.clamp(-this.fpPitch + 0.18, 0.08, 0.72);
      }
    } else if (nextMode === 'far-third') {
      this.preferredDistance = FAR_THIRD_DISTANCE;
      if (prevMode === 'first-person') {
        this.pitch = THREE.MathUtils.clamp(-this.fpPitch + 0.24, 0.1, 0.78);
      }
    } else if (nextMode === 'first-person') {
      // Carry horizontal gaze smoothly and convert third-person pitch into comfortable eye pitch
      this.fpPitch = THREE.MathUtils.clamp(-(this.pitch - 0.16), -0.55, 0.55);
    }
  }

  /**
   * Desktop 'V' shortcut: toggles between First-Person and Third-Person while
   * preserving the player's previous third-person zoom distance.
   */
  public toggleFirstPerson(): CameraViewMode {
    if (this.mode === 'first-person') {
      const restoredMode: CameraViewMode =
        this.preferredDistance >= FAR_MODE_THRESHOLD ? 'far-third' : 'close-third';
      this.mode = restoredMode;
      this.pitch = THREE.MathUtils.clamp(-this.fpPitch + 0.18, 0.08, 0.72);
      return this.mode;
    }
    this.setMode('first-person');
    return this.mode;
  }

  /**
   * Mobile / HUD quick toggle cycling: Close 3rd -> Far 3rd -> 1st Person -> Close 3rd.
   */
  public cycleViewMode(): CameraViewMode {
    if (this.mode === 'close-third') {
      this.setMode('far-third');
    } else if (this.mode === 'far-third') {
      this.setMode('first-person');
    } else {
      this.setMode('close-third');
    }
    return this.mode;
  }

  public resetBehindPlayer(
    playerPos: THREE.Vector3,
    playerFacingYaw: number,
    initialMode: CameraViewMode = 'first-person',
  ): void {
    this.mode = initialMode;
    this.preferredDistance = CLOSE_THIRD_DISTANCE;
    this.currentDistance = CLOSE_THIRD_DISTANCE;
    this.yaw = playerFacingYaw + Math.PI;
    this.pitch = 0.19;
    this.fpPitch = -0.025;
    this.smoothLookAhead.set(0, 0, 0);

    if (initialMode === 'first-person') {
      const indoors = this.collisionWorld.isIndoors(playerPos.x, playerPos.z);
      const eyeHeight = indoors ? 1.44 : 1.52;
      const forwardYaw = this.getCameraForwardYaw();
      const cosPitch = Math.cos(this.fpPitch);
      _fpLookDir.set(
        Math.sin(forwardYaw) * cosPitch,
        Math.sin(this.fpPitch),
        Math.cos(forwardYaw) * cosPitch,
      );
      this.currentPos.set(playerPos.x, playerPos.y + eyeHeight, playerPos.z);
      this.currentLookAt.copy(this.currentPos).addScaledVector(_fpLookDir, 6.0);
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);
      this.camera.fov = indoors ? 62 : 58;
      this.camera.updateProjectionMatrix();
      this.initialized = true;
      return;
    }

    _focusTarget.set(playerPos.x, playerPos.y + 1.06, playerPos.z);
    this.computeDesiredPosition(_focusTarget, this.currentDistance, this.pitch, _desiredPos);
    const frac = this.collisionWorld.raycastCameraFraction(_focusTarget, _desiredPos);
    this.currentPos.lerpVectors(_focusTarget, _desiredPos, frac);
    this.currentLookAt.copy(_focusTarget);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
    this.camera.fov = 52;
    this.camera.updateProjectionMatrix();
    this.initialized = true;
  }

  /** Horizontal viewing forward direction (unit XZ) used by camera-relative movement */
  public getCameraForwardYaw(): number {
    return this.yaw + Math.PI;
  }

  public addLookDelta(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX * 0.0054 * this.sensitivity;
    if (this.mode === 'first-person') {
      this.fpPitch = THREE.MathUtils.clamp(
        this.fpPitch - deltaY * 0.0044 * this.sensitivity,
        -0.78,
        0.85,
      );
    } else {
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + deltaY * 0.0042 * this.sensitivity,
        0.02,
        0.88,
      );
    }
  }

  /**
   * Smoothly adjusts third-person camera distance (mouse wheel or mobile pinch).
   * Positive delta zooms out, negative delta zooms in.
   */
  public adjustDistance(deltaAmount: number): CameraViewMode {
    if (this.mode === 'first-person') {
      // Pinching/scrolling outward from first-person transitions cleanly back into close third-person
      if (deltaAmount > 24) {
        this.mode = 'close-third';
        this.preferredDistance = Math.max(MIN_THIRD_DISTANCE + 0.15, this.preferredDistance);
      }
      return this.mode;
    }

    this.preferredDistance = THREE.MathUtils.clamp(
      this.preferredDistance + deltaAmount * 0.0032,
      MIN_THIRD_DISTANCE,
      MAX_THIRD_DISTANCE,
    );
    this.mode = this.preferredDistance >= FAR_MODE_THRESHOLD ? 'far-third' : 'close-third';
    return this.mode;
  }

  private computeDesiredPosition(
    focus: THREE.Vector3,
    distance: number,
    pitchRad: number,
    out: THREE.Vector3,
  ): void {
    const horiz = Math.cos(pitchRad) * distance;
    const vert = Math.sin(pitchRad) * distance;
    out.set(
      focus.x + Math.sin(this.yaw) * horiz,
      focus.y + vert,
      focus.z + Math.cos(this.yaw) * horiz,
    );
  }

  public update(
    playerPos: THREE.Vector3,
    playerVelocityXZ: THREE.Vector2,
    isBookOpen: boolean,
    delta: number,
  ): void {
    const dt = Math.min(delta, 0.05);
    if (!this.initialized) {
      this.resetBehindPlayer(playerPos, Math.PI);
    }

    const indoors = this.collisionWorld.isIndoors(playerPos.x, playerPos.z);

    // === MODE C: FIRST-PERSON VIEW (Child's Eye Height) ===
    if (this.mode === 'first-person') {
      const forwardYaw = this.getCameraForwardYaw();
      const cosPitch = Math.cos(this.fpPitch);
      _fpLookDir.set(
        Math.sin(forwardYaw) * cosPitch,
        Math.sin(this.fpPitch),
        Math.cos(forwardYaw) * cosPitch,
      );

      // Natural, comfortable walking eye height with zero head bobbing
      const eyeHeight = indoors ? 1.44 : 1.52;
      _fpEyePos.set(playerPos.x, playerPos.y + eyeHeight, playerPos.z);

      // Smooth frame-rate-independent follow into eye position (fast enough to feel crisp, zero jitter)
      const eyeAlpha = 1 - Math.exp(-22 * dt);
      this.currentPos.lerp(_fpEyePos, eyeAlpha);
      _lookAtPos.copy(this.currentPos).addScaledVector(_fpLookDir, 6.0);
      this.currentLookAt.copy(_lookAtPos);

      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);

      const fpFov = indoors ? 62 : 58;
      if (Math.abs(this.camera.fov - fpFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fpFov, 8, dt);
        this.camera.updateProjectionMatrix();
      }
      return;
    }

    // === MODES A & B: CLOSE & FARTHER THIRD-PERSON ===
    // Smooth subtle directional look-ahead in the direction of travel
    const speedXZ = playerVelocityXZ.length();
    const lookAheadMag = isBookOpen ? 0 : Math.min(speedXZ / 5.5, 1) * (indoors ? 0.22 : 0.42);
    const targetLookAheadX = speedXZ > 0.05 ? (playerVelocityXZ.x / speedXZ) * lookAheadMag : 0;
    const targetLookAheadZ = speedXZ > 0.05 ? (playerVelocityXZ.y / speedXZ) * lookAheadMag : 0;

    const laAlpha = 1 - Math.exp(-4.8 * dt);
    this.smoothLookAhead.x = THREE.MathUtils.lerp(this.smoothLookAhead.x, targetLookAheadX, laAlpha);
    this.smoothLookAhead.z = THREE.MathUtils.lerp(this.smoothLookAhead.z, targetLookAheadZ, laAlpha);

    // Indoor room-size adaptation: smoothly pull closer inside Classroom & Library
    const indoorMaxDist = this.mode === 'far-third' ? 2.65 : 2.1;
    const desiredBaseDist = indoors
      ? Math.min(this.preferredDistance, indoorMaxDist)
      : this.preferredDistance;
    const targetDist = isBookOpen ? Math.min(desiredBaseDist, 2.2) : desiredBaseDist;

    const effectivePitch = indoors ? Math.min(this.pitch, 0.34) : this.pitch;

    // Anchor slightly above child's shoulder height so full body stays connected & comfortably framed
    const focusYOffset = indoors ? 1.04 : 1.08;
    _focusTarget.set(
      playerPos.x + this.smoothLookAhead.x * 0.45,
      playerPos.y + focusYOffset,
      playerPos.z + this.smoothLookAhead.z * 0.45,
    );

    this.computeDesiredPosition(_focusTarget, targetDist, effectivePitch, _desiredPos);

    // Keep safely below interior ceilings and above ground/veranda surfaces
    if (indoors) {
      _desiredPos.y = Math.min(_desiredPos.y, 3.45);
    }
    const floorUnderDesired = this.collisionWorld.getFloorHeight(_desiredPos.x, _desiredPos.z);
    _desiredPos.y = Math.max(_desiredPos.y, floorUnderDesired + 0.52);

    // Multi-feeler collision sweep from player chest/shoulder to desired camera position
    const rayOrigin = _lookAtPos.set(playerPos.x, playerPos.y + 1.08, playerPos.z);
    const hitFraction = this.collisionWorld.raycastCameraFraction(rayOrigin, _desiredPos);
    const obstructedDist = Math.max(0.62, targetDist * hitFraction);

    // Pull inward quickly when approaching a wall/bookshelf, ease outward smoothly when clear
    const distLambda = obstructedDist < this.currentDistance ? 18 : 6.2;
    this.currentDistance = THREE.MathUtils.damp(this.currentDistance, obstructedDist, distLambda, dt);

    this.computeDesiredPosition(_focusTarget, this.currentDistance, effectivePitch, _resolvedPos);
    if (indoors) {
      _resolvedPos.y = Math.min(_resolvedPos.y, 3.45);
    }
    const floorUnderResolved = this.collisionWorld.getFloorHeight(_resolvedPos.x, _resolvedPos.z);
    _resolvedPos.y = Math.max(_resolvedPos.y, floorUnderResolved + 0.5);

    // Frame-rate-independent smooth camera follow
    const posLambda = isBookOpen ? 7.5 : 11.5;
    this.currentPos.lerp(_resolvedPos, 1 - Math.exp(-posLambda * dt));

    // Gentle forward look-ahead target so player sees clearly ahead while walking/running
    _lookAtPos.set(
      playerPos.x + this.smoothLookAhead.x,
      playerPos.y + (indoors ? 1.02 : 1.08) + (isBookOpen ? 0.06 : 0),
      playerPos.z + this.smoothLookAhead.z,
    );
    this.currentLookAt.lerp(_lookAtPos, 1 - Math.exp(-13.5 * dt));

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);

    const targetFov = indoors ? 56 : this.mode === 'far-third' ? 50 : 53;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6.5, dt);
      this.camera.updateProjectionMatrix();
    }
  }
}

import * as THREE from 'three';
import type { MobileInputState } from '../../types/universe';

export interface WorldObstacleCircle {
  kind: 'circle';
  x: number;
  z: number;
  radius: number;
}

export interface WorldObstacleBox {
  kind: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type WorldObstacle = WorldObstacleCircle | WorldObstacleBox;

export interface FirstPersonBounds {
  maxRadius: number;
  centerX?: number;
  centerZ?: number;
  obstacles: WorldObstacle[];
}

export interface FirstPersonCallbacks {
  onInteractKey: () => void;
  onEscapeKey: () => void;
  onFootstep?: (isRunning: boolean) => void;
}

const _lookDir = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

const EYE_HEIGHT = 1.62;
const WALK_SPEED = 4.25;
const RUN_SPEED = 6.55;
const PLAYER_RADIUS = 0.52;

/**
 * Calm, smooth first-person exploration controller for the Central Hub Island,
 * Abhivyaktā Amphitheatre, and Sankalp Community Courtyard.
 *
 * - Desktop: WASD / Arrow movement, Shift to run (only while moving), click-drag mouse look,
 *   E / Enter to interact, Escape for settings / closing exhibits.
 * - Mobile: Virtual joystick + right-thumb camera look delta.
 * - Comfort-first: Zero head-bobbing, smooth exponential velocity damping, clean obstacle sliding.
 */
export class FirstPersonExplorerController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly callbacks: FirstPersonCallbacks;

  public readonly position = new THREE.Vector3(0, 0, 11.5);
  public readonly velocityXZ = new THREE.Vector2(0, 0);

  /** Horizontal facing yaw (0 = +Z, Math.PI = -Z) */
  private yaw = Math.PI;
  /** Vertical look pitch in radians (+ up, - down) */
  private pitch = -0.02;
  private sensitivity = 1.0;

  private active = false;
  private inputBlocked = false;
  private bounds: FirstPersonBounds = { maxRadius: 21, obstacles: [] };

  private readonly keysDown = new Set<string>();
  private shiftHeld = false;
  private mobileInput: MobileInputState = { moveX: 0, moveY: 0, running: false };
  private strideDistance = 0;

  private readonly boundKeyDown: (e: KeyboardEvent) => void;
  private readonly boundKeyUp: (e: KeyboardEvent) => void;
  private readonly boundBlur: () => void;

  constructor(camera: THREE.PerspectiveCamera, callbacks: FirstPersonCallbacks) {
    this.camera = camera;
    this.callbacks = callbacks;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundBlur = this.clearKeys.bind(this);

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  public setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.clearKeys();
      this.velocityXZ.set(0, 0);
      this.strideDistance = 0;
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public setInputBlocked(blocked: boolean): void {
    this.inputBlocked = blocked;
    if (blocked) {
      this.clearKeys();
      this.strideDistance = 0;
    }
  }

  public setSensitivity(multiplier: number): void {
    this.sensitivity = THREE.MathUtils.clamp(multiplier, 0.35, 2.2);
  }

  public setBounds(bounds: FirstPersonBounds): void {
    this.bounds = bounds;
  }

  public setMobileInput(input: MobileInputState): void {
    this.mobileInput = input;
  }

  public getYaw(): number {
    return this.yaw;
  }

  public getPitch(): number {
    return this.pitch;
  }

  public spawnAt(x: number, z: number, yawRad = Math.PI, pitchRad = -0.02): void {
    this.position.set(x, 0, z);
    this.velocityXZ.set(0, 0);
    this.strideDistance = 0;
    this.yaw = yawRad;
    this.pitch = THREE.MathUtils.clamp(pitchRad, -0.68, 0.72);
    this.syncCameraImmediate();
  }

  public addLookDelta(dx: number, dy: number): void {
    if (!this.active || this.inputBlocked) return;
    const scale = 0.0042 * this.sensitivity;
    this.yaw -= dx * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * scale * 0.85, -0.68, 0.72);
  }

  public syncCameraImmediate(): void {
    const cosPitch = Math.cos(this.pitch);
    _lookDir.set(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch,
    );
    this.camera.position.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
    _lookTarget.copy(this.camera.position).addScaledVector(_lookDir, 6);
    this.camera.lookAt(_lookTarget);
  }

  private clearKeys(): void {
    this.keysDown.clear();
    this.shiftHeld = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.active) return;

    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;

    if (code === 'Escape') {
      e.preventDefault();
      this.callbacks.onEscapeKey();
      return;
    }

    if (this.inputBlocked) return;

    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.shiftHeld = true;
      return;
    }

    if (
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'KeyQ' ||
      code === 'KeyE' ||
      code === 'Enter' ||
      code === 'Space'
    ) {
      if (code === 'Space' || code.startsWith('Arrow')) {
        e.preventDefault();
      }
      if ((code === 'KeyE' || code === 'Enter') && !e.repeat) {
        this.callbacks.onInteractKey();
        return;
      }
      this.keysDown.add(code);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.shiftHeld = false;
    }
    this.keysDown.delete(e.code);
  }

  private resolveCollisions(): void {
    const cx = this.bounds.centerX ?? 0;
    const cz = this.bounds.centerZ ?? 0;
    const maxR = Math.max(2, this.bounds.maxRadius - PLAYER_RADIUS);

    // 1. Keep inside walkable sanctuary / courtyard perimeter
    const dxCenter = this.position.x - cx;
    const dzCenter = this.position.z - cz;
    const distCenter = Math.hypot(dxCenter, dzCenter);
    if (distCenter > maxR && distCenter > 0.0001) {
      const ratio = maxR / distCenter;
      this.position.x = cx + dxCenter * ratio;
      this.position.z = cz + dzCenter * ratio;
    }

    // 2. Smooth push-out against solid pillars, trees, podiums, and stands (2 iterations)
    for (let pass = 0; pass < 2; pass++) {
      for (const obs of this.bounds.obstacles) {
        if (obs.kind === 'circle') {
          const dx = this.position.x - obs.x;
          const dz = this.position.z - obs.z;
          const minDist = obs.radius + PLAYER_RADIUS;
          const distSq = dx * dx + dz * dz;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const push = minDist - dist;
              this.position.x += (dx / dist) * push;
              this.position.z += (dz / dist) * push;
            } else {
              this.position.z += minDist;
            }
          }
        } else {
          const closestX = THREE.MathUtils.clamp(this.position.x, obs.minX, obs.maxX);
          const closestZ = THREE.MathUtils.clamp(this.position.z, obs.minZ, obs.maxZ);
          const dx = this.position.x - closestX;
          const dz = this.position.z - closestZ;
          const distSq = dx * dx + dz * dz;
          if (distSq < PLAYER_RADIUS * PLAYER_RADIUS) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const push = PLAYER_RADIUS - dist;
              this.position.x += (dx / dist) * push;
              this.position.z += (dz / dist) * push;
            } else {
              // Inside box fallback: eject along nearest edge
              const dLeft = Math.abs(this.position.x - obs.minX);
              const dRight = Math.abs(obs.maxX - this.position.x);
              const dTop = Math.abs(this.position.z - obs.minZ);
              const dBottom = Math.abs(obs.maxZ - this.position.z);
              const m = Math.min(dLeft, dRight, dTop, dBottom);
              if (m === dLeft) this.position.x = obs.minX - PLAYER_RADIUS;
              else if (m === dRight) this.position.x = obs.maxX + PLAYER_RADIUS;
              else if (m === dTop) this.position.z = obs.minZ - PLAYER_RADIUS;
              else this.position.z = obs.maxZ + PLAYER_RADIUS;
            }
          }
        }
      }
    }
  }

  public update(delta: number): void {
    if (!this.active) return;
    const dt = Math.min(delta, 0.05);

    let forwardInput = 0;
    let strafeInput = 0;

    if (!this.inputBlocked) {
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) forwardInput += 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) forwardInput -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) strafeInput += 1;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) strafeInput -= 1;

      if (this.keysDown.has('KeyQ')) {
        this.yaw += 1.65 * this.sensitivity * dt;
      }

      // Combine cleanly with mobile virtual joystick
      if (Math.abs(this.mobileInput.moveY) > 0.04) forwardInput += this.mobileInput.moveY;
      if (Math.abs(this.mobileInput.moveX) > 0.04) strafeInput += this.mobileInput.moveX;
    }

    const inputLen = Math.hypot(forwardInput, strafeInput);
    const hasMoveInput = inputLen > 0.04;
    if (inputLen > 1) {
      forwardInput /= inputLen;
      strafeInput /= inputLen;
    }

    const isRunning = hasMoveInput && (this.shiftHeld || this.mobileInput.running);
    const maxSpeed = isRunning ? RUN_SPEED : WALK_SPEED;

    // Forward vector on XZ: (sin(yaw), cos(yaw)), Right vector on XZ: (-cos(yaw), sin(yaw))
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const desiredVx = (sinY * forwardInput - cosY * strafeInput) * maxSpeed;
    const desiredVz = (cosY * forwardInput + sinY * strafeInput) * maxSpeed;

    const accelLambda = hasMoveInput ? 11.5 : 13.0;
    this.velocityXZ.x = THREE.MathUtils.damp(this.velocityXZ.x, desiredVx, accelLambda, dt);
    this.velocityXZ.y = THREE.MathUtils.damp(this.velocityXZ.y, desiredVz, accelLambda, dt);

    if (this.velocityXZ.lengthSq() < 0.0004 && !hasMoveInput) {
      this.velocityXZ.set(0, 0);
    }

    const prevX = this.position.x;
    const prevZ = this.position.z;
    this.position.x += this.velocityXZ.x * dt;
    this.position.z += this.velocityXZ.y * dt;
    this.resolveCollisions();

    const movedStep = Math.hypot(this.position.x - prevX, this.position.z - prevZ);
    const actualSpeed = dt > 0.0001 ? movedStep / dt : 0;
    if (!this.inputBlocked && actualSpeed > 0.48) {
      const strideLen = isRunning ? 1.82 : 1.44;
      this.strideDistance += movedStep;
      if (this.strideDistance >= strideLen) {
        this.strideDistance -= strideLen;
        this.callbacks.onFootstep?.(isRunning);
      }
    } else if (actualSpeed <= 0.18) {
      this.strideDistance = Math.min(this.strideDistance, 0.45);
    }

    // Update camera smoothly with gentle comfort FOV
    this.syncCameraImmediate();

    const targetFov = isRunning ? 59 : 56;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
  }
}

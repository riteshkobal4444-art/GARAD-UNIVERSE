import * as THREE from 'three';
import type {
  FootstepSurface,
  IPlayerCharacter,
  MobileInputState,
  PlayerAnimationState,
} from '../../types/universe';
import type { SchoolCollisionWorld } from './SchoolCollisionAndZones';

const _moveInput = new THREE.Vector2();
const _worldDir = new THREE.Vector3();
const _resolvedPos = new THREE.Vector3();

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export interface PlayerControllerCallbacks {
  onInteractKey: () => void;
  onBookPageKey: (direction: -1 | 1) => void;
  onCloseBookKey: () => void;
  onToggleCameraViewKey: () => void;
  onFootstep?: (surface: FootstepSurface, isRunning: boolean) => void;
}

/**
 * Third-person & first-person keyboard + mobile joystick player controller.
 *
 * Upgraded reliability & feel:
 * - Reliable Shift-to-run on desktop (tracks both key codes AND live `event.shiftKey`,
 *   immediately returns to walking on release, works seamlessly after closing books,
 *   and never activates running when movement input is zero).
 * - Prevents browser shortcuts (arrow scrolling, Space, Shift+movement) while active.
 * - `V` key toggles between First-Person and Third-Person cleanly.
 * - Natural acceleration, deceleration, smooth walk-to-run speed transitions, and
 *   normalized 360-degree diagonal speed.
 */
export class PlayerController {
  private readonly character: IPlayerCharacter;
  private readonly collisionWorld: SchoolCollisionWorld;
  private readonly callbacks: PlayerControllerCallbacks;

  private active = false;
  private inputBlocked = false;
  private bookOpen = false;
  private firstPersonMode = true;

  private readonly keys = new Set<string>();
  private shiftHeld = false;
  private mobileInput: MobileInputState = { moveX: 0, moveY: 0, running: false };
  private jumpQueued = false;

  public readonly position = new THREE.Vector3(0, 0, 51.8);
  public readonly velocityXZ = new THREE.Vector2(0, 0);
  private velocityY = 0;
  private grounded = true;
  private facingYaw = Math.PI;
  private currentSpeed = 0;
  private smoothedMoveCap = 3.2;
  private turnRate = 0;
  private strideDistance = 0;

  private readonly walkSpeed = 3.15;
  private readonly runSpeed = 5.75;
  private readonly jumpVelocity = 5.2;
  private readonly gravity = 15.8;
  private readonly playerRadius = 0.34;
  private readonly playerHeight = 1.36;

  private readonly boundKeyDown: (e: KeyboardEvent) => void;
  private readonly boundKeyUp: (e: KeyboardEvent) => void;
  private readonly boundBlur: () => void;

  constructor(
    character: IPlayerCharacter,
    collisionWorld: SchoolCollisionWorld,
    callbacks: PlayerControllerCallbacks,
  ) {
    this.character = character;
    this.collisionWorld = collisionWorld;
    this.callbacks = callbacks;

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundBlur = () => {
      this.keys.clear();
      this.shiftHeld = false;
    };

    window.addEventListener('keydown', this.boundKeyDown, { passive: false });
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  public setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.keys.clear();
      this.shiftHeld = false;
      this.mobileInput = { moveX: 0, moveY: 0, running: false };
      this.velocityXZ.set(0, 0);
      this.velocityY = 0;
      this.currentSpeed = 0;
      this.strideDistance = 0;
    }
  }

  public setInputBlocked(blocked: boolean): void {
    this.inputBlocked = blocked;
    if (blocked) {
      this.keys.clear();
      this.shiftHeld = false;
      this.velocityXZ.set(0, 0);
      this.currentSpeed = 0;
      this.strideDistance = 0;
    }
  }

  public setBookOpen(open: boolean): void {
    this.bookOpen = open;
    if (open) {
      this.velocityXZ.set(0, 0);
      this.currentSpeed = 0;
      this.strideDistance = 0;
    }
  }

  public setFirstPersonMode(isFirstPerson: boolean): void {
    this.firstPersonMode = isFirstPerson;
    this.character.group.visible = this.active && !isFirstPerson;
  }

  public spawnAt(x: number, z: number, facingYaw = Math.PI): void {
    const floorY = this.collisionWorld.getFloorHeight(x, z);
    this.position.set(x, floorY, z);
    this.velocityXZ.set(0, 0);
    this.velocityY = 0;
    this.grounded = true;
    this.facingYaw = facingYaw;
    this.currentSpeed = 0;
    this.smoothedMoveCap = this.walkSpeed;
    this.strideDistance = 0;
    this.character.group.position.copy(this.position);
    this.character.group.rotation.y = this.facingYaw;
  }

  public getFacingYaw(): number {
    return this.facingYaw;
  }

  public setMobileInput(input: MobileInputState): void {
    this.mobileInput = input;
  }

  public queueJump(): void {
    if (this.active && !this.bookOpen) {
      this.jumpQueued = true;
    }
  }

  public triggerInteractAnimation(): void {
    this.character.triggerInteractGesture();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.active || this.inputBlocked) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    const code = e.code;

    // Always synchronize Shift state from both explicit key code and live modifier flag
    if (code === 'ShiftLeft' || code === 'ShiftRight' || e.shiftKey) {
      this.shiftHeld = true;
    }

    // Track movement keys even while a book is open so holding keys across book close stays consistent
    if (
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight'
    ) {
      this.keys.add(code);
      // Prevent browser scrolling / Shift+Arrow text selection shortcuts while playing
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    }

    // When a 3D Living Book is open, route keys cleanly to book reading
    if (this.bookOpen) {
      if (code === 'Escape' || code === 'KeyE') {
        e.preventDefault();
        this.callbacks.onCloseBookKey();
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        e.preventDefault();
        this.callbacks.onBookPageKey(1);
      } else if (code === 'ArrowLeft' || code === 'KeyA') {
        e.preventDefault();
        this.callbacks.onBookPageKey(-1);
      }
      return;
    }

    if (code === 'Space') {
      e.preventDefault();
      this.jumpQueued = true;
    }

    if (code === 'KeyE' && !e.repeat) {
      e.preventDefault();
      this.callbacks.onInteractKey();
    }

    if (code === 'KeyV' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.callbacks.onToggleCameraViewKey();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const code = e.code;
    this.keys.delete(code);

    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.shiftHeld =
        e.shiftKey || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    } else if (!e.shiftKey) {
      this.shiftHeld = false;
      this.keys.delete('ShiftLeft');
      this.keys.delete('ShiftRight');
    }
  }

  public update(delta: number, elapsed: number, cameraForwardYaw: number): void {
    if (!this.active) return;
    const dt = Math.min(delta, 0.05);

    if (this.inputBlocked) {
      this.velocityXZ.set(0, 0);
      this.currentSpeed = 0;
      this.strideDistance = 0;
      this.character.group.visible = this.active && !this.firstPersonMode;
      return;
    }

    // Gather keyboard + mobile virtual joystick inputs
    let inputX = 0;
    let inputY = 0;

    if (!this.bookOpen) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inputY += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inputY -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inputX += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inputX -= 1;

      if (Math.abs(this.mobileInput.moveX) > 0.02 || Math.abs(this.mobileInput.moveY) > 0.02) {
        inputX = this.mobileInput.moveX;
        inputY = this.mobileInput.moveY;
      }
    }

    _moveInput.set(inputX, inputY);
    const rawMag = _moveInput.length();
    // Strict diagonal normalization so diagonal speed never exceeds straight speed
    const inputMag = Math.min(rawMag, 1);
    if (rawMag > 1) {
      _moveInput.divideScalar(rawMag);
    }

    const isMovingInput = !this.bookOpen && inputMag > 0.04;
    const shiftActive =
      this.shiftHeld || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    // Never activate running when movement input is zero
    const isRunningActive = isMovingInput && (shiftActive || this.mobileInput.running);

    // Transform 2D input into camera-relative world XZ direction
    const forwardX = Math.sin(cameraForwardYaw);
    const forwardZ = Math.cos(cameraForwardYaw);
    // Right vector perpendicular clockwise from forward in XZ plane
    const rightX = -forwardZ;
    const rightZ = forwardX;

    _worldDir.set(
      forwardX * _moveInput.y + rightX * _moveInput.x,
      0,
      forwardZ * _moveInput.y + rightZ * _moveInput.x,
    );
    const worldMag = _worldDir.length();
    if (worldMag > 0.001) {
      _worldDir.divideScalar(worldMag);
    }

    // Smooth walk-to-run cap transition so starting or releasing Shift feels fluid
    const desiredSpeedCap = isRunningActive ? this.runSpeed : this.walkSpeed;
    this.smoothedMoveCap = THREE.MathUtils.damp(this.smoothedMoveCap, desiredSpeedCap, 9.5, dt);

    const targetSpeed = isMovingInput ? this.smoothedMoveCap * inputMag : 0;
    const targetVx = _worldDir.x * targetSpeed;
    const targetVz = _worldDir.z * targetSpeed;

    // Frame-rate-independent natural acceleration & deceleration
    const accelLambda = isMovingInput ? (isRunningActive ? 9.2 : 10.8) : 13.5;
    const blend = 1 - Math.exp(-accelLambda * dt);
    this.velocityXZ.x = THREE.MathUtils.lerp(this.velocityXZ.x, targetVx, blend);
    this.velocityXZ.y = THREE.MathUtils.lerp(this.velocityXZ.y, targetVz, blend);

    // Clamp tiny residual drift to clean zero when stopped
    if (!isMovingInput && this.velocityXZ.lengthSq() < 0.0004) {
      this.velocityXZ.set(0, 0);
    }

    // Vertical jump & gravity
    if (this.jumpQueued && this.grounded && !this.bookOpen) {
      this.velocityY = this.jumpVelocity;
      this.grounded = false;
    }
    this.jumpQueued = false;

    if (!this.grounded) {
      this.velocityY -= this.gravity * dt;
    }

    const nextX = this.position.x + this.velocityXZ.x * dt;
    const nextZ = this.position.z + this.velocityXZ.y * dt;

    // Resolve horizontal collision with smooth wall/furniture sliding
    this.collisionWorld.resolveHorizontalMovement(
      nextX,
      nextZ,
      this.position.y,
      this.playerRadius,
      this.playerHeight,
      _resolvedPos,
    );

    const actualDx = _resolvedPos.x - this.position.x;
    const actualDz = _resolvedPos.z - this.position.z;
    this.position.x = _resolvedPos.x;
    this.position.z = _resolvedPos.z;

    const floorY = this.collisionWorld.getFloorHeight(this.position.x, this.position.z);
    this.position.y += this.velocityY * dt;

    if (this.position.y <= floorY + 0.005) {
      this.position.y = floorY;
      this.velocityY = 0;
      this.grounded = true;
    } else if (this.grounded && this.position.y - floorY < 0.24) {
      this.position.y = THREE.MathUtils.damp(this.position.y, floorY, 18, dt);
    } else {
      this.grounded = false;
    }

    const movedStepDist = Math.hypot(actualDx, actualDz);
    this.currentSpeed = dt > 0.0001 ? movedStepDist / dt : 0;

    // Subtle stride-synced footsteps strictly when grounded & actively walking/running
    if (this.grounded && !this.bookOpen && this.currentSpeed > 0.42) {
      const isRunStep = isRunningActive && this.currentSpeed > this.walkSpeed * 1.02;
      const strideLength = isRunStep ? 1.72 : 1.38;
      this.strideDistance += movedStepDist;
      if (this.strideDistance >= strideLength) {
        this.strideDistance -= strideLength;
        const surface = this.collisionWorld.getSurfaceAt(this.position.x, this.position.z);
        this.callbacks.onFootstep?.(surface, isRunStep);
      }
    } else if (!this.grounded || this.currentSpeed <= 0.18) {
      this.strideDistance = Math.min(this.strideDistance, 0.45);
    }

    // Smooth character rotation:
    // - In Third-Person: faces direction of travel smoothly
    // - In First-Person: aligns directly with gaze direction so interaction targeting feels natural
    const prevYaw = this.facingYaw;
    if (this.firstPersonMode) {
      this.facingYaw = cameraForwardYaw;
    } else if (isMovingInput && worldMag > 0.01) {
      const targetYaw = Math.atan2(_worldDir.x, _worldDir.z);
      this.facingYaw = dampAngle(this.facingYaw, targetYaw, 11.0, dt);
    }

    let yawDiff = this.facingYaw - prevYaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.turnRate = dt > 0.0001 ? yawDiff / dt : 0;

    // Determine semantic animation state
    let animState: PlayerAnimationState = 'idle';
    if (!this.grounded) {
      animState = 'jump';
    } else if (isRunningActive && this.currentSpeed > this.walkSpeed * 1.05) {
      animState = 'run';
    } else if (this.currentSpeed > 0.22) {
      animState = Math.abs(this.turnRate) > 2.4 ? 'turn' : 'walk';
    } else if (this.velocityXZ.length() > 0.32) {
      animState = 'stop';
    }

    this.character.group.position.copy(this.position);
    this.character.group.rotation.y = this.facingYaw;
    this.character.group.visible = this.active && !this.firstPersonMode;

    this.character.setAnimationState(animState);
    this.character.setMotionTelemetry({
      speed: this.currentSpeed,
      maxSpeed: this.runSpeed,
      turnRate: this.turnRate,
      grounded: this.grounded,
      verticalVelocity: this.velocityY,
      isRunning: isRunningActive && this.currentSpeed > this.walkSpeed * 0.95,
    });

    if (!this.firstPersonMode) {
      this.character.update(dt, elapsed);
    }
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
  }
}

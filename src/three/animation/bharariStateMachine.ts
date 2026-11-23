import * as THREE from 'three';
import type {
  BharariBehaviorState,
  BharariFlightTelemetry,
  DestinationId,
} from '../../types/universe';
import { buildCinematicFlightCurve } from './cameraChoreography';

export interface FlightCommand {
  targetPosition: THREE.Vector3;
  lookAtNoticePoint: THREE.Vector3;
  faceTargetAfterLanding: THREE.Vector3;
  destinationId: DestinationId | null;
  playIntroduction: boolean;
  skipNotice?: boolean;
  instant?: boolean;
}

export interface StateMachineOutput {
  state: BharariBehaviorState;
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  lookTarget: THREE.Vector3 | null;
  telemetry: BharariFlightTelemetry;
  /** Normalized progress along the entire flight sequence (0..1) */
  flightProgress: number;
  /** True during the active flight arc (NOTICE through LANDING) */
  isInDestinationTransit: boolean;
  /** Forward travel direction (unit vector) during flight */
  forwardDir: THREE.Vector3;
  /** True on the exact frame Bharari transitions into INTRODUCTION */
  justEnteredIntroduction: boolean;
  /** True on the exact frame Bharari transitions into TAKEOFF */
  justEnteredTakeoff: boolean;
}

// Reusable module-scope scratch objects (zero GC in per-frame tick)
const _vPos = new THREE.Vector3();
const _vTan = new THREE.Vector3();
const _vPrevTan = new THREE.Vector3();
const _vNextTan = new THREE.Vector3();
const _vCross = new THREE.Vector3();
const _vLaunchPoint = new THREE.Vector3();
const _vPrevPos = new THREE.Vector3();

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

/**
 * Smooth S-curve easing with gentle acceleration and natural deceleration
 * plus analytical derivative for believable airspeed modulation.
 */
function easeInOutCubicWithDeriv(u: number): { value: number; deriv: number } {
  const t = THREE.MathUtils.clamp(u, 0, 1);
  if (t < 0.5) {
    return {
      value: 4 * t * t * t,
      deriv: 12 * t * t,
    };
  }
  const m = -2 * t + 2;
  return {
    value: 1 - (m * m * m) / 2,
    deriv: 3 * m * m,
  };
}

/**
 * Reusable Stage 2 Bharari Behavior State Machine:
 *
 *   IDLE -> NOTICE -> TAKEOFF -> FLYING -> LANDING -> INTRODUCTION -> IDLE
 *
 * Key design guarantees:
 * - Visitor destination changes can interrupt ANY state cleanly without getting stuck.
 * - Mid-air retargeting blends seamlessly from Bharari's current position and heading.
 * - Computes physical speed, climb rate, and aerodynamic curvature banking.
 */
export class BharariAnimationStateMachine {
  private state: BharariBehaviorState = 'IDLE';
  private stateElapsed = 0;

  private readonly position = new THREE.Vector3();
  private readonly forwardDir = new THREE.Vector3(0, 0, 1);
  private yaw = 0;
  private pitch = 0;

  private readonly telemetry: BharariFlightTelemetry = {
    speed: 0,
    climbRate: 0,
    bankAngle: 0,
    phase: 0,
    isGliding: false,
  };

  // Active point-to-point destination flight plan
  private flightCurve: THREE.CatmullRomCurve3 | null = null;
  private readonly noticePoint = new THREE.Vector3();
  private readonly landingTarget = new THREE.Vector3();
  private readonly faceAfterLanding = new THREE.Vector3();
  private playIntroOnArrival = true;
  private hasFaceTarget = false;

  // Phase durations (seconds)
  private noticeDuration = 0.44;
  private takeoffDuration = 0.54;
  private flyingDuration = 2.05;
  private landingDuration = 0.72;
  private introDuration = 2.15;

  // Scenic overview soaring mode (when hovering freely over Connected Village Overview)
  private overviewSoaring = false;
  private overviewOrbitAngle = 0;
  private externalHoverLook: THREE.Vector3 | null = null;

  private readonly output: StateMachineOutput;

  constructor(initialPosition: THREE.Vector3, initialYaw = 0) {
    this.position.copy(initialPosition);
    this.yaw = initialYaw;
    this.forwardDir.set(Math.sin(initialYaw), 0, Math.cos(initialYaw)).normalize();

    this.output = {
      state: this.state,
      position: this.position,
      yaw: this.yaw,
      pitch: this.pitch,
      lookTarget: null,
      telemetry: this.telemetry,
      flightProgress: 1,
      isInDestinationTransit: false,
      forwardDir: this.forwardDir,
      justEnteredIntroduction: false,
      justEnteredTakeoff: false,
    };
  }

  public getState(): BharariBehaviorState {
    return this.state;
  }

  public getPosition(): THREE.Vector3 {
    return this.position;
  }

  public getForwardDirection(): THREE.Vector3 {
    return this.forwardDir;
  }

  public isAirborne(): boolean {
    return (
      this.state === 'TAKEOFF' ||
      this.state === 'FLYING' ||
      this.state === 'LANDING' ||
      this.overviewSoaring
    );
  }

  public setExternalHoverLook(target: THREE.Vector3 | null): void {
    this.externalHoverLook = target;
  }

  /**
   * Places Bharari directly into idle perch or introduction without transit (e.g., initial load or Meet Bharari).
   */
  public perchAt(
    pos: THREE.Vector3,
    faceTarget: THREE.Vector3 | null,
    startIntroduction = false,
  ): void {
    this.overviewSoaring = false;
    this.flightCurve = null;
    this.position.copy(pos);
    this.pitch = 0;
    this.telemetry.speed = 0;
    this.telemetry.climbRate = 0;
    this.telemetry.bankAngle = 0;
    this.telemetry.isGliding = false;
    this.telemetry.phase = 0;

    if (faceTarget) {
      this.faceAfterLanding.copy(faceTarget);
      this.hasFaceTarget = true;
    } else {
      this.hasFaceTarget = false;
    }

    this.state = startIntroduction ? 'INTRODUCTION' : 'IDLE';
    this.stateElapsed = 0;
  }

  /**
   * Starts gentle circling thermal flight over the village crossroads (Village Overview).
   */
  public enterOverviewSoaring(): void {
    this.flightCurve = null;
    this.overviewSoaring = true;
    this.hasFaceTarget = false;
    this.state = 'FLYING';
    this.stateElapsed = 0;
    this.telemetry.isGliding = true;
    // Align initial orbit angle to Bharari's current position so transition is seamless
    this.overviewOrbitAngle = Math.atan2(this.position.z + 2.0, this.position.x);
  }

  /**
   * Syncs external spline motion (e.g. Screen 3 Flying Journey) so the state machine
   * always knows Bharari's exact live pose if the user interrupts mid-journey.
   */
  public syncExternalPose(
    state: BharariBehaviorState,
    pos: THREE.Vector3,
    yaw: number,
    pitch: number,
    telemetry: Partial<BharariFlightTelemetry>,
  ): void {
    this.overviewSoaring = false;
    this.flightCurve = null;
    this.state = state;
    this.position.copy(pos);
    this.yaw = yaw;
    this.pitch = pitch;
    this.forwardDir.set(Math.sin(yaw), Math.sin(-pitch), Math.cos(yaw)).normalize();

    if (telemetry.speed !== undefined) this.telemetry.speed = telemetry.speed;
    if (telemetry.climbRate !== undefined) this.telemetry.climbRate = telemetry.climbRate;
    if (telemetry.bankAngle !== undefined) this.telemetry.bankAngle = telemetry.bankAngle;
    if (telemetry.phase !== undefined) this.telemetry.phase = telemetry.phase;
    if (telemetry.isGliding !== undefined) this.telemetry.isGliding = telemetry.isGliding;
  }

  /**
   * Commands Bharari to travel to a new destination using the full cinematic sequence:
   *   Perched:  NOTICE -> TAKEOFF -> FLYING -> LANDING -> INTRODUCTION -> IDLE
   *   Airborne: Smooth continuous re-route into FLYING -> LANDING -> INTRODUCTION -> IDLE
   */
  public commandFlightTo(cmd: FlightCommand): void {
    const dist = this.position.distanceTo(cmd.targetPosition);
    this.noticePoint.copy(cmd.lookAtNoticePoint);
    this.landingTarget.copy(cmd.targetPosition);
    this.faceAfterLanding.copy(cmd.faceTargetAfterLanding);
    this.hasFaceTarget = true;
    this.playIntroOnArrival = cmd.playIntroduction;

    if (cmd.instant || dist < 0.45) {
      this.perchAt(cmd.targetPosition, cmd.faceTargetAfterLanding, cmd.playIntroduction);
      return;
    }

    const wasAlreadyAirborne =
      this.overviewSoaring ||
      this.state === 'FLYING' ||
      this.state === 'TAKEOFF' ||
      this.state === 'LANDING';

    this.overviewSoaring = false;

    // Build graceful curved path; when already airborne, preserve current forward heading!
    this.flightCurve = buildCinematicFlightCurve(
      this.position,
      cmd.targetPosition,
      wasAlreadyAirborne ? this.forwardDir : null,
    );

    // Distance-aware natural flight duration (never too slow or too fast)
    this.flyingDuration = THREE.MathUtils.clamp(1.25 + dist * 0.048, 1.45, 2.75);
    this.noticeDuration = cmd.skipNotice ? 0.14 : 0.44;
    this.takeoffDuration = 0.54;
    this.landingDuration = 0.72;
    this.introDuration = 2.15;

    if (wasAlreadyAirborne) {
      // Seamless mid-air redirect — never stall or reset to perch!
      this.state = 'FLYING';
      this.stateElapsed = 0;
      this.telemetry.phase = 0;
      this.telemetry.isGliding = false;
    } else {
      // Full expressive ground-launch sequence: NOTICE -> TAKEOFF -> FLYING -> LANDING -> INTRODUCTION
      this.state = 'NOTICE';
      this.stateElapsed = 0;
      this.telemetry.phase = 0;
      this.telemetry.speed = 0;
      this.telemetry.climbRate = 0;
      this.telemetry.bankAngle = 0;
      this.telemetry.isGliding = false;
    }
  }

  /**
   * Triggers a warm introduction / greeting beat when perched.
   */
  public triggerIntroductionBeat(): void {
    if (this.state === 'IDLE' || this.state === 'INTRODUCTION') {
      this.state = 'INTRODUCTION';
      this.stateElapsed = 0;
      this.telemetry.phase = 0;
    }
  }

  public update(delta: number, elapsed: number): StateMachineOutput {
    const dt = Math.min(delta, 0.05);
    this.stateElapsed += dt;

    let justEnteredIntroduction = false;
    let justEnteredTakeoff = false;
    let lookTarget: THREE.Vector3 | null = this.externalHoverLook;
    let flightProgress = 1;
    let isInDestinationTransit = false;

    // 1. Connected Village Overview gentle thermal soaring
    if (this.overviewSoaring) {
      this.overviewOrbitAngle += dt * 0.28;
      const radius = 8.6;
      const targetX = Math.cos(this.overviewOrbitAngle) * radius;
      const targetZ = Math.sin(this.overviewOrbitAngle) * radius - 2.0;
      const targetY = 8.8 + Math.sin(elapsed * 0.92) * 0.58;

      _vPrevPos.copy(this.position);
      this.position.x = THREE.MathUtils.damp(this.position.x, targetX, 2.8, dt);
      this.position.y = THREE.MathUtils.damp(this.position.y, targetY, 2.8, dt);
      this.position.z = THREE.MathUtils.damp(this.position.z, targetZ, 2.8, dt);

      const tangentX = -Math.sin(this.overviewOrbitAngle);
      const tangentZ = Math.cos(this.overviewOrbitAngle);
      const targetYaw = Math.atan2(tangentX, tangentZ);
      this.yaw = dampAngle(this.yaw, targetYaw, 5.5, dt);

      const climb = (this.position.y - _vPrevPos.y) / Math.max(dt, 0.001);
      const targetPitch = THREE.MathUtils.clamp(-climb * 0.14, -0.18, 0.18);
      this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 5, dt);
      this.forwardDir.set(Math.sin(this.yaw), Math.sin(-this.pitch), Math.cos(this.yaw)).normalize();

      // Gentle occasional wingbeat cycle during thermal glide
      const thermalFlap = Math.sin(elapsed * 0.65);
      this.telemetry.speed = 0.78;
      this.telemetry.climbRate = THREE.MathUtils.clamp(climb * 0.4, -0.4, 0.5);
      this.telemetry.bankAngle = 0.23 + Math.sin(elapsed * 0.9) * 0.04;
      this.telemetry.isGliding = thermalFlap > -0.45;
      this.telemetry.phase = 0;

      this.output.state = 'FLYING';
      this.output.lookTarget = this.externalHoverLook;
      this.output.flightProgress = 1;
      this.output.isInDestinationTransit = false;
      this.output.yaw = this.yaw;
      this.output.pitch = this.pitch;
      this.output.justEnteredIntroduction = false;
      this.output.justEnteredTakeoff = false;
      return this.output;
    }

    // 2. Canonical Interaction State Machine
    switch (this.state) {
      case 'NOTICE': {
        isInDestinationTransit = true;
        const p = THREE.MathUtils.clamp(this.stateElapsed / this.noticeDuration, 0, 1);
        this.telemetry.phase = p;
        this.telemetry.speed = 0;
        this.telemetry.climbRate = 0;
        this.telemetry.bankAngle = 0;
        this.telemetry.isGliding = false;
        flightProgress = p * 0.08;
        lookTarget = this.noticePoint;

        // Turn body partially toward the newly selected destination as head locks on first
        const dx = this.noticePoint.x - this.position.x;
        const dz = this.noticePoint.z - this.position.z;
        const targetYaw = Math.atan2(dx, dz);
        this.yaw = dampAngle(this.yaw, targetYaw, 3.8 + p * 4.5, dt);
        this.pitch = THREE.MathUtils.damp(this.pitch, 0, 8, dt);
        this.forwardDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();

        if (this.stateElapsed >= this.noticeDuration) {
          this.state = 'TAKEOFF';
          this.stateElapsed = 0;
          this.telemetry.phase = 0;
          justEnteredTakeoff = true;
        }
        break;
      }

      case 'TAKEOFF': {
        isInDestinationTransit = true;
        const p = THREE.MathUtils.clamp(this.stateElapsed / this.takeoffDuration, 0, 1);
        this.telemetry.phase = p;
        this.telemetry.isGliding = false;
        flightProgress = 0.08 + p * 0.12;
        lookTarget = this.noticePoint;

        if (this.flightCurve) {
          // Stay grounded during crouch (0..0.42), then push off cleanly along curve start (0.42..1.0)
          const pushU = THREE.MathUtils.smoothstep(p, 0.4, 1.0);
          const curveU = pushU * 0.09;
          this.flightCurve.getPoint(curveU, _vLaunchPoint);
          this.flightCurve.getTangent(curveU, _vTan);

          _vPrevPos.copy(this.position);
          this.position.copy(_vLaunchPoint);

          const targetYaw = Math.atan2(_vTan.x, _vTan.z);
          this.yaw = dampAngle(this.yaw, targetYaw, 8.5, dt);
          const climbPitch = THREE.MathUtils.clamp(-_vTan.y * 0.42 * pushU, -0.32, 0.15);
          this.pitch = THREE.MathUtils.damp(this.pitch, climbPitch, 7, dt);
          this.forwardDir.copy(_vTan).normalize();

          this.telemetry.speed = pushU * 0.65;
          this.telemetry.climbRate = Math.max(0, _vTan.y) * pushU;
          this.telemetry.bankAngle = 0;
        }

        if (this.stateElapsed >= this.takeoffDuration) {
          this.state = 'FLYING';
          this.stateElapsed = 0;
          this.telemetry.phase = 0;
        }
        break;
      }

      case 'FLYING': {
        if (!this.flightCurve) {
          this.state = 'IDLE';
          this.stateElapsed = 0;
          break;
        }

        isInDestinationTransit = true;
        const rawU = THREE.MathUtils.clamp(this.stateElapsed / this.flyingDuration, 0, 1);
        const { value: easedU, deriv } = easeInOutCubicWithDeriv(rawU);

        // Flight covers curve interval [0.09 -> 0.88] leaving [0.88 -> 1.0] for gentle braking landing
        const curveU = 0.09 + easedU * 0.79;
        flightProgress = 0.2 + rawU * 0.62;

        this.flightCurve.getPoint(curveU, _vPos);
        this.flightCurve.getTangent(curveU, _vTan);
        this.position.copy(_vPos);
        this.forwardDir.copy(_vTan).normalize();

        // Natural heading alignment & climb/descent pitch
        const targetYaw = Math.atan2(_vTan.x, _vTan.z);
        this.yaw = dampAngle(this.yaw, targetYaw, 7.5, dt);
        const targetPitch = THREE.MathUtils.clamp(-_vTan.y * 0.52, -0.34, 0.28);
        this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 6.2, dt);

        // Curvature-derived aerodynamic bank angle (signed turn rate via cross product)
        const prevU = Math.max(0, curveU - 0.04);
        const nextU = Math.min(1, curveU + 0.04);
        this.flightCurve.getTangent(prevU, _vPrevTan);
        this.flightCurve.getTangent(nextU, _vNextTan);
        _vCross.crossVectors(_vPrevTan, _vNextTan);
        const computedBank = THREE.MathUtils.clamp(-_vCross.y * 4.4, -0.46, 0.46);

        // Normalized airspeed & climb telemetry
        const speedNorm = THREE.MathUtils.clamp(0.42 + deriv * 0.45, 0.35, 1.35);
        this.telemetry.speed = speedNorm;
        this.telemetry.climbRate = THREE.MathUtils.clamp(_vTan.y * 1.4, -1, 1);
        this.telemetry.bankAngle = computedBank;
        this.telemetry.phase = rawU;
        // Effortless brief glide near the sunlit crest when gently descending
        this.telemetry.isGliding = rawU > 0.46 && rawU < 0.74 && _vTan.y < 0.04;
        lookTarget = this.landingTarget;

        if (this.stateElapsed >= this.flyingDuration) {
          this.state = 'LANDING';
          this.stateElapsed = 0;
          this.telemetry.phase = 0;
        }
        break;
      }

      case 'LANDING': {
        isInDestinationTransit = true;
        const p = THREE.MathUtils.clamp(this.stateElapsed / this.landingDuration, 0, 1);
        this.telemetry.phase = p;
        flightProgress = 0.82 + p * 0.18;

        // Smooth deceleration into exact landing perch: touchdown completes around p = 0.72,
        // remaining 0.72..1.0 completes the graceful wing fold & settle!
        const approachU = THREE.MathUtils.clamp(p / 0.74, 0, 1);
        const decelCurve = 1 - Math.pow(1 - approachU, 3); // Ease-out cubic deceleration

        if (this.flightCurve) {
          const curveU = 0.88 + decelCurve * 0.12;
          this.flightCurve.getPoint(curveU, _vPos);
          this.flightCurve.getTangent(Math.min(0.995, curveU), _vTan);
          this.position.copy(_vPos);
          this.forwardDir.copy(_vTan).normalize();

          if (p < 0.65) {
            const approachYaw = Math.atan2(_vTan.x, _vTan.z);
            this.yaw = dampAngle(this.yaw, approachYaw, 6.5, dt);
          } else if (this.hasFaceTarget) {
            // Once feet touch the perch, smoothly begin turning toward the visitor!
            const dx = this.faceAfterLanding.x - this.position.x;
            const dz = this.faceAfterLanding.z - this.position.z;
            this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 5.0, dt);
          }
        }

        this.pitch = THREE.MathUtils.damp(this.pitch, 0, 7.5, dt);
        this.telemetry.speed = Math.max(0, (1 - approachU) * 0.65);
        this.telemetry.climbRate = 0;
        this.telemetry.bankAngle = 0;
        this.telemetry.isGliding = false;
        lookTarget = p > 0.55 && this.hasFaceTarget ? this.faceAfterLanding : this.landingTarget;

        if (this.stateElapsed >= this.landingDuration) {
          this.position.copy(this.landingTarget);
          this.flightCurve = null;
          this.pitch = 0;
          this.telemetry.speed = 0;
          this.telemetry.bankAngle = 0;
          this.state = this.playIntroOnArrival ? 'INTRODUCTION' : 'IDLE';
          this.stateElapsed = 0;
          this.telemetry.phase = 0;
          if (this.state === 'INTRODUCTION') {
            justEnteredIntroduction = true;
          }
        }
        break;
      }

      case 'INTRODUCTION': {
        const p = THREE.MathUtils.clamp(this.stateElapsed / this.introDuration, 0, 1);
        this.telemetry.phase = p;
        this.telemetry.speed = 0;
        this.telemetry.climbRate = 0;
        this.telemetry.bankAngle = 0;
        this.telemetry.isGliding = false;

        if (this.hasFaceTarget) {
          const dx = this.faceAfterLanding.x - this.position.x;
          const dz = this.faceAfterLanding.z - this.position.z;
          this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 6.0, dt);
          lookTarget = this.externalHoverLook ?? this.faceAfterLanding;
        }
        this.pitch = THREE.MathUtils.damp(this.pitch, 0, 8, dt);
        this.forwardDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();

        if (this.stateElapsed >= this.introDuration) {
          this.state = 'IDLE';
          this.stateElapsed = 0;
          this.telemetry.phase = 0;
        }
        break;
      }

      case 'IDLE':
      default: {
        this.telemetry.speed = 0;
        this.telemetry.climbRate = 0;
        this.telemetry.bankAngle = 0;
        this.telemetry.isGliding = false;
        this.telemetry.phase = 0;

        if (this.hasFaceTarget) {
          const dx = this.faceAfterLanding.x - this.position.x;
          const dz = this.faceAfterLanding.z - this.position.z;
          this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 4.5, dt);
          lookTarget = this.externalHoverLook ?? this.faceAfterLanding;
        }
        this.pitch = THREE.MathUtils.damp(this.pitch, 0, 8, dt);
        this.forwardDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
        break;
      }
    }

    this.output.state = this.state;
    this.output.yaw = this.yaw;
    this.output.pitch = this.pitch;
    this.output.lookTarget = lookTarget;
    this.output.flightProgress = flightProgress;
    this.output.isInDestinationTransit = isInDestinationTransit;
    this.output.justEnteredIntroduction = justEnteredIntroduction;
    this.output.justEnteredTakeoff = justEnteredTakeoff;
    return this.output;
  }
}

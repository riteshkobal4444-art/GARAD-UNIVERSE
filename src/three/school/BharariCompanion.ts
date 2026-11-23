import * as THREE from 'three';
import type { IBharariCharacter, SchoolZoneId } from '../../types/universe';

export interface CompanionPerch {
  id: string;
  zone: SchoolZoneId;
  position: THREE.Vector3;
}

const _targetPos = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _lookPoint = new THREE.Vector3();
const _curveMid = new THREE.Vector3();
const _flightPos = new THREE.Vector3();
const _nextFlightPos = new THREE.Vector3();

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

/**
 * Reusable Bharari Companion AI controller for Stage 3 third-person exploration.
 *
 * Drives the exact approved `IBharariCharacter` (deep blue/teal feathers,
 * warm orange chest, large brown eyes, brown schoolbag):
 * - Accompanies the child explorer at a comfortable side/perch offset (never blocks camera)
 * - Smoothly flies between nearby perches (veranda rail, neem tree, classroom window,
 *   library bookshelf corner, playground bench/goalpost) as the player explores zones
 * - Looks toward nearby undiscovered objects/books as a gentle visual guide
 * - Celebrates happily when the player discovers a book or landmark
 */
export class BharariCompanionController {
  private readonly bharari: IBharariCharacter;
  private readonly perches: CompanionPerch[];

  private active = false;
  private mode: 'perched' | 'flying' = 'perched';
  private activePerchId = '';

  private readonly startPos = new THREE.Vector3();
  private readonly endPos = new THREE.Vector3();
  private flightProgress = 1;
  private flightDuration = 1.4;
  private currentYaw = 0;
  private currentPitch = 0;
  private celebrateTimer = 0;
  private perchReevaluateTimer = 0;

  constructor(bharari: IBharariCharacter, perches: CompanionPerch[]) {
    this.bharari = bharari;
    this.perches = perches;
  }

  public activate(playerPos: THREE.Vector3, initialZone: SchoolZoneId = 'village-street'): void {
    this.active = true;
    this.mode = 'perched';
    this.celebrateTimer = 0;
    this.perchReevaluateTimer = 0.85;

    const startPerch =
      this.perches.find((p) => p.zone === initialZone) ??
      this.findBestPerch(playerPos, initialZone) ??
      this.perches[0];
    if (startPerch) {
      this.activePerchId = startPerch.id;
      this.bharari.group.position.copy(startPerch.position);
      this.bharari.group.scale.setScalar(0.58);
      const dx = playerPos.x - startPerch.position.x;
      const dz = playerPos.z - startPerch.position.z;
      this.currentYaw = Math.atan2(dx, dz);
      this.currentPitch = 0;
      this.bharari.group.rotation.set(0, this.currentYaw, 0);
      this.bharari.setBehaviorState('INTRODUCTION');
      this.bharari.triggerGreet();
    }
  }

  public getPerchById(id: string): CompanionPerch | null {
    return this.perches.find((p) => p.id === id) ?? null;
  }

  public activateFromPerch(perchId: string, playerPos: THREE.Vector3): void {
    this.active = true;
    this.mode = 'perched';
    this.celebrateTimer = 0;
    this.perchReevaluateTimer = 1.2;

    const perch = this.getPerchById(perchId) ?? this.perches[0];
    if (perch) {
      this.activePerchId = perch.id;
      this.bharari.group.position.copy(perch.position);
      this.bharari.group.scale.setScalar(0.58);
      const dx = playerPos.x - perch.position.x;
      const dz = playerPos.z - perch.position.z;
      this.currentYaw = Math.atan2(dx, dz);
      this.currentPitch = 0;
      this.bharari.group.rotation.set(0, this.currentYaw, 0);
      this.bharari.setBehaviorState('INTRODUCTION');
      this.bharari.triggerGreet();
    }
  }

  public deactivate(): void {
    this.active = false;
    // Restore original village diorama scale cleanly when leaving school adventure
    this.bharari.group.scale.setScalar(1.08);
    this.bharari.setLookTarget(null);
  }

  public triggerCelebration(): void {
    if (!this.active) return;
    this.celebrateTimer = 1.65;
    this.bharari.triggerGreet();
    if (this.mode === 'perched') {
      this.bharari.setBehaviorState('INTRODUCTION');
    }
  }

  private findBestPerch(playerPos: THREE.Vector3, playerZone: SchoolZoneId): CompanionPerch | null {
    let best: CompanionPerch | null = null;
    let bestScore = Infinity;

    for (const p of this.perches) {
      const dist = p.position.distanceTo(playerPos);
      // Prefer perches in the same zone at a friendly 2.4m–5.8m offset (never too close)
      const zonePenalty = p.zone === playerZone ? 0 : 6.5;
      const tooClosePenalty = dist < 1.9 ? (1.9 - dist) * 4.0 : 0;
      const score = Math.abs(dist - 3.6) + zonePenalty + tooClosePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  private beginFlightTo(target: THREE.Vector3, perchId: string): void {
    this.startPos.copy(this.bharari.group.position);
    this.endPos.copy(target);
    this.activePerchId = perchId;
    const dist = this.startPos.distanceTo(this.endPos);
    this.flightDuration = THREE.MathUtils.clamp(dist / 5.4, 0.75, 2.2);
    this.flightProgress = 0;
    this.mode = 'flying';
    this.bharari.setBehaviorState('TAKEOFF');
    this.bharari.setTransitionPhase(0);
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerZone: SchoolZoneId,
    hintTargetPos: THREE.Vector3 | null,
  ): void {
    if (!this.active) return;
    const dt = Math.min(delta, 0.05);

    if (this.celebrateTimer > 0) {
      this.celebrateTimer = Math.max(0, this.celebrateTimer - dt);
    }

    // Periodically check if player moved far enough or changed zone so Bharari hops/flies along
    this.perchReevaluateTimer -= dt;
    if (this.mode === 'perched' && this.perchReevaluateTimer <= 0) {
      this.perchReevaluateTimer = 0.7;
      const distToPlayer = this.bharari.group.position.distanceTo(playerPos);
      const bestPerch = this.findBestPerch(playerPos, playerZone);
      if (
        bestPerch &&
        bestPerch.id !== this.activePerchId &&
        (distToPlayer > 6.2 || bestPerch.zone === playerZone)
      ) {
        // Only switch within same zone if significantly closer
        const currentPerch = this.perches.find((p) => p.id === this.activePerchId);
        const switchedZone = currentPerch?.zone !== playerZone;
        if (switchedZone || distToPlayer > 6.8) {
          this.beginFlightTo(bestPerch.position, bestPerch.id);
        }
      }
    }

    if (this.mode === 'flying') {
      this.flightProgress = Math.min(1, this.flightProgress + dt / this.flightDuration);
      const t = this.flightProgress;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Graceful arc staying safely below indoor ceiling height (3.35m) when indoors
      const isIndoorFlight = playerZone === 'classroom' || playerZone === 'library';
      const arcBoost = isIndoorFlight ? 0.55 : 1.55;
      const maxPeakY = isIndoorFlight ? 3.25 : 6.2;

      _curveMid.lerpVectors(this.startPos, this.endPos, 0.5);
      _curveMid.y = Math.min(Math.max(this.startPos.y, this.endPos.y) + arcBoost, maxPeakY);

      // Quadratic Bezier evaluation
      const oneMinus = 1 - eased;
      _flightPos
        .set(0, 0, 0)
        .addScaledVector(this.startPos, oneMinus * oneMinus)
        .addScaledVector(_curveMid, 2 * oneMinus * eased)
        .addScaledVector(this.endPos, eased * eased);

      const nextEased = Math.min(1, eased + 0.04);
      const nextOm = 1 - nextEased;
      _nextFlightPos
        .set(0, 0, 0)
        .addScaledVector(this.startPos, nextOm * nextOm)
        .addScaledVector(_curveMid, 2 * nextOm * nextEased)
        .addScaledVector(this.endPos, nextEased * nextEased);

      _toTarget.subVectors(_nextFlightPos, _flightPos);
      if (_toTarget.lengthSq() > 1e-5) {
        const desiredYaw = Math.atan2(_toTarget.x, _toTarget.z);
        this.currentYaw = dampAngle(this.currentYaw, desiredYaw, 9.0, dt);
        const horiz = Math.hypot(_toTarget.x, _toTarget.z);
        const desiredPitch = THREE.MathUtils.clamp(-Math.atan2(_toTarget.y, Math.max(horiz, 0.05)) * 0.45, -0.28, 0.25);
        this.currentPitch = THREE.MathUtils.damp(this.currentPitch, desiredPitch, 7.5, dt);
      }

      this.bharari.group.position.copy(_flightPos);
      this.bharari.group.rotation.y = this.currentYaw;
      this.bharari.group.rotation.x = this.currentPitch;

      if (t < 0.16) {
        this.bharari.setBehaviorState('TAKEOFF');
        this.bharari.setFlightTelemetry({ phase: t / 0.16, speed: 0.7, climbRate: 0.5, bankAngle: 0, isGliding: false });
      } else if (t > 0.82) {
        this.bharari.setBehaviorState('LANDING');
        this.bharari.setFlightTelemetry({ phase: (t - 0.82) / 0.18, speed: 0.35, climbRate: -0.35, bankAngle: 0, isGliding: false });
      } else {
        this.bharari.setBehaviorState('FLYING');
        this.bharari.setFlightTelemetry({
          phase: t,
          speed: 0.95,
          climbRate: THREE.MathUtils.clamp(_toTarget.y * 2.0, -0.8, 0.8),
          bankAngle: Math.sin(t * Math.PI) * 0.16,
          isGliding: false,
        });
      }

      this.bharari.setLookTarget(null);

      if (this.flightProgress >= 1) {
        this.mode = 'perched';
        this.bharari.group.position.copy(this.endPos);
        this.currentPitch = 0;
        this.bharari.group.rotation.x = 0;
        this.bharari.setBehaviorState('IDLE');
      }
      return;
    }

    // Perched mode: face gently toward the child explorer or toward nearby undiscovered hint!
    if (hintTargetPos && this.celebrateTimer <= 0) {
      _targetPos.copy(hintTargetPos);
      _lookPoint.copy(hintTargetPos);
    } else {
      _targetPos.set(playerPos.x, playerPos.y + 1.05, playerPos.z);
      _lookPoint.copy(_targetPos);
    }

    const dx = _targetPos.x - this.bharari.group.position.x;
    const dz = _targetPos.z - this.bharari.group.position.z;
    const desiredYaw = Math.atan2(dx, dz);
    this.currentYaw = dampAngle(this.currentYaw, desiredYaw, 4.2, dt);
    this.currentPitch = THREE.MathUtils.damp(this.currentPitch, 0, 6.0, dt);

    this.bharari.group.rotation.y = this.currentYaw;
    this.bharari.group.rotation.x = this.currentPitch;
    this.bharari.setLookTarget(_lookPoint);
    this.bharari.setBehaviorState(this.celebrateTimer > 0 ? 'INTRODUCTION' : 'IDLE');
    this.bharari.setFlightTelemetry({
      speed: 0,
      climbRate: 0,
      bankAngle: 0,
      phase: 0,
      isGliding: false,
    });
  }
}

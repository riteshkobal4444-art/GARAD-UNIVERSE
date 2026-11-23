import * as THREE from 'three';
import { DESTINATIONS_BY_ID, VILLAGE_DESTINATIONS } from '../../data/destinations';
import type { DestinationId, ScreenId } from '../../types/universe';
import { groundHeightAt, MEET_BHARARI_KNOLL } from '../terrain';

export interface CameraTargetState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

/**
 * Builds the scenic Catmull-Rom flight path for the Flying Journey Screen,
 * soaring smoothly from Bharari's foreground knoll over all five connected destinations.
 */
export function buildFlyingJourneySpline(): THREE.CatmullRomCurve3 {
  const [kx, ky, kz] = MEET_BHARARI_KNOLL;
  const pts: THREE.Vector3[] = [
    new THREE.Vector3(kx, ky + 2.2, kz),
    new THREE.Vector3(-8.5, 8.2, 16.5),
    // Over Village School
    new THREE.Vector3(-15.5, 7.6, 6.5),
    // Sweep across Village Library
    new THREE.Vector3(-13.0, 8.4, -12.0),
    // Crest up over Dream Hill
    new THREE.Vector3(0.5, 11.4, -22.5),
    // Swoop over Community Centre
    new THREE.Vector3(15.5, 8.2, -10.5),
    // Glide over Activity Ground
    new THREE.Vector3(13.5, 7.6, 9.5),
    // Gentle settle above central Village Crossroads
    new THREE.Vector3(1.5, 4.8, 3.8),
  ];
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.45);
}

/**
 * Computes which destination landmark Bharari is currently gliding past during Flying Journey (0..1).
 */
export function getFlyoverDestinationAtProgress(progress: number): DestinationId {
  if (progress < 0.24) return 'village-school';
  if (progress < 0.44) return 'village-library';
  if (progress < 0.63) return 'dream-hill';
  if (progress < 0.82) return 'community-centre';
  return 'activity-ground';
}

/**
 * Returns the cinematic camera framing for each screen or destination.
 */
export function getCameraPresetForScreen(
  screen: ScreenId,
  destinationId: DestinationId | null,
  isCompactViewport: boolean,
): CameraTargetState {
  const [kx, ky, kz] = MEET_BHARARI_KNOLL;
  const distBoost = isCompactViewport ? 1.24 : 1.0;

  if (screen === 'welcome') {
    return {
      position: new THREE.Vector3(
        kx + 4.8 * distBoost,
        ky + 5.8 * distBoost,
        kz + 10.6 * distBoost,
      ),
      target: new THREE.Vector3(-0.6, ky + 1.1, kz - 14.0),
      fov: isCompactViewport ? 50 : 44,
    };
  }

  if (screen === 'meet-bharari') {
    // Intimate hero framing of Bharari perched on the village milestone
    return {
      position: new THREE.Vector3(
        kx - (isCompactViewport ? 0.5 : 1.25),
        ky + (isCompactViewport ? 2.65 : 2.38),
        kz + (isCompactViewport ? 4.35 : 3.45),
      ),
      target: new THREE.Vector3(
        kx + (isCompactViewport ? 0 : 0.42),
        ky + 2.02,
        kz,
      ),
      fov: isCompactViewport ? 46 : 40,
    };
  }

  if (screen === 'village-overview') {
    return {
      position: new THREE.Vector3(0, 26.5 * distBoost, 34.5 * distBoost),
      target: new THREE.Vector3(0, 1.5, -4.5),
      fov: isCompactViewport ? 52 : 45,
    };
  }

  if (screen === 'destination' && destinationId) {
    const cfg = DESTINATIONS_BY_ID[destinationId];
    const [wx, wz] = cfg.worldPosition;
    const wy = groundHeightAt(wx, wz);
    const [cx, cy, cz] = cfg.cameraOffset;
    const [tx, ty, tz] = cfg.cameraTargetOffset;
    const [px, py, pz] = cfg.bharariPerchOffset;

    // Frame Bharari and the destination landmark harmoniously together
    const blendedTargetX = wx + tx * 0.78 + px * 0.22;
    const blendedTargetY = wy + ty * 0.78 + (py + 0.85) * 0.22;
    const blendedTargetZ = wz + tz * 0.78 + pz * 0.22;

    const camPos = new THREE.Vector3(
      wx + cx * distBoost,
      wy + cy * distBoost,
      wz + cz * distBoost,
    );
    // Guarantee safe ground clearance for every destination preset
    const camGround = groundHeightAt(camPos.x, camPos.z);
    if (camPos.y < camGround + 2.2) {
      camPos.y = camGround + 2.2;
    }

    return {
      position: camPos,
      target: new THREE.Vector3(blendedTargetX, blendedTargetY, blendedTargetZ),
      fov: isCompactViewport ? 50 : 44,
    };
  }

  // Fallback to overview
  return {
    position: new THREE.Vector3(0, 26.5, 34.5),
    target: new THREE.Vector3(0, 1.5, -4.5),
    fov: 45,
  };
}

/**
 * Generates a graceful arched flight curve for Bharari between any two world points.
 */
export function buildPointToPointFlightArc(
  from: THREE.Vector3,
  to: THREE.Vector3,
): THREE.QuadraticBezierCurve3 {
  const mid = from.clone().lerp(to, 0.5);
  const dist = from.distanceTo(to);
  mid.y = Math.max(from.y, to.y) + Math.min(9.5, Math.max(2.8, dist * 0.28));
  return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
}

/**
 * Builds a Stage 2 cinematic curved 3D flight path (Catmull-Rom) between any two points:
 * - Preserves Bharari's current heading when redirecting mid-flight (zero abrupt pivots)
 * - Sweeps gently across the valley so Bharari banks naturally through a graceful turn
 * - Guarantees clearance over terrain and village rooftops
 * - Approaches the destination perch along a smooth braking flare
 */
export function buildCinematicFlightCurve(
  from: THREE.Vector3,
  to: THREE.Vector3,
  initialForwardDir: THREE.Vector3 | null = null,
): THREE.CatmullRomCurve3 {
  const delta = to.clone().sub(from);
  const horizDist = Math.hypot(delta.x, delta.z);
  const travelDir =
    horizDist > 0.01
      ? new THREE.Vector3(delta.x / horizDist, 0, delta.z / horizDist)
      : new THREE.Vector3(0, 0, 1);

  // Choose a natural lateral curve sweeping softly toward the sunlit open village center
  const sideNormal = new THREE.Vector3(-travelDir.z, 0, travelDir.x);
  const midFlat = from.clone().lerp(to, 0.5);
  const toCenterDot = -midFlat.x * sideNormal.x + (-2.0 - midFlat.z) * sideNormal.z;
  const bendSign = toCenterDot >= 0 ? 1 : -1;
  const lateralArc = Math.min(6.2, Math.max(1.6, horizDist * 0.18)) * bendSign;

  const cruiseBoost = Math.min(8.6, Math.max(2.6, horizDist * 0.24));

  // Control point 1: launch climb-out (honoring current velocity tangent if already airborne)
  const launchDir =
    initialForwardDir && initialForwardDir.lengthSq() > 0.01
      ? new THREE.Vector3(initialForwardDir.x, 0, initialForwardDir.z).normalize()
      : travelDir;

  const p1 = from
    .clone()
    .addScaledVector(launchDir, Math.min(4.2, horizDist * 0.24))
    .addScaledVector(sideNormal, lateralArc * 0.22);
  p1.y = Math.max(from.y + 1.45, groundHeightAt(p1.x, p1.z) + 3.4);

  // Control point 2: scenic apex over the village with gentle banking curve
  const p2 = from
    .clone()
    .lerp(to, 0.52)
    .addScaledVector(sideNormal, lateralArc);
  const apexGround = groundHeightAt(p2.x, p2.z);
  p2.y = Math.max(Math.max(from.y, to.y) + cruiseBoost, apexGround + 6.4);

  // Control point 3: graceful descending flare approach toward the perch
  const p3 = from
    .clone()
    .lerp(to, 0.85)
    .addScaledVector(sideNormal, lateralArc * 0.28);
  const approachGround = groundHeightAt(p3.x, p3.z);
  p3.y = Math.max(to.y + 1.55, approachGround + 2.8);

  return new THREE.CatmullRomCurve3(
    [from.clone(), p1, p2, p3, to.clone()],
    false,
    'catmullrom',
    0.5,
  );
}

export const ORDERED_DESTINATIONS = VILLAGE_DESTINATIONS;

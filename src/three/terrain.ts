import { VILLAGE_DESTINATIONS } from '../data/destinations';

/**
 * Deterministic heightfield for Garad Village nestled in the Sahyadri hills.
 * Every landmark, tree, pathway, and Bharari perch samples this exact function
 * so nothing floats or clips through terrain.
 */

interface PlateauZone {
  x: number;
  z: number;
  radius: number;
  blendWidth: number;
  targetHeight: number;
}

const PLATEAUS: PlateauZone[] = [
  // Central village crossroads / welcoming banyan square
  { x: 0, z: 0, radius: 5.5, blendWidth: 5.5, targetHeight: 0.2 },
  // Meet Bharari foreground sunlit knoll
  { x: 0, z: 24, radius: 4.5, blendWidth: 6.0, targetHeight: 1.55 },
  // Village School (Mission Bharari)
  { x: -15.5, z: 6.5, radius: 6.2, blendWidth: 5.2, targetHeight: 0.75 },
  // Village Library (Garad Granthalay)
  { x: -12.5, z: -12.5, radius: 5.8, blendWidth: 5.0, targetHeight: 1.05 },
  // Activity Ground (Youth Development)
  { x: 14.0, z: 9.5, radius: 7.0, blendWidth: 5.2, targetHeight: 0.55 },
  // Community Centre (Community Development)
  { x: 15.5, z: -10.5, radius: 6.0, blendWidth: 5.0, targetHeight: 0.95 },
  // Dream Hill (About Garad Foundation) — scenic elevated northern overlook
  { x: 0.5, z: -24.5, radius: 6.4, blendWidth: 9.0, targetHeight: 5.4 },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Computes terrain elevation Y at world coordinate (x, z).
 */
export function groundHeightAt(x: number, z: number): number {
  // Base gentle Deccan undulating topography
  const undulation =
    Math.sin(x * 0.055 + 0.4) * Math.cos(z * 0.055 - 0.3) * 0.95 +
    Math.sin(x * 0.11 - z * 0.08) * 0.32;

  // Natural Sahyadri foothill rise around the outer perimeter (no box walls)
  const distFromCenter = Math.hypot(x, z + 2);
  const outerRimRise =
    smoothstep(30, 82, distFromCenter) *
    (9.5 +
      Math.sin(Math.atan2(z, x) * 5 + 0.7) * 3.4 +
      Math.cos(Math.atan2(z, x) * 3 - 0.5) * 2.4);

  // Subtle stream dip curving along the eastern-southern meadow
  const streamCenterX = 5.5 + Math.sin(z * 0.12) * 3.2;
  const distToStream = Math.abs(x - streamCenterX);
  const streamAllowed = smoothstep(-2, 4, z) * (1 - smoothstep(14, 21, z));
  const streamDip = -0.68 * (1 - smoothstep(1.2, 3.6, distToStream)) * streamAllowed;

  let h = 0.25 + undulation + outerRimRise + streamDip;

  // Blend smoothly onto architectural plateaus
  for (const p of PLATEAUS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.radius + p.blendWidth) {
      const weight = 1 - smoothstep(p.radius, p.radius + p.blendWidth, d);
      h = h * (1 - weight) + p.targetHeight * weight;
    }
  }

  return h;
}

/**
 * Helper to fetch the exact world Vector3 base for any village destination.
 */
export function getDestinationGroundPos(indexOrId: string): [number, number, number] {
  const dest = VILLAGE_DESTINATIONS.find((d) => d.id === indexOrId);
  if (!dest) return [0, groundHeightAt(0, 0), 0];
  const [x, z] = dest.worldPosition;
  return [x, groundHeightAt(x, z), z];
}

export const MEET_BHARARI_KNOLL: [number, number, number] = [
  0,
  groundHeightAt(0, 24),
  24,
];

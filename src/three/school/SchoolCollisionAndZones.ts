import * as THREE from 'three';
import type { FootstepSurface, SchoolZoneId } from '../../types/universe';

export interface BoxCollider {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  enabled: boolean;
  /** Whether this solid blocks the third-person camera raycast */
  blocksCamera: boolean;
}

export const SCHOOL_ZONE_LABELS: Record<SchoolZoneId, string> = {
  'village-street': 'Mission Bharari',
  courtyard: 'School Courtyard',
  veranda: 'Village School',
  classroom: 'Village School',
  library: 'Garad Granthalay',
  playground: 'School Playground',
};

const _rayDir = new THREE.Vector3();

/**
 * Shared centerline X coordinate of the gently winding Mission Bharari Main Street.
 * - Straight welcoming entrance from Z = 60 down to Z = 44 (centered at X = 0).
 * - Gentle organic rural S-curve from Z = 44 to Z = 12 leading directly into the School Courtyard.
 */
export function mainStreetCenterX(z: number): number {
  if (z >= 44) return 0;
  const u = THREE.MathUtils.clamp((44 - z) / 32, 0, 1);
  const s = u * u * (3 - 2 * u);
  return Math.sin(u * Math.PI) * 1.75 - s * 2.4;
}

/**
 * Fast, deterministic collision, floor-height, zone, and footstep-surface resolver
 * for the unified Mission Bharari rural village, Village School, and separate
 * Garad Granthalay building.
 *
 * Master Coordinate Blueprint (1 unit = 1 meter):
 * - Village Main Street:       Z ∈ [12.0, 58.0], centered along mainStreetCenterX(z)
 *   - Village Entrance Sign:   X = 0, Z = 45.5
 *   - Visitor Landing Point:   X = 0, Z = 51.8 (facing North, -Z)
 * - Village School Building:   X ∈ [-10.5, 1.5], Z ∈ [-9.0, -1.0] (plinth +0.36m)
 *   - School Veranda:          X ∈ [-11.0, 2.0], Z ∈ [-1.0, 2.0]  (steps Z ∈ [2.0, 3.1])
 * - School Courtyard:          X ∈ [-12.0, 7.0], Z ∈ [2.0, 12.2]
 * - School Playground (West):  X ∈ [-28.5, -13.0], Z ∈ [-5.5, 10.5]
 * - Garad Granthalay (Separate East Building):
 *   - Library Interior:        X ∈ [13.0, 22.5], Z ∈ [12.5, 22.5] (plinth +0.36m, wooden floor)
 *   - Library West Veranda:    X ∈ [10.4, 13.0], Z ∈ [12.2, 22.8] (steps X ∈ [9.3, 10.4])
 */
export class SchoolCollisionWorld {
  private readonly colliders: BoxCollider[] = [];
  private readonly colliderById = new Map<string, BoxCollider>();

  // Generous walkable village perimeter (bounded naturally by hedgerows, fields & trees)
  public readonly boundsMinX = -30.5;
  public readonly boundsMaxX = 28.0;
  public readonly boundsMinZ = -12.5;
  public readonly boundsMaxZ = 58.5;

  public addCollider(
    id: string,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number,
    blocksCamera = true,
  ): BoxCollider {
    const col: BoxCollider = {
      id,
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minY: Math.min(minY, maxY),
      maxY: Math.max(minY, maxY),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
      enabled: true,
      blocksCamera,
    };
    this.colliders.push(col);
    this.colliderById.set(id, col);
    return col;
  }

  public addCenterCollider(
    id: string,
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    blocksCamera = true,
  ): BoxCollider {
    return this.addCollider(
      id,
      cx - w * 0.5,
      cx + w * 0.5,
      cy - h * 0.5,
      cy + h * 0.5,
      cz - d * 0.5,
      cz + d * 0.5,
      blocksCamera,
    );
  }

  public setColliderEnabled(id: string, enabled: boolean): void {
    const col = this.colliderById.get(id);
    if (col) col.enabled = enabled;
  }

  /**
   * Returns exact ground/floor surface height (meters) for smooth walking across
   * the Village Main Street, School Courtyard, School Veranda & Classroom,
   * and the separate Garad Granthalay Veranda & Reading Room.
   */
  public getFloorHeight(x: number, z: number): number {
    const plinthH = 0.36;

    // 1. Village School Building & Front Veranda slab
    if (x >= -11.0 && x <= 2.0 && z >= -9.2 && z <= 2.0) {
      return plinthH;
    }
    // School front stone steps (Z ∈ (2.0, 3.1])
    if (x >= -10.8 && x <= 1.8 && z > 2.0 && z <= 3.1) {
      const t = 1 - (z - 2.0) / 1.1;
      return plinthH * THREE.MathUtils.clamp(t, 0, 1);
    }
    // School gentle side ramps
    if (z >= -1.0 && z <= 2.0) {
      if (x < -11.0 && x >= -11.9) {
        return plinthH * THREE.MathUtils.clamp(1 - (-11.0 - x) / 0.9, 0, 1);
      }
      if (x > 2.0 && x <= 2.9) {
        return plinthH * THREE.MathUtils.clamp(1 - (x - 2.0) / 0.9, 0, 1);
      }
    }

    // 2. Separate Garad Granthalay Building & West Veranda slab
    if (x >= 10.4 && x <= 22.8 && z >= 12.2 && z <= 22.8) {
      return plinthH;
    }
    // Library West front stone steps (X ∈ [9.3, 10.4))
    if (x >= 9.3 && x < 10.4 && z >= 12.6 && z <= 22.4) {
      const t = (x - 9.3) / 1.1;
      return plinthH * THREE.MathUtils.clamp(t, 0, 1);
    }
    // Library gentle North/South veranda side ramps
    if (x >= 10.4 && x <= 13.0) {
      if (z < 12.2 && z >= 11.3) {
        return plinthH * THREE.MathUtils.clamp(1 - (12.2 - z) / 0.9, 0, 1);
      }
      if (z > 22.8 && z <= 23.7) {
        return plinthH * THREE.MathUtils.clamp(1 - (z - 22.8) / 0.9, 0, 1);
      }
    }

    return 0;
  }

  public getZoneAt(x: number, z: number): SchoolZoneId {
    // Village School Classroom interior
    if (z < -1.0 && z >= -9.2 && x >= -10.6 && x <= 1.6) {
      return 'classroom';
    }
    // Separate Garad Granthalay interior
    if (x >= 13.0 && x <= 22.6 && z >= 12.4 && z <= 22.6) {
      return 'library';
    }
    // School Veranda
    if (z >= -1.0 && z <= 2.35 && x >= -11.2 && x <= 2.2) {
      return 'veranda';
    }
    // Library Veranda (still displays Garad Granthalay cleanly)
    if (x >= 9.8 && x < 13.0 && z >= 12.2 && z <= 22.8) {
      return 'library';
    }
    // West School Playground
    if (x < -12.6 && z >= -6.5 && z <= 11.5) {
      return 'playground';
    }
    // School Courtyard
    if (z >= 2.0 && z <= 12.4 && x >= -12.6 && x <= 7.8) {
      return 'courtyard';
    }
    return 'village-street';
  }

  public isIndoors(x: number, z: number): boolean {
    if (z < -1.0 && z >= -9.2 && x >= -10.6 && x <= 1.6) return true;
    if (x >= 13.0 && x <= 22.6 && z >= 12.4 && z <= 22.6) return true;
    return false;
  }

  /**
   * Determines exact physical ground/floor surface for subtle surface-based footsteps:
   * - 'school-floor': Village School classroom interior
   * - 'wood': Garad Granthalay wooden reading floor
   * - 'stone': Stone-paved street sections, Library approach path, School & Library verandas
   * - 'dirt': Winding village dirt road, school courtyard, playground earth
   * - 'grass': Village lawns, roadside grass verges, fields & house yards
   */
  public getSurfaceAt(x: number, z: number): FootstepSurface {
    // Indoors: Village School classroom
    if (z < -1.0 && z >= -9.2 && x >= -10.6 && x <= 1.6) {
      return 'school-floor';
    }
    // Indoors: Garad Granthalay warm wooden reading room floor
    if (x >= 13.0 && x <= 22.6 && z >= 12.4 && z <= 22.6) {
      return 'wood';
    }
    // School front stone veranda & steps
    if (x >= -11.4 && x <= 2.4 && z >= -1.0 && z <= 3.1) {
      return 'stone';
    }
    // Library stone veranda & West steps
    if (x >= 9.3 && x < 13.0 && z >= 12.2 && z <= 22.8) {
      return 'stone';
    }
    // Stone-paved crossing connecting Main Street to Garad Granthalay
    if (z >= 15.5 && z <= 19.6 && x >= -4.8 && x <= 10.6) {
      return 'stone';
    }
    // Stone-paved street sections along Main Street (entrance threshold & mid-street square)
    const roadX = mainStreetCenterX(z);
    const distFromRoad = Math.abs(x - roadX);
    if (distFromRoad <= 3.55) {
      if ((z >= 43.6 && z <= 47.4) || (z >= 28.0 && z <= 31.8)) {
        return 'stone';
      }
      if (z >= 11.5 && z <= 58.5) {
        return 'dirt';
      }
    }
    // School courtyard earth & West playground earth
    if (x >= -12.4 && x <= 7.2 && z >= 2.0 && z <= 12.4) {
      return 'dirt';
    }
    if (x >= -28.0 && x <= -13.0 && z >= -5.2 && z <= 10.2) {
      return 'dirt';
    }
    return 'grass';
  }

  /**
   * Resolves horizontal circle-vs-AABB collision with smooth sliding.
   * Mutates `outPos` (x and z) in place for zero per-frame allocations.
   */
  public resolveHorizontalMovement(
    x: number,
    z: number,
    feetY: number,
    radius: number,
    playerHeight: number,
    outPos: THREE.Vector3,
  ): void {
    let rx = THREE.MathUtils.clamp(x, this.boundsMinX + radius, this.boundsMaxX - radius);
    let rz = THREE.MathUtils.clamp(z, this.boundsMinZ + radius, this.boundsMaxZ - radius);

    // Run 2 relaxation iterations so corners slide cleanly without jitter
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < this.colliders.length; i++) {
        const c = this.colliders[i];
        if (!c.enabled) continue;
        // Skip colliders completely above player's head or below feet
        if (c.minY > feetY + playerHeight - 0.05 || c.maxY < feetY + 0.12) continue;

        const closestX = THREE.MathUtils.clamp(rx, c.minX, c.maxX);
        const closestZ = THREE.MathUtils.clamp(rz, c.minZ, c.maxZ);
        const dx = rx - closestX;
        const dz = rz - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          if (distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const push = radius - dist;
            rx += (dx / dist) * push;
            rz += (dz / dist) * push;
          } else {
            // Center fell inside AABB: push out along shallowest axis
            const penLeft = Math.abs(rx - c.minX);
            const penRight = Math.abs(c.maxX - rx);
            const penFront = Math.abs(rz - c.minZ);
            const penBack = Math.abs(c.maxZ - rz);
            const minPen = Math.min(penLeft, penRight, penFront, penBack);
            if (minPen === penLeft) rx = c.minX - radius;
            else if (minPen === penRight) rx = c.maxX + radius;
            else if (minPen === penFront) rz = c.minZ - radius;
            else rz = c.maxZ + radius;
          }
        }
      }
    }

    outPos.x = THREE.MathUtils.clamp(rx, this.boundsMinX + radius, this.boundsMaxX - radius);
    outPos.z = THREE.MathUtils.clamp(rz, this.boundsMinZ + radius, this.boundsMaxZ - radius);
  }

  /**
   * Single ray-vs-AABB intersection returning normalized fraction `t` in [0.05, 1.0].
   */
  private raycastSingleFraction(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    pad: number,
  ): number {
    const invX = Math.abs(dx) > 1e-6 ? 1 / dx : 1e9;
    const invY = Math.abs(dy) > 1e-6 ? 1 / dy : 1e9;
    const invZ = Math.abs(dz) > 1e-6 ? 1 / dz : 1e9;

    let bestT = 1.0;

    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (!c.enabled || !c.blocksCamera) continue;

      const t1 = (c.minX - pad - ox) * invX;
      const t2 = (c.maxX + pad - ox) * invX;
      const t3 = (c.minY - pad - oy) * invY;
      const t4 = (c.maxY + pad - oy) * invY;
      const t5 = (c.minZ - pad - oz) * invZ;
      const t6 = (c.maxZ + pad - oz) * invZ;

      const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6));
      const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6));

      if (tmax >= 0 && tmin <= tmax && tmin >= 0.015 && tmin < bestT) {
        bestT = tmin;
      }
    }

    return bestT;
  }

  /**
   * Padded multi-feeler camera collision sweep from `origin` (player shoulder/head)
   * to `desiredPos`. Prevents camera near-plane clipping into walls, door jambs,
   * or bookshelves and ensures the camera can never get stuck inside geometry.
   */
  public raycastCameraFraction(origin: THREE.Vector3, desiredPos: THREE.Vector3): number {
    _rayDir.subVectors(desiredPos, origin);
    const totalLen = _rayDir.length();
    if (totalLen < 0.001) return 1;

    const dx = _rayDir.x;
    const dy = _rayDir.y;
    const dz = _rayDir.z;

    // Horizontal perpendicular vector for left/right near-plane feeler rays
    const horizLen = Math.hypot(dx, dz) || 1;
    const perpX = (-dz / horizLen) * 0.16;
    const perpZ = (dx / horizLen) * 0.16;

    const pad = 0.24;
    let bestT = this.raycastSingleFraction(origin.x, origin.y, origin.z, dx, dy, dz, pad);
    const leftT = this.raycastSingleFraction(
      origin.x + perpX,
      origin.y,
      origin.z + perpZ,
      dx,
      dy,
      dz,
      0.16,
    );
    const rightT = this.raycastSingleFraction(
      origin.x - perpX,
      origin.y,
      origin.z - perpZ,
      dx,
      dy,
      dz,
      0.16,
    );
    const upT = this.raycastSingleFraction(
      origin.x,
      origin.y + 0.14,
      origin.z,
      dx,
      dy,
      dz,
      0.16,
    );

    bestT = Math.min(bestT, leftT, rightT, upT);
    return THREE.MathUtils.clamp(bestT, 0.18, 1.0);
  }
}

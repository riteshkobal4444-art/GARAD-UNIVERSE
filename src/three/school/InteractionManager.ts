import * as THREE from 'three';
import type {
  InteractableKind,
  LivingBookId,
  SchoolDiscoveryToast,
  SchoolInteractablePrompt,
} from '../../types/universe';

export interface SchoolInteractable {
  id: string;
  kind: InteractableKind;
  position: THREE.Vector3;
  radius: number;
  discoverable: boolean;
  bookId?: LivingBookId;
  getPrompt: () => SchoolInteractablePrompt;
  onInteract: () => SchoolDiscoveryToast | null;
}

const _toObj = new THREE.Vector3();
const _playerFwd = new THREE.Vector3();

/**
 * Reusable proximity interaction & highlight manager for Mission Bharari School.
 *
 * - Finds the nearest valid interactable within range (with gentle facing bias)
 * - Displays an unobtrusive floating golden 3D ring beacon around the active object
 * - Tracks unique exploration discoveries (books, blackboard, exhibition, sports corner)
 * - Supplies Bharari Companion with the nearest undiscovered landmark in range as a hint
 */
export class InteractionManager {
  public readonly group = new THREE.Group();
  private readonly items: SchoolInteractable[] = [];
  private readonly discoveredIds = new Set<string>();

  private activeItem: SchoolInteractable | null = null;
  private activePrompt: SchoolInteractablePrompt | null = null;

  private readonly highlightRing: THREE.Mesh;
  private readonly highlightGlow: THREE.Mesh;
  private readonly disposables: Array<{ dispose: () => void }> = [];

  constructor() {
    this.group.name = 'SchoolInteractionHighlights';

    const ringGeo = new THREE.RingGeometry(0.28, 0.37, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#EAB948',
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.highlightRing = new THREE.Mesh(ringGeo, ringMat);
    this.highlightRing.rotation.x = -Math.PI / 2;
    this.highlightRing.visible = false;
    this.group.add(this.highlightRing);

    const glowGeo = new THREE.OctahedronGeometry(0.095, 0);
    const glowMat = new THREE.MeshStandardMaterial({
      color: '#F2C75C',
      emissive: '#D88B28',
      emissiveIntensity: 0.36,
      roughness: 0.3,
    });
    this.highlightGlow = new THREE.Mesh(glowGeo, glowMat);
    this.highlightGlow.visible = false;
    this.group.add(this.highlightGlow);

    this.disposables.push(ringGeo, ringMat, glowGeo, glowMat);
  }

  public register(item: SchoolInteractable): void {
    this.items.push(item);
  }

  public getTotalDiscoverables(): number {
    let count = 0;
    for (const item of this.items) {
      if (item.discoverable) count++;
    }
    return count;
  }

  public getDiscoveredIds(): string[] {
    return Array.from(this.discoveredIds);
  }

  public markDiscovered(id: string): boolean {
    if (this.discoveredIds.has(id)) return false;
    this.discoveredIds.add(id);
    return true;
  }

  public getActivePrompt(): SchoolInteractablePrompt | null {
    return this.activePrompt;
  }

  public getActiveInteractable(): SchoolInteractable | null {
    return this.activeItem;
  }

  /**
   * Returns world position of the nearest undiscovered discoverable within `maxDist`
   * so Bharari Companion can gently glance toward it as a subtle non-verbal hint.
   */
  public findNearestUndiscoveredHint(playerPos: THREE.Vector3, maxDist = 7.5): THREE.Vector3 | null {
    let bestPos: THREE.Vector3 | null = null;
    let bestDist = maxDist;
    for (const item of this.items) {
      if (!item.discoverable || this.discoveredIds.has(item.id)) continue;
      const d = item.position.distanceTo(playerPos);
      if (d < bestDist) {
        bestDist = d;
        bestPos = item.position;
      }
    }
    return bestPos;
  }

  public update(
    playerPos: THREE.Vector3,
    playerFacingYaw: number,
    isBookOpen: boolean,
    elapsed: number,
  ): void {
    if (isBookOpen) {
      this.activeItem = null;
      this.activePrompt = null;
      this.highlightRing.visible = false;
      this.highlightGlow.visible = false;
      return;
    }

    _playerFwd.set(Math.sin(playerFacingYaw), 0, Math.cos(playerFacingYaw));

    let bestItem: SchoolInteractable | null = null;
    let bestScore = Infinity;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      _toObj.subVectors(item.position, playerPos);
      const horizDist = Math.hypot(_toObj.x, _toObj.z);
      if (horizDist > item.radius) continue;

      // Slight preference for objects in front of the player
      let facingPenalty = 0;
      if (horizDist > 0.05) {
        const dot = (_toObj.x * _playerFwd.x + _toObj.z * _playerFwd.z) / horizDist;
        facingPenalty = (1 - dot) * 0.55;
      }

      const score = horizDist + facingPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    this.activeItem = bestItem;
    this.activePrompt = bestItem ? bestItem.getPrompt() : null;

    if (bestItem) {
      this.highlightRing.visible = true;
      this.highlightRing.position.set(
        bestItem.position.x,
        Math.max(0.04, bestItem.position.y - 0.02),
        bestItem.position.z,
      );
      const pulse = 1 + Math.sin(elapsed * 4.2) * 0.09;
      this.highlightRing.scale.setScalar(pulse);

      this.highlightGlow.visible = true;
      this.highlightGlow.position.set(
        bestItem.position.x,
        bestItem.position.y + 0.42 + Math.sin(elapsed * 3.4) * 0.06,
        bestItem.position.z,
      );
      this.highlightGlow.rotation.y = elapsed * 2.1;
    } else {
      this.highlightRing.visible = false;
      this.highlightGlow.visible = false;
    }
  }

  public triggerActive(): {
    item: SchoolInteractable;
    toast: SchoolDiscoveryToast | null;
    newlyDiscovered: boolean;
  } | null {
    if (!this.activeItem) return null;
    const item = this.activeItem;
    const toast = item.onInteract();
    const newlyDiscovered = item.discoverable ? this.markDiscovered(item.id) : false;
    // Refresh prompt immediately (e.g. "Open Door" -> "Close Door")
    this.activePrompt = item.getPrompt();
    return { item, toast, newlyDiscovered };
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

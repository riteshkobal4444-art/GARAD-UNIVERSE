import * as THREE from 'three';
import { SANKALP_EXHIBITS } from '../../data/worldPortalsData';
import type { IBharariCharacter, WorldProximityPrompt } from '../../types/universe';
import type { TimeOfDaySystem } from '../environment/timeOfDaySystem';
import type { WindSystem } from '../environment/windSystem';
import type { ProceduralTextureSet } from '../textures';
import type { WorldObstacle } from './FirstPersonExplorerController';

interface CourtyardInteractPoint {
  id: string;
  kind: 'exhibit' | 'return-hub';
  exhibitId?: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  position: THREE.Vector3;
  radius: number;
}

const _vLook = new THREE.Vector3();

function createPavilionSignTexture(title: string, subtitle: string, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFF6E5';
  ctx.fillRect(0, 0, 512, 192);

  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 512, 56);

  ctx.strokeStyle = '#6A3F20';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 184);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('SANKALP  •  STORIES OF CHANGE', 256, 36);

  ctx.fillStyle = '#2A1D13';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(title, 256, 114);

  ctx.fillStyle = '#5F442E';
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText(subtitle, 256, 154);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Compact, sunlit Sankalp Community Courtyard World.
 * Anchored by a central sheltering Neem Tree & circular carved stone gathering plinth,
 * ringed by 5 distinct physical wooden/terracotta Exhibit Pavilions for Garad Foundation's
 * community pillars plus a luminous Return to Central Hub portal.
 */
export class SankalpScene {
  public readonly group = new THREE.Group();

  private readonly obstacles: WorldObstacle[] = [];
  private readonly interactPoints: CourtyardInteractPoint[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  private returnRing!: THREE.Mesh;
  private readonly bharariPerch = new THREE.Vector3(-2.3, 3.1, -0.8);

  constructor(
    sharedTextures: ProceduralTextureSet,
    wind: WindSystem,
    timeOfDay: TimeOfDaySystem,
  ) {
    this.group.name = 'SankalpCommunityCourtyard';
    this.group.visible = false;

    this.buildCourtyardFloorAndWalls(sharedTextures);
    this.buildCentralNeemAndPlinth(sharedTextures, wind, timeOfDay);
    this.buildFiveCommunityPavilions(sharedTextures, timeOfDay);
    this.buildReturnPortal(sharedTextures, timeOfDay);
  }

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  private trackTex<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }

  private buildCourtyardFloorAndWalls(sharedTextures: ProceduralTextureSet): void {
    // Warm weathered sandstone & ochre community courtyard
    const floor = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(18.5, 19.6, 1.2, 48)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          map: sharedTextures.carvedStone,
          color: '#C4AE8E',
          roughness: 0.88,
        }),
      ),
    );
    floor.position.y = -0.6;
    floor.receiveShadow = true;
    this.group.add(floor);

    const meadowRing = new THREE.Mesh(
      this.trackGeo(new THREE.RingGeometry(18.2, 44, 48)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          map: sharedTextures.meadowGrass,
          color: '#5E8045',
          roughness: 0.94,
        }),
      ),
    );
    meadowRing.rotation.x = -Math.PI / 2;
    meadowRing.position.y = -0.02;
    meadowRing.receiveShadow = true;
    this.group.add(meadowRing);

    // Low warm lime-plaster courtyard perimeter wall segments with terracotta coping
    const wallMat = this.trackMat(
      new THREE.MeshStandardMaterial({ map: sharedTextures.warmPlaster, roughness: 0.86 }),
    );
    const capMat = this.trackMat(
      new THREE.MeshStandardMaterial({ map: sharedTextures.terracottaTiles, roughness: 0.8 }),
    );
    const segCount = 24;
    for (let i = 0; i < segCount; i++) {
      const a = (i / segCount) * Math.PI * 2;
      // Keep southern Return Portal entrance open
      if (Math.abs(a - Math.PI / 2) < 0.28) continue;
      const r = 17.6;
      const seg = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(4.4, 1.05, 0.45)), wallMat);
      seg.position.set(Math.cos(a) * r, 0.52, Math.sin(a) * r);
      seg.rotation.y = -a + Math.PI / 2;
      seg.castShadow = true;
      seg.receiveShadow = true;
      this.group.add(seg);

      const cap = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(4.5, 0.14, 0.58)), capMat);
      cap.position.set(Math.cos(a) * r, 1.1, Math.sin(a) * r);
      cap.rotation.y = -a + Math.PI / 2;
      this.group.add(cap);
    }

    // Soft atmospheric Sahyadri horizon peaks
    const hillMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#6E8C82', roughness: 0.95 }),
    );
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const h = 15 + (i % 3) * 5;
      const peak = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(20, h, 7)), hillMat);
      peak.position.set(Math.cos(a) * 66, h * 0.3 - 3, Math.sin(a) * 66);
      this.group.add(peak);
    }
  }

  private buildCentralNeemAndPlinth(
    sharedTextures: ProceduralTextureSet,
    wind: WindSystem,
    timeOfDay: TimeOfDaySystem,
  ): void {
    const stoneMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        color: '#D2BC9E',
        roughness: 0.86,
      }),
    );
    const trunkMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.teakWood,
        color: '#674025',
        roughness: 0.9,
      }),
    );
    const leafMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#3F8245', roughness: 0.82 }),
    );
    wind.applyWindShader(leafMat, {
      swayAmp: 0.1,
      flutterAmp: 0.045,
      heightMin: 2.5,
      heightRange: 4.2,
      cacheKey: 'sankalp-neem',
    });

    // Traditional circular rural Maharashtra "Pār" (tree seating plinth) at courtyard center (0, 0, -0.5)
    const plinth = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(2.65, 2.85, 0.56, 28)),
      stoneMat,
    );
    plinth.position.set(0, 0.28, -0.5);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    this.group.add(plinth);

    const soil = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(1.75, 1.75, 0.6, 20)),
      this.trackMat(new THREE.MeshStandardMaterial({ color: '#6E4F34', roughness: 0.95 })),
    );
    soil.position.set(0, 0.3, -0.5);
    this.group.add(soil);

    // Sculpted central Neem tree trunk + spreading branches + layered shade canopy
    const trunk = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.42, 0.66, 3.6, 10)), trunkMat);
    trunk.position.set(0, 2.15, -0.5);
    trunk.castShadow = true;
    this.group.add(trunk);

    const clusterGeo = this.trackGeo(new THREE.DodecahedronGeometry(1.65, 1));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const br = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 2.2, 8)), trunkMat);
      br.position.set(Math.cos(a) * 0.72, 3.6, -0.5 + Math.sin(a) * 0.72);
      br.rotation.z = -Math.cos(a) * 0.65;
      br.rotation.x = Math.sin(a) * 0.65;
      this.group.add(br);

      const crown = new THREE.Mesh(clusterGeo, leafMat);
      crown.position.set(Math.cos(a) * 1.95, 4.95 + (i % 2) * 0.4, -0.5 + Math.sin(a) * 1.95);
      crown.scale.set(1.25, 0.72, 1.2);
      crown.castShadow = true;
      this.group.add(crown);
    }
    const topCrown = new THREE.Mesh(clusterGeo, leafMat);
    topCrown.position.set(0, 5.85, -0.5);
    topCrown.scale.set(1.45, 0.78, 1.38);
    topCrown.castShadow = true;
    this.group.add(topCrown);

    // Warm brass courtyard lanterns hanging softly beneath the Neem boughs
    const glowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#EFE3C4',
        emissive: '#E3A446',
        emissiveIntensity: 0.18,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: glowMat,
      dayEmissive: 0.16,
      sunsetEmissive: 1.15,
      nightEmissive: 1.95,
    });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const lamp = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.14, 10, 10)), glowMat);
      lamp.position.set(Math.cos(a) * 2.2, 3.65, -0.5 + Math.sin(a) * 2.2);
      this.group.add(lamp);
    }

    // Marigold flowering bed accents around the plinth edge
    const marigoldMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#F39B28', roughness: 0.72 }),
    );
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const fl = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.18, 8, 8)), marigoldMat);
      fl.position.set(Math.cos(a) * 1.65, 0.68, -0.5 + Math.sin(a) * 1.65);
      this.group.add(fl);
    }

    this.obstacles.push({ kind: 'circle', x: 0, z: -0.5, radius: 2.95 });
  }

  private buildFiveCommunityPavilions(
    sharedTextures: ProceduralTextureSet,
    timeOfDay: TimeOfDaySystem,
  ): void {
    const teakMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.teakWood,
        color: '#7B4928',
        roughness: 0.72,
      }),
    );
    const terracottaMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.terracottaTiles,
        bumpMap: sharedTextures.terracottaBump,
        bumpScale: 0.035,
        roughness: 0.8,
      }),
    );
    const plasterMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.warmPlaster,
        roughness: 0.86,
      }),
    );

    // 5 Exhibit Pavilions arranged in a harmonious semicircle around the Neem Tree
    const pavilionConfigs = [
      { idx: 0, x: -9.8, z: 2.8, yaw: 1.25, accent: '#D85A2A' },
      { idx: 1, x: -7.4, z: -7.2, yaw: 0.62, accent: '#B84B6E' },
      { idx: 2, x: 0.0, z: -10.8, yaw: 0.0, accent: '#1D7465' },
      { idx: 3, x: 7.4, z: -7.2, yaw: -0.62, accent: '#2E6FA3' },
      { idx: 4, x: 9.8, z: 2.8, yaw: -1.25, accent: '#C9831E' },
    ];

    const lanternGlow = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#EFE3C4',
        emissive: '#E5A848',
        emissiveIntensity: 0.18,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: lanternGlow,
      dayEmissive: 0.16,
      sunsetEmissive: 1.1,
      nightEmissive: 1.9,
    });

    for (const cfg of pavilionConfigs) {
      const exhibit = SANKALP_EXHIBITS[cfg.idx];
      if (!exhibit) continue;

      const pav = new THREE.Group();
      pav.position.set(cfg.x, 0, cfg.z);
      pav.rotation.y = cfg.yaw;

      // Plinth & 4 carved wooden pavilion posts + pitched terracotta canopy
      const base = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(3.6, 0.24, 2.4)), plasterMat);
      base.position.y = 0.12;
      base.receiveShadow = true;
      base.castShadow = true;
      pav.add(base);

      for (const sx of [-1.55, 1.55]) {
        for (const sz of [-0.95, 0.95]) {
          const post = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.18, 2.75, 0.18)), teakMat);
          post.position.set(sx, 1.5, sz);
          post.castShadow = true;
          pav.add(post);
        }
      }

      const roof = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(2.75, 0.95, 4)), terracottaMat);
      roof.position.set(0, 3.32, 0);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.18, 1, 0.85);
      roof.castShadow = true;
      pav.add(roof);

      // Rear timber display board with clear pavilion title & subtitle
      const backBoard = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(3.0, 1.55, 0.16)), teakMat);
      backBoard.position.set(0, 1.72, -0.78);
      pav.add(backBoard);

      const signTex = this.trackTex(
        createPavilionSignTexture(exhibit.title, exhibit.subtitle, cfg.accent),
      );
      const sign = new THREE.Mesh(
        this.trackGeo(new THREE.PlaneGeometry(2.74, 1.04)),
        this.trackMat(new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 })),
      );
      sign.position.set(0, 1.88, -0.68);
      pav.add(sign);

      // Low front storytelling display table with pillar-specific physical miniature props
      const table = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.7, 0.64, 0.72)), teakMat);
      table.position.set(0, 0.54, 0.22);
      table.castShadow = true;
      pav.add(table);

      const propAccentMat = this.trackMat(
        new THREE.MeshStandardMaterial({ color: cfg.accent, roughness: 0.65 }),
      );
      if (cfg.idx === 0) {
        // Education: stacked books & slate
        for (let b = 0; b < 3; b++) {
          const bk = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.42, 0.09, 0.3)), propAccentMat);
          bk.position.set(-0.32, 0.91 + b * 0.095, 0.22);
          bk.rotation.y = b * 0.18;
          pav.add(bk);
        }
      } else if (cfg.idx === 1) {
        // Women Empowerment: woven terracotta & craft baskets
        const basket = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(0.28, 0.2, 0.26, 12)),
          propAccentMat,
        );
        basket.position.set(0, 0.99, 0.22);
        pav.add(basket);
      } else if (cfg.idx === 2) {
        // Health & Wellbeing: monsoon care umbrella dome & wellness emblem
        const canopy = new THREE.Mesh(
          this.trackGeo(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)),
          propAccentMat,
        );
        canopy.position.set(0, 1.12, 0.22);
        pav.add(canopy);
      } else if (cfg.idx === 3) {
        // Sports & Youth: ball & miniature trophy cone
        const ball = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.18, 12, 12)), propAccentMat);
        ball.position.set(0, 1.04, 0.22);
        pav.add(ball);
      } else {
        // Community Celebrations: warm brass festival diya bowls
        for (const dx of [-0.36, 0, 0.36]) {
          const diya = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.1, 10, 10)), lanternGlow);
          diya.position.set(dx, 0.96, 0.22);
          pav.add(diya);
        }
      }

      // Soft warm eave lantern
      const lamp = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.11, 8, 8)), lanternGlow);
      lamp.position.set(0, 2.75, 0.85);
      pav.add(lamp);

      this.group.add(pav);
      this.obstacles.push({ kind: 'circle', x: cfg.x, z: cfg.z, radius: 1.85 });

      // Front interaction zone facing courtyard center
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cfg.yaw);
      const interactPos = new THREE.Vector3(cfg.x, 0, cfg.z).addScaledVector(fwd, 2.15);
      this.interactPoints.push({
        id: exhibit.id,
        kind: 'exhibit',
        exhibitId: exhibit.id,
        title: exhibit.title,
        subtitle: exhibit.subtitle,
        actionLabel: 'EXPLORE PAVILION',
        position: interactPos,
        radius: 2.9,
      });
    }
  }

  private buildReturnPortal(
    sharedTextures: ProceduralTextureSet,
    timeOfDay: TimeOfDaySystem,
  ): void {
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 13.6);
    portalGroup.rotation.y = Math.PI;
    this.group.add(portalGroup);

    const stoneMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        color: '#D5BFA2',
        roughness: 0.86,
      }),
    );
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.55, 3.6, 0.55)), stoneMat);
      pillar.position.set(side * 1.65, 1.8, 0);
      pillar.castShadow = true;
      portalGroup.add(pillar);
    }
    const lintel = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(4.2, 0.36, 0.68)), stoneMat);
    lintel.position.set(0, 3.72, 0);
    portalGroup.add(lintel);

    const ringMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#7BB89E',
        emissive: '#478C72',
        emissiveIntensity: 0.28,
        roughness: 0.34,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: ringMat,
      dayEmissive: 0.26,
      sunsetEmissive: 0.82,
      nightEmissive: 1.35,
    });

    this.returnRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(1.32, 0.05, 10, 36)),
      ringMat,
    );
    this.returnRing.position.set(0, 1.95, 0);
    portalGroup.add(this.returnRing);

    const veil = new THREE.Mesh(
      this.trackGeo(new THREE.CircleGeometry(1.28, 28)),
      this.trackMat(
        new THREE.MeshBasicMaterial({
          color: '#9ECDBB',
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    veil.position.set(0, 1.95, 0);
    portalGroup.add(veil);

    const signTex = this.trackTex(
      createPavilionSignTexture('CENTRAL HUB', 'Return to The World of Little Dreams', '#1D7465'),
    );
    const sign = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(2.6, 0.86)),
      this.trackMat(new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 })),
    );
    sign.position.set(0, 4.25, 0.36);
    portalGroup.add(sign);

    this.interactPoints.push({
      id: 'return-hub-sankalp',
      kind: 'return-hub',
      title: 'CENTRAL HUB ISLAND',
      subtitle: 'Return to The World of Little Dreams',
      actionLabel: 'RETURN TO CENTRAL HUB',
      position: new THREE.Vector3(0, 0, 12.6),
      radius: 3.1,
    });
  }

  public getSpawn(): { x: number; z: number; yaw: number; pitch: number } {
    return { x: 0, z: 8.4, yaw: Math.PI, pitch: -0.02 };
  }

  public getObstacles(): WorldObstacle[] {
    return this.obstacles;
  }

  public getProximityPrompt(playerPos: THREE.Vector3): WorldProximityPrompt | null {
    let best: CourtyardInteractPoint | null = null;
    let bestDist = Infinity;

    for (const pt of this.interactPoints) {
      const d = Math.hypot(playerPos.x - pt.position.x, playerPos.z - pt.position.z);
      if (d <= pt.radius && d < bestDist) {
        best = pt;
        bestDist = d;
      }
    }

    if (!best) return null;
    return {
      id: best.id,
      kind: best.kind,
      exhibitId: best.exhibitId,
      title: best.title,
      subtitle: best.subtitle,
      actionLabel: best.actionLabel,
    };
  }

  public update(
    delta: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    bharari: IBharariCharacter,
  ): void {
    const dt = Math.min(delta, 0.05);
    this.returnRing.rotation.z = elapsed * 0.45;

    // Bharari hovers peacefully near the Neem tree canopy, watching the visitor explore the pavilions
    bharari.group.position.set(
      this.bharariPerch.x + Math.cos(elapsed * 0.9) * 0.32,
      this.bharariPerch.y + Math.sin(elapsed * 2.2) * 0.12,
      this.bharariPerch.z + Math.sin(elapsed * 0.9) * 0.24,
    );
    const targetYaw = Math.atan2(
      playerPos.x - bharari.group.position.x,
      playerPos.z - bharari.group.position.z,
    );
    bharari.group.rotation.y = THREE.MathUtils.lerp(bharari.group.rotation.y, targetYaw, Math.min(1, dt * 4));
    bharari.group.rotation.x = 0;
    bharari.setBehaviorState('INTRODUCTION');
    bharari.setFlightTelemetry({ speed: 0.24, climbRate: 0, bankAngle: 0, phase: 0.5, isGliding: false });
    _vLook.set(playerPos.x, 1.62, playerPos.z);
    bharari.setLookTarget(_vLook);
  }

  public dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}

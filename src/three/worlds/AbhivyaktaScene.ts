import * as THREE from 'three';
import { ABHIVYAKTA_EXHIBITS } from '../../data/worldPortalsData';
import type { IBharariCharacter, WorldProximityPrompt } from '../../types/universe';
import type { TimeOfDaySystem } from '../environment/timeOfDaySystem';
import type { WindSystem } from '../environment/windSystem';
import type { ProceduralTextureSet } from '../textures';
import type { WorldObstacle } from './FirstPersonExplorerController';

interface AmphitheatreInteractPoint {
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

function createStageBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5E2B14');
  grad.addColorStop(0.5, '#78381A');
  grad.addColorStop(1, '#4C210E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#F2C166';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 996, 228);
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 968, 200);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#F7CA6E';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('GARAD FOUNDATION  •  YOUNG VOICES PLATFORM', 512, 68);

  ctx.fillStyle = '#FFF9EC';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('ABHIVYAKTĀ', 512, 148);

  ctx.fillStyle = '#FADAA0';
  ctx.font = 'italic 30px Georgia, serif';
  ctx.fillText('Where Young Voices Rise', 512, 202);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createInfoPlaqueTexture(heading: string, lines: string[], accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FCF4E3';
  ctx.fillRect(0, 0, 512, 384);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 512, 72);

  ctx.strokeStyle = '#6A3F21';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 376);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(heading, 256, 46);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#2E2118';
  ctx.font = '20px sans-serif';
  lines.forEach((line, idx) => {
    ctx.fillText(line, 30, 120 + idx * 42);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createPhotoPlaceholderTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 288;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#EFE6D5';
  ctx.fillRect(0, 0, 384, 288);

  ctx.strokeStyle = '#B89B74';
  ctx.lineWidth = 6;
  ctx.setLineDash([12, 8]);
  ctx.strokeRect(20, 20, 344, 248);
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7A5B3A';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(label, 192, 134);

  ctx.fillStyle = '#967754';
  ctx.font = 'italic 16px sans-serif';
  ctx.fillText('Photograph awaiting upload', 192, 172);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Compact, atmospheric open-air Abhivyaktā Amphitheatre World.
 * Features curved sandstone audience seating, central wooden speaking stage, podium & mic,
 * overhead spotlights, event info stand, trophy & certificate case, photo gallery wall,
 * and a luminous Return to Central Hub portal.
 */
export class AbhivyaktaScene {
  public readonly group = new THREE.Group();

  private readonly obstacles: WorldObstacle[] = [];
  private readonly interactPoints: AmphitheatreInteractPoint[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  private returnRing!: THREE.Mesh;
  private returnRingMat!: THREE.MeshStandardMaterial;
  private readonly bharariPerch = new THREE.Vector3(3.4, 2.35, -3.6);

  constructor(
    sharedTextures: ProceduralTextureSet,
    wind: WindSystem,
    timeOfDay: TimeOfDaySystem,
  ) {
    this.group.name = 'AbhivyaktaAmphitheatreWorld';
    this.group.visible = false;

    this.buildGroundAndHorizon(sharedTextures);
    this.buildCentralStageAndPodium(sharedTextures, timeOfDay);
    this.buildCurvedSeatingTiers(sharedTextures);
    this.buildInteractiveExhibits(sharedTextures, timeOfDay);
    this.buildReturnPortal(sharedTextures, timeOfDay);
    this.buildFramingTrees(sharedTextures, wind);
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

  private buildGroundAndHorizon(sharedTextures: ProceduralTextureSet): void {
    // Natural warm sandstone amphitheatre courtyard floor
    const floor = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(20, 21.5, 1.2, 48)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          map: sharedTextures.ochrePath,
          color: '#C29F76',
          roughness: 0.9,
        }),
      ),
    );
    floor.position.y = -0.6;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Outer natural green lawn surround
    const outerLawn = new THREE.Mesh(
      this.trackGeo(new THREE.RingGeometry(19.5, 42, 48)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          map: sharedTextures.meadowGrass,
          color: '#5F8245',
          roughness: 0.94,
        }),
      ),
    );
    outerLawn.rotation.x = -Math.PI / 2;
    outerLawn.position.y = -0.02;
    outerLawn.receiveShadow = true;
    this.group.add(outerLawn);

    // Soft atmospheric Sahyadri horizon peaks
    const hillMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#6D8C82', roughness: 0.95 }),
    );
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const h = 14 + (i % 4) * 5;
      const peak = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(18 + (i % 3) * 5, h, 7)), hillMat);
      peak.position.set(Math.cos(a) * 68, h * 0.32 - 3, Math.sin(a) * 68);
      this.group.add(peak);
    }
  }

  private buildCentralStageAndPodium(
    sharedTextures: ProceduralTextureSet,
    timeOfDay: TimeOfDaySystem,
  ): void {
    const stoneMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        color: '#D8C2A2',
        roughness: 0.85,
      }),
    );
    const teakMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.teakWood,
        color: '#7F4D2A',
        roughness: 0.65,
      }),
    );
    const brassMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#E0AC48',
        roughness: 0.3,
        metalness: 0.78,
      }),
    );

    // Elevated semi-circular wooden & sandstone stage at z = -5.6
    const stageBase = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(4.8, 5.15, 0.56, 32)),
      stoneMat,
    );
    stageBase.position.set(0, 0.28, -5.8);
    stageBase.receiveShadow = true;
    stageBase.castShadow = true;
    this.group.add(stageBase);

    const stageDeck = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(4.55, 4.65, 0.14, 32)),
      teakMat,
    );
    stageDeck.position.set(0, 0.62, -5.8);
    stageDeck.receiveShadow = true;
    this.group.add(stageDeck);

    // Front approach steps
    for (let s = 0; s < 2; s++) {
      const step = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(2.6 + s * 0.4, 0.24, 0.42)),
        stoneMat,
      );
      step.position.set(0, 0.12 + (1 - s) * 0.24, -0.65 + s * 0.4);
      step.receiveShadow = true;
      this.group.add(step);
    }

    // Carved teak wooden speaker podium & brass microphone at stage front
    const podium = new THREE.Group();
    podium.position.set(0, 0.69, -4.1);
    const podStand = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.68, 1.12, 0.48)), teakMat);
    podStand.position.y = 0.56;
    podStand.castShadow = true;
    podium.add(podStand);

    const podDesk = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.86, 0.08, 0.58)), teakMat);
    podDesk.position.set(0, 1.14, 0.03);
    podDesk.rotation.x = 0.24;
    podDesk.castShadow = true;
    podium.add(podDesk);

    const micStem = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 8)), brassMat);
    micStem.position.set(0.16, 1.32, 0.08);
    micStem.rotation.x = -0.3;
    podium.add(micStem);

    const micHead = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.045, 10, 10)),
      this.trackMat(new THREE.MeshStandardMaterial({ color: '#33363C', roughness: 0.35, metalness: 0.8 })),
    );
    micHead.position.set(0.16, 1.48, 0.02);
    podium.add(micHead);
    this.group.add(podium);

    // Stage backdrop timber arch + "ABHIVYAKTĀ — Where Young Voices Rise" banner
    for (const side of [-1, 1]) {
      const col = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.46, 4.4, 0.46)), teakMat);
      col.position.set(side * 3.8, 2.8, -8.5);
      col.castShadow = true;
      this.group.add(col);
    }
    const topTruss = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(8.4, 0.38, 0.54)), teakMat);
    topTruss.position.set(0, 5.05, -8.5);
    topTruss.castShadow = true;
    this.group.add(topTruss);

    const bannerTex = this.trackTex(createStageBannerTexture());
    const banner = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(7.2, 1.8)),
      this.trackMat(new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.6 })),
    );
    banner.position.set(0, 3.65, -8.22);
    this.group.add(banner);

    // Overhead warm brass spotlights with controlled warm amber glow
    const lampMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#F2E5C6',
        emissive: '#E5A848',
        emissiveIntensity: 0.35,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: lampMat,
      dayEmissive: 0.32,
      sunsetEmissive: 1.25,
      nightEmissive: 2.0,
    });
    for (const lx of [-2.4, 0, 2.4]) {
      const housing = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.18, 0.36, 12)), brassMat);
      housing.position.set(lx, 4.82, -8.15);
      housing.rotation.x = 0.52;
      this.group.add(housing);

      const bulb = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.1, 10, 10)), lampMat);
      bulb.position.set(lx, 4.66, -8.02);
      this.group.add(bulb);
    }

    // Soft collision around rear stage & podium
    this.obstacles.push({ kind: 'circle', x: 0, z: -5.8, radius: 4.55 });

    const stageExhibit = ABHIVYAKTA_EXHIBITS[0];
    this.interactPoints.push({
      id: stageExhibit.id,
      kind: 'exhibit',
      exhibitId: stageExhibit.id,
      title: stageExhibit.title,
      subtitle: stageExhibit.subtitle,
      actionLabel: 'INSPECT STAGE & PODIUM',
      position: new THREE.Vector3(0, 0, -1.2),
      radius: 3.2,
    });
  }

  private buildCurvedSeatingTiers(sharedTextures: ProceduralTextureSet): void {
    const stoneMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        color: '#CFB999',
        roughness: 0.88,
      }),
    );

    // 3 gentle curved stone audience tiers arranged on the left & right flanks (leaving wide center aisle open!)
    const tiers = [
      { radius: 9.2, y: 0.26, h: 0.52 },
      { radius: 11.1, y: 0.62, h: 0.84 },
      { radius: 13.0, y: 1.0, h: 1.18 },
    ];

    for (const tier of tiers) {
      // Left arc & right arc so central entrance walkway from Return Portal stays wide & open
      const arcAngles: Array<[number, number]> = [
        [0.36, 1.18],
        [Math.PI - 1.18, Math.PI - 0.36],
      ];
      for (const [startA, endA] of arcAngles) {
        const segs = 6;
        for (let i = 0; i < segs; i++) {
          const a = THREE.MathUtils.lerp(startA, endA, (i + 0.5) / segs);
          const bx = Math.cos(a) * tier.radius;
          const bz = Math.sin(a) * tier.radius - 1.5;
          const block = new THREE.Mesh(
            this.trackGeo(new THREE.BoxGeometry(1.75, tier.h, 0.92)),
            stoneMat,
          );
          block.position.set(bx, tier.h * 0.5, bz);
          block.rotation.y = -a + Math.PI / 2;
          block.castShadow = true;
          block.receiveShadow = true;
          this.group.add(block);
        }
      }
    }
  }

  private buildInteractiveExhibits(
    sharedTextures: ProceduralTextureSet,
    timeOfDay: TimeOfDaySystem,
  ): void {
    const teakMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.teakWood,
        color: '#734224',
        roughness: 0.72,
      }),
    );
    const brassMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#E3B04B', roughness: 0.28, metalness: 0.82 }),
    );
    const glassMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#E9F6FA',
        transparent: true,
        opacity: 0.32,
        roughness: 0.12,
        metalness: 0.1,
      }),
    );

    // 1. EVENT INFORMATION STAND (Left of stage front: (-5.8, 0, -1.8))
    const infoGroup = new THREE.Group();
    infoGroup.position.set(-5.8, 0, -1.8);
    infoGroup.rotation.y = 0.55;
    const standPost = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.6, 1.35, 0.22)), teakMat);
    standPost.position.y = 1.25;
    standPost.castShadow = true;
    infoGroup.add(standPost);
    for (const sx of [-0.65, 0.65]) {
      const leg = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.14, 1.4, 0.18)), teakMat);
      leg.position.set(sx, 0.7, 0);
      leg.castShadow = true;
      infoGroup.add(leg);
    }
    const infoTex = this.trackTex(
      createInfoPlaqueTexture(
        'ABHIVYAKTĀ RECORDS',
        [
          '• 2024 & 2025 Expression Activities',
          '• Student Elocution & Speech',
          '• Poetry, Essay & Videography',
          '• 60 Young Voices (Grades 5–10)',
        ],
        '#C97B23',
      ),
    );
    const infoBoard = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(1.44, 1.08)),
      this.trackMat(new THREE.MeshStandardMaterial({ map: infoTex, roughness: 0.55 })),
    );
    infoBoard.position.set(0, 1.32, 0.12);
    infoGroup.add(infoBoard);
    this.group.add(infoGroup);
    this.obstacles.push({ kind: 'circle', x: -5.8, z: -1.8, radius: 0.9 });

    const infoExhibit = ABHIVYAKTA_EXHIBITS[1];
    this.interactPoints.push({
      id: infoExhibit.id,
      kind: 'exhibit',
      exhibitId: infoExhibit.id,
      title: infoExhibit.title,
      subtitle: infoExhibit.subtitle,
      actionLabel: 'READ EVENT RECORDS',
      position: new THREE.Vector3(-5.8, 0, -1.8),
      radius: 2.8,
    });

    // 2. TROPHY & CERTIFICATE DISPLAY CABINET (Right of stage front: (5.8, 0, -1.8))
    const trophyGroup = new THREE.Group();
    trophyGroup.position.set(5.8, 0, -1.8);
    trophyGroup.rotation.y = -0.55;
    const cabinetBase = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.8, 0.92, 0.72)), teakMat);
    cabinetBase.position.y = 0.46;
    cabinetBase.castShadow = true;
    trophyGroup.add(cabinetBase);

    const glassBox = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.68, 0.96, 0.62)), glassMat);
    glassBox.position.y = 1.4;
    trophyGroup.add(glassBox);

    // 3 sculpted brass trophies inside display case
    for (let t = -1; t <= 1; t++) {
      const cupBase = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 10)), teakMat);
      cupBase.position.set(t * 0.48, 0.98, 0);
      trophyGroup.add(cupBase);
      const cupStem = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8)), brassMat);
      cupStem.position.set(t * 0.48, 1.14, 0);
      trophyGroup.add(cupStem);
      const cupBowl = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.14, 0.05, 0.24, 12)), brassMat);
      cupBowl.position.set(t * 0.48, 1.34, 0);
      trophyGroup.add(cupBowl);
    }

    const warmStrip = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#F0E3C4',
        emissive: '#E0A448',
        emissiveIntensity: 0.25,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: warmStrip,
      dayEmissive: 0.22,
      sunsetEmissive: 1.0,
      nightEmissive: 1.65,
    });
    const capTop = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.78, 0.1, 0.7)), teakMat);
    capTop.position.y = 1.92;
    trophyGroup.add(capTop);
    const strip = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.5, 0.04, 0.08)), warmStrip);
    strip.position.set(0, 1.84, 0);
    trophyGroup.add(strip);

    this.group.add(trophyGroup);
    this.obstacles.push({ kind: 'circle', x: 5.8, z: -1.8, radius: 1.0 });

    const trophyExhibit = ABHIVYAKTA_EXHIBITS[2];
    this.interactPoints.push({
      id: trophyExhibit.id,
      kind: 'exhibit',
      exhibitId: trophyExhibit.id,
      title: trophyExhibit.title,
      subtitle: trophyExhibit.subtitle,
      actionLabel: 'INSPECT TROPHIES & HONOURS',
      position: new THREE.Vector3(5.8, 0, -1.8),
      radius: 2.8,
    });

    // 3. CURVED TIMBER PHOTO GALLERY WALL (Left Mid-Courtyard: (-6.4, 0, 4.6))
    const galleryGroup = new THREE.Group();
    galleryGroup.position.set(-6.4, 0, 4.6);
    galleryGroup.rotation.y = 1.1;

    const wallBack = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(4.2, 2.35, 0.24)), teakMat);
    wallBack.position.y = 1.25;
    wallBack.castShadow = true;
    galleryGroup.add(wallBack);

    const frameLabels = ['Young Voices Stage', 'Abhivyaktā 2024', 'Abhivyaktā 2025'];
    for (let f = 0; f < 3; f++) {
      const fx = (f - 1) * 1.28;
      const tex = this.trackTex(createPhotoPlaceholderTexture(frameLabels[f]));
      const frame = new THREE.Mesh(
        this.trackGeo(new THREE.PlaneGeometry(1.08, 0.82)),
        this.trackMat(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 })),
      );
      frame.position.set(fx, 1.48, 0.14);
      galleryGroup.add(frame);
    }

    this.group.add(galleryGroup);
    this.obstacles.push({ kind: 'circle', x: -6.4, z: 4.6, radius: 1.65 });

    const photoExhibit = ABHIVYAKTA_EXHIBITS[3];
    this.interactPoints.push({
      id: photoExhibit.id,
      kind: 'exhibit',
      exhibitId: photoExhibit.id,
      title: photoExhibit.title,
      subtitle: photoExhibit.subtitle,
      actionLabel: 'VIEW PHOTO GALLERY',
      position: new THREE.Vector3(-6.4, 0, 4.6),
      radius: 3.1,
    });
  }

  private buildReturnPortal(
    sharedTextures: ProceduralTextureSet,
    timeOfDay: TimeOfDaySystem,
  ): void {
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, 12.2);
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

    this.returnRingMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#E5BE6C',
        emissive: '#CF963A',
        emissiveIntensity: 0.3,
        roughness: 0.34,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: this.returnRingMat,
      dayEmissive: 0.28,
      sunsetEmissive: 0.85,
      nightEmissive: 1.4,
    });

    this.returnRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(1.32, 0.05, 10, 36)),
      this.returnRingMat,
    );
    this.returnRing.position.set(0, 1.95, 0);
    portalGroup.add(this.returnRing);

    const veil = new THREE.Mesh(
      this.trackGeo(new THREE.CircleGeometry(1.28, 28)),
      this.trackMat(
        new THREE.MeshBasicMaterial({
          color: '#E8C27A',
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
      createInfoPlaqueTexture('RETURN TO CENTRAL HUB', ['Step through to revisit', 'The World of Little Dreams'], '#24586A'),
    );
    const sign = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(2.6, 0.72)),
      this.trackMat(new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 })),
    );
    sign.position.set(0, 4.18, 0.36);
    portalGroup.add(sign);

    this.interactPoints.push({
      id: 'return-hub-abhivyakta',
      kind: 'return-hub',
      title: 'CENTRAL HUB ISLAND',
      subtitle: 'Return to The World of Little Dreams',
      actionLabel: 'RETURN TO CENTRAL HUB',
      position: new THREE.Vector3(0, 0, 11.4),
      radius: 3.0,
    });
  }

  private buildFramingTrees(sharedTextures: ProceduralTextureSet, wind: WindSystem): void {
    const trunkMat = this.trackMat(
      new THREE.MeshStandardMaterial({ map: sharedTextures.teakWood, color: '#684126', roughness: 0.9 }),
    );
    const leafMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#458446', roughness: 0.84 }),
    );
    wind.applyWindShader(leafMat, {
      swayAmp: 0.1,
      flutterAmp: 0.04,
      heightMin: 2.0,
      heightRange: 4.5,
      cacheKey: 'abhi-tree',
    });

    const spots: Array<[number, number]> = [
      [-13.5, -8.5],
      [13.5, -8.5],
      [-14.8, 3.2],
      [14.8, 3.2],
      [-9.5, 13.0],
      [9.5, 13.0],
    ];
    const trunkGeo = this.trackGeo(new THREE.CylinderGeometry(0.24, 0.4, 3.3, 8));
    const crownGeo = this.trackGeo(new THREE.DodecahedronGeometry(1.5, 1));
    for (const [x, z] of spots) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const t = new THREE.Mesh(trunkGeo, trunkMat);
      t.position.y = 1.65;
      t.castShadow = true;
      g.add(t);
      const c = new THREE.Mesh(crownGeo, leafMat);
      c.position.y = 3.85;
      c.scale.set(1.3, 0.85, 1.2);
      c.castShadow = true;
      g.add(c);
      this.group.add(g);
    }
  }

  public getSpawn(): { x: number; z: number; yaw: number; pitch: number } {
    return { x: 0, z: 7.4, yaw: Math.PI, pitch: -0.02 };
  }

  public getObstacles(): WorldObstacle[] {
    return this.obstacles;
  }

  public getProximityPrompt(playerPos: THREE.Vector3): WorldProximityPrompt | null {
    let best: AmphitheatreInteractPoint | null = null;
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

    // Bharari hovers gently beside the Abhivyaktā stage, warmly watching the visitor explore
    bharari.group.position.set(
      this.bharariPerch.x + Math.sin(elapsed * 1.1) * 0.24,
      this.bharariPerch.y + Math.sin(elapsed * 2.4) * 0.1,
      this.bharariPerch.z,
    );
    const targetYaw = Math.atan2(
      playerPos.x - bharari.group.position.x,
      playerPos.z - bharari.group.position.z,
    );
    bharari.group.rotation.y = THREE.MathUtils.lerp(bharari.group.rotation.y, targetYaw, Math.min(1, dt * 4));
    bharari.group.rotation.x = 0;
    bharari.setBehaviorState('INTRODUCTION');
    bharari.setFlightTelemetry({ speed: 0.25, climbRate: 0, bankAngle: 0, phase: 0.5, isGliding: false });
    _vLook.set(playerPos.x, 1.62, playerPos.z);
    bharari.setLookTarget(_vLook);
  }

  public dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}

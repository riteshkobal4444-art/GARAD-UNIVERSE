import * as THREE from 'three';
import type { TimeOfDaySystem } from '../environment/timeOfDaySystem';
import type { WindSystem } from '../environment/windSystem';
import type { ProceduralTextureSet } from '../textures';
import type { CompanionPerch } from './BharariCompanion';
import { mainStreetCenterX, type SchoolCollisionWorld } from './SchoolCollisionAndZones';
import { buildVillageWelcomeSign } from './buildVillageWelcomeSign';

export interface VillageMainStreetResult {
  group: THREE.Group;
  perches: CompanionPerch[];
  update: (delta: number, elapsed: number, nightWeight: number) => void;
  dispose: () => void;
}

interface StreetButterfly {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  cx: number;
  cz: number;
  radius: number;
  baseY: number;
  speed: number;
  phase: number;
  flapRate: number;
}

interface DistantBird {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  alt: number;
  speed: number;
  phase: number;
  flapRate: number;
}

interface SwayBranch {
  mesh: THREE.Object3D;
  baseRotZ: number;
  baseRotX: number;
  phase: number;
  amp: number;
}

/**
 * Handcrafted carved teak-and-plaster Village Entrance Signboard:
 *   MISSION BHARARI
 *   A World of Learning and Dreams
 * Warm, grounded, readable, and naturally integrated into the entrance road.
 */
function createVillageEntranceSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Rich natural teak-stained timber panel background
  const grad = ctx.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, '#5A3620');
  grad.addColorStop(0.5, '#4A2B18');
  grad.addColorStop(1, '#3D2212');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 320);

  // Subtle horizontal wood grain streaks
  for (let y = 0; y < 320; y += 4) {
    const alpha = 0.04 + (Math.sin(y * 0.17) * 0.5 + 0.5) * 0.04;
    ctx.fillStyle = y % 8 === 0 ? `rgba(255,220,175,${alpha})` : `rgba(25,12,5,${alpha})`;
    ctx.fillRect(0, y, 1024, 2);
  }

  // Warm cream & terracotta inset border trim
  ctx.strokeStyle = '#DFC398';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 984, 280);
  ctx.strokeStyle = 'rgba(214, 128, 66, 0.72)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, 960, 256);

  // Simple corner floral diamonds (quiet rural craft detail)
  ctx.fillStyle = '#E5B96F';
  const corners = [
    [52, 52],
    [972, 52],
    [52, 268],
    [972, 268],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fill();
  }

  // Main carved typography: MISSION BHARARI
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20, 10, 4, 0.45)';
  ctx.font = 'bold 78px Georgia, serif';
  ctx.fillText('MISSION BHARARI', 514, 134);

  ctx.fillStyle = '#FAF0DC';
  ctx.fillText('MISSION BHARARI', 512, 131);

  // Subtle terracotta divider rule
  ctx.fillStyle = '#D98E4B';
  ctx.fillRect(362, 186, 300, 3);

  // Smaller warm subtitle
  ctx.fillStyle = '#EAD2AA';
  ctx.font = 'italic 33px Georgia, serif';
  ctx.fillText('A World of Learning and Dreams', 512, 232);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Builds the Mission Bharari Rural Maharashtra Village Main Street & Surrounding Countryside:
 * - Gently winding compacted dirt road + 3 natural stone-paved sections
 * - Physical timber & stone village entrance sign ("MISSION BHARARI")
 * - 6 traditional rural Maharashtra houses (plastered walls, terracotta tiled roofs,
 *   wooden doors & shuttered windows, small verandas, boundary walls, tulsi pots & flowering shrubs)
 * - Shady Neem, Mango, and Banyan trees with wind-swaying foliage & subtle swaying branches
 * - Wooden resting benches, circular stone tree platform (par), rustic village well (vihir)
 * - Instanced roadside grass tufts, distant cultivated green fields, and multi-layered Sahyadri hills
 * - Subtle living wildlife: distant soaring birds and occasional garden butterflies
 * - Balanced natural daylight materials (zero neon colors, zero excessive bloom or glow)
 */
export function buildVillageMainStreet(
  textures: ProceduralTextureSet,
  wind: WindSystem,
  timeOfDay: TimeOfDaySystem,
  collisionWorld: SchoolCollisionWorld,
): VillageMainStreetResult {
  const group = new THREE.Group();
  group.name = 'MissionBharariVillageMainStreet';

  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposables.push(t);
    return t;
  };

  const perches: CompanionPerch[] = [];
  const butterflies: StreetButterfly[] = [];
  const birds: DistantBird[] = [];
  const swayBranches: SwayBranch[] = [];

  // ============================================================================
  // SHARED NATURAL DAYLIGHT MATERIALS (CALM RURAL MAHARASHTRA PALETTE)
  // ============================================================================
  const dirtRoadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#C79E73',
      map: textures.ochrePath,
      roughness: 0.96,
      metalness: 0.0,
    }),
  );
  const stonePavingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#B8A894',
      map: textures.carvedStone,
      roughness: 0.89,
      metalness: 0.02,
    }),
  );
  const darkStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#8D8172',
      map: textures.carvedStone,
      roughness: 0.92,
    }),
  );
  const terracottaRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#B75231',
      map: textures.terracottaTiles,
      bumpMap: textures.terracottaBump,
      bumpScale: 0.08,
      roughness: 0.82,
      side: THREE.DoubleSide,
    }),
  );
  const agedRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#9F4D32',
      map: textures.terracottaTiles,
      bumpMap: textures.terracottaBump,
      bumpScale: 0.07,
      roughness: 0.86,
      side: THREE.DoubleSide,
    }),
  );
  const teakMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#734729',
      map: textures.teakWood,
      roughness: 0.78,
    }),
  );
  const darkTeakMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#4F2E19',
      map: textures.teakWood,
      roughness: 0.82,
    }),
  );
  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#5C402B',
      roughness: 0.94,
    }),
  );
  const boundaryWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#E2D0B6',
      map: textures.warmPlaster,
      roughness: 0.92,
    }),
  );
  const terracottaTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#B55736',
      roughness: 0.88,
    }),
  );
  const greenShutterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#2F6354',
      roughness: 0.76,
    }),
  );
  const indigoShutterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#345573',
      roughness: 0.76,
    }),
  );
  const clayPotMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#B55B37',
      roughness: 0.84,
    }),
  );

  // Subtle evening window glow material (quiet in daylight, warm lantern feel at sunset/night)
  const houseWindowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#4A5C66',
      emissive: '#F2B866',
      emissiveIntensity: 0.06,
      roughness: 0.28,
      metalness: 0.08,
    }),
  );
  timeOfDay.registerWarmGlow({
    material: houseWindowMat,
    dayEmissive: 0.05,
    sunsetEmissive: 0.65,
    nightEmissive: 1.25,
  });

  // Deep natural foliage materials with subtle wind sway
  const foliageDeepMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#3E6B33',
      roughness: 0.86,
    }),
  );
  wind.applyWindShader(foliageDeepMat, {
    swayAmp: 0.13,
    flutterAmp: 0.035,
    heightMin: -1.0,
    heightRange: 2.2,
    cacheKey: 'village-street-foliage-deep',
  });

  const foliageMidMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#4F7E3B',
      roughness: 0.85,
    }),
  );
  wind.applyWindShader(foliageMidMat, {
    swayAmp: 0.15,
    flutterAmp: 0.04,
    heightMin: -1.0,
    heightRange: 2.2,
    cacheKey: 'village-street-foliage-mid',
  });

  const foliageWarmMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#5F8B42',
      roughness: 0.84,
    }),
  );
  wind.applyWindShader(foliageWarmMat, {
    swayAmp: 0.16,
    flutterAmp: 0.045,
    heightMin: -1.0,
    heightRange: 2.2,
    cacheKey: 'village-street-foliage-warm',
  });

  const bushMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#457336',
      roughness: 0.88,
    }),
  );
  wind.applyWindShader(bushMat, {
    swayAmp: 0.06,
    flutterAmp: 0.025,
    heightMin: 0.0,
    heightRange: 1.1,
    cacheKey: 'village-street-bush',
  });

  // ============================================================================
  // 1. GENTLY WINDING VILLAGE MAIN DIRT ROAD & STONE-PAVED SECTIONS
  // ============================================================================
  const buildWindingRoadRibbon = () => {
    const zStart = 64;
    const zEnd = 11.2;
    const segments = 56;
    const halfWidth = 3.45;
    const positions = new Float32Array((segments + 1) * 2 * 3);
    const uvs = new Float32Array((segments + 1) * 2 * 2);
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const z = THREE.MathUtils.lerp(zStart, zEnd, t);
      const cx = mainStreetCenterX(z);
      // Slight organic width breathing along village lane
      const w = halfWidth + Math.sin(t * Math.PI * 3.0) * 0.25 + (z < 16 ? (16 - z) * 0.22 : 0);

      const vi = i * 2;
      positions[vi * 3] = cx - w;
      positions[vi * 3 + 1] = 0.012;
      positions[vi * 3 + 2] = z;

      positions[(vi + 1) * 3] = cx + w;
      positions[(vi + 1) * 3 + 1] = 0.012;
      positions[(vi + 1) * 3 + 2] = z;

      uvs[vi * 2] = 0;
      uvs[vi * 2 + 1] = t * 9.0;
      uvs[(vi + 1) * 2] = 1;
      uvs[(vi + 1) * 2 + 1] = t * 9.0;

      if (i < segments) {
        const a = vi;
        const b = vi + 1;
        const c = vi + 2;
        const d = vi + 3;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, dirtRoadMat);
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  buildWindingRoadRibbon();

  // Natural stone-paved sections along the street (entrance, mid-street square, school-to-library crossing)
  const addStonePavedPatch = (cx: number, cz: number, w: number, d: number, rotY = 0) => {
    const patch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, 0.032, d)), stonePavingMat);
    patch.position.set(cx, 0.016, cz);
    patch.rotation.y = rotY;
    patch.receiveShadow = true;
    group.add(patch);

    // Subtle stone curb edging on left & right flanks
    const curbGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.06, d));
    const leftCurb = new THREE.Mesh(curbGeo, darkStoneMat);
    leftCurb.position.set(cx - w * 0.5 - 0.08, 0.03, cz);
    leftCurb.rotation.y = rotY;
    const rightCurb = new THREE.Mesh(curbGeo, darkStoneMat);
    rightCurb.position.set(cx + w * 0.5 + 0.08, 0.03, cz);
    rightCurb.rotation.y = rotY;
    group.add(leftCurb, rightCurb);
  };

  // Entrance stone threshold right under the Mission Bharari sign
  addStonePavedPatch(0, 45.5, 6.8, 3.6, 0);
  // Mid-street stone-paved resting crossing
  addStonePavedPatch(mainStreetCenterX(29.8), 29.8, 6.9, 3.8, -0.06);
  // Stone-paved crossing linking School approach directly to Garad Granthalay veranda steps!
  const libCrossing = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(15.2, 0.034, 3.8)),
    stonePavingMat,
  );
  libCrossing.position.set(2.8, 0.017, 17.5);
  libCrossing.receiveShadow = true;
  group.add(libCrossing);

  // Subtle scattered stepping flagstones leading from Main Street to House porches
  const flagGeo = trackGeo(new THREE.CylinderGeometry(0.46, 0.52, 0.04, 7));
  const addSteppingStones = (x0: number, z0: number, x1: number, z1: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      const s = new THREE.Mesh(flagGeo, stonePavingMat);
      s.position.set(
        THREE.MathUtils.lerp(x0, x1, u) + Math.sin(i * 2.1) * 0.14,
        0.02,
        THREE.MathUtils.lerp(z0, z1, u),
      );
      s.rotation.y = i * 0.8;
      s.scale.set(1.15, 1, 0.85);
      s.receiveShadow = true;
      group.add(s);
    }
  };
  addSteppingStones(-3.6, 40.8, -7.2, 40.8, 4);
  addSteppingStones(3.6, 41.2, 7.2, 41.2, 4);
  addSteppingStones(-2.5, 28.5, -7.8, 28.5, 4);
  addSteppingStones(4.6, 31.0, 9.2, 31.0, 4);

  // ============================================================================
  // 2. PHYSICAL VILLAGE ENTRANCE SIGN: "MISSION BHARARI" (AT Z = 45.5)
  // ============================================================================
  const buildVillageEntranceSign = () => {
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 0, 45.5);
    group.add(signGroup);

    const pillarOffsetX = 4.35;
    const stonePlinthGeo = trackGeo(new THREE.BoxGeometry(0.92, 1.05, 0.92));
    const stoneCapGeo = trackGeo(new THREE.BoxGeometry(1.06, 0.14, 1.06));
    const timberPostGeo = trackGeo(new THREE.BoxGeometry(0.32, 3.15, 0.32));
    const braceGeo = trackGeo(new THREE.BoxGeometry(0.16, 1.15, 0.16));

    for (const side of [-1, 1]) {
      const px = side * pillarOffsetX;

      // Grounded rustic stone base
      const plinth = new THREE.Mesh(stonePlinthGeo, darkStoneMat);
      plinth.position.set(px, 0.525, 0);
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      signGroup.add(plinth);

      const cap = new THREE.Mesh(stoneCapGeo, stonePavingMat);
      cap.position.set(px, 1.1, 0);
      cap.castShadow = true;
      signGroup.add(cap);

      // Vertical carved teak post rising from stone base
      const post = new THREE.Mesh(timberPostGeo, teakMat);
      post.position.set(px, 2.7, 0);
      post.castShadow = true;
      signGroup.add(post);

      // Angled timber corbel brace supporting overhead beam
      const brace = new THREE.Mesh(braceGeo, darkTeakMat);
      brace.position.set(px - side * 0.42, 3.55, 0);
      brace.rotation.z = side * 0.68;
      signGroup.add(brace);

      // Small terracotta planter beside each stone base
      const pot = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28, 0.2, 0.38, 10)),
        clayPotMat,
      );
      pot.position.set(px + side * 0.72, 0.19, 0.22);
      pot.castShadow = true;
      signGroup.add(pot);

      const shrub = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.32, 0)), bushMat);
      shrub.position.set(px + side * 0.72, 0.52, 0.22);
      signGroup.add(shrub);

      collisionWorld.addCenterCollider(
        `entrance-pillar-${side < 0 ? 'w' : 'e'}`,
        px,
        1.8,
        45.5,
        1.1,
        3.8,
        1.1,
        true,
      );
    }

    // Overhead carved teak lintel beam & gentle pitched terracotta rain-hood
    const mainBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.6, 0.28, 0.36)), darkTeakMat);
    mainBeam.position.set(0, 4.18, 0);
    mainBeam.castShadow = true;
    signGroup.add(mainBeam);

    const hoodNorth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.8, 0.12, 0.76)),
      terracottaRoofMat,
    );
    hoodNorth.position.set(0, 5.26, -0.26);
    hoodNorth.rotation.x = -0.36;
    hoodNorth.castShadow = true;
    const hoodSouth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.8, 0.12, 0.76)),
      terracottaRoofMat,
    );
    hoodSouth.position.set(0, 5.26, 0.26);
    hoodSouth.rotation.x = 0.36;
    hoodSouth.castShadow = true;
    const ridgeCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 6.9, 8)),
      terracottaRoofMat,
    );
    ridgeCap.rotation.z = Math.PI / 2;
    ridgeCap.position.set(0, 5.42, 0);
    signGroup.add(hoodNorth, hoodSouth, ridgeCap);

    // Double-sided readable signboard ("MISSION BHARARI / A World of Learning and Dreams")
    const signTex = trackTex(createVillageEntranceSignTexture());
    const signFaceMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: signTex,
        roughness: 0.68,
      }),
    );
    const boardBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.6, 1.56, 0.16)), darkTeakMat);
    boardBody.position.set(0, 4.46, 0);
    boardBody.castShadow = true;
    signGroup.add(boardBody);

    const faceGeo = trackGeo(new THREE.PlaneGeometry(5.42, 1.42));
    const southFace = new THREE.Mesh(faceGeo, signFaceMat);
    southFace.position.set(0, 4.46, 0.086);
    const northFace = new THREE.Mesh(faceGeo, signFaceMat);
    northFace.position.set(0, 4.46, -0.086);
    northFace.rotation.y = Math.PI;
    signGroup.add(southFace, northFace);

    // Perch for Bharari on the East stone-and-timber entrance post
    perches.push({
      id: 'perch-village-entrance',
      zone: 'village-street',
      position: new THREE.Vector3(4.35, 1.24, 45.95),
    });
  };
  buildVillageEntranceSign();

  // Physical Mission Bharari Identity & Welcome Point along the arrival street
  const welcomeSign = buildVillageWelcomeSign(
    textures,
    {
      teakMat,
      darkTeakMat,
      stonePavingMat,
      darkStoneMat,
      terracottaRoofMat,
    },
    collisionWorld,
  );
  group.add(welcomeSign.group);
  disposables.push({ dispose: welcomeSign.dispose });

  // ============================================================================
  // 3. TRADITIONAL RURAL MAHARASHTRA HOUSES (COMPOSITE MULTI-PART GROUPS)
  // ============================================================================
  interface HouseSpec {
    id: string;
    x: number;
    z: number;
    rotY: number; // +Math.PI/2 faces East, -Math.PI/2 faces West
    width: number; // along house local X
    depth: number; // along house local Z
    wallHeight: number;
    wallHex: string;
    dadoHex: string;
    useIndigoShutters: boolean;
    useAgedRoof: boolean;
    hasCourtyardWall: boolean;
  }

  const houseSpecs: HouseSpec[] = [
    {
      id: 'house-w1',
      x: -11.4,
      z: 40.5,
      rotY: Math.PI / 2,
      width: 6.4,
      depth: 5.4,
      wallHeight: 3.1,
      wallHex: '#F3E5CE',
      dadoHex: '#B65836',
      useIndigoShutters: false,
      useAgedRoof: false,
      hasCourtyardWall: true,
    },
    {
      id: 'house-e1',
      x: 11.4,
      z: 41.2,
      rotY: -Math.PI / 2,
      width: 6.8,
      depth: 5.2,
      wallHeight: 3.05,
      wallHex: '#ECD8BC',
      dadoHex: '#A6543A',
      useIndigoShutters: true,
      useAgedRoof: true,
      hasCourtyardWall: true,
    },
    {
      id: 'house-w2',
      x: -12.6,
      z: 28.4,
      rotY: Math.PI / 2 + 0.08,
      width: 7.2,
      depth: 5.6,
      wallHeight: 3.2,
      wallHex: '#F0E1C9',
      dadoHex: '#9E5338',
      useIndigoShutters: true,
      useAgedRoof: false,
      hasCourtyardWall: true,
    },
    {
      id: 'house-e2',
      x: 14.4,
      z: 31.2,
      rotY: -Math.PI / 2 - 0.06,
      width: 6.6,
      depth: 5.4,
      wallHeight: 3.05,
      wallHex: '#E9D6BA',
      dadoHex: '#B25E3B',
      useIndigoShutters: false,
      useAgedRoof: true,
      hasCourtyardWall: true,
    },
    {
      id: 'house-w3',
      x: -14.2,
      z: 17.6,
      rotY: Math.PI / 2 - 0.08,
      width: 6.2,
      depth: 5.2,
      wallHeight: 3.0,
      wallHex: '#F4E7D2',
      dadoHex: '#A95234',
      useIndigoShutters: false,
      useAgedRoof: false,
      hasCourtyardWall: false,
    },
    {
      id: 'house-e3',
      x: 17.8,
      z: 2.2,
      rotY: -Math.PI * 0.72,
      width: 6.6,
      depth: 5.2,
      wallHeight: 3.05,
      wallHex: '#EFE0C6',
      dadoHex: '#A75639',
      useIndigoShutters: true,
      useAgedRoof: true,
      hasCourtyardWall: false,
    },
  ];

  const flowerColors = ['#D96C34', '#E0A13B', '#C95B6B', '#F0E4C8'];
  const flowerMats = flowerColors.map((hex) =>
    trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8 })),
  );

  const buildTraditionalHouse = (spec: HouseSpec, idx: number) => {
    const hg = new THREE.Group();
    hg.position.set(spec.x, 0, spec.z);
    hg.rotation.y = spec.rotY;
    group.add(hg);

    const plinthH = 0.34;
    const { width: w, depth: d, wallHeight: h } = spec;
    const verandaD = 1.65;

    const wallMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: spec.wallHex,
        map: textures.warmPlaster,
        bumpMap: textures.plasterBump,
        bumpScale: 0.025,
        roughness: 0.9,
      }),
    );
    const dadoMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: spec.dadoHex,
        roughness: 0.88,
      }),
    );
    const shutterMat = spec.useIndigoShutters ? indigoShutterMat : greenShutterMat;
    const roofMat = spec.useAgedRoof ? agedRoofMat : terracottaRoofMat;

    // 1. Stone foundation plinth + raised front veranda (ota)
    const plinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w + 0.4, plinthH, d + verandaD + 0.3)),
      stonePavingMat,
    );
    plinth.position.set(0, plinthH * 0.5, verandaD * 0.5);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    hg.add(plinth);

    // Front veranda stone step
    const step = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.16, 0.52)), darkStoneMat);
    step.position.set(0, 0.08, d * 0.5 + verandaD + 0.32);
    step.receiveShadow = true;
    hg.add(step);

    // 2. Main plastered house body + traditional terracotta lower dado band
    const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), wallMat);
    body.position.set(0, plinthH + h * 0.5, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    hg.add(body);

    const dado = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w + 0.04, 0.72, d + 0.04)), dadoMat);
    dado.position.set(0, plinthH + 0.36, 0);
    hg.add(dado);

    // 3. Pitched Mangalore terracotta tiled roof overhanging front veranda
    const roofOverhangX = w + 1.15;
    const frontSlopeLen = d * 0.55 + verandaD + 0.75;
    const backSlopeLen = d * 0.58 + 0.55;
    const ridgeY = plinthH + h + 1.55;
    const ridgeZ = -0.15;

    const frontSlope = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(roofOverhangX, 0.14, frontSlopeLen)),
      roofMat,
    );
    frontSlope.position.set(0, ridgeY - frontSlopeLen * 0.19, ridgeZ + frontSlopeLen * 0.44);
    frontSlope.rotation.x = 0.39;
    frontSlope.castShadow = true;
    hg.add(frontSlope);

    const backSlope = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(roofOverhangX, 0.14, backSlopeLen)),
      roofMat,
    );
    backSlope.position.set(0, ridgeY - backSlopeLen * 0.19, ridgeZ - backSlopeLen * 0.44);
    backSlope.rotation.x = -0.39;
    backSlope.castShadow = true;
    hg.add(backSlope);

    const ridge = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.13, 0.13, roofOverhangX + 0.16, 8)),
      roofMat,
    );
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set(0, ridgeY + 0.04, ridgeZ);
    hg.add(ridge);

    // Gable wall triangles closing left & right roof ends
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-d * 0.5, 0);
    gableShape.lineTo(d * 0.5, 0);
    gableShape.lineTo(0, 1.58);
    gableShape.closePath();
    const gableGeo = trackGeo(new THREE.ExtrudeGeometry(gableShape, { depth: 0.24, bevelEnabled: false }));
    const leftGable = new THREE.Mesh(gableGeo, wallMat);
    leftGable.rotation.y = Math.PI / 2;
    leftGable.position.set(-w * 0.5, plinthH + h - 0.02, 0);
    const rightGable = new THREE.Mesh(gableGeo, wallMat);
    rightGable.rotation.y = Math.PI / 2;
    rightGable.position.set(w * 0.5 - 0.24, plinthH + h - 0.02, 0);
    hg.add(leftGable, rightGable);

    // 4. Veranda teak pillars & eaves beam
    const postCount = 4;
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.1, h - 0.42, 8));
    const postZ = d * 0.5 + verandaD - 0.12;
    for (let p = 0; p < postCount; p++) {
      const px = THREE.MathUtils.lerp(-w * 0.45, w * 0.45, p / (postCount - 1));
      const post = new THREE.Mesh(postGeo, teakMat);
      post.position.set(px, plinthH + (h - 0.42) * 0.5, postZ);
      post.castShadow = true;
      hg.add(post);
    }
    const eavesBeam = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w + 0.2, 0.16, 0.18)),
      darkTeakMat,
    );
    eavesBeam.position.set(0, plinthH + h - 0.42, postZ);
    hg.add(eavesBeam);

    // 5. Carved wooden front door + flanking louvered wooden windows
    const doorFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.26, 2.08, 0.14)), darkTeakMat);
    doorFrame.position.set(0, plinthH + 1.04, d * 0.5 + 0.02);
    const doorLeaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.06, 1.94, 0.12)), teakMat);
    doorLeaf.position.set(0, plinthH + 0.99, d * 0.5 + 0.05);
    hg.add(doorFrame, doorLeaf);

    const addHouseWindow = (wx: number, wz: number, rotY: number) => {
      const wg = new THREE.Group();
      wg.position.set(wx, plinthH + 1.52, wz);
      wg.rotation.y = rotY;
      const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.02, 1.08, 0.12)), darkTeakMat);
      const glass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.84, 0.9, 0.14)), houseWindowMat);
      const sill = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.12, 0.08, 0.2)), stonePavingMat);
      sill.position.y = -0.56;
      const lShut = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.96, 0.05)), shutterMat);
      lShut.position.set(-0.68, 0, 0.08);
      lShut.rotation.y = 0.26;
      const rShut = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.96, 0.05)), shutterMat);
      rShut.position.set(0.68, 0, 0.08);
      rShut.rotation.y = -0.26;
      wg.add(frame, glass, sill, lShut, rShut);
      hg.add(wg);
    };
    addHouseWindow(-w * 0.28, d * 0.5 + 0.02, 0);
    addHouseWindow(w * 0.28, d * 0.5 + 0.02, 0);
    addHouseWindow(w * 0.5 + 0.02, 0, Math.PI / 2);
    addHouseWindow(-w * 0.5 - 0.02, 0, -Math.PI / 2);

    // 6. Small rural front courtyard details: Tulsi Vrindavan / clay pots / flowering shrubs
    const tulsiBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.66, 0.62)), boundaryWallMat);
    tulsiBase.position.set(w * 0.36, 0.33, d * 0.5 + verandaD + 0.95);
    tulsiBase.castShadow = true;
    const tulsiTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.7, 0.1, 0.7)), terracottaTrimMat);
    tulsiTrim.position.set(w * 0.36, 0.68, d * 0.5 + verandaD + 0.95);
    const tulsiPlant = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.28, 0)), bushMat);
    tulsiPlant.position.set(w * 0.36, 0.9, d * 0.5 + verandaD + 0.95);
    hg.add(tulsiBase, tulsiTrim, tulsiPlant);

    // Clay water pots (matka) resting cleanly on veranda corner
    const pot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 10, 8)), clayPotMat);
    pot.scale.set(1, 1.12, 1);
    pot.position.set(-w * 0.38, plinthH + 0.2, d * 0.5 + 0.65);
    pot.castShadow = true;
    hg.add(pot);

    // Small flowering bush beside front yard
    const bushX = -w * 0.35;
    const bushZ = d * 0.5 + verandaD + 0.85;
    const yardBush = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.45, 0)), bushMat);
    yardBush.scale.set(1.2, 0.82, 1.0);
    yardBush.position.set(bushX, 0.34, bushZ);
    hg.add(yardBush);
    for (let f = 0; f < 4; f++) {
      const bloom = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.065, 6, 6)),
        flowerMats[(idx + f) % flowerMats.length],
      );
      bloom.position.set(
        bushX + Math.cos(f * 1.6) * 0.34,
        0.52 + (f % 2) * 0.12,
        bushZ + Math.sin(f * 1.6) * 0.3,
      );
      hg.add(bloom);
    }

    // 7. Low plastered rural boundary wall framing front courtyard with open entry gap
    if (spec.hasCourtyardWall) {
      const wallZ = d * 0.5 + verandaD + 1.85;
      const segW = w * 0.36;
      for (const side of [-1, 1]) {
        const segX = side * (w * 0.5 - segW * 0.5 + 0.15);
        const lowWall = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(segW, 0.84, 0.26)),
          boundaryWallMat,
        );
        lowWall.position.set(segX, 0.42, wallZ);
        lowWall.castShadow = true;
        lowWall.receiveShadow = true;
        const cap = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(segW + 0.06, 0.09, 0.32)),
          terracottaTrimMat,
        );
        cap.position.set(segX, 0.86, wallZ);
        hg.add(lowWall, cap);
      }
    }

    // Solid collision footprint covering house + veranda + front courtyard sides (rotated conservatively)
    const cosR = Math.abs(Math.cos(spec.rotY));
    const sinR = Math.abs(Math.sin(spec.rotY));
    const localW = w + 0.6;
    const localD = d + verandaD + (spec.hasCourtyardWall ? 2.1 : 0.8);
    const worldSpanX = localW * cosR + localD * sinR;
    const worldSpanZ = localW * sinR + localD * cosR;
    // Offset center slightly toward the house front (+localZ)
    const frontShift = verandaD * 0.5 + (spec.hasCourtyardWall ? 0.65 : 0.15);
    const colCx = spec.x + Math.sin(spec.rotY) * frontShift;
    const colCz = spec.z + Math.cos(spec.rotY) * frontShift;

    collisionWorld.addCenterCollider(
      spec.id,
      colCx,
      2.0,
      colCz,
      worldSpanX,
      4.4,
      worldSpanZ,
      true,
    );
  };

  houseSpecs.forEach((spec, idx) => buildTraditionalHouse(spec, idx));

  // ============================================================================
  // 4. SHADY VILLAGE TREES, STONE PAR PLATFORM, BENCHES & RUSTIC VILLAGE WELL
  // ============================================================================
  const leafPuffGeo = trackGeo(new THREE.IcosahedronGeometry(1, 1));
  const addVillageTree = (
    id: string,
    x: number,
    z: number,
    scale: number,
    variant: 'neem' | 'mango' | 'banyan',
    addCollider: boolean,
    withStonePar = false,
  ) => {
    const tg = new THREE.Group();
    tg.position.set(x, 0, z);
    group.add(tg);

    const trunkH = variant === 'banyan' ? 3.0 * scale : 3.5 * scale;
    const trunkR = variant === 'banyan' ? 0.44 * scale : 0.28 * scale;
    const trunk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(trunkR * 0.65, trunkR * 1.25, trunkH, 10)),
      barkMat,
    );
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tg.add(trunk);

    // Sculpted upper branches (with gentle wind sway!)
    const branchCount = variant === 'banyan' ? 5 : 4;
    const branchGeo = trackGeo(new THREE.CylinderGeometry(0.07 * scale, 0.14 * scale, 1.9 * scale, 7));
    for (let b = 0; b < branchCount; b++) {
      const ang = (b / branchCount) * Math.PI * 2 + scale * 1.1;
      const brPivot = new THREE.Group();
      brPivot.position.set(0, trunkH * 0.78, 0);
      tg.add(brPivot);

      const br = new THREE.Mesh(branchGeo, barkMat);
      br.position.set(Math.cos(ang) * 0.65 * scale, 0.62 * scale, Math.sin(ang) * 0.65 * scale);
      br.rotation.z = -Math.cos(ang) * 0.68;
      br.rotation.x = Math.sin(ang) * 0.68;
      br.castShadow = true;
      brPivot.add(br);

      const subCanopy = new THREE.Mesh(
        leafPuffGeo,
        b % 3 === 0 ? foliageDeepMat : b % 3 === 1 ? foliageMidMat : foliageWarmMat,
      );
      const puffR = (variant === 'banyan' ? 1.45 : 1.18) * scale;
      subCanopy.position.set(Math.cos(ang) * 1.35 * scale, 1.32 * scale, Math.sin(ang) * 1.35 * scale);
      subCanopy.scale.set(puffR, puffR * 0.74, puffR);
      subCanopy.castShadow = true;
      brPivot.add(subCanopy);

      swayBranches.push({
        mesh: brPivot,
        baseRotZ: 0,
        baseRotX: 0,
        phase: x * 0.25 + z * 0.17 + b * 1.4,
        amp: 0.018 + (b % 2) * 0.008,
      });
    }

    // Crown center foliage puffs
    const crown = new THREE.Mesh(leafPuffGeo, variant === 'mango' ? foliageDeepMat : foliageMidMat);
    const crownR = (variant === 'banyan' ? 1.85 : 1.52) * scale;
    crown.position.set(0, trunkH + 1.18 * scale, 0);
    crown.scale.set(crownR, crownR * 0.76, crownR);
    crown.castShadow = true;
    tg.add(crown);

    const upperPuff = new THREE.Mesh(leafPuffGeo, foliageWarmMat);
    upperPuff.position.set(0.45 * scale, trunkH + 1.65 * scale, -0.35 * scale);
    upperPuff.scale.set(crownR * 0.65, crownR * 0.52, crownR * 0.65);
    tg.add(upperPuff);

    if (withStonePar) {
      // Classic rural Maharashtra stone seating platform (par) encircling the village tree
      const parBase = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.75, 1.86, 0.5, 16)),
        stonePavingMat,
      );
      parBase.position.y = 0.25;
      parBase.castShadow = true;
      parBase.receiveShadow = true;
      const parRim = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.82, 1.82, 0.08, 16)),
        darkStoneMat,
      );
      parRim.position.y = 0.52;
      tg.add(parBase, parRim);

      if (addCollider) {
        collisionWorld.addCenterCollider(id, x, 0.9, z, 3.65, 2.4, 3.65, false);
      }
      perches.push({
        id: `perch-${id}`,
        zone: 'village-street',
        position: new THREE.Vector3(x - 1.55, 0.58, z + 0.35),
      });
    } else if (addCollider) {
      collisionWorld.addCenterCollider(id, x, 1.4, z, 0.95 * scale, 3.0, 0.95 * scale, false);
    }
  };

  // Hero Mid-Street Banyan/Neem Tree with Circular Stone Par Platform (East-Central Square!)
  addVillageTree('street-tree-par', 7.2, 26.2, 1.25, 'banyan', true, true);
  // Entrance Framing Shade Trees
  addVillageTree('street-tree-ent-w', -7.8, 48.2, 1.18, 'neem', true);
  addVillageTree('street-tree-ent-e', 8.0, 48.6, 1.22, 'mango', true);
  // Street-Side Natural Shade Trees (well spaced so sightline to Village School remains open!)
  addVillageTree('street-tree-w1', -6.8, 34.4, 1.05, 'neem', true);
  addVillageTree('street-tree-e1', 7.6, 36.2, 1.08, 'mango', true);
  addVillageTree('street-tree-w2', -7.6, 22.8, 1.12, 'neem', true);
  addVillageTree('street-tree-lib-s', 12.6, 25.4, 1.05, 'mango', true);
  addVillageTree('street-tree-lib-n', 11.4, 9.6, 1.12, 'neem', true);
  // Scenic Outer-Village Grove Trees framing fields & horizon
  const outerTrees: Array<[number, number, number, 'neem' | 'mango' | 'banyan']> = [
    [-22.5, 44.0, 1.35, 'mango'],
    [-24.0, 32.0, 1.42, 'banyan'],
    [-23.5, 18.5, 1.28, 'neem'],
    [22.5, 44.5, 1.38, 'neem'],
    [24.5, 34.0, 1.45, 'mango'],
    [26.5, 19.0, 1.35, 'banyan'],
    [25.0, 7.0, 1.3, 'neem'],
    [-16.5, 56.0, 1.32, 'mango'],
    [15.5, 55.5, 1.36, 'neem'],
    [-28.0, 52.0, 1.5, 'banyan'],
    [28.5, 50.0, 1.48, 'mango'],
  ];
  outerTrees.forEach(([tx, tz, ts, tv], idx) => {
    addVillageTree(`outer-tree-${idx}`, tx, tz, ts, tv, false);
  });

  // Wooden Village Resting Benches along the Main Street
  const addWoodenBench = (id: string, x: number, z: number, rotY: number) => {
    const bg = new THREE.Group();
    bg.position.set(x, 0, z);
    bg.rotation.y = rotY;
    group.add(bg);

    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.85, 0.08, 0.48)), teakMat);
    seat.position.y = 0.46;
    seat.castShadow = true;
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.85, 0.38, 0.07)), teakMat);
    back.position.set(0, 0.76, -0.21);
    back.castShadow = true;
    const legGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.46, 0.42));
    const l1 = new THREE.Mesh(legGeo, darkTeakMat);
    l1.position.set(-0.74, 0.23, 0);
    const l2 = l1.clone();
    l2.position.x = 0.74;
    bg.add(seat, back, l1, l2);

    const cosR = Math.abs(Math.cos(rotY));
    const sinR = Math.abs(Math.sin(rotY));
    collisionWorld.addCenterCollider(
      id,
      x,
      0.45,
      z,
      1.9 * cosR + 0.65 * sinR,
      0.9,
      1.9 * sinR + 0.65 * cosR,
      false,
    );
  };
  addWoodenBench('street-bench-1', -4.7, 36.0, Math.PI * 0.46);
  addWoodenBench('street-bench-2', 5.8, 34.4, -Math.PI * 0.54);
  addWoodenBench('street-bench-3', 8.2, 13.8, -Math.PI * 0.36);

  // Rustic Stone Village Well (Vihir) set back gently in a quiet West roadside nook
  const buildVillageWell = (x: number, z: number) => {
    const wg = new THREE.Group();
    wg.position.set(x, 0, z);
    group.add(wg);

    const stoneRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.22, 1.32, 0.92, 16)),
      stonePavingMat,
    );
    stoneRing.position.y = 0.46;
    stoneRing.castShadow = true;
    stoneRing.receiveShadow = true;
    wg.add(stoneRing);

    const waterDisc = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(1.02, 16)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#2F5C6E', roughness: 0.2, metalness: 0.1 })),
    );
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.78;
    wg.add(waterDisc);

    // Timber pulley frame
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.07, 0.08, 1.85, 8));
    const pL = new THREE.Mesh(postGeo, darkTeakMat);
    pL.position.set(-1.12, 1.5, 0);
    const pR = new THREE.Mesh(postGeo, darkTeakMat);
    pR.position.set(1.12, 1.5, 0);
    const cross = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8)), teakMat);
    cross.rotation.z = Math.PI / 2;
    cross.position.set(0, 2.38, 0);
    const pulley = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12)), darkTeakMat);
    pulley.rotation.z = Math.PI / 2;
    pulley.position.set(0, 2.38, 0);
    wg.add(pL, pR, cross, pulley);

    collisionWorld.addCenterCollider('village-well', x, 1.0, z, 2.7, 2.4, 2.7, false);
  };
  buildVillageWell(-6.4, 21.8);

  // ============================================================================
  // 5. INSTANCED ROADSIDE GRASS TUFTS & SURROUNDING RURAL FIELDS + DISTANT HILLS
  // ============================================================================
  const buildRoadsideGrass = () => {
    const bladeGeo = trackGeo(new THREE.ConeGeometry(0.065, 0.44, 4));
    bladeGeo.translate(0, 0.22, 0);
    const grassTuftMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.9,
      }),
    );
    wind.applyWindShader(grassTuftMat, {
      swayAmp: 0.14,
      flutterAmp: 0.04,
      heightMin: 0.0,
      heightRange: 0.5,
      cacheKey: 'village-street-grass-tufts',
    });

    const spots: Array<[number, number, number]> = [];
    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 240; i++) {
      const z = 12.5 + rand() * 46.5;
      const roadX = mainStreetCenterX(z);
      const side = i % 2 === 0 ? -1 : 1;
      const offset = 3.7 + rand() * 14.5;
      const x = roadX + side * offset;
      // Avoid placing grass inside Garad Granthalay, Welcome Sign plinth, or House footprints
      if (x > 9.4 && x < 23.4 && z > 11.4 && z < 23.4) continue;
      if (x > -6.3 && x < -3.4 && z > 46.6 && z < 49.4) continue;
      if (x < -7.5 && x > -17.0 && ((z > 36 && z < 45) || (z > 24 && z < 33) || (z > 13 && z < 22))) continue;
      if (x > 7.5 && x < 18.5 && ((z > 37 && z < 45.5) || (z > 27 && z < 35.5))) continue;
      spots.push([x, z, 0.72 + rand() * 0.65]);
    }

    const inst = new THREE.InstancedMesh(bladeGeo, grassTuftMat, spots.length);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const palette = ['#446D32', '#527B3B', '#5F8740', '#3C612D', '#6B8B46'];
    for (let i = 0; i < spots.length; i++) {
      const [gx, gz, gs] = spots[i];
      dummy.position.set(gx, 0, gz);
      dummy.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25);
      dummy.scale.set(gs, gs * (0.85 + rand() * 0.45), gs);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      col.set(palette[i % palette.length]);
      inst.setColorAt(i, col);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  };
  buildRoadsideGrass();

  // Cultivated green village crop fields & low earthen bunds beyond the houses (sense of rural depth!)
  const fieldPatchMats = [
    trackMat(new THREE.MeshStandardMaterial({ color: '#587E3D', roughness: 0.96 })),
    trackMat(new THREE.MeshStandardMaterial({ color: '#698A46', roughness: 0.96 })),
    trackMat(new THREE.MeshStandardMaterial({ color: '#7D8B4C', roughness: 0.96 })),
  ];
  const bundMat = trackMat(new THREE.MeshStandardMaterial({ color: '#9E7D5A', roughness: 0.96 }));
  const fieldRects: Array<[number, number, number, number, number]> = [
    [-46, 46, 26, 22, 0],
    [-48, 22, 24, 24, 1],
    [44, 46, 26, 22, 1],
    [46, 20, 26, 26, 2],
    [-22, 74, 28, 22, 2],
    [18, 76, 30, 22, 0],
  ];
  for (const [fx, fz, fw, fd, matIdx] of fieldRects) {
    const patch = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(fw, fd)), fieldPatchMats[matIdx]);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(fx, 0.004, fz);
    patch.receiveShadow = true;
    group.add(patch);

    const bund = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(fw, 0.16, 0.45)), bundMat);
    bund.position.set(fx, 0.08, fz - fd * 0.5);
    group.add(bund);
  }

  // Distant layered Sahyadri hills framing the southern & outer countryside horizon
  const nearHillMat = trackMat(new THREE.MeshStandardMaterial({ color: '#587A50', roughness: 0.97 }));
  const farHillMat = trackMat(new THREE.MeshStandardMaterial({ color: '#678482', roughness: 0.98 }));
  const hillGeo = trackGeo(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.54));
  const extraHills: Array<[number, number, number, number, number, boolean]> = [
    [-64, 52, 34, 13, 28, false],
    [66, 48, 36, 14, 30, false],
    [-36, 94, 42, 15, 24, true],
    [34, 96, 44, 16, 26, true],
    [0, 108, 58, 19, 28, true],
    [-78, -22, 40, 18, 32, true],
    [76, -24, 42, 17, 32, true],
  ];
  for (const [hx, hz, rx, ry, rz, isFar] of extraHills) {
    const hMesh = new THREE.Mesh(hillGeo, isFar ? farHillMat : nearHillMat);
    hMesh.position.set(hx, -1.4, hz);
    hMesh.scale.set(rx, ry, rz);
    group.add(hMesh);
  }

  // ============================================================================
  // 6. SUBTLE LIVING WILDLIFE (DISTANT SOARING BIRDS & OCCASIONAL BUTTERFLIES)
  // ============================================================================
  const birdGroup = new THREE.Group();
  const birdBodyGeo = trackGeo(new THREE.ConeGeometry(0.06, 0.34, 5));
  birdBodyGeo.rotateX(Math.PI / 2);
  const birdWingGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.025, 0.13));
  birdWingGeo.translate(0.18, 0, 0);
  const birdMat = trackMat(new THREE.MeshStandardMaterial({ color: '#394D5C', roughness: 0.88 }));

  const birdSpecs = [
    { cx: -6, cz: 22, rx: 22, rz: 18, alt: 19, speed: 0.14, phase: 0.4 },
    { cx: 8, cz: 10, rx: 26, rz: 20, alt: 22, speed: -0.12, phase: 1.9 },
    { cx: 2, cz: 36, rx: 19, rz: 16, alt: 17.5, speed: 0.16, phase: 3.1 },
    { cx: -14, cz: -4, rx: 24, rz: 18, alt: 24, speed: 0.11, phase: 4.6 },
    { cx: 14, cz: 28, rx: 21, rz: 17, alt: 20.5, speed: -0.13, phase: 5.5 },
  ];
  for (const bs of birdSpecs) {
    const bg = new THREE.Group();
    const body = new THREE.Mesh(birdBodyGeo, birdMat);
    const lw = new THREE.Mesh(birdWingGeo, birdMat);
    const rw = new THREE.Mesh(birdWingGeo, birdMat);
    rw.scale.x = -1;
    bg.add(body, lw, rw);
    birdGroup.add(bg);
    birds.push({
      group: bg,
      leftWing: lw,
      rightWing: rw,
      ...bs,
      flapRate: 4.6 + (bs.phase % 2.0),
    });
  }
  group.add(birdGroup);

  const butterflyGroup = new THREE.Group();
  const bWingGeo = trackGeo(new THREE.CircleGeometry(0.09, 5));
  bWingGeo.scale(1.15, 0.82, 1);
  bWingGeo.translate(0.075, 0, 0);
  const bColors = ['#E5B842', '#DF8544', '#8AC2D8', '#E5B842', '#E29EA8'];
  const bSpots: Array<[number, number, number]> = [
    [-5.2, 41.2, 2.1],
    [5.4, 37.5, 2.2],
    [-4.8, 28.0, 2.4],
    [7.2, 22.8, 2.0],
    [1.8, 12.6, 2.2],
  ];
  bSpots.forEach(([cx, cz, radius], idx) => {
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: bColors[idx % bColors.length],
        roughness: 0.6,
        side: THREE.DoubleSide,
      }),
    );
    const bg = new THREE.Group();
    const lw = new THREE.Mesh(bWingGeo, mat);
    const rw = new THREE.Mesh(bWingGeo, mat);
    rw.scale.x = -1;
    bg.add(lw, rw);
    butterflyGroup.add(bg);
    butterflies.push({
      group: bg,
      leftWing: lw,
      rightWing: rw,
      cx,
      cz,
      radius,
      baseY: 1.05 + (idx % 3) * 0.32,
      speed: 0.36 + (idx % 3) * 0.1,
      phase: idx * 1.45,
      flapRate: 10.2 + idx * 0.9,
    });
  });
  group.add(butterflyGroup);

  // Additional companion perches along the Main Street
  perches.push(
    {
      id: 'perch-street-bench-1',
      zone: 'village-street',
      position: new THREE.Vector3(-4.7, 0.96, 36.0),
    },
    {
      id: 'perch-street-well',
      zone: 'village-street',
      position: new THREE.Vector3(-6.4, 2.48, 21.8),
    },
  );

  // ============================================================================
  // LIGHTWEIGHT ANIMATION UPDATE (ZERO PER-FRAME ALLOCATIONS)
  // ============================================================================
  const update = (_delta: number, elapsed: number, nightWeight: number) => {
    // 1. Subtle tree branch sway in village breeze
    for (let i = 0; i < swayBranches.length; i++) {
      const sb = swayBranches[i];
      sb.mesh.rotation.z = sb.baseRotZ + Math.sin(elapsed * 1.05 + sb.phase) * sb.amp;
      sb.mesh.rotation.x = sb.baseRotX + Math.cos(elapsed * 0.82 + sb.phase) * sb.amp * 0.7;
    }

    // 2. Distant birds & butterflies quiet down gently at night
    const dayVisibility = Math.max(0, 1 - nightWeight * 1.4);
    birdGroup.visible = dayVisibility > 0.08;
    butterflyGroup.visible = dayVisibility > 0.1;

    if (birdGroup.visible) {
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i];
        const ang = elapsed * b.speed + b.phase;
        const x = b.cx + Math.cos(ang) * b.rx;
        const z = b.cz + Math.sin(ang) * b.rz;
        const y = b.alt + Math.sin(elapsed * 0.55 + b.phase) * 0.95;

        const nextAng = ang + (b.speed >= 0 ? 0.05 : -0.05);
        const nx = b.cx + Math.cos(nextAng) * b.rx;
        const nz = b.cz + Math.sin(nextAng) * b.rz;

        b.group.position.set(x, y, z);
        b.group.rotation.y = Math.atan2(nx - x, nz - z);
        b.group.rotation.z = (b.speed >= 0 ? -1 : 1) * 0.12;

        const glideMask = Math.sin(elapsed * 0.65 + b.phase) > -0.2 ? 1 : 0.15;
        const flap = Math.sin(elapsed * b.flapRate + b.phase) * 0.48 * glideMask;
        b.leftWing.rotation.z = flap;
        b.rightWing.rotation.z = -flap;
      }
    }

    if (butterflyGroup.visible) {
      for (let i = 0; i < butterflies.length; i++) {
        const bf = butterflies[i];
        const t = elapsed * bf.speed + bf.phase;
        const bx = bf.cx + Math.cos(t) * bf.radius + Math.sin(t * 2.1) * 0.35;
        const bz = bf.cz + Math.sin(t * 0.85) * bf.radius;
        const by = bf.baseY + Math.sin(t * 2.9) * 0.28;

        const nt = t + 0.06;
        const nx = bf.cx + Math.cos(nt) * bf.radius + Math.sin(nt * 2.1) * 0.35;
        const nz = bf.cz + Math.sin(nt * 0.85) * bf.radius;

        bf.group.position.set(bx, by, bz);
        bf.group.rotation.y = Math.atan2(nx - bx, nz - bz);
        const flap = Math.sin(elapsed * bf.flapRate + bf.phase) * 0.85;
        bf.leftWing.rotation.z = flap;
        bf.rightWing.rotation.z = -flap;
      }
    }
  };

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return {
    group,
    perches,
    update,
    dispose,
  };
}

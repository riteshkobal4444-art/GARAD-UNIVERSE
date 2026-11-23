import * as THREE from 'three';
import { VILLAGE_DESTINATIONS } from '../../data/destinations';
import type { TimeOfDaySystem } from '../environment/timeOfDaySystem';
import type { WindSystem } from '../environment/windSystem';
import { groundHeightAt, MEET_BHARARI_KNOLL } from '../terrain';
import type { ProceduralTextureSet } from '../textures';

export interface VillageEnvironmentResult {
  group: THREE.Group;
  knollPerchPosition: THREE.Vector3;
  update: (delta: number, elapsed: number, nightWeight: number) => void;
  dispose: () => void;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Merges an array of indexed or non-indexed BufferGeometries (matching attributes)
 * into a single lightweight BufferGeometry for efficient instancing.
 */
function mergeSimpleGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;

  const normalized = geos.map((src) => {
    const g = src.index ? src.toNonIndexed() : src.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    totalVerts += g.attributes.position.count;
    totalIndices += g.attributes.position.count;
    return g;
  });

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let offset = 0;
  for (const g of normalized) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const norm = g.attributes.normal as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute | undefined;

    for (let i = 0; i < pos.count; i++) {
      const idx3 = (offset + i) * 3;
      const idx2 = (offset + i) * 2;
      positions[idx3] = pos.getX(i);
      positions[idx3 + 1] = pos.getY(i);
      positions[idx3 + 2] = pos.getZ(i);

      normals[idx3] = norm.getX(i);
      normals[idx3 + 1] = norm.getY(i);
      normals[idx3 + 2] = norm.getZ(i);

      if (uv) {
        uvs[idx2] = uv.getX(i);
        uvs[idx2 + 1] = uv.getY(i);
      }
    }
    offset += pos.count;
    g.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (totalIndices > 0) {
    out.computeBoundingSphere();
  }
  return out;
}

/**
 * Builds a sculpted tree trunk with visible flared roots and 3 natural forked branches.
 */
function createDetailedTrunkWithBranchesGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Flared lower trunk
  const lower = new THREE.CylinderGeometry(0.19, 0.34, 1.55, 8);
  lower.translate(0, 0.75, 0);
  parts.push(lower);

  // Gently curving upper trunk
  const upper = new THREE.CylinderGeometry(0.13, 0.2, 1.35, 8);
  upper.rotateZ(0.08);
  upper.translate(-0.04, 2.05, 0.02);
  parts.push(upper);

  // Three organic spreading primary branches reaching into foliage clusters
  const b1 = new THREE.CylinderGeometry(0.055, 0.11, 1.48, 6);
  b1.rotateZ(-0.62);
  b1.rotateY(0.35);
  b1.translate(0.46, 2.75, 0.18);
  parts.push(b1);

  const b2 = new THREE.CylinderGeometry(0.05, 0.105, 1.42, 6);
  b2.rotateZ(0.68);
  b2.rotateY(-0.55);
  b2.translate(-0.52, 2.58, -0.24);
  parts.push(b2);

  const b3 = new THREE.CylinderGeometry(0.05, 0.095, 1.28, 6);
  b3.rotateX(0.58);
  b3.rotateZ(-0.2);
  b3.translate(0.12, 2.86, 0.44);
  parts.push(b3);

  const merged = mergeSimpleGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Builds an organic multi-lobe leaf cluster crown (replaces simple spheres/icosahedrons)
 * so every tree reads as layered natural rural foliage catching sun & shadow.
 */
function createLayeredFoliageClusterGeometry(
  lobes: Array<[number, number, number, number, number, number]>,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const [x, y, z, rx, ry, rz] of lobes) {
    const g = new THREE.IcosahedronGeometry(1.0, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const organicBump = 1 + Math.sin(vx * 3.7 + vy * 2.9 + vz * 4.1) * 0.13;
      pos.setXYZ(i, vx * rx * organicBump, vy * ry * organicBump, vz * rz * organicBump);
    }
    g.translate(x, y, z);
    g.computeVertexNormals();
    parts.push(g);
  }
  const merged = mergeSimpleGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Builds a crossed 3-blade stylized grass tuft geometry for instanced meadows.
 */
function createGrassTuftGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bladeSpecs: Array<[number, number, number, number]> = [
    [0, 0, 0.0, 0.56],
    [0.09, 0.06, 1.05, 0.46],
    [-0.08, 0.05, 2.15, 0.52],
    [0.04, -0.09, 2.85, 0.42],
  ];

  for (const [ox, oz, rotY, h] of bladeSpecs) {
    const blade = new THREE.ConeGeometry(0.065, h, 3, 2);
    blade.scale(1.0, 1.0, 0.35);
    blade.translate(0, h * 0.5, 0);
    blade.rotateZ((rotY - 1.4) * 0.14);
    blade.rotateY(rotY);
    blade.translate(ox, 0, oz);
    parts.push(blade);
  }

  const merged = mergeSimpleGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

export function buildVillageEnvironment(
  textures: ProceduralTextureSet,
  wind: WindSystem,
  timeOfDay: TimeOfDaySystem,
  isSoftwareGl: boolean,
): VillageEnvironmentResult {
  const root = new THREE.Group();
  root.name = 'GaradVillageEnvironment';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // --- 1. Rolling Sahyadri Terrain Mesh with Vibrant Rural Maharashtra Vertex Colors ---
  const terrainSize = 196;
  const terrainSegs = 104;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs),
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const cMeadow = new THREE.Color('#78AD56');
  const cSugarcane = new THREE.Color('#4B8245');
  const cSunlitGold = new THREE.Color('#B5B468');
  const cFoothill = new THREE.Color('#577A57');
  const cStreamBank = new THREE.Color('#789652');
  const cTemp = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = groundHeightAt(x, z);
    posAttr.setY(i, y);

    const dist = Math.hypot(x, z);
    const hillFactor = THREE.MathUtils.clamp((y - 1.1) / 7.2, 0, 1);
    const patch = Math.sin(x * 0.13 + 0.5) * Math.cos(z * 0.12 - 0.3) * 0.5 + 0.5;
    const fineNoise = Math.sin(x * 0.37 - z * 0.29) * 0.5 + 0.5;

    cTemp.copy(cMeadow).lerp(cSugarcane, patch * 0.52);
    cTemp.lerp(cSunlitGold, hillFactor * 0.42 + fineNoise * 0.1);
    if (y < 0.05) {
      cTemp.lerp(cStreamBank, 0.55);
    }
    if (dist > 44) {
      cTemp.lerp(cFoothill, THREE.MathUtils.clamp((dist - 44) / 42, 0, 0.78));
    }
    colors[i * 3] = cTemp.r;
    colors[i * 3 + 1] = cTemp.g;
    colors[i * 3 + 2] = cTemp.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.meadowGrass,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.0,
    }),
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // --- 2. Distant Layered Sahyadri Mountain Ridge Silhouettes ---
  const mountainRangeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6f8b86,
      roughness: 0.98,
      metalness: 0.0,
    }),
  );
  const ridgeConfigs: Array<[number, number, number, number, number]> = [
    [-72, -88, 36, 26, 1.4],
    [-18, -96, 44, 32, 1.5],
    [42, -90, 40, 29, 1.3],
    [88, -48, 34, 24, 1.3],
    [-90, -34, 34, 23, 1.35],
    [84, 34, 30, 19, 1.2],
    [-82, 42, 30, 18, 1.25],
  ];
  for (const [mx, mz, rad, h, scaleX] of ridgeConfigs) {
    const peak = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(rad, h, 7)),
      mountainRangeMat,
    );
    peak.position.set(mx, groundHeightAt(mx, mz) + h * 0.22, mz);
    peak.scale.set(scaleX, 1, 0.85);
    peak.rotation.y = mx * 0.1;
    root.add(peak);
  }

  // --- 3. Connected Village Ochre Footpaths, Stepping Stones & Central Banyan/Neem Crossroads ---
  const pathMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.ochrePath,
      roughness: 0.9,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.carvedStone,
      roughness: 0.88,
      metalness: 0.02,
    }),
  );
  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.teakWood,
      roughness: 0.86,
    }),
  );
  const deepLeafMat = trackMat(
    wind.applyWindShader(new THREE.MeshStandardMaterial({ color: 0x2c683d, roughness: 0.78 }), {
      swayAmp: 0.14,
      flutterAmp: 0.04,
      heightMin: -0.6,
      heightRange: 2.2,
      instanced: false,
      cacheKey: 'hero-deep-leaf',
    }),
  );
  const sunlitLeafMat = trackMat(
    wind.applyWindShader(new THREE.MeshStandardMaterial({ color: 0x529648, roughness: 0.76 }), {
      swayAmp: 0.16,
      flutterAmp: 0.045,
      heightMin: -0.6,
      heightRange: 2.2,
      instanced: false,
      cacheKey: 'hero-sun-leaf',
    }),
  );

  // Central village crossroads circle with carved stone ota & sacred multi-branch banyan/neem tree
  const squareY = groundHeightAt(0, 0);
  const centralSquare = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.65, 4.95, 0.16, 28)),
    pathMat,
  );
  centralSquare.position.set(0, squareY + 0.06, 0);
  centralSquare.receiveShadow = true;
  root.add(centralSquare);

  const squareRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.75, 1.95, 0.58, 14)),
    stoneMat,
  );
  squareRing.position.set(0, squareY + 0.29, 0);
  squareRing.castShadow = true;
  squareRing.receiveShadow = true;
  root.add(squareRing);

  const heroTrunkGeo = trackGeo(createDetailedTrunkWithBranchesGeometry());
  const squareTrunk = new THREE.Mesh(heroTrunkGeo, barkMat);
  squareTrunk.position.set(0, squareY + 0.45, 0);
  squareTrunk.scale.set(1.38, 1.32, 1.38);
  squareTrunk.castShadow = true;
  root.add(squareTrunk);

  const centralCanopy = new THREE.Group();
  centralCanopy.position.set(0, squareY + 3.95, 0);
  for (const [cx, cy, cz, r, mat] of [
    [0, 0.35, 0, 1.95, deepLeafMat],
    [1.35, -0.1, 0.65, 1.42, sunlitLeafMat],
    [-1.28, -0.05, -0.52, 1.48, deepLeafMat],
    [0.25, 1.05, -0.42, 1.32, sunlitLeafMat],
    [0.65, 0.12, -1.12, 1.25, deepLeafMat],
    [-0.75, 0.25, 1.05, 1.18, sunlitLeafMat],
  ] as Array<[number, number, number, number, THREE.Material]>) {
    const puff = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(r, 1)), mat);
    puff.position.set(cx, cy, cz);
    puff.scale.set(1.18, 0.76, 1.12);
    puff.castShadow = true;
    centralCanopy.add(puff);
  }
  root.add(centralCanopy);

  // Subtle decorative curb stones along pathways
  const kerbStoneGeo = trackGeo(new THREE.DodecahedronGeometry(0.22, 0));
  const kerbPositions: THREE.Matrix4[] = [];
  const tempDummy = new THREE.Object3D();

  function addCurvedFootpath(pointsXZ: Array<[number, number]>, width: number): void {
    const pts3 = pointsXZ.map(([x, z]) => new THREE.Vector3(x, groundHeightAt(x, z) + 0.09, z));
    const curve = new THREE.CatmullRomCurve3(pts3);
    const steps = 32;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = curve.getPoint(t);
      curve.getTangent(t, tangent);
      side.crossVectors(tangent, up).normalize().multiplyScalar(width * 0.5);

      const lx = p.x - side.x;
      const lz = p.z - side.z;
      const rx = p.x + side.x;
      const rz = p.z + side.z;

      positions.push(lx, groundHeightAt(lx, lz) + 0.085, lz);
      positions.push(rx, groundHeightAt(rx, rz) + 0.085, rz);
      uvs.push(0, t * 5, 1, t * 5);

      if (i % 4 === 2 && i < steps - 1) {
        for (const [kx, kz] of [
          [lx - side.x * 0.14, lz - side.z * 0.14],
          [rx + side.x * 0.14, rz + side.z * 0.14],
        ]) {
          tempDummy.position.set(kx, groundHeightAt(kx, kz) + 0.04, kz);
          tempDummy.rotation.set(0, t * 8, 0);
          tempDummy.scale.set(1.15, 0.55, 0.9);
          tempDummy.updateMatrix();
          kerbPositions.push(tempDummy.matrix.clone());
        }
      }

      if (i < steps) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geo = trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, pathMat);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  addCurvedFootpath([[0, 0], [-6.8, 3.8], [-12.5, 6.2]], 1.95);
  addCurvedFootpath([[0, 0], [-6.0, -5.8], [-10.4, -10.4]], 1.85);
  addCurvedFootpath([[0, 0], [6.5, 5.2], [11.2, 8.2]], 1.95);
  addCurvedFootpath([[0, 0], [7.4, -4.6], [12.5, -8.8]], 1.88);
  addCurvedFootpath([[0, 0], [-1.5, -9.5], [0.8, -16.8], [0.5, -20.2]], 1.75);
  addCurvedFootpath([[0, 0], [0.6, 10.5], [0.2, 20.5]], 1.75);

  if (kerbPositions.length > 0) {
    const kerbInst = new THREE.InstancedMesh(kerbStoneGeo, stoneMat, kerbPositions.length);
    for (let i = 0; i < kerbPositions.length; i++) {
      kerbInst.setMatrixAt(i, kerbPositions[i]);
    }
    kerbInst.receiveShadow = true;
    kerbInst.computeBoundingSphere();
    root.add(kerbInst);
  }

  // --- 4. Shimmering Animated Village Stream, River Stones & Arched Timber Footbridge ---
  const streamUniforms = { uWaterTime: { value: 0 } };
  const streamMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x42a7c6,
      emissive: 0x1b5d75,
      emissiveIntensity: 0.14,
      roughness: 0.12,
      metalness: 0.08,
      clearcoat: isSoftwareGl ? 0 : 0.9,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.88,
    }),
  );
  streamMat.customProgramCacheKey = () => 'garad-stream-shimmer';
  streamMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterTime = streamUniforms.uWaterTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWaterTime;\nvarying vec2 vStreamUv;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vStreamUv = uv;
        transformed.y += sin(uv.x * 26.0 - uWaterTime * 2.6 + uv.y * 8.0) * 0.018;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWaterTime;\nvarying vec2 vStreamUv;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rip1 = sin(vStreamUv.x * 38.0 - uWaterTime * 3.1 + sin(vStreamUv.y * 12.0) * 1.4);
        float rip2 = sin(vStreamUv.x * 62.0 - uWaterTime * 4.4 - vStreamUv.y * 16.0);
        float sparkle = smoothstep(0.62, 0.98, (rip1 * 0.55 + rip2 * 0.45));
        totalEmissiveRadiance += vec3(0.55, 0.78, 0.86) * sparkle * 0.28;`,
      );
  };
  timeOfDay.registerWaterMaterial(streamMat);

  const streamPts = [
    new THREE.Vector3(6.8, groundHeightAt(6.8, 1.5) - 0.12, 1.5),
    new THREE.Vector3(8.1, groundHeightAt(8.1, 6.0) - 0.14, 6.0),
    new THREE.Vector3(6.2, groundHeightAt(6.2, 11.5) - 0.13, 11.5),
    new THREE.Vector3(3.4, groundHeightAt(3.4, 17.0) - 0.1, 17.0),
  ];
  const streamCurve = new THREE.CatmullRomCurve3(streamPts);
  const streamGeo = trackGeo(new THREE.TubeGeometry(streamCurve, 34, 1.22, 10, false));
  streamGeo.scale(1, 0.18, 1);
  const streamMesh = new THREE.Mesh(streamGeo, streamMat);
  streamMesh.position.y = -0.02;
  root.add(streamMesh);

  // Smooth river boulders along stream banks
  const riverRockGeo = trackGeo(new THREE.DodecahedronGeometry(0.45, 1));
  const riverRockMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8f8578, roughness: 0.84 }));
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const p = streamCurve.getPoint(t);
    const sideSign = i % 2 === 0 ? 1 : -1;
    const rx = p.x + sideSign * (1.2 + (i % 3) * 0.25);
    const rz = p.z + ((i % 3) - 1) * 0.35;
    const rock = new THREE.Mesh(riverRockGeo, riverRockMat);
    rock.position.set(rx, groundHeightAt(rx, rz) + 0.06, rz);
    rock.scale.set(1.2, 0.58, 0.95);
    rock.rotation.y = i * 1.1;
    rock.castShadow = true;
    rock.receiveShadow = true;
    root.add(rock);
  }

  // Arched wooden footbridge with warm lantern posts
  const bridgeGroup = new THREE.Group();
  const bx = 7.4;
  const bz = 5.6;
  const by = groundHeightAt(bx, bz);
  bridgeGroup.position.set(bx, by + 0.2, bz);
  bridgeGroup.rotation.y = -0.58;

  const deck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.16, 1.75)), barkMat);
  deck.castShadow = true;
  deck.receiveShadow = true;
  bridgeGroup.add(deck);
  for (const side of [-0.78, 0.78]) {
    const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.3, 0.1, 0.1)), barkMat);
    rail.position.set(0, 0.68, side);
    bridgeGroup.add(rail);
    for (const px of [-1.4, 0, 1.4]) {
      const post = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.72, 0.11)), barkMat);
      post.position.set(px, 0.36, side);
      bridgeGroup.add(post);
    }
  }
  root.add(bridgeGroup);

  // --- 5. Picturesque Foreground Meet-Bharari Knoll (Carved Milestone + Blossoming Perch Branch) ---
  const [kx, ky, kz] = MEET_BHARARI_KNOLL;
  const knollGroup = new THREE.Group();
  knollGroup.position.set(kx, ky, kz);

  const milestoneBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.05, 1.38, 0.36, 14)),
    stoneMat,
  );
  milestoneBase.position.y = 0.18;
  milestoneBase.receiveShadow = true;
  knollGroup.add(milestoneBase);

  const milestonePillar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.42, 0.56, 1.12, 12)),
    stoneMat,
  );
  milestonePillar.position.y = 0.86;
  milestonePillar.castShadow = true;
  milestonePillar.receiveShadow = true;
  knollGroup.add(milestonePillar);

  const milestoneCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.54, 0.46, 0.16, 14)),
    stoneMat,
  );
  milestoneCap.position.y = 1.46;
  milestoneCap.castShadow = true;
  knollGroup.add(milestoneCap);

  const branchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.85, 0.05, -0.65),
    new THREE.Vector3(-1.45, 1.15, -0.45),
    new THREE.Vector3(-0.78, 1.52, -0.18),
    new THREE.Vector3(-0.32, 1.54, -0.05),
  ]);
  const scenicBranch = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(branchCurve, 16, 0.085, 8, false)),
    barkMat,
  );
  scenicBranch.castShadow = true;
  knollGroup.add(scenicBranch);

  const blossomMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf4a938, roughness: 0.72 }));
  for (const [lx, ly, lz, sc] of [
    [-1.48, 1.45, -0.5, 0.28],
    [-1.12, 1.64, -0.35, 0.24],
    [-1.72, 1.22, -0.55, 0.22],
  ]) {
    const leafCluster = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(sc, 1)), sunlitLeafMat);
    leafCluster.position.set(lx, ly, lz);
    knollGroup.add(leafCluster);
  }
  for (const [fx, fy, fz] of [
    [-1.38, 1.62, -0.42],
    [-1.02, 1.72, -0.28],
    [0.95, 0.22, 0.62],
    [-0.9, 0.22, 0.78],
  ]) {
    const fl = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 8, 6)), blossomMat);
    fl.position.set(fx, fy, fz);
    knollGroup.add(fl);
  }

  // Warm brass village lamp beside the knoll (glows warmly at sunset & night)
  const lampPost = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.065, 0.095, 1.22, 8)), barkMat);
  lampPost.position.set(1.42, 0.61, -0.45);
  lampPost.castShadow = true;
  knollGroup.add(lampPost);

  const knollLampMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffebb8,
      emissive: 0xffb83c,
      emissiveIntensity: 0.15,
      roughness: 0.22,
    }),
  );
  timeOfDay.registerWarmGlow({
    material: knollLampMat,
    dayEmissive: 0.12,
    sunsetEmissive: 1.25,
    nightEmissive: 2.2,
  });
  const lampGlow = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 12, 10)), knollLampMat);
  lampGlow.position.set(1.42, 1.32, -0.45);
  knollGroup.add(lampGlow);

  root.add(knollGroup);
  const knollPerchPosition = new THREE.Vector3(kx, ky + 1.54, kz);

  // --- 6. Detailed Multi-Species Rural Maharashtra Trees (GPU Wind-Swaying Foliage & Forked Branches) ---
  const rand = mulberry32(42071);
  const clearanceZones: Array<[number, number, number]> = [
    [0, 0, 7.6],
    [0, 24, 6.8],
    ...VILLAGE_DESTINATIONS.map((d): [number, number, number] => [
      d.worldPosition[0],
      d.worldPosition[1],
      9.4,
    ]),
  ];

  function isClearOfLandmarks(x: number, z: number): boolean {
    for (const [cx, cz, r] of clearanceZones) {
      if (Math.hypot(x - cx, z - cz) < r) return false;
    }
    return true;
  }

  // 145 Detailed Trees with forked branches & multi-lobe organic leaf clusters
  const treePositions: Array<{
    x: number;
    y: number;
    z: number;
    scaleX: number;
    scaleY: number;
    rotY: number;
    species: number;
  }> = [];
  let attempts = 0;
  const targetTreeCount = isSoftwareGl ? 95 : 145;
  while (treePositions.length < targetTreeCount && attempts < 2200) {
    attempts++;
    const angle = rand() * Math.PI * 2;
    const radius = 10.6 + rand() * 58;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 3;
    if (!isClearOfLandmarks(x, z)) continue;
    if (z > 18 && Math.abs(x) < 10) continue;
    const baseScale = 0.78 + rand() * 0.78;
    const species = Math.floor(rand() * 4); // 0: Mango, 1: Neem, 2: Banyan/Broad, 3: Gulmohar/Flame
    treePositions.push({
      x,
      y: groundHeightAt(x, z),
      z,
      scaleX: baseScale * (species === 2 ? 1.22 : species === 1 ? 0.92 : 1.04),
      scaleY: baseScale * (species === 1 ? 1.18 : species === 2 ? 0.94 : 1.02),
      rotY: rand() * Math.PI * 2,
      species,
    });
  }

  const trunkInstGeo = trackGeo(createDetailedTrunkWithBranchesGeometry());
  const lowerFoliageGeo = trackGeo(
    createLayeredFoliageClusterGeometry([
      [0.0, 3.05, 0.0, 1.38, 0.92, 1.32],
      [-0.95, 2.72, -0.45, 0.98, 0.74, 0.94],
      [0.92, 2.86, 0.42, 1.02, 0.76, 0.96],
      [0.18, 2.78, -0.88, 0.92, 0.72, 0.9],
    ]),
  );
  const upperFoliageGeo = trackGeo(
    createLayeredFoliageClusterGeometry([
      [0.32, 3.85, 0.16, 1.06, 0.82, 1.02],
      [-0.48, 3.65, 0.36, 0.88, 0.72, 0.86],
      [0.12, 4.25, -0.22, 0.76, 0.65, 0.74],
    ]),
  );

  // Subtle branch sway + lively leaf flutter driven by shared GPU WindSystem
  const trunkInstMat = trackMat(
    wind.applyWindShader(
      new THREE.MeshStandardMaterial({ map: textures.teakWood, color: 0x8a6548, roughness: 0.92 }),
      {
        swayAmp: 0.055,
        flutterAmp: 0.0,
        heightMin: 0.5,
        heightRange: 2.8,
        instanced: true,
        cacheKey: 'tree-trunk',
      },
    ),
  );
  const lowerCrownMat = trackMat(
    wind.applyWindShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }), {
      swayAmp: 0.16,
      flutterAmp: 0.036,
      heightMin: 1.9,
      heightRange: 2.4,
      instanced: true,
      cacheKey: 'tree-lower-crown',
    }),
  );
  const upperCrownMat = trackMat(
    wind.applyWindShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }), {
      swayAmp: 0.21,
      flutterAmp: 0.048,
      heightMin: 2.4,
      heightRange: 2.3,
      instanced: true,
      cacheKey: 'tree-upper-crown',
    }),
  );

  const trunksInst = new THREE.InstancedMesh(trunkInstGeo, trunkInstMat, treePositions.length);
  const lowerCrownsInst = new THREE.InstancedMesh(lowerFoliageGeo, lowerCrownMat, treePositions.length);
  const upperCrownsInst = new THREE.InstancedMesh(upperFoliageGeo, upperCrownMat, treePositions.length);

  trunksInst.castShadow = true;
  lowerCrownsInst.castShadow = true;
  lowerCrownsInst.receiveShadow = true;
  upperCrownsInst.castShadow = true;

  const dummy = new THREE.Object3D();
  const baseTreeColors = [
    new THREE.Color('#2B663D'), // Mango deep green
    new THREE.Color('#3B7E47'), // Neem fresh green
    new THREE.Color('#255939'), // Banyan lush shade green
    new THREE.Color('#4A8B49'), // Bright grove green
  ];
  const sunlitTopColors = [
    new THREE.Color('#5CA24D'), // Sunlit mango crown
    new THREE.Color('#77B554'), // Bright neem tips
    new THREE.Color('#4E9448'), // Banyan top
    new THREE.Color('#DF6432'), // Occasional flowering Gulmohar flame tree
  ];

  for (let i = 0; i < treePositions.length; i++) {
    const t = treePositions[i];
    dummy.position.set(t.x, t.y - 0.1, t.z);
    dummy.rotation.set(0, t.rotY, 0);
    dummy.scale.set(t.scaleX, t.scaleY, t.scaleX);
    dummy.updateMatrix();
    trunksInst.setMatrixAt(i, dummy.matrix);
    lowerCrownsInst.setMatrixAt(i, dummy.matrix);
    upperCrownsInst.setMatrixAt(i, dummy.matrix);

    const baseCol = baseTreeColors[t.species % baseTreeColors.length];
    const isBloomingGulmohar = t.species === 3 && i % 4 === 0;
    const topCol = isBloomingGulmohar ? sunlitTopColors[3] : sunlitTopColors[t.species % 3];
    lowerCrownsInst.setColorAt(i, baseCol);
    upperCrownsInst.setColorAt(i, topCol);
  }
  trunksInst.computeBoundingSphere();
  lowerCrownsInst.computeBoundingSphere();
  upperCrownsInst.computeBoundingSphere();
  root.add(trunksInst, lowerCrownsInst, upperCrownsInst);

  // --- 7. Instanced Wind-Swaying Grass Tufts, Wildflower Shrubs & Field Rocks ---
  const grassTuftGeo = trackGeo(createGrassTuftGeometry());
  const grassTuftMat = trackMat(
    wind.applyWindShader(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.88,
        side: THREE.DoubleSide,
      }),
      {
        swayAmp: 0.18,
        flutterAmp: 0.032,
        heightMin: 0.04,
        heightRange: 0.52,
        instanced: true,
        cacheKey: 'meadow-grass-tuft',
      },
    ),
  );

  const grassCount = isSoftwareGl ? 180 : 380;
  const grassInst = new THREE.InstancedMesh(grassTuftGeo, grassTuftMat, grassCount);
  const grassPalette = [
    new THREE.Color('#5C9846'),
    new THREE.Color('#74AD4F'),
    new THREE.Color('#8AB95A'),
    new THREE.Color('#4B8640'),
  ];
  let gIdx = 0;
  let gTries = 0;
  while (gIdx < grassCount && gTries < 2200) {
    gTries++;
    const x = (rand() - 0.5) * 74;
    const z = (rand() - 0.5) * 74;
    // Keep grass clear of building plinths (smaller radius than trees so meadows hug courtyards naturally)
    let nearCore = false;
    for (const d of VILLAGE_DESTINATIONS) {
      if (Math.hypot(x - d.worldPosition[0], z - d.worldPosition[1]) < 6.4) {
        nearCore = true;
        break;
      }
    }
    if (nearCore || Math.hypot(x, z) < 5.0) continue;

    const y = groundHeightAt(x, z);
    dummy.position.set(x, y - 0.03, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const sc = 0.72 + rand() * 0.75;
    dummy.scale.set(sc, sc * (0.85 + rand() * 0.4), sc);
    dummy.updateMatrix();
    grassInst.setMatrixAt(gIdx, dummy.matrix);
    grassInst.setColorAt(gIdx, grassPalette[gIdx % grassPalette.length]);
    gIdx++;
  }
  grassInst.count = gIdx;
  grassInst.computeBoundingSphere();
  root.add(grassInst);

  // 145 Wildflower, Marigold & Lush Shrub Clusters (GPU wind-swaying)
  const bushGeo = trackGeo(
    createLayeredFoliageClusterGeometry([
      [0, 0.34, 0, 0.52, 0.36, 0.48],
      [0.28, 0.24, 0.16, 0.32, 0.24, 0.3],
      [-0.24, 0.26, -0.14, 0.34, 0.26, 0.32],
    ]),
  );
  const bushMat = trackMat(
    wind.applyWindShader(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), {
      swayAmp: 0.08,
      flutterAmp: 0.025,
      heightMin: 0.08,
      heightRange: 0.55,
      instanced: true,
      cacheKey: 'village-shrub',
    }),
  );
  const bushCount = isSoftwareGl ? 85 : 145;
  const bushesInst = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
  const bushPalette = [
    new THREE.Color('#4E8B45'),
    new THREE.Color('#6DA44D'),
    new THREE.Color('#F2AB38'), // Sunlit marigold
    new THREE.Color('#E06538'), // Hibiscus bloom
    new THREE.Color('#E98FB0'), // Bougainvillea pink
  ];
  let bIdx = 0;
  let bTries = 0;
  while (bIdx < bushCount && bTries < 1600) {
    bTries++;
    const x = (rand() - 0.5) * 68;
    const z = (rand() - 0.5) * 68;
    if (!isClearOfLandmarks(x, z)) continue;
    const y = groundHeightAt(x, z);
    dummy.position.set(x, y - 0.04, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const sc = 0.58 + rand() * 0.72;
    dummy.scale.set(sc * 1.15, sc * 0.88, sc);
    dummy.updateMatrix();
    bushesInst.setMatrixAt(bIdx, dummy.matrix);
    const palIdx = bIdx % 7 === 0 ? 2 : bIdx % 11 === 0 ? 3 : bIdx % 13 === 0 ? 4 : bIdx % 2;
    bushesInst.setColorAt(bIdx, bushPalette[palIdx]);
    bIdx++;
  }
  bushesInst.count = bIdx;
  bushesInst.computeBoundingSphere();
  root.add(bushesInst);

  // Scattered Natural Sahyadri Basalt Field Rocks (InstancedMesh)
  const fieldRockGeo = trackGeo(new THREE.DodecahedronGeometry(0.42, 1));
  const fieldRockMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x8a8175, roughness: 0.9 }),
  );
  const rockCount = isSoftwareGl ? 32 : 60;
  const fieldRocksInst = new THREE.InstancedMesh(fieldRockGeo, fieldRockMat, rockCount);
  let rIdx = 0;
  let rTries = 0;
  while (rIdx < rockCount && rTries < 800) {
    rTries++;
    const x = (rand() - 0.5) * 76;
    const z = (rand() - 0.5) * 76;
    if (!isClearOfLandmarks(x, z)) continue;
    const y = groundHeightAt(x, z);
    dummy.position.set(x, y + 0.04, z);
    dummy.rotation.set(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4);
    const sc = 0.55 + rand() * 1.1;
    dummy.scale.set(sc * 1.25, sc * 0.55, sc * 0.95);
    dummy.updateMatrix();
    fieldRocksInst.setMatrixAt(rIdx, dummy.matrix);
    rIdx++;
  }
  fieldRocksInst.count = rIdx;
  fieldRocksInst.receiveShadow = true;
  fieldRocksInst.computeBoundingSphere();
  root.add(fieldRocksInst);

  // --- 8. Charming Background Village Terracotta Cottages (warm glowing windows at sunset/night) ---
  const cottageWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.warmPlaster,
      bumpMap: textures.plasterBump,
      bumpScale: 0.03,
      roughness: 0.88,
    }),
  );
  const cottageRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.terracottaTiles,
      bumpMap: textures.terracottaBump,
      bumpScale: 0.06,
      roughness: 0.78,
    }),
  );
  const cottageWindowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe4aa,
      emissive: 0xffb238,
      emissiveIntensity: 0.1,
      roughness: 0.3,
    }),
  );
  timeOfDay.registerWarmGlow({
    material: cottageWindowMat,
    dayEmissive: 0.06,
    sunsetEmissive: 1.05,
    nightEmissive: 2.1,
    dayColor: new THREE.Color('#6F8FA6'),
    nightColor: new THREE.Color('#FFE5A6'),
  });

  const cottageCoords: Array<[number, number, number]> = [
    [-26.5, -2.5, 0.42],
    [-23.5, 16.5, -0.48],
    [26.0, 0.8, -0.35],
    [23.5, -20.5, 0.68],
    [-22.0, -23.0, -0.25],
    [17.5, 22.5, 0.88],
    [-11.5, 21.5, 0.32],
  ];

  const cWallGeo = trackGeo(new THREE.BoxGeometry(3.6, 1.95, 2.75));
  const cRoofGeo = trackGeo(new THREE.ConeGeometry(3.05, 1.45, 4));
  const cWinGeo = trackGeo(new THREE.BoxGeometry(0.6, 0.58, 0.1));

  for (const [cx, cz, rot] of cottageCoords) {
    const cg = new THREE.Group();
    const cy = groundHeightAt(cx, cz);
    cg.position.set(cx, cy, cz);
    cg.rotation.y = rot;

    const w = new THREE.Mesh(cWallGeo, cottageWallMat);
    w.position.y = 0.98;
    w.castShadow = true;
    w.receiveShadow = true;
    cg.add(w);

    const r = new THREE.Mesh(cRoofGeo, cottageRoofMat);
    r.rotation.y = Math.PI / 4;
    r.scale.set(1.04, 1, 0.84);
    r.position.y = 2.66;
    r.castShadow = true;
    cg.add(r);

    const win = new THREE.Mesh(cWinGeo, cottageWindowMat);
    win.position.set(0, 1.08, 1.38);
    cg.add(win);

    root.add(cg);
  }

  // --- 9. Soft Sculpted Drifting Clouds (tinted smoothly by TimeOfDaySystem) ---
  const cloudsGroup = new THREE.Group();
  const cloudMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0,
      emissive: 0xf2f7fc,
      emissiveIntensity: 0.12,
    }),
  );
  timeOfDay.registerCloudMaterial(cloudMat);

  const cloudPuffGeo = trackGeo(new THREE.SphereGeometry(2.5, 14, 12));

  const cloudData: Array<{ group: THREE.Group; speed: number }> = [];
  const cloudSeeds: Array<[number, number, number, number]> = [
    [-42, 27, -46, 1.3],
    [12, 31, -56, 1.5],
    [48, 26, -24, 1.15],
    [-48, 28, 10, 1.28],
    [30, 30, 32, 1.1],
    [-8, 33, -74, 1.6],
    [54, 29, -58, 1.22],
  ];
  for (let i = 0; i < cloudSeeds.length; i++) {
    const [x, y, z, sc] = cloudSeeds[i];
    const cg = new THREE.Group();
    cg.position.set(x, y, z);
    cg.scale.setScalar(sc);
    for (const [px, py, pz, ps] of [
      [0, 0, 0, 1.0],
      [-2.2, -0.35, 0.3, 0.8],
      [2.3, -0.25, -0.2, 0.85],
      [0.6, 0.58, 0.2, 0.74],
      [-0.8, 0.45, -0.15, 0.66],
    ]) {
      const puff = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff.position.set(px, py, pz);
      puff.scale.set(ps * 1.4, ps * 0.62, ps);
      cg.add(puff);
    }
    cloudsGroup.add(cg);
    cloudData.push({ group: cg, speed: 0.32 + i * 0.055 });
  }
  root.add(cloudsGroup);

  // --- 10. Subtle Sunlit Daytime Pollen Motes (fade out gently at night) ---
  const moteCount = 48;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (rand() - 0.5) * 62;
    motePositions[i * 3 + 1] = 1.8 + rand() * 8.5;
    motePositions[i * 3 + 2] = (rand() - 0.5) * 62;
  }
  const moteGeo = trackGeo(new THREE.BufferGeometry());
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xfff0c4,
      size: 0.2,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    }),
  );
  const motes = new THREE.Points(moteGeo, moteMat);
  root.add(motes);

  return {
    group: root,
    knollPerchPosition,
    update: (delta, elapsed, nightWeight) => {
      const dt = Math.min(delta, 0.05);
      streamUniforms.uWaterTime.value = elapsed;

      for (const c of cloudData) {
        c.group.position.x += c.speed * dt;
        if (c.group.position.x > 78) {
          c.group.position.x = -78;
        }
      }

      const w = wind.sampleWind(0, 0, elapsed);
      centralCanopy.rotation.z = w.x * 0.025;
      centralCanopy.rotation.x = w.z * 0.018;

      motes.position.y = Math.sin(elapsed * 0.65) * 0.32;
      motes.rotation.y = elapsed * 0.01;
      moteMat.opacity = 0.52 * Math.max(0, 1 - nightWeight * 1.4);
      motes.visible = moteMat.opacity > 0.02;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

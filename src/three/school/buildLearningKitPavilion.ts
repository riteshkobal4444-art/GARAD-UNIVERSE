import * as THREE from 'three';
import type { ProceduralTextureSet } from '../textures';
import type { InteractionManager } from './InteractionManager';
import type { SchoolCollisionWorld } from './SchoolCollisionAndZones';

export interface LearningKitPavilionMaterials {
  woodMat: THREE.MeshStandardMaterial;
  darkWoodMat: THREE.MeshStandardMaterial;
  stoneFloorMat: THREE.MeshStandardMaterial;
  roofMat: THREE.MeshStandardMaterial;
}

export interface LearningKitPavilionResult {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Helper to word-wrap text cleanly on a 2D canvas.
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Quiet carved eaves beam plaque: "LEARNING KIT PAVILION"
 */
function createPavilionEavePlaqueTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4B2C18';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = '#DFC394';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 1000, 136);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FBF2DF';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('LEARNING KIT PAVILION', 512, 82);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Physical Information Board texture with exact approved content:
 *   A STUDENT'S LEARNING KIT
 *   School bag, books, notebooks, stationery and essential learning materials.
 *   PROPOSED COST PER COMPLETE KIT
 *   ₹600
 *   One learning kit. More opportunities to learn.
 */
function createLearningKitInfoBoardTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 1248;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Warm parchment-linen exhibition panel framed inside teakwood easel
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FBF4E5');
  bgGrad.addColorStop(0.55, '#F5EBD5');
  bgGrad.addColorStop(1, '#EFE1C5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle woven paper grain
  for (let y = 0; y < height; y += 6) {
    ctx.fillStyle = y % 12 === 0 ? 'rgba(90, 56, 30, 0.024)' : 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, y, width, 2);
  }

  // Warm terracotta & dark-teak handcrafted border
  ctx.strokeStyle = '#5D3920';
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  ctx.strokeStyle = '#C6743D';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, width - 96, height - 96);

  // Corner diamonds
  ctx.fillStyle = '#B8622E';
  for (const [cx, cy] of [
    [76, 76],
    [width - 76, 76],
    [76, height - 76],
    [width - 76, height - 76],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx + 9, cy);
    ctx.lineTo(cx, cy + 9);
    ctx.lineTo(cx - 9, cy);
    ctx.closePath();
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Main heading: A STUDENT'S LEARNING KIT
  ctx.fillStyle = '#332012';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText("A STUDENT'S", width * 0.5, 162);
  ctx.fillText('LEARNING KIT', width * 0.5, 234);

  // Delicate terracotta divider
  ctx.fillStyle = '#C46F38';
  ctx.fillRect(width * 0.5 - 190, 294, 380, 4);

  // Description line
  ctx.fillStyle = '#4B3624';
  ctx.font = '40px Georgia, serif';
  const descLines = wrapCanvasText(
    ctx,
    'School bag, books, notebooks, stationery and essential learning materials.',
    width - 170,
  );
  descLines.forEach((line, idx) => {
    ctx.fillText(line, width * 0.5, 376 + idx * 58);
  });

  // Warm framed highlight box for the proposed cost
  const boxX = 96;
  const boxY = 588;
  const boxW = width - 192;
  const boxH = 336;
  ctx.fillStyle = '#4A2C19';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#DEC293';
  ctx.lineWidth = 4;
  ctx.strokeRect(boxX + 12, boxY + 12, boxW - 24, boxH - 24);

  // PROPOSED COST PER COMPLETE KIT
  ctx.fillStyle = '#E8CEA0';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('PROPOSED COST PER COMPLETE KIT', width * 0.5, boxY + 86);

  // Subtle gold hairline inside box
  ctx.fillStyle = 'rgba(222, 194, 147, 0.5)';
  ctx.fillRect(width * 0.5 - 140, boxY + 128, 280, 2);

  // ₹600 (prominent, crisp, warm ivory)
  ctx.fillStyle = '#FBF3E2';
  ctx.font = 'bold 126px Georgia, serif';
  ctx.fillText('₹600', width * 0.5, boxY + 232);

  // Closing sentiment
  ctx.fillStyle = '#57361E';
  ctx.font = 'italic 42px Georgia, serif';
  const closingLines = wrapCanvasText(
    ctx,
    'One learning kit. More opportunities to learn.',
    width - 160,
  );
  closingLines.forEach((line, idx) => {
    ctx.fillText(line, width * 0.5, 1030 + idx * 58);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Woven patch texture printed on the school bag front: "GARAD FOUNDATION"
 */
function createSchoolBagBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Deep slate-navy canvas cloth matching the bag body
  ctx.fillStyle = '#24455E';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle woven fabric cross-hatch
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 512; i += 8) {
    ctx.fillRect(i, 0, 2, 256);
  }

  // Warm stitched patch frame
  ctx.strokeStyle = '#E5C68E';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 472, 216);

  // Small rising-bird / book crest arc above lettering
  ctx.strokeStyle = '#E49B54';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(212, 74);
  ctx.quadraticCurveTo(236, 52, 256, 70);
  ctx.quadraticCurveTo(276, 52, 300, 74);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FAF1DE';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.fillText('GARAD', 256, 128);
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillStyle = '#EBD2A4';
  ctx.fillText('FOUNDATION', 256, 178);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Crisp graduated centimeter/millimeter school ruler texture.
 */
function createRulerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Warm natural boxwood / cream ruler body
  ctx.fillStyle = '#EFE0B9';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = '#B89A68';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 1020, 156);

  // Centimeter & millimeter graduation markings along top edge
  ctx.strokeStyle = '#2B2017';
  ctx.fillStyle = '#2B2017';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  const startX = 48;
  const cmStep = 61;
  for (let cm = 0; cm <= 15; cm++) {
    const x = startX + cm * cmStep;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 54);
    ctx.stroke();
    ctx.fillText(String(cm), x, 86);

    if (cm < 15) {
      for (let mm = 1; mm < 10; mm++) {
        const mx = x + (mm * cmStep) / 10;
        ctx.lineWidth = mm === 5 ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(mx, 0);
        ctx.lineTo(mx, mm === 5 ? 40 : 24);
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = '#73573A';
  ctx.font = '600 22px sans-serif';
  ctx.fillText('CM', 986, 126);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Classic school tin geometry box lid texture.
 */
function createGeometryBoxLidTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#315D7A';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#DDE7EE';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 476, 220);

  // Geometric triangle & circle graphic motif
  ctx.strokeStyle = '#E8C078';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(100, 182);
  ctx.lineTo(155, 76);
  ctx.lineTo(210, 182);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(155, 146, 36, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F6F3EA';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('GEOMETRY', 248, 108);
  ctx.fillStyle = '#E8C988';
  ctx.font = '600 26px Georgia, serif';
  ctx.fillText('INSTRUMENT BOX', 248, 152);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Ruled open notebook page texture.
 */
function createNotebookPageTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FAF5E8';
  ctx.fillRect(0, 0, 256, 320);

  // Red vertical margin line
  ctx.strokeStyle = 'rgba(196, 86, 72, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(40, 320);
  ctx.stroke();

  // Soft blue horizontal ruling lines
  ctx.strokeStyle = 'rgba(78, 118, 162, 0.42)';
  ctx.lineWidth = 1.5;
  for (let y = 44; y < 304; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Small crisp museum-style tabletop item label card texture.
 */
function createItemLabelTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FAF2E1';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#6A4125';
  ctx.lineWidth = 7;
  ctx.strokeRect(8, 8, 496, 112);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2B1B10';
  const fontSize = label.length > 16 ? 34 : 42;
  ctx.font = `bold ${fontSize}px Georgia, serif`;
  ctx.fillText(label, 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Builds the compact, open-air Rural Maharashtra Learning Kit Pavilion near the
 * Village School along the visitor's natural walking route from the Welcome Board.
 *
 * - Positioned cleanly at (-9.0, 0, 10.6), rotated +26° to open warmly toward Main Street
 * - Zero obstruction to Main Street, School entrance steps, Flagpole, House-W3, or Playground
 * - Displays all 9 physical 3D learning kit items on a linen-draped teak exhibition table
 *   with small readable wooden-stand labels
 * - Features the standing wooden Information Board with the exact approved text
 * - Reuses existing InteractionManager for clean proximity inspection
 */
export function buildLearningKitPavilion(
  textures: ProceduralTextureSet,
  mats: LearningKitPavilionMaterials,
  collisionWorld: SchoolCollisionWorld,
  interactions: InteractionManager,
): LearningKitPavilionResult {
  const group = new THREE.Group();
  group.name = 'LearningKitPavilion';

  // Natural open courtyard-edge site visible down Main Street, right along the approach to Village School
  const posX = -9.0;
  const posZ = 10.6;
  const rotY = 0.46;
  group.position.set(posX, 0, posZ);
  group.rotation.y = rotY;

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

  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);
  const toWorld = (lx: number, ly: number, lz: number): THREE.Vector3 =>
    new THREE.Vector3(
      posX + lx * cosR + lz * sinR,
      ly,
      posZ - lx * sinR + lz * cosR,
    );

  // Shared materials tailored for natural daylight & varied PBR roughness
  const darkStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#8C7E6E',
      map: textures.carvedStone,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );
  const khadiClothMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#F2E7D1',
      roughness: 0.94,
      metalness: 0.0,
    }),
  );
  const metalSilverMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#C7CFD4',
      roughness: 0.28,
      metalness: 0.82,
    }),
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#C99B4E',
      roughness: 0.34,
      metalness: 0.74,
    }),
  );

  // ============================================================================
  // 1. OPEN-AIR RURAL MAHARASHTRA PAVILION STRUCTURE (4.2m x 3.0m)
  // ============================================================================
  const pavW = 4.2;
  const pavD = 3.0;
  const floorH = 0.06;

  // Flush step-on natural stone exhibition platform (visitors walk smoothly right onto it)
  const platform = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(pavW + 0.24, floorH, pavD + 0.24)),
    mats.stoneFloorMat,
  );
  platform.position.set(0, floorH * 0.5, 0);
  platform.receiveShadow = true;
  group.add(platform);

  // Subtle dark-stone perimeter trim border
  const borderN = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(pavW + 0.32, 0.05, 0.08)),
    darkStoneMat,
  );
  borderN.position.set(0, 0.025, -pavD * 0.5 - 0.14);
  const borderS = borderN.clone();
  borderS.position.z = pavD * 0.5 + 0.14;
  const borderW = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.08, 0.05, pavD + 0.32)),
    darkStoneMat,
  );
  borderW.position.set(-pavW * 0.5 - 0.14, 0.025, 0);
  const borderE = borderW.clone();
  borderE.position.x = pavW * 0.5 + 0.14;
  group.add(borderN, borderS, borderW, borderE);

  // Four corner carved teakwood pillars resting on Deccan stone shoes (completely open sides!)
  const pillarX = pavW * 0.5 - 0.18;
  const pillarZ = pavD * 0.5 - 0.18;
  const pillarH = 2.66;
  const shoeGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.22, 0.3));
  const postGeo = trackGeo(new THREE.BoxGeometry(0.16, pillarH, 0.16));
  const capGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.1, 0.24));
  const braceGeo = trackGeo(new THREE.BoxGeometry(0.085, 0.56, 0.085));

  const corners: Array<[number, number, string]> = [
    [-1, -1, 'nw'],
    [1, -1, 'ne'],
    [-1, 1, 'sw'],
    [1, 1, 'se'],
  ];
  for (const [sx, sz, suffix] of corners) {
    const px = sx * pillarX;
    const pz = sz * pillarZ;

    const shoe = new THREE.Mesh(shoeGeo, darkStoneMat);
    shoe.position.set(px, floorH + 0.11, pz);
    shoe.castShadow = true;
    shoe.receiveShadow = true;

    const post = new THREE.Mesh(postGeo, mats.woodMat);
    post.position.set(px, floorH + pillarH * 0.5, pz);
    post.castShadow = true;
    post.receiveShadow = true;

    const cap = new THREE.Mesh(capGeo, mats.darkWoodMat);
    cap.position.set(px, floorH + pillarH - 0.05, pz);
    cap.castShadow = true;

    // Traditional Maharashtra angled timber knee-braces supporting perimeter eaves beams
    const braceX = new THREE.Mesh(braceGeo, mats.darkWoodMat);
    braceX.position.set(px - sx * 0.22, floorH + pillarH - 0.28, pz);
    braceX.rotation.z = sx * 0.76;

    const braceZ = new THREE.Mesh(braceGeo, mats.darkWoodMat);
    braceZ.position.set(px, floorH + pillarH - 0.28, pz - sz * 0.22);
    braceZ.rotation.x = -sz * 0.76;

    group.add(shoe, post, cap, braceX, braceZ);

    // Compact pillar collider (blocksCamera = false so camera glides effortlessly around pillars)
    const wp = toWorld(px, 1.4, pz);
    collisionWorld.addCenterCollider(
      `pavilion-pillar-${suffix}`,
      wp.x,
      1.4,
      wp.z,
      0.38,
      2.8,
      0.38,
      false,
    );
  }

  // Perimeter wooden eaves beams
  const beamY = floorH + pillarH + 0.04;
  const longBeamGeo = trackGeo(new THREE.BoxGeometry(pavW + 0.16, 0.14, 0.16));
  const frontBeam = new THREE.Mesh(longBeamGeo, mats.darkWoodMat);
  frontBeam.position.set(0, beamY, pillarZ);
  frontBeam.castShadow = true;
  const backBeam = new THREE.Mesh(longBeamGeo, mats.darkWoodMat);
  backBeam.position.set(0, beamY, -pillarZ);
  backBeam.castShadow = true;

  const sideBeamGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.14, pavD + 0.16));
  const leftBeam = new THREE.Mesh(sideBeamGeo, mats.darkWoodMat);
  leftBeam.position.set(-pillarX, beamY, 0);
  leftBeam.castShadow = true;
  const rightBeam = new THREE.Mesh(sideBeamGeo, mats.darkWoodMat);
  rightBeam.position.set(pillarX, beamY, 0);
  rightBeam.castShadow = true;
  group.add(frontBeam, backBeam, leftBeam, rightBeam);

  // Quiet wooden eaves plaque facing approaching visitors
  const eavePlaqueTex = trackTex(createPavilionEavePlaqueTexture());
  const eavePlaqueMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: eavePlaqueTex,
      roughness: 0.74,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const plaqueBoard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.94, 0.3, 0.05)),
    mats.darkWoodMat,
  );
  plaqueBoard.position.set(0, beamY - 0.08, pillarZ + 0.1);
  plaqueBoard.castShadow = true;
  const plaqueFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(1.86, 0.26)),
    eavePlaqueMat,
  );
  plaqueFace.position.set(0, beamY - 0.08, pillarZ + 0.13);
  group.add(plaqueBoard, plaqueFace);

  // Restrained pitched Mangalore terracotta tiled roof with exposed underside timber rafters
  const roofW = pavW + 0.74;
  const slopeLen = 2.18;
  const slopePitch = 0.35;
  const ridgeY = beamY + 0.78;
  const slopeGeo = trackGeo(new THREE.BoxGeometry(roofW, 0.1, slopeLen));

  const frontSlope = new THREE.Mesh(slopeGeo, mats.roofMat);
  frontSlope.position.set(0, ridgeY - 0.36, 0.94);
  frontSlope.rotation.x = slopePitch;
  frontSlope.castShadow = true;
  frontSlope.receiveShadow = true;

  const backSlope = new THREE.Mesh(slopeGeo, mats.roofMat);
  backSlope.position.set(0, ridgeY - 0.36, -0.94);
  backSlope.rotation.x = -slopePitch;
  backSlope.castShadow = true;
  backSlope.receiveShadow = true;

  const ridgeCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.085, 0.085, roofW + 0.12, 8)),
    mats.roofMat,
  );
  ridgeCap.rotation.z = Math.PI / 2;
  ridgeCap.position.set(0, ridgeY + 0.04, 0);
  ridgeCap.castShadow = true;

  // Exposed interior wooden ridge purlin & cross rafters (warm craft ceiling when walking inside!)
  const ridgeBeam = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(pavW + 0.1, 0.12, 0.12)),
    mats.darkWoodMat,
  );
  ridgeBeam.position.set(0, ridgeY - 0.05, 0);
  group.add(frontSlope, backSlope, ridgeCap, ridgeBeam);

  const rafterGeo = trackGeo(new THREE.BoxGeometry(0.075, 0.085, 2.02));
  for (const rx of [-1.88, -0.94, 0, 0.94, 1.88]) {
    const rF = new THREE.Mesh(rafterGeo, mats.darkWoodMat);
    rF.position.set(rx, ridgeY - 0.42, 0.9);
    rF.rotation.x = slopePitch;
    const rB = new THREE.Mesh(rafterGeo, mats.darkWoodMat);
    rB.position.set(rx, ridgeY - 0.42, -0.9);
    rB.rotation.x = -slopePitch;
    group.add(rF, rB);
  }

  // Open timber gable tie-beams & king-posts on left and right roof ends
  const kingPostGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.72, 0.11));
  for (const gx of [-pillarX, pillarX]) {
    const kp = new THREE.Mesh(kingPostGeo, mats.darkWoodMat);
    kp.position.set(gx, beamY + 0.36, 0);
    group.add(kp);
  }

  // ============================================================================
  // 2. HANDCRAFTED WOODEN EXHIBITION DISPLAY TABLE & RISER SHELF
  // ============================================================================
  const tableGroup = new THREE.Group();
  const tableX = -0.52;
  const tableZ = -0.28;
  tableGroup.position.set(tableX, floorH, tableZ);
  group.add(tableGroup);

  const tableW = 2.28;
  const tableD = 0.96;
  const tableH = 0.8; // tabletop world Y = floorH + 0.80 = 0.86m (comfortable inspection height!)

  // Teak tabletop slab + warm khadi cotton runner cloth
  const tabletop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tableW, 0.06, tableD)),
    mats.woodMat,
  );
  tabletop.position.set(0, tableH - 0.03, 0);
  tabletop.castShadow = true;
  tabletop.receiveShadow = true;
  tableGroup.add(tabletop);

  const runnerCloth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tableW - 0.14, 0.014, tableD - 0.12)),
    khadiClothMat,
  );
  runnerCloth.position.set(0, tableH + 0.007, 0);
  runnerCloth.receiveShadow = true;
  tableGroup.add(runnerCloth);

  // Subtle draped front/back cloth overhang edges
  const drapeGeo = trackGeo(new THREE.BoxGeometry(tableW - 0.14, 0.11, 0.014));
  const drapeFront = new THREE.Mesh(drapeGeo, khadiClothMat);
  drapeFront.position.set(0, tableH - 0.045, tableD * 0.5 - 0.055);
  const drapeBack = new THREE.Mesh(drapeGeo, khadiClothMat);
  drapeBack.position.set(0, tableH - 0.045, -tableD * 0.5 + 0.055);
  tableGroup.add(drapeFront, drapeBack);

  // Table apron rails, 4 wooden legs & lower storage shelf
  const legGeo = trackGeo(new THREE.BoxGeometry(0.075, tableH - 0.04, 0.075));
  for (const lx of [-tableW * 0.5 + 0.1, tableW * 0.5 - 0.1]) {
    for (const lz of [-tableD * 0.5 + 0.09, tableD * 0.5 - 0.09]) {
      const leg = new THREE.Mesh(legGeo, mats.darkWoodMat);
      leg.position.set(lx, (tableH - 0.04) * 0.5, lz);
      leg.castShadow = true;
      tableGroup.add(leg);
    }
  }
  const lowerShelf = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tableW - 0.24, 0.04, tableD - 0.22)),
    mats.woodMat,
  );
  lowerShelf.position.set(0, 0.22, 0);
  lowerShelf.receiveShadow = true;
  tableGroup.add(lowerShelf);

  // Rear wooden display riser shelf elevating School Bag, Books & Water Bottle cleanly
  const riserH = 0.15;
  const riserD = 0.34;
  const riserZ = -tableD * 0.5 + riserD * 0.5 + 0.05;
  const riserTop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(tableW - 0.18, 0.036, riserD)),
    mats.woodMat,
  );
  riserTop.position.set(0, tableH + riserH - 0.018, riserZ);
  riserTop.castShadow = true;
  riserTop.receiveShadow = true;
  const riserSupportGeo = trackGeo(new THREE.BoxGeometry(0.06, riserH - 0.03, riserD - 0.06));
  for (const sx of [-0.94, 0, 0.94]) {
    const sup = new THREE.Mesh(riserSupportGeo, mats.darkWoodMat);
    sup.position.set(sx, tableH + (riserH - 0.03) * 0.5, riserZ);
    tableGroup.add(sup);
  }
  tableGroup.add(riserTop);

  const surfaceY = tableH + 0.014; // linen runner top in tableGroup local Y
  const riserY = tableH + riserH; // rear wooden riser top in tableGroup local Y

  // Small angled museum-style wooden label tent helper
  const addItemLabel = (text: string, lx: number, ly: number, lz: number, cardW = 0.22) => {
    const lg = new THREE.Group();
    lg.position.set(lx, ly, lz);
    tableGroup.add(lg);

    const standBase = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(cardW, 0.018, 0.042)),
      mats.darkWoodMat,
    );
    standBase.position.y = 0.009;
    lg.add(standBase);

    const cardH = 0.058;
    const cardBack = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(cardW, cardH, 0.008)),
      mats.darkWoodMat,
    );
    cardBack.position.set(0, 0.036, 0);
    cardBack.rotation.x = -0.58;
    lg.add(cardBack);

    const lblTex = trackTex(createItemLabelTexture(text));
    const lblMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: lblTex,
        roughness: 0.72,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    const cardFace = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(cardW - 0.008, cardH - 0.006)),
      lblMat,
    );
    cardFace.position.set(0, 0.036 + Math.sin(0.58) * 0.006, Math.cos(0.58) * 0.006);
    cardFace.rotation.x = -0.58;
    lg.add(cardFace);
  };

  // ============================================================================
  // 3. PHYSICAL 3D LEARNING KIT ITEMS (9 RECOGNISABLE COMPOSITE MODELS)
  // ============================================================================

  // --- ITEM 1: SCHOOL BAG (named "GARAD FOUNDATION") ---
  {
    const bagGroup = new THREE.Group();
    bagGroup.position.set(-0.78, riserY, riserZ - 0.04);
    bagGroup.rotation.y = 0.14;
    tableGroup.add(bagGroup);

    const bagNavyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#24455E', roughness: 0.88, metalness: 0.02 }),
    );
    const bagPocketMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#C46434', roughness: 0.86, metalness: 0.02 }),
    );
    const bagStrapMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#1B3447', roughness: 0.9 }),
    );

    // Lower main canvas body + rounded top dome for realistic soft backpack silhouette
    const mainBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.34, 0.17)),
      bagNavyMat,
    );
    mainBody.position.set(0, 0.17, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;

    const topDome = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.085, 0.085, 0.32, 14)),
      bagNavyMat,
    );
    topDome.rotation.z = Math.PI / 2;
    topDome.scale.set(1.0, 1.0, 1.0);
    topDome.position.set(0, 0.34, 0);
    topDome.castShadow = true;

    // Front zippered utility pocket + metallic zipper strip & pull tab
    const frontPocket = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.25, 0.15, 0.055)),
      bagPocketMat,
    );
    frontPocket.position.set(0, 0.11, 0.105);
    frontPocket.castShadow = true;

    const zipBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.23, 0.012, 0.012)),
      metalSilverMat,
    );
    zipBar.position.set(0, 0.178, 0.132);
    const zipPull = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.016, 0.032, 0.01)),
      brassMat,
    );
    zipPull.position.set(0.06, 0.162, 0.138);

    // Crisp woven "GARAD FOUNDATION" identity badge on upper front face
    const badgeTex = trackTex(createSchoolBagBadgeTexture());
    const badgeMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: badgeTex,
        roughness: 0.82,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    const badgePlane = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.23, 0.115)),
      badgeMat,
    );
    badgePlane.position.set(0, 0.275, 0.089);

    // Side mesh pocket sleeves
    const sidePocketGeo = trackGeo(new THREE.BoxGeometry(0.025, 0.14, 0.11));
    const sidePocketL = new THREE.Mesh(sidePocketGeo, bagStrapMat);
    sidePocketL.position.set(-0.168, 0.1, 0);
    const sidePocketR = new THREE.Mesh(sidePocketGeo, bagStrapMat);
    sidePocketR.position.set(0.168, 0.1, 0);

    // Top carry handle loop
    const handleLoop = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.055, 0.012, 8, 16, Math.PI)),
      bagStrapMat,
    );
    handleLoop.position.set(0, 0.42, 0);

    // Curved back shoulder straps
    const strapGeo = trackGeo(new THREE.BoxGeometry(0.052, 0.31, 0.028));
    const strapL = new THREE.Mesh(strapGeo, bagStrapMat);
    strapL.position.set(-0.085, 0.2, -0.095);
    const strapR = new THREE.Mesh(strapGeo, bagStrapMat);
    strapR.position.set(0.085, 0.2, -0.095);

    bagGroup.add(
      mainBody,
      topDome,
      frontPocket,
      zipBar,
      zipPull,
      badgePlane,
      sidePocketL,
      sidePocketR,
      handleLoop,
      strapL,
      strapR,
    );

    addItemLabel('School Bag', -0.78, riserY, riserZ + 0.145, 0.22);
  }

  // --- ITEM 2: BOOKS & NOTEBOOKS (on riser & mid-tabletop) ---
  {
    const pagesMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F5EEDB', roughness: 0.9 }),
    );
    const coverColors = ['#A9442A', '#2F6E5B', '#C98A32', '#3B5C85', '#7B4A68'];
    const coverMats = coverColors.map((c) =>
      trackMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 })),
    );

    // Standing textbooks leaned naturally against a small wooden bookend on the riser
    const booksGroup = new THREE.Group();
    booksGroup.position.set(-0.14, riserY, riserZ - 0.03);
    tableGroup.add(booksGroup);

    const bookSpecs = [
      { x: -0.14, w: 0.036, h: 0.24, d: 0.18, tilt: 0.0, mat: coverMats[0] },
      { x: -0.098, w: 0.034, h: 0.225, d: 0.175, tilt: 0.0, mat: coverMats[1] },
      { x: -0.056, w: 0.032, h: 0.235, d: 0.18, tilt: -0.05, mat: coverMats[2] },
    ];
    for (const b of bookSpecs) {
      const bg = new THREE.Group();
      bg.position.set(b.x, b.h * 0.5, 0);
      bg.rotation.z = b.tilt;
      const cover = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(b.w, b.h, b.d)), b.mat);
      cover.castShadow = true;
      const pages = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(b.w - 0.008, b.h - 0.012, b.d - 0.01)),
        pagesMat,
      );
      pages.position.z = 0.004;
      bg.add(cover, pages);
      booksGroup.add(bg);
    }

    // Neatly stacked flat notebooks beside the standing books
    const nbSpecs = [
      { y: 0.014, rot: 0.04, mat: coverMats[3] },
      { y: 0.042, rot: -0.06, mat: coverMats[4] },
      { y: 0.07, rot: 0.02, mat: coverMats[1] },
    ];
    for (const nb of nbSpecs) {
      const ng = new THREE.Group();
      ng.position.set(0.14, nb.y, 0.01);
      ng.rotation.y = nb.rot;
      const cover = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.024, 0.23)), nb.mat);
      cover.castShadow = true;
      const labelPatch = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(0.085, 0.042)),
        pagesMat,
      );
      labelPatch.rotation.x = -Math.PI / 2;
      labelPatch.position.set(0, 0.013, -0.02);
      ng.add(cover, labelPatch);
      booksGroup.add(ng);
    }

    // One open ruled notebook resting cleanly on the front-center tabletop
    const openNb = new THREE.Group();
    openNb.position.set(-0.22, surfaceY + 0.012, 0.04);
    openNb.rotation.y = -0.08;
    tableGroup.add(openNb);

    const openBack = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.012, 0.22)),
      coverMats[3],
    );
    openBack.castShadow = true;
    const pageTex = trackTex(createNotebookPageTexture());
    const pageFaceMat = trackMat(
      new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.88 }),
    );
    const leftPage = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.148, 0.014, 0.205)), pageFaceMat);
    leftPage.position.set(-0.076, 0.008, 0);
    leftPage.rotation.z = 0.04;
    const rightPage = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.148, 0.014, 0.205)), pageFaceMat);
    rightPage.position.set(0.076, 0.008, 0);
    rightPage.rotation.z = -0.04;
    openNb.add(openBack, leftPage, rightPage);

    addItemLabel('Books & Notebooks', -0.14, riserY, riserZ + 0.145, 0.26);
  }

  // --- ITEM 3: WATER BOTTLE (right side of riser) ---
  {
    const bottleGroup = new THREE.Group();
    bottleGroup.position.set(0.68, riserY, riserZ - 0.03);
    tableGroup.add(bottleGroup);

    const bottleMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#2B7A72', roughness: 0.34, metalness: 0.38 }),
    );
    const bottleBandMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F3E8D2', roughness: 0.72 }),
    );
    const bottleCapMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#D47B34', roughness: 0.48, metalness: 0.08 }),
    );

    const body = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.046, 0.046, 0.185, 16)),
      bottleMat,
    );
    body.position.y = 0.0925;
    body.castShadow = true;

    const band = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.0472, 0.0472, 0.042, 16)),
      bottleBandMat,
    );
    band.position.y = 0.105;

    const shoulder = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.028, 0.046, 0.036, 16)),
      bottleMat,
    );
    shoulder.position.y = 0.203;
    shoulder.castShadow = true;

    const cap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.036, 14)),
      bottleCapMat,
    );
    cap.position.y = 0.236;
    cap.castShadow = true;

    const carryLoop = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.022, 0.0045, 8, 14)),
      bottleCapMat,
    );
    carryLoop.position.set(0.024, 0.242, 0);
    carryLoop.rotation.y = Math.PI / 2;

    bottleGroup.add(body, band, shoulder, cap, carryLoop);
    addItemLabel('Water Bottle', 0.68, riserY, riserZ + 0.155, 0.22);
  }

  // --- ITEM 4: PENCILS (front-left tabletop) ---
  {
    const pencilGroup = new THREE.Group();
    pencilGroup.position.set(-0.88, surfaceY, 0.14);
    tableGroup.add(pencilGroup);

    const woodTipMat = trackMat(new THREE.MeshStandardMaterial({ color: '#E3BF8C', roughness: 0.85 }));
    const graphiteMat = trackMat(new THREE.MeshStandardMaterial({ color: '#2A2A2D', roughness: 0.5 }));
    const pinkEraserMat = trackMat(new THREE.MeshStandardMaterial({ color: '#DF8B90', roughness: 0.88 }));
    const pencilColors = ['#E5B035', '#C85634', '#E5B035'];

    const addPencil = (px: number, pz: number, rotYLocal: number, hex: string) => {
      const pg = new THREE.Group();
      pg.position.set(px, 0.0085, pz);
      pg.rotation.y = rotYLocal;
      pg.rotation.z = Math.PI / 2;

      const barrelMat = trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45 }));
      const barrel = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.007, 0.007, 0.155, 6)),
        barrelMat,
      );
      barrel.castShadow = true;

      const woodCone = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.007, 0.026, 8)),
        woodTipMat,
      );
      woodCone.position.y = 0.0905;

      const leadTip = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.0024, 0.009, 8)),
        graphiteMat,
      );
      leadTip.position.y = 0.1035;

      const ferrule = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.0073, 0.0073, 0.014, 10)),
        brassMat,
      );
      ferrule.position.y = -0.084;

      const endRubber = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.0068, 0.0068, 0.013, 10)),
        pinkEraserMat,
      );
      endRubber.position.y = -0.096;

      pg.add(barrel, woodCone, leadTip, ferrule, endRubber);
      pencilGroup.add(pg);
    };

    addPencil(-0.02, -0.032, 0.14, pencilColors[0]);
    addPencil(0.0, 0.0, 0.06, pencilColors[1]);
    addPencil(0.02, 0.032, -0.08, pencilColors[2]);

    addItemLabel('Pencils', -0.88, surfaceY, 0.36, 0.18);
  }

  // --- ITEM 5: PENS (front left-center tabletop) ---
  {
    const penGroup = new THREE.Group();
    penGroup.position.set(-0.56, surfaceY, 0.14);
    tableGroup.add(penGroup);

    const penColors = ['#1E467A', '#1F6A62'];
    penColors.forEach((hex, idx) => {
      const pg = new THREE.Group();
      pg.position.set(idx * 0.02 - 0.01, 0.009, idx * 0.042 - 0.02);
      pg.rotation.y = idx === 0 ? 0.12 : -0.1;
      pg.rotation.z = Math.PI / 2;

      const penMat = trackMat(
        new THREE.MeshStandardMaterial({ color: hex, roughness: 0.32, metalness: 0.12 }),
      );
      const body = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.0075, 0.0082, 0.135, 10)),
        penMat,
      );
      body.castShadow = true;

      const nibCone = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.0072, 0.026, 10)),
        metalSilverMat,
      );
      nibCone.position.y = 0.08;

      const capRing = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.0088, 0.0088, 0.008, 10)),
        metalSilverMat,
      );
      capRing.position.y = -0.022;

      const clip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.003, 0.044, 0.004)),
        metalSilverMat,
      );
      clip.position.set(0.01, -0.044, 0);

      pg.add(body, nibCone, capRing, clip);
      penGroup.add(pg);
    });

    addItemLabel('Pens', -0.56, surfaceY, 0.36, 0.16);
  }

  // --- ITEM 6: ERASER (front-center tabletop, right of open notebook) ---
  {
    const eraserGroup = new THREE.Group();
    eraserGroup.position.set(-0.22, surfaceY, 0.24);
    eraserGroup.rotation.y = 0.18;
    tableGroup.add(eraserGroup);

    const rubberMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#F6F1E6', roughness: 0.9 }),
    );
    const sleeveMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#2D5D82', roughness: 0.72 }),
    );
    const stripeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#D16D3A', roughness: 0.72 }),
    );

    const rubber = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.078, 0.024, 0.042)),
      rubberMat,
    );
    rubber.position.y = 0.012;
    rubber.castShadow = true;

    const sleeve = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.048, 0.026, 0.044)),
      sleeveMat,
    );
    sleeve.position.set(-0.008, 0.013, 0);

    const stripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.012, 0.027, 0.045)),
      stripeMat,
    );
    stripe.position.set(0.008, 0.013, 0);

    eraserGroup.add(rubber, sleeve, stripe);
    addItemLabel('Eraser', -0.22, surfaceY, 0.36, 0.16);
  }

  // --- ITEM 7: SHARPENER (front center-right tabletop) ---
  {
    const sharpGroup = new THREE.Group();
    sharpGroup.position.set(0.06, surfaceY, 0.22);
    sharpGroup.rotation.y = -0.28;
    tableGroup.add(sharpGroup);

    const sharpBodyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#C64E2E', roughness: 0.42, metalness: 0.05 }),
    );
    const holeMat = trackMat(new THREE.MeshStandardMaterial({ color: '#231A15', roughness: 0.9 }));

    const body = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.056, 0.032, 0.038)),
      sharpBodyMat,
    );
    body.position.y = 0.016;
    body.castShadow = true;

    // Angled steel blade + tiny brass screw on top
    const blade = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.036, 0.004, 0.018)),
      metalSilverMat,
    );
    blade.position.set(0.002, 0.033, 0.003);
    blade.rotation.x = 0.22;

    const screw = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.0035, 0.0035, 0.004, 8)),
      brassMat,
    );
    screw.position.set(-0.006, 0.035, 0.003);

    // Circular pencil entry hole on front end
    const entryHole = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.0095, 12)),
      holeMat,
    );
    entryHole.rotation.y = Math.PI / 2;
    entryHole.position.set(0.0286, 0.016, 0);

    sharpGroup.add(body, blade, screw, entryHole);
    addItemLabel('Sharpener', 0.06, surfaceY, 0.36, 0.18);
  }

  // --- ITEM 8: RULER / SCALE (front-right tabletop) ---
  {
    const rulerGroup = new THREE.Group();
    rulerGroup.position.set(0.46, surfaceY, 0.23);
    rulerGroup.rotation.y = -0.09;
    tableGroup.add(rulerGroup);

    const rulerTex = trackTex(createRulerTexture());
    const rulerTopMat = trackMat(
      new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.62 }),
    );
    const rulerSideMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#DFC99B', roughness: 0.72 }),
    );

    const rulerMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.36, 0.008, 0.054)),
      [rulerSideMat, rulerSideMat, rulerTopMat, rulerSideMat, rulerSideMat, rulerSideMat],
    );
    rulerMesh.position.y = 0.004;
    rulerMesh.castShadow = true;
    rulerGroup.add(rulerMesh);

    addItemLabel('Ruler / Scale', 0.46, surfaceY, 0.36, 0.22);
  }

  // --- ITEM 9: GEOMETRY BOX & COMPASS (mid-right tabletop) ---
  {
    const geoGroup = new THREE.Group();
    geoGroup.position.set(0.68, surfaceY, 0.02);
    tableGroup.add(geoGroup);

    const tinMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#37627E', roughness: 0.36, metalness: 0.54 }),
    );
    const lidTex = trackTex(createGeometryBoxLidTexture());
    const lidTopMat = trackMat(
      new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.38, metalness: 0.36 }),
    );

    // Classic hinged tin geometry box
    const boxMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.028, 0.115)),
      [tinMat, tinMat, lidTopMat, tinMat, tinMat, tinMat],
    );
    boxMesh.position.set(0.04, 0.014, -0.02);
    boxMesh.rotation.y = -0.14;
    boxMesh.castShadow = true;
    geoGroup.add(boxMesh);

    // Recognisable metallic drafting compass resting cleanly beside the geometry box
    const compassGroup = new THREE.Group();
    compassGroup.position.set(-0.18, 0.012, -0.01);
    compassGroup.rotation.y = 0.24;
    geoGroup.add(compassGroup);

    // Knurled top grip pin & round hinged head
    const headDisc = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 12)),
      metalSilverMat,
    );
    headDisc.position.set(0, 0, -0.068);
    const topPin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.026, 8)),
      metalSilverMat,
    );
    topPin.rotation.x = Math.PI / 2;
    topPin.position.set(0, 0, -0.088);

    // Left pointed steel leg
    const legL = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.0032, 0.0012, 0.135, 8)),
      metalSilverMat,
    );
    legL.rotation.x = Math.PI / 2;
    legL.rotation.z = -0.22;
    legL.position.set(-0.016, 0, 0.0);

    // Right pencil-clamp leg + mini wooden pencil stub & brass thumbscrew
    const legR = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.0034, 0.0034, 0.115, 8)),
      metalSilverMat,
    );
    legR.rotation.x = Math.PI / 2;
    legR.rotation.z = 0.22;
    legR.position.set(0.015, 0, -0.008);

    const miniPencilMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#E3AC34', roughness: 0.48 }),
    );
    const miniPencil = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.0048, 0.0048, 0.075, 6)),
      miniPencilMat,
    );
    miniPencil.rotation.x = Math.PI / 2;
    miniPencil.rotation.z = 0.12;
    miniPencil.position.set(0.028, 0.003, 0.026);

    const clampScrew = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.01, 8)),
      brassMat,
    );
    clampScrew.rotation.z = Math.PI / 2;
    clampScrew.position.set(0.036, 0.004, 0.022);

    compassGroup.add(headDisc, topPin, legL, legR, miniPencil, clampScrew);

    // Subtle translucent-cream triangular set square tucked beside the box
    const triShape = new THREE.Shape();
    triShape.moveTo(0, 0);
    triShape.lineTo(0.11, 0);
    triShape.lineTo(0, 0.085);
    triShape.closePath();
    const triHole = new THREE.Path();
    triHole.moveTo(0.022, 0.018);
    triHole.lineTo(0.068, 0.018);
    triHole.lineTo(0.022, 0.052);
    triHole.closePath();
    triShape.holes.push(triHole);
    const setSquare = new THREE.Mesh(
      trackGeo(new THREE.ExtrudeGeometry(triShape, { depth: 0.004, bevelEnabled: false })),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: '#E9E2CE',
          roughness: 0.35,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    setSquare.rotation.x = -Math.PI / 2;
    setSquare.position.set(0.16, 0.005, 0.06);
    geoGroup.add(setSquare);

    addItemLabel('Geometry Box & Compass', 0.84, surfaceY, 0.36, 0.28);
  }

  // Table rotated-axis colliders (2 tidy boxes so visitors can walk right up to the front edge)
  for (const [suffix, ox] of [
    ['l', -0.58],
    ['r', 0.58],
  ] as const) {
    const wp = toWorld(tableX + ox, 0.55, tableZ);
    collisionWorld.addCenterCollider(
      `pavilion-table-${suffix}`,
      wp.x,
      0.55,
      wp.z,
      1.18,
      1.1,
      1.05,
      false,
    );
  }

  // ============================================================================
  // 4. PHYSICAL STANDING INFORMATION BOARD (EXACT APPROVED CONTENT)
  // ============================================================================
  const boardGroup = new THREE.Group();
  const boardX = 1.24;
  const boardZ = -0.34;
  boardGroup.position.set(boardX, floorH, boardZ);
  boardGroup.rotation.y = -0.26;
  group.add(boardGroup);

  const boardW = 1.04;
  const boardH = 1.24;
  const boardCenterY = 1.44; // eye-level comfortable reading height!

  // Standing wooden frame legs & base feet
  const standPostGeo = trackGeo(new THREE.BoxGeometry(0.085, 2.08, 0.085));
  const footGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.08, 0.48));
  for (const side of [-1, 1]) {
    const lx = side * (boardW * 0.5 + 0.045);
    const sp = new THREE.Mesh(standPostGeo, mats.woodMat);
    sp.position.set(lx, 1.04, 0);
    sp.castShadow = true;
    const foot = new THREE.Mesh(footGeo, mats.darkWoodMat);
    foot.position.set(lx, 0.04, 0);
    foot.castShadow = true;
    foot.receiveShadow = true;
    boardGroup.add(sp, foot);
  }

  // Crossbar rails
  const crossGeo = trackGeo(new THREE.BoxGeometry(boardW + 0.22, 0.08, 0.1));
  const lowerBar = new THREE.Mesh(crossGeo, mats.darkWoodMat);
  lowerBar.position.set(0, 0.78, 0);
  const topBar = new THREE.Mesh(crossGeo, mats.darkWoodMat);
  topBar.position.set(0, 2.1, 0);
  boardGroup.add(lowerBar, topBar);

  // Wooden backing panel & crisp high-resolution front face
  const panelBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(boardW, boardH, 0.06)),
    mats.darkWoodMat,
  );
  panelBody.position.set(0, boardCenterY, 0);
  panelBody.castShadow = true;
  boardGroup.add(panelBody);

  const infoTex = trackTex(createLearningKitInfoBoardTexture());
  const infoFaceMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: infoTex,
      roughness: 0.72,
      metalness: 0.01,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const infoFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(boardW - 0.06, boardH - 0.06)),
    infoFaceMat,
  );
  infoFace.position.set(0, boardCenterY, 0.034);
  boardGroup.add(infoFace);

  // Subtle brass studs on frame corners
  const studGeo = trackGeo(new THREE.SphereGeometry(0.016, 8, 8));
  for (const sx of [-boardW * 0.5 + 0.02, boardW * 0.5 - 0.02]) {
    for (const sy of [boardCenterY - boardH * 0.5 + 0.02, boardCenterY + boardH * 0.5 - 0.02]) {
      const stud = new THREE.Mesh(studGeo, brassMat);
      stud.position.set(sx, sy, 0.036);
      boardGroup.add(stud);
    }
  }

  // Compact collider for the standing board
  const boardWorld = toWorld(boardX, 1.0, boardZ);
  collisionWorld.addCenterCollider(
    'pavilion-info-board',
    boardWorld.x,
    1.0,
    boardWorld.z,
    1.05,
    2.1,
    0.58,
    false,
  );

  // ============================================================================
  // 5. REUSE EXISTING INTERACTION SYSTEM FOR CLOSE INSPECTION
  // ============================================================================
  const interactPos = toWorld(-0.18, floorH + 0.92, 0.42);
  interactions.register({
    id: 'learning-kit-pavilion',
    kind: 'exhibition',
    position: interactPos,
    radius: 2.55,
    discoverable: true,
    getPrompt: () => ({
      id: 'learning-kit-pavilion',
      kind: 'exhibition',
      label: "A Student's Learning Kit",
      actionVerb: 'Inspect',
      subtitle: 'Proposed cost per complete kit: ₹600',
    }),
    onInteract: () => ({
      id: 'learning-kit-pavilion',
      title: "A STUDENT'S LEARNING KIT",
      subtitle: 'Proposed Cost per Complete Kit — ₹600',
      body: 'School bag, books, notebooks, stationery and essential learning materials. One learning kit. More opportunities to learn.',
      entries: [
        {
          heading: 'School Bag & Water Bottle',
          details: [
            'Garad Foundation school bag designed for daily school travel.',
            'Reusable student water bottle.',
          ],
        },
        {
          heading: 'Books & Notebooks',
          details: [
            'Books and ruled notebooks for classroom study and practice.',
          ],
        },
        {
          heading: 'Stationery & Geometry Tools',
          details: [
            'Pencils, pens, eraser and sharpener.',
            'Ruler / scale, geometry box and compass.',
          ],
        },
      ],
      timestamp: Date.now(),
    }),
  });

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return { group, dispose };
}

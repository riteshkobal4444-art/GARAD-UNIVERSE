import * as THREE from 'three';
import type { ProceduralTextureSet } from '../textures';
import type { SchoolCollisionWorld } from './SchoolCollisionAndZones';

export interface VillageWelcomeSignMaterials {
  teakMat: THREE.MeshStandardMaterial;
  darkTeakMat: THREE.MeshStandardMaterial;
  stonePavingMat: THREE.MeshStandardMaterial;
  darkStoneMat: THREE.MeshStandardMaterial;
  terracottaRoofMat: THREE.MeshStandardMaterial;
}

export interface VillageWelcomeSignResult {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Word-wraps a string cleanly across balanced lines on a 2D canvas context.
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Draws a small, understated hand-crafted open book & wooden pencil motif
 * centered at (cx, cy) — authentic rural educational craft detail.
 */
function drawEducationalEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);

  // Flanking delicate terracotta-ochre divider lines
  ctx.strokeStyle = 'rgba(217, 146, 82, 0.72)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-430, 0);
  ctx.lineTo(-92, 0);
  ctx.moveTo(92, 0);
  ctx.lineTo(430, 0);
  ctx.stroke();

  // Small diamond accents near inner ends of the rule
  ctx.fillStyle = '#DCA866';
  for (const dx of [-104, 104]) {
    ctx.beginPath();
    ctx.moveTo(dx, -6);
    ctx.lineTo(dx + 6, 0);
    ctx.lineTo(dx, 6);
    ctx.lineTo(dx - 6, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Open book pages (warm parchment cream silhouette)
  ctx.strokeStyle = '#F2DFC0';
  ctx.fillStyle = 'rgba(250, 240, 220, 0.14)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';

  // Left page
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(-24, 15, -52, 20);
  ctx.lineTo(-52, -20);
  ctx.quadraticCurveTo(-24, -26, 0, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right page
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.quadraticCurveTo(24, 15, 52, 20);
  ctx.lineTo(52, -20);
  ctx.quadraticCurveTo(24, -26, 0, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle book page rule lines
  ctx.strokeStyle = 'rgba(242, 223, 192, 0.55)';
  ctx.lineWidth = 2;
  for (const offsetY of [-7, 2, 11]) {
    ctx.beginPath();
    ctx.moveTo(-40, offsetY);
    ctx.quadraticCurveTo(-22, offsetY - 3, -10, offsetY + 2);
    ctx.moveTo(10, offsetY + 2);
    ctx.quadraticCurveTo(22, offsetY - 3, 40, offsetY);
    ctx.stroke();
  }

  // Subtle wooden pencil resting diagonally across the right corner of the open book
  ctx.save();
  ctx.translate(34, -8);
  ctx.rotate(-0.62);
  ctx.fillStyle = '#E09D52';
  ctx.strokeStyle = '#3B2213';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-34, -4.5, 56, 9);
  ctx.fill();
  ctx.stroke();

  // Sharpened timber tip
  ctx.fillStyle = '#F5E4C3';
  ctx.beginPath();
  ctx.moveTo(22, -4.5);
  ctx.lineTo(35, 0);
  ctx.lineTo(22, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Graphite nib
  ctx.fillStyle = '#2B1B12';
  ctx.beginPath();
  ctx.moveTo(30, -1.7);
  ctx.lineTo(35, 0);
  ctx.lineTo(30, 1.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/**
 * Generates a high-resolution (2048x1248) hand-crafted wooden welcome board texture.
 * Exact approved Mission Bharari content and clear three-tier visual hierarchy:
 *  1. Main heading: MISSION BHARARI
 *  2. Tagline: Every Child Deserves an Opportunity to Learn.
 *  3. Short introduction: A Garad Foundation initiative supporting children from rural and tribal communities through education, learning materials and opportunities.
 */
function createVillageWelcomeBoardTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1248;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich oiled natural Maharashtra teakwood panel background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#57341E');
  bgGrad.addColorStop(0.45, '#4A2B18');
  bgGrad.addColorStop(1, '#3D2212');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle natural horizontal timber planks & organic wood grain
  const plankCount = 5;
  const plankH = height / plankCount;
  for (let p = 1; p < plankCount; p++) {
    const py = Math.round(p * plankH);
    ctx.fillStyle = 'rgba(22, 10, 4, 0.34)';
    ctx.fillRect(0, py - 2, width, 4);
    ctx.fillStyle = 'rgba(255, 224, 182, 0.06)';
    ctx.fillRect(0, py + 2, width, 2);
  }

  for (let y = 0; y < height; y += 5) {
    const wave = Math.sin(y * 0.045) * 0.5 + 0.5;
    const alpha = 0.025 + wave * 0.032;
    ctx.fillStyle =
      y % 10 === 0
        ? `rgba(255, 222, 178, ${alpha.toFixed(3)})`
        : `rgba(20, 9, 3, ${(alpha * 1.15).toFixed(3)})`;
    ctx.fillRect(0, y, width, 2);
  }

  // Soft warm vignette around outer panel edges for natural depth
  const vig = ctx.createRadialGradient(
    width * 0.5,
    height * 0.48,
    height * 0.25,
    width * 0.5,
    height * 0.5,
    width * 0.65,
  );
  vig.addColorStop(0, 'rgba(255, 228, 185, 0.04)');
  vig.addColorStop(1, 'rgba(18, 8, 3, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // 2. Refined rural-craft inset double border (parchment cream + warm terracotta)
  ctx.strokeStyle = '#DFC499';
  ctx.lineWidth = 8;
  ctx.strokeRect(46, 46, width - 92, height - 92);

  ctx.strokeStyle = 'rgba(216, 134, 72, 0.72)';
  ctx.lineWidth = 3;
  ctx.strokeRect(68, 68, width - 136, height - 136);

  // Small carved-style corner diamond motifs
  ctx.fillStyle = '#E2B66E';
  const cornerPts: Array<[number, number]> = [
    [104, 104],
    [width - 104, 104],
    [104, height - 104],
    [width - 104, height - 104],
  ];
  for (const [cx, cy] of cornerPts) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx + 12, cy);
    ctx.lineTo(cx, cy + 12);
    ctx.lineTo(cx - 12, cy);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Subtle Garad Foundation identity header (quiet, grounded, tasteful)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#DFBD86';
  ctx.font = '600 34px Georgia, serif';
  ctx.fillText('G A R A D   F O U N D A T I O N', width * 0.5, 168);

  // Delicate underline accent under foundation identity
  ctx.fillStyle = 'rgba(216, 146, 82, 0.58)';
  ctx.fillRect(width * 0.5 - 190, 204, 380, 2.5);

  // 4. TIER 1 — MAIN HEADING: MISSION BHARARI (most prominent)
  ctx.font = 'bold 138px Georgia, serif';
  ctx.fillStyle = 'rgba(18, 8, 3, 0.55)';
  ctx.fillText('MISSION BHARARI', width * 0.5 + 4, 344);

  ctx.fillStyle = '#FBF2E1';
  ctx.fillText('MISSION BHARARI', width * 0.5, 338);

  // 5. TIER 2 — TAGLINE: Every Child Deserves an Opportunity to Learn.
  ctx.font = 'italic 62px Georgia, serif';
  ctx.fillStyle = 'rgba(18, 8, 3, 0.42)';
  ctx.fillText('Every Child Deserves an Opportunity to Learn.', width * 0.5 + 2, 488);

  ctx.fillStyle = '#F0CFA0';
  ctx.fillText('Every Child Deserves an Opportunity to Learn.', width * 0.5, 484);

  // 6. Tasteful educational emblem (open book + wooden pencil) centered in divider
  drawEducationalEmblem(ctx, width * 0.5, 622);

  // 7. TIER 3 — SHORT INTRODUCTION (clean, generous line spacing, easy 10-second read)
  const introText =
    'A Garad Foundation initiative supporting children from rural and tribal communities through education, learning materials and opportunities.';
  ctx.font = '48px Georgia, serif';
  const introLines = wrapTextLines(ctx, introText, width - 340);
  const lineHeight = 76;
  const startY = 780;

  for (let i = 0; i < introLines.length; i++) {
    const ly = startY + i * lineHeight;
    ctx.fillStyle = 'rgba(18, 8, 3, 0.36)';
    ctx.fillText(introLines[i], width * 0.5 + 2, ly + 2);
    ctx.fillStyle = '#F1E5CF';
    ctx.fillText(introLines[i], width * 0.5, ly);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds the physical Mission Bharari Identity & Welcome Point along the existing
 * village arrival street:
 * - Natural dressed stone base plinth grounded into the west arrival grass verge
 * - Handcrafted teakwood frame, posts, cross-rails, knee-braces, and bronze studs
 * - Pitched Mangalore terracotta tiled rain-hood (chhajja) matching village roofs
 * - Eye-level high-resolution wooden signboard facing arriving visitors cleanly
 * - Zero obstruction to the dirt road, entrance arch, Bharari's perch, or nearby trees
 */
export function buildVillageWelcomeSign(
  textures: ProceduralTextureSet,
  mats: VillageWelcomeSignMaterials,
  collisionWorld: SchoolCollisionWorld,
): VillageWelcomeSignResult {
  const group = new THREE.Group();
  group.name = 'MissionBharariWelcomePoint';

  // Positioned cleanly on the open West arrival verge just before the entrance arch,
  // angled gently (+39°) toward the arriving visitor at (0, 1.52, 51.8).
  const posX = -4.88;
  const posZ = 47.88;
  const rotY = 0.68;
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

  // Subtle aged-bronze hardware material (roughness contrast >= 0.40 against matte teak/stone)
  const bronzeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#9A7443',
      roughness: 0.36,
      metalness: 0.68,
    }),
  );

  // Back plank warm teak material so the rear of the signboard looks crafted from 360°
  const backPlankMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#633C22',
      map: textures.teakWood,
      roughness: 0.84,
      metalness: 0.0,
    }),
  );

  // 1. Grounded Deccan stone foundation plinth & chamfered stone cap
  const plinthBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.44, 0.36, 0.62)),
    mats.darkStoneMat,
  );
  plinthBase.position.set(0, 0.18, 0);
  plinthBase.castShadow = true;
  plinthBase.receiveShadow = true;
  group.add(plinthBase);

  const plinthCap = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.56, 0.08, 0.72)),
    mats.stonePavingMat,
  );
  plinthCap.position.set(0, 0.4, 0);
  plinthCap.castShadow = true;
  plinthCap.receiveShadow = true;
  group.add(plinthCap);

  // Quiet ground-level stone step apron in front of the plinth so visitors can pause naturally
  const frontStepApron = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.26, 0.04, 0.56)),
    mats.stonePavingMat,
  );
  frontStepApron.position.set(0, 0.02, 0.58);
  frontStepApron.receiveShadow = true;
  group.add(frontStepApron);

  // 2. Pair of handcrafted square teakwood posts rising from stone pedestal shoes
  const postOffsetX = 1.09;
  const postShoeGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.14, 0.24));
  const postGeo = trackGeo(new THREE.BoxGeometry(0.16, 2.08, 0.16));
  const braceGeo = trackGeo(new THREE.BoxGeometry(0.09, 0.46, 0.09));

  for (const side of [-1, 1]) {
    const px = side * postOffsetX;

    const shoe = new THREE.Mesh(postShoeGeo, mats.darkStoneMat);
    shoe.position.set(px, 0.51, 0);
    shoe.castShadow = true;
    shoe.receiveShadow = true;
    group.add(shoe);

    const post = new THREE.Mesh(postGeo, mats.teakMat);
    post.position.set(px, 1.54, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);

    // Subtle timber knee-brace tucked neatly beneath the top beam
    const brace = new THREE.Mesh(braceGeo, mats.darkTeakMat);
    brace.position.set(px - side * 0.16, 2.34, 0);
    brace.rotation.z = side * 0.78;
    brace.castShadow = true;
    group.add(brace);
  }

  // Horizontal teak cross-rails framing the signboard top & bottom
  const railGeo = trackGeo(new THREE.BoxGeometry(2.38, 0.11, 0.2));
  const bottomRail = new THREE.Mesh(railGeo, mats.darkTeakMat);
  bottomRail.position.set(0, 0.84, 0);
  bottomRail.castShadow = true;
  const topRail = new THREE.Mesh(railGeo, mats.darkTeakMat);
  topRail.position.set(0, 2.28, 0);
  topRail.castShadow = true;
  const eavesBeam = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.58, 0.12, 0.24)),
    mats.darkTeakMat,
  );
  eavesBeam.position.set(0, 2.54, 0);
  eavesBeam.castShadow = true;
  group.add(bottomRail, topRail, eavesBeam);

  // 3. Recessed eye-level wooden signboard body (center Y = 1.56m matches eye height 1.52m)
  const boardBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.04, 1.32, 0.1)),
    backPlankMat,
  );
  boardBody.position.set(0, 1.56, 0);
  boardBody.castShadow = true;
  boardBody.receiveShadow = true;
  group.add(boardBody);

  // Carved outer timber moulding trim around the front face
  const trimVertGeo = trackGeo(new THREE.BoxGeometry(0.06, 1.32, 0.04));
  const trimHorizGeo = trackGeo(new THREE.BoxGeometry(2.06, 0.06, 0.04));
  const leftTrim = new THREE.Mesh(trimVertGeo, mats.darkTeakMat);
  leftTrim.position.set(-1.0, 1.56, 0.056);
  const rightTrim = new THREE.Mesh(trimVertGeo, mats.darkTeakMat);
  rightTrim.position.set(1.0, 1.56, 0.056);
  const topTrim = new THREE.Mesh(trimHorizGeo, mats.darkTeakMat);
  topTrim.position.set(0, 2.19, 0.056);
  const botTrim = new THREE.Mesh(trimHorizGeo, mats.darkTeakMat);
  botTrim.position.set(0, 0.93, 0.056);
  group.add(leftTrim, rightTrim, topTrim, botTrim);

  // Four quiet bronze mounting studs at the frame corners
  const studGeo = trackGeo(new THREE.SphereGeometry(0.024, 8, 8));
  for (const sx of [-0.99, 0.99]) {
    for (const sy of [0.94, 2.18]) {
      const stud = new THREE.Mesh(studGeo, bronzeMat);
      stud.position.set(sx, sy, 0.078);
      group.add(stud);
    }
  }

  // Front painted/carved wooden face plane (offset cleanly to prevent Z-fighting)
  const signTex = trackTex(createVillageWelcomeBoardTexture());
  const signFaceMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.72,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const signFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(1.94, 1.2)),
    signFaceMat,
  );
  signFace.position.set(0, 1.56, 0.056);
  signFace.receiveShadow = true;
  group.add(signFace);

  // 4. Pitched Mangalore terracotta tiled rain-hood (chhajja) protecting the timber board
  const hoodWidth = 2.66;
  const slopeDepth = 0.58;
  const slopeGeo = trackGeo(new THREE.BoxGeometry(hoodWidth, 0.09, slopeDepth));

  const frontSlope = new THREE.Mesh(slopeGeo, mats.terracottaRoofMat);
  frontSlope.position.set(0, 2.66, 0.24);
  frontSlope.rotation.x = 0.36;
  frontSlope.castShadow = true;

  const backSlope = new THREE.Mesh(slopeGeo, mats.terracottaRoofMat);
  backSlope.position.set(0, 2.66, -0.24);
  backSlope.rotation.x = -0.36;
  backSlope.castShadow = true;

  const ridgeCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.07, 0.07, hoodWidth + 0.08, 8)),
    mats.terracottaRoofMat,
  );
  ridgeCap.rotation.z = Math.PI / 2;
  ridgeCap.position.set(0, 2.78, 0);
  ridgeCap.castShadow = true;

  // Exposed underside timber rafters supporting the tiled rain-hood
  const rafterGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.07, 0.88));
  for (const rx of [-1.09, -0.36, 0.36, 1.09]) {
    const rafter = new THREE.Mesh(rafterGeo, mats.darkTeakMat);
    rafter.position.set(rx, 2.57, 0);
    group.add(rafter);
  }
  group.add(frontSlope, backSlope, ridgeCap);

  // 5. Compact rotated-footprint colliders (blocksCamera = false so camera glides freely,
  //    and strictly confined to the plinth itself — zero obstruction to the walking road)
  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);
  for (const [suffix, localX] of [
    ['left', -0.82],
    ['center', 0],
    ['right', 0.82],
  ] as const) {
    const wx = posX + localX * cosR;
    const wz = posZ - localX * sinR;
    collisionWorld.addCenterCollider(
      `welcome-sign-${suffix}`,
      wx,
      1.25,
      wz,
      0.72,
      2.5,
      0.72,
      false,
    );
  }

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return { group, dispose };
}

import * as THREE from 'three';
import {
  NOTICEBOARD_RECORDS,
  PROJECT_CONTENT_DATA,
  VERIFIED_MAP_LOCATIONS,
} from '../../data/projectContentData';
import type { ProjectContentRecord } from '../../types/universe';

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function finalizeTexture(canvas: HTMLCanvasElement, anisotropy = 4): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

/**
 * 1. School Identity Entrance Signboard
 * Exact required text:
 *   GARAD FOUNDATION
 *   Learning • Creativity • Dreams
 */
export function createEntranceSignboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Warm rural-Maharashtra hand-painted school signboard cream plaster base
  const bg = ctx.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, '#FFF8E8');
  bg.addColorStop(1, '#F6E6C6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 256);

  // Outer teak wood border + terracotta double hairline
  ctx.strokeStyle = '#5D351B';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 1006, 238);

  ctx.strokeStyle = '#C45129';
  ctx.lineWidth = 4;
  ctx.strokeRect(26, 26, 972, 204);

  // Subtle sunrise emblem accents left & right
  const drawEmblem = (cx: number, cy: number) => {
    ctx.save();
    ctx.fillStyle = '#E58A2F';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1B5B82';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawEmblem(76, 128);
  drawEmblem(948, 128);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#184A6E';
  ctx.font = '900 66px Georgia, serif';
  ctx.fillText('GARAD FOUNDATION', 512, 118);

  // Decorative saffron divider rule
  ctx.fillStyle = '#D66727';
  ctx.fillRect(260, 140, 504, 4);

  ctx.fillStyle = '#8F3E1E';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('Learning  •  Creativity  •  Dreams', 512, 194);

  return finalizeTexture(canvas, 8);
}

/**
 * 2. Authentic Rural Classroom Educational Blackboard (Classes 5–10)
 * Strictly genuine classroom learning content — NO NGO statistics or project reports.
 */
export function createEducationalBlackboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Matte green slate chalkboard with subtle chalk-dust patina
  const bg = ctx.createLinearGradient(0, 0, 1024, 512);
  bg.addColorStop(0, '#1C4435');
  bg.addColorStop(0.5, '#193B2F');
  bg.addColorStop(1, '#163529');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle chalk smudge clouds
  ctx.fillStyle = 'rgba(255, 255, 245, 0.035)';
  ctx.beginPath();
  ctx.ellipse(290, 210, 210, 90, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(740, 240, 190, 80, 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Chalk border & column divider
  ctx.strokeStyle = 'rgba(244, 248, 238, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 984, 472);

  // Top classroom header
  ctx.fillStyle = '#F8E39A';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CLASS 5–10  •  TODAY’S LESSON', 44, 60);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(240, 247, 236, 0.85)';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('Subject: Mathematics & Environment', 980, 60);

  ctx.strokeStyle = 'rgba(244, 248, 238, 0.32)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(36, 78);
  ctx.lineTo(988, 78);
  ctx.moveTo(548, 92);
  ctx.lineTo(548, 376);
  ctx.stroke();

  // === LEFT COLUMN: MATHEMATICS — FRACTIONS ===
  ctx.textAlign = 'left';
  ctx.fillStyle = '#A8E6CF';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('MATHEMATICS : FRACTIONS', 46, 120);

  ctx.fillStyle = '#F7FAF2';
  ctx.font = 'bold 42px Georgia, serif';
  ctx.fillText('1/2  +  1/4  =  3/4', 56, 178);

  ctx.fillStyle = '#DCECE2';
  ctx.font = '21px sans-serif';
  ctx.fillText('Step 1:  1/2  =  2/4', 56, 218);
  ctx.fillText('Step 2:  2/4  +  1/4  =  3/4', 56, 248);

  // Visual Fraction Bar Diagram (quarters)
  const barX = 56;
  const barY = 278;
  const segW = 104;
  const barH = 44;
  for (let i = 0; i < 4; i++) {
    if (i < 2) {
      ctx.fillStyle = 'rgba(130, 215, 190, 0.55)';
    } else if (i === 2) {
      ctx.fillStyle = 'rgba(248, 212, 118, 0.65)';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    }
    ctx.fillRect(barX + i * segW, barY, segW, barH);
    ctx.strokeStyle = '#F4F8EE';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(barX + i * segW, barY, segW, barH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1/4', barX + i * segW + segW * 0.5, barY + 29);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F8E39A';
  ctx.font = '18px sans-serif';
  ctx.fillText('2 quarters (1/2)  +  1 quarter (1/4)  =  3 quarters (3/4)', 56, 354);

  // === RIGHT COLUMN: ENVIRONMENTAL LESSON ===
  ctx.fillStyle = '#A8E6CF';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('ENVIRONMENT & NATURE', 576, 120);

  ctx.fillStyle = '#F7FAF2';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText('Save Water.', 576, 174);
  ctx.fillText('Plant Trees.', 576, 214);
  ctx.fillText('Keep Our Village Clean.', 576, 254);

  // Simple chalk leaf & water drop sketch
  ctx.strokeStyle = '#9BE3C6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(618, 344);
  ctx.quadraticCurveTo(582, 304, 624, 278);
  ctx.quadraticCurveTo(664, 304, 618, 344);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(618, 348);
  ctx.lineTo(618, 294);
  ctx.stroke();

  // Water droplet chalk sketch
  ctx.strokeStyle = '#9AD4F5';
  ctx.beginPath();
  ctx.moveTo(732, 282);
  ctx.quadraticCurveTo(762, 320, 732, 344);
  ctx.quadraticCurveTo(702, 320, 732, 282);
  ctx.stroke();

  ctx.fillStyle = '#DCECE2';
  ctx.font = '18px sans-serif';
  ctx.fillText('Every drop counts · Every tree gives shade', 576, 368);

  // === BOTTOM FULL-WIDTH MARATHI THOUGHT ===
  ctx.strokeStyle = 'rgba(248, 227, 154, 0.48)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(36, 394);
  ctx.lineTo(988, 394);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#F9DE88';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('आजचा सुविचार  (THOUGHT FOR THE DAY)', 512, 424);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 31px sans-serif';
  ctx.fillText('"शिका, पुढे चला आणि इतरांनाही पुढे घेऊन चला."', 512, 466);

  return finalizeTexture(canvas, 8);
}

/**
 * 3. Classroom Wall Clock (Working 3D Mesh with live ticking hands)
 */
export interface ClassroomWallClock {
  group: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

export function createClassroomWallClock(): ClassroomWallClock {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Wooden clock rim
  const rim = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.28, 0.28, 0.055, 24)),
    track(new THREE.MeshStandardMaterial({ color: '#5D361C', roughness: 0.72 })),
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  // Painted clock dial texture
  const dialCanvas = document.createElement('canvas');
  dialCanvas.width = 256;
  dialCanvas.height = 256;
  const ctx = dialCanvas.getContext('2d')!;
  ctx.fillStyle = '#FFF9EC';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#3B281B';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#1E252B';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) {
    const ang = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const tx = 128 + Math.cos(ang) * 90;
    const ty = 128 + Math.sin(ang) * 90;
    ctx.fillText(String(h), tx, ty);
  }
  const dialTex = track(finalizeTexture(dialCanvas, 4));
  const dial = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.24, 24)),
    track(new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.7 })),
  );
  dial.position.z = 0.03;
  group.add(dial);

  const handMat = track(new THREE.MeshStandardMaterial({ color: '#1F1B16', roughness: 0.45 }));
  const secMat = track(new THREE.MeshStandardMaterial({ color: '#C44525', roughness: 0.45 }));

  const hourPivot = new THREE.Group();
  hourPivot.position.z = 0.036;
  const hourHand = new THREE.Mesh(track(new THREE.BoxGeometry(0.018, 0.12, 0.006)), handMat);
  hourHand.position.y = 0.05;
  hourPivot.add(hourHand);

  const minPivot = new THREE.Group();
  minPivot.position.z = 0.041;
  const minHand = new THREE.Mesh(track(new THREE.BoxGeometry(0.013, 0.175, 0.006)), handMat);
  minHand.position.y = 0.075;
  minPivot.add(minHand);

  const secPivot = new THREE.Group();
  secPivot.position.z = 0.046;
  const secHand = new THREE.Mesh(track(new THREE.BoxGeometry(0.007, 0.19, 0.005)), secMat);
  secHand.position.y = 0.08;
  secPivot.add(secHand);

  const pin = new THREE.Mesh(track(new THREE.SphereGeometry(0.016, 8, 8)), secMat);
  pin.position.z = 0.05;

  group.add(hourPivot, minPivot, secPivot, pin);

  // Anchor to 10:10 morning school hour and advance smoothly in real seconds
  const baseSeconds = 10 * 3600 + 10 * 60;
  const update = (elapsed: number) => {
    const totalSec = baseSeconds + elapsed;
    const sec = totalSec % 60;
    const min = (totalSec / 60) % 60;
    const hr = (totalSec / 3600) % 12;
    secPivot.rotation.z = -(sec / 60) * Math.PI * 2;
    minPivot.rotation.z = -(min / 60) * Math.PI * 2;
    hourPivot.rotation.z = -(hr / 12) * Math.PI * 2;
  };

  return {
    group,
    update,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

/**
 * 4A. Classroom Display — Student Creativity Wall
 * Drawings, paintings, poems & essays — zero invented real student names or fake awards.
 */
export function createStudentCreativityWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  // Cork board + warm wooden frame
  ctx.fillStyle = '#C99B68';
  ctx.fillRect(0, 0, 768, 480);
  ctx.strokeStyle = '#63391E';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, 748, 460);

  // Title banner
  ctx.fillStyle = '#B54825';
  ctx.fillRect(32, 30, 704, 52);
  ctx.fillStyle = '#FFF7E8';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STUDENT CREATIVITY WALL', 384, 65);

  const cards = [
    { x: 42, y: 102, w: 158, h: 270, kind: 'drawing', title: 'Drawing', sub: 'Village Hills' },
    { x: 218, y: 98, w: 158, h: 270, kind: 'painting', title: 'Painting', sub: 'Monsoon Trees' },
    { x: 394, y: 104, w: 158, h: 270, kind: 'poem', title: 'Poem Sheet', sub: 'Marathi / English' },
    { x: 570, y: 100, w: 158, h: 270, kind: 'essay', title: 'Essay Page', sub: 'My Village' },
  ];

  for (const c of cards) {
    ctx.fillStyle = 'rgba(42, 24, 12, 0.22)';
    ctx.fillRect(c.x + 5, c.y + 6, c.w, c.h);
    ctx.fillStyle = '#FFF9EC';
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Pushpin
    ctx.fillStyle = '#C73828';
    ctx.beginPath();
    ctx.arc(c.x + c.w * 0.5, c.y + 14, 7, 0, Math.PI * 2);
    ctx.fill();

    if (c.kind === 'drawing' || c.kind === 'painting') {
      // Sample stylized school artwork frame
      ctx.fillStyle = c.kind === 'drawing' ? '#DCEFF8' : '#D5E9D6';
      ctx.fillRect(c.x + 14, c.y + 30, c.w - 28, 152);
      ctx.fillStyle = '#F5C445';
      ctx.beginPath();
      ctx.arc(c.x + c.w - 40, c.y + 58, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.kind === 'drawing' ? '#4C8A52' : '#2C6F5C';
      ctx.beginPath();
      ctx.moveTo(c.x + 14, c.y + 182);
      ctx.lineTo(c.x + 68, c.y + 104);
      ctx.lineTo(c.x + c.w - 14, c.y + 182);
      ctx.closePath();
      ctx.fill();
      if (c.kind === 'painting') {
        ctx.fillStyle = '#5D3D24';
        ctx.fillRect(c.x + 42, c.y + 132, 10, 50);
        ctx.fillStyle = '#3B7A40';
        ctx.beginPath();
        ctx.arc(c.x + 47, c.y + 122, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Lined notebook sheet for poem / essay slot
      ctx.fillStyle = '#FAF2DF';
      ctx.fillRect(c.x + 14, c.y + 30, c.w - 28, 152);
      ctx.strokeStyle = '#C9B89A';
      ctx.lineWidth = 1.5;
      for (let ly = c.y + 54; ly <= c.y + 168; ly += 18) {
        ctx.beginPath();
        ctx.moveTo(c.x + 22, ly);
        ctx.lineTo(c.x + c.w - 22, ly);
        ctx.stroke();
      }
      ctx.fillStyle = '#735B44';
      ctx.font = 'italic 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.kind === 'poem' ? 'Student Poem' : 'Student Essay', c.x + c.w * 0.5, c.y + 104);
      ctx.fillText('Display Slot', c.x + c.w * 0.5, c.y + 126);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1F2428';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(c.title, c.x + c.w * 0.5, c.y + 214);

    ctx.fillStyle = '#6A5442';
    ctx.font = '14px sans-serif';
    ctx.fillText(c.sub, c.x + c.w * 0.5, c.y + 238);
  }

  ctx.fillStyle = '#4A2D18';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Classroom Art & Writing Display  •  Ready for Approved Student Entries (No Invented Names)',
    384,
    438,
  );

  return finalizeTexture(canvas, 6);
}

/**
 * 4B. Classroom Display — Learning Wall
 * Mathematics charts, science water-cycle diagram, environmental awareness & motivational thoughts.
 */
export function createLearningWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F3E7D2';
  ctx.fillRect(0, 0, 768, 480);
  ctx.strokeStyle = '#5D361C';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 750, 462);

  // Header
  ctx.fillStyle = '#1B5B82';
  ctx.fillRect(28, 28, 712, 48);
  ctx.fillStyle = '#FFF9EE';
  ctx.font = 'bold 25px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CLASSROOM LEARNING WALL  •  MATHS • SCIENCE • NATURE', 384, 60);

  // Card 1: Mathematics Chart
  ctx.fillStyle = '#FFFDF7';
  ctx.fillRect(36, 94, 218, 290);
  ctx.strokeStyle = '#1B5B82';
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 94, 218, 290);

  ctx.fillStyle = '#1B5B82';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('MATHEMATICS', 145, 126);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#24303B';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('• 1/2 = 0.50 = 50%', 52, 164);
  ctx.fillText('• 1/4 = 0.25 = 25%', 52, 194);
  ctx.fillText('• 3/4 = 0.75 = 75%', 52, 224);
  ctx.fillText('• Area □ = side × side', 52, 266);
  ctx.fillText('• Area △ = ½ × b × h', 52, 296);
  ctx.fillText('• Perimeter = Sum', 52, 326);
  ctx.fillText('  of all sides', 52, 348);

  // Card 2: Science Diagram (Water Cycle)
  ctx.fillStyle = '#F4FBFF';
  ctx.fillRect(274, 94, 220, 290);
  ctx.strokeStyle = '#1E7565';
  ctx.lineWidth = 3;
  ctx.strokeRect(274, 94, 220, 290);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#1E7565';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('SCIENCE: WATER CYCLE', 384, 126);

  // Sun, cloud, rain, pond simple diagram
  ctx.fillStyle = '#F2B93B';
  ctx.beginPath();
  ctx.arc(318, 174, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9BC6DF';
  ctx.beginPath();
  ctx.arc(414, 178, 20, 0, Math.PI * 2);
  ctx.arc(438, 174, 22, 0, Math.PI * 2);
  ctx.arc(458, 182, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2A78A8';
  ctx.lineWidth = 3;
  for (let rx = 412; rx <= 452; rx += 14) {
    ctx.beginPath();
    ctx.moveTo(rx, 204);
    ctx.lineTo(rx - 4, 232);
    ctx.stroke();
  }

  ctx.fillStyle = '#4C9ED2';
  ctx.fillRect(292, 258, 184, 34);
  ctx.fillStyle = '#1F3A4D';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Evaporation  →  Clouds', 384, 322);
  ctx.fillText('Condensation  →  Rain', 384, 348);
  ctx.fillText('Collection in Rivers', 384, 372);

  // Card 3: Environment & Motivation
  ctx.fillStyle = '#F5FBF0';
  ctx.fillRect(514, 94, 218, 290);
  ctx.strokeStyle = '#3B7A43';
  ctx.lineWidth = 3;
  ctx.strokeRect(514, 94, 218, 290);

  ctx.fillStyle = '#3B7A43';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('ENVIRONMENT', 623, 126);

  ctx.fillStyle = '#223824';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('Save Every Drop', 623, 172);
  ctx.fillText('Plant Native Trees', 623, 208);
  ctx.fillText('Keep Campus Clean', 623, 244);

  ctx.fillStyle = '#E6F2DC';
  ctx.fillRect(530, 272, 186, 92);
  ctx.fillStyle = '#285930';
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillText('“Curiosity turns every', 623, 304);
  ctx.fillText('question into a new', 623, 328);
  ctx.fillText('window of learning.”', 623, 352);

  ctx.fillStyle = '#4A3828';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Classes 5–10 Reference Charts  •  Walk Closer & Press E to Study', 384, 434);

  return finalizeTexture(canvas, 6);
}

/**
 * 4C. Classroom Display — Garad Foundation Activity Wall
 * Physical exhibition board listing documented Garad Foundation activities with honest
 * "Photograph awaiting upload" frames.
 */
export function createActivityWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#EFE3CE';
  ctx.fillRect(0, 0, 960, 540);
  ctx.strokeStyle = '#5D361C';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 942, 522);

  // Header strip
  ctx.fillStyle = '#184A6E';
  ctx.fillRect(28, 26, 904, 56);
  ctx.fillStyle = '#FFF7E8';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GARAD FOUNDATION  •  ACTIVITY EXHIBITION WALL', 480, 62);

  const items = PROJECT_CONTENT_DATA.slice(0, 5);
  const cols = 3;
  const cardW = 282;
  const cardH = 192;
  const startX = 42;
  const startY = 98;
  const gapX = 16;
  const gapY = 16;

  items.forEach((proj, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = startX + col * (cardW + gapX) + (row === 1 ? 148 : 0);
    const cy = startY + row * (cardH + gapY);

    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = proj.coverColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx, cy, cardW, cardH);

    // Top colour bar
    ctx.fillStyle = proj.coverColor;
    ctx.fillRect(cx, cy, cardW, 30);
    ctx.fillStyle = '#FFF9EE';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(proj.title.toUpperCase(), cx + 10, cy + 20);

    // Honest missing photograph frame
    ctx.fillStyle = '#EFE7D8';
    ctx.fillRect(cx + 10, cy + 38, cardW - 20, 64);
    ctx.strokeStyle = '#B8A68E';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + 10, cy + 38, cardW - 20, 64);

    ctx.fillStyle = '#6E5A46';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Photograph awaiting upload', cx + cardW * 0.5, cy + 75);

    // Documented date, location & brief description
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8F3E1E';
    ctx.font = 'bold 12px sans-serif';
    const metaLines = wrapLines(ctx, `${proj.activityDate}`, cardW - 20, 1);
    ctx.fillText(metaLines[0] ?? '', cx + 10, cy + 120);

    ctx.fillStyle = '#2B3036';
    ctx.font = '12px sans-serif';
    const descLines = wrapLines(ctx, proj.location, cardW - 20, 2);
    descLines.forEach((line, li) => {
      ctx.fillText(line, cx + 10, cy + 139 + li * 16);
    });

    ctx.fillStyle = '#5D4D3E';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText(proj.verifiedBeneficiaryFigure, cx + 10, cy + 180, cardW - 20);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4A3624';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(
    'Documented Garad Foundation Records  •  Press E to Inspect Full Activity Details',
    480,
    514,
  );

  return finalizeTexture(canvas, 6);
}

/**
 * 4D. Classroom Display — Physical Maharashtra Map Wall
 * Displays ONLY verified/documented locations from VERIFIED_MAP_LOCATIONS.
 */
export function createMaharashtraMapTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F7EFE0';
  ctx.fillRect(0, 0, 640, 512);
  ctx.strokeStyle = '#5D361C';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 624, 496);

  // Header
  ctx.fillStyle = '#215B4F';
  ctx.fillRect(24, 24, 592, 46);
  ctx.fillStyle = '#FFF8EA';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAHARASHTRA  •  VERIFIED ACTIVITY MAP', 320, 55);

  // Stylized Maharashtra state outline polygon (clean geographical silhouette)
  const mapX = 48;
  const mapY = 86;
  const mapW = 544;
  const mapH = 304;

  // Soft Arabian Sea + Deccan canvas frame
  ctx.fillStyle = '#DCEEF6';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = '#9DB8C4';
  ctx.lineWidth = 2;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  // Maharashtra polygon
  const pts: Array<[number, number]> = [
    [0.19, 0.24], // Palghar / Dahanu north coast
    [0.29, 0.16], // Nashik north
    [0.44, 0.14], // Jalgaon / Satpura
    [0.64, 0.18], // Amravati
    [0.83, 0.22], // Nagpur / Bhandara
    [0.91, 0.34], // Gondia
    [0.86, 0.56], // Gadchiroli
    [0.72, 0.58], // Chandrapur / Yavatmal
    [0.58, 0.68], // Nanded / Latur
    [0.44, 0.78], // Solapur / Sangli
    [0.31, 0.88], // Kolhapur / Sindhudurg
    [0.24, 0.74], // Ratnagiri coast
    [0.21, 0.56], // Raigad coast
    [0.19, 0.41], // Thane / Palghar coast
  ];

  ctx.fillStyle = '#E8D9B5';
  ctx.strokeStyle = '#6D5438';
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach(([nx, ny], i) => {
    const px = mapX + nx * mapW;
    const py = mapY + ny * mapH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Arabian Sea subtle label
  ctx.fillStyle = '#4B7D96';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Arabian', mapX + 16, mapY + 184);
  ctx.fillText('Sea', mapX + 24, mapY + 204);

  ctx.fillStyle = '#7A6347';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAHARASHTRA', mapX + mapW * 0.57, mapY + mapH * 0.45);

  // Plot ONLY verified locations from VERIFIED_MAP_LOCATIONS
  VERIFIED_MAP_LOCATIONS.forEach((loc, idx) => {
    const px = mapX + loc.mapX * mapW;
    const py = mapY + loc.mapY * mapH;

    // Pin halo + solid marker
    ctx.fillStyle = 'rgba(205, 74, 37, 0.25)';
    ctx.beginPath();
    ctx.arc(px, py, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#C94624';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF9EE';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Index badge inside pin
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(idx + 1), px, py + 4);

    // Callout label to the right of pin
    const labelX = px + 18;
    const labelY = py - 8 + idx * 8;
    ctx.fillStyle = 'rgba(255, 250, 240, 0.92)';
    ctx.fillRect(labelX - 4, labelY - 13, 188, 22);
    ctx.fillStyle = '#1E2D3A';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${idx + 1}. ${loc.name}`, labelX + 2, labelY + 2);
  });

  // Footer legend with verified location list
  ctx.fillStyle = '#4B3725';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Documented Locations Shown Only:', 48, 418);

  ctx.font = '12.5px sans-serif';
  ctx.fillStyle = '#2B241E';
  VERIFIED_MAP_LOCATIONS.forEach((loc, i) => {
    ctx.fillText(
      `${i + 1}. ${loc.name} — ${loc.projectTitle} (${loc.date})`,
      48,
      440 + i * 19,
      544,
    );
  });

  return finalizeTexture(canvas, 6);
}

/**
 * 5. Garad Foundation Physical Noticeboard
 * Mounted in the school corridor/veranda with all 5 initial documented records.
 */
export function createNoticeboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 560;
  const ctx = canvas.getContext('2d')!;

  // Warm corkboard inside dark teak frame
  ctx.fillStyle = '#BD8E5C';
  ctx.fillRect(0, 0, 960, 560);
  ctx.strokeStyle = '#533018';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, 938, 538);

  // Header strip
  ctx.fillStyle = '#B84A27';
  ctx.fillRect(32, 28, 896, 54);
  ctx.fillStyle = '#FFF9EC';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GARAD FOUNDATION  •  SCHOOL NOTICEBOARD', 480, 64);

  const cardW = 282;
  const cardH = 196;
  const startX = 40;
  const startY = 98;

  NOTICEBOARD_RECORDS.forEach((rec, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const cx = startX + col * (cardW + 17) + (row === 1 ? 148 : 0);
    const cy = startY + row * (cardH + 18);

    // Pinned paper shadow + sheet
    ctx.fillStyle = 'rgba(38, 22, 10, 0.24)';
    ctx.fillRect(cx + 5, cy + 6, cardW, cardH);
    ctx.fillStyle = '#FFFDF5';
    ctx.fillRect(cx, cy, cardW, cardH);

    // Accent top tape
    ctx.fillStyle = rec.accentColor;
    ctx.fillRect(cx, cy, cardW, 28);

    // Red pin at top center
    ctx.fillStyle = '#D93B2B';
    ctx.beginPath();
    ctx.arc(cx + cardW * 0.5, cy + 12, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(rec.title, cx + 10, cy + 19, cardW - 20);

    // Entries
    ctx.fillStyle = '#24292E';
    ctx.font = '12.5px sans-serif';
    let ey = cy + 48;
    for (const entry of rec.entries) {
      const lines = wrapLines(ctx, `• ${entry}`, cardW - 20, 3);
      for (const l of lines) {
        ctx.fillText(l, cx + 10, ey);
        ey += 16;
      }
      ey += 4;
    }

    // Verification footer
    ctx.fillStyle = '#735B44';
    ctx.font = 'italic 11px sans-serif';
    ctx.fillText(rec.verificationNote, cx + 10, cy + cardH - 10, cardW - 20);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#3C2312';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Press E or Tap Inspect to Read All Documented Garad Foundation Notices', 480, 534);

  return finalizeTexture(canvas, 6);
}

/**
 * 6. Physical Hardcover Book Front Cover Texture (for the 5 Library Shelf Books)
 */
export function createProjectBookCoverTexture(project: ProjectContentRecord): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 440;
  const ctx = canvas.getContext('2d')!;

  // Rich cloth-bound book cover
  ctx.fillStyle = project.coverColor;
  ctx.fillRect(0, 0, 320, 440);

  // Subtle spine crease shadow along left edge
  const spineGrad = ctx.createLinearGradient(0, 0, 36, 0);
  spineGrad.addColorStop(0, 'rgba(0,0,0,0.34)');
  spineGrad.addColorStop(0.55, 'rgba(255,255,255,0.1)');
  spineGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(0, 0, 36, 440);

  // Gold / warm accent border frame
  ctx.strokeStyle = project.accentColor;
  ctx.lineWidth = 5;
  ctx.strokeRect(24, 24, 272, 392);

  ctx.strokeStyle = 'rgba(255, 247, 232, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, 252, 372);

  // Book number badge
  ctx.fillStyle = project.accentColor;
  ctx.fillRect(68, 52, 184, 30);
  ctx.fillStyle = '#1E1A16';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(project.bookNumber, 160, 72);

  // Cover title (wrapped nicely in serif)
  ctx.fillStyle = '#FFF9EE';
  ctx.font = 'bold 30px Georgia, serif';
  const titleLines = wrapLines(ctx, project.coverTitle, 224, 3);
  const startTitleY = titleLines.length === 1 ? 168 : titleLines.length === 2 ? 150 : 136;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, 160, startTitleY + i * 38);
  });

  // Divider bar
  ctx.fillStyle = project.accentColor;
  ctx.fillRect(102, 260, 116, 4);

  // Subtitle / Theme
  ctx.fillStyle = '#F7E7CA';
  ctx.font = 'bold 15px sans-serif';
  const subLines = wrapLines(ctx, project.subtitle, 220, 3);
  subLines.forEach((line, i) => {
    ctx.fillText(line, 160, 294 + i * 22);
  });

  // Footer imprint
  ctx.fillStyle = 'rgba(255, 248, 234, 0.85)';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('GARAD FOUNDATION', 160, 378);
  ctx.font = '11px sans-serif';
  ctx.fillText('PROJECT LIBRARY', 160, 396);

  return finalizeTexture(canvas, 6);
}

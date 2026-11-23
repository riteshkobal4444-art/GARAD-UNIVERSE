import * as THREE from 'three';

export interface ProceduralTextureSet {
  terracottaTiles: THREE.CanvasTexture;
  terracottaBump: THREE.CanvasTexture;
  warmPlaster: THREE.CanvasTexture;
  plasterBump: THREE.CanvasTexture;
  ochrePath: THREE.CanvasTexture;
  meadowGrass: THREE.CanvasTexture;
  teakWood: THREE.CanvasTexture;
  carvedStone: THREE.CanvasTexture;
  featherBlue: THREE.CanvasTexture;
  featherOrange: THREE.CanvasTexture;
  leatherBag: THREE.CanvasTexture;
  chalkboard: THREE.CanvasTexture;
  educationalChart1: THREE.CanvasTexture;
  educationalChart2: THREE.CanvasTexture;
  schoolNameplate: THREE.CanvasTexture;
  fireflyGlow: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  skyDome: THREE.CanvasTexture;
  dispose: () => void;
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(maxAnisotropy, 8);
  tex.needsUpdate = true;
  return tex;
}

function finalizeDataTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  // Linear color space for bump/roughness maps
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(maxAnisotropy, 8);
  tex.needsUpdate = true;
  return tex;
}

function createTerracottaCanvases(): { color: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const size = 512;
  const color = document.createElement('canvas');
  color.width = size;
  color.height = size;
  const ctx = color.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext('2d')!;

  ctx.fillStyle = '#9c3e1e';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#262626';
  bctx.fillRect(0, 0, size, size);

  const rows = 10;
  const cols = 10;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const stagger = (r % 2) * (colW * 0.25);
      const x = (c * colW + stagger) % size;
      const y = r * rowH;
      const shade = ((r * 11 + c * 17) % 23) - 11;
      const red = Math.min(255, Math.max(0, 206 + shade * 2));
      const green = Math.min(255, Math.max(0, 88 + shade));
      const blue = Math.min(255, Math.max(0, 44 + Math.floor(shade * 0.6)));

      // Draw scalloped Mangalore tile with soft sunlit ridge & deep shadow trough
      const drawTile = (ox: number) => {
        const grad = ctx.createLinearGradient(ox, y, ox + colW, y + rowH);
        grad.addColorStop(0, `rgb(${Math.min(255, red + 22)}, ${Math.min(255, green + 14)}, ${Math.min(255, blue + 8)})`);
        grad.addColorStop(0.5, `rgb(${red}, ${green}, ${blue})`);
        grad.addColorStop(1, `rgb(${Math.max(0, red - 44)}, ${Math.max(0, green - 26)}, ${Math.max(0, blue - 16)})`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(ox + 2, y + 2, colW - 4, rowH - 2, [2, 2, 16, 16]);
        ctx.fill();

        // Specular clay crest highlight
        ctx.fillStyle = 'rgba(255, 226, 192, 0.22)';
        ctx.fillRect(ox + colW * 0.22, y + 4, colW * 0.16, rowH - 12);

        // Warm weathered lichen/sun speckling
        if ((r * 5 + c * 3) % 7 === 0) {
          ctx.fillStyle = 'rgba(138, 108, 62, 0.18)';
          ctx.beginPath();
          ctx.arc(ox + colW * 0.6, y + rowH * 0.55, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Matching sculpted bump ridge
        const bGrad = bctx.createLinearGradient(ox, y, ox + colW, y);
        bGrad.addColorStop(0, '#555555');
        bGrad.addColorStop(0.35, '#ececec');
        bGrad.addColorStop(0.75, '#a0a0a0');
        bGrad.addColorStop(1, '#303030');
        bctx.fillStyle = bGrad;
        bctx.beginPath();
        bctx.roundRect(ox + 2, y + 2, colW - 4, rowH - 4, [2, 2, 14, 14]);
        bctx.fill();
      };

      drawTile(x);
      if (x + colW > size) {
        drawTile(x - size);
      }
    }
  }

  return { color, bump };
}

function createWarmPlasterCanvases(): { color: HTMLCanvasElement; bump: HTMLCanvasElement } {
  const size = 512;
  const color = document.createElement('canvas');
  color.width = size;
  color.height = size;
  const ctx = color.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#FFF5E7');
  grad.addColorStop(0.68, '#F7E7D0');
  grad.addColorStop(0.86, '#ECCEB0');
  grad.addColorStop(1, '#D9A37C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, size, size);

  // Hand-troweled lime plaster organic variation
  for (let i = 0; i < 900; i++) {
    const x = (i * 67 + (i % 13) * 19) % size;
    const y = (i * 113 + (i % 7) * 23) % size;
    const r = 6 + (i % 24);
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(255, 250, 242, 0.08)' : 'rgba(178, 126, 86, 0.055)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    bctx.fillStyle = i % 2 === 0 ? 'rgba(205,205,205,0.08)' : 'rgba(60,60,60,0.08)';
    bctx.beginPath();
    bctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    bctx.fill();
  }

  // Traditional rural Maharashtra terracotta lower border band + delicate white chalk trim
  ctx.fillStyle = 'rgba(184, 78, 38, 0.24)';
  ctx.fillRect(0, size - 78, size, 78);
  ctx.fillStyle = 'rgba(255, 248, 238, 0.55)';
  ctx.fillRect(0, size - 82, size, 5);

  return { color, bump };
}

function createOchrePathCanvas(): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#D5A274';
  ctx.fillRect(0, 0, size, size);

  // Subtle warm sun-baked soil ripples & small Deccan pebbles
  for (let i = 0; i < 1600; i++) {
    const x = (i * 83) % size;
    const y = (i * 139) % size;
    const r = 1.8 + (i % 7);
    ctx.fillStyle =
      i % 4 === 0
        ? 'rgba(162, 92, 50, 0.2)'
        : i % 4 === 1
          ? 'rgba(248, 222, 186, 0.22)'
          : i % 4 === 2
            ? 'rgba(128, 82, 52, 0.14)'
            : 'rgba(216, 152, 98, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.25, r * 0.85, (i % 6) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft darker path edges to ground trails naturally into meadow grass
  const edgeGrad = ctx.createLinearGradient(0, 0, size, 0);
  edgeGrad.addColorStop(0, 'rgba(128, 92, 54, 0.32)');
  edgeGrad.addColorStop(0.12, 'rgba(128, 92, 54, 0)');
  edgeGrad.addColorStop(0.88, 'rgba(128, 92, 54, 0)');
  edgeGrad.addColorStop(1, 'rgba(128, 92, 54, 0.32)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}

function createMeadowGrassCanvas(): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#739A55';
  ctx.fillRect(0, 0, size, size);

  // Painterly dappled meadow base patches
  for (let i = 0; i < 160; i++) {
    const x = (i * 97) % size;
    const y = (i * 151) % size;
    const r = 18 + (i % 42);
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(146, 178, 88, 0.18)'
        : i % 3 === 1
          ? 'rgba(66, 114, 62, 0.16)'
          : 'rgba(196, 170, 96, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stylized painterly grass blades & wildflower specks
  for (let i = 0; i < 2200; i++) {
    const x = (i * 47 + (i % 9) * 13) % size;
    const y = (i * 103 + (i % 11) * 7) % size;
    const h = 6 + (i % 11);
    ctx.strokeStyle =
      i % 5 === 0
        ? 'rgba(182, 206, 114, 0.34)'
        : i % 5 === 1
          ? 'rgba(54, 98, 56, 0.3)'
          : 'rgba(104, 146, 76, 0.28)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ((i % 5) - 2) * 1.4, y - h);
    ctx.stroke();
  }

  return canvas;
}

function createTeakWoodCanvas(): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#784727';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const wave = Math.sin(y * 0.14) * 14 + Math.cos(y * 0.045) * 11;
    ctx.fillStyle = `rgba(${Math.round(98 + wave)}, ${Math.round(54 + wave * 0.55)}, ${Math.round(28 + wave * 0.3)}, 0.5)`;
    ctx.fillRect(0, y, size, 2);
  }
  // Subtle wood knots & warm varnish sheen
  for (let k = 0; k < 5; k++) {
    const kx = 36 + k * 48;
    const ky = (k * 67 + 28) % size;
    ctx.strokeStyle = 'rgba(62, 32, 16, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 14, 5, 0.1, 0, Math.PI * 2);
    ctx.stroke();
  }
  return canvas;
}

function createCarvedStoneCanvas(): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#C9B59C';
  ctx.fillRect(0, 0, size, size);

  const rows = 6;
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 4;
    const colW = size / cols;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const delta = ((r * 7 + c * 11 + 20) % 18) - 9;
      ctx.fillStyle = `rgb(${198 + delta}, ${178 + delta}, ${152 + delta})`;
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
      ctx.strokeStyle = 'rgba(116, 98, 82, 0.38)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, colW - 2, rowH - 2);
    }
  }
  return canvas;
}

/**
 * Stylized animated-film feather texture for Bharari's deep blue & teal plumage
 * and warm saffron-orange chest.
 */
function createFeatherCanvas(
  baseHex: string,
  highlightHex: string,
  shadowHex: string,
): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const rows = 14;
  const cols = 10;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = -1; r <= rows; r++) {
    const shift = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const cx = c * colW + shift;
      const cy = r * rowH;

      // Soft overlapping feather scallop
      const grad = ctx.createRadialGradient(cx, cy - 3, 2, cx, cy, colW * 0.72);
      grad.addColorStop(0, highlightHex);
      grad.addColorStop(0.55, baseHex);
      grad.addColorStop(1, shadowHex);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, colW * 0.56, rowH * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Delicate central feather quill highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - rowH * 0.55);
      ctx.lineTo(cx, cy + rowH * 0.45);
      ctx.stroke();
    }
  }
  return canvas;
}

function createLeatherBagCanvas(): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#8A5130');
  grad.addColorStop(0.5, '#734024');
  grad.addColorStop(1, '#5A3019');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Fine pebbled leather grain
  for (let i = 0; i < 900; i++) {
    const x = (i * 59) % size;
    const y = (i * 97) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,215,175,0.06)' : 'rgba(35,16,8,0.09)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Warm cream saddle-stitching border
  ctx.strokeStyle = 'rgba(244, 214, 166, 0.72)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(14, 14, size - 28, size - 28);
  ctx.setLineDash([]);

  return canvas;
}

function createChalkboardCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#203E32';
  ctx.fillRect(0, 0, 512, 256);

  // Soft chalk dust haze from erasing
  const dust = ctx.createRadialGradient(256, 128, 20, 256, 128, 240);
  dust.addColorStop(0, 'rgba(255, 255, 255, 0.11)');
  dust.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = dust;
  ctx.fillRect(0, 0, 512, 256);

  // Top chalk border line & rural date header
  ctx.strokeStyle = 'rgba(255, 248, 232, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(22, 42);
  ctx.lineTo(490, 42);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 244, 214, 0.9)';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('SU-PRABHAT  •  CLASS 4', 28, 30);

  // Elementary alphabet & math sums in warm chalk
  ctx.fillStyle = 'rgba(255, 250, 238, 0.92)';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('A   B   C   D', 32, 96);
  ctx.fillStyle = 'rgba(255, 224, 152, 0.92)';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('2 + 3 = 5', 36, 148);
  ctx.fillText('4 x 2 = 8', 36, 192);

  // Chalk drawing of sun, village tree, and hills on right half
  ctx.strokeStyle = 'rgba(255, 238, 178, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(412, 92, 22, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(412 + Math.cos(a) * 28, 92 + Math.sin(a) * 28);
    ctx.lineTo(412 + Math.cos(a) * 38, 92 + Math.sin(a) * 38);
    ctx.stroke();
  }

  // Little chalk hills & tree
  ctx.strokeStyle = 'rgba(220, 248, 225, 0.85)';
  ctx.beginPath();
  ctx.moveTo(260, 212);
  ctx.quadraticCurveTo(324, 154, 386, 212);
  ctx.quadraticCurveTo(436, 168, 486, 212);
  ctx.stroke();

  // Simple triangle geometry diagram
  ctx.strokeStyle = 'rgba(176, 232, 255, 0.88)';
  ctx.beginPath();
  ctx.moveTo(270, 146);
  ctx.lineTo(318, 146);
  ctx.lineTo(294, 98);
  ctx.closePath();
  ctx.stroke();

  return canvas;
}

function createEducationalChart1Canvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Cream laminated classroom poster
  ctx.fillStyle = '#FDF4DE';
  ctx.fillRect(0, 0, 256, 320);

  // Header band (saffron/terracotta)
  ctx.fillStyle = '#D85A2A';
  ctx.fillRect(10, 10, 236, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLAR SYSTEM & LETTERS', 128, 36);

  // Mini solar system diagram
  ctx.fillStyle = '#1B3A5C';
  ctx.fillRect(18, 60, 220, 104);
  ctx.fillStyle = '#F7B733';
  ctx.beginPath();
  ctx.arc(54, 112, 18, 0, Math.PI * 2);
  ctx.fill();

  const planets = [
    { x: 96, r: 5, c: '#C6B79B' },
    { x: 122, r: 7, c: '#E69F52' },
    { x: 152, r: 8, c: '#3C9CD6' },
    { x: 184, r: 6, c: '#D85E3B' },
    { x: 214, r: 10, c: '#E8B872' },
  ];
  for (const p of planets) {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, 112, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Colourful alphabet tiles below
  const tileColors = ['#E86B3B', '#2E8B7A', '#E3A42B', '#3E6DB5', '#7B54A4', '#569A42'];
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  ctx.font = 'bold 20px sans-serif';
  for (let i = 0; i < 12; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const tx = 18 + col * 56;
    const ty = 178 + row * 42;
    ctx.fillStyle = tileColors[i % tileColors.length];
    ctx.fillRect(tx, ty, 48, 34);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(letters[i], tx + 24, ty + 24);
  }

  ctx.strokeStyle = '#3A5844';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 312);
  return canvas;
}

function createEducationalChart2Canvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FBF7EA';
  ctx.fillRect(0, 0, 256, 320);

  // Header band (deep teal)
  ctx.fillStyle = '#186E78';
  ctx.fillRect(10, 10, 236, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OUR NATURE & TREES', 128, 36);

  // Stylized tree & water cycle illustration
  ctx.fillStyle = '#CFEBF5';
  ctx.fillRect(18, 60, 220, 146);

  // Green hills
  ctx.fillStyle = '#6FA64D';
  ctx.beginPath();
  ctx.moveTo(18, 206);
  ctx.quadraticCurveTo(88, 152, 146, 186);
  ctx.quadraticCurveTo(192, 162, 238, 182);
  ctx.lineTo(238, 206);
  ctx.closePath();
  ctx.fill();

  // Blue stream
  ctx.fillStyle = '#3B9AC4';
  ctx.fillRect(114, 180, 34, 26);

  // Illustrated leafy tree
  ctx.fillStyle = '#6E492D';
  ctx.fillRect(66, 134, 14, 44);
  ctx.fillStyle = '#3D843B';
  ctx.beginPath();
  ctx.arc(73, 122, 28, 0, Math.PI * 2);
  ctx.fill();

  // Sun & cloud
  ctx.fillStyle = '#F7B733';
  ctx.beginPath();
  ctx.arc(196, 88, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(124, 88, 14, 0, Math.PI * 2);
  ctx.arc(140, 84, 17, 0, Math.PI * 2);
  ctx.arc(156, 89, 13, 0, Math.PI * 2);
  ctx.fill();

  // Neat legend bars
  ctx.textAlign = 'left';
  const labels = ['1. Plant Native Trees', '2. Save Rainwater', '3. Keep Village Clean'];
  ctx.font = 'bold 15px sans-serif';
  for (let i = 0; i < labels.length; i++) {
    ctx.fillStyle = '#2B4236';
    ctx.fillText(labels[i], 24, 238 + i * 28);
  }

  ctx.strokeStyle = '#C96832';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 312);
  return canvas;
}

function createSchoolNameplateCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Authentic rural Maharashtra Zilla Parishad painted plaster board
  ctx.fillStyle = '#FFF5DF';
  ctx.fillRect(0, 0, 512, 128);

  // Terracotta & marigold decorative border
  ctx.strokeStyle = '#C74F27';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.strokeStyle = '#E89B2D';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, 480, 96);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#19496B';
  ctx.font = 'bold 31px sans-serif';
  ctx.fillText('Z. P. PRIMARY SCHOOL', 256, 58);

  ctx.fillStyle = '#B8451F';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('GARAD VILLAGE  •  MISSION BHARARI', 256, 94);

  return canvas;
}

function createFireflyGlowCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');
  grad.addColorStop(0.28, 'rgba(245, 255, 190, 0.82)');
  grad.addColorStop(0.62, 'rgba(210, 240, 120, 0.28)');
  grad.addColorStop(1.0, 'rgba(180, 220, 80, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}

function createContactShadowCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(43, 30, 20, 0.5)');
  grad.addColorStop(0.55, 'rgba(43, 30, 20, 0.2)');
  grad.addColorStop(1, 'rgba(43, 30, 20, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

function createGoldenSkyCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  // Crisp sunlit Deccan morning sky transitioning into luminous Sahyadri golden hour
  grad.addColorStop(0.0, '#3D8CB5');
  grad.addColorStop(0.22, '#73BCD8');
  grad.addColorStop(0.4, '#C5E1E5');
  grad.addColorStop(0.5, '#F5E7CE');
  grad.addColorStop(0.57, '#FDE0AF');
  grad.addColorStop(0.64, '#F7BE7C');
  grad.addColorStop(0.76, '#DCA97A');
  grad.addColorStop(1.0, '#9A7D64');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Soft sunlit cirrus streaks across the upper morning sky
  for (let i = 0; i < 18; i++) {
    const cx = (i * 73 + 60) % 980;
    const cy = 95 + (i % 5) * 28;
    const rx = 55 + (i % 4) * 32;
    const ry = 6 + (i % 3) * 4;
    const cGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
    cGrad.addColorStop(0, 'rgba(255, 250, 240, 0.24)');
    cGrad.addColorStop(1, 'rgba(255, 250, 240, 0)');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, -0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radiant golden morning sun disc & warm atmospheric bloom
  const sunX = 720;
  const sunY = 256;
  const outerHalo = ctx.createRadialGradient(sunX, sunY, 16, sunX, sunY, 240);
  outerHalo.addColorStop(0, 'rgba(255, 252, 232, 0.96)');
  outerHalo.addColorStop(0.16, 'rgba(255, 236, 178, 0.72)');
  outerHalo.addColorStop(0.45, 'rgba(255, 206, 134, 0.28)');
  outerHalo.addColorStop(1, 'rgba(255, 198, 120, 0)');
  ctx.fillStyle = outerHalo;
  ctx.fillRect(0, 0, 1024, 512);

  return canvas;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const terracotta = createTerracottaCanvases();
  const plaster = createWarmPlasterCanvases();

  const terracottaTiles = finalizeColorTexture(terracotta.color, maxAnisotropy, 3, 2);
  const terracottaBump = finalizeDataTexture(terracotta.bump, maxAnisotropy, 3, 2);
  const warmPlaster = finalizeColorTexture(plaster.color, maxAnisotropy, 2, 1);
  const plasterBump = finalizeDataTexture(plaster.bump, maxAnisotropy, 2, 1);
  const ochrePath = finalizeColorTexture(createOchrePathCanvas(), maxAnisotropy, 6, 6);
  const meadowGrass = finalizeColorTexture(createMeadowGrassCanvas(), maxAnisotropy, 22, 22);
  const teakWood = finalizeColorTexture(createTeakWoodCanvas(), maxAnisotropy, 1, 2);
  const carvedStone = finalizeColorTexture(createCarvedStoneCanvas(), maxAnisotropy, 2, 1);

  const featherBlue = finalizeColorTexture(
    createFeatherCanvas('#175680', '#2A8BAE', '#0F3654'),
    maxAnisotropy,
    2,
    2,
  );
  const featherOrange = finalizeColorTexture(
    createFeatherCanvas('#E96C2C', '#F9A94B', '#BD4618'),
    maxAnisotropy,
    2,
    2,
  );
  const leatherBag = finalizeColorTexture(createLeatherBagCanvas(), maxAnisotropy, 1, 1);

  const chalkboard = new THREE.CanvasTexture(createChalkboardCanvas());
  chalkboard.colorSpace = THREE.SRGBColorSpace;
  chalkboard.anisotropy = Math.min(maxAnisotropy, 8);

  const educationalChart1 = new THREE.CanvasTexture(createEducationalChart1Canvas());
  educationalChart1.colorSpace = THREE.SRGBColorSpace;
  educationalChart1.anisotropy = Math.min(maxAnisotropy, 8);

  const educationalChart2 = new THREE.CanvasTexture(createEducationalChart2Canvas());
  educationalChart2.colorSpace = THREE.SRGBColorSpace;
  educationalChart2.anisotropy = Math.min(maxAnisotropy, 8);

  const schoolNameplate = new THREE.CanvasTexture(createSchoolNameplateCanvas());
  schoolNameplate.colorSpace = THREE.SRGBColorSpace;
  schoolNameplate.anisotropy = Math.min(maxAnisotropy, 8);

  const fireflyGlow = new THREE.CanvasTexture(createFireflyGlowCanvas());
  fireflyGlow.colorSpace = THREE.SRGBColorSpace;

  const contactShadow = new THREE.CanvasTexture(createContactShadowCanvas());
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  const skyDome = new THREE.CanvasTexture(createGoldenSkyCanvas());
  skyDome.colorSpace = THREE.SRGBColorSpace;
  skyDome.wrapS = THREE.ClampToEdgeWrapping;
  skyDome.wrapT = THREE.ClampToEdgeWrapping;

  return {
    terracottaTiles,
    terracottaBump,
    warmPlaster,
    plasterBump,
    ochrePath,
    meadowGrass,
    teakWood,
    carvedStone,
    featherBlue,
    featherOrange,
    leatherBag,
    chalkboard,
    educationalChart1,
    educationalChart2,
    schoolNameplate,
    fireflyGlow,
    contactShadow,
    skyDome,
    dispose: () => {
      terracottaTiles.dispose();
      terracottaBump.dispose();
      warmPlaster.dispose();
      plasterBump.dispose();
      ochrePath.dispose();
      meadowGrass.dispose();
      teakWood.dispose();
      carvedStone.dispose();
      featherBlue.dispose();
      featherOrange.dispose();
      leatherBag.dispose();
      chalkboard.dispose();
      educationalChart1.dispose();
      educationalChart2.dispose();
      schoolNameplate.dispose();
      fireflyGlow.dispose();
      contactShadow.dispose();
      skyDome.dispose();
    },
  };
}

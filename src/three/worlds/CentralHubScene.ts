import * as THREE from 'three';
import { WORLD_PORTALS, WORLD_PORTALS_BY_ID } from '../../data/worldPortalsData';
import type {
  IBharariCharacter,
  PortalId,
  WorldProximityPrompt,
} from '../../types/universe';
import type { TimeOfDaySystem } from '../environment/timeOfDaySystem';
import type { WindSystem } from '../environment/windSystem';
import type { ProceduralTextureSet } from '../textures';
import type { WorldObstacle } from './FirstPersonExplorerController';

export interface HubPortalTarget {
  id: PortalId;
  center: THREE.Vector3;
  markerAnchor: THREE.Vector3;
  entryPoint: THREE.Vector3;
  facingYaw: number;
}

export interface HubProximityState {
  approachingPortal: PortalId | null;
  prompt: WorldProximityPrompt | null;
}

interface PortalRig {
  id: PortalId;
  group: THREE.Group;
  center: THREE.Vector3;
  markerAnchor: THREE.Vector3;
  entryPoint: THREE.Vector3;
  guidePerch: THREE.Vector3;
  flyThroughEnd: THREE.Vector3;
  facingYaw: number;
  veilMat: THREE.ShaderMaterial;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  ringMat: THREE.MeshStandardMaterial;
  dioramaGroup: THREE.Group;
  motes: THREE.Points;
  baseColor: THREE.Color;
  glowIntensity: number;
  veilIntensity: number;
}

interface ButterflyAgent {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  radius: number;
  baseY: number;
  speed: number;
  phase: number;
}

interface DistantBirdAgent {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  orbitR: number;
  height: number;
  speed: number;
  phase: number;
}

type HubBharariMode = 'welcome' | 'idle' | 'guide-portal' | 'fly-through' | 'welcome-back';

// Reusable scratch objects (zero per-frame GC allocations)
const _vGoal = new THREE.Vector3();
const _vToGoal = new THREE.Vector3();
const _vLook = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

// Landing terrace coordinate (matches CloudArrivalScene.getLandingSpawn())
const LANDING_Z = 12.2;
const PLAZA_Z = 3.6;

function createPortalSignTexture(
  title: string,
  subtitle: string,
  accentHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Rich carved antique teak & dark sandstone lintel plaque
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#52301B');
  grad.addColorStop(0.45, '#3D2212');
  grad.addColorStop(1, '#29160B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);

  // Subtle hand-planed woodgrain lines
  ctx.strokeStyle = 'rgba(255, 224, 178, 0.06)';
  ctx.lineWidth = 1.5;
  for (let y = 12; y < 120; y += 9) {
    ctx.beginPath();
    ctx.moveTo(8, y);
    ctx.bezierCurveTo(170, y + 2, 340, y - 2, 504, y);
    ctx.stroke();
  }

  // Carved outer bevel & brass inlay border
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 108);

  ctx.strokeStyle = 'rgba(255, 236, 194, 0.34)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(18, 18, 476, 92);

  // Corner brass rosettes
  const corners = [
    [24, 24],
    [488, 24],
    [24, 104],
    [488, 104],
  ];
  ctx.fillStyle = accentHex;
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFF6DF';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(title, 256, 62);

  ctx.fillStyle = '#F2CE8A';
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText(subtitle, 256, 94);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createLandingSunStoneTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = 256;
  const cy = 256;

  // Warm weathered sandstone base with natural radial shading
  const baseGrad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 256);
  baseGrad.addColorStop(0, '#E2CAA2');
  baseGrad.addColorStop(0.55, '#D2B790');
  baseGrad.addColorStop(0.86, '#C2A57E');
  baseGrad.addColorStop(1, '#AE906B');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle carved sandstone grain speckles
  let seed = 9183;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 650; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 3.5;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,244,218,0.12)' : 'rgba(105,78,50,0.1)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flagstone radial masonry joints in outer ring
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.strokeStyle = 'rgba(116, 86, 56, 0.42)';
    ctx.lineWidth = i % 2 === 0 ? 3 : 1.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 92, cy + Math.sin(a) * 92);
    ctx.lineTo(cx + Math.cos(a) * 244, cy + Math.sin(a) * 244);
    ctx.stroke();
  }

  // Concentric chiseled sandstone rings
  const rings = [244, 212, 152, 92];
  for (let i = 0; i < rings.length; i++) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(116, 84, 54, 0.56)' : 'rgba(250, 236, 206, 0.44)';
    ctx.lineWidth = i === 0 ? 8 : 4;
    ctx.beginPath();
    ctx.arc(cx, cy, rings[i], 0, Math.PI * 2);
    ctx.stroke();
  }

  // Stylized lotus petal carvings around central sun medallion
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(232, 189, 118, 0.48)';
    ctx.strokeStyle = 'rgba(130, 92, 54, 0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.quadraticCurveTo(16, -74, 0, -90);
    ctx.quadraticCurveTo(-16, -74, 0, -52);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Warm central Garad sun medallion
  const centerGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 56);
  centerGrad.addColorStop(0, '#F0C67B');
  centerGrad.addColorStop(0.68, '#D29E5E');
  centerGrad.addColorStop(1, '#B48249');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 56, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 240, 204, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an alpha-tested painterly botanical leaf-cluster texture
 * so tree canopies & pergola vines read as organic sunlit foliage instead of geometric spheres.
 */
function createLeafClusterTexture(variant: 'neem' | 'gulmohar' | 'vine'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  let seed = variant === 'neem' ? 3041 : variant === 'gulmohar' ? 7719 : 5113;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const palettes: Record<typeof variant, string[]> = {
    neem: ['#25532E', '#316A39', '#417F44', '#56944D', '#6FA856', '#8BBD64'],
    gulmohar: ['#3A6D39', '#A83219', '#D64C23', '#EB662A', '#F48A34', '#FAAC4B'],
    vine: ['#295B32', '#3B7840', '#4E8F4A', '#69A858', '#E9982E', '#F8BC48'],
  };
  const colors = palettes[variant];

  // Subtle dark interior twigs
  ctx.strokeStyle = 'rgba(72, 46, 28, 0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.cos(a) * 62, 128 + Math.sin(a) * 62);
    ctx.stroke();
  }

  // Layered shaded-to-sunlit organic leaves
  const leafCount = variant === 'vine' ? 44 : 58;
  for (let i = 0; i < leafCount; i++) {
    const t = i / leafCount; // back shaded leaves first, sunlit highlights last
    const angle = rand() * Math.PI * 2;
    const dist = Math.pow(rand(), 0.72) * 84;
    const lx = 128 + Math.cos(angle) * dist;
    const ly = 128 + Math.sin(angle) * dist - t * 10;
    const rx = 14 + rand() * 14;
    const ry = 7 + rand() * 7;
    const rot = angle + (rand() - 0.5) * 1.1;

    const colorIdx = Math.min(
      colors.length - 1,
      Math.floor(t * colors.length * 0.85 + rand() * 1.2),
    );
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.fillStyle = colors[colorIdx];
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle sunlit leaf midrib highlight on upper leaves
    if (t > 0.55) {
      ctx.strokeStyle = 'rgba(255, 248, 210, 0.24)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.65, 0);
      ctx.lineTo(rx * 0.65, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(22, 30, 18, 0.42)');
  grad.addColorStop(0.52, 'rgba(26, 36, 20, 0.20)');
  grad.addColorStop(1, 'rgba(26, 36, 20, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createPainterlyHorizonCloudTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const drawLobe = (x: number, y: number, r: number, inner: string, mid: string) => {
    const g = ctx.createRadialGradient(x - r * 0.12, y - r * 0.2, r * 0.1, x, y, r);
    g.addColorStop(0, inner);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, 'rgba(245, 248, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Cool shaded cloud undersides for natural volume against blue sky
  drawLobe(185, 168, 86, 'rgba(154, 176, 204, 0.56)', 'rgba(138, 162, 194, 0.26)');
  drawLobe(290, 170, 92, 'rgba(154, 176, 204, 0.58)', 'rgba(138, 162, 194, 0.26)');
  drawLobe(375, 168, 70, 'rgba(156, 178, 206, 0.46)', 'rgba(140, 164, 194, 0.20)');

  // Soft warm parchment sunlit cloud tops (never glaring pure white)
  drawLobe(148, 140, 72, 'rgba(236, 232, 224, 0.78)', 'rgba(210, 218, 228, 0.36)');
  drawLobe(232, 116, 94, 'rgba(242, 238, 230, 0.84)', 'rgba(216, 222, 230, 0.42)');
  drawLobe(318, 122, 86, 'rgba(238, 234, 224, 0.80)', 'rgba(212, 218, 226, 0.36)');
  drawLobe(392, 146, 62, 'rgba(232, 228, 220, 0.68)', 'rgba(206, 214, 224, 0.28)');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Custom animated GLSL portal shimmer veil:
 * Uses soft translucent NormalBlending with controlled intensity so portal interiors
 * feel genuinely magical without overexposing or obscuring the 3D architecture & diorama.
 */
function createPortalEnergyShader(innerHex: string, outerHex: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.42 },
      uInnerColor: { value: new THREE.Color(innerHex) },
      uOuterColor: { value: new THREE.Color(outerHex) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uInnerColor;
      uniform vec3 uOuterColor;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;

        float angle = atan(p.y, p.x);

        // Gentle organic ribbon harmonics along the arch perimeter
        float waveA = sin(angle * 4.0 - uTime * 1.25 + r * 6.0) * 0.5 + 0.5;
        float waveB = sin(angle * 7.0 + uTime * 0.95 - r * 9.0) * 0.5 + 0.5;
        float shimmer = mix(waveA, waveB, 0.45);

        // Clear central aperture so the miniature 3D world glimpse reads crisply
        float rimBand = smoothstep(0.62, 0.91, r) * (1.0 - smoothstep(0.92, 1.0, r));
        float innerMist = (1.0 - smoothstep(0.0, 0.72, r)) * 0.05 * (0.7 + 0.3 * sin(vUv.y * 7.0 - uTime * 1.4));

        // Subtle shimmer specks tucked along the outer ring
        float spark = pow(max(0.0, sin(angle * 13.0 + uTime * 0.7) * sin(r * 16.0 - uTime * 1.8)), 7.0) * rimBand;

        vec3 col = mix(uInnerColor, uOuterColor, smoothstep(0.48, 0.95, r));
        col += vec3(0.98, 0.94, 0.82) * spark * 0.35;

        float alpha = (rimBand * (0.36 + 0.28 * shimmer) + innerMist + spark * 0.24) * uIntensity;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.72));
      }
    `,
  });
}

/**
 * Controlled subtle amber theatrical stage cone shader for Abhivyaktā's amphitheatre archway.
 */
function createStageBeamShader(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#E0A24C') },
      uOpacity: { value: 0.045 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(abs(dot(vNormalView, vViewDir)), 1.85);
        float verticalFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.14, vUv.y);
        float pulse = 0.90 + 0.10 * sin(uTime * 1.2 + vUv.x * 6.2831);
        float alpha = fresnel * verticalFade * pulse * uOpacity;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}

/**
 * Builds a crossed 3-blade curved grass tuft BufferGeometry (single draw-call via InstancedMesh).
 */
function createGrassTuftGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const bladeDefs = [
    { rotY: 0, tilt: 0.12, h: 0.44, w: 0.065, ox: 0, oz: 0 },
    { rotY: (Math.PI * 2) / 3 + 0.18, tilt: 0.17, h: 0.38, w: 0.06, ox: 0.04, oz: -0.02 },
    { rotY: (Math.PI * 4) / 3 - 0.12, tilt: 0.15, h: 0.41, w: 0.058, ox: -0.03, oz: 0.03 },
    { rotY: Math.PI / 3, tilt: 0.22, h: 0.31, w: 0.052, ox: 0.02, oz: 0.04 },
  ];

  let vOffset = 0;
  for (const b of bladeDefs) {
    const c = Math.cos(b.rotY);
    const s = Math.sin(b.rotY);
    const segs = 3;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const halfW = b.w * (1 - t * 0.88);
      const y = b.h * t;
      const bend = b.tilt * t * t;
      const nx = -s;
      const nz = c;

      // Left vertex
      const lx = b.ox + c * -halfW + -s * bend;
      const lz = b.oz + s * -halfW + c * bend;
      positions.push(lx, y, lz);
      normals.push(nx, 0.35, nz);
      uvs.push(0, t);

      // Right vertex
      const rx = b.ox + c * halfW + -s * bend;
      const rz = b.oz + s * halfW + c * bend;
      positions.push(rx, y, rz);
      normals.push(nx, 0.35, nz);
      uvs.push(1, t);
    }

    for (let i = 0; i < segs; i++) {
      const a = vOffset + i * 2;
      const d = a + 1;
      const bIdx = a + 2;
      const cIdx = a + 3;
      indices.push(a, d, bIdx, d, cIdx, bIdx);
    }
    vOffset += (segs + 1) * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a stylized 5-petal wildflower blossom geometry for instanced meadow blooms.
 */
function createWildflowerGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  // Center vertex slightly cupped
  positions.push(0, 0.015, 0);
  const petals = 5;
  for (let i = 0; i < petals; i++) {
    const a0 = (i / petals) * Math.PI * 2;
    const aMid = a0 + Math.PI / petals;
    const a1 = ((i + 1) / petals) * Math.PI * 2;

    const rInner = 0.04;
    const rOuter = 0.125;
    const baseIdx = positions.length / 3;

    positions.push(Math.cos(a0) * rInner, 0.025, Math.sin(a0) * rInner);
    positions.push(Math.cos(aMid) * rOuter, 0.048, Math.sin(aMid) * rOuter);
    positions.push(Math.cos(a1) * rInner, 0.025, Math.sin(a1) * rInner);

    indices.push(0, baseIdx, baseIdx + 1);
    indices.push(0, baseIdx + 1, baseIdx + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Evaluates smooth organic terrain height on the Central Hub plateau:
 * - Strictly flat (y = 0) across the entire walkable inner sanctuary (r <= 17.6m)
 * - Gentle rolling sunlit meadow berms near the outer edge (r = 17.6..23.5m)
 * - Soft downward shoulder into the basalt cliff rim beyond r = 23.5m
 */
function sampleIslandMeadowHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r <= 17.6) return 0;
  const angle = Math.atan2(z, x);
  const bermFade = THREE.MathUtils.smoothstep(r, 17.6, 21.8);
  const edgeDrop = THREE.MathUtils.smoothstep(r, 22.8, 24.8);
  const undulation =
    0.42 +
    0.26 * Math.sin(angle * 3.0 + 0.6) +
    0.16 * Math.cos(angle * 5.0 - 0.9) +
    0.09 * Math.sin(angle * 8.0 + 1.4);
  return bermFade * undulation * (1 - edgeDrop) - edgeDrop * 0.45;
}

/**
 * The Central Hub Island ("THE WORLD OF LITTLE DREAMS").
 * Stage 2 Visual Quality Upgrade:
 *  - Sculpted organic meadow terrain with painterly vertex coloring & terraced Deccan basalt cliffs
 *  - Continuous 3-layer atmospheric Sahyadri mountain ridges + painterly drifting sky clouds
 *  - Hand-laid weathered sandstone landing terrace (at z = 12.2) & curved flagstone walkways
 *  - Three iconic architectural portals with custom GLSL shimmer & upgraded 3D world dioramas
 *  - Painterly multi-branch alpha-tested leaf-cluster trees (zero primitive dodecahedrons!)
 *  - Instanced multi-blade curved grass tufts, 5-petal wildflowers & grounded contact shadows
 *  - Natural airy hovering flight for Bharari companion
 */
export class CentralHubScene {
  public readonly group = new THREE.Group();

  private readonly portals: Record<PortalId, PortalRig>;
  private readonly obstacles: WorldObstacle[] = [];
  private readonly butterflies: ButterflyAgent[] = [];
  private readonly distantBirds: DistantBirdAgent[] = [];
  private readonly stageBeamMaterials: THREE.ShaderMaterial[] = [];
  private readonly pollenPoints: THREE.Points;
  private readonly cloudRingGroup = new THREE.Group();

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  private readonly contactShadowGeo: THREE.PlaneGeometry;
  private readonly contactShadowMat: THREE.MeshBasicMaterial;
  private readonly neemLeafTex: THREE.CanvasTexture;
  private readonly gulmoharLeafTex: THREE.CanvasTexture;
  private readonly vineLeafTex: THREE.CanvasTexture;

  // Purposeful Bharari Hub Guide State
  private bharariMode: HubBharariMode = 'welcome';
  private bharariTimer = 0;
  private bharariGuidePortal: PortalId | null = null;
  private bharariFlyPortal: PortalId | null = null;
  private bharariFlyProgress = 0;
  private readonly bharariPos = new THREE.Vector3(0.55, 2.2, 8.2);
  private bharariYaw = 0;
  private lastApproachingPortal: PortalId | null = null;

  constructor(
    sharedTextures: ProceduralTextureSet,
    wind: WindSystem,
    timeOfDay: TimeOfDaySystem,
    isSoftwareGl: boolean,
  ) {
    this.group.name = 'CentralHubIsland';
    this.group.visible = false;

    // Shared painterly foliage & contact shadow assets
    const shadowTex = this.trackTex(createContactShadowTexture());
    this.contactShadowGeo = this.trackGeo(new THREE.PlaneGeometry(1, 1));
    this.contactShadowGeo.rotateX(-Math.PI / 2);
    this.contactShadowMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );

    this.neemLeafTex = this.trackTex(createLeafClusterTexture('neem'));
    this.gulmoharLeafTex = this.trackTex(createLeafClusterTexture('gulmohar'));
    this.vineLeafTex = this.trackTex(createLeafClusterTexture('vine'));

    // 1. Sculpted Organic Sanctuary Plateau, Terraced Basalt Cliffs & Continuous Sahyadri Horizon
    this.buildIslandTerrain(sharedTextures);
    this.buildDistantSahyadriHorizon();

    // 2. Carved Sandstone Landing Terrace (z = 12.2) & Curved Weathered Flagstone Paths
    this.buildLandingPlatformAndPaths(sharedTextures);

    // 3. Three Iconic Architectural Portals with Custom GLSL Shimmer & Upgraded 3D Dioramas
    const missionRig = this.buildPortalGateway(
      'mission-bharari',
      new THREE.Vector3(-9.4, 0, -2.0),
      0.56,
      sharedTextures,
      wind,
      timeOfDay,
    );
    const abhiRig = this.buildPortalGateway(
      'abhivyakta',
      new THREE.Vector3(0, 0, -6.0),
      0,
      sharedTextures,
      wind,
      timeOfDay,
    );
    const sankalpRig = this.buildPortalGateway(
      'sankalp',
      new THREE.Vector3(9.4, 0, -2.0),
      -0.56,
      sharedTextures,
      wind,
      timeOfDay,
    );

    this.portals = {
      'mission-bharari': missionRig,
      abhivyakta: abhiRig,
      sankalp: sankalpRig,
    };

    // 4. Painterly Multi-Branch Trees, Sanctuary Lanterns & Lush Instanced Meadow
    this.buildTreesAndLanterns(sharedTextures, wind, timeOfDay);
    this.buildInstancedMeadow(wind, isSoftwareGl);

    // 5. Living Atmosphere: Butterflies, Soaring Distant Birds & Subtle Sunlit Motes
    this.buildButterfliesAndBirds(isSoftwareGl);
    this.pollenPoints = this.buildSunlitMotes(sharedTextures, isSoftwareGl);
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

  private addContactShadow(
    parent: THREE.Object3D,
    x: number,
    z: number,
    scaleX: number,
    scaleZ = scaleX,
    y = 0.014,
  ): void {
    const decal = new THREE.Mesh(this.contactShadowGeo, this.contactShadowMat);
    decal.position.set(x, y, z);
    decal.scale.set(scaleX, 1, scaleZ);
    parent.add(decal);
  }

  private buildIslandTerrain(sharedTextures: ProceduralTextureSet): void {
    // Sculpted polar meadow disc (22 radial rings x 64 angular segments) for organic outer berms
    const radialSegs = 22;
    const angularSegs = 64;
    const maxRadius = 24.8;

    const positions: number[] = [0, 0, 0];
    const uvs: number[] = [0.5, 0.5];
    const colors: number[] = [0.42, 0.56, 0.30]; // Natural grounded olive meadow center
    const indices: number[] = [];

    const colSunlit = new THREE.Color('#648445');
    const colLush = new THREE.Color('#476835');
    const colRimMoss = new THREE.Color('#637047');
    const colPathSoil = new THREE.Color('#9C8D6B');
    const tmpCol = new THREE.Color();

    for (let rIdx = 1; rIdx <= radialSegs; rIdx++) {
      const rFrac = rIdx / radialSegs;
      const r = rFrac * maxRadius;
      for (let aIdx = 0; aIdx < angularSegs; aIdx++) {
        const a = (aIdx / angularSegs) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const y = sampleIslandMeadowHeight(x, z);

        positions.push(x, y, z);
        uvs.push(x / 10.5, z / 10.5);

        // Organic painterly terrain color variation (warmer sunny core, deeper foliage shade at perimeter)
        const patch = 0.5 + 0.5 * Math.sin(x * 0.24 + z * 0.19) * Math.cos(x * 0.14 - z * 0.28);
        tmpCol.copy(colSunlit).lerp(colLush, THREE.MathUtils.clamp(patch * 0.65 + rFrac * 0.35, 0, 1));
        if (rFrac > 0.82) {
          tmpCol.lerp(colRimMoss, (rFrac - 0.82) / 0.18);
        }
        // Subtle sunlit warmth around central plaza & walkways
        const dPlaza = Math.hypot(x, z - PLAZA_Z);
        if (dPlaza < 6.5) {
          tmpCol.lerp(colPathSoil, (1 - dPlaza / 6.5) * 0.16);
        }
        colors.push(tmpCol.r, tmpCol.g, tmpCol.b);
      }
    }

    // Center fan
    for (let aIdx = 0; aIdx < angularSegs; aIdx++) {
      const next = (aIdx + 1) % angularSegs;
      indices.push(0, 1 + next, 1 + aIdx);
    }
    // Outer rings
    for (let rIdx = 1; rIdx < radialSegs; rIdx++) {
      const rowA = 1 + (rIdx - 1) * angularSegs;
      const rowB = 1 + rIdx * angularSegs;
      for (let aIdx = 0; aIdx < angularSegs; aIdx++) {
        const next = (aIdx + 1) % angularSegs;
        indices.push(rowA + aIdx, rowA + next, rowB + next);
        indices.push(rowA + aIdx, rowB + next, rowB + aIdx);
      }
    }

    const meadowGeo = this.trackGeo(new THREE.BufferGeometry());
    meadowGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    meadowGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    meadowGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    meadowGeo.setIndex(indices);
    meadowGeo.computeVertexNormals();

    const meadowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.meadowGrass,
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.0,
      }),
    );
    const meadowMesh = new THREE.Mesh(meadowGeo, meadowMat);
    meadowMesh.receiveShadow = true;
    this.group.add(meadowMesh);

    // Sculpted terraced Deccan basalt & warm ochre cliff underside (organic stratified rock)
    const cliffUpperGeo = this.trackGeo(new THREE.CylinderGeometry(24.7, 19.8, 6.0, 44, 6, true));
    const cPos = cliffUpperGeo.attributes.position;
    const cColors = new Float32Array(cPos.count * 3);
    const rockTop = new THREE.Color('#9E856B');
    const rockMid = new THREE.Color('#7E6853');
    const rockDeep = new THREE.Color('#5A4C40');

    for (let i = 0; i < cPos.count; i++) {
      const vx = cPos.getX(i);
      const vy = cPos.getY(i);
      const vz = cPos.getZ(i);
      const a = Math.atan2(vz, vx);
      const hNorm = (vy + 3.0) / 6.0; // 0 bottom .. 1 top
      const strata =
        1 +
        0.045 * Math.sin(a * 7 + vy * 1.1) +
        0.03 * Math.cos(a * 13 - vy * 1.6) +
        (hNorm > 0.78 ? 0.02 : 0);
      cPos.setX(i, vx * strata);
      cPos.setZ(i, vz * strata);

      tmpCol.copy(rockDeep).lerp(rockMid, THREE.MathUtils.smoothstep(hNorm, 0, 0.55));
      tmpCol.lerp(rockTop, THREE.MathUtils.smoothstep(hNorm, 0.5, 1.0));
      cColors[i * 3] = tmpCol.r;
      cColors[i * 3 + 1] = tmpCol.g;
      cColors[i * 3 + 2] = tmpCol.b;
    }
    cliffUpperGeo.setAttribute('color', new THREE.BufferAttribute(cColors, 3));
    cliffUpperGeo.computeVertexNormals();

    const cliffMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        vertexColors: true,
        roughness: 0.94,
        metalness: 0.0,
      }),
    );
    const cliffUpper = new THREE.Mesh(cliffUpperGeo, cliffMat);
    cliffUpper.position.y = -3.2;
    this.group.add(cliffUpper);

    const cliffLowerGeo = this.trackGeo(new THREE.ConeGeometry(20.0, 13.5, 28));
    const cliffLowerMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#695848',
        roughness: 0.96,
      }),
    );
    const cliffLower = new THREE.Mesh(cliffLowerGeo, cliffLowerMat);
    cliffLower.position.y = -12.8;
    cliffLower.rotation.x = Math.PI;
    this.group.add(cliffLower);

    // Sculpted weathered boulders lining the natural meadow rim (displaced icosahedra, never raw dodecahedrons)
    const rockGeo = this.trackGeo(new THREE.IcosahedronGeometry(0.85, 2));
    const rPos = rockGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const vx = rPos.getX(i);
      const vy = rPos.getY(i);
      const vz = rPos.getZ(i);
      const n =
        1 +
        0.16 * Math.sin(vx * 3.4 + vy * 2.1) +
        0.11 * Math.cos(vz * 4.2 - vx * 2.5);
      // Flatten underside slightly so boulders seat firmly into the grass
      const yScale = vy < 0 ? 0.58 : 0.88;
      rPos.setXYZ(i, vx * n, vy * n * yScale, vz * n);
    }
    rockGeo.computeVertexNormals();

    const rockMats = ['#A99780', '#968672', '#8B826E'].map((hex) =>
      this.trackMat(
        new THREE.MeshStandardMaterial({
          map: sharedTextures.carvedStone,
          color: hex,
          roughness: 0.91,
          metalness: 0.02,
        }),
      ),
    );

    const rimCount = 32;
    for (let i = 0; i < rimCount; i++) {
      const a = (i / rimCount) * Math.PI * 2 + 0.08;
      const r = 21.8 + Math.sin(i * 2.4) * 0.85;
      const rx = Math.cos(a) * r;
      const rz = Math.sin(a) * r;
      const ry = sampleIslandMeadowHeight(rx, rz);
      const stone = new THREE.Mesh(rockGeo, rockMats[i % rockMats.length]);
      const sx = 1.05 + (i % 3) * 0.34;
      const sy = 0.58 + (i % 2) * 0.28;
      const sz = 0.88 + (i % 4) * 0.22;
      stone.position.set(rx, ry + sy * 0.28, rz);
      stone.scale.set(sx, sy, sz);
      stone.rotation.y = a + i * 0.45;
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.group.add(stone);
      this.addContactShadow(this.group, rx, rz, sx * 2.1, sz * 2.1, ry + 0.02);
    }
  }

  private buildDistantSahyadriHorizon(): void {
    // 3 Continuous Sculpted Sahyadri Mountain Ridge Rings with Atmospheric Aerial Perspective
    const ridgeSpecs = [
      {
        radius: 74,
        baseY: -22,
        height: 22,
        segs: 96,
        seed: 1.1,
        lowHex: '#7A9B96',
        highHex: '#486A5F',
      },
      {
        radius: 102,
        baseY: -24,
        height: 30,
        segs: 108,
        seed: 2.7,
        lowHex: '#96B2BD',
        highHex: '#61828C',
      },
      {
        radius: 134,
        baseY: -26,
        height: 38,
        segs: 120,
        seed: 4.3,
        lowHex: '#B2C9D6',
        highHex: '#7F9DAE',
      },
    ];

    const colLow = new THREE.Color();
    const colHigh = new THREE.Color();
    const colMix = new THREE.Color();

    for (const spec of ridgeSpecs) {
      const geo = this.trackGeo(new THREE.CylinderGeometry(spec.radius, spec.radius * 1.06, spec.height, spec.segs, 4, true));
      const pos = geo.attributes.position;
      const vColors = new Float32Array(pos.count * 3);
      colLow.set(spec.lowHex);
      colHigh.set(spec.highHex);

      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        const a = Math.atan2(vz, vx);
        const hNorm = THREE.MathUtils.clamp((vy + spec.height * 0.5) / spec.height, 0, 1);

        // Western Ghats / Sahyadri ridge silhouette: broad terraced crests + gentle passes
        const ridgeProfile =
          0.52 +
          0.26 * Math.sin(a * 5 + spec.seed) +
          0.16 * Math.cos(a * 9 - spec.seed * 1.4) +
          0.09 * Math.sin(a * 15 + spec.seed * 2.1) +
          0.05 * Math.cos(a * 23 - spec.seed);
        // Subtle plateau flattening characteristic of Maharashtra's Sahyadri forts
        const sculptedH = Math.min(1.02, ridgeProfile * 1.08);
        const finalY = -spec.height * 0.5 + hNorm * spec.height * sculptedH;

        const radialWave = 1 + 0.045 * Math.sin(a * 7 + spec.seed) * hNorm;
        pos.setXYZ(i, vx * radialWave, finalY, vz * radialWave);

        // Mist-to-ridge vertical atmospheric gradient (valley mist at base, richer silhouette near peaks)
        colMix.copy(colLow).lerp(colHigh, Math.pow(hNorm, 0.85));
        vColors[i * 3] = colMix.r;
        vColors[i * 3 + 1] = colMix.g;
        vColors[i * 3 + 2] = colMix.b;
      }

      geo.setAttribute('color', new THREE.BufferAttribute(vColors, 3));
      geo.computeVertexNormals();

      const mat = this.trackMat(
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.96,
          metalness: 0.0,
          side: THREE.DoubleSide,
        }),
      );
      const ridgeMesh = new THREE.Mesh(geo, mat);
      ridgeMesh.position.y = spec.baseY + spec.height * 0.5;
      this.group.add(ridgeMesh);
    }

    // Painterly drifting horizon cloud bank encircling the valley below & around the plateau
    const cloudTex = this.trackTex(createPainterlyHorizonCloudTexture());
    const cloudMat = this.trackMat(
      new THREE.SpriteMaterial({
        map: cloudTex,
        color: '#DCE3EC',
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
      }),
    );

    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const dist = 46 + (i % 3) * 18;
      const sprite = new THREE.Sprite(cloudMat);
      const w = 24 + (i % 4) * 6;
      const h = w * 0.46;
      sprite.scale.set(w, h, 1);
      sprite.position.set(
        Math.cos(a) * dist,
        -4.5 + (i % 4) * 3.8 + (i % 5 === 0 ? 11.5 : 0),
        Math.sin(a) * dist,
      );
      this.cloudRingGroup.add(sprite);
    }
    this.group.add(this.cloudRingGroup);
  }

  private buildLandingPlatformAndPaths(sharedTextures: ProceduralTextureSet): void {
    // 1. Carved Sandstone Sun-Lotus Landing Terrace centered at (0, 0, LANDING_Z = 12.2)
    const sunStoneTex = this.trackTex(createLandingSunStoneTexture());
    const padMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sunStoneTex,
        roughness: 0.83,
        metalness: 0.02,
      }),
    );
    const pad = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(3.85, 4.25, 0.16, 48)), padMat);
    pad.position.set(0, 0.04, LANDING_Z);
    pad.receiveShadow = true;
    this.group.add(pad);

    // Bevelled outer sandstone kerb blocks + warm inlaid brass compass ring
    const kerbMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        color: '#C7AE8D',
        roughness: 0.88,
      }),
    );
    const kerbRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(3.96, 0.13, 10, 48)),
      kerbMat,
    );
    kerbRing.rotation.x = Math.PI / 2;
    kerbRing.position.set(0, 0.08, LANDING_Z);
    kerbRing.receiveShadow = true;
    this.group.add(kerbRing);

    const brassInlayMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#D8A246',
        roughness: 0.34,
        metalness: 0.78,
      }),
    );
    const compassRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(1.48, 0.032, 8, 40)),
      brassInlayMat,
    );
    compassRing.rotation.x = Math.PI / 2;
    compassRing.position.set(0, 0.125, LANDING_Z);
    this.group.add(compassRing);

    // 2. Central Gathering Compass Plaza at (0, 0, PLAZA_Z = 3.6) linking the three world paths
    const stonePalette = ['#C4AE8E', '#B89F7F', '#CBB696', '#AE9575'];
    const stoneMats = stonePalette.map((hex) =>
      this.trackMat(
        new THREE.MeshStandardMaterial({
          map: sharedTextures.carvedStone,
          color: hex,
          roughness: 0.87,
          metalness: 0.02,
        }),
      ),
    );

    const hubPlaza = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(3.15, 3.45, 0.12, 36)),
      stoneMats[0],
    );
    hubPlaza.position.set(0, 0.02, PLAZA_Z);
    hubPlaza.receiveShadow = true;
    this.group.add(hubPlaza);

    const hubInnerRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(2.15, 0.035, 8, 36)),
      brassInlayMat,
    );
    hubInnerRing.rotation.x = Math.PI / 2;
    hubInnerRing.position.set(0, 0.085, PLAZA_Z);
    this.group.add(hubInnerRing);

    // 3. Organic Hand-Laid Curved Flagstone Walkways + River-Pebble Borders
    const flagGeo = this.trackGeo(new THREE.CylinderGeometry(0.92, 1.04, 0.09, 9));
    const pebbleGeo = this.trackGeo(new THREE.DodecahedronGeometry(0.18, 1));
    const pebbleMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#9F907B',
        roughness: 0.92,
      }),
    );

    const placeCurvedPath = (
      p0: [number, number],
      pCtrl: [number, number],
      p1: [number, number],
      steps: number,
    ) => {
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const omt = 1 - t;
        const x = omt * omt * p0[0] + 2 * omt * t * pCtrl[0] + t * t * p1[0];
        const z = omt * omt * p0[1] + 2 * omt * t * pCtrl[1] + t * t * p1[1];
        const tx = 2 * omt * (pCtrl[0] - p0[0]) + 2 * t * (p1[0] - pCtrl[0]);
        const tz = 2 * omt * (pCtrl[1] - p0[1]) + 2 * t * (p1[1] - pCtrl[1]);
        const len = Math.hypot(tx, tz) || 1;
        const nx = -tz / len;
        const nz = tx / len;

        const stone = new THREE.Mesh(flagGeo, stoneMats[i % stoneMats.length]);
        const jitter = Math.sin(i * 2.1) * 0.12;
        stone.position.set(x + nx * jitter, 0.025, z + nz * jitter);
        stone.scale.set(1.06 + (i % 2) * 0.16, 1, 0.84 + (i % 3) * 0.08);
        stone.rotation.y = Math.atan2(tx, tz) + (i % 3 - 1) * 0.18;
        stone.receiveShadow = true;
        this.group.add(stone);

        // Subtle flanking river pebbles for artisanal handcrafted finish
        for (const side of [-1, 1]) {
          if ((i + (side > 0 ? 1 : 0)) % 2 !== 0) continue;
          const px = x + nx * side * (1.28 + (i % 2) * 0.18);
          const pz = z + nz * side * (1.28 + (i % 2) * 0.18);
          const peb = new THREE.Mesh(pebbleGeo, pebbleMat);
          peb.position.set(px, 0.05, pz);
          peb.scale.set(1.15, 0.52, 0.95);
          peb.rotation.y = i * 1.1;
          peb.receiveShadow = true;
          this.group.add(peb);
        }
      }
    };

    placeCurvedPath([0, LANDING_Z - 3.2], [0.25, 8.0], [0, PLAZA_Z + 2.4], 7);
    placeCurvedPath([-1.9, PLAZA_Z - 1.2], [-5.2, 1.5], [-8.0, -1.0], 8);
    placeCurvedPath([0, PLAZA_Z - 2.3], [-0.15, -0.5], [0, -4.6], 7);
    placeCurvedPath([1.9, PLAZA_Z - 1.2], [5.2, 1.5], [8.0, -1.0], 8);
  }

  private addBotanicalCluster(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    scale: number,
    mat: THREE.Material,
    cardCount = 5,
    seed = 1,
  ): void {
    const cluster = new THREE.Group();
    cluster.position.set(x, y, z);
    const cardGeo = this.trackGeo(new THREE.PlaneGeometry(scale, scale));
    for (let i = 0; i < cardCount; i++) {
      const m = new THREE.Mesh(cardGeo, mat);
      const a = (i / cardCount) * Math.PI * 2 + seed;
      m.position.set(Math.cos(a) * scale * 0.16, (i % 2 - 0.5) * scale * 0.14, Math.sin(a) * scale * 0.16);
      m.rotation.set(
        (i % 3 - 1) * 0.38,
        a + 0.5,
        ((i + 1) % 3 - 1) * 0.25,
      );
      m.castShadow = true;
      cluster.add(m);
    }
    parent.add(cluster);
  }

  private buildPortalGateway(
    id: PortalId,
    position: THREE.Vector3,
    facingYaw: number,
    sharedTextures: ProceduralTextureSet,
    wind: WindSystem,
    timeOfDay: TimeOfDaySystem,
  ): PortalRig {
    const meta = WORLD_PORTALS_BY_ID[id];
    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = facingYaw;
    this.group.add(group);

    // Grounded contact shadow beneath the whole gateway plinth
    this.addContactShadow(group, 0, -0.1, 7.6, 4.4, 0.015);

    const accentColor = new THREE.Color(meta.accentHex);
    const glowColor = new THREE.Color(meta.glowHex);

    // Rich curated PBR materials
    const stepMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        color: '#D7C2A5',
        roughness: 0.85,
        metalness: 0.02,
      }),
    );
    const sandstoneCarvedMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        color: '#E0C79E',
        roughness: 0.82,
        metalness: 0.03,
      }),
    );
    const teakMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.teakWood,
        color: '#794626',
        roughness: 0.72,
        metalness: 0.04,
      }),
    );
    const darkTeakMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.teakWood,
        color: '#4F2D18',
        roughness: 0.76,
      }),
    );
    const plasterMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.warmPlaster,
        color: '#F6EBD8',
        roughness: 0.86,
      }),
    );
    const terracottaMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.terracottaTiles,
        bumpMap: sharedTextures.terracottaBump,
        bumpScale: 0.05,
        roughness: 0.78,
      }),
    );
    const brassMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#E3AF4D',
        roughness: 0.28,
        metalness: 0.82,
      }),
    );

    const vineCardMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: this.vineLeafTex,
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.82,
      }),
    );
    wind.applyWindShader(vineCardMat, {
      swayAmp: 0.05,
      flutterAmp: 0.03,
      heightMin: 0.6,
      heightRange: 4.5,
      cacheKey: `portal-vine-${id}`,
    });

    // Two-tier carved stone threshold plinth
    const lowerStep = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(6.15, 0.14, 3.0)), stepMat);
    lowerStep.position.set(0, 0.07, 0.22);
    lowerStep.receiveShadow = true;
    lowerStep.castShadow = true;
    group.add(lowerStep);

    const upperPlinth = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(5.55, 0.18, 2.4)),
      sandstoneCarvedMat,
    );
    upperPlinth.position.set(0, 0.22, 0.08);
    upperPlinth.receiveShadow = true;
    upperPlinth.castShadow = true;
    group.add(upperPlinth);

    // Side pillars with carved stone socles & capitals (keeping open 3.2m center passage)
    const socleGeo = this.trackGeo(new THREE.BoxGeometry(0.96, 0.44, 0.98));
    const capGeo = this.trackGeo(new THREE.BoxGeometry(1.0, 0.26, 1.02));
    for (const side of [-1, 1]) {
      const px = side * 2.1;

      const socle = new THREE.Mesh(socleGeo, stepMat);
      socle.position.set(px, 0.5, 0);
      socle.castShadow = true;
      socle.receiveShadow = true;
      group.add(socle);

      if (id === 'abhivyakta') {
        // Fluted sandstone amphitheatre columns
        const col = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(0.36, 0.42, 3.65, 16)),
          sandstoneCarvedMat,
        );
        col.position.set(px, 2.48, 0);
        col.castShadow = true;
        col.receiveShadow = true;
        group.add(col);

        const torusNeck = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.4, 0.06, 10, 20)),
          brassMat,
        );
        torusNeck.rotation.x = Math.PI / 2;
        torusNeck.position.set(px, 4.18, 0);
        group.add(torusNeck);
      } else if (id === 'mission-bharari') {
        // Warm whitewashed rural school piers with teak timber corner posts & diagonal corbels
        const pier = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.72, 3.65, 0.74)),
          plasterMat,
        );
        pier.position.set(px, 2.48, 0);
        pier.castShadow = true;
        pier.receiveShadow = true;
        group.add(pier);

        // Diagonal wooden veranda corbel bracket
        const corbel = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.16, 0.78, 0.16)),
          teakMat,
        );
        corbel.position.set(px - side * 0.46, 3.92, 0);
        corbel.rotation.z = side * 0.68;
        corbel.castShadow = true;
        group.add(corbel);
      } else {
        // Sankalp: Carved natural sandstone half-piers topped with warm oiled teak pergola columns
        const lowerPier = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.76, 1.55, 0.78)),
          stepMat,
        );
        lowerPier.position.set(px, 1.44, 0);
        lowerPier.castShadow = true;
        lowerPier.receiveShadow = true;
        group.add(lowerPier);

        const upperTimber = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.44, 2.2, 0.46)),
          teakMat,
        );
        upperTimber.position.set(px, 3.24, 0);
        upperTimber.castShadow = true;
        group.add(upperTimber);

        // Lattice timber side trellis wings
        const trellisFrame = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.65, 0.1, 0.1)),
          darkTeakMat,
        );
        trellisFrame.position.set(px + side * 0.52, 3.85, 0);
        group.add(trellisFrame);
      }

      const cap = new THREE.Mesh(capGeo, id === 'abhivyakta' ? sandstoneCarvedMat : teakMat);
      cap.position.set(px, 4.34, 0);
      cap.castShadow = true;
      group.add(cap);

      // Register world-space cylinder obstacles for each pillar
      const worldPillar = new THREE.Vector3(px, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), facingYaw)
        .add(position);
      this.obstacles.push({
        kind: 'circle',
        x: worldPillar.x,
        z: worldPillar.z,
        radius: 0.62,
      });
    }

    // Back-wall obstacle behind diorama alcove
    const backWallPos = new THREE.Vector3(0, 0, -1.4)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), facingYaw)
      .add(position);
    this.obstacles.push({
      kind: 'circle',
      x: backWallPos.x,
      z: backWallPos.z,
      radius: 1.62,
    });

    // Shared warm hanging lantern glass material per portal (subtle in natural daylight, warm at sunset/night)
    const lanternGlowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#F2E5C6',
        emissive: '#E8A844',
        emissiveIntensity: 0.16,
        roughness: 0.32,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: lanternGlowMat,
      dayEmissive: 0.14,
      sunsetEmissive: 1.15,
      nightEmissive: 1.95,
    });

    // === DISTINCT ICONIC ARCHITECTURE PER PORTAL ===
    if (id === 'mission-bharari') {
      // MISSION BHARARI: Rural Maharashtra school gateway with pitched Mangalore terracotta roof,
      // carved teak lintel, hanging brass veranda lanterns & lush garden planters
      const beam = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(5.4, 0.44, 0.92)), teakMat);
      beam.position.set(0, 4.54, 0);
      beam.castShadow = true;
      group.add(beam);

      const roofSlopeGeo = this.trackGeo(new THREE.BoxGeometry(6.2, 0.22, 1.78));
      const frontRoof = new THREE.Mesh(roofSlopeGeo, terracottaMat);
      frontRoof.position.set(0, 5.32, 0.62);
      frontRoof.rotation.x = 0.44;
      frontRoof.castShadow = true;
      frontRoof.receiveShadow = true;
      group.add(frontRoof);

      const backRoof = new THREE.Mesh(roofSlopeGeo, terracottaMat);
      backRoof.position.set(0, 5.32, -0.62);
      backRoof.rotation.x = -0.44;
      backRoof.castShadow = true;
      group.add(backRoof);

      // Sculpted ridge tiles & brass school crest finial
      const ridge = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.15, 0.15, 6.3, 12)),
        terracottaMat,
      );
      ridge.rotation.z = Math.PI / 2;
      ridge.position.set(0, 5.74, 0);
      group.add(ridge);

      const finial = new THREE.Mesh(
        this.trackGeo(new THREE.OctahedronGeometry(0.18, 0)),
        brassMat,
      );
      finial.position.set(0, 6.02, 0);
      group.add(finial);

      // Hanging brass veranda lanterns on left & right eaves
      for (const side of [-1, 1]) {
        const chain = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6)),
          darkTeakMat,
        );
        chain.position.set(side * 2.52, 4.28, 0.56);
        group.add(chain);

        const lanternCore = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(0.11, 0.09, 0.24, 8)),
          lanternGlowMat,
        );
        lanternCore.position.set(side * 2.52, 3.98, 0.56);
        group.add(lanternCore);

        const lanternCap = new THREE.Mesh(
          this.trackGeo(new THREE.ConeGeometry(0.18, 0.14, 8)),
          brassMat,
        );
        lanternCap.position.set(side * 2.52, 4.14, 0.56);
        group.add(lanternCap);
      }

      // Stacked storybook details + terracotta planters flanking the school gateway
      const bookColors = ['#D85A2A', '#1B688A', '#2B7A58'];
      for (let b = 0; b < 3; b++) {
        const bk = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.46, 0.11, 0.32)),
          this.trackMat(new THREE.MeshStandardMaterial({ color: bookColors[b], roughness: 0.7 })),
        );
        bk.position.set(-2.12, 0.36 + b * 0.11, 0.78);
        bk.rotation.y = 0.24 + b * 0.19;
        bk.castShadow = true;
        group.add(bk);
      }

      const potGeo = this.trackGeo(new THREE.CylinderGeometry(0.32, 0.22, 0.4, 14));
      for (const side of [-1, 1]) {
        const pot = new THREE.Mesh(potGeo, terracottaMat);
        pot.position.set(side * 2.75, 0.34, 0.62);
        pot.castShadow = true;
        group.add(pot);
        this.addBotanicalCluster(group, side * 2.75, 0.78, 0.62, 0.78, vineCardMat, 5, side * 2);
      }
    } else if (id === 'abhivyakta') {
      // ABHIVYAKTĀ: Grand sculpted sandstone amphitheatre triumphal arch, gold trim,
      // lotus crest & twin brass theatrical stage spotlights casting soft volumetric cones!
      const archGeo = this.trackGeo(new THREE.TorusGeometry(2.1, 0.36, 16, 40, Math.PI));
      const arch = new THREE.Mesh(archGeo, sandstoneCarvedMat);
      arch.position.set(0, 4.22, 0);
      arch.castShadow = true;
      group.add(arch);

      const innerTrim = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(1.86, 0.06, 10, 36, Math.PI)),
        brassMat,
      );
      innerTrim.position.set(0, 4.22, 0.28);
      group.add(innerTrim);

      const outerTrim = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(2.34, 0.075, 10, 40, Math.PI)),
        brassMat,
      );
      outerTrim.position.set(0, 4.22, 0.24);
      group.add(outerTrim);

      // Carved golden lotus crown crest atop the arch apex
      const keystone = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.58, 0.62, 0.84)),
        sandstoneCarvedMat,
      );
      keystone.position.set(0, 6.32, 0);
      keystone.castShadow = true;
      group.add(keystone);

      const crestSun = new THREE.Mesh(
        this.trackGeo(new THREE.OctahedronGeometry(0.24, 1)),
        brassMat,
      );
      crestSun.position.set(0, 6.72, 0.14);
      crestSun.scale.set(1.2, 0.9, 0.5);
      group.add(crestSun);

      // Twin warm brass theatrical stage spotlights + subtle GLSL volumetric light cones
      const spotGeo = this.trackGeo(new THREE.CylinderGeometry(0.11, 0.18, 0.36, 14));
      const beamGeo = this.trackGeo(new THREE.ConeGeometry(1.18, 4.8, 18, 1, true));
      beamGeo.translate(0, -2.4, 0);

      for (const side of [-1, 1]) {
        const spot = new THREE.Mesh(spotGeo, brassMat);
        spot.position.set(side * 1.48, 5.72, 0.48);
        spot.rotation.z = side * 0.36;
        spot.rotation.x = 0.18;
        spot.castShadow = true;
        group.add(spot);

        const bulb = new THREE.Mesh(
          this.trackGeo(new THREE.SphereGeometry(0.1, 10, 10)),
          lanternGlowMat,
        );
        bulb.position.set(side * 1.4, 5.56, 0.54);
        group.add(bulb);

        const beamMat = this.trackMat(createStageBeamShader());
        this.stageBeamMaterials.push(beamMat);
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(side * 1.4, 5.56, 0.54);
        beam.rotation.z = side * 0.28;
        beam.rotation.x = -0.14;
        group.add(beam);
      }

      // Flanking stone braziers / warm theatre pedestals
      for (const side of [-1, 1]) {
        const ped = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(0.24, 0.32, 0.95, 12)),
          stepMat,
        );
        ped.position.set(side * 2.85, 0.62, 0.58);
        ped.castShadow = true;
        group.add(ped);

        const bowl = new THREE.Mesh(
          this.trackGeo(new THREE.SphereGeometry(0.16, 10, 10)),
          lanternGlowMat,
        );
        bowl.position.set(side * 2.85, 1.2, 0.58);
        group.add(bowl);
      }
    } else {
      // SANKALP: Welcoming rural community pergola with carved rafters, lush cascading botanical vines,
      // interlocking brass unity rings emblem & terracotta garden urns
      const pergolaBeam = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(6.1, 0.34, 0.98)),
        teakMat,
      );
      pergolaBeam.position.set(0, 4.5, 0);
      pergolaBeam.castShadow = true;
      group.add(pergolaBeam);

      for (let i = -3; i <= 3; i++) {
        const rafter = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.2, 0.22, 1.95)),
          darkTeakMat,
        );
        rafter.position.set(i * 0.92, 4.78, 0);
        rafter.castShadow = true;
        group.add(rafter);
      }

      // Interlocking Brass Unity Rings Emblem crowning the Sankalp community pergola
      const unityGroup = new THREE.Group();
      unityGroup.position.set(0, 5.45, 0.26);
      const uRingGeo = this.trackGeo(new THREE.TorusGeometry(0.32, 0.045, 10, 28));
      const uOffsets: Array<[number, number, number]> = [
        [-0.24, 0, 0],
        [0.24, 0, 0.04],
        [0, 0.26, -0.02],
      ];
      for (const [ux, uy, uz] of uOffsets) {
        const ur = new THREE.Mesh(uRingGeo, brassMat);
        ur.position.set(ux, uy, uz);
        unityGroup.add(ur);
      }
      group.add(unityGroup);

      // Painterly cascading flowering vine clusters along the pergola eaves (zero dodecahedrons!)
      for (let i = 0; i < 8; i++) {
        const vx = -2.45 + (i / 7) * 4.9;
        this.addBotanicalCluster(
          group,
          vx,
          4.92 + Math.sin(i * 1.4) * 0.14,
          0.52,
          0.95,
          vineCardMat,
          4,
          i * 1.1,
        );
      }

      // Twin sculpted terracotta garden urns + warm hanging courtyard lanterns
      const urnGeo = this.trackGeo(new THREE.CylinderGeometry(0.36, 0.22, 0.52, 16));
      for (const side of [-1, 1]) {
        const urn = new THREE.Mesh(urnGeo, terracottaMat);
        urn.position.set(side * 2.75, 0.42, 0.62);
        urn.castShadow = true;
        group.add(urn);

        const rim = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.35, 0.045, 8, 18)),
          terracottaMat,
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.set(side * 2.75, 0.68, 0.62);
        group.add(rim);

        this.addBotanicalCluster(group, side * 2.75, 0.98, 0.62, 0.92, vineCardMat, 5, side * 3);

        // Warm hanging lantern beneath pergola overhang
        const lantern = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(0.11, 0.09, 0.24, 8)),
          lanternGlowMat,
        );
        lantern.position.set(side * 2.6, 4.02, 0.5);
        group.add(lantern);
      }
    }

    // Carved Antique Teak Lintel Signboard (clearly legible in 3D space!)
    const signTex = this.trackTex(createPortalSignTexture(meta.title, meta.subtitle, meta.glowHex));
    const signMesh = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(3.85, 0.94)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          map: signTex,
          roughness: 0.52,
          metalness: 0.08,
        }),
      ),
    );
    signMesh.position.set(0, id === 'abhivyakta' ? 4.54 : 4.54, 0.52);
    group.add(signMesh);

    // === CONTROLLED PORTAL RINGS & TAILORED NATURAL GLSL SHIMMER VEIL ===
    const ringMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: glowColor,
        emissive: glowColor,
        emissiveIntensity: 0.26,
        roughness: 0.34,
        metalness: 0.45,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: ringMat,
      dayEmissive: 0.24,
      sunsetEmissive: 0.65,
      nightEmissive: 1.05,
    });

    const outerRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(1.66, 0.052, 12, 52)),
      ringMat,
    );
    outerRing.position.set(0, 2.34, 0.08);
    group.add(outerRing);

    const innerRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(1.52, 0.026, 10, 44)),
      ringMat,
    );
    innerRing.position.set(0, 2.34, 0.14);
    group.add(innerRing);

    // Tailored portal shimmer palette:
    // - Mission Bharari: warm sunlit cream with earthy green edge
    // - Abhivyaktā: controlled warm amber stage lighting
    // - Sankalp: soft natural botanical green & warm community tone
    const veilMat = this.trackMat(
      createPortalEnergyShader(
        id === 'sankalp' ? '#BEDEC4' : id === 'abhivyakta' ? '#EBC378' : '#E6E2BA',
        id === 'sankalp' ? '#488B6E' : id === 'abhivyakta' ? '#BA6E28' : '#6A9760',
      ),
    );
    const veilMesh = new THREE.Mesh(this.trackGeo(new THREE.CircleGeometry(1.62, 44)), veilMat);
    veilMesh.position.set(0, 2.34, 0.11);
    group.add(veilMesh);

    // === UPGRADED 3D WORLD DIORAMA GLIMPSE INSIDE THE PORTAL ALCOVE ===
    const dioramaGroup = this.buildPortalDioramaGlimpse(
      id,
      sharedTextures,
      terracottaMat,
      plasterMat,
      teakMat,
      sandstoneCarvedMat,
      brassMat,
      vineCardMat,
    );
    dioramaGroup.position.set(0, 1.38, -0.82);
    group.add(dioramaGroup);

    // Quiet, tiny sunlit motes framing the portal perimeter (restrained, non-blinding)
    const moteCount = 14;
    const motePositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const a = (i / moteCount) * Math.PI * 2;
      const r = 1.54 + (i % 3) * 0.12;
      motePositions[i * 3] = Math.cos(a) * r;
      motePositions[i * 3 + 1] = 2.34 + Math.sin(a) * r;
      motePositions[i * 3 + 2] = 0.24 + ((i % 3) - 1) * 0.14;
    }
    const moteGeo = this.trackGeo(new THREE.BufferGeometry());
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMat = this.trackMat(
      new THREE.PointsMaterial({
        map: sharedTextures.fireflyGlow,
        color: glowColor,
        size: 0.14,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    );
    const motes = new THREE.Points(moteGeo, moteMat);
    group.add(motes);

    // World-space anchors for projection labels, Bharari guide perch, & entry glide
    const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      facingYaw,
    );
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      facingYaw,
    );

    const entryPoint = position.clone().addScaledVector(forwardVec, 2.4);
    // Elevate markerAnchor cleanly above each roof/arch so floating typography never overlaps stone/tiles!
    const anchorY = id === 'abhivyakta' ? 7.15 : 6.45;
    const markerAnchor = position.clone().add(new THREE.Vector3(0, anchorY, 0));
    const guidePerch = position
      .clone()
      .addScaledVector(forwardVec, 1.95)
      .addScaledVector(rightVec, id === 'sankalp' ? -2.45 : 2.45)
      .add(new THREE.Vector3(0, 2.55, 0));
    const flyThroughEnd = position
      .clone()
      .addScaledVector(forwardVec, -2.15)
      .add(new THREE.Vector3(0, 2.35, 0));

    return {
      id,
      group,
      center: position.clone(),
      markerAnchor,
      entryPoint,
      guidePerch,
      flyThroughEnd,
      facingYaw,
      veilMat,
      outerRing,
      innerRing,
      ringMat,
      dioramaGroup,
      motes,
      baseColor: accentColor,
      glowIntensity: 0.85,
      veilIntensity: 0.72,
    };
  }

  /**
   * Rich miniature 3D world glimpse recessed inside each portal alcove:
   *  - Mission Bharari: sunlit rural Maharashtra schoolhouse, veranda pillars, flag & neem tree
   *  - Abhivyaktā: curved amphitheatre tiers, circular teak stage & clearly visible podium + microphone!
   *  - Sankalp: stone gathering circle beneath a lush shade neem tree + twin rural pavilions
   */
  private buildPortalDioramaGlimpse(
    id: PortalId,
    sharedTextures: ProceduralTextureSet,
    terracottaMat: THREE.Material,
    plasterMat: THREE.Material,
    teakMat: THREE.Material,
    stoneMat: THREE.Material,
    brassMat: THREE.Material,
    leafCardMat: THREE.Material,
  ): THREE.Group {
    const diorama = new THREE.Group();

    // Recessed sunlit sky dome alcove with soft vertical horizon gradient
    const skyLow =
      id === 'mission-bharari' ? '#F5E8C8' : id === 'abhivyakta' ? '#FCD79D' : '#DCF0E5';
    const skyHigh =
      id === 'mission-bharari' ? '#6BBCE6' : id === 'abhivyakta' ? '#C77A4A' : '#6CC2B0';
    const alcoveGeo = this.trackGeo(
      new THREE.SphereGeometry(1.62, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.72),
    );
    const aPos = alcoveGeo.attributes.position;
    const aCols = new Float32Array(aPos.count * 3);
    const cL = new THREE.Color(skyLow);
    const cH = new THREE.Color(skyHigh);
    const cT = new THREE.Color();
    for (let i = 0; i < aPos.count; i++) {
      const h = THREE.MathUtils.clamp((aPos.getY(i) + 0.5) / 2.1, 0, 1);
      cT.copy(cL).lerp(cH, h);
      aCols[i * 3] = cT.r;
      aCols[i * 3 + 1] = cT.g;
      aCols[i * 3 + 2] = cT.b;
    }
    alcoveGeo.setAttribute('color', new THREE.BufferAttribute(aCols, 3));
    const alcoveMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
      }),
    );
    const alcove = new THREE.Mesh(alcoveGeo, alcoveMat);
    alcove.position.set(0, 0.78, 0.1);
    diorama.add(alcove);

    // Sculpted miniature ground disc
    const hillFloor = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(1.42, 1.48, 0.22, 28)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          map: sharedTextures.meadowGrass,
          color: id === 'abhivyakta' ? '#C7AD84' : '#7CA85A',
          roughness: 0.9,
        }),
      ),
    );
    diorama.add(hillFloor);

    if (id === 'mission-bharari') {
      // Ochre village lane leading into the schoolhouse
      const lane = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.42, 0.03, 0.92)),
        this.trackMat(new THREE.MeshStandardMaterial({ color: '#D4B487', roughness: 0.92 })),
      );
      lane.position.set(-0.08, 0.12, 0.45);
      diorama.add(lane);

      // Rural Maharashtra schoolhouse with veranda pillars, sunlit windows & terracotta roof
      const body = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(1.24, 0.58, 0.66)), plasterMat);
      body.position.set(-0.1, 0.4, -0.06);
      diorama.add(body);

      const roof = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.96, 0.44, 4)), terracottaMat);
      roof.position.set(-0.1, 0.88, -0.06);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.15, 1, 0.74);
      diorama.add(roof);

      const door = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.22, 0.36, 0.06)), teakMat);
      door.position.set(-0.1, 0.29, 0.28);
      diorama.add(door);

      // Veranda pillars + warm windows
      const winMat = this.trackMat(
        new THREE.MeshStandardMaterial({
          color: '#EDE2C4',
          emissive: '#D8A24A',
          emissiveIntensity: 0.22,
        }),
      );
      for (const sx of [-0.46, 0.26]) {
        const win = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.2, 0.18, 0.04)), winMat);
        win.position.set(sx, 0.42, 0.28);
        diorama.add(win);
      }

      // School flagpole with cheerful saffron pennant
      const pole = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.014, 0.016, 0.86, 6)), brassMat);
      pole.position.set(-0.88, 0.54, 0.34);
      diorama.add(pole);
      const pennant = new THREE.Mesh(
        this.trackGeo(new THREE.PlaneGeometry(0.24, 0.13)),
        this.trackMat(new THREE.MeshStandardMaterial({ color: '#E86A28', side: THREE.DoubleSide })),
      );
      pennant.position.set(-0.75, 0.88, 0.34);
      diorama.add(pennant);

      // Painterly neem tree beside the school
      const trunk = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.045, 0.075, 0.58, 8)), teakMat);
      trunk.position.set(0.76, 0.38, 0.14);
      diorama.add(trunk);
      this.addBotanicalCluster(diorama, 0.76, 0.78, 0.14, 0.68, leafCardMat, 5, 3);
    } else if (id === 'abhivyakta') {
      // Curved sandstone amphitheatre tiers framing a raised teak stage
      for (let t = 0; t < 3; t++) {
        const tier = new THREE.Mesh(
          this.trackGeo(
            new THREE.TorusGeometry(0.72 + t * 0.22, 0.075, 8, 24, Math.PI * 1.15),
          ),
          stoneMat,
        );
        tier.rotation.x = Math.PI / 2;
        tier.rotation.z = -Math.PI * 0.075;
        tier.position.set(0, 0.17 + t * 0.13, -0.06);
        diorama.add(tier);
      }

      // Raised circular teak wood stage with brass edge trim
      const stage = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.52, 0.56, 0.18, 24)), teakMat);
      stage.position.set(0, 0.2, 0.24);
      diorama.add(stage);

      const stageRim = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(0.52, 0.02, 8, 28)),
        brassMat,
      );
      stageRim.rotation.x = Math.PI / 2;
      stageRim.position.set(0, 0.29, 0.24);
      diorama.add(stageRim);

      // Clearly readable sculpted wooden podium & gleaming brass microphone silhouette center-stage
      const podiumBase = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.24, 0.32, 0.18)), teakMat);
      podiumBase.position.set(0, 0.45, 0.3);
      diorama.add(podiumBase);

      const podiumDesk = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.32, 0.04, 0.24)), teakMat);
      podiumDesk.position.set(0, 0.62, 0.3);
      podiumDesk.rotation.x = 0.22;
      diorama.add(podiumDesk);

      const micStem = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.014, 0.018, 0.22, 8)), brassMat);
      micStem.position.set(0, 0.72, 0.32);
      micStem.rotation.x = -0.18;
      diorama.add(micStem);

      const micHead = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.042, 10, 10)), brassMat);
      micHead.position.set(0, 0.84, 0.34);
      diorama.add(micHead);

      // Controlled warm amber spotlight pool beneath the podium
      const spotPool = new THREE.Mesh(
        this.trackGeo(new THREE.CircleGeometry(0.42, 24)),
        this.trackMat(
          new THREE.MeshBasicMaterial({
            color: '#EBC984',
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            blending: THREE.NormalBlending,
          }),
        ),
      );
      spotPool.rotation.x = -Math.PI / 2;
      spotPool.position.set(0, 0.298, 0.24);
      diorama.add(spotPool);
    } else {
      // SANKALP: Circular stone village pār gathering plinth beneath a grand painterly neem tree + twin pavilions
      const ring = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.58, 0.64, 0.14, 22)),
        stoneMat,
      );
      ring.position.set(0, 0.16, 0.08);
      diorama.add(ring);

      const trunk = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.075, 0.12, 0.68, 10)), teakMat);
      trunk.position.set(0, 0.56, 0.08);
      diorama.add(trunk);

      this.addBotanicalCluster(diorama, 0, 1.02, 0.08, 1.05, leafCardMat, 6, 7);

      // Twin terracotta rural community pavilions flanking the courtyard
      for (const side of [-0.74, 0.74]) {
        const pav = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.36, 0.34, 0.28)), plasterMat);
        pav.position.set(side, 0.28, -0.2);
        diorama.add(pav);
        const cap = new THREE.Mesh(this.trackGeo(new THREE.ConeGeometry(0.28, 0.2, 4)), terracottaMat);
        cap.position.set(side, 0.56, -0.2);
        cap.rotation.y = Math.PI / 4;
        diorama.add(cap);
      }
    }

    return diorama;
  }

  /**
   * Builds lush painterly rural Maharashtra trees (Neem, Banyan, blossoming Gulmohar)
   * using flared trunks, spreading limbs, and layered alpha-tested leaf-cluster foliage cards
   * swaying naturally in the breeze — ZERO primitive dodecahedrons!
   */
  private buildTreesAndLanterns(
    sharedTextures: ProceduralTextureSet,
    wind: WindSystem,
    timeOfDay: TimeOfDaySystem,
  ): void {
    const trunkMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.teakWood,
        color: '#6C452A',
        roughness: 0.91,
      }),
    );

    // Alpha-tested painterly foliage card materials with deep natural leaf tones
    const neemMatA = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: this.neemLeafTex,
        color: '#D4E4C8',
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.86,
      }),
    );
    const neemMatB = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: this.neemLeafTex,
        color: '#BCD2AE',
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.88,
      }),
    );
    const gulmoharMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: this.gulmoharLeafTex,
        color: '#EBDCCF',
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.82,
      }),
    );

    const canopyMats = [neemMatA, neemMatB, gulmoharMat];
    canopyMats.forEach((mat, idx) => {
      wind.applyWindShader(mat, {
        swayAmp: 0.1,
        flutterAmp: 0.055,
        heightMin: 2.2,
        heightRange: 4.4,
        cacheKey: `hub-painterly-tree-${idx}`,
      });
    });

    // Shaded soft inner canopy core material (gives warm foliage volume behind the leaf cards)
    const innerGreenMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#2F6336', roughness: 0.92 }),
    );
    const innerGulmoharMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#A9381C', roughness: 0.88 }),
    );

    // Framed cleanly around the sanctuary perimeter — never blocking portal sightlines
    const treePlacements: Array<{ x: number; z: number; scale: number; gulmohar?: boolean }> = [
      { x: -15.4, z: 6.6, scale: 1.15 },
      { x: -16.6, z: -4.2, scale: 1.24, gulmohar: true },
      { x: -11.6, z: -13.4, scale: 1.12 },
      { x: -4.8, z: -15.6, scale: 1.2 },
      { x: 5.2, z: -15.4, scale: 1.18, gulmohar: true },
      { x: 12.2, z: -12.6, scale: 1.14 },
      { x: 16.6, z: -3.6, scale: 1.22 },
      { x: 15.2, z: 7.4, scale: 1.08, gulmohar: true },
      { x: -11.2, z: 14.4, scale: 0.98 },
      { x: 11.4, z: 14.2, scale: 1.02 },
    ];

    const rootFlareGeo = this.trackGeo(new THREE.CylinderGeometry(0.36, 0.62, 0.65, 9));
    const lowerTrunkGeo = this.trackGeo(new THREE.CylinderGeometry(0.27, 0.38, 1.75, 9));
    const upperTrunkGeo = this.trackGeo(new THREE.CylinderGeometry(0.19, 0.28, 1.45, 8));
    const branchGeo = this.trackGeo(new THREE.CylinderGeometry(0.09, 0.17, 1.95, 7));
    const innerCoreGeo = this.trackGeo(new THREE.IcosahedronGeometry(0.88, 1));
    const leafCardGeo = this.trackGeo(new THREE.PlaneGeometry(2.35, 2.35));

    for (let i = 0; i < treePlacements.length; i++) {
      const p = treePlacements[i];
      const groundY = sampleIslandMeadowHeight(p.x, p.z);
      const tree = new THREE.Group();
      tree.position.set(p.x, groundY, p.z);
      tree.scale.setScalar(p.scale);

      // Grounded contact shadow beneath tree canopy
      this.addContactShadow(this.group, p.x, p.z, 5.2 * p.scale, 5.2 * p.scale, groundY + 0.02);

      // Flared roots + organic curving multi-segment trunk
      const rootFlare = new THREE.Mesh(rootFlareGeo, trunkMat);
      rootFlare.position.y = 0.3;
      rootFlare.castShadow = true;
      rootFlare.receiveShadow = true;
      tree.add(rootFlare);

      const lowerTrunk = new THREE.Mesh(lowerTrunkGeo, trunkMat);
      lowerTrunk.position.set(0.04, 1.38, 0);
      lowerTrunk.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.06;
      lowerTrunk.castShadow = true;
      lowerTrunk.receiveShadow = true;
      tree.add(lowerTrunk);

      const upperTrunk = new THREE.Mesh(upperTrunkGeo, trunkMat);
      upperTrunk.position.set((i % 2 === 0 ? -0.05 : 0.08), 2.75, 0.03);
      upperTrunk.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.05;
      upperTrunk.castShadow = true;
      tree.add(upperTrunk);

      const cardMat = p.gulmohar ? gulmoharMat : i % 2 === 0 ? neemMatA : neemMatB;
      const coreMat = p.gulmohar ? innerGulmoharMat : innerGreenMat;

      // 4 spreading limbs, each crowned with shaded inner volume + layered painterly leaf-cluster cards
      for (let b = 0; b < 4; b++) {
        const a = (b / 4) * Math.PI * 2 + i * 0.72;
        const br = new THREE.Mesh(branchGeo, trunkMat);
        br.position.set(Math.cos(a) * 0.56, 3.15 + (b % 2) * 0.2, Math.sin(a) * 0.56);
        br.rotation.z = -Math.cos(a) * 0.62;
        br.rotation.x = Math.sin(a) * 0.62;
        br.castShadow = true;
        tree.add(br);

        const cx = Math.cos(a) * 1.32;
        const cy = 4.05 + (b % 2) * 0.42;
        const cz = Math.sin(a) * 1.32;

        // Subtle shaded volume core
        const core = new THREE.Mesh(innerCoreGeo, coreMat);
        core.position.set(cx, cy, cz);
        core.scale.set(1.05, 0.68, 1.0);
        core.castShadow = true;
        tree.add(core);

        // 3 crossed painterly foliage cards per limb
        for (let k = 0; k < 3; k++) {
          const card = new THREE.Mesh(leafCardGeo, cardMat);
          const ca = a + k * 1.05;
          card.position.set(
            cx + Math.cos(ca) * 0.42,
            cy + (k - 1) * 0.22,
            cz + Math.sin(ca) * 0.42,
          );
          card.rotation.set(
            (k - 1) * 0.34,
            ca + 0.4,
            ((k + b) % 3 - 1) * 0.22,
          );
          card.castShadow = true;
          tree.add(card);
        }
      }

      // Sunlit crown apex with layered painterly foliage cards
      const apexCore = new THREE.Mesh(innerCoreGeo, coreMat);
      apexCore.position.set(0, 4.78, 0);
      apexCore.scale.set(1.15, 0.72, 1.1);
      apexCore.castShadow = true;
      tree.add(apexCore);

      for (let k = 0; k < 4; k++) {
        const card = new THREE.Mesh(leafCardGeo, cardMat);
        const ca = (k / 4) * Math.PI * 2 + i * 0.35;
        card.position.set(Math.cos(ca) * 0.45, 4.92 + (k % 2) * 0.25, Math.sin(ca) * 0.45);
        card.rotation.set(0.28 * (k % 2 === 0 ? 1 : -1), ca, 0.16);
        card.scale.setScalar(1.08);
        card.castShadow = true;
        tree.add(card);
      }

      this.group.add(tree);
      this.obstacles.push({ kind: 'circle', x: p.x, z: p.z, radius: 0.68 * p.scale });
    }

    // Hand-carved Sandstone Sanctuary Lanterns lining the pathways
    const stoneMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: sharedTextures.carvedStone,
        color: '#CBB596',
        roughness: 0.87,
      }),
    );
    const lanternGlassMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#EFE3C4',
        emissive: '#E5A644',
        emissiveIntensity: 0.14,
        roughness: 0.32,
      }),
    );
    timeOfDay.registerWarmGlow({
      material: lanternGlassMat,
      dayEmissive: 0.12,
      sunsetEmissive: 1.15,
      nightEmissive: 1.95,
    });

    const lanternCoords: Array<[number, number]> = [
      [-3.9, 8.4],
      [3.9, 8.4],
      [-5.6, 1.6],
      [5.6, 1.6],
    ];
    const baseGeo = this.trackGeo(new THREE.CylinderGeometry(0.26, 0.32, 0.18, 8));
    const postGeo = this.trackGeo(new THREE.CylinderGeometry(0.14, 0.2, 1.05, 8));
    const headGeo = this.trackGeo(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 8));
    const capGeo = this.trackGeo(new THREE.ConeGeometry(0.35, 0.26, 8));

    for (const [lx, lz] of lanternCoords) {
      const lGroup = new THREE.Group();
      lGroup.position.set(lx, 0, lz);
      this.addContactShadow(this.group, lx, lz, 1.1, 1.1, 0.015);

      const base = new THREE.Mesh(baseGeo, stoneMat);
      base.position.y = 0.09;
      base.receiveShadow = true;
      lGroup.add(base);

      const post = new THREE.Mesh(postGeo, stoneMat);
      post.position.y = 0.66;
      post.castShadow = true;
      lGroup.add(post);

      const glass = new THREE.Mesh(headGeo, lanternGlassMat);
      glass.position.y = 1.32;
      lGroup.add(glass);

      const cap = new THREE.Mesh(capGeo, stoneMat);
      cap.position.y = 1.6;
      cap.castShadow = true;
      lGroup.add(cap);

      this.group.add(lGroup);
      this.obstacles.push({ kind: 'circle', x: lx, z: lz, radius: 0.36 });
    }
  }

  private buildInstancedMeadow(wind: WindSystem, isSoftwareGl: boolean): void {
    // 1. Instanced multi-blade curved grass tufts with rich sunlit-to-shaded color variation
    const tuftGeo = this.trackGeo(createGrassTuftGeometry());
    const tuftMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.88,
        side: THREE.DoubleSide,
      }),
    );
    wind.applyWindShader(tuftMat, {
      swayAmp: 0.085,
      flutterAmp: 0.04,
      heightMin: 0.04,
      heightRange: 0.42,
      cacheKey: 'hub-tuft-grass',
    });

    const isNearWalkway = (x: number, z: number): boolean => {
      if (Math.hypot(x, z - LANDING_Z) < 4.7) return true;
      if (Math.hypot(x, z - PLAZA_Z) < 3.7) return true;
      if (Math.hypot(x + 9.4, z + 2.0) < 3.9) return true;
      if (Math.hypot(x, z + 6.0) < 3.9) return true;
      if (Math.hypot(x - 9.4, z + 2.0) < 3.9) return true;
      // Clear main central corridor from landing pad to plaza to Abhivyaktā
      if (Math.abs(x) < 1.65 && z > -4.2 && z < LANDING_Z) return true;
      return false;
    };

    const grassPalette = ['#426B32', '#4E7839', '#5E8540', '#6D8C46', '#395D2C'];
    const count = isSoftwareGl ? 180 : 460;
    const grassInst = new THREE.InstancedMesh(tuftGeo, tuftMat, count);
    let placed = 0;

    for (let i = 0; i < count * 3 && placed < count; i++) {
      const a = (i * 2.399963) % (Math.PI * 2);
      const r = 3.8 + ((i * 23) % 184) * 0.1;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isNearWalkway(x, z)) continue;

      const y = sampleIslandMeadowHeight(x, z);
      _dummy.position.set(x, y, z);
      _dummy.rotation.set(0, a * 1.7, 0);
      const s = 0.75 + (placed % 5) * 0.15;
      _dummy.scale.set(s * 1.15, s * (0.85 + (placed % 3) * 0.22), s * 1.15);
      _dummy.updateMatrix();
      grassInst.setMatrixAt(placed, _dummy.matrix);
      _color.set(grassPalette[placed % grassPalette.length]);
      grassInst.setColorAt(placed, _color);
      placed++;
    }
    grassInst.count = placed;
    grassInst.instanceMatrix.needsUpdate = true;
    if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
    grassInst.computeBoundingSphere();
    this.group.add(grassInst);

    // 2. Instanced 5-petal wildflowers (warm marigold gold, cream jasmine, soft bluebell)
    const flowerGeo = this.trackGeo(createWildflowerGeometry());
    const flowerMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.62,
        side: THREE.DoubleSide,
      }),
    );
    wind.applyWindShader(flowerMat, {
      swayAmp: 0.06,
      flutterAmp: 0.03,
      heightMin: 0.0,
      heightRange: 0.35,
      cacheKey: 'hub-wildflower',
    });

    const flowerPalette = ['#F4A42C', '#FFF5DC', '#F57A32', '#9ED2EC', '#FAD25A'];
    const flowerCount = isSoftwareGl ? 42 : 96;
    const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    let fPlaced = 0;

    for (let i = 0; i < flowerCount * 3 && fPlaced < flowerCount; i++) {
      const a = (i * 1.618034 * Math.PI * 2) % (Math.PI * 2);
      const r = 5.4 + ((i * 19) % 162) * 0.1;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (isNearWalkway(x, z)) continue;

      const y = sampleIslandMeadowHeight(x, z);
      _dummy.position.set(x, y + 0.24 + (fPlaced % 3) * 0.04, z);
      _dummy.rotation.set(0.18 * ((fPlaced % 3) - 1), a, 0.14 * ((fPlaced % 2) * 2 - 1));
      _dummy.scale.setScalar(0.85 + (fPlaced % 4) * 0.18);
      _dummy.updateMatrix();
      flowerInst.setMatrixAt(fPlaced, _dummy.matrix);
      _color.set(flowerPalette[fPlaced % flowerPalette.length]);
      flowerInst.setColorAt(fPlaced, _color);
      fPlaced++;
    }
    flowerInst.count = fPlaced;
    flowerInst.instanceMatrix.needsUpdate = true;
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true;
    flowerInst.computeBoundingSphere();
    this.group.add(flowerInst);
  }

  private buildButterfliesAndBirds(isSoftwareGl: boolean): void {
    const wingGeo = this.trackGeo(new THREE.PlaneGeometry(0.19, 0.13));
    wingGeo.translate(0.095, 0, 0);

    const bfColors = ['#F7B93E', '#F07D42', '#7BD0E8', '#FCE382'];
    const bfCount = isSoftwareGl ? 4 : 6;
    for (let i = 0; i < bfCount; i++) {
      const mat = this.trackMat(
        new THREE.MeshStandardMaterial({
          color: bfColors[i % bfColors.length],
          side: THREE.DoubleSide,
          roughness: 0.52,
        }),
      );
      const g = new THREE.Group();
      const left = new THREE.Mesh(wingGeo, mat);
      const right = new THREE.Mesh(wingGeo, mat);
      right.rotation.y = Math.PI;
      g.add(left, right);
      this.group.add(g);

      this.butterflies.push({
        group: g,
        leftWing: left,
        rightWing: right,
        centerX: (i - 2.5) * 4.1,
        centerZ: i % 2 === 0 ? 5.2 : -1.2,
        radius: 1.7 + (i % 3) * 0.85,
        baseY: 1.15 + (i % 3) * 0.35,
        speed: 0.72 + (i % 4) * 0.14,
        phase: i * 1.45,
      });
    }

    // Distant soaring silhouettes high over the Sahyadri horizon
    const birdWingGeo = this.trackGeo(new THREE.BoxGeometry(0.62, 0.035, 0.18));
    birdWingGeo.translate(0.31, 0, 0);
    const birdMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: '#394E5E', roughness: 0.85 }),
    );
    for (let i = 0; i < 5; i++) {
      const bg = new THREE.Group();
      const lw = new THREE.Mesh(birdWingGeo, birdMat);
      const rw = new THREE.Mesh(birdWingGeo, birdMat);
      rw.rotation.y = Math.PI;
      bg.add(lw, rw);
      this.group.add(bg);
      this.distantBirds.push({
        group: bg,
        leftWing: lw,
        rightWing: rw,
        orbitR: 28 + i * 6.5,
        height: 15.5 + i * 2.3,
        speed: 0.14 + i * 0.022,
        phase: i * 1.35,
      });
    }
  }

  private buildSunlitMotes(
    sharedTextures: ProceduralTextureSet,
    isSoftwareGl: boolean,
  ): THREE.Points {
    // Ultra-subtle sunlit atmospheric pollen motes (quiet & natural, never bright glowing dots)
    const count = isSoftwareGl ? 14 : 24;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i * 2.39996) % (Math.PI * 2);
      const r = 3 + ((i * 17) % 165) * 0.1;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = 0.9 + ((i * 7) % 42) * 0.1;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = this.trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = this.trackMat(
      new THREE.PointsMaterial({
        map: sharedTextures.fireflyGlow,
        color: '#EDE2C4',
        size: 0.12,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    );
    const pts = new THREE.Points(geo, mat);
    this.group.add(pts);
    return pts;
  }

  public getObstacles(): WorldObstacle[] {
    return this.obstacles;
  }

  public getPortalTargets(): HubPortalTarget[] {
    return WORLD_PORTALS.map((p) => {
      const rig = this.portals[p.id];
      return {
        id: p.id,
        center: rig.center,
        markerAnchor: rig.markerAnchor,
        entryPoint: rig.entryPoint,
        facingYaw: rig.facingYaw,
      };
    });
  }

  public getPortalEntryTransform(portalId: PortalId): {
    center: THREE.Vector3;
    entryPoint: THREE.Vector3;
  } {
    const rig = this.portals[portalId];
    return { center: rig.center, entryPoint: rig.entryPoint };
  }

  public triggerArrivalWelcome(bharari: IBharariCharacter): void {
    this.bharariMode = 'welcome';
    this.bharariTimer = 0;
    this.bharariGuidePortal = null;
    this.bharariFlyPortal = null;
    this.bharariPos.copy(bharari.group.position);
    this.bharariYaw = bharari.group.rotation.y;
    bharari.triggerGreet();
  }

  public triggerWelcomeBack(playerPos: THREE.Vector3, bharari: IBharariCharacter): void {
    this.bharariMode = 'welcome-back';
    this.bharariTimer = 0;
    this.bharariGuidePortal = null;
    this.bharariFlyPortal = null;
    this.bharariPos.set(playerPos.x + 1.1, 2.25, playerPos.z - 3.6);
    bharari.group.position.copy(this.bharariPos);
    bharari.triggerGreet();
  }

  public startPortalFlyThrough(portalId: PortalId): void {
    this.bharariMode = 'fly-through';
    this.bharariFlyPortal = portalId;
    this.bharariFlyProgress = 0;
  }

  public getProximityState(playerPos: THREE.Vector3): HubProximityState {
    let closestApproach: PortalId | null = null;
    let closestApproachDist = Infinity;
    let enterPortal: PortalId | null = null;
    let enterDist = Infinity;

    for (const meta of WORLD_PORTALS) {
      const rig = this.portals[meta.id];
      const d = Math.hypot(playerPos.x - rig.center.x, playerPos.z - rig.center.z);
      if (d < 7.2 && d < closestApproachDist) {
        closestApproach = meta.id;
        closestApproachDist = d;
      }
      if (d < 4.5 && d < enterDist) {
        enterPortal = meta.id;
        enterDist = d;
      }
    }

    let prompt: WorldProximityPrompt | null = null;
    if (enterPortal) {
      const meta = WORLD_PORTALS_BY_ID[enterPortal];
      prompt = {
        id: `portal-${enterPortal}`,
        kind: 'portal',
        portalId: enterPortal,
        title: meta.title,
        subtitle: meta.subtitle,
        actionLabel: meta.actionLabel,
      };
    }

    return {
      approachingPortal: closestApproach,
      prompt,
    };
  }

  public update(
    delta: number,
    elapsed: number,
    nightWeight: number,
    playerPos: THREE.Vector3,
    bharari: IBharariCharacter,
    transitionPortal: PortalId | null,
    transitionProgress: number,
  ): { newlyApproachedPortal: PortalId | null } {
    const dt = Math.min(delta, 0.05);

    // 1. Animate distant cloud ring, volumetric stage beams, butterflies, soaring birds & motes
    this.cloudRingGroup.rotation.y += dt * 0.0065;

    for (const bm of this.stageBeamMaterials) {
      bm.uniforms.uTime.value = elapsed;
      bm.uniforms.uOpacity.value = 0.042 + nightWeight * 0.055;
    }

    for (const bf of this.butterflies) {
      const a = elapsed * bf.speed + bf.phase;
      bf.group.position.set(
        bf.centerX + Math.cos(a) * bf.radius,
        bf.baseY + Math.sin(a * 2.4) * 0.26,
        bf.centerZ + Math.sin(a) * bf.radius * 0.78,
      );
      bf.group.rotation.y = -a;
      const flap = Math.sin(elapsed * 14 + bf.phase) * 0.78;
      bf.leftWing.rotation.z = flap;
      bf.rightWing.rotation.z = flap;
    }

    for (const bird of this.distantBirds) {
      const a = elapsed * bird.speed + bird.phase;
      bird.group.position.set(
        Math.cos(a) * bird.orbitR,
        bird.height + Math.sin(a * 2) * 0.75,
        Math.sin(a) * bird.orbitR,
      );
      bird.group.rotation.y = -a;
      const flap = Math.sin(elapsed * 4.8 + bird.phase) * 0.3;
      bird.leftWing.rotation.z = flap;
      bird.rightWing.rotation.z = flap;
    }

    this.pollenPoints.rotation.y = elapsed * 0.015;
    this.pollenPoints.position.y = Math.sin(elapsed * 0.55) * 0.22;

    // 2. Proximity awareness & Controlled Portal Glow Intensification
    const prox = this.getProximityState(playerPos);
    const newlyApproachedPortal =
      prox.approachingPortal && prox.approachingPortal !== this.lastApproachingPortal
        ? prox.approachingPortal
        : null;
    this.lastApproachingPortal = prox.approachingPortal;

    for (const meta of WORLD_PORTALS) {
      const rig = this.portals[meta.id];
      const isApproached = prox.approachingPortal === meta.id;
      const isActivating = transitionPortal === meta.id;

      const targetGlow = isActivating
        ? 0.72 + transitionProgress * 1.15
        : isApproached
          ? 0.58 + nightWeight * 0.35
          : 0.24 + nightWeight * 0.52;
      rig.glowIntensity = THREE.MathUtils.damp(rig.glowIntensity, targetGlow, 5.5, dt);
      rig.ringMat.emissiveIntensity = rig.glowIntensity;

      const targetVeil = isActivating
        ? 0.65 + transitionProgress * 0.35
        : isApproached
          ? 0.62
          : 0.38 + nightWeight * 0.18;
      rig.veilIntensity = THREE.MathUtils.damp(rig.veilIntensity, targetVeil, 5.5, dt);
      rig.veilMat.uniforms.uTime.value = elapsed;
      rig.veilMat.uniforms.uIntensity.value = rig.veilIntensity;

      rig.innerRing.rotation.z = elapsed * (isApproached ? 0.58 : 0.22);
      rig.outerRing.rotation.z = -elapsed * 0.12;
      rig.motes.rotation.z = elapsed * (isApproached ? 0.42 : 0.16);
      rig.dioramaGroup.rotation.y = Math.sin(elapsed * 0.32 + rig.facingYaw) * 0.055;
    }

    // 3. Purposeful Bharari Hub Companion Behavior with natural airy hover
    this.updateBharariGuide(dt, elapsed, playerPos, prox.approachingPortal, bharari);

    return { newlyApproachedPortal };
  }

  private updateBharariGuide(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    approachingPortal: PortalId | null,
    bharari: IBharariCharacter,
  ): void {
    this.bharariTimer += dt;

    if (this.bharariMode === 'fly-through' && this.bharariFlyPortal) {
      const rig = this.portals[this.bharariFlyPortal];
      this.bharariFlyProgress = Math.min(1, this.bharariFlyProgress + dt * 1.15);
      _vGoal.copy(rig.flyThroughEnd);
      this.bharariPos.lerp(_vGoal, 1 - Math.exp(-5.4 * dt));
      _vToGoal.subVectors(_vGoal, this.bharariPos);
      const yaw = Math.atan2(_vToGoal.x, _vToGoal.z);
      this.bharariYaw = THREE.MathUtils.lerp(this.bharariYaw, yaw, Math.min(1, dt * 8));

      bharari.group.position.copy(this.bharariPos);
      bharari.group.rotation.y = this.bharariYaw;
      bharari.group.rotation.x = -0.14;
      bharari.setBehaviorState('FLYING');
      bharari.setFlightTelemetry({
        speed: 1.2,
        climbRate: 0.12,
        bankAngle: 0.18,
        phase: this.bharariFlyProgress,
        isGliding: false,
      });
      bharari.setLookTarget(rig.flyThroughEnd);
      return;
    }

    if (approachingPortal) {
      this.bharariMode = 'guide-portal';
      this.bharariGuidePortal = approachingPortal;
    } else if (this.bharariMode === 'guide-portal') {
      this.bharariMode = 'idle';
      this.bharariGuidePortal = null;
      this.bharariTimer = 0;
    } else if (
      (this.bharariMode === 'welcome' || this.bharariMode === 'welcome-back') &&
      this.bharariTimer > 4.4
    ) {
      this.bharariMode = 'idle';
      this.bharariTimer = 0;
    }

    let isHoveringFast = false;
    if (this.bharariMode === 'welcome') {
      _vGoal.set(
        0.58 + Math.sin(elapsed * 0.9) * 0.36,
        2.15 + Math.sin(elapsed * 2.5) * 0.12,
        8.0,
      );
      if (this.bharariTimer > 1.2 && this.bharariTimer < 2.2) {
        _vLook.copy(this.portals['mission-bharari'].center).setY(2.4);
      } else if (this.bharariTimer >= 2.2 && this.bharariTimer < 3.1) {
        _vLook.copy(this.portals.abhivyakta.center).setY(2.4);
      } else if (this.bharariTimer >= 3.1 && this.bharariTimer < 3.9) {
        _vLook.copy(this.portals.sankalp.center).setY(2.4);
      } else {
        _vLook.set(playerPos.x, 1.62, playerPos.z);
      }
    } else if (this.bharariMode === 'welcome-back') {
      _vGoal.set(
        playerPos.x + 1.05,
        2.2 + Math.sin(elapsed * 2.6) * 0.12,
        playerPos.z - 3.3,
      );
      _vLook.set(playerPos.x, 1.62, playerPos.z);
    } else if (this.bharariMode === 'guide-portal' && this.bharariGuidePortal) {
      const rig = this.portals[this.bharariGuidePortal];
      _vGoal.copy(rig.guidePerch);
      _vGoal.y += Math.sin(elapsed * 2.6) * 0.12;
      if (Math.sin(elapsed * 1.1) > 0.25) {
        _vLook.copy(rig.center).setY(2.35);
      } else {
        _vLook.set(playerPos.x, 1.62, playerPos.z);
      }
    } else {
      const gentleAngle = elapsed * 0.22;
      _vGoal.set(
        Math.sin(gentleAngle) * 3.8,
        2.68 + Math.sin(elapsed * 1.9) * 0.16,
        2.8 + Math.cos(gentleAngle) * 2.2,
      );
      _vLook.set(playerPos.x, 1.62, playerPos.z);
    }

    const dist = this.bharariPos.distanceTo(_vGoal);
    isHoveringFast = dist > 1.1;
    const followLambda = isHoveringFast ? 3.2 : 4.2;
    this.bharariPos.lerp(_vGoal, 1 - Math.exp(-followLambda * dt));

    const targetYaw = isHoveringFast
      ? Math.atan2(_vGoal.x - this.bharariPos.x, _vGoal.z - this.bharariPos.z)
      : Math.atan2(_vLook.x - this.bharariPos.x, _vLook.z - this.bharariPos.z);

    let diff = targetYaw - this.bharariYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.bharariYaw += diff * (1 - Math.exp(-5.5 * dt));

    bharari.group.position.copy(this.bharariPos);
    bharari.group.rotation.y = this.bharariYaw;
    bharari.group.rotation.x = isHoveringFast ? -0.09 : 0.03;

    // Keep Bharari genuinely hovering in airy flight (graceful wingbeats in mid-air rather than tucked perched wings)
    bharari.setBehaviorState('FLYING');
    bharari.setFlightTelemetry({
      speed: isHoveringFast ? 0.85 : 0.44,
      climbRate: isHoveringFast ? 0.08 : 0.14,
      bankAngle: THREE.MathUtils.clamp(diff * (isHoveringFast ? 0.45 : 0.25), -0.32, 0.32),
      phase: 0.5,
      isGliding: false,
    });
    bharari.setLookTarget(_vLook);
  }

  public dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}

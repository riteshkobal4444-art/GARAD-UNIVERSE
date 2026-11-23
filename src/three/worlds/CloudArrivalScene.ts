import * as THREE from 'three';
import type { IBharariCharacter } from '../../types/universe';

export interface CloudArrivalUpdateResult {
  progress: number;
  phase: 'clouds' | 'descent' | 'landing' | 'complete';
  justRevealedClouds: boolean;
  justLanded: boolean;
  completed: boolean;
}

interface CloudBankSprite {
  sprite: THREE.Sprite;
  baseX: number;
  baseY: number;
  baseZ: number;
  partOffsetX: number;
  partOffsetY: number;
  driftSpeed: number;
  phaseOffset: number;
  baseOpacity: number;
}

const _camPos = new THREE.Vector3();
const _lookPos = new THREE.Vector3();
const _birdPos = new THREE.Vector3();
const _birdTan = new THREE.Vector3();
const _birdHoverTarget = new THREE.Vector3(0.55, 2.02, 8.2);
const _landingEyePos = new THREE.Vector3(0, 1.62, 12.2);
const _landingLookPos = new THREE.Vector3(0, 2.45, -4.5);

/**
 * Generates painterly multi-lobe volumetric cloud textures with warm sunlit golden crests
 * and cool atmospheric cerulean underside shading (3 distinct varieties to eliminate repetition).
 */
function createPainterlyCloudTexture(variant: 0 | 1 | 2): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const puffLayouts: Record<
    0 | 1 | 2,
    Array<{ x: number; y: number; r: number; topHex: string; midHex: string }>
  > = {
    // Variant 0: Sculpted cumulus billow with soft parchment top & cool slate-blue shadow belly
    0: [
      { x: 128, y: 154, r: 84, topHex: 'rgba(154,176,204,0.68)', midHex: 'rgba(136,160,192,0.34)' },
      { x: 76, y: 148, r: 64, topHex: 'rgba(176,194,218,0.72)', midHex: 'rgba(150,172,202,0.34)' },
      { x: 180, y: 146, r: 66, topHex: 'rgba(182,198,218,0.72)', midHex: 'rgba(152,174,202,0.32)' },
      { x: 106, y: 114, r: 66, topHex: 'rgba(232,229,224,0.88)', midHex: 'rgba(202,212,226,0.48)' },
      { x: 152, y: 112, r: 62, topHex: 'rgba(238,234,226,0.90)', midHex: 'rgba(208,216,226,0.46)' },
      { x: 128, y: 84, r: 54, topHex: 'rgba(244,239,230,0.92)', midHex: 'rgba(222,220,216,0.48)' },
    ],
    // Variant 1: Wide natural daylight deck cloud with soft warm rim & cool shaded base
    1: [
      { x: 64, y: 146, r: 58, topHex: 'rgba(168,186,210,0.68)', midHex: 'rgba(142,164,194,0.28)' },
      { x: 194, y: 146, r: 58, topHex: 'rgba(168,186,210,0.68)', midHex: 'rgba(142,164,194,0.28)' },
      { x: 128, y: 144, r: 78, topHex: 'rgba(192,204,220,0.76)', midHex: 'rgba(162,180,204,0.38)' },
      { x: 96, y: 118, r: 56, topHex: 'rgba(234,229,220,0.86)', midHex: 'rgba(204,210,218,0.42)' },
      { x: 160, y: 116, r: 56, topHex: 'rgba(238,233,222,0.88)', midHex: 'rgba(208,214,222,0.44)' },
    ],
    // Variant 2: Subtle atmospheric mist wisp (soft grey-cream, never glaring white)
    2: [
      { x: 128, y: 128, r: 96, topHex: 'rgba(226,228,232,0.52)', midHex: 'rgba(198,210,224,0.22)' },
      { x: 84, y: 122, r: 62, topHex: 'rgba(232,230,226,0.48)', midHex: 'rgba(196,208,222,0.18)' },
      { x: 174, y: 132, r: 64, topHex: 'rgba(224,226,230,0.46)', midHex: 'rgba(192,206,220,0.18)' },
    ],
  };

  for (const b of puffLayouts[variant]) {
    const grad = ctx.createRadialGradient(b.x, b.y - b.r * 0.14, b.r * 0.08, b.x, b.y, b.r);
    grad.addColorStop(0.0, b.topHex);
    grad.addColorStop(0.54, b.midHex);
    grad.addColorStop(1.0, 'rgba(205,218,232,0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Custom GLSL volumetric sunbeam shader with whisper-soft natural opacity & fresnel falloff
 * so sunlight feels atmospheric without creating glaring light shafts.
 */
function createVolumetricSunbeamMaterial(opacity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uColorTop: { value: new THREE.Color('#F5EBCE') },
      uColorBottom: { value: new THREE.Color('#E8D3A4') },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vNormalView = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColorTop;
      uniform vec3 uColorBottom;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      void main() {
        vec3 viewDir = normalize(vViewPos);
        // Soft edge fade toward silhouette so shaft edges dissolve organically
        float edge = pow(abs(dot(normalize(vNormalView), viewDir)), 1.9);
        // Vertical fade at both top & bottom ends of the ray
        float vertical = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
        // Gentle drifting internal sunlight bands
        float shimmer = 0.82 + 0.18 * sin(vUv.x * 18.84 + uTime * 0.55) * cos(vUv.y * 6.0 - uTime * 0.3);
        vec3 col = mix(uColorBottom, uColorTop, vUv.y);
        float alpha = edge * vertical * shimmer * uOpacity;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * 9.2-second premium cinematic arrival sequence descending gracefully through multi-layered
 * sunlit golden clouds, revealing distant misty Sahyadri silhouettes and opening onto the
 * Central Island stone terrace with all three iconic portals clearly framed ahead.
 */
export class CloudArrivalScene {
  public readonly group = new THREE.Group();

  private readonly cloudTextures: THREE.CanvasTexture[];
  private readonly puffs: CloudBankSprite[] = [];
  private readonly sunbeamMats: THREE.ShaderMaterial[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];

  private readonly cameraCurve: THREE.CatmullRomCurve3;
  private readonly lookCurve: THREE.CatmullRomCurve3;
  private readonly bharariCurve: THREE.CatmullRomCurve3;

  private readonly durationSec = 9.2;
  private elapsedSeq = 0;
  private active = false;
  private revealEmitted = false;
  private landedEmitted = false;
  private completed = false;

  constructor(isSoftwareGl: boolean) {
    this.group.name = 'CloudArrivalSequence';
    this.group.visible = false;

    this.cloudTextures = [
      createPainterlyCloudTexture(0),
      createPainterlyCloudTexture(1),
      createPainterlyCloudTexture(2),
    ];

    // 3 Distinct Atmospheric Cloud Strata around the sunlit descent corridor
    // Carefully parted down the center corridor so the Central Island & 3 Portals are never obscured!
    const upperCount = isSoftwareGl ? 14 : 24;
    const midCount = isSoftwareGl ? 16 : 28;
    const valleyMistCount = isSoftwareGl ? 8 : 14;

    const addCloudSprite = (
      variant: 0 | 1 | 2,
      x: number,
      y: number,
      z: number,
      scaleW: number,
      scaleH: number,
      partX: number,
      partY: number,
      tintHex: string,
      baseOpacity: number,
      idx: number,
    ) => {
      const mat = new THREE.SpriteMaterial({
        map: this.cloudTextures[variant],
        color: tintHex,
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
      });
      this.materials.push(mat);

      const sprite = new THREE.Sprite(mat);
      sprite.position.set(x, y, z);
      sprite.scale.set(scaleW, scaleH, 1);
      this.group.add(sprite);

      this.puffs.push({
        sprite,
        baseX: x,
        baseY: y,
        baseZ: z,
        partOffsetX: partX,
        partOffsetY: partY,
        driftSpeed: 0.1 + (idx % 5) * 0.035,
        phaseOffset: idx * 0.85,
        baseOpacity,
      });
    };

    // Layer 1: High golden-lit cumulus gates we glide through first (y = 22..35)
    for (let i = 0; i < upperCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const t = i / upperCount;
      const x = side * (3.6 + ((i * 5) % 9) * 1.9);
      const y = 22.0 + t * 13.5 + Math.sin(i * 1.7) * 1.6;
      const z = 25.0 + (1 - t) * 14.0 - (i % 4) * 2.2;
      const w = 16 + (i % 4) * 4.5;
      addCloudSprite(
        (i % 2) as 0 | 1,
        x,
        y,
        z,
        w,
        w * 0.56,
        side * (6.8 + (i % 3) * 2.4),
        1.6,
        i % 3 === 0 ? '#EAE4D9' : '#E5EBF2',
        0.78,
        i,
      );
    }

    // Layer 2: Mid sunlit cloud sea parting gracefully to unveil the Central Island (y = 10..21)
    for (let i = 0; i < midCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const t = i / midCount;
      const x = side * (6.5 + ((i * 7) % 11) * 2.1);
      const y = 10.5 + t * 11.2 + Math.cos(i * 1.3) * 1.4;
      const z = 12.0 + (1 - t) * 18.0 - (i % 5) * 2.6;
      const w = 18 + (i % 5) * 4.2;
      addCloudSprite(
        (i % 3) as 0 | 1 | 2,
        x,
        y,
        z,
        w,
        w * 0.52,
        side * (8.2 + (i % 4) * 2.5),
        0.8,
        i % 2 === 0 ? '#E6E2DA' : '#DCE6F0',
        0.68,
        i + 30,
      );
    }

    // Layer 3: Soft translucent valley mist wisps drifting below the rim around the island flanks
    for (let i = 0; i < valleyMistCount; i++) {
      const a = (i / valleyMistCount) * Math.PI * 2;
      const r = 30 + (i % 3) * 7;
      addCloudSprite(
        2,
        Math.cos(a) * r,
        3.2 + (i % 3) * 2.4,
        Math.sin(a) * r,
        24 + (i % 3) * 6,
        11,
        Math.cos(a) * 4.5,
        -0.8,
        '#DCE4EC',
        0.34,
        i + 70,
      );
    }

    // Subtle atmospheric sunlight shafts (kept whisper-soft so clouds & island stay crisp)
    const beamGeo = new THREE.CylinderGeometry(3.0, 8.0, 36, 18, 1, true);
    this.geometries.push(beamGeo);

    const beamSpecs = [
      { x: -7.5, y: 19.5, z: 6.5, rz: -0.34, rx: 0.14, op: 0.048 },
      { x: 5.5, y: 21.0, z: 2.5, rz: -0.32, rx: 0.12, op: 0.055 },
    ];
    for (const s of beamSpecs) {
      const bMat = createVolumetricSunbeamMaterial(s.op);
      this.materials.push(bMat);
      this.sunbeamMats.push(bMat);
      const beam = new THREE.Mesh(beamGeo, bMat);
      beam.position.set(s.x, s.y, s.z);
      beam.rotation.set(s.rx, 0, s.rz);
      beam.renderOrder = 2;
      this.group.add(beam);
    }

    // Smooth cinematic descent spline: high sunlit sky -> sweeping arc through parting clouds -> landing terrace
    this.cameraCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.0, 33.5, 38.5),
        new THREE.Vector3(-3.4, 25.4, 31.2),
        new THREE.Vector3(1.6, 16.0, 24.4),
        new THREE.Vector3(0.6, 7.8, 17.6),
        new THREE.Vector3(0.0, 2.85, 13.9),
        _landingEyePos.clone(),
      ],
      false,
      'catmullrom',
      0.5,
    );

    this.lookCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.0, 27.5, 12.0),
        new THREE.Vector3(0.0, 15.2, 2.5),
        new THREE.Vector3(0.0, 6.2, -3.2),
        new THREE.Vector3(0.0, 3.25, -4.5),
        _landingLookPos.clone(),
      ],
      false,
      'catmullrom',
      0.5,
    );

    // Bharari arcs joyfully ahead through the sunlit clouds and flares into welcome hover
    this.bharariCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-8.2, 30.8, 27.5),
        new THREE.Vector3(3.8, 21.8, 22.0),
        new THREE.Vector3(-3.2, 13.0, 15.6),
        new THREE.Vector3(2.4, 6.0, 11.4),
        _birdHoverTarget.clone(),
      ],
      false,
      'catmullrom',
      0.5,
    );
  }

  public start(): void {
    this.active = true;
    this.elapsedSeq = 0;
    this.revealEmitted = false;
    this.landedEmitted = false;
    this.completed = false;
    this.group.visible = true;
  }

  public stop(): void {
    this.active = false;
    this.group.visible = false;
  }

  public skipToEnd(): void {
    this.elapsedSeq = this.durationSec;
    this.revealEmitted = true;
    this.landedEmitted = true;
    this.completed = true;
    this.active = false;
    this.group.visible = false;
  }

  public getLandingSpawn(): { x: number; z: number; yaw: number; pitch: number } {
    return { x: _landingEyePos.x, z: _landingEyePos.z, yaw: Math.PI, pitch: -0.015 };
  }

  public update(
    delta: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    bharari: IBharariCharacter,
    reducedMotion: boolean,
  ): CloudArrivalUpdateResult {
    const dt = Math.min(delta, 0.05);
    if (!this.active) {
      return {
        progress: 1,
        phase: 'complete',
        justRevealedClouds: false,
        justLanded: false,
        completed: true,
      };
    }

    const speed = reducedMotion ? 2.2 : 1.0;
    this.elapsedSeq = Math.min(this.durationSec, this.elapsedSeq + dt * speed);
    const rawT = this.elapsedSeq / this.durationSec;

    // Gentle S-curve ease with extra silky deceleration into the landing terrace
    const easedT =
      rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

    // 1. Update camera along sunlit descent spline
    this.cameraCurve.getPoint(easedT, _camPos);
    this.lookCurve.getPoint(easedT, _lookPos);
    camera.position.copy(_camPos);
    camera.lookAt(_lookPos);

    const targetFov = THREE.MathUtils.lerp(47, 56, easedT);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

    // 2. Part cloud banks majestically outward and fade gently as we descend beneath them
    const partFactor = THREE.MathUtils.smoothstep(rawT, 0.14, 0.74);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(rawT, 0.74, 0.99);
    for (const p of this.puffs) {
      const drift = Math.sin(elapsed * p.driftSpeed + p.phaseOffset) * 1.25;
      p.sprite.position.set(
        p.baseX + p.partOffsetX * partFactor + drift,
        p.baseY + p.partOffsetY * partFactor + Math.cos(elapsed * 0.22 + p.phaseOffset) * 0.32,
        p.baseZ,
      );
      (p.sprite.material as THREE.SpriteMaterial).opacity = p.baseOpacity * fadeOut;
    }

    // Update subtle atmospheric sunlight shafts
    const beamFade = THREE.MathUtils.smoothstep(rawT, 0.05, 0.22) * fadeOut;
    for (let i = 0; i < this.sunbeamMats.length; i++) {
      const mat = this.sunbeamMats[i];
      mat.uniforms.uTime.value = elapsed;
      const baseOp = i === 1 ? 0.055 : 0.048;
      mat.uniforms.uOpacity.value = baseOp * beamFade;
    }

    // 3. Guide Bharari ahead through the parting clouds into a natural airy welcome hover
    const birdT = THREE.MathUtils.clamp(easedT * 1.04, 0, 1);
    this.bharariCurve.getPoint(birdT, _birdPos);
    this.bharariCurve.getTangent(Math.min(0.99, birdT), _birdTan);

    if (rawT < 0.85) {
      bharari.group.position.copy(_birdPos);
      const yaw = Math.atan2(_birdTan.x, _birdTan.z);
      bharari.group.rotation.y = yaw;
      bharari.group.rotation.x = THREE.MathUtils.clamp(-_birdTan.y * 0.45, -0.25, 0.22);
      bharari.setBehaviorState('FLYING');
      bharari.setFlightTelemetry({
        speed: 0.94,
        climbRate: THREE.MathUtils.clamp(_birdTan.y, -0.6, 0.6),
        bankAngle: Math.sin(rawT * Math.PI * 3) * 0.28,
        phase: birdT,
        isGliding: rawT > 0.42 && rawT < 0.66,
      });
      bharari.setLookTarget(null);
    } else {
      const flareT = THREE.MathUtils.smoothstep(rawT, 0.85, 1.0);
      bharari.group.position.lerpVectors(_birdPos, _birdHoverTarget, flareT);
      bharari.group.position.y += Math.sin(elapsed * 3.2) * 0.08 * flareT;
      const dx = _landingEyePos.x - bharari.group.position.x;
      const dz = _landingEyePos.z - bharari.group.position.z;
      const faceVisitorYaw = Math.atan2(dx, dz);
      bharari.group.rotation.y = THREE.MathUtils.lerp(
        bharari.group.rotation.y,
        faceVisitorYaw,
        Math.min(1, dt * 6.5),
      );
      bharari.group.rotation.x = THREE.MathUtils.lerp(bharari.group.rotation.x, 0, Math.min(1, dt * 6));
      bharari.setBehaviorState('FLYING');
      bharari.setFlightTelemetry({
        speed: 0.42,
        climbRate: 0.14,
        bankAngle: 0,
        phase: flareT,
        isGliding: false,
      });
      bharari.setLookTarget(_landingEyePos);
    }

    let justRevealedClouds = false;
    if (!this.revealEmitted && rawT >= 0.24) {
      this.revealEmitted = true;
      justRevealedClouds = true;
    }

    let justLanded = false;
    if (!this.landedEmitted && rawT >= 0.96) {
      this.landedEmitted = true;
      justLanded = true;
    }

    const phase: CloudArrivalUpdateResult['phase'] =
      rawT < 0.3 ? 'clouds' : rawT < 0.85 ? 'descent' : rawT < 1 ? 'landing' : 'complete';

    if (rawT >= 1) {
      this.completed = true;
      this.active = false;
      this.group.visible = false;
    }

    return {
      progress: rawT,
      phase,
      justRevealedClouds,
      justLanded,
      completed: this.completed,
    };
  }

  public dispose(): void {
    for (const t of this.cloudTextures) t.dispose();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}

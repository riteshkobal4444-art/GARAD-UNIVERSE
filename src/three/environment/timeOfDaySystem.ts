import * as THREE from 'three';
import type { TimeOfDayMode } from '../../types/universe';
import type { ProceduralTextureSet } from '../textures';

export interface TimeOfDayFactors {
  mode: TimeOfDayMode;
  dayWeight: number;
  sunsetWeight: number;
  nightWeight: number;
  /** 0 in bright day, ~0.68 at sunset, 1.0 at night — drives lanterns & interior window glow */
  warmGlowWeight: number;
}

export interface WarmGlowTarget {
  material: THREE.MeshStandardMaterial;
  dayEmissive: number;
  sunsetEmissive: number;
  nightEmissive: number;
  dayColor?: THREE.Color;
  nightColor?: THREE.Color;
}

export interface DestinationWarmLightTarget {
  light: THREE.PointLight;
  dayIntensity: number;
  sunsetIntensity: number;
  nightIntensity: number;
}

export interface TimeOfDaySystem {
  readonly skyGroup: THREE.Group;
  setMode: (mode: TimeOfDayMode, instant?: boolean) => void;
  getMode: () => TimeOfDayMode;
  getFactors: () => TimeOfDayFactors;
  registerWarmGlow: (target: WarmGlowTarget) => void;
  registerWarmLight: (target: DestinationWarmLightTarget) => void;
  registerCloudMaterial: (mat: THREE.MeshStandardMaterial) => void;
  registerWaterMaterial: (mat: THREE.MeshStandardMaterial) => void;
  update: (delta: number, elapsed: number) => TimeOfDayFactors;
  dispose: () => void;
}

interface LightingPreset {
  skyZenith: THREE.Color;
  skyMid: THREE.Color;
  skyHorizon: THREE.Color;
  skyGround: THREE.Color;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  sunHaloColor: THREE.Color;
  sunIntensity: number;
  sunKeyPos: THREE.Vector3;
  sunKeyColor: THREE.Color;
  sunKeyIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  rimColor: THREE.Color;
  rimIntensity: number;
  rimPos: THREE.Vector3;
  fillColor: THREE.Color;
  fillIntensity: number;
  fogColor: THREE.Color;
  fogDensity: number;
  exposure: number;
  cloudColor: THREE.Color;
  cloudEmissive: THREE.Color;
  cloudEmissiveIntensity: number;
  waterColor: THREE.Color;
  waterEmissive: THREE.Color;
  waterEmissiveIntensity: number;
  envIntensity: number;
}

const PRESETS: Record<TimeOfDayMode, LightingPreset> = {
  // DEFAULT: Natural, cinematic, soft rural Maharashtra daylight with balanced contrast & rich natural tones
  day: {
    skyZenith: new THREE.Color('#2A6AA6'),
    skyMid: new THREE.Color('#5C96C4'),
    skyHorizon: new THREE.Color('#C0D6E4'),
    skyGround: new THREE.Color('#6C7F58'),
    sunDir: new THREE.Vector3(0.48, 0.72, 0.5).normalize(),
    sunColor: new THREE.Color('#F7F1E1'),
    sunHaloColor: new THREE.Color('#F0E2BE'),
    sunIntensity: 0.68,
    sunKeyPos: new THREE.Vector3(38, 44, 28),
    sunKeyColor: new THREE.Color('#FFF0D6'),
    sunKeyIntensity: 1.72,
    hemiSky: new THREE.Color('#88B6D8'),
    hemiGround: new THREE.Color('#586744'),
    hemiIntensity: 0.56,
    rimColor: new THREE.Color('#B2D0E6'),
    rimIntensity: 0.24,
    rimPos: new THREE.Vector3(-34, 24, -30),
    fillColor: new THREE.Color('#A8C6DC'),
    fillIntensity: 0.18,
    fogColor: new THREE.Color('#C2D7E4'),
    fogDensity: 0.0046,
    exposure: 0.92,
    cloudColor: new THREE.Color('#E8E5DE'),
    cloudEmissive: new THREE.Color('#D5DCE4'),
    cloudEmissiveIntensity: 0.03,
    waterColor: new THREE.Color('#3489A6'),
    waterEmissive: new THREE.Color('#14475B'),
    waterEmissiveIntensity: 0.08,
    envIntensity: 0.38,
  },
  // SUNSET: Soft cinematic Sahyadri late afternoon with warm directional sunlight & natural shadows
  sunset: {
    skyZenith: new THREE.Color('#28436E'),
    skyMid: new THREE.Color('#9F6366'),
    skyHorizon: new THREE.Color('#E09559'),
    skyGround: new THREE.Color('#6A4936'),
    sunDir: new THREE.Vector3(-0.76, 0.24, 0.59).normalize(),
    sunColor: new THREE.Color('#F7D7A0'),
    sunHaloColor: new THREE.Color('#E88B44'),
    sunIntensity: 0.85,
    sunKeyPos: new THREE.Vector3(-48, 17, 34),
    sunKeyColor: new THREE.Color('#F5A860'),
    sunKeyIntensity: 1.72,
    hemiSky: new THREE.Color('#DC9468'),
    hemiGround: new THREE.Color('#5D4432'),
    hemiIntensity: 0.5,
    rimColor: new THREE.Color('#E88A4C'),
    rimIntensity: 0.44,
    rimPos: new THREE.Vector3(38, 16, -28),
    fillColor: new THREE.Color('#747AA4'),
    fillIntensity: 0.2,
    fogColor: new THREE.Color('#D09164'),
    fogDensity: 0.0074,
    exposure: 0.94,
    cloudColor: new THREE.Color('#E4BC98'),
    cloudEmissive: new THREE.Color('#C97A44'),
    cloudEmissiveIntensity: 0.11,
    waterColor: new THREE.Color('#696778'),
    waterEmissive: new THREE.Color('#824926'),
    waterEmissiveIntensity: 0.14,
    envIntensity: 0.32,
  },
  // NIGHT: Deep calm village night sky, crisp moonlight, subtle starlight & cozy warm lanterns
  night: {
    skyZenith: new THREE.Color('#070F22'),
    skyMid: new THREE.Color('#102042'),
    skyHorizon: new THREE.Color('#1D325A'),
    skyGround: new THREE.Color('#0B1424'),
    sunDir: new THREE.Vector3(-0.38, 0.68, -0.62).normalize(),
    sunColor: new THREE.Color('#DCE9F8'),
    sunHaloColor: new THREE.Color('#628EC8'),
    sunIntensity: 0.6,
    sunKeyPos: new THREE.Vector3(-24, 42, -36),
    sunKeyColor: new THREE.Color('#86AFE8'),
    sunKeyIntensity: 0.68,
    hemiSky: new THREE.Color('#2A487A'),
    hemiGround: new THREE.Color('#172034'),
    hemiIntensity: 0.42,
    rimColor: new THREE.Color('#7098D2'),
    rimIntensity: 0.28,
    rimPos: new THREE.Vector3(28, 22, 26),
    fillColor: new THREE.Color('#2E4C80'),
    fillIntensity: 0.18,
    fogColor: new THREE.Color('#152544'),
    fogDensity: 0.0085,
    exposure: 0.92,
    cloudColor: new THREE.Color('#384C74'),
    cloudEmissive: new THREE.Color('#172644'),
    cloudEmissiveIntensity: 0.08,
    waterColor: new THREE.Color('#19395E'),
    waterEmissive: new THREE.Color('#21416B'),
    waterEmissiveIntensity: 0.18,
    envIntensity: 0.22,
  },
};

function mixThreeColors(
  out: THREE.Color,
  a: THREE.Color,
  b: THREE.Color,
  c: THREE.Color,
  wa: number,
  wb: number,
  wc: number,
): THREE.Color {
  out.setRGB(
    a.r * wa + b.r * wb + c.r * wc,
    a.g * wa + b.g * wb + c.g * wc,
    a.b * wa + b.b * wb + c.b * wc,
  );
  return out;
}

function mixThreeNumbers(a: number, b: number, c: number, wa: number, wb: number, wc: number): number {
  return a * wa + b * wb + c * wc;
}

function mixThreeVec3(
  out: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  wa: number,
  wb: number,
  wc: number,
): THREE.Vector3 {
  out.set(
    a.x * wa + b.x * wb + c.x * wc,
    a.y * wa + b.y * wb + c.y * wc,
    a.z * wa + b.z * wb + c.z * wc,
  );
  return out;
}

export function createTimeOfDaySystem(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  lights: {
    sunKey: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    rimLight: THREE.DirectionalLight;
    valleyFill: THREE.DirectionalLight;
  },
  textures: ProceduralTextureSet,
  initialMode: TimeOfDayMode = 'day',
): TimeOfDaySystem {
  let mode: TimeOfDayMode = initialMode;
  let dayWeight = initialMode === 'day' ? 1 : 0;
  let sunsetWeight = initialMode === 'sunset' ? 1 : 0;
  let nightWeight = initialMode === 'night' ? 1 : 0;

  const skyGroup = new THREE.Group();
  skyGroup.name = 'DynamicSkySystem';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // 1. Procedural Smooth-Blending Atmospheric Sky Dome (single geometry for Day / Sunset / Night)
  const skyUniforms = {
    uZenithColor: { value: PRESETS.day.skyZenith.clone() },
    uMidColor: { value: PRESETS.day.skyMid.clone() },
    uHorizonColor: { value: PRESETS.day.skyHorizon.clone() },
    uGroundColor: { value: PRESETS.day.skyGround.clone() },
    uSunDir: { value: PRESETS.day.sunDir.clone() },
    uSunColor: { value: PRESETS.day.sunColor.clone() },
    uSunHaloColor: { value: PRESETS.day.sunHaloColor.clone() },
    uSunIntensity: { value: PRESETS.day.sunIntensity },
    uNightFactor: { value: 0.0 },
  };

  const skyGeo = new THREE.SphereGeometry(156, 36, 22);
  geometries.push(skyGeo);

  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uZenithColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGroundColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSunHaloColor;
      uniform float uSunIntensity;
      uniform float uNightFactor;

      varying vec3 vWorldDir;

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = dir.y;

        vec3 skyCol;
        if (h >= 0.0) {
          float tLow = smoothstep(0.0, 0.24, h);
          float tHigh = smoothstep(0.18, 0.78, h);
          vec3 lowBand = mix(uHorizonColor, uMidColor, tLow);
          skyCol = mix(lowBand, uZenithColor, tHigh);
        } else {
          float tGround = smoothstep(0.0, -0.35, h);
          skyCol = mix(uHorizonColor, uGroundColor, tGround);
        }

        // Controlled natural solar/lunar disc & gentle atmospheric scattering
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float halo = pow(sunDot, mix(9.0, 16.0, uNightFactor)) * 0.22 * uSunIntensity;
        float coreSize = mix(0.9970, 0.9980, uNightFactor);
        float disc = smoothstep(coreSize, 0.9994, sunDot);

        skyCol += uSunHaloColor * halo * smoothstep(-0.08, 0.14, h);
        skyCol = mix(skyCol, uSunColor * 1.02, disc * 0.88);

        // Subtle atmospheric horizon warmth without washing out sky blue
        float horizonGlow = pow(1.0 - abs(h), 10.0) * 0.055 * (1.0 - uNightFactor * 0.65);
        skyCol += uSunHaloColor * horizonGlow;

        gl_FragColor = vec4(skyCol, 1.0);
      }
    `,
  });
  materials.push(skyMat);

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.renderOrder = -20;
  skyGroup.add(skyMesh);

  // 2. Twinkling Night Starfield Dome (smoothly fades in during NIGHT)
  const starCount = 340;
  const starPositions = new Float32Array(starCount * 3);
  const starScales = new Float32Array(starCount);
  const starPhases = new Float32Array(starCount);
  const starColors = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color('#FFFFFF'),
    new THREE.Color('#D6E8FF'),
    new THREE.Color('#FFE9C8'),
    new THREE.Color('#B9D4FF'),
  ];

  let seed = 4817;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(0.14 + rand() * 0.86); // Upper sky dome above horizon
    const r = 138 + rand() * 8;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    starScales[i] = 1.6 + rand() * 2.8;
    starPhases[i] = rand() * Math.PI * 2;
    const c = palette[i % palette.length];
    starColors[i * 3] = c.r;
    starColors[i * 3 + 1] = c.g;
    starColors[i * 3 + 2] = c.b;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('aScale', new THREE.BufferAttribute(starScales, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  geometries.push(starGeo);

  const starUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uMap: { value: textures.fireflyGlow },
  };

  const starMat = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    fog: false,
    vertexShader: `
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = color;
        vTwinkle = 0.58 + 0.42 * sin(uTime * 2.2 + aPhase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aScale * (260.0 / max(-mvPosition.z, 1.0)) * (0.85 + 0.25 * vTwinkle);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float alpha = tex.a * uOpacity * vTwinkle;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor * tex.rgb, alpha);
      }
    `,
  });
  materials.push(starMat);

  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.renderOrder = -15;
  starPoints.frustumCulled = false;
  skyGroup.add(starPoints);

  const warmGlowTargets: WarmGlowTarget[] = [];
  const warmLightTargets: DestinationWarmLightTarget[] = [];
  const cloudMaterials: THREE.MeshStandardMaterial[] = [];
  const waterMaterials: THREE.MeshStandardMaterial[] = [];

  const tmpColor = new THREE.Color();
  const tmpVec = new THREE.Vector3();

  function applyBlendedState(elapsed: number) {
    const sum = Math.max(dayWeight + sunsetWeight + nightWeight, 0.0001);
    const wd = dayWeight / sum;
    const ws = sunsetWeight / sum;
    const wn = nightWeight / sum;
    const warmGlowWeight = Math.min(1, ws * 0.68 + wn * 1.0);

    const pD = PRESETS.day;
    const pS = PRESETS.sunset;
    const pN = PRESETS.night;

    // Sky dome uniforms
    mixThreeColors(skyUniforms.uZenithColor.value, pD.skyZenith, pS.skyZenith, pN.skyZenith, wd, ws, wn);
    mixThreeColors(skyUniforms.uMidColor.value, pD.skyMid, pS.skyMid, pN.skyMid, wd, ws, wn);
    mixThreeColors(skyUniforms.uHorizonColor.value, pD.skyHorizon, pS.skyHorizon, pN.skyHorizon, wd, ws, wn);
    mixThreeColors(skyUniforms.uGroundColor.value, pD.skyGround, pS.skyGround, pN.skyGround, wd, ws, wn);
    mixThreeVec3(skyUniforms.uSunDir.value, pD.sunDir, pS.sunDir, pN.sunDir, wd, ws, wn).normalize();
    mixThreeColors(skyUniforms.uSunColor.value, pD.sunColor, pS.sunColor, pN.sunColor, wd, ws, wn);
    mixThreeColors(skyUniforms.uSunHaloColor.value, pD.sunHaloColor, pS.sunHaloColor, pN.sunHaloColor, wd, ws, wn);
    skyUniforms.uSunIntensity.value = mixThreeNumbers(pD.sunIntensity, pS.sunIntensity, pN.sunIntensity, wd, ws, wn);
    skyUniforms.uNightFactor.value = wn;

    // Stars visibility (fade in smoothly during dusk/night)
    starUniforms.uTime.value = elapsed;
    const starAlpha = THREE.MathUtils.smoothstep(wn + ws * 0.14, 0.18, 0.92);
    starUniforms.uOpacity.value = starAlpha;
    starPoints.visible = starAlpha > 0.01;

    // Single shadow-casting directional light (Sun -> Low Sunset Sun -> Cool Moon)
    mixThreeVec3(tmpVec, pD.sunKeyPos, pS.sunKeyPos, pN.sunKeyPos, wd, ws, wn);
    lights.sunKey.position.copy(tmpVec);
    mixThreeColors(lights.sunKey.color, pD.sunKeyColor, pS.sunKeyColor, pN.sunKeyColor, wd, ws, wn);
    lights.sunKey.intensity = mixThreeNumbers(
      pD.sunKeyIntensity,
      pS.sunKeyIntensity,
      pN.sunKeyIntensity,
      wd,
      ws,
      wn,
    );

    // Hemisphere sky/ground bounce
    mixThreeColors(lights.hemiLight.color, pD.hemiSky, pS.hemiSky, pN.hemiSky, wd, ws, wn);
    mixThreeColors(lights.hemiLight.groundColor, pD.hemiGround, pS.hemiGround, pN.hemiGround, wd, ws, wn);
    lights.hemiLight.intensity = mixThreeNumbers(
      pD.hemiIntensity,
      pS.hemiIntensity,
      pN.hemiIntensity,
      wd,
      ws,
      wn,
    );

    // Rim & valley fill lights
    mixThreeVec3(lights.rimLight.position, pD.rimPos, pS.rimPos, pN.rimPos, wd, ws, wn);
    mixThreeColors(lights.rimLight.color, pD.rimColor, pS.rimColor, pN.rimColor, wd, ws, wn);
    lights.rimLight.intensity = mixThreeNumbers(
      pD.rimIntensity,
      pS.rimIntensity,
      pN.rimIntensity,
      wd,
      ws,
      wn,
    );

    mixThreeColors(lights.valleyFill.color, pD.fillColor, pS.fillColor, pN.fillColor, wd, ws, wn);
    lights.valleyFill.intensity = mixThreeNumbers(
      pD.fillIntensity,
      pS.fillIntensity,
      pN.fillIntensity,
      wd,
      ws,
      wn,
    );

    // Scene fog, background, IBL intensity & tone mapping exposure
    mixThreeColors(tmpColor, pD.fogColor, pS.fogColor, pN.fogColor, wd, ws, wn);
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(tmpColor);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(tmpColor);
      scene.fog.density = mixThreeNumbers(pD.fogDensity, pS.fogDensity, pN.fogDensity, wd, ws, wn);
    }
    renderer.toneMappingExposure = mixThreeNumbers(pD.exposure, pS.exposure, pN.exposure, wd, ws, wn);
    scene.environmentIntensity = mixThreeNumbers(
      pD.envIntensity,
      pS.envIntensity,
      pN.envIntensity,
      wd,
      ws,
      wn,
    );

    // Cloud tint
    for (const cm of cloudMaterials) {
      mixThreeColors(cm.color, pD.cloudColor, pS.cloudColor, pN.cloudColor, wd, ws, wn);
      mixThreeColors(cm.emissive, pD.cloudEmissive, pS.cloudEmissive, pN.cloudEmissive, wd, ws, wn);
      cm.emissiveIntensity = mixThreeNumbers(
        pD.cloudEmissiveIntensity,
        pS.cloudEmissiveIntensity,
        pN.cloudEmissiveIntensity,
        wd,
        ws,
        wn,
      );
    }

    // Stream water reflections tint
    for (const wm of waterMaterials) {
      mixThreeColors(wm.color, pD.waterColor, pS.waterColor, pN.waterColor, wd, ws, wn);
      mixThreeColors(wm.emissive, pD.waterEmissive, pS.waterEmissive, pN.waterEmissive, wd, ws, wn);
      wm.emissiveIntensity = mixThreeNumbers(
        pD.waterEmissiveIntensity,
        pS.waterEmissiveIntensity,
        pN.waterEmissiveIntensity,
        wd,
        ws,
        wn,
      );
    }

    // Warm building interiors, glowing windows & lanterns
    const flicker = 0.96 + Math.sin(elapsed * 5.2) * 0.04;
    for (const target of warmGlowTargets) {
      const baseIntensity = mixThreeNumbers(
        target.dayEmissive,
        target.sunsetEmissive,
        target.nightEmissive,
        wd,
        ws,
        wn,
      );
      target.material.emissiveIntensity = baseIntensity * (warmGlowWeight > 0.25 ? flicker : 1.0);
      if (target.dayColor && target.nightColor) {
        target.material.color.lerpColors(target.dayColor, target.nightColor, warmGlowWeight);
      }
    }

    // Lightweight non-shadow destination warm interior point lights
    for (const lt of warmLightTargets) {
      const intensity = mixThreeNumbers(
        lt.dayIntensity,
        lt.sunsetIntensity,
        lt.nightIntensity,
        wd,
        ws,
        wn,
      );
      lt.light.intensity = intensity * (warmGlowWeight > 0.2 ? flicker : 1.0);
      lt.light.visible = lt.light.intensity > 0.02;
    }

    return {
      mode,
      dayWeight: wd,
      sunsetWeight: ws,
      nightWeight: wn,
      warmGlowWeight,
    };
  }

  // Apply initial state immediately
  applyBlendedState(0);

  return {
    skyGroup,
    setMode: (nextMode, instant = false) => {
      mode = nextMode;
      if (instant) {
        dayWeight = nextMode === 'day' ? 1 : 0;
        sunsetWeight = nextMode === 'sunset' ? 1 : 0;
        nightWeight = nextMode === 'night' ? 1 : 0;
        applyBlendedState(0);
      }
    },
    getMode: () => mode,
    getFactors: () => {
      const sum = Math.max(dayWeight + sunsetWeight + nightWeight, 0.0001);
      const wd = dayWeight / sum;
      const ws = sunsetWeight / sum;
      const wn = nightWeight / sum;
      return {
        mode,
        dayWeight: wd,
        sunsetWeight: ws,
        nightWeight: wn,
        warmGlowWeight: Math.min(1, ws * 0.68 + wn * 1.0),
      };
    },
    registerWarmGlow: (target) => {
      warmGlowTargets.push(target);
    },
    registerWarmLight: (target) => {
      warmLightTargets.push(target);
    },
    registerCloudMaterial: (mat) => {
      cloudMaterials.push(mat);
    },
    registerWaterMaterial: (mat) => {
      waterMaterials.push(mat);
    },
    update: (delta, elapsed) => {
      const dt = Math.min(delta, 0.05);
      const targetDay = mode === 'day' ? 1 : 0;
      const targetSunset = mode === 'sunset' ? 1 : 0;
      const targetNight = mode === 'night' ? 1 : 0;

      // Silky 1.2s smooth atmospheric transition between Day, Sunset, and Night
      dayWeight = THREE.MathUtils.damp(dayWeight, targetDay, 2.8, dt);
      sunsetWeight = THREE.MathUtils.damp(sunsetWeight, targetSunset, 2.8, dt);
      nightWeight = THREE.MathUtils.damp(nightWeight, targetNight, 2.8, dt);

      return applyBlendedState(elapsed);
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

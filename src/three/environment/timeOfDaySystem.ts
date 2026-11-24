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
  cloudShadowColor: THREE.Color;
  cloudOpacity: number;
  cloudEmissive: THREE.Color;
  cloudEmissiveIntensity: number;
  waterColor: THREE.Color;
  waterEmissive: THREE.Color;
  waterEmissiveIntensity: number;
  envIntensity: number;
}

const PRESETS: Record<TimeOfDayMode, LightingPreset> = {
  // DAY: Natural bright daylight, fresh blue sky with subtle clouds, vibrant greenery & realistic soft shadows
  day: {
    skyZenith: new THREE.Color('#266DB4'),
    skyMid: new THREE.Color('#62A4D8'),
    skyHorizon: new THREE.Color('#CCE2F0'),
    skyGround: new THREE.Color('#6F8757'),
    sunDir: new THREE.Vector3(0.48, 0.72, 0.5).normalize(),
    sunColor: new THREE.Color('#FFF8E8'),
    sunHaloColor: new THREE.Color('#F7E8C6'),
    sunIntensity: 0.72,
    sunKeyPos: new THREE.Vector3(40, 46, 30),
    sunKeyColor: new THREE.Color('#FFF3DB'),
    sunKeyIntensity: 1.82,
    hemiSky: new THREE.Color('#92C2E4'),
    hemiGround: new THREE.Color('#5C7245'),
    hemiIntensity: 0.62,
    rimColor: new THREE.Color('#B8D8EE'),
    rimIntensity: 0.26,
    rimPos: new THREE.Vector3(-34, 24, -30),
    fillColor: new THREE.Color('#AED0E6'),
    fillIntensity: 0.2,
    fogColor: new THREE.Color('#C8DFEE'),
    fogDensity: 0.0042,
    exposure: 0.96,
    cloudColor: new THREE.Color('#FAF8F3'),
    cloudShadowColor: new THREE.Color('#B8CFE2'),
    cloudOpacity: 0.56,
    cloudEmissive: new THREE.Color('#DDE6EE'),
    cloudEmissiveIntensity: 0.04,
    waterColor: new THREE.Color('#3489A6'),
    waterEmissive: new THREE.Color('#14475B'),
    waterEmissiveIntensity: 0.08,
    envIntensity: 0.4,
  },
  // SUNSET: Warm golden-hour sunlight, orange/amber/soft pink sky tones & long soft shadows without overly dark shading
  sunset: {
    skyZenith: new THREE.Color('#2D4373'),
    skyMid: new THREE.Color('#C67982'),
    skyHorizon: new THREE.Color('#EE9B54'),
    skyGround: new THREE.Color('#704E3A'),
    sunDir: new THREE.Vector3(-0.82, 0.19, 0.54).normalize(),
    sunColor: new THREE.Color('#FFE0AA'),
    sunHaloColor: new THREE.Color('#F4924A'),
    sunIntensity: 0.92,
    sunKeyPos: new THREE.Vector3(-58, 15.5, 34),
    sunKeyColor: new THREE.Color('#FFB568'),
    sunKeyIntensity: 1.88,
    hemiSky: new THREE.Color('#EA9E78'),
    hemiGround: new THREE.Color('#694C38'),
    hemiIntensity: 0.56,
    rimColor: new THREE.Color('#F29558'),
    rimIntensity: 0.46,
    rimPos: new THREE.Vector3(38, 16, -28),
    fillColor: new THREE.Color('#8E82AA'),
    fillIntensity: 0.24,
    fogColor: new THREE.Color('#DC9B6E'),
    fogDensity: 0.0064,
    exposure: 0.98,
    cloudColor: new THREE.Color('#FFCEA4'),
    cloudShadowColor: new THREE.Color('#AE6976'),
    cloudOpacity: 0.62,
    cloudEmissive: new THREE.Color('#D4804E'),
    cloudEmissiveIntensity: 0.14,
    waterColor: new THREE.Color('#696778'),
    waterEmissive: new THREE.Color('#824926'),
    waterEmissiveIntensity: 0.14,
    envIntensity: 0.35,
  },
  // NIGHT: Deep blue night sky, subtle moonlight with realistic nighttime shadows & comfortable village visibility
  night: {
    skyZenith: new THREE.Color('#060F24'),
    skyMid: new THREE.Color('#10234A'),
    skyHorizon: new THREE.Color('#1E3868'),
    skyGround: new THREE.Color('#0D182C'),
    sunDir: new THREE.Vector3(-0.38, 0.66, -0.64).normalize(),
    sunColor: new THREE.Color('#E2EEFC'),
    sunHaloColor: new THREE.Color('#6C98D4'),
    sunIntensity: 0.64,
    sunKeyPos: new THREE.Vector3(-26, 42, -38),
    sunKeyColor: new THREE.Color('#9BC0F2'),
    sunKeyIntensity: 0.78,
    hemiSky: new THREE.Color('#34588F'),
    hemiGround: new THREE.Color('#1D2940'),
    hemiIntensity: 0.52,
    rimColor: new THREE.Color('#7BA4DC'),
    rimIntensity: 0.32,
    rimPos: new THREE.Vector3(28, 22, 26),
    fillColor: new THREE.Color('#385B94'),
    fillIntensity: 0.24,
    fogColor: new THREE.Color('#172B4E'),
    fogDensity: 0.0074,
    exposure: 0.96,
    cloudColor: new THREE.Color('#4B6896'),
    cloudShadowColor: new THREE.Color('#132240'),
    cloudOpacity: 0.24,
    cloudEmissive: new THREE.Color('#1B2E52'),
    cloudEmissiveIntensity: 0.08,
    waterColor: new THREE.Color('#19395E'),
    waterEmissive: new THREE.Color('#21416B'),
    waterEmissiveIntensity: 0.18,
    envIntensity: 0.26,
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

  // 1. Procedural Smooth-Blending Atmospheric Sky Dome with Subtle Drifting Clouds
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
    uTime: { value: 0.0 },
    uCloudColor: { value: PRESETS.day.cloudColor.clone() },
    uCloudShadowColor: { value: PRESETS.day.cloudShadowColor.clone() },
    uCloudOpacity: { value: PRESETS.day.cloudOpacity },
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
      uniform float uTime;
      uniform vec3 uCloudColor;
      uniform vec3 uCloudShadowColor;
      uniform float uCloudOpacity;

      varying vec3 vWorldDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float cloudFbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 4; i++) {
          v += a * valueNoise(p);
          p = rot * p * 2.04 + vec2(1.7, 9.2);
          a *= 0.5;
        }
        return v;
      }

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
        float halo = pow(sunDot, mix(8.5, 16.0, uNightFactor)) * 0.24 * uSunIntensity;
        float coreSize = mix(0.9970, 0.9980, uNightFactor);
        float disc = smoothstep(coreSize, 0.9994, sunDot);

        skyCol += uSunHaloColor * halo * smoothstep(-0.08, 0.14, h);
        skyCol = mix(skyCol, uSunColor * 1.02, disc * 0.88);

        // Subtle atmospheric horizon warmth without washing out sky blue
        float horizonGlow = pow(1.0 - abs(h), 10.0) * 0.065 * (1.0 - uNightFactor * 0.65);
        skyCol += uSunHaloColor * horizonGlow;

        // Soft, natural drifting sky clouds across the upper hemisphere
        if (h > 0.02) {
          vec2 cloudUv = dir.xz / (h + 0.34);
          vec2 drift = vec2(uTime * 0.011, uTime * 0.004);
          float n1 = cloudFbm(cloudUv * 1.15 + drift);
          float n2 = cloudFbm(cloudUv * 2.35 - drift * 0.45 + vec2(4.2, 1.8));
          float density = smoothstep(0.50, 0.80, n1 * 0.72 + n2 * 0.28);

          // Fade gracefully near horizon & zenith for realistic atmospheric perspective
          float horizonFade = smoothstep(0.02, 0.20, h);
          float zenithFade = 1.0 - smoothstep(0.75, 0.98, h) * 0.25;
          float cloudMask = density * horizonFade * zenithFade * uCloudOpacity;

          // Warm solar rim-lighting on cloud crests, cooler underside shading
          float sunLit = pow(sunDot, 3.0) * 0.35 * (1.0 - uNightFactor * 0.75);
          vec3 cloudCol = mix(uCloudShadowColor, uCloudColor, clamp(0.45 + n2 * 0.55 + sunLit, 0.0, 1.0));
          cloudCol += uSunHaloColor * sunLit * 0.35;

          skyCol = mix(skyCol, cloudCol, cloudMask);
        }

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
    skyUniforms.uTime.value = elapsed;
    mixThreeColors(skyUniforms.uCloudColor.value, pD.cloudColor, pS.cloudColor, pN.cloudColor, wd, ws, wn);
    mixThreeColors(
      skyUniforms.uCloudShadowColor.value,
      pD.cloudShadowColor,
      pS.cloudShadowColor,
      pN.cloudShadowColor,
      wd,
      ws,
      wn,
    );
    skyUniforms.uCloudOpacity.value = mixThreeNumbers(pD.cloudOpacity, pS.cloudOpacity, pN.cloudOpacity, wd, ws, wn);

    // Stars visibility (fade in smoothly during dusk/night)
    starUniforms.uTime.value = elapsed;
    const starAlpha = THREE.MathUtils.smoothstep(wn + ws * 0.14, 0.18, 0.92);
    starUniforms.uOpacity.value = starAlpha;
    starPoints.visible = starAlpha > 0.01;

    // Single shadow-casting directional light (Sun -> Low Sunset Sun -> Cool Moon), relative to target
    mixThreeVec3(tmpVec, pD.sunKeyPos, pS.sunKeyPos, pN.sunKeyPos, wd, ws, wn);
    lights.sunKey.position.copy(tmpVec).add(lights.sunKey.target.position);
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

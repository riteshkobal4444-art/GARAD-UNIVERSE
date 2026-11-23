import * as THREE from 'three';

export interface WindShaderOptions {
  /** Horizontal bend amplitude in world units */
  swayAmp?: number;
  /** High-frequency leaf flutter amplitude */
  flutterAmp?: number;
  /** Minimum local Y below which sway is damped (e.g. roots/base) */
  heightMin?: number;
  /** Local Y span over which sway ramps to full strength */
  heightRange?: number;
  /** Set true for InstancedMesh so world offset includes instanceMatrix */
  instanced?: boolean;
  /** Unique cache key suffix */
  cacheKey: string;
}

export interface WindSystem {
  readonly uniforms: {
    uWindTime: { value: number };
    uWindStrength: { value: number };
    uWindDir: { value: THREE.Vector2 };
  };
  applyWindShader: <T extends THREE.Material>(material: T, options: WindShaderOptions) => T;
  sampleWind: (x: number, z: number, elapsed: number) => { x: number; z: number; gust: number };
  update: (elapsed: number, breezeMultiplier?: number) => void;
}

/**
 * Reusable village-wide wind system.
 * Uses GPU vertex displacement via `onBeforeCompile` on standard PBR materials
 * so hundreds of instanced trees, branches, bushes, flowers, and grass tufts
 * sway naturally with full lighting and shadows at minimal CPU cost.
 */
export function createWindSystem(): WindSystem {
  const uniforms = {
    uWindTime: { value: 0 },
    uWindStrength: { value: 1.0 },
    uWindDir: { value: new THREE.Vector2(0.84, 0.54).normalize() },
  };

  function applyWindShader<T extends THREE.Material>(
    material: T,
    options: WindShaderOptions,
  ): T {
    const swayAmp = options.swayAmp ?? 0.14;
    const flutterAmp = options.flutterAmp ?? 0.032;
    const heightMin = options.heightMin ?? 0.0;
    const heightRange = Math.max(options.heightRange ?? 1.5, 0.05);
    const isInstanced = options.instanced ?? false;

    const prevOnBeforeCompile = material.onBeforeCompile;
    material.customProgramCacheKey = () =>
      `garad-wind-${options.cacheKey}-${isInstanced ? 'inst' : 'std'}`;

    material.onBeforeCompile = (shader, renderer) => {
      if (prevOnBeforeCompile) {
        prevOnBeforeCompile(shader, renderer);
      }

      shader.uniforms.uWindTime = uniforms.uWindTime;
      shader.uniforms.uWindStrength = uniforms.uWindStrength;
      shader.uniforms.uWindDir = uniforms.uWindDir;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        uniform float uWindTime;
        uniform float uWindStrength;
        uniform vec2 uWindDir;`,
      );

      const worldOriginExpr = isInstanced
        ? `(modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz`
        : `(modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz`;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec2 windWorldXZ = ${worldOriginExpr} + transformed.xz * 0.35;
          float heightWeight = clamp((transformed.y - (${heightMin.toFixed(3)})) / (${heightRange.toFixed(3)}), 0.0, 1.0);
          float bendCurve = heightWeight * heightWeight;
          float phase = dot(windWorldXZ, uWindDir) * 0.24;
          float primaryWave = sin(uWindTime * 1.45 + phase) * 0.72 + sin(uWindTime * 0.62 + phase * 0.45) * 0.28;
          float flutter = sin(uWindTime * 4.3 + windWorldXZ.x * 2.1 + windWorldXZ.y * 1.7 + transformed.y * 2.4);
          float disp = primaryWave * (${swayAmp.toFixed(4)}) * bendCurve * uWindStrength;
          float flut = flutter * (${flutterAmp.toFixed(4)}) * heightWeight * uWindStrength;
          transformed.x += uWindDir.x * disp + flut;
          transformed.z += uWindDir.y * disp + flut * 0.7;
          transformed.y -= abs(disp) * 0.14;
        }`,
      );
    };

    material.needsUpdate = true;
    return material;
  }

  function sampleWind(x: number, z: number, elapsed: number) {
    const dir = uniforms.uWindDir.value;
    const strength = uniforms.uWindStrength.value;
    const phase = (x * dir.x + z * dir.y) * 0.22;
    const wave =
      Math.sin(elapsed * 1.45 + phase) * 0.72 + Math.sin(elapsed * 0.62 + phase * 0.45) * 0.28;
    const gust = (0.5 + 0.5 * wave) * strength;
    return {
      x: dir.x * wave * strength,
      z: dir.y * wave * strength,
      gust,
    };
  }

  function update(elapsed: number, breezeMultiplier = 1.0) {
    uniforms.uWindTime.value = elapsed;
    // Gentle organic gusting across the valley
    const gustWave =
      0.86 +
      Math.sin(elapsed * 0.38) * 0.22 +
      Math.sin(elapsed * 0.89 + 1.4) * 0.12;
    uniforms.uWindStrength.value = gustWave * breezeMultiplier;
  }

  return {
    uniforms,
    applyWindShader,
    sampleWind,
    update,
  };
}

import * as THREE from 'three';
import { groundHeightAt } from '../terrain';
import type { ProceduralTextureSet } from '../textures';
import type { TimeOfDayFactors } from './timeOfDaySystem';
import type { WindSystem } from './windSystem';

export interface AmbientWildlifeResult {
  group: THREE.Group;
  update: (delta: number, elapsed: number, tod: TimeOfDayFactors) => void;
  dispose: () => void;
}

interface FallingLeaf {
  originX: number;
  originZ: number;
  x: number;
  y: number;
  z: number;
  fallSpeed: number;
  swayPhase: number;
  swayAmp: number;
  spinSpeed: number;
  scale: number;
}

interface ButterflyActor {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  radius: number;
  heightOffset: number;
  speed: number;
  phase: number;
  flapSpeed: number;
}

interface DistantBirdActor {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  orbitCenterX: number;
  orbitCenterZ: number;
  orbitRadiusX: number;
  orbitRadiusZ: number;
  altitude: number;
  speed: number;
  phase: number;
  flapRate: number;
}

/**
 * Living rural atmosphere & wildlife:
 * - Gently falling leaves drifting from village tree canopies in the wind
 * - Stylized colourful butterflies fluttering near flowers, school, library & stream (day/sunset)
 * - Small distant birds circling gracefully above the Sahyadri hills (day/sunset)
 * - Soft pulsing fireflies drifting near trees, gardens & stream during dusk/night
 */
export function createAmbientWildlife(
  textures: ProceduralTextureSet,
  wind: WindSystem,
  isSoftwareGl: boolean,
): AmbientWildlifeResult {
  const group = new THREE.Group();
  group.name = 'AmbientWildlife';

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

  let seed = 9137;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // =========================================================================
  // 1. FALLING LEAVES (InstancedMesh drifting gently in the village wind)
  // =========================================================================
  const leafCount = isSoftwareGl ? 14 : 28;
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0.14);
  leafShape.quadraticCurveTo(0.09, 0.05, 0, -0.14);
  leafShape.quadraticCurveTo(-0.09, 0.05, 0, 0.14);
  const leafGeo = trackGeo(new THREE.ShapeGeometry(leafShape, 5));
  const leafMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.72,
      side: THREE.DoubleSide,
    }),
  );

  const leafInstanced = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  leafInstanced.frustumCulled = false;

  const leafColors = ['#69A344', '#86B84C', '#D6A43A', '#E27E35', '#558B3B'];
  const leafSpawns: Array<[number, number]> = [
    [-19.5, 4.5],
    [-11.8, 10.2],
    [-15.2, -9.2],
    [10.2, -9.2],
    [16.5, 13.5],
    [0.5, -24.5],
    [-5.5, 12.5],
    [6.5, 2.5],
    [-8.5, -2.5],
    [12.5, -14.5],
  ];

  const leaves: FallingLeaf[] = [];
  const tmpColor = new THREE.Color();
  const dummy = new THREE.Object3D();

  for (let i = 0; i < leafCount; i++) {
    const [sx, sz] = leafSpawns[i % leafSpawns.length];
    const ox = sx + (rand() - 0.5) * 6.5;
    const oz = sz + (rand() - 0.5) * 6.5;
    const gY = groundHeightAt(ox, oz);
    leaves.push({
      originX: ox,
      originZ: oz,
      x: ox,
      y: gY + 1.2 + rand() * 5.6,
      z: oz,
      fallSpeed: 0.36 + rand() * 0.28,
      swayPhase: rand() * Math.PI * 2,
      swayAmp: 0.45 + rand() * 0.5,
      spinSpeed: 1.4 + rand() * 1.6,
      scale: 0.75 + rand() * 0.55,
    });
    tmpColor.set(leafColors[i % leafColors.length]);
    leafInstanced.setColorAt(i, tmpColor);
  }
  if (leafInstanced.instanceColor) leafInstanced.instanceColor.needsUpdate = true;
  group.add(leafInstanced);

  // =========================================================================
  // 2. BUTTERFLIES (fluttering gently near flowers, school, library & stream)
  // =========================================================================
  const butterfliesGroup = new THREE.Group();
  const butterflies: ButterflyActor[] = [];
  const wingGeo = trackGeo(new THREE.CircleGeometry(0.11, 6));
  wingGeo.scale(1.15, 0.85, 1);
  wingGeo.translate(0.09, 0, 0);

  const butterflyColors = ['#F7C631', '#F07D3A', '#73C7E8', '#F6A4B8', '#FCE068'];
  const butterflySpots: Array<[number, number, number]> = [
    [-12.2, 8.2, 2.4], // School courtyard garden
    [-16.4, 9.6, 2.2], // Near school shade tree
    [-9.8, -10.5, 2.6], // Library garden
    [-14.6, -10.8, 2.1], // Library flowers
    [11.4, 8.6, 2.8], // Activity ground edge
    [13.2, -8.2, 2.4], // Community centre courtyard
    [2.5, 8.0, 2.8], // Village stream bank
    [-2.4, -4.5, 2.5], // Central meadow
    [0.5, -21.2, 2.6], // Dream Hill slope
    [5.8, -16.4, 2.5], // Stream bend
  ];

  const butterflyCount = isSoftwareGl ? 5 : butterflySpots.length;
  for (let i = 0; i < butterflyCount; i++) {
    const [cx, cz, rad] = butterflySpots[i];
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: butterflyColors[i % butterflyColors.length],
        emissive: butterflyColors[i % butterflyColors.length],
        emissiveIntensity: 0.14,
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
    );

    const bGroup = new THREE.Group();
    const leftWing = new THREE.Mesh(wingGeo, mat);
    const rightWing = new THREE.Mesh(wingGeo, mat);
    rightWing.scale.x = -1;
    bGroup.add(leftWing, rightWing);
    butterfliesGroup.add(bGroup);

    butterflies.push({
      group: bGroup,
      leftWing,
      rightWing,
      centerX: cx,
      centerZ: cz,
      radius: rad,
      heightOffset: 0.9 + rand() * 1.4,
      speed: 0.42 + rand() * 0.3,
      phase: rand() * Math.PI * 2,
      flapSpeed: 10.5 + rand() * 4.5,
    });
  }
  group.add(butterfliesGroup);

  // =========================================================================
  // 3. DISTANT FLYING BIRDS (soaring & flapping peacefully above the hills)
  // =========================================================================
  const birdsGroup = new THREE.Group();
  const birds: DistantBirdActor[] = [];
  const birdWingGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.035, 0.16));
  birdWingGeo.translate(0.22, 0, 0);
  const birdBodyGeo = trackGeo(new THREE.ConeGeometry(0.075, 0.42, 6));
  birdBodyGeo.rotateX(Math.PI / 2);
  const birdMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#34495E',
      roughness: 0.85,
    }),
  );

  const birdCount = isSoftwareGl ? 4 : 7;
  for (let i = 0; i < birdCount; i++) {
    const bg = new THREE.Group();
    const body = new THREE.Mesh(birdBodyGeo, birdMat);
    const lw = new THREE.Mesh(birdWingGeo, birdMat);
    const rw = new THREE.Mesh(birdWingGeo, birdMat);
    rw.scale.x = -1;
    bg.add(body, lw, rw);
    bg.scale.setScalar(0.85 + rand() * 0.45);
    birdsGroup.add(bg);

    birds.push({
      group: bg,
      leftWing: lw,
      rightWing: rw,
      orbitCenterX: (rand() - 0.5) * 26,
      orbitCenterZ: -12 + (rand() - 0.5) * 28,
      orbitRadiusX: 16 + rand() * 24,
      orbitRadiusZ: 14 + rand() * 22,
      altitude: 16 + rand() * 11,
      speed: (0.14 + rand() * 0.08) * (i % 2 === 0 ? 1 : -1),
      phase: rand() * Math.PI * 2,
      flapRate: 4.8 + rand() * 2.2,
    });
  }
  group.add(birdsGroup);

  // =========================================================================
  // 4. NIGHT FIREFLIES (soft pulsing Points near trees, stream & gardens)
  // =========================================================================
  const fireflyCount = isSoftwareGl ? 32 : 68;
  const ffBasePositions = new Float32Array(fireflyCount * 3);
  const ffPositions = new Float32Array(fireflyCount * 3);
  const ffPhases = new Float32Array(fireflyCount);
  const ffScales = new Float32Array(fireflyCount);

  const fireflyZones: Array<[number, number, number]> = [
    [-15.5, 6.5, 7.5], // Around school trees & courtyard
    [-12.5, -12.5, 7.2], // Around library & garden
    [14.0, 9.5, 7.0], // Activity ground bushes
    [15.5, -10.5, 7.2], // Community centre trees
    [0.5, -24.5, 8.2], // Dream Hill glowing tree
    [3.5, 6.5, 6.5], // Along village stream south
    [4.5, -6.5, 6.5], // Along village stream north
    [-4.0, 14.0, 6.0], // Entrance trees
  ];

  for (let i = 0; i < fireflyCount; i++) {
    const [zx, zz, rad] = fireflyZones[i % fireflyZones.length];
    const angle = rand() * Math.PI * 2;
    const dist = 1.2 + rand() * rad;
    const fx = zx + Math.cos(angle) * dist;
    const fz = zz + Math.sin(angle) * dist;
    const fy = groundHeightAt(fx, fz) + 0.65 + rand() * 2.6;

    ffBasePositions[i * 3] = fx;
    ffBasePositions[i * 3 + 1] = fy;
    ffBasePositions[i * 3 + 2] = fz;

    ffPositions[i * 3] = fx;
    ffPositions[i * 3 + 1] = fy;
    ffPositions[i * 3 + 2] = fz;

    ffPhases[i] = rand() * Math.PI * 2;
    ffScales[i] = 1.6 + rand() * 2.2;
  }

  const ffGeo = trackGeo(new THREE.BufferGeometry());
  const ffPosAttr = new THREE.BufferAttribute(ffPositions, 3);
  ffGeo.setAttribute('position', ffPosAttr);
  ffGeo.setAttribute('aPhase', new THREE.BufferAttribute(ffPhases, 1));
  ffGeo.setAttribute('aScale', new THREE.BufferAttribute(ffScales, 1));

  const ffUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uMap: { value: textures.fireflyGlow },
  };

  const ffMat = trackMat(
    new THREE.ShaderMaterial({
      uniforms: ffUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aPhase;
        attribute float aScale;
        uniform float uTime;
        varying float vPulse;
        void main() {
          float wave = 0.5 + 0.5 * sin(uTime * 2.3 + aPhase);
          vPulse = 0.25 + 0.75 * wave * wave;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aScale * (115.0 / max(-mvPosition.z, 1.0)) * (0.75 + 0.45 * vPulse);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform sampler2D uMap;
        varying float vPulse;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float alpha = tex.a * uOpacity * vPulse;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vec3(0.95, 1.0, 0.58) * tex.rgb, alpha);
        }
      `,
    }),
  );

  const fireflies = new THREE.Points(ffGeo, ffMat);
  fireflies.frustumCulled = false;
  fireflies.visible = false;
  group.add(fireflies);

  return {
    group,
    update: (delta, elapsed, tod) => {
      const dt = Math.min(delta, 0.05);

      // 1. Update gently falling leaves carried by village wind
      for (let i = 0; i < leaves.length; i++) {
        const lf = leaves[i];
        const w = wind.sampleWind(lf.x, lf.z, elapsed);
        lf.x += (w.x * 0.45 + Math.sin(elapsed * 1.4 + lf.swayPhase) * 0.28) * dt;
        lf.z += (w.z * 0.45 + Math.cos(elapsed * 1.1 + lf.swayPhase) * 0.22) * dt;
        lf.y -= lf.fallSpeed * dt;

        const floorY = groundHeightAt(lf.x, lf.z) + 0.08;
        if (lf.y <= floorY) {
          lf.x = lf.originX + Math.sin(elapsed + i) * 2.2;
          lf.z = lf.originZ + Math.cos(elapsed + i * 1.7) * 2.2;
          lf.y = groundHeightAt(lf.x, lf.z) + 4.8 + (i % 4) * 0.75;
        }

        dummy.position.set(lf.x, lf.y, lf.z);
        dummy.rotation.set(
          Math.sin(elapsed * lf.spinSpeed + lf.swayPhase) * 0.9,
          elapsed * lf.spinSpeed * 0.65 + lf.swayPhase,
          Math.cos(elapsed * lf.spinSpeed * 0.8 + lf.swayPhase) * 0.85,
        );
        dummy.scale.setScalar(lf.scale);
        dummy.updateMatrix();
        leafInstanced.setMatrixAt(i, dummy.matrix);
      }
      leafInstanced.instanceMatrix.needsUpdate = true;

      // 2. Butterflies active in Day & Sunset, tucked away at Night
      const dayActivity = Math.max(0, 1 - tod.nightWeight * 1.35);
      butterfliesGroup.visible = dayActivity > 0.05;
      if (butterfliesGroup.visible) {
        for (const b of butterflies) {
          const t = elapsed * b.speed + b.phase;
          const bx = b.centerX + Math.cos(t) * b.radius + Math.sin(t * 2.3) * 0.45;
          const bz = b.centerZ + Math.sin(t * 0.85) * b.radius;
          const by = groundHeightAt(bx, bz) + b.heightOffset + Math.sin(t * 3.1) * 0.32;

          const nextT = t + 0.06;
          const nx = b.centerX + Math.cos(nextT) * b.radius + Math.sin(nextT * 2.3) * 0.45;
          const nz = b.centerZ + Math.sin(nextT * 0.85) * b.radius;

          b.group.position.set(bx, by, bz);
          b.group.rotation.y = Math.atan2(nx - bx, nz - bz);
          b.group.scale.setScalar(dayActivity);

          const flap = Math.sin(elapsed * b.flapSpeed + b.phase) * 0.88;
          b.leftWing.rotation.z = flap;
          b.rightWing.rotation.z = -flap;
        }
      }

      // 3. Distant flying birds over Sahyadri hills (day & sunset)
      birdsGroup.visible = dayActivity > 0.08;
      if (birdsGroup.visible) {
        for (const bird of birds) {
          const ang = elapsed * bird.speed + bird.phase;
          const x = bird.orbitCenterX + Math.cos(ang) * bird.orbitRadiusX;
          const z = bird.orbitCenterZ + Math.sin(ang) * bird.orbitRadiusZ;
          const y = bird.altitude + Math.sin(elapsed * 0.65 + bird.phase) * 1.25;

          const angNext = ang + (bird.speed >= 0 ? 0.05 : -0.05);
          const nx = bird.orbitCenterX + Math.cos(angNext) * bird.orbitRadiusX;
          const nz = bird.orbitCenterZ + Math.sin(angNext) * bird.orbitRadiusZ;

          bird.group.position.set(x, y, z);
          bird.group.rotation.y = Math.atan2(nx - x, nz - z);
          bird.group.rotation.z = (bird.speed >= 0 ? -1 : 1) * 0.14;

          // Alternating gentle wingbeats & short glides
          const glideMask = Math.sin(elapsed * 0.7 + bird.phase) > -0.25 ? 1 : 0.18;
          const flap = Math.sin(elapsed * bird.flapRate + bird.phase) * 0.52 * glideMask;
          bird.leftWing.rotation.z = flap;
          bird.rightWing.rotation.z = -flap;
        }
      }

      // 4. Fireflies drifting & glowing softly at dusk and night
      const ffOpacity = THREE.MathUtils.smoothstep(tod.nightWeight + tod.sunsetWeight * 0.25, 0.22, 0.92);
      ffUniforms.uTime.value = elapsed;
      ffUniforms.uOpacity.value = ffOpacity;
      fireflies.visible = ffOpacity > 0.01;

      if (fireflies.visible) {
        for (let i = 0; i < fireflyCount; i++) {
          const ph = ffPhases[i];
          const bx = ffBasePositions[i * 3];
          const by = ffBasePositions[i * 3 + 1];
          const bz = ffBasePositions[i * 3 + 2];

          ffPositions[i * 3] = bx + Math.sin(elapsed * 0.62 + ph) * 0.85;
          ffPositions[i * 3 + 1] = by + Math.sin(elapsed * 0.95 + ph * 1.3) * 0.42;
          ffPositions[i * 3 + 2] = bz + Math.cos(elapsed * 0.54 + ph * 0.8) * 0.85;
        }
        ffPosAttr.needsUpdate = true;
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

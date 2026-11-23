import * as THREE from 'three';
import { groundHeightAt } from '../terrain';
import type { ProceduralTextureSet } from '../textures';

export interface VillageCharactersResult {
  group: THREE.Group;
  update: (delta: number, elapsed: number, cameraPos: THREE.Vector3) => void;
  dispose: () => void;
}

type CharacterRole =
  | 'teacher-board'
  | 'student-writing'
  | 'student-handraise'
  | 'student-reading'
  | 'student-discussing'
  | 'playground-football-a'
  | 'playground-football-b'
  | 'playground-hopscotch'
  | 'playground-talking'
  | 'playground-under-tree'
  | 'library-reading'
  | 'library-shelf-pick'
  | 'library-discussing'
  | 'activity-painting'
  | 'activity-cricket'
  | 'community-chatting';

interface CharacterSpec {
  id: string;
  role: CharacterRole;
  /** World X, Z position */
  x: number;
  z: number;
  /** Optional explicit Y offset above groundHeightAt(x, z) for floors/benches */
  yOffset: number;
  /** Facing yaw in radians */
  yaw: number;
  /** Height scale (0.72–0.85 for kids, 1.08 for teacher/elders) */
  scale: number;
  seated: boolean;
  skinHex: string;
  topHex: string;
  bottomHex: string;
  hairHex: string;
  hairStyle: 'short' | 'braids' | 'bun' | 'parted';
  prop?: 'notebook' | 'book' | 'chalk' | 'brush' | 'bat' | 'schoolbag';
  phase: number;
}

interface AnimatedCharacterRig {
  spec: CharacterSpec;
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  eyelids: THREE.Mesh[];
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  bookPage?: THREE.Mesh;
  worldPos: THREE.Vector3;
  baseY: number;
  nextBlinkAt: number;
  blinkTimer: number;
  lodOffset: number;
}

/**
 * Stylized animated rural Maharashtra village characters:
 * - Village School classroom: teacher at blackboard + 5 students studying, writing, raising hands & discussing
 * - Village School playground: 5 well-spaced children playing football, hopscotch, talking & resting under shade tree
 * - Garad Granthalay library: 4 children reading, turning pages, selecting books from shelves & quietly discussing
 * - Activity Ground: 4 children painting at easels & enjoying sports
 * - Community Centre: 2 welcoming community members conversing naturally on the chaupal
 *
 * Uses shared low-poly stylized geometries and distance-based LOD throttling for smooth 60fps performance.
 */
export function buildVillageCharacters(textures: ProceduralTextureSet): VillageCharactersResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'LivingVillageCharacters';

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

  // Shared stylized low-poly character geometries (reused across all characters to minimize memory)
  const headGeo = trackGeo(new THREE.SphereGeometry(0.165, 14, 12));
  const hairCapGeo = trackGeo(new THREE.SphereGeometry(0.174, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58));
  const braidGeo = trackGeo(new THREE.CapsuleGeometry(0.036, 0.14, 4, 8));
  const bunGeo = trackGeo(new THREE.SphereGeometry(0.068, 10, 8));
  const eyeWhiteGeo = trackGeo(new THREE.SphereGeometry(0.028, 8, 8));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(0.017, 8, 8));
  const eyelidGeo = trackGeo(new THREE.BoxGeometry(0.062, 0.03, 0.02));
  const torsoGeo = trackGeo(new THREE.CapsuleGeometry(0.135, 0.24, 6, 12));
  const collarGeo = trackGeo(new THREE.TorusGeometry(0.092, 0.022, 6, 12));
  const armGeo = trackGeo(new THREE.CapsuleGeometry(0.042, 0.21, 5, 8));
  const handGeo = trackGeo(new THREE.SphereGeometry(0.044, 8, 8));
  const legGeo = trackGeo(new THREE.CapsuleGeometry(0.052, 0.25, 5, 8));
  const shoeGeo = trackGeo(new THREE.BoxGeometry(0.095, 0.055, 0.145));
  const bagGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.24, 0.1));
  const bookCoverGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.025, 0.2));
  const bookPageGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.012, 0.18));
  const chalkGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6));
  const brushGeo = trackGeo(new THREE.CylinderGeometry(0.01, 0.014, 0.24, 6));
  const batGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.62, 0.045));
  const shadowDiscGeo = trackGeo(new THREE.PlaneGeometry(0.68, 0.68));

  const eyeWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.2 }));
  const pupilMat = trackMat(new THREE.MeshStandardMaterial({ color: '#1F1814', roughness: 0.15 }));
  const shoeMat = trackMat(new THREE.MeshStandardMaterial({ color: '#3B2C22', roughness: 0.85 }));
  const pageMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FFFDF4', roughness: 0.9 }));
  const chalkMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 }));
  const woodMat = trackMat(new THREE.MeshStandardMaterial({ color: '#B87C44', roughness: 0.8 }));
  const contactShadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );

  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const getColorMat = (hex: string, roughness = 0.78) => {
    const key = `${hex}_${roughness}`;
    let m = matCache.get(key);
    if (!m) {
      m = trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness }));
      matCache.set(key, m);
    }
    return m;
  };

  // Exact world coordinates aligned with the 5 preserved destination hubs:
  // Village School hub: [-15.5, 6.5] (plinth floor yOffset = 0.54, benches at z = 6.5)
  // Village Library hub: [-12.5, -12.5] (courtyard yOffset = 0.18, plinth yOffset = 0.52)
  // Activity Ground hub: [14.0, 9.5] (court yOffset = 0.24, pergola at [9.45, 10.85])
  // Community Centre hub: [15.5, -10.5] (chaupal plinth yOffset = 0.58)
  const SPECS: CharacterSpec[] = [
    // =========================================================================
    // 1. VILLAGE SCHOOL CLASSROOM ([-15.5, 6.5]) — Zilla Parishad uniforms
    // =========================================================================
    {
      id: 'school-teacher',
      role: 'teacher-board',
      x: -14.1,
      z: 5.05,
      yOffset: 0.54,
      yaw: -Math.PI * 0.22,
      scale: 1.08,
      seated: false,
      skinHex: '#C68B5E',
      topHex: '#E07A38', // Warm terracotta-saffron cotton saree/kurta
      bottomHex: '#7A3022',
      hairHex: '#1F1B18',
      hairStyle: 'bun',
      prop: 'chalk',
      phase: 0.2,
    },
    {
      id: 'student-write-1',
      role: 'student-writing',
      x: -17.35,
      z: 6.52,
      yOffset: 0.54,
      yaw: Math.PI,
      scale: 0.78,
      seated: true,
      skinHex: '#C98E62',
      topHex: '#9AC6E6', // Zilla Parishad sky-blue shirt
      bottomHex: '#253D61', // Navy shorts/skirt
      hairHex: '#1D1815',
      hairStyle: 'braids',
      prop: 'notebook',
      phase: 0.8,
    },
    {
      id: 'student-handraise-1',
      role: 'student-handraise',
      x: -15.85,
      z: 6.52,
      yOffset: 0.54,
      yaw: Math.PI * 0.96,
      scale: 0.8,
      seated: true,
      skinHex: '#B97B50',
      topHex: '#9AC6E6',
      bottomHex: '#253D61',
      hairHex: '#191614',
      hairStyle: 'short',
      prop: 'notebook',
      phase: 1.9,
    },
    {
      id: 'student-discuss-a',
      role: 'student-discussing',
      x: -15.15,
      z: 6.52,
      yOffset: 0.54,
      yaw: Math.PI * 0.84,
      scale: 0.77,
      seated: true,
      skinHex: '#D0976B',
      topHex: '#9AC6E6',
      bottomHex: '#253D61',
      hairHex: '#211B18',
      hairStyle: 'braids',
      prop: 'book',
      phase: 2.7,
    },
    {
      id: 'student-discuss-b',
      role: 'student-discussing',
      x: -13.98,
      z: 6.52,
      yOffset: 0.54,
      yaw: -Math.PI * 0.84,
      scale: 0.79,
      seated: true,
      skinHex: '#B6764B',
      topHex: '#9AC6E6',
      bottomHex: '#253D61',
      hairHex: '#1C1714',
      hairStyle: 'parted',
      prop: 'notebook',
      phase: 3.4,
    },
    {
      id: 'student-read-back',
      role: 'student-reading',
      x: -13.28,
      z: 6.52,
      yOffset: 0.54,
      yaw: Math.PI,
      scale: 0.81,
      seated: true,
      skinHex: '#C4865A',
      topHex: '#9AC6E6',
      bottomHex: '#253D61',
      hairHex: '#1C1715',
      hairStyle: 'short',
      prop: 'book',
      phase: 4.1,
    },

    // =========================================================================
    // 2. VILLAGE SCHOOL PLAYGROUND & COURTYARD ([-15.5, 6.5] front & side)
    // =========================================================================
    {
      id: 'pg-football-a',
      role: 'playground-football-a',
      x: -18.3,
      z: 10.9,
      yOffset: 0.16,
      yaw: Math.PI * 0.48,
      scale: 0.78,
      seated: false,
      skinHex: '#BE7F54',
      topHex: '#F0A83B',
      bottomHex: '#2A4365',
      hairHex: '#1C1715',
      hairStyle: 'short',
      phase: 0.5,
    },
    {
      id: 'pg-football-b',
      role: 'playground-football-b',
      x: -16.0,
      z: 11.1,
      yOffset: 0.16,
      yaw: -Math.PI * 0.52,
      scale: 0.76,
      seated: false,
      skinHex: '#CD9368',
      topHex: '#46A28D',
      bottomHex: '#334E5E',
      hairHex: '#211B18',
      hairStyle: 'parted',
      phase: 1.6,
    },
    {
      id: 'pg-hopscotch',
      role: 'playground-hopscotch',
      x: -13.6,
      z: 10.85,
      yOffset: 0.16,
      yaw: Math.PI * 0.12,
      scale: 0.75,
      seated: false,
      skinHex: '#C78A5D',
      topHex: '#E0607A',
      bottomHex: '#F2E4C9',
      hairHex: '#1E1815',
      hairStyle: 'braids',
      phase: 2.3,
    },
    {
      id: 'pg-talker',
      role: 'playground-talking',
      x: -12.35,
      z: 10.55,
      yOffset: 0.16,
      yaw: -Math.PI * 0.62,
      scale: 0.79,
      seated: false,
      skinHex: '#B6774C',
      topHex: '#9AC6E6',
      bottomHex: '#253D61',
      hairHex: '#1A1614',
      hairStyle: 'short',
      prop: 'schoolbag',
      phase: 3.1,
    },
    {
      id: 'pg-shade-tree',
      role: 'playground-under-tree',
      x: -19.55,
      z: 9.15,
      yOffset: 0.24,
      yaw: Math.PI * 0.28,
      scale: 0.77,
      seated: true,
      skinHex: '#CA8E63',
      topHex: '#E68344',
      bottomHex: '#2B4A58',
      hairHex: '#1F1916',
      hairStyle: 'braids',
      prop: 'book',
      phase: 4.5,
    },

    // =========================================================================
    // 3. GARAD GRANTHALAY — VILLAGE LIBRARY ([-12.5, -12.5])
    // =========================================================================
    {
      id: 'lib-shelf-picker',
      role: 'library-shelf-pick',
      x: -13.75,
      z: -9.3,
      yOffset: 0.52,
      yaw: Math.PI * 0.88,
      scale: 0.8,
      seated: false,
      skinHex: '#C5885C',
      topHex: '#E7A83B',
      bottomHex: '#334E68',
      hairHex: '#1D1815',
      hairStyle: 'braids',
      prop: 'book',
      phase: 0.9,
    },
    {
      id: 'lib-discuss-a',
      role: 'library-discussing',
      x: -14.32,
      z: -9.01,
      yOffset: 0.22,
      yaw: -Math.PI * 0.72,
      scale: 0.78,
      seated: true,
      skinHex: '#BA7C51',
      topHex: '#4E9B88',
      bottomHex: '#284052',
      hairHex: '#1C1714',
      hairStyle: 'short',
      prop: 'book',
      phase: 1.8,
    },
    {
      id: 'lib-discuss-b',
      role: 'library-discussing',
      x: -15.7,
      z: -7.53,
      yOffset: 0.22,
      yaw: Math.PI * 0.25,
      scale: 0.79,
      seated: true,
      skinHex: '#D0986D',
      topHex: '#DE6E4B',
      bottomHex: '#4B3A5E',
      hairHex: '#221C18',
      hairStyle: 'braids',
      prop: 'book',
      phase: 2.9,
    },
    {
      id: 'lib-quiet-reader',
      role: 'library-reading',
      x: -11.27,
      z: -8.51,
      yOffset: 0.22,
      yaw: -Math.PI * 0.72,
      scale: 0.82,
      seated: true,
      skinHex: '#C4865B',
      topHex: '#6F9AD1',
      bottomHex: '#2A3F54',
      hairHex: '#1B1613',
      hairStyle: 'parted',
      prop: 'book',
      phase: 3.7,
    },

    // =========================================================================
    // 4. ACTIVITY GROUND — YOUTH DEVELOPMENT ([14.0, 9.5])
    // =========================================================================
    {
      id: 'act-painter-1',
      role: 'activity-painting',
      x: 9.2,
      z: 11.45,
      yOffset: 0.14,
      yaw: Math.PI + 0.42,
      scale: 0.84,
      seated: false,
      skinHex: '#C88C60',
      topHex: '#E88542',
      bottomHex: '#2F4858',
      hairHex: '#1E1815',
      hairStyle: 'braids',
      prop: 'brush',
      phase: 1.1,
    },
    {
      id: 'act-painter-2',
      role: 'activity-painting',
      x: 10.18,
      z: 11.05,
      yOffset: 0.14,
      yaw: Math.PI + 0.36,
      scale: 0.82,
      seated: false,
      skinHex: '#B8794E',
      topHex: '#59A386',
      bottomHex: '#3A4A5B',
      hairHex: '#1B1614',
      hairStyle: 'short',
      prop: 'brush',
      phase: 2.4,
    },
    {
      id: 'act-cricket-batter',
      role: 'activity-cricket',
      x: 16.25,
      z: 10.75,
      yOffset: 0.24,
      yaw: -Math.PI * 0.65,
      scale: 0.85,
      seated: false,
      skinHex: '#C48558',
      topHex: '#F3B63A',
      bottomHex: '#253D5E',
      hairHex: '#1D1714',
      hairStyle: 'short',
      prop: 'bat',
      phase: 0.6,
    },
    {
      id: 'act-player-2',
      role: 'playground-talking',
      x: 13.75,
      z: 9.85,
      yOffset: 0.24,
      yaw: Math.PI * 0.38,
      scale: 0.82,
      seated: false,
      skinHex: '#CE946A',
      topHex: '#639CD9',
      bottomHex: '#2C3E50',
      hairHex: '#201A17',
      hairStyle: 'parted',
      phase: 3.3,
    },

    // =========================================================================
    // 5. COMMUNITY CENTRE — CHAUPAL ([15.5, -10.5])
    // =========================================================================
    {
      id: 'comm-member-1',
      role: 'community-chatting',
      x: 14.3,
      z: -10.35,
      yOffset: 0.58,
      yaw: Math.PI * 0.45,
      scale: 1.04,
      seated: true,
      skinHex: '#B97C52',
      topHex: '#F3EAD4', // Cream cotton kurta
      bottomHex: '#6A513E',
      hairHex: '#46413D',
      hairStyle: 'short',
      phase: 1.4,
    },
    {
      id: 'comm-member-2',
      role: 'community-chatting',
      x: 16.65,
      z: -10.35,
      yOffset: 0.58,
      yaw: -Math.PI * 0.45,
      scale: 1.02,
      seated: true,
      skinHex: '#C78A5F',
      topHex: '#C8523A', // Warm maroon-terracotta cotton saree
      bottomHex: '#8E3724',
      hairHex: '#2A2523',
      hairStyle: 'bun',
      phase: 2.8,
    },
  ];

  // Bouncing playground football shared between pg-football-a and pg-football-b
  const playgroundBall = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.18, 12, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#FAF8F0', roughness: 0.55 })),
  );
  const pgBallMidX = -17.15;
  const pgBallMidZ = 11.0;
  playgroundBall.position.set(pgBallMidX, groundHeightAt(pgBallMidX, pgBallMidZ) + 0.34, pgBallMidZ);
  rootGroup.add(playgroundBall);

  const rigs: AnimatedCharacterRig[] = [];

  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i];
    const root = new THREE.Group();
    root.name = `Char_${spec.id}`;

    const groundY = groundHeightAt(spec.x, spec.z) + spec.yOffset;
    root.position.set(spec.x, groundY, spec.z);
    root.rotation.y = spec.yaw;
    root.scale.setScalar(spec.scale);

    // Subtle grounded contact shadow (avoids heavy shadow-map cost per character limb)
    const shadow = new THREE.Mesh(shadowDiscGeo, contactShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    root.add(shadow);

    const skinMat = getColorMat(spec.skinHex, 0.72);
    const topMat = getColorMat(spec.topHex, 0.82);
    const bottomMat = getColorMat(spec.bottomHex, 0.85);
    const hairMat = getColorMat(spec.hairHex, 0.88);

    const hipY = spec.seated ? 0.34 : 0.48;

    // Legs
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.075, hipY, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, bottomMat);
    leftLegMesh.position.y = -0.18;
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.37, 0.03);
    leftLeg.add(leftLegMesh, leftShoe);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.075, hipY, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, bottomMat);
    rightLegMesh.position.y = -0.18;
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.37, 0.03);
    rightLeg.add(rightLegMesh, rightShoe);

    if (spec.seated) {
      leftLeg.rotation.x = -Math.PI * 0.44;
      rightLeg.rotation.x = -Math.PI * 0.44;
    }

    root.add(leftLeg, rightLeg);

    // Torso pivot
    const torso = new THREE.Group();
    torso.position.set(0, hipY, 0);

    const torsoMesh = new THREE.Mesh(torsoGeo, topMat);
    torsoMesh.position.y = 0.22;
    torso.add(torsoMesh);

    const collar = new THREE.Mesh(collarGeo, getColorMat('#FFFFFF', 0.85));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.42;
    torso.add(collar);

    // Optional small schoolbag on back
    if (spec.prop === 'schoolbag') {
      const bag = new THREE.Mesh(bagGeo, getColorMat('#B9562D', 0.84));
      bag.position.set(0, 0.23, -0.16);
      torso.add(bag);
    }

    // Head & expressive blinking eyes
    const head = new THREE.Group();
    head.position.set(0, 0.56, 0);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    head.add(headMesh);

    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.y = 0.025;
    head.add(hairCap);

    if (spec.hairStyle === 'braids') {
      for (const sx of [-0.145, 0.145]) {
        const braid = new THREE.Mesh(braidGeo, hairMat);
        braid.position.set(sx, -0.05, -0.05);
        braid.rotation.z = sx < 0 ? 0.24 : -0.24;
        head.add(braid);
        const ribbon = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.028, 6, 6)),
          getColorMat('#E84F3D', 0.7),
        );
        ribbon.position.set(sx * 1.06, -0.14, -0.05);
        head.add(ribbon);
      }
    } else if (spec.hairStyle === 'bun') {
      const bun = new THREE.Mesh(bunGeo, hairMat);
      bun.position.set(0, 0.03, -0.16);
      head.add(bun);
    }

    const eyelids: THREE.Mesh[] = [];
    for (const ex of [-0.055, 0.055]) {
      const ew = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      ew.position.set(ex, 0.015, 0.142);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(ex, 0.015, 0.162);
      const lid = new THREE.Mesh(eyelidGeo, skinMat);
      lid.position.set(ex, 0.035, 0.155);
      lid.scale.y = 0.05;
      head.add(ew, pupil, lid);
      eyelids.push(lid);
    }
    torso.add(head);

    // Arms
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.17, 0.36, 0);
    const lArmMesh = new THREE.Mesh(armGeo, topMat);
    lArmMesh.position.y = -0.13;
    const lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.y = -0.26;
    leftArm.add(lArmMesh, lHand);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.17, 0.36, 0);
    const rArmMesh = new THREE.Mesh(armGeo, topMat);
    rArmMesh.position.y = -0.13;
    const rHand = new THREE.Mesh(handGeo, skinMat);
    rHand.position.y = -0.26;
    rightArm.add(rArmMesh, rHand);

    // Character props
    let bookPage: THREE.Mesh | undefined;
    if (spec.prop === 'book' || spec.prop === 'notebook') {
      const bookHolder = new THREE.Group();
      bookHolder.position.set(0, -0.26, 0.09);
      const cover = new THREE.Mesh(
        bookCoverGeo,
        getColorMat(spec.prop === 'book' ? '#D4572C' : '#3E7CA6', 0.8),
      );
      const page = new THREE.Mesh(bookPageGeo, pageMat);
      page.position.y = 0.018;
      bookHolder.add(cover, page);
      leftArm.add(bookHolder);
      bookPage = page;
    } else if (spec.prop === 'chalk') {
      const chalk = new THREE.Mesh(chalkGeo, chalkMat);
      chalk.rotation.x = Math.PI / 2;
      chalk.position.set(0, -0.27, 0.06);
      rightArm.add(chalk);
    } else if (spec.prop === 'brush') {
      const brush = new THREE.Mesh(brushGeo, woodMat);
      brush.rotation.x = Math.PI * 0.45;
      brush.position.set(0, -0.27, 0.11);
      rightArm.add(brush);
    } else if (spec.prop === 'bat') {
      const bat = new THREE.Mesh(batGeo, woodMat);
      bat.position.set(0, -0.45, 0.09);
      bat.rotation.x = 0.25;
      rightArm.add(bat);
    }

    torso.add(leftArm, rightArm);
    root.add(torso);
    rootGroup.add(root);

    rigs.push({
      spec,
      root,
      torso,
      head,
      eyelids,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      bookPage,
      worldPos: new THREE.Vector3(spec.x, groundY, spec.z),
      baseY: groundY,
      nextBlinkAt: 1.5 + (i * 0.73) % 3.8,
      blinkTimer: 0,
      lodOffset: i % 3,
    });
  }

  let frameCounter = 0;

  return {
    group: rootGroup,
    update: (delta, elapsed, cameraPos) => {
      const dt = Math.min(delta, 0.05);
      frameCounter++;

      // Animate bouncing playground football back and forth between the two schoolyard kids
      const kickCycle = (Math.sin(elapsed * 1.85) + 1) * 0.5;
      const ballX = THREE.MathUtils.lerp(-17.95, -16.35, kickCycle);
      const ballZ = THREE.MathUtils.lerp(10.92, 11.08, kickCycle);
      const arc = Math.sin(kickCycle * Math.PI) * 0.48;
      playgroundBall.position.set(ballX, groundHeightAt(ballX, ballZ) + 0.34 + arc, ballZ);
      playgroundBall.rotation.z -= dt * 4.2;

      for (let i = 0; i < rigs.length; i++) {
        const rig = rigs[i];
        const distSq = rig.worldPos.distanceToSquared(cameraPos);

        // Distance-based LOD throttling: distant characters update at lower frequency
        if (distSq > 3200) continue; // > 56 units: freeze micro motion
        if (distSq > 1150 && (frameCounter + rig.lodOffset) % 3 !== 0) continue;

        const t = elapsed + rig.spec.phase;
        const role = rig.spec.role;

        // Subtle living breathing
        rig.torso.scale.y = 1 + Math.sin(t * 2.1) * 0.014;

        // Natural asynchronous blinking when camera is reasonably close
        if (distSq < 900) {
          if (rig.blinkTimer > 0) {
            rig.blinkTimer = Math.max(0, rig.blinkTimer - dt);
            const blinkAmount = Math.sin((rig.blinkTimer / 0.14) * Math.PI);
            for (const lid of rig.eyelids) {
              lid.scale.y = 0.05 + blinkAmount * 0.95;
            }
          } else if (elapsed >= rig.nextBlinkAt) {
            rig.blinkTimer = 0.14;
            rig.nextBlinkAt = elapsed + 2.8 + ((i * 1.37 + elapsed) % 3.4);
          }
        }

        // Role-specific natural animation
        switch (role) {
          case 'teacher-board': {
            // Explaining lesson: turns smoothly between blackboard and students, gesturing with chalk
            const turnToBoard = Math.sin(t * 0.65) * 0.52;
            rig.torso.rotation.y = turnToBoard;
            rig.head.rotation.y = Math.sin(t * 1.1) * 0.22;
            rig.head.rotation.x = Math.sin(t * 1.6) * 0.07;
            rig.rightArm.rotation.x = -1.25 + Math.sin(t * 3.2) * 0.24;
            rig.rightArm.rotation.z = -0.18 + Math.cos(t * 2.6) * 0.14;
            rig.leftArm.rotation.x = -0.45 + Math.sin(t * 1.4) * 0.12;
            break;
          }
          case 'student-writing': {
            // Leaning gently over desk writing in notebook, occasionally glancing up at teacher
            const lookUp = Math.max(0, Math.sin(t * 0.55) - 0.55) * 1.3;
            rig.torso.rotation.x = 0.18 - lookUp * 0.1;
            rig.head.rotation.x = 0.26 - lookUp * 0.32;
            rig.head.rotation.y = Math.sin(t * 0.8) * 0.08;
            rig.leftArm.rotation.x = -0.82;
            rig.rightArm.rotation.x = -0.88 + Math.sin(t * 6.5) * 0.06;
            rig.rightArm.rotation.z = Math.cos(t * 5.2) * 0.09;
            break;
          }
          case 'student-handraise': {
            // Periodically raises right hand eagerly to answer a question
            const raiseCycle = THREE.MathUtils.smoothstep(Math.sin(t * 0.68), 0.15, 0.78);
            rig.torso.rotation.x = 0.06;
            rig.head.rotation.x = -0.05 + Math.sin(t * 1.3) * 0.06;
            rig.head.rotation.y = Math.sin(t * 0.9) * 0.14;
            rig.rightArm.rotation.x = THREE.MathUtils.lerp(-0.75, -2.55, raiseCycle);
            rig.rightArm.rotation.z = THREE.MathUtils.lerp(0.05, -0.16, raiseCycle);
            rig.leftArm.rotation.x = -0.78;
            break;
          }
          case 'student-reading':
          case 'library-reading': {
            // Reading a book with periodic gentle page turns
            rig.torso.rotation.x = 0.12;
            rig.head.rotation.x = 0.24 + Math.sin(t * 0.9) * 0.06;
            rig.head.rotation.y = Math.sin(t * 1.2) * 0.12;
            rig.leftArm.rotation.x = -0.92;
            const pageTurn = Math.max(0, Math.sin(t * 1.05) - 0.72) * 3.5;
            rig.rightArm.rotation.x = -0.92 - pageTurn * 0.26;
            rig.rightArm.rotation.z = 0.18 - pageTurn * 0.35;
            if (rig.bookPage) {
              rig.bookPage.rotation.z = pageTurn * 0.45;
            }
            break;
          }
          case 'student-discussing':
          case 'library-discussing': {
            // Quietly leaning in, nodding & gesturing while discussing a lesson/book
            rig.torso.rotation.x = 0.1;
            rig.head.rotation.x = 0.08 + Math.sin(t * 2.6) * 0.1;
            rig.head.rotation.y = Math.sin(t * 1.1) * 0.22;
            rig.leftArm.rotation.x = -0.82;
            rig.rightArm.rotation.x = -0.72 + Math.sin(t * 2.3) * 0.22;
            rig.rightArm.rotation.z = Math.cos(t * 1.9) * 0.14;
            break;
          }
          case 'playground-football-a': {
            // Kicking & stepping in sync with playgroundBall cycle
            const kick = Math.max(0, -Math.sin(elapsed * 1.85) - 0.65) * 2.8;
            rig.rightLeg.rotation.x = -kick * 0.75;
            rig.leftLeg.rotation.x = kick * 0.22;
            rig.leftArm.rotation.x = 0.25 + Math.sin(t * 2.6) * 0.25;
            rig.rightArm.rotation.x = -0.25 - kick * 0.35;
            rig.root.position.y = rig.baseY + Math.abs(Math.sin(t * 3.2)) * 0.05;
            rig.head.rotation.y = Math.sin(elapsed * 1.85) * 0.18;
            break;
          }
          case 'playground-football-b': {
            const kick = Math.max(0, Math.sin(elapsed * 1.85) - 0.65) * 2.8;
            rig.leftLeg.rotation.x = -kick * 0.75;
            rig.rightLeg.rotation.x = kick * 0.22;
            rig.rightArm.rotation.x = 0.25 + Math.sin(t * 2.4) * 0.25;
            rig.leftArm.rotation.x = -0.25 - kick * 0.35;
            rig.root.position.y = rig.baseY + Math.abs(Math.cos(t * 3.0)) * 0.05;
            rig.head.rotation.y = -Math.sin(elapsed * 1.85) * 0.18;
            break;
          }
          case 'playground-hopscotch': {
            // Playful rhythmic hopscotch jumps along courtyard
            const hop = Math.abs(Math.sin(t * 3.4));
            const stride = Math.sin(t * 0.85) * 0.55;
            rig.root.position.z = rig.spec.z + stride;
            rig.root.position.y =
              groundHeightAt(rig.spec.x, rig.root.position.z) + hop * 0.24;
            rig.leftArm.rotation.z = 0.45 + hop * 0.35;
            rig.rightArm.rotation.z = -0.45 - hop * 0.35;
            rig.leftLeg.rotation.x = hop * 0.35;
            rig.rightLeg.rotation.x = -hop * 0.25;
            rig.head.rotation.x = -hop * 0.08;
            break;
          }
          case 'playground-talking': {
            // Friendly animated conversation
            rig.head.rotation.y = Math.sin(t * 1.4) * 0.24;
            rig.head.rotation.x = Math.sin(t * 2.4) * 0.08;
            rig.rightArm.rotation.x = -0.45 + Math.sin(t * 2.5) * 0.28;
            rig.leftArm.rotation.x = -0.2 + Math.cos(t * 2.1) * 0.16;
            break;
          }
          case 'playground-under-tree': {
            // Relaxed seated reading & gentle sway under courtyard neem tree
            rig.head.rotation.x = 0.2 + Math.sin(t * 0.85) * 0.08;
            rig.head.rotation.y = Math.sin(t * 0.65) * 0.16;
            rig.leftArm.rotation.x = -0.88;
            rig.rightArm.rotation.x = -0.86 + Math.sin(t * 1.2) * 0.1;
            break;
          }
          case 'library-shelf-pick': {
            // Reaching gently up to inspect and pick a book from a tall shelf
            const reach = 0.5 + 0.5 * Math.sin(t * 0.9);
            rig.rightArm.rotation.x = THREE.MathUtils.lerp(-0.95, -1.95, reach);
            rig.leftArm.rotation.x = -0.85;
            rig.head.rotation.x = THREE.MathUtils.lerp(0.12, -0.22, reach);
            rig.head.rotation.y = Math.sin(t * 0.7) * 0.2;
            break;
          }
          case 'activity-painting': {
            // Brush strokes on creative pergola easel
            rig.rightArm.rotation.x = -1.15 + Math.sin(t * 3.6) * 0.22;
            rig.rightArm.rotation.z = -0.1 + Math.cos(t * 2.8) * 0.18;
            rig.leftArm.rotation.x = -0.55;
            rig.head.rotation.y = Math.sin(t * 1.1) * 0.14;
            rig.head.rotation.x = Math.sin(t * 1.8) * 0.07;
            break;
          }
          case 'activity-cricket': {
            // Ready batting stance with periodic playful practice swing
            const swing = Math.max(0, Math.sin(t * 1.15) - 0.55) * 2.2;
            rig.torso.rotation.y = -0.25 + swing * 0.65;
            rig.rightArm.rotation.x = -0.55 - swing * 0.85;
            rig.leftArm.rotation.x = -0.45 - swing * 0.65;
            rig.head.rotation.y = 0.22;
            break;
          }
          case 'community-chatting': {
            // Calm, warm chaupal conversation with occasional nods
            rig.head.rotation.x = Math.sin(t * 1.6) * 0.09;
            rig.head.rotation.y = Math.sin(t * 0.75) * 0.18;
            rig.rightArm.rotation.x = -0.62 + Math.sin(t * 1.4) * 0.18;
            rig.leftArm.rotation.x = -0.52;
            break;
          }
        }
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

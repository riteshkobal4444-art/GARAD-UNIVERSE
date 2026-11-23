import * as THREE from 'three';
import type {
  BharariAnimationState,
  BharariBehaviorState,
  BharariFlightTelemetry,
  IBharariCharacter,
} from '../../types/universe';
import type { ProceduralTextureSet } from '../textures';

// Reusable scratch vectors allocated once at module scope (zero GC in tick loop)
const _localLook = new THREE.Vector3();

/**
 * BharariCharacter — Stage 2 Cinematic Animation Upgrade (Replaceable Character Module)
 *
 * Strictly preserves Bharari's approved character identity:
 * - Deep blue and monsoon-teal layered plumage
 * - Warm saffron-orange chest with soft nectar highlight
 * - Large expressive glossy brown eyes with gaze tracking & varied natural blinking
 * - Miniature stitched brown leather schoolbag with straps, brass buckles & scroll
 * - Friendly, curious animated-film personality
 *
 * Implements `IBharariCharacter` cleanly so a future production-rigged GLTF/GLB
 * character model can be swapped in without touching scene or UI logic.
 */
export class BharariCharacter implements IBharariCharacter {
  public readonly group: THREE.Group;
  public readonly isPlaceholderModel = true;
  public readonly assetVersionNote =
    'Stage 2 animated procedural Bharari character preserving the approved design (replaceable character module).';

  private readonly rigRoot: THREE.Group;
  private readonly legsPivot: THREE.Group;
  private readonly leftLegPivot: THREE.Group;
  private readonly rightLegPivot: THREE.Group;
  private readonly bodyGroup: THREE.Group;
  private readonly headGroup: THREE.Group;
  private readonly crestGroup: THREE.Group;
  private readonly lowerBeakPivot: THREE.Group;

  // Articulated 2-segment wings (shoulder + outer wrist feather fan)
  private readonly leftShoulderPivot: THREE.Group;
  private readonly leftWristPivot: THREE.Group;
  private readonly rightShoulderPivot: THREE.Group;
  private readonly rightWristPivot: THREE.Group;

  // Fanned layered tail
  private readonly tailGroup: THREE.Group;
  private readonly tailFeathers: THREE.Mesh[] = [];

  // Schoolbag secondary motion
  private readonly backpackGroup: THREE.Group;

  // Expressive eyes (pupils for gaze tracking + eyelids for natural blinking)
  private readonly leftEyeGazePivot: THREE.Group;
  private readonly rightEyeGazePivot: THREE.Group;
  private readonly leftUpperLid: THREE.Mesh;
  private readonly rightUpperLid: THREE.Mesh;
  private readonly contactShadow: THREE.Mesh;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  private behaviorState: BharariBehaviorState = 'IDLE';
  private state: BharariAnimationState = 'idle-perch';
  private transitionPhase = 0;
  private targetBankAngle = 0;
  private currentBankAngle = 0;
  private lookTargetWorld: THREE.Vector3 | null = null;

  private readonly telemetry: BharariFlightTelemetry = {
    speed: 0,
    climbRate: 0,
    bankAngle: 0,
    phase: 0,
    isGliding: false,
  };

  // Continuous wingbeat phase accumulator (allows smooth speed-responsive wingbeat frequency without phase jumps!)
  private wingPhase = 0;
  private backpackLagY = 0;
  private backpackVelY = 0;

  // Expressive non-repetitive IDLE director timers
  private greetTimer = 0;
  private blinkTimer = 2.1;
  private blinkDuration = 0;
  private blinkTotal = 0.15;
  private doubleBlinkPending = false;

  private idleLookTimer = 2.2;
  private idleLookYaw = 0;
  private idleLookPitch = 0;
  private idleHeadTilt = 0;
  private idleEyeLeadX = 0;
  private idleEyeLeadY = 0;

  private wingShuffleTimer = 5.4;
  private wingShuffleActive = 0;
  private wingShuffleSide: -1 | 0 | 1 = 0;

  private curiousReactionTimer = 7.8;
  private curiousReactionActive = 0;
  private seedCounter = 1;

  constructor(textures?: ProceduralTextureSet) {
    this.group = new THREE.Group();
    this.group.name = 'BharariCharacterRoot';

    // Grounded soft contact shadow
    const shadowGeo = this.trackGeo(new THREE.PlaneGeometry(1.3, 1.3));
    const shadowMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        map: textures?.contactShadow ?? null,
        color: 0x2b1f16,
        transparent: true,
        opacity: textures?.contactShadow ? 0.44 : 0.22,
        depthWrite: false,
      }),
    );
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.025;
    this.group.add(this.contactShadow);

    this.rigRoot = new THREE.Group();
    this.group.add(this.rigRoot);

    // --- Upgraded Stylized Film PBR Materials (velvety feather sheen, micro-relief & luminous eyes) ---
    const deepBluePlumageMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x185784,
        map: textures?.featherBlue ?? null,
        bumpMap: textures?.featherBlue ?? null,
        bumpScale: 0.012,
        roughness: 0.56,
        metalness: 0.05,
        sheen: 0.88,
        sheenRoughness: 0.42,
        sheenColor: new THREE.Color('#64c8e8'),
        envMapIntensity: 0.85,
      }),
    );

    const monsoonTealMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x1b83a3,
        map: textures?.featherBlue ?? null,
        bumpMap: textures?.featherBlue ?? null,
        bumpScale: 0.011,
        roughness: 0.48,
        metalness: 0.06,
        sheen: 0.85,
        sheenRoughness: 0.42,
        sheenColor: new THREE.Color('#8ee8fa'),
        envMapIntensity: 0.88,
      }),
    );

    const wingTipBlueMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x103a5d,
        map: textures?.featherBlue ?? null,
        roughness: 0.52,
        metalness: 0.07,
        sheen: 0.65,
        sheenRoughness: 0.48,
        sheenColor: new THREE.Color('#47b2cf'),
        envMapIntensity: 0.82,
      }),
    );

    const lightTealAccentMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x3fb0cb,
        roughness: 0.44,
        metalness: 0.05,
        sheen: 0.72,
        sheenRoughness: 0.44,
        sheenColor: new THREE.Color('#b6f1fc'),
        envMapIntensity: 0.86,
      }),
    );

    const saffronChestMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xea702e,
        map: textures?.featherOrange ?? null,
        bumpMap: textures?.featherOrange ?? null,
        bumpScale: 0.01,
        roughness: 0.62,
        metalness: 0.01,
        sheen: 0.72,
        sheenRoughness: 0.54,
        sheenColor: new THREE.Color('#ffd88a'),
        envMapIntensity: 0.82,
      }),
    );

    const nectarBellyMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf8c070,
        roughness: 0.72,
        metalness: 0.0,
        sheen: 0.58,
        sheenRoughness: 0.58,
        sheenColor: new THREE.Color('#fff5de'),
      }),
    );

    const beakMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf2a532,
        roughness: 0.24,
        metalness: 0.05,
        clearcoat: 0.52,
        clearcoatRoughness: 0.18,
      }),
    );

    const scleraMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xfffbf4,
        roughness: 0.1,
        metalness: 0.0,
        clearcoat: 0.95,
        clearcoatRoughness: 0.05,
      }),
    );

    const warmBrownIrisMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x5d2f16,
        emissive: 0x261106,
        emissiveIntensity: 0.09,
        roughness: 0.08,
        metalness: 0.04,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
      }),
    );

    const amberIrisRimMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xa45b26,
        emissive: 0x3b1d08,
        emissiveIntensity: 0.08,
        roughness: 0.18,
      }),
    );

    const pupilMat = this.trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x120905,
        roughness: 0.03,
        metalness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
      }),
    );

    const catchlightMat = this.trackMat(
      new THREE.MeshBasicMaterial({ color: 0xfffdf8 }),
    );

    const leatherBagMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x7e4829,
        map: textures?.leatherBag ?? null,
        bumpMap: textures?.leatherBag ?? null,
        bumpScale: 0.015,
        roughness: 0.7,
        metalness: 0.04,
      }),
    );

    const leatherFlapMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x955833,
        map: textures?.leatherBag ?? null,
        bumpMap: textures?.leatherBag ?? null,
        bumpScale: 0.012,
        roughness: 0.62,
        metalness: 0.04,
      }),
    );

    const brassBuckleMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xebbc52,
        roughness: 0.2,
        metalness: 0.9,
        envMapIntensity: 1.25,
      }),
    );

    const feetMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xcf7c34,
        roughness: 0.54,
        metalness: 0.02,
      }),
    );

    // --- 1. Articulated Left & Right Legs & Grasping Perch Feet (bottom-center at y = 0) ---
    // Pivoted from the hip (y = 0.29) so feet cleanly tuck back in flight and extend forward on landing!
    this.legsPivot = new THREE.Group();
    this.legsPivot.position.set(0, 0.29, 0.01);
    this.rigRoot.add(this.legsPivot);

    const thighGeo = this.trackGeo(new THREE.SphereGeometry(0.085, 12, 10));
    const shinGeo = this.trackGeo(new THREE.CylinderGeometry(0.032, 0.025, 0.24, 10));
    const toeGeo = this.trackGeo(new THREE.CapsuleGeometry(0.02, 0.085, 4, 8));

    const legPivots: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.125, 0, 0);

      const thigh = new THREE.Mesh(thighGeo, saffronChestMat);
      thigh.scale.set(0.85, 1.0, 0.9);
      thigh.position.set(0, -0.01, 0);
      legGroup.add(thigh);

      const shin = new THREE.Mesh(shinGeo, feetMat);
      shin.position.set(0, -0.145, 0.015);
      shin.rotation.x = 0.08;
      shin.castShadow = true;
      legGroup.add(shin);

      for (const angle of [-0.44, 0, 0.44]) {
        const toe = new THREE.Mesh(toeGeo, feetMat);
        toe.rotation.x = Math.PI / 2;
        toe.rotation.z = angle;
        toe.position.set(Math.sin(angle) * 0.055, -0.266, 0.075 + Math.cos(angle) * 0.04);
        legGroup.add(toe);
      }
      const backToe = new THREE.Mesh(toeGeo, feetMat);
      backToe.rotation.x = Math.PI / 2;
      backToe.position.set(0, -0.266, -0.055);
      legGroup.add(backToe);

      this.legsPivot.add(legGroup);
      legPivots.push(legGroup);
    }
    this.leftLegPivot = legPivots[0];
    this.rightLegPivot = legPivots[1];

    // --- 2. Sculpted Smooth Teardrop Songbird Body (LatheGeometry) ---
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.set(0, 0.56, 0);
    this.rigRoot.add(this.bodyGroup);

    const bodyProfile: THREE.Vector2[] = [
      new THREE.Vector2(0.001, -0.34),
      new THREE.Vector2(0.16, -0.31),
      new THREE.Vector2(0.31, -0.2),
      new THREE.Vector2(0.38, -0.04),
      new THREE.Vector2(0.365, 0.14),
      new THREE.Vector2(0.28, 0.29),
      new THREE.Vector2(0.18, 0.37),
      new THREE.Vector2(0.001, 0.4),
    ];
    const torsoGeo = this.trackGeo(new THREE.LatheGeometry(bodyProfile, 28));
    const torso = new THREE.Mesh(torsoGeo, deepBluePlumageMat);
    torso.scale.set(0.96, 1.0, 1.08);
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.bodyGroup.add(torso);

    // Monsoon-teal sculpted shoulder mantle blending neck into wings
    const mantleGeo = this.trackGeo(new THREE.SphereGeometry(0.33, 22, 18));
    const mantle = new THREE.Mesh(mantleGeo, monsoonTealMat);
    mantle.scale.set(1.02, 0.72, 0.96);
    mantle.position.set(0, 0.14, -0.05);
    mantle.castShadow = true;
    this.bodyGroup.add(mantle);

    // Warm saffron-orange sculpted plump chest
    const chestGeo = this.trackGeo(new THREE.SphereGeometry(0.335, 24, 18));
    const chest = new THREE.Mesh(chestGeo, saffronChestMat);
    chest.scale.set(0.92, 1.02, 0.86);
    chest.position.set(0, -0.03, 0.155);
    chest.castShadow = true;
    chest.receiveShadow = true;
    this.bodyGroup.add(chest);

    // Soft golden-nectar fluffy lower belly highlight
    const bellyGeo = this.trackGeo(new THREE.SphereGeometry(0.24, 18, 14));
    const belly = new THREE.Mesh(bellyGeo, nectarBellyMat);
    belly.scale.set(0.94, 0.82, 0.72);
    belly.position.set(0, -0.18, 0.18);
    this.bodyGroup.add(belly);

    // --- 3. Expressive Head, Articulated Crest, Gaze-Tracking Brown Eyes & Sculpted Beak ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.41, 0.08);
    this.bodyGroup.add(this.headGroup);

    const headGeo = this.trackGeo(new THREE.SphereGeometry(0.315, 28, 22));
    const headMesh = new THREE.Mesh(headGeo, deepBluePlumageMat);
    headMesh.scale.set(1.04, 0.97, 1.01);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.headGroup.add(headMesh);

    // Soft turquoise-teal cheek tufts & warm throat blend
    const cheekGeo = this.trackGeo(new THREE.SphereGeometry(0.145, 16, 14));
    const blushGeo = this.trackGeo(new THREE.SphereGeometry(0.068, 12, 10));
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(cheekGeo, monsoonTealMat);
      cheek.scale.set(0.76, 0.82, 0.92);
      cheek.position.set(side * 0.215, -0.055, 0.13);
      this.headGroup.add(cheek);

      const blush = new THREE.Mesh(blushGeo, saffronChestMat);
      blush.scale.set(0.9, 0.65, 0.55);
      blush.position.set(side * 0.19, -0.08, 0.22);
      this.headGroup.add(blush);
    }

    // Articulated crown crest group for expressive curiosity & alert perks
    this.crestGroup = new THREE.Group();
    this.crestGroup.position.set(0, 0.26, -0.03);
    this.headGroup.add(this.crestGroup);

    const crestShape = new THREE.Shape();
    crestShape.moveTo(0, 0);
    crestShape.quadraticCurveTo(0.065, 0.1, 0.02, 0.25);
    crestShape.quadraticCurveTo(-0.045, 0.13, 0, 0);
    const crestFeatherGeo = this.trackGeo(
      new THREE.ExtrudeGeometry(crestShape, {
        depth: 0.02,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      }),
    );
    crestFeatherGeo.center();

    const crestSpecs: Array<[number, number, number, number, number, number, THREE.Material]> = [
      [0, 0.09, 0.01, -0.32, 0, 0, monsoonTealMat],
      [0.05, 0.06, -0.05, -0.58, 0.22, -0.18, lightTealAccentMat],
      [-0.045, 0.05, -0.06, -0.62, -0.2, 0.16, deepBluePlumageMat],
    ];
    for (const [cx, cy, cz, rx, ry, rz, mat] of crestSpecs) {
      const cf = new THREE.Mesh(crestFeatherGeo, mat);
      cf.position.set(cx, cy, cz);
      cf.rotation.set(rx, ry, rz);
      cf.castShadow = true;
      this.crestGroup.add(cf);
    }

    // Large Expressive Glossy Brown Eyes with Gaze Pivot & Eyelids
    const scleraGeo = this.trackGeo(new THREE.SphereGeometry(0.112, 20, 16));
    const irisRimGeo = this.trackGeo(new THREE.SphereGeometry(0.089, 18, 16));
    const irisGeo = this.trackGeo(new THREE.SphereGeometry(0.084, 18, 16));
    const pupilGeo = this.trackGeo(new THREE.SphereGeometry(0.054, 14, 12));
    const glintGeo = this.trackGeo(new THREE.SphereGeometry(0.024, 10, 10));
    const lidGeo = this.trackGeo(
      new THREE.SphereGeometry(0.121, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    );
    const browGeo = this.trackGeo(new THREE.CapsuleGeometry(0.018, 0.11, 4, 8));

    const gazePivots: THREE.Group[] = [];
    const upperLids: THREE.Mesh[] = [];

    for (const side of [-1, 1]) {
      const eyeSocket = new THREE.Group();
      eyeSocket.position.set(side * 0.148, 0.048, 0.232);
      eyeSocket.rotation.y = side * 0.26;

      const brow = new THREE.Mesh(browGeo, lightTealAccentMat);
      brow.rotation.z = Math.PI / 2 - side * 0.18;
      brow.position.set(side * 0.008, 0.112, 0.032);
      eyeSocket.add(brow);

      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      sclera.scale.set(0.96, 1.07, 0.72);
      eyeSocket.add(sclera);

      const gazePivot = new THREE.Group();
      eyeSocket.add(gazePivot);

      const irisRim = new THREE.Mesh(irisRimGeo, amberIrisRimMat);
      irisRim.scale.set(0.95, 1.02, 0.62);
      irisRim.position.set(0, 0, 0.034);
      gazePivot.add(irisRim);

      const iris = new THREE.Mesh(irisGeo, warmBrownIrisMat);
      iris.scale.set(0.92, 0.99, 0.64);
      iris.position.set(0, 0, 0.041);
      gazePivot.add(iris);

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.scale.set(0.94, 1.0, 0.6);
      pupil.position.set(0, 0, 0.064);
      gazePivot.add(pupil);

      const mainGlint = new THREE.Mesh(glintGeo, catchlightMat);
      mainGlint.position.set(side * 0.026, 0.036, 0.089);
      gazePivot.add(mainGlint);

      const subGlint = new THREE.Mesh(glintGeo, catchlightMat);
      subGlint.scale.setScalar(0.45);
      subGlint.position.set(-side * 0.024, -0.028, 0.087);
      gazePivot.add(subGlint);

      const upperLid = new THREE.Mesh(lidGeo, deepBluePlumageMat);
      upperLid.rotation.x = -0.92;
      upperLid.position.set(0, 0.008, 0.008);
      eyeSocket.add(upperLid);

      gazePivots.push(gazePivot);
      upperLids.push(upperLid);
      this.headGroup.add(eyeSocket);
    }
    this.leftEyeGazePivot = gazePivots[0];
    this.rightEyeGazePivot = gazePivots[1];
    this.leftUpperLid = upperLids[0];
    this.rightUpperLid = upperLids[1];

    // Sculpted Curved Golden-Amber Beak (upper + articulated lower jaw)
    const upperBeakProfile = [
      new THREE.Vector2(0.001, 0.23),
      new THREE.Vector2(0.032, 0.17),
      new THREE.Vector2(0.068, 0.09),
      new THREE.Vector2(0.086, 0.0),
    ];
    const upperBeakGeo = this.trackGeo(new THREE.LatheGeometry(upperBeakProfile, 16));
    const upperBeak = new THREE.Mesh(upperBeakGeo, beakMat);
    upperBeak.rotation.x = Math.PI / 2 + 0.14;
    upperBeak.scale.set(1.06, 1.0, 0.72);
    upperBeak.position.set(0, -0.022, 0.255);
    upperBeak.castShadow = true;
    this.headGroup.add(upperBeak);

    this.lowerBeakPivot = new THREE.Group();
    this.lowerBeakPivot.position.set(0, -0.062, 0.255);
    this.headGroup.add(this.lowerBeakPivot);

    const lowerBeakGeo = this.trackGeo(new THREE.ConeGeometry(0.062, 0.16, 12));
    const lowerBeak = new THREE.Mesh(lowerBeakGeo, beakMat);
    lowerBeak.rotation.x = Math.PI / 2 - 0.12;
    lowerBeak.scale.set(0.95, 1.0, 0.65);
    lowerBeak.position.set(0, -0.008, 0.055);
    this.lowerBeakPivot.add(lowerBeak);

    // --- 4. Articulated 2-Segment Feathered Wings (Shoulder + Wrist Primary Fan) ---
    const featherShape = new THREE.Shape();
    featherShape.moveTo(0, 0);
    featherShape.quadraticCurveTo(0.065, 0.18, 0.038, 0.44);
    featherShape.quadraticCurveTo(0, 0.5, -0.035, 0.42);
    featherShape.quadraticCurveTo(-0.055, 0.16, 0, 0);

    const primaryFeatherGeo = this.trackGeo(
      new THREE.ExtrudeGeometry(featherShape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.007,
        bevelSize: 0.006,
        bevelSegments: 2,
      }),
    );

    const createArticulatedWing = (
      side: -1 | 1,
    ): { shoulder: THREE.Group; wrist: THREE.Group } => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.31, 0.11, -0.02);

      const covertGeo = this.trackGeo(new THREE.SphereGeometry(0.23, 18, 14));
      const covert = new THREE.Mesh(covertGeo, monsoonTealMat);
      covert.scale.set(1.5, 0.35, 0.96);
      covert.position.set(side * 0.2, 0, -0.03);
      covert.castShadow = true;
      shoulder.add(covert);

      for (let s = 0; s < 3; s++) {
        const sec = new THREE.Mesh(
          primaryFeatherGeo,
          s % 2 === 0 ? monsoonTealMat : lightTealAccentMat,
        );
        sec.scale.set(0.85, 0.66, 0.9);
        sec.rotation.z = -side * (Math.PI / 2 - 0.12 - s * 0.14);
        sec.rotation.x = Math.PI / 2 - 0.12;
        sec.position.set(side * (0.14 + s * 0.08), 0.0, -0.08 - s * 0.045);
        sec.castShadow = true;
        shoulder.add(sec);
      }

      const wrist = new THREE.Group();
      wrist.position.set(side * 0.36, 0.01, -0.01);
      shoulder.add(wrist);

      for (let i = 0; i < 5; i++) {
        const mat =
          i === 0 ? wingTipBlueMat : i % 2 === 1 ? deepBluePlumageMat : lightTealAccentMat;
        const feather = new THREE.Mesh(primaryFeatherGeo, mat);
        const lengthScale = 1.04 - i * 0.09;
        feather.scale.set(0.95, lengthScale, 0.95);
        feather.rotation.x = Math.PI / 2 - 0.06;
        feather.rotation.z = -side * (Math.PI / 2 - 0.14 + i * 0.19);
        feather.position.set(side * (0.02 - i * 0.02), -0.005 * i, -0.02 - i * 0.048);
        feather.castShadow = true;
        wrist.add(feather);
      }

      return { shoulder, wrist };
    };

    const leftWing = createArticulatedWing(-1);
    const rightWing = createArticulatedWing(1);
    this.leftShoulderPivot = leftWing.shoulder;
    this.leftWristPivot = leftWing.wrist;
    this.rightShoulderPivot = rightWing.shoulder;
    this.rightWristPivot = rightWing.wrist;
    this.bodyGroup.add(this.leftShoulderPivot, this.rightShoulderPivot);

    // --- 5. Five-Feather Sculpted Fanned Tail ---
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, -0.15, -0.34);
    this.bodyGroup.add(this.tailGroup);

    for (let i = -2; i <= 2; i++) {
      const tf = new THREE.Mesh(
        primaryFeatherGeo,
        i === 0 ? lightTealAccentMat : Math.abs(i) === 1 ? monsoonTealMat : wingTipBlueMat,
      );
      tf.scale.set(0.95, 1.05 - Math.abs(i) * 0.09, 0.9);
      tf.rotation.x = -Math.PI / 2 + 0.18;
      tf.rotation.z = i * 0.16;
      tf.position.set(i * 0.048, -Math.abs(i) * 0.008, -0.02);
      tf.castShadow = true;
      this.tailGroup.add(tf);
      this.tailFeathers.push(tf);
    }

    // --- 6. Miniature Stitched Brown Leather Schoolbag ---
    this.backpackGroup = new THREE.Group();
    this.backpackGroup.position.set(0, 0.055, -0.355);
    this.backpackGroup.rotation.x = -0.18;
    this.bodyGroup.add(this.backpackGroup);

    const bagShape = new THREE.Shape();
    bagShape.moveTo(-0.15, -0.13);
    bagShape.lineTo(0.15, -0.13);
    bagShape.quadraticCurveTo(0.175, -0.13, 0.175, -0.1);
    bagShape.lineTo(0.175, 0.1);
    bagShape.quadraticCurveTo(0.175, 0.135, 0.14, 0.135);
    bagShape.lineTo(-0.14, 0.135);
    bagShape.quadraticCurveTo(-0.175, 0.135, -0.175, 0.1);
    bagShape.lineTo(-0.175, -0.1);
    bagShape.quadraticCurveTo(-0.175, -0.13, -0.15, -0.13);

    const bagBodyGeo = this.trackGeo(
      new THREE.ExtrudeGeometry(bagShape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.022,
        bevelSize: 0.018,
        bevelSegments: 3,
      }),
    );
    bagBodyGeo.center();
    const bagBody = new THREE.Mesh(bagBodyGeo, leatherBagMat);
    bagBody.castShadow = true;
    this.backpackGroup.add(bagBody);

    const bagFlapGeo = this.trackGeo(new THREE.BoxGeometry(0.36, 0.145, 0.185));
    const bagFlap = new THREE.Mesh(bagFlapGeo, leatherFlapMat);
    bagFlap.position.set(0, 0.075, -0.008);
    bagFlap.castShadow = true;
    this.backpackGroup.add(bagFlap);

    const claspStrapGeo = this.trackGeo(new THREE.BoxGeometry(0.044, 0.175, 0.025));
    const buckleGeo = this.trackGeo(new THREE.BoxGeometry(0.06, 0.052, 0.032));
    for (const sx of [-0.085, 0.085]) {
      const strap = new THREE.Mesh(claspStrapGeo, leatherBagMat);
      strap.position.set(sx, 0.01, -0.104);
      this.backpackGroup.add(strap);

      const buckle = new THREE.Mesh(buckleGeo, brassBuckleMat);
      buckle.position.set(sx, -0.03, -0.108);
      this.backpackGroup.add(buckle);
    }

    const handleGeo = this.trackGeo(new THREE.TorusGeometry(0.055, 0.012, 8, 14, Math.PI));
    const handle = new THREE.Mesh(handleGeo, leatherFlapMat);
    handle.position.set(0, 0.155, 0);
    this.backpackGroup.add(handle);

    for (const side of [-1, 1]) {
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.14, 0.1, 0.05),
        new THREE.Vector3(side * 0.24, 0.14, 0.22),
        new THREE.Vector3(side * 0.22, -0.02, 0.34),
        new THREE.Vector3(side * 0.15, -0.11, 0.07),
      ]);
      const strapGeo = this.trackGeo(new THREE.TubeGeometry(strapCurve, 16, 0.019, 8, false));
      const shoulderStrap = new THREE.Mesh(strapGeo, leatherFlapMat);
      this.backpackGroup.add(shoulderStrap);
    }

    const scrollGeo = this.trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.24, 12));
    const scrollMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfff5e2, roughness: 0.78 }),
    );
    const scroll = new THREE.Mesh(scrollGeo, scrollMat);
    scroll.rotation.z = Math.PI / 2.25;
    scroll.position.set(0.02, 0.16, 0.02);
    this.backpackGroup.add(scroll);

    const pencilGeo = this.trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8));
    const pencilMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xe3622b, roughness: 0.55 }),
    );
    const pencil = new THREE.Mesh(pencilGeo, pencilMat);
    pencil.rotation.z = -0.42;
    pencil.position.set(-0.14, 0.17, 0.01);
    this.backpackGroup.add(pencil);
  }

  private trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.geometries.push(geo);
    return geo;
  }

  private trackMat<T extends THREE.Material>(mat: T): T {
    this.materials.push(mat);
    return mat;
  }

  /** Fast deterministic organic pseudo-random [0..1] avoiding mechanical repetition */
  private nextOrganicRand(elapsed: number): number {
    this.seedCounter += 1;
    const x = Math.sin(this.seedCounter * 12.9898 + elapsed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  public setBehaviorState(state: BharariBehaviorState): void {
    this.behaviorState = state;
    switch (state) {
      case 'NOTICE':
        this.state = 'notice';
        break;
      case 'TAKEOFF':
        this.state = 'takeoff';
        break;
      case 'FLYING':
        this.state = this.telemetry.isGliding ? 'gliding' : 'flying';
        break;
      case 'LANDING':
        this.state = 'landing';
        break;
      case 'INTRODUCTION':
        this.state = 'introduction';
        break;
      case 'IDLE':
      default:
        this.state = 'idle-perch';
        break;
    }
  }

  public getBehaviorState(): BharariBehaviorState {
    return this.behaviorState;
  }

  public setAnimationState(state: BharariAnimationState): void {
    this.state = state;
    if (state === 'notice') this.behaviorState = 'NOTICE';
    else if (state === 'takeoff') this.behaviorState = 'TAKEOFF';
    else if (state === 'flying' || state === 'gliding') this.behaviorState = 'FLYING';
    else if (state === 'landing') this.behaviorState = 'LANDING';
    else if (state === 'introduction' || state === 'greeting') this.behaviorState = 'INTRODUCTION';
    else this.behaviorState = 'IDLE';
  }

  public getAnimationState(): BharariAnimationState {
    return this.state;
  }

  public setTransitionPhase(phase: number): void {
    this.transitionPhase = THREE.MathUtils.clamp(phase, 0, 1);
    this.telemetry.phase = this.transitionPhase;
  }

  public setFlightTelemetry(telemetry: Partial<BharariFlightTelemetry>): void {
    if (telemetry.speed !== undefined) this.telemetry.speed = telemetry.speed;
    if (telemetry.climbRate !== undefined) this.telemetry.climbRate = telemetry.climbRate;
    if (telemetry.bankAngle !== undefined) {
      this.telemetry.bankAngle = telemetry.bankAngle;
      this.targetBankAngle = THREE.MathUtils.clamp(telemetry.bankAngle, -0.58, 0.58);
    }
    if (telemetry.phase !== undefined) {
      this.telemetry.phase = THREE.MathUtils.clamp(telemetry.phase, 0, 1);
      this.transitionPhase = this.telemetry.phase;
    }
    if (telemetry.isGliding !== undefined) {
      this.telemetry.isGliding = telemetry.isGliding;
      if (this.behaviorState === 'FLYING') {
        this.state = telemetry.isGliding ? 'gliding' : 'flying';
      }
    }
  }

  public setLookTarget(worldPoint: THREE.Vector3 | null): void {
    this.lookTargetWorld = worldPoint;
  }

  public setBankAngle(bankRad: number): void {
    this.targetBankAngle = THREE.MathUtils.clamp(bankRad, -0.58, 0.58);
    this.telemetry.bankAngle = this.targetBankAngle;
  }

  public triggerGreet(): void {
    this.greetTimer = 1.65;
  }

  private updateBackpackSpring(targetOffsetY: number, dt: number): void {
    // Soft second-order spring gives the schoolbag charming physical weight on hops, beats & landings
    const stiffness = 120;
    const damping = 13;
    const force = -stiffness * (this.backpackLagY - targetOffsetY) - damping * this.backpackVelY;
    this.backpackVelY += force * dt;
    this.backpackLagY += this.backpackVelY * dt;
    this.backpackGroup.position.y = 0.055 + THREE.MathUtils.clamp(this.backpackLagY, -0.055, 0.055);
  }

  private updateEyesAndBlink(dt: number, elapsed: number, isIntroduction: boolean): void {
    // Varied natural blinking with occasional expressive double-blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTotal = this.doubleBlinkPending ? 0.12 : 0.15;
      this.blinkDuration = this.blinkTotal;
      if (this.doubleBlinkPending) {
        this.doubleBlinkPending = false;
        this.blinkTimer = 2.2 + this.nextOrganicRand(elapsed) * 3.1;
      } else {
        const doDouble = this.nextOrganicRand(elapsed + 1.3) < 0.24;
        if (doDouble) {
          this.doubleBlinkPending = true;
          this.blinkTimer = 0.21;
        } else {
          this.blinkTimer = 1.9 + this.nextOrganicRand(elapsed + 2.7) * 3.4;
        }
      }
    }

    if (this.blinkDuration > 0) {
      this.blinkDuration = Math.max(0, this.blinkDuration - dt);
      const blinkCurve = Math.sin((this.blinkDuration / this.blinkTotal) * Math.PI);
      const lidRot = THREE.MathUtils.lerp(-0.92, 0.34, blinkCurve);
      this.leftUpperLid.rotation.x = lidRot;
      this.rightUpperLid.rotation.x = lidRot;
    } else {
      // Wide-eyed bright curiosity on NOTICE, warm happy squint during INTRODUCTION / greeting
      let targetLid = -0.92;
      if (this.behaviorState === 'NOTICE' || this.curiousReactionActive > 0) {
        targetLid = -1.04;
      } else if (isIntroduction || this.greetTimer > 0) {
        targetLid = -0.76;
      }
      this.leftUpperLid.rotation.x = THREE.MathUtils.damp(this.leftUpperLid.rotation.x, targetLid, 12, dt);
      this.rightUpperLid.rotation.x = THREE.MathUtils.damp(this.rightUpperLid.rotation.x, targetLid, 12, dt);
    }

    // Eye gaze tracking (eyes dart slightly faster than head — authentic bird micro-saccades)
    let gazeYaw = this.idleEyeLeadX;
    let gazePitch = this.idleEyeLeadY;

    if (this.lookTargetWorld) {
      _localLook.copy(this.lookTargetWorld);
      this.group.worldToLocal(_localLook);
      const yawToTarget = Math.atan2(_localLook.x, Math.max(0.25, _localLook.z));
      const pitchToTarget = Math.atan2(_localLook.y - 0.9, Math.hypot(_localLook.x, _localLook.z));
      const focusStrength = this.behaviorState === 'NOTICE' ? 0.44 : 0.3;
      gazeYaw = THREE.MathUtils.clamp(yawToTarget * focusStrength, -0.26, 0.26);
      gazePitch = THREE.MathUtils.clamp(-pitchToTarget * 0.26, -0.18, 0.18);
    }

    this.leftEyeGazePivot.rotation.y = THREE.MathUtils.damp(this.leftEyeGazePivot.rotation.y, gazeYaw, 14, dt);
    this.rightEyeGazePivot.rotation.y = THREE.MathUtils.damp(this.rightEyeGazePivot.rotation.y, gazeYaw, 14, dt);
    this.leftEyeGazePivot.rotation.x = THREE.MathUtils.damp(this.leftEyeGazePivot.rotation.x, gazePitch, 14, dt);
    this.rightEyeGazePivot.rotation.x = THREE.MathUtils.damp(this.rightEyeGazePivot.rotation.x, gazePitch, 14, dt);
  }

  private updateIdleDirector(dt: number, elapsed: number): void {
    // 1. Varied environmental look-around schedule (bird-like saccade pauses, never robotic sine)
    this.idleLookTimer -= dt;
    if (this.idleLookTimer <= 0) {
      const r1 = this.nextOrganicRand(elapsed);
      const r2 = this.nextOrganicRand(elapsed + 3.1);
      const r3 = this.nextOrganicRand(elapsed + 6.7);
      this.idleLookTimer = 1.5 + r1 * 2.8;

      if (r2 < 0.28) {
        // Glance softly back toward center / visitor
        this.idleLookYaw = (r3 - 0.5) * 0.18;
        this.idleLookPitch = -0.03;
        this.idleHeadTilt = (r1 - 0.5) * 0.12;
      } else {
        // Curious glance across the village valley or skyward
        this.idleLookYaw = (r2 - 0.5) * 0.85;
        this.idleLookPitch = (r3 - 0.44) * 0.26;
        this.idleHeadTilt = -this.idleLookYaw * 0.32 + (r1 - 0.5) * 0.16;
      }
      this.idleEyeLeadX = THREE.MathUtils.clamp(this.idleLookYaw * 0.28, -0.2, 0.2);
      this.idleEyeLeadY = THREE.MathUtils.clamp(this.idleLookPitch * 0.28, -0.14, 0.14);
    }

    // 2. Occasional small wing-tuck / feather settle shuffle (every ~5..9 seconds)
    if (this.wingShuffleActive > 0) {
      this.wingShuffleActive = Math.max(0, this.wingShuffleActive - dt);
    } else {
      this.wingShuffleTimer -= dt;
      if (this.wingShuffleTimer <= 0) {
        this.wingShuffleActive = 0.52;
        this.wingShuffleTimer = 4.6 + this.nextOrganicRand(elapsed + 5.2) * 4.8;
        const pick = this.nextOrganicRand(elapsed + 8.1);
        this.wingShuffleSide = pick < 0.35 ? -1 : pick < 0.7 ? 1 : 0; // 0 = both wings settle
      }
    }

    // 3. Occasional curious head-cock + crest perk reaction
    if (this.curiousReactionActive > 0) {
      this.curiousReactionActive = Math.max(0, this.curiousReactionActive - dt);
    } else {
      this.curiousReactionTimer -= dt;
      if (this.curiousReactionTimer <= 0) {
        this.curiousReactionActive = 1.15;
        this.curiousReactionTimer = 6.8 + this.nextOrganicRand(elapsed + 9.4) * 6.2;
      }
    }
  }

  private setTailSpread(spread: number, dt: number): void {
    for (let idx = 0; idx < this.tailFeathers.length; idx++) {
      const offset = idx - 2;
      const targetAngle = offset * (0.14 + spread * 0.17);
      this.tailFeathers[idx].rotation.z = THREE.MathUtils.damp(
        this.tailFeathers[idx].rotation.z,
        targetAngle,
        9,
        dt,
      );
    }
  }

  public update(delta: number, elapsed: number): void {
    const dt = Math.min(delta, 0.05);
    const isIntroduction = this.behaviorState === 'INTRODUCTION';
    this.updateEyesAndBlink(dt, elapsed, isIntroduction);

    const isAirborne =
      this.behaviorState === 'TAKEOFF' ||
      this.behaviorState === 'FLYING' ||
      this.behaviorState === 'LANDING';

    // Smooth aerodynamic bank roll on rigRoot
    const desiredBank = isAirborne ? this.targetBankAngle : 0;
    this.currentBankAngle = THREE.MathUtils.damp(this.currentBankAngle, desiredBank, 6.8, dt);
    this.rigRoot.rotation.z = this.currentBankAngle;

    // Reset subtle shoulder feathering twist & idle body sway smoothly unless overwritten by state
    this.leftShoulderPivot.rotation.x = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.x, 0, 8, dt);
    this.rightShoulderPivot.rotation.x = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.x, 0, 8, dt);
    this.tailGroup.rotation.y = THREE.MathUtils.damp(this.tailGroup.rotation.y, 0, 7, dt);
    this.bodyGroup.rotation.z = THREE.MathUtils.damp(this.bodyGroup.rotation.z, 0, 8, dt);

    // Explicit interactive "Say Hello / Wave to Bharari" joy reaction when perched
    if (this.greetTimer > 0 && !isAirborne && this.behaviorState !== 'NOTICE') {
      this.greetTimer = Math.max(0, this.greetTimer - dt);
      const t = 1 - this.greetTimer / 1.65;
      this.applyHappyGreetingPose(t, dt);
      return;
    }

    // Default beak closed unless chirping
    this.lowerBeakPivot.rotation.x = THREE.MathUtils.damp(this.lowerBeakPivot.rotation.x, 0, 14, dt);

    switch (this.behaviorState) {
      case 'NOTICE': {
        // Bharari spots the newly chosen destination: head turns quickly toward it,
        // crest perks alertly, body leans slightly forward in anticipation, wings loosen!
        const p = this.transitionPhase;
        const leanT = THREE.MathUtils.smoothstep(p, 0.25, 1.0);
        const perk = Math.sin(Math.min(1, p * 1.4) * Math.PI);

        this.rigRoot.position.y = THREE.MathUtils.damp(this.rigRoot.position.y, -leanT * 0.055, 10, dt);
        this.bodyGroup.scale.set(1, 1 - leanT * 0.04, 1 + leanT * 0.03);
        this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, 0.05 + leanT * 0.16, 11, dt);

        // Quick alert head turn toward target + tiny curious tilt
        let noticeYaw = 0;
        let noticePitch = -0.05;
        if (this.lookTargetWorld) {
          _localLook.copy(this.lookTargetWorld);
          this.group.worldToLocal(_localLook);
          noticeYaw = THREE.MathUtils.clamp(Math.atan2(_localLook.x, Math.max(0.15, _localLook.z)) * 0.72, -0.78, 0.78);
          noticePitch = THREE.MathUtils.clamp(
            -Math.atan2(_localLook.y - 0.9, Math.max(1, Math.hypot(_localLook.x, _localLook.z))) * 0.45,
            -0.28,
            0.22,
          );
        }
        this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, noticeYaw, 12, dt);
        this.headGroup.rotation.x = THREE.MathUtils.damp(this.headGroup.rotation.x, noticePitch, 10, dt);
        this.headGroup.rotation.z = THREE.MathUtils.damp(this.headGroup.rotation.z, -noticeYaw * 0.22, 10, dt);

        // Alert crest perk & tiny anticipation chirp
        this.crestGroup.rotation.x = THREE.MathUtils.damp(this.crestGroup.rotation.x, 0.24 * perk + 0.1, 14, dt);
        this.lowerBeakPivot.rotation.x = p > 0.15 && p < 0.45 ? Math.sin(((p - 0.15) / 0.3) * Math.PI) * 0.16 : 0;

        // Wings begin slightly lifting off the flanks ready to unfold
        const preSpread = leanT * 0.42;
        this.leftShoulderPivot.rotation.z = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.z, -1.08 + preSpread, 10, dt);
        this.rightShoulderPivot.rotation.z = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.z, 1.08 - preSpread, 10, dt);
        this.leftShoulderPivot.rotation.y = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.y, 0.44 - leanT * 0.16, 10, dt);
        this.rightShoulderPivot.rotation.y = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.y, -0.44 + leanT * 0.16, 10, dt);
        this.leftWristPivot.rotation.y = THREE.MathUtils.damp(this.leftWristPivot.rotation.y, 0.52 - leanT * 0.2, 10, dt);
        this.rightWristPivot.rotation.y = THREE.MathUtils.damp(this.rightWristPivot.rotation.y, -0.52 + leanT * 0.2, 10, dt);

        this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, leanT * 0.16, 10, dt);
        this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, leanT * 0.16, 10, dt);
        this.tailGroup.rotation.x = THREE.MathUtils.damp(this.tailGroup.rotation.x, 0.26, 9, dt);
        this.setTailSpread(0.32 + leanT * 0.25, dt);
        this.updateBackpackSpring(-leanT * 0.014, dt);
        this.contactShadow.visible = true;
        this.contactShadow.scale.setScalar(1);
        break;
      }

      case 'TAKEOFF': {
        // Phase 0..0.40: Intentional crouch & forward lean as wings spread wide
        // Phase 0.40..1.0: Powerful leg push-off -> feet tuck back -> deep opening launch wingbeats!
        const p = this.transitionPhase;
        const crouch = p < 0.4 ? Math.sin((p / 0.4) * Math.PI) : 0;
        const pushT = p >= 0.4 ? (p - 0.4) / 0.6 : 0;
        const spreadT = THREE.MathUtils.smoothstep(p, 0.12, 0.52);

        // Advance continuous wingPhase briskly so launch flows smoothly into FLYING with zero snap
        this.wingPhase += dt * (11.5 + pushT * 5.0);
        const launchBeat = Math.sin(pushT * Math.PI * 2.15) * 0.86 * pushT;

        this.rigRoot.position.y = -crouch * 0.145 + Math.sin(pushT * Math.PI) * 0.16;
        this.bodyGroup.scale.set(1 + crouch * 0.05, 1 - crouch * 0.1, 1 + crouch * 0.04);
        this.bodyGroup.rotation.x = THREE.MathUtils.damp(
          this.bodyGroup.rotation.x,
          THREE.MathUtils.lerp(0.34, 0.44, pushT),
          12,
          dt,
        );

        // Legs compress during crouch, extend briefly on push-off, then tuck neatly back for flight
        const legPushRot =
          p < 0.4
            ? 0.22 * crouch
            : p < 0.62
              ? THREE.MathUtils.lerp(0.22, -0.25, (p - 0.4) / 0.22)
              : THREE.MathUtils.lerp(-0.25, 0.92, (p - 0.62) / 0.38);
        this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, legPushRot, 14, dt);
        this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, legPushRot, 14, dt);

        // Unfold 2-segment wings cleanly into powerful launch stroke
        const targetShZ = THREE.MathUtils.lerp(-0.68, 0.32, spreadT) + launchBeat;
        this.leftShoulderPivot.rotation.z = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.z, targetShZ, 15, dt);
        this.rightShoulderPivot.rotation.z = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.z, -targetShZ, 15, dt);
        this.leftShoulderPivot.rotation.y = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.y, THREE.MathUtils.lerp(0.3, 0.05, spreadT), 12, dt);
        this.rightShoulderPivot.rotation.y = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.y, THREE.MathUtils.lerp(-0.3, -0.05, spreadT), 12, dt);
        this.leftShoulderPivot.rotation.x = Math.cos(pushT * Math.PI * 2.15) * 0.22 * pushT;
        this.rightShoulderPivot.rotation.x = this.leftShoulderPivot.rotation.x;

        this.leftWristPivot.rotation.y = THREE.MathUtils.damp(this.leftWristPivot.rotation.y, (1 - spreadT) * 0.42, 12, dt);
        this.rightWristPivot.rotation.y = THREE.MathUtils.damp(this.rightWristPivot.rotation.y, -(1 - spreadT) * 0.42, 12, dt);
        this.leftWristPivot.rotation.z = THREE.MathUtils.damp(this.leftWristPivot.rotation.z, launchBeat * 0.45, 14, dt);
        this.rightWristPivot.rotation.z = THREE.MathUtils.damp(this.rightWristPivot.rotation.z, -launchBeat * 0.45, 14, dt);

        this.headGroup.rotation.x = THREE.MathUtils.damp(this.headGroup.rotation.x, -0.26, 9, dt);
        this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, 0, 9, dt);
        this.headGroup.rotation.z = THREE.MathUtils.damp(this.headGroup.rotation.z, 0, 9, dt);
        this.crestGroup.rotation.x = THREE.MathUtils.damp(this.crestGroup.rotation.x, -0.15, 10, dt);

        this.tailGroup.rotation.x = THREE.MathUtils.damp(this.tailGroup.rotation.x, 0.22 - pushT * 0.3, 10, dt);
        this.setTailSpread(0.88, dt);
        this.updateBackpackSpring(-crouch * 0.025 + pushT * 0.015, dt);

        this.contactShadow.visible = p < 0.62;
        this.contactShadow.scale.setScalar(Math.max(0.18, 1 - pushT * 0.85));
        break;
      }

      case 'FLYING': {
        // Real speed- & climb-responsive aerodynamic flight animation
        const climb = this.telemetry.climbRate;
        const speed = Math.max(0.3, this.telemetry.speed);

        // Faster, deeper wingbeats when climbing or accelerating; gentle effortless glides at crest/descent
        const glideBlend = this.telemetry.isGliding ? 0.14 : 1.0;
        const beatRate = 11.2 + Math.max(0, climb) * 4.8 + speed * 1.4;
        this.wingPhase += dt * beatRate;

        const beatAmp = (0.76 + Math.max(0, climb) * 0.24) * glideBlend;
        const soarSway = this.telemetry.isGliding ? Math.sin(elapsed * 2.5) * 0.07 : 0;
        const primaryFlap = Math.sin(this.wingPhase) * beatAmp + 0.14 + soarSway;
        // Wrist flexes ~0.78 rad behind shoulder so outer primary feathers trail realistically!
        const wristFlex = Math.sin(this.wingPhase - 0.78) * (0.48 * glideBlend) + (this.telemetry.isGliding ? 0.06 : 0);
        // Subtle wing pitch/feathering twist (supination on upstroke, pronation on downstroke)
        const featherTwist = Math.cos(this.wingPhase) * 0.22 * glideBlend;

        // Subtle upward lift bob synchronized to downstroke peak
        this.rigRoot.position.y = Math.sin(this.wingPhase - 0.65) * 0.08 * glideBlend + (this.telemetry.isGliding ? Math.sin(elapsed * 2.4) * 0.05 : 0);
        this.bodyGroup.scale.set(1, 1, 1);

        const bodyPitch = THREE.MathUtils.clamp(0.45 - climb * 0.16, 0.28, 0.54);
        this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, bodyPitch, 6.5, dt);

        // Legs tucked sleekly back beneath the tail feathers
        this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 0.96, 8, dt);
        this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0.96, 8, dt);

        // Bird-like head stabilization: head subtly levels against body bank & looks slightly into turns!
        this.headGroup.rotation.x = THREE.MathUtils.damp(this.headGroup.rotation.x, -bodyPitch * 0.72, 6.5, dt);
        this.headGroup.rotation.y = THREE.MathUtils.damp(
          this.headGroup.rotation.y,
          -this.currentBankAngle * 0.55 + (this.telemetry.isGliding ? Math.sin(elapsed * 1.1) * 0.18 : 0),
          5.5,
          dt,
        );
        this.headGroup.rotation.z = THREE.MathUtils.damp(
          this.headGroup.rotation.z,
          -this.currentBankAngle * 0.55,
          6.5,
          dt,
        );
        this.crestGroup.rotation.x = THREE.MathUtils.damp(this.crestGroup.rotation.x, -0.22, 8, dt);

        this.leftShoulderPivot.rotation.z = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.z, primaryFlap, 18, dt);
        this.rightShoulderPivot.rotation.z = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.z, -primaryFlap, 18, dt);
        this.leftShoulderPivot.rotation.y = THREE.MathUtils.damp(
          this.leftShoulderPivot.rotation.y,
          Math.cos(this.wingPhase) * 0.16 * glideBlend + 0.04,
          14,
          dt,
        );
        this.rightShoulderPivot.rotation.y = THREE.MathUtils.damp(
          this.rightShoulderPivot.rotation.y,
          -Math.cos(this.wingPhase) * 0.16 * glideBlend - 0.04,
          14,
          dt,
        );
        this.leftShoulderPivot.rotation.x = featherTwist;
        this.rightShoulderPivot.rotation.x = featherTwist;

        this.leftWristPivot.rotation.z = THREE.MathUtils.damp(this.leftWristPivot.rotation.z, wristFlex, 16, dt);
        this.rightWristPivot.rotation.z = THREE.MathUtils.damp(this.rightWristPivot.rotation.z, -wristFlex, 16, dt);
        this.leftWristPivot.rotation.y = THREE.MathUtils.damp(this.leftWristPivot.rotation.y, 0, 10, dt);
        this.rightWristPivot.rotation.y = THREE.MathUtils.damp(this.rightWristPivot.rotation.y, 0, 10, dt);

        // Aerodynamic tail acts as pitch elevator & turn rudder
        this.tailGroup.rotation.x = THREE.MathUtils.damp(
          this.tailGroup.rotation.x,
          -0.14 - climb * 0.1 + Math.sin(this.wingPhase * 0.5) * 0.05 * glideBlend,
          8,
          dt,
        );
        this.tailGroup.rotation.y = THREE.MathUtils.damp(
          this.tailGroup.rotation.y,
          -this.currentBankAngle * 0.42,
          7,
          dt,
        );
        this.setTailSpread(this.telemetry.isGliding ? 0.58 : 0.34 + Math.abs(this.currentBankAngle) * 0.6, dt);
        this.updateBackpackSpring(Math.sin(this.wingPhase - 1.1) * 0.016 * glideBlend, dt);
        this.contactShadow.visible = false;
        break;
      }

      case 'LANDING': {
        // Phase 0..0.68: Aerodynamic upright braking flare + extended feet reaching for perch + braking beats
        // Phase 0.68..1.0: Soft touchdown cushion + graceful 2-stage wing fold + look toward visitor!
        const p = this.transitionPhase;
        const flareWeight = p < 0.68 ? 1 - p / 0.68 : 0;
        const touchdownCurve = p > 0.62 && p < 0.86 ? Math.sin(((p - 0.62) / 0.24) * Math.PI) : 0;
        const foldT = THREE.MathUtils.smoothstep(p, 0.65, 1.0);

        this.wingPhase += dt * (15.5 * flareWeight + 3.0);
        const brakeFlutter = Math.sin(this.wingPhase) * 0.44 * flareWeight;

        // Soft knee-absorption bounce right at touchdown
        this.rigRoot.position.y = -touchdownCurve * 0.065;
        this.bodyGroup.scale.set(1 + touchdownCurve * 0.04, 1 - touchdownCurve * 0.07, 1);

        // Pitch upright to catch air, then settle cleanly upright on perch
        this.bodyGroup.rotation.x = THREE.MathUtils.damp(
          this.bodyGroup.rotation.x,
          THREE.MathUtils.lerp(-0.22, 0.02, foldT),
          10,
          dt,
        );

        // Extend articulated legs & feet forward/downward ahead of touchdown, then plant squarely!
        const footExtend = p < 0.72 ? -0.44 * Math.sin(Math.min(1, p / 0.72) * Math.PI) : 0;
        this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, footExtend, 12, dt);
        this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, footExtend * 0.92, 12, dt);

        // Two-stage wing fold: wrist tucks smoothly slightly ahead of shoulder settling to flanks
        const wristFoldT = THREE.MathUtils.smoothstep(p, 0.62, 0.94);
        const shoulderFoldT = THREE.MathUtils.smoothstep(p, 0.68, 1.0);

        const targetShZ = THREE.MathUtils.lerp(0.36 + brakeFlutter, -1.08, shoulderFoldT);
        const targetShY = THREE.MathUtils.lerp(-0.24, 0.44, shoulderFoldT);
        this.leftShoulderPivot.rotation.z = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.z, targetShZ, 12, dt);
        this.rightShoulderPivot.rotation.z = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.z, -targetShZ, 12, dt);
        this.leftShoulderPivot.rotation.y = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.y, targetShY, 10, dt);
        this.rightShoulderPivot.rotation.y = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.y, -targetShY, 10, dt);

        const targetWrY = THREE.MathUtils.lerp(-0.08, 0.52, wristFoldT);
        const targetWrZ = THREE.MathUtils.lerp(brakeFlutter * 0.45, -0.14, wristFoldT);
        this.leftWristPivot.rotation.y = THREE.MathUtils.damp(this.leftWristPivot.rotation.y, targetWrY, 11, dt);
        this.rightWristPivot.rotation.y = THREE.MathUtils.damp(this.rightWristPivot.rotation.y, -targetWrY, 11, dt);
        this.leftWristPivot.rotation.z = THREE.MathUtils.damp(this.leftWristPivot.rotation.z, targetWrZ, 11, dt);
        this.rightWristPivot.rotation.z = THREE.MathUtils.damp(this.rightWristPivot.rotation.z, -targetWrZ, 11, dt);

        // Look down at perch during approach, then lift gaze warmly to the visitor upon touchdown!
        const headPitchTarget = p < 0.62 ? 0.14 : -0.02;
        this.headGroup.rotation.x = THREE.MathUtils.damp(this.headGroup.rotation.x, headPitchTarget, 8, dt);
        this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, 0, 8, dt);
        this.headGroup.rotation.z = THREE.MathUtils.damp(this.headGroup.rotation.z, 0, 8, dt);
        this.crestGroup.rotation.x = THREE.MathUtils.damp(this.crestGroup.rotation.x, 0.12 * foldT, 8, dt);

        // Tail fans wide downward for braking, then relaxes neatly
        this.tailGroup.rotation.x = THREE.MathUtils.lerp(0.52, 0.14, foldT);
        this.setTailSpread(THREE.MathUtils.lerp(1.0, 0.15, foldT), dt);
        this.updateBackpackSpring(-touchdownCurve * 0.032, dt);

        this.contactShadow.visible = p > 0.34;
        this.contactShadow.scale.setScalar(THREE.MathUtils.clamp((p - 0.32) / 0.65, 0.2, 1));
        break;
      }

      case 'INTRODUCTION': {
        // Warm animated-film arrival greeting: welcoming hop, inviting half-wing flourish,
        // expressive chirping beak, crest perk & attentive head tilt toward the visitor!
        const p = this.transitionPhase;
        const hopWindow = p < 0.55 ? Math.sin((p / 0.55) * Math.PI * 2) : 0;
        const hop = Math.abs(hopWindow) * 0.24;
        const wingGesture = p < 0.72 ? Math.sin((p / 0.72) * Math.PI) : 0;
        const flutter = Math.sin(p * Math.PI * 9) * 0.36 * wingGesture;
        const chirp = p > 0.1 && p < 0.78 ? Math.abs(Math.sin(p * Math.PI * 7)) * 0.22 : 0;

        this.rigRoot.position.y = THREE.MathUtils.damp(this.rigRoot.position.y, hop, 14, dt);
        this.bodyGroup.scale.set(1, 1 + hop * 0.07, 1);
        this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, -0.05, 9, dt);

        this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, hop * 0.6, 12, dt);
        this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, hop * 0.6, 12, dt);

        // Warm head tilt & friendly gaze toward visitor
        let introYaw = Math.sin(p * Math.PI * 2) * 0.16;
        let introPitch = -0.04;
        if (this.lookTargetWorld) {
          _localLook.copy(this.lookTargetWorld);
          this.group.worldToLocal(_localLook);
          introYaw += THREE.MathUtils.clamp(Math.atan2(_localLook.x, Math.max(0.2, _localLook.z)) * 0.35, -0.35, 0.35);
          introPitch = THREE.MathUtils.clamp(
            -Math.atan2(_localLook.y - 0.95, Math.max(1, Math.hypot(_localLook.x, _localLook.z))) * 0.3,
            -0.2,
            0.18,
          );
        }
        this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, introYaw, 8, dt);
        this.headGroup.rotation.x = THREE.MathUtils.damp(this.headGroup.rotation.x, introPitch, 8, dt);
        this.headGroup.rotation.z = THREE.MathUtils.damp(this.headGroup.rotation.z, Math.sin(p * Math.PI * 3) * 0.18, 9, dt);
        this.crestGroup.rotation.x = THREE.MathUtils.damp(this.crestGroup.rotation.x, 0.2 * wingGesture, 10, dt);
        this.lowerBeakPivot.rotation.x = chirp;

        // Expressive welcoming wing raise, settling smoothly back to folded wings as p -> 1
        const shZ = THREE.MathUtils.lerp(-1.08, 0.12 + flutter, wingGesture);
        const shY = THREE.MathUtils.lerp(0.44, 0.14, wingGesture);
        const wrY = THREE.MathUtils.lerp(0.52, 0.12, wingGesture);
        const wrZ = THREE.MathUtils.lerp(-0.14, flutter * 0.34, wingGesture);

        this.leftShoulderPivot.rotation.z = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.z, shZ, 12, dt);
        this.rightShoulderPivot.rotation.z = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.z, -shZ, 12, dt);
        this.leftShoulderPivot.rotation.y = THREE.MathUtils.damp(this.leftShoulderPivot.rotation.y, shY, 10, dt);
        this.rightShoulderPivot.rotation.y = THREE.MathUtils.damp(this.rightShoulderPivot.rotation.y, -shY, 10, dt);
        this.leftWristPivot.rotation.y = THREE.MathUtils.damp(this.leftWristPivot.rotation.y, wrY, 10, dt);
        this.rightWristPivot.rotation.y = THREE.MathUtils.damp(this.rightWristPivot.rotation.y, -wrY, 10, dt);
        this.leftWristPivot.rotation.z = THREE.MathUtils.damp(this.leftWristPivot.rotation.z, wrZ, 12, dt);
        this.rightWristPivot.rotation.z = THREE.MathUtils.damp(this.rightWristPivot.rotation.z, -wrZ, 12, dt);

        this.tailGroup.rotation.x = 0.18 + Math.sin(p * Math.PI * 5) * 0.12 * wingGesture;
        this.setTailSpread(0.2 + wingGesture * 0.48, dt);
        this.updateBackpackSpring(-hop * 0.08, dt);
        this.contactShadow.scale.setScalar(1 - hop * 0.42);
        this.contactShadow.visible = true;
        break;
      }

      case 'IDLE':
      default: {
        // Living, non-mechanical idle director
        this.updateIdleDirector(dt, elapsed);

        // Multi-harmonic organic breathing (incommensurate frequencies prevent mechanical looping)
        const breath =
          Math.sin(elapsed * 2.15) * 0.72 +
          Math.sin(elapsed * 0.83 + 1.1) * 0.28;
        const subtleSway = Math.sin(elapsed * 0.57) * 0.025;

        this.rigRoot.position.y = THREE.MathUtils.damp(this.rigRoot.position.y, breath * 0.015, 7, dt);
        this.bodyGroup.scale.set(
          1 + breath * 0.019,
          1 - breath * 0.014,
          1 + breath * 0.023,
        );
        this.bodyGroup.rotation.x = THREE.MathUtils.damp(
          this.bodyGroup.rotation.x,
          0.02 + Math.sin(elapsed * 0.67) * 0.018,
          5,
          dt,
        );
        this.bodyGroup.rotation.z = THREE.MathUtils.damp(this.bodyGroup.rotation.z, subtleSway, 5, dt);

        // Gentle grounded legs with minuscule weight balance
        this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 0, 9, dt);
        this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0, 9, dt);

        // Blend environmental look-around with external lookTarget (e.g. hovered destination or visitor)
        let targetHeadYaw = this.idleLookYaw;
        let targetHeadPitch = this.idleLookPitch;
        let targetHeadRoll = this.idleHeadTilt;

        if (this.lookTargetWorld) {
          _localLook.copy(this.lookTargetWorld);
          this.group.worldToLocal(_localLook);
          const desiredYaw = Math.atan2(_localLook.x, Math.max(0.15, _localLook.z));
          const desiredPitch = -Math.atan2(
            _localLook.y - 0.95,
            Math.max(1, Math.hypot(_localLook.x, _localLook.z)),
          );
          targetHeadYaw =
            THREE.MathUtils.clamp(desiredYaw * 0.52, -0.58, 0.58) + this.idleLookYaw * 0.34;
          targetHeadPitch =
            THREE.MathUtils.clamp(desiredPitch * 0.38, -0.22, 0.22) + this.idleLookPitch * 0.35;
          targetHeadRoll =
            THREE.MathUtils.clamp(-desiredYaw * 0.14, -0.18, 0.18) + this.idleHeadTilt * 0.55;
        }

        // Occasional curious reaction: charming head cock + crest perk
        const curiousCurve =
          this.curiousReactionActive > 0
            ? Math.sin((this.curiousReactionActive / 1.15) * Math.PI)
            : 0;
        targetHeadRoll += curiousCurve * 0.22;
        targetHeadPitch -= curiousCurve * 0.06;

        this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, targetHeadYaw, 5.2, dt);
        this.headGroup.rotation.x = THREE.MathUtils.damp(this.headGroup.rotation.x, targetHeadPitch, 5.2, dt);
        this.headGroup.rotation.z = THREE.MathUtils.damp(this.headGroup.rotation.z, targetHeadRoll, 5.2, dt);
        this.crestGroup.rotation.x = THREE.MathUtils.damp(
          this.crestGroup.rotation.x,
          curiousCurve * 0.22 + breath * 0.035,
          7,
          dt,
        );

        // Occasional small natural wing-tuck / feather ruffle shuffle on perch
        const shuffleWave =
          this.wingShuffleActive > 0
            ? Math.sin((this.wingShuffleActive / 0.52) * Math.PI * 2) *
              Math.sin((this.wingShuffleActive / 0.52) * Math.PI)
            : 0;
        const leftShuffle = this.wingShuffleSide <= 0 ? Math.abs(shuffleWave) * 0.28 : 0;
        const rightShuffle = this.wingShuffleSide >= 0 ? Math.abs(shuffleWave) * 0.28 : 0;

        const breathLift = breath * 0.03;
        this.leftShoulderPivot.rotation.z = THREE.MathUtils.damp(
          this.leftShoulderPivot.rotation.z,
          -1.08 + breathLift + leftShuffle,
          9,
          dt,
        );
        this.rightShoulderPivot.rotation.z = THREE.MathUtils.damp(
          this.rightShoulderPivot.rotation.z,
          1.08 - breathLift - rightShuffle,
          9,
          dt,
        );
        this.leftShoulderPivot.rotation.y = THREE.MathUtils.damp(
          this.leftShoulderPivot.rotation.y,
          0.44 - leftShuffle * 0.35,
          8,
          dt,
        );
        this.rightShoulderPivot.rotation.y = THREE.MathUtils.damp(
          this.rightShoulderPivot.rotation.y,
          -0.44 + rightShuffle * 0.35,
          8,
          dt,
        );
        this.leftWristPivot.rotation.y = THREE.MathUtils.damp(
          this.leftWristPivot.rotation.y,
          0.52 - leftShuffle * 0.3,
          8,
          dt,
        );
        this.rightWristPivot.rotation.y = THREE.MathUtils.damp(
          this.rightWristPivot.rotation.y,
          -0.52 + rightShuffle * 0.3,
          8,
          dt,
        );
        this.leftWristPivot.rotation.z = THREE.MathUtils.damp(this.leftWristPivot.rotation.z, -0.14, 8, dt);
        this.rightWristPivot.rotation.z = THREE.MathUtils.damp(this.rightWristPivot.rotation.z, 0.14, 8, dt);

        // Subtle counter-balance tail bob & occasional little flick
        const tailBob = 0.14 + breath * 0.038 + Math.sin(elapsed * 1.37) * 0.025 + Math.abs(shuffleWave) * 0.12;
        this.tailGroup.rotation.x = THREE.MathUtils.damp(this.tailGroup.rotation.x, tailBob, 7, dt);
        this.setTailSpread(0.12 + Math.abs(shuffleWave) * 0.25 + curiousCurve * 0.12, dt);

        this.updateBackpackSpring(breath * 0.008, dt);
        this.contactShadow.scale.setScalar(1);
        this.contactShadow.visible = true;
        break;
      }
    }
  }

  private applyHappyGreetingPose(t: number, dt: number): void {
    const hop = Math.abs(Math.sin(t * Math.PI * 2)) * 0.34;
    const flutter = Math.sin(t * Math.PI * 10) * 0.52;
    const chirp = Math.abs(Math.sin(t * Math.PI * 6)) * 0.24;

    this.rigRoot.position.y = hop;
    this.bodyGroup.rotation.x = THREE.MathUtils.damp(this.bodyGroup.rotation.x, -0.07, 9, dt);
    this.bodyGroup.rotation.z = THREE.MathUtils.damp(this.bodyGroup.rotation.z, 0, 9, dt);
    this.bodyGroup.scale.set(1, 1 + hop * 0.08, 1);

    this.leftLegPivot.rotation.x = hop * 0.7;
    this.rightLegPivot.rotation.x = hop * 0.7;

    this.headGroup.rotation.z = Math.sin(t * Math.PI * 4) * 0.22;
    this.headGroup.rotation.y = Math.sin(t * Math.PI * 2) * 0.26;
    this.crestGroup.rotation.x = THREE.MathUtils.damp(this.crestGroup.rotation.x, 0.24, 12, dt);
    this.lowerBeakPivot.rotation.x = chirp;

    this.leftShoulderPivot.rotation.z = 0.26 + flutter;
    this.rightShoulderPivot.rotation.z = -0.26 - flutter;
    this.leftShoulderPivot.rotation.y = 0.12;
    this.rightShoulderPivot.rotation.y = -0.12;
    this.leftWristPivot.rotation.z = flutter * 0.32;
    this.rightWristPivot.rotation.z = -flutter * 0.32;
    this.leftWristPivot.rotation.y = 0.05;
    this.rightWristPivot.rotation.y = -0.05;

    this.tailGroup.rotation.x = 0.25 + Math.sin(t * Math.PI * 6) * 0.18;
    this.setTailSpread(0.72, dt);
    this.updateBackpackSpring(-hop * 0.09, dt);
    this.contactShadow.scale.setScalar(1 - hop * 0.45);
    this.contactShadow.visible = true;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}

export function createBharariCharacter(textures?: ProceduralTextureSet): IBharariCharacter {
  return new BharariCharacter(textures);
}

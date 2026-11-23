import * as THREE from 'three';
import type {
  IPlayerCharacter,
  PlayerAnimationState,
  PlayerMotionTelemetry,
} from '../../types/universe';
import type { ProceduralTextureSet } from '../textures';

/**
 * Stylized Rural Maharashtra Child Explorer (Replaceable Prototype Rig).
 *
 * Implements `IPlayerCharacter` cleanly decoupled from world, camera, and input
 * systems so a rigged GLTF/GLB production character can drop in seamlessly later.
 *
 * Proportions: ~1.34m tall friendly primary-school child explorer wearing a
 * warm sky-blue/cream rural school shirt, navy shorts, simple sandals, and a
 * canvas sling schoolbag.
 */
class StylizedChildExplorer implements IPlayerCharacter {
  public readonly group = new THREE.Group();
  public readonly isPlaceholderModel = true;
  public readonly assetVersionNote =
    'Stage 3 stylized child explorer prototype (IPlayerCharacter). Ready for drop-in GLTF/GLB rigged character swap.';

  private readonly bodyRoot = new THREE.Group();
  private readonly torsoPivot = new THREE.Group();
  private readonly headPivot = new THREE.Group();
  private readonly leftArmPivot = new THREE.Group();
  private readonly rightArmPivot = new THREE.Group();
  private readonly leftForearmPivot = new THREE.Group();
  private readonly rightForearmPivot = new THREE.Group();
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();
  private readonly leftShinPivot = new THREE.Group();
  private readonly rightShinPivot = new THREE.Group();
  private readonly satchelGroup = new THREE.Group();
  private readonly leftEyelid: THREE.Mesh;
  private readonly rightEyelid: THREE.Mesh;
  private readonly contactShadow: THREE.Mesh;

  private readonly disposables: Array<{ dispose: () => void }> = [];

  private animState: PlayerAnimationState = 'idle';
  private telemetry: PlayerMotionTelemetry = {
    speed: 0,
    maxSpeed: 5.8,
    turnRate: 0,
    grounded: true,
    verticalVelocity: 0,
    isRunning: false,
  };

  private stridePhase = 0;
  private interactTimer = 0;
  private blinkTimer = 2.4;
  private blinkAmount = 0;
  private lookTimer = 1.6;
  private targetHeadYaw = 0;
  private targetHeadPitch = 0;
  private currentHeadYaw = 0;
  private currentHeadPitch = 0;
  private smoothLeanForward = 0;
  private smoothBankLean = 0;
  private smoothRunBlend = 0;

  constructor(textures: ProceduralTextureSet) {
    this.group.name = 'ChildExplorerRoot';

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      this.disposables.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      this.disposables.push(m);
      return m;
    };

    const skinMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#C78A5C',
        roughness: 0.68,
        metalness: 0.02,
      }),
    );
    const hairMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#231915',
        roughness: 0.85,
      }),
    );
    // Warm rural Maharashtra school uniform: soft sky-blue cotton shirt & deep navy shorts
    const shirtMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#D8ECFA',
        roughness: 0.82,
      }),
    );
    const collarMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#254C78',
        roughness: 0.78,
      }),
    );
    const shortsMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#233B5C',
        roughness: 0.84,
      }),
    );
    const sandalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#5A3A24',
        roughness: 0.82,
      }),
    );
    const satchelMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#C97B3A',
        map: textures.leatherBag,
        roughness: 0.76,
      }),
    );
    const strapMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#7A4726',
        roughness: 0.82,
      }),
    );
    const scleraMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FAF6F0',
        roughness: 0.32,
      }),
    );
    const irisMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#2A1810',
        roughness: 0.18,
      }),
    );
    const cheekMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#D97B60',
        roughness: 0.72,
        transparent: true,
        opacity: 0.45,
      }),
    );

    // Soft grounded contact shadow
    const shadowMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: textures.contactShadow,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      }),
    );
    this.contactShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.76, 0.76)), shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.015;
    this.group.add(this.contactShadow);

    // Articulated body hierarchy
    this.bodyRoot.position.y = 0;
    this.group.add(this.bodyRoot);

    // Pelvis / Shorts waist at y = 0.56
    const pelvis = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.145, 0.155, 0.16, 12)), shortsMat);
    pelvis.position.y = 0.56;
    pelvis.castShadow = true;
    this.bodyRoot.add(pelvis);

    // Legs attached at hips (y = 0.54)
    const thighGeo = trackGeo(new THREE.CapsuleGeometry(0.058, 0.17, 6, 10));
    const shortsCuffGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.066, 0.15, 10));
    const shinGeo = trackGeo(new THREE.CapsuleGeometry(0.048, 0.18, 6, 10));
    const footGeo = trackGeo(new THREE.BoxGeometry(0.088, 0.055, 0.165));

    const buildLeg = (side: -1 | 1, hipPivot: THREE.Group, shinPivot: THREE.Group) => {
      hipPivot.position.set(side * 0.088, 0.53, 0);
      this.bodyRoot.add(hipPivot);

      const cuff = new THREE.Mesh(shortsCuffGeo, shortsMat);
      cuff.position.y = -0.07;
      cuff.castShadow = true;
      hipPivot.add(cuff);

      const thigh = new THREE.Mesh(thighGeo, skinMat);
      thigh.position.y = -0.14;
      thigh.castShadow = true;
      hipPivot.add(thigh);

      shinPivot.position.set(0, -0.255, 0);
      hipPivot.add(shinPivot);

      const shin = new THREE.Mesh(shinGeo, skinMat);
      shin.position.y = -0.125;
      shin.castShadow = true;
      shinPivot.add(shin);

      const foot = new THREE.Mesh(footGeo, sandalMat);
      foot.position.set(0, -0.245, 0.035);
      foot.castShadow = true;
      shinPivot.add(foot);
    };

    buildLeg(-1, this.leftLegPivot, this.leftShinPivot);
    buildLeg(1, this.rightLegPivot, this.rightShinPivot);

    // Torso pivot at waist (y = 0.62)
    this.torsoPivot.position.set(0, 0.62, 0);
    this.bodyRoot.add(this.torsoPivot);

    const torso = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.145, 0.24, 8, 14)),
      shirtMat,
    );
    torso.position.y = 0.18;
    torso.scale.set(1.06, 1.0, 0.84);
    torso.castShadow = true;
    this.torsoPivot.add(torso);

    // Shirt collar & small front pocket accent
    const collar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.095, 0.022, 8, 14)),
      collarMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.355, 0.01);
    this.torsoPivot.add(collar);

    const pocket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.065, 0.065, 0.015)), collarMat);
    pocket.position.set(0.065, 0.24, 0.12);
    this.torsoPivot.add(pocket);

    // Small cross-body canvas schoolbag on child's back/hip
    const strap = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.18, 0.016, 6, 18)),
      strapMat,
    );
    strap.position.set(0, 0.2, 0);
    strap.rotation.set(0.1, 0.3, 0.62);
    strap.scale.set(1.05, 1.25, 0.85);
    this.torsoPivot.add(strap);

    this.satchelGroup.position.set(-0.08, 0.16, -0.155);
    const bagBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.24, 0.09)), satchelMat);
    bagBody.castShadow = true;
    this.satchelGroup.add(bagBody);
    const bagFlap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.228, 0.08, 0.098)), strapMat);
    bagFlap.position.set(0, 0.08, 0.006);
    this.satchelGroup.add(bagFlap);
    this.torsoPivot.add(this.satchelGroup);

    // Arms attached at shoulders (y = 0.32 inside torsoPivot)
    const sleeveGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.048, 0.11, 10));
    const upperArmGeo = trackGeo(new THREE.CapsuleGeometry(0.042, 0.13, 6, 10));
    const forearmGeo = trackGeo(new THREE.CapsuleGeometry(0.036, 0.13, 6, 10));
    const handGeo = trackGeo(new THREE.SphereGeometry(0.042, 8, 8));

    const buildArm = (side: -1 | 1, shoulderPivot: THREE.Group, forearmPivot: THREE.Group) => {
      shoulderPivot.position.set(side * 0.185, 0.31, 0);
      this.torsoPivot.add(shoulderPivot);

      const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
      sleeve.position.y = -0.045;
      sleeve.castShadow = true;
      shoulderPivot.add(sleeve);

      const upperArm = new THREE.Mesh(upperArmGeo, skinMat);
      upperArm.position.y = -0.115;
      upperArm.castShadow = true;
      shoulderPivot.add(upperArm);

      forearmPivot.position.set(0, -0.195, 0);
      shoulderPivot.add(forearmPivot);

      const forearm = new THREE.Mesh(forearmGeo, skinMat);
      forearm.position.y = -0.085;
      forearm.castShadow = true;
      forearmPivot.add(forearm);

      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.y = -0.165;
      forearmPivot.add(hand);
    };

    buildArm(-1, this.leftArmPivot, this.leftForearmPivot);
    buildArm(1, this.rightArmPivot, this.rightForearmPivot);

    // Neck & expressive sculpted head (y = 0.38 inside torsoPivot)
    const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.048, 0.054, 0.075, 10)), skinMat);
    neck.position.y = 0.38;
    this.torsoPivot.add(neck);

    this.headPivot.position.set(0, 0.42, 0);
    this.torsoPivot.add(this.headPivot);

    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.165, 18, 16)), skinMat);
    head.position.y = 0.145;
    head.scale.set(0.96, 1.04, 0.98);
    head.castShadow = true;
    this.headPivot.add(head);

    // Soft sculpted hair cap + playful tuft
    const hairCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.172, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62)),
      hairMat,
    );
    hairCap.position.set(0, 0.16, -0.018);
    hairCap.rotation.x = -0.16;
    this.headPivot.add(hairCap);

    const hairBack = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.145, 12, 10)), hairMat);
    hairBack.position.set(0, 0.12, -0.065);
    this.headPivot.add(hairBack);

    const hairFringe = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.068, 10, 8)), hairMat);
    hairFringe.position.set(-0.045, 0.275, 0.095);
    hairFringe.scale.set(1.5, 0.55, 0.85);
    this.headPivot.add(hairFringe);

    // Ears
    const earGeo = trackGeo(new THREE.SphereGeometry(0.034, 8, 8));
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.155, 0.14, 0);
    leftEar.scale.set(0.55, 1.1, 0.85);
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.155;
    this.headPivot.add(leftEar, rightEar);

    // Friendly expressive eyes facing +Z
    const eyeGeo = trackGeo(new THREE.SphereGeometry(0.026, 10, 10));
    const pupilGeo = trackGeo(new THREE.SphereGeometry(0.015, 8, 8));
    const lidGeo = trackGeo(new THREE.SphereGeometry(0.029, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55));

    const buildEye = (side: -1 | 1): THREE.Mesh => {
      const ex = side * 0.056;
      const sclera = new THREE.Mesh(eyeGeo, scleraMat);
      sclera.position.set(ex, 0.158, 0.138);
      sclera.scale.set(1.0, 1.08, 0.65);
      this.headPivot.add(sclera);

      const iris = new THREE.Mesh(pupilGeo, irisMat);
      iris.position.set(ex, 0.156, 0.152);
      iris.scale.set(1.0, 1.05, 0.55);
      this.headPivot.add(iris);

      const lid = new THREE.Mesh(lidGeo, skinMat);
      lid.position.set(ex, 0.158, 0.139);
      lid.rotation.x = -Math.PI * 0.42;
      lid.scale.set(1.04, 1.08, 0.72);
      this.headPivot.add(lid);
      return lid;
    };

    this.leftEyelid = buildEye(-1);
    this.rightEyelid = buildEye(1);

    // Warm nose & subtle smiling cheeks
    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.02, 8, 8)), skinMat);
    nose.position.set(0, 0.128, 0.16);
    nose.scale.set(0.85, 0.85, 1.1);
    this.headPivot.add(nose);

    const cheekGeo = trackGeo(new THREE.SphereGeometry(0.026, 8, 8));
    const lCheek = new THREE.Mesh(cheekGeo, cheekMat);
    lCheek.position.set(-0.082, 0.115, 0.132);
    lCheek.scale.set(1.0, 0.65, 0.45);
    const rCheek = lCheek.clone();
    rCheek.position.x = 0.082;
    this.headPivot.add(lCheek, rCheek);
  }

  public setAnimationState(state: PlayerAnimationState): void {
    this.animState = state;
  }

  public getAnimationState(): PlayerAnimationState {
    return this.animState;
  }

  public setMotionTelemetry(telemetry: PlayerMotionTelemetry): void {
    this.telemetry = telemetry;
  }

  public triggerInteractGesture(): void {
    this.interactTimer = 0.62;
  }

  public update(delta: number, elapsed: number): void {
    const dt = Math.min(delta, 0.05);
    const { speed, maxSpeed, turnRate, grounded, isRunning } = this.telemetry;
    const speedRatio = THREE.MathUtils.clamp(speed / Math.max(maxSpeed, 0.01), 0, 1);

    // Natural eye blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.6 + Math.random() * 3.1;
      this.blinkAmount = 1.0;
    }
    if (this.blinkAmount > 0) {
      this.blinkAmount = Math.max(0, this.blinkAmount - dt * 7.2);
    }
    const blinkWave = Math.sin(this.blinkAmount * Math.PI);
    const lidPitch = -Math.PI * 0.42 + blinkWave * Math.PI * 0.46;
    this.leftEyelid.rotation.x = lidPitch;
    this.rightEyelid.rotation.x = lidPitch;

    // Gentle curious look-around while idle
    if (speed < 0.25 && grounded) {
      this.lookTimer -= dt;
      if (this.lookTimer <= 0) {
        this.lookTimer = 1.9 + Math.random() * 2.4;
        this.targetHeadYaw = (Math.random() - 0.5) * 0.58;
        this.targetHeadPitch = (Math.random() - 0.4) * 0.18;
      }
    } else {
      this.targetHeadYaw = THREE.MathUtils.clamp(turnRate * 0.18, -0.35, 0.35);
      this.targetHeadPitch = isRunning ? -0.05 : 0.02;
    }
    this.currentHeadYaw = THREE.MathUtils.damp(this.currentHeadYaw, this.targetHeadYaw, 5.5, dt);
    this.currentHeadPitch = THREE.MathUtils.damp(this.currentHeadPitch, this.targetHeadPitch, 5.5, dt);
    this.headPivot.rotation.y = this.currentHeadYaw;
    this.headPivot.rotation.x = this.currentHeadPitch;

    // Interaction gesture timer
    if (this.interactTimer > 0) {
      this.interactTimer = Math.max(0, this.interactTimer - dt);
    }
    const interactEase =
      this.interactTimer > 0 ? Math.sin((this.interactTimer / 0.62) * Math.PI) : 0;

    // Smooth walk-to-run transition blend (prevents abrupt animation pops when tapping Shift)
    const targetRunBlend = grounded && isRunning && speed > 1.8 ? 1 : 0;
    this.smoothRunBlend = THREE.MathUtils.damp(this.smoothRunBlend, targetRunBlend, 8.5, dt);

    // Stride cadence & leg/arm kinematics
    const isMoving = speed > 0.14 && grounded;
    if (isMoving) {
      const cadence = THREE.MathUtils.lerp(7.6, 11.4, this.smoothRunBlend);
      this.stridePhase += dt * cadence * THREE.MathUtils.clamp(speed / 2.55, 0.45, 1.38);
    }

    const moveBlend = grounded ? THREE.MathUtils.clamp(speed / 1.35, 0, 1) : 0;
    const legSwingAmp = THREE.MathUtils.lerp(0.5, 0.78, this.smoothRunBlend) * moveBlend;
    const armSwingAmp = THREE.MathUtils.lerp(0.46, 0.84, this.smoothRunBlend) * moveBlend;
    const s = Math.sin(this.stridePhase);
    const c = Math.cos(this.stridePhase);

    // Breathing + walking/running vertical bob
    const breath = Math.sin(elapsed * 2.4) * 0.012;
    const walkBob = isMoving
      ? Math.abs(s) * THREE.MathUtils.lerp(0.034, 0.068, this.smoothRunBlend) * moveBlend
      : 0;
    const targetBodyY = grounded ? breath + walkBob : 0.04;
    this.bodyRoot.position.y = THREE.MathUtils.damp(this.bodyRoot.position.y, targetBodyY, 14, dt);

    // Torso forward lean & turning bank
    const targetLean = grounded
      ? THREE.MathUtils.lerp(0.055, 0.185, this.smoothRunBlend) * speedRatio + interactEase * 0.14
      : 0.12;
    const targetBank = THREE.MathUtils.clamp(-turnRate * 0.06, -0.16, 0.16) * moveBlend;
    this.smoothLeanForward = THREE.MathUtils.damp(this.smoothLeanForward, targetLean, 9, dt);
    this.smoothBankLean = THREE.MathUtils.damp(this.smoothBankLean, targetBank, 9, dt);

    this.torsoPivot.rotation.x = this.smoothLeanForward;
    this.torsoPivot.rotation.z = this.smoothBankLean;
    this.torsoPivot.rotation.y = s * 0.1 * moveBlend;

    // Satchel playful bounce
    this.satchelGroup.rotation.x = -this.smoothLeanForward * 0.4 + Math.abs(c) * 0.08 * moveBlend;
    this.satchelGroup.rotation.z = s * 0.06 * moveBlend;

    // Legs & knees
    if (!grounded) {
      // Mid-air joyful jump pose
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, -0.45, 12, dt);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0.32, 12, dt);
      this.leftShinPivot.rotation.x = THREE.MathUtils.damp(this.leftShinPivot.rotation.x, 0.55, 12, dt);
      this.rightShinPivot.rotation.x = THREE.MathUtils.damp(this.rightShinPivot.rotation.x, 0.42, 12, dt);
    } else {
      const kneeAmp = THREE.MathUtils.lerp(0.46, 0.84, this.smoothRunBlend);
      const targetLeftHip = s * legSwingAmp;
      const targetRightHip = -s * legSwingAmp;
      const targetLeftKnee = Math.max(0, -c) * kneeAmp * moveBlend;
      const targetRightKnee = Math.max(0, c) * kneeAmp * moveBlend;

      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, targetLeftHip, 14, dt);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, targetRightHip, 14, dt);
      this.leftShinPivot.rotation.x = THREE.MathUtils.damp(this.leftShinPivot.rotation.x, targetLeftKnee, 14, dt);
      this.rightShinPivot.rotation.x = THREE.MathUtils.damp(this.rightShinPivot.rotation.x, targetRightKnee, 14, dt);
    }

    // Arms (natural swing + right arm reaches gently forward during interaction gesture)
    const idleSway = Math.sin(elapsed * 1.9) * 0.04;
    const leftArmX = !grounded ? -0.55 : -s * armSwingAmp + idleSway;
    const rightArmBaseX = !grounded ? -0.55 : s * armSwingAmp - idleSway;
    const rightArmX = THREE.MathUtils.lerp(rightArmBaseX, -1.05, interactEase);

    this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, leftArmX, 14, dt);
    this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, rightArmX, 14, dt);
    this.leftArmPivot.rotation.z = 0.08 + moveBlend * 0.05;
    this.rightArmPivot.rotation.z = -0.08 - moveBlend * 0.05 - interactEase * 0.14;

    const elbowBend = THREE.MathUtils.lerp(-0.24 * moveBlend - 0.1, -0.78, this.smoothRunBlend);
    this.leftForearmPivot.rotation.x = THREE.MathUtils.damp(this.leftForearmPivot.rotation.x, elbowBend, 12, dt);
    this.rightForearmPivot.rotation.x = THREE.MathUtils.damp(
      this.rightForearmPivot.rotation.x,
      THREE.MathUtils.lerp(elbowBend, -0.45, interactEase),
      12,
      dt,
    );

    // Contact shadow softens slightly while jumping
    const shadowScale = grounded ? 1.0 : 0.72;
    this.contactShadow.scale.setScalar(shadowScale);
  }

  public dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}

export function createPlayerCharacter(textures: ProceduralTextureSet): IPlayerCharacter {
  return new StylizedChildExplorer(textures);
}

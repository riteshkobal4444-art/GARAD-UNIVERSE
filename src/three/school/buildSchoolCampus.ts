import * as THREE from 'three';
import {
  NOTICEBOARD_RECORDS,
  PROJECT_CONTENT_BY_ID,
  PROJECT_CONTENT_DATA,
  VERIFIED_MAP_LOCATIONS,
} from '../../data/projectContentData';
import type { LivingBookId, SchoolDiscoveryToast } from '../../types/universe';
import type { TimeOfDaySystem } from '../environment/timeOfDaySystem';
import type { WindSystem } from '../environment/windSystem';
import type { ProceduralTextureSet } from '../textures';
import type { CompanionPerch } from './BharariCompanion';
import type { InteractionManager } from './InteractionManager';
import type { SchoolCollisionWorld } from './SchoolCollisionAndZones';
import {
  createActivityWallTexture,
  createClassroomWallClock,
  createEducationalBlackboardTexture,
  createLearningWallTexture,
  createMaharashtraMapTexture,
  createNoticeboardTexture,
  createProjectBookCoverTexture,
  createStudentCreativityWallTexture,
} from './schoolDisplays';
import { buildLearningKitPavilion } from './buildLearningKitPavilion';
import { buildVillageMainStreet } from './buildVillageMainStreet';
import { buildVillageNightLighting } from './buildVillageNightLighting';

interface SwingingDoor {
  id: string;
  colliderId: string;
  pivot: THREE.Group;
  isOpen: boolean;
  currentAngle: number;
  openAngle: number;
}

interface CampusNpc {
  root: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  kind:
    | 'teacher'
    | 'student-write'
    | 'student-hand'
    | 'student-read'
    | 'student-talk'
    | 'reader-browse'
    | 'play-kick'
    | 'play-hop'
    | 'play-chat';
  phase: number;
  baseY: number;
}

interface ShelfBookProp {
  bookId: LivingBookId;
  pivot: THREE.Group;
  basePos: THREE.Vector3;
  baseScale: number;
  pickedAmount: number;
}

export interface SchoolCampusBuildResult {
  group: THREE.Group;
  perches: CompanionPerch[];
  setBookPickedUp: (bookId: LivingBookId | null) => void;
  update: (delta: number, elapsed: number, nightWeight: number) => void;
  dispose: () => void;
}

export interface SchoolCampusCallbacks {
  onOpenLivingBook: (bookId: LivingBookId) => void;
  onExitToVillage: () => void;
}

function createVillageSchoolSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 176;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FAF2E1';
  ctx.fillRect(0, 0, 768, 176);

  ctx.strokeStyle = '#9E4624';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 748, 156);

  ctx.strokeStyle = '#D5B98C';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(22, 22, 724, 132);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2B2118';
  ctx.font = '800 54px Georgia, serif';
  ctx.fillText('VILLAGE SCHOOL', 384, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createGranthalaySignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 176;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#23594D';
  ctx.fillRect(0, 0, 768, 176);

  ctx.strokeStyle = '#DFC388';
  ctx.lineWidth = 9;
  ctx.strokeRect(10, 10, 748, 156);

  ctx.strokeStyle = 'rgba(248, 236, 206, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 724, 132);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FBF4E4';
  ctx.font = '800 50px Georgia, serif';
  ctx.fillText('GARAD GRANTHALAY', 384, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createTrailSignpostTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#53341E';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#D8BE92';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FAF2DF';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('CENTRAL HUB', 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLibraryBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1B6558';
  ctx.fillRect(0, 0, 512, 112);
  ctx.strokeStyle = '#DFC388';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 96);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFF8E8';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('GARAD GRANTHALAY', 256, 52);
  ctx.fillStyle = '#E8D5A8';
  ctx.font = '600 18px sans-serif';
  ctx.fillText('READING ROOM & PROJECT ARCHIVE', 256, 84);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildSchoolCampus(
  textures: ProceduralTextureSet,
  wind: WindSystem,
  timeOfDay: TimeOfDaySystem,
  collisionWorld: SchoolCollisionWorld,
  interactions: InteractionManager,
  callbacks: SchoolCampusCallbacks,
): SchoolCampusBuildResult {
  const group = new THREE.Group();
  group.name = 'MissionBharariSchoolCampus';
  group.visible = false;

  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposables.push(t);
    return t;
  };

  const doors: SwingingDoor[] = [];
  const npcs: CampusNpc[] = [];
  const perches: CompanionPerch[] = [];
  const warmLights: THREE.PointLight[] = [];
  const lampMats: THREE.MeshStandardMaterial[] = [];
  const shelfBookProps = new Map<LivingBookId, ShelfBookProp>();
  let pickedUpBookId: LivingBookId | null = null;

  // Shared campus materials
  const plasterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFF3DF',
      map: textures.warmPlaster,
      bumpMap: textures.plasterBump,
      bumpScale: 0.03,
      roughness: 0.88,
    }),
  );
  const interiorWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FBF1DF',
      roughness: 0.9,
    }),
  );
  const dadoMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#C55B34',
      roughness: 0.86,
    }),
  );
  const libraryDadoMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#2A786A',
      roughness: 0.86,
    }),
  );
  const roofMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#C4532A',
      map: textures.terracottaTiles,
      bumpMap: textures.terracottaBump,
      bumpScale: 0.08,
      roughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#824F2B',
      map: textures.teakWood,
      roughness: 0.75,
    }),
  );
  const darkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#5C361C',
      map: textures.teakWood,
      roughness: 0.78,
    }),
  );
  const shutterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#286A5E',
      roughness: 0.74,
    }),
  );
  const stoneFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D2C2AE',
      map: textures.carvedStone,
      roughness: 0.88,
    }),
  );
  const grassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#648B47',
      map: textures.meadowGrass,
      roughness: 0.95,
    }),
  );
  const courtyardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D9AE80',
      map: textures.ochrePath,
      roughness: 0.94,
    }),
  );
  const playgroundEarthMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#C98F5D',
      map: textures.ochrePath,
      roughness: 0.95,
    }),
  );
  const barkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#64442C',
      roughness: 0.92,
    }),
  );
  const foliageMat1 = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#4E8540',
      roughness: 0.84,
    }),
  );
  wind.applyWindShader(foliageMat1, {
    swayAmp: 0.14,
    flutterAmp: 0.04,
    heightMin: -1.0,
    heightRange: 2.0,
    cacheKey: 'school-foliage-1',
  });

  const foliageMat2 = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#639C48',
      roughness: 0.84,
    }),
  );
  wind.applyWindShader(foliageMat2, {
    swayAmp: 0.17,
    flutterAmp: 0.045,
    heightMin: -1.0,
    heightRange: 2.0,
    cacheKey: 'school-foliage-2',
  });

  // ============================================================================
  // 1. RURAL VILLAGE MAIN STREET, TERRAIN, COURTYARD & WEST PLAYGROUND
  // ============================================================================
  const groundMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(240, 240)), grassMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(0, -0.02, 24);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // Compose the Mission Bharari Rural Maharashtra Village Main Street (Z = 64 -> 11.5)
  const mainStreet = buildVillageMainStreet(textures, wind, timeOfDay, collisionWorld);
  group.add(mainStreet.group);

  // Additive open-air Learning Kit Pavilion along the natural approach to the Village School
  const learningKitPavilion = buildLearningKitPavilion(
    textures,
    { woodMat, darkWoodMat, stoneFloorMat, roofMat },
    collisionWorld,
    interactions,
  );
  group.add(learningKitPavilion.group);

  // Additive rural Maharashtra veranda lanterns & warm evening/night illumination
  const villageNightLighting = buildVillageNightLighting(timeOfDay);
  group.add(villageNightLighting.group);

  // Sun-baked ochre school courtyard apron seamlessly joining the North end of Main Street
  const courtyardMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(19.6, 10.8)), courtyardMat);
  courtyardMesh.rotation.x = -Math.PI / 2;
  courtyardMesh.position.set(-2.5, 0.006, 7.1);
  courtyardMesh.receiveShadow = true;
  group.add(courtyardMesh);

  // Relocated warm red-earth outdoor playground court on the West side of the school
  const playgroundMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(15.6, 15.6)),
    playgroundEarthMat,
  );
  playgroundMesh.rotation.x = -Math.PI / 2;
  playgroundMesh.position.set(-20.6, 0.008, 2.5);
  playgroundMesh.receiveShadow = true;
  group.add(playgroundMesh);

  // Chalk boundary lines on the West playground
  const lineMat = trackMat(new THREE.MeshBasicMaterial({ color: '#F3EBDC' }));
  const drawChalkLine = (x: number, z: number, w: number, d: number) => {
    const m = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(w, d)), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.016, z);
    group.add(m);
  };
  drawChalkLine(-20.6, -4.4, 13.6, 0.13);
  drawChalkLine(-20.6, 9.4, 13.6, 0.13);
  drawChalkLine(-27.4, 2.5, 0.13, 13.9);
  drawChalkLine(-13.8, 2.5, 0.13, 13.9);
  drawChalkLine(-20.6, 2.5, 0.13, 13.8);

  // Distant rolling Deccan/Sahyadri hills behind the school campus horizon
  const hillMat = trackMat(new THREE.MeshStandardMaterial({ color: '#618250', roughness: 0.96 }));
  const hillConfigs = [
    { x: -56, z: -50, rx: 36, ry: 13, rz: 24 },
    { x: -4, z: -60, rx: 48, ry: 17, rz: 26 },
    { x: 52, z: -46, rx: 38, ry: 14, rz: 24 },
    { x: -68, z: 6, rx: 28, ry: 11, rz: 36 },
  ];
  const hillGeo = trackGeo(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55));
  for (const h of hillConfigs) {
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.position.set(h.x, -1.2, h.z);
    hill.scale.set(h.rx, h.ry, h.rz);
    group.add(hill);
  }

  // Low natural rural school compound wall (open South toward Main Street & open West to Playground)
  const fenceWallMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#E4D2B8', roughness: 0.9 }),
  );
  const addFenceSegment = (id: string, cx: number, cz: number, w: number, d: number) => {
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, 0.98, d)), fenceWallMat);
    mesh.position.set(cx, 0.49, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const cap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w + 0.08, 0.11, d + 0.08)), dadoMat);
    cap.position.set(cx, 1.02, cz);
    group.add(cap);

    collisionWorld.addCenterCollider(id, cx, 0.6, cz, w, 1.35, d, false);
  };
  addFenceSegment('fence-school-north', -2.5, -11.4, 20.6, 0.42);
  addFenceSegment('fence-school-east', 7.6, 0.2, 0.42, 23.4);
  addFenceSegment('fence-school-se', 4.9, 11.9, 5.4, 0.42);

  // ============================================================================
  // 2. VILLAGE SCHOOL BUILDING (X ∈ [-10.5, 1.5], Z ∈ [-9.0, -1.0], VERANDA Z ∈ [-1.0, 2.0])
  // ============================================================================
  const plinthH = 0.36;
  const wallH = 3.85;
  const wallTopY = plinthH + wallH;
  const wallThick = 0.34;

  // Raised stone plinth & front veranda slab for Village School
  const plinthMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(13.0, plinthH, 11.2)),
    stoneFloorMat,
  );
  plinthMesh.position.set(-4.5, plinthH * 0.5, -3.6);
  plinthMesh.receiveShadow = true;
  group.add(plinthMesh);

  // Smooth front veranda stone steps along Z = 2.0..3.1
  const step1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(12.6, 0.24, 0.56)), stoneFloorMat);
  step1.position.set(-4.5, 0.12, 2.38);
  step1.receiveShadow = true;
  group.add(step1);

  const step2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(12.6, 0.12, 0.56)), stoneFloorMat);
  step2.position.set(-4.5, 0.06, 2.86);
  step2.receiveShadow = true;
  group.add(step2);

  // Helper to construct structural wall segment + matching solid collision box
  const addWall = (
    id: string,
    cx: number,
    cz: number,
    w: number,
    d: number,
    h = wallH,
    yBase = plinthH,
    useLibraryDado = false,
  ) => {
    const mesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(w, h, d)),
      plasterMat,
    );
    mesh.position.set(cx, yBase + h * 0.5, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (yBase === plinthH && h > 1.5) {
      const dado = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(w + 0.02, 0.85, d + 0.02)),
        useLibraryDado ? libraryDadoMat : dadoMat,
      );
      dado.position.set(cx, plinthH + 0.425, cz);
      group.add(dado);
    }

    collisionWorld.addCenterCollider(id, cx, yBase + h * 0.5, cz, w, h, d, true);
  };

  // Village School exterior walls (Classroom occupies X ∈ [-10.5, 1.5], Z ∈ [-9.0, -1.0])
  addWall('wall-school-north', -4.5, -9.0, 12.34, wallThick);
  addWall('wall-school-west', -10.5, -5.0, wallThick, 8.34);
  addWall('wall-school-east', 1.5, -5.0, wallThick, 8.34);

  // Front South Wall (Z = -1.0) with generous 1.8m Classroom Doorway: X ∈ [-6.1, -4.3]
  addWall('wall-school-south-w', -8.3, -1.0, 4.4, wallThick);
  addWall('wall-school-south-e', -1.4, -1.0, 5.8, wallThick);
  addWall('wall-door-class-lintel', -5.2, -1.0, 1.8, wallThick, 1.15, plinthH + 2.7);

  // Decorative open sunlit window frames with green shutters
  const addWindowFrame = (x: number, y: number, z: number, rotY = 0) => {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;

    const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 1.35, 0.42)), darkWoodMat);
    wg.add(frame);

    const glassMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#D5EFF8',
        emissive: '#FFE5B2',
        emissiveIntensity: 0.12,
        roughness: 0.18,
        metalness: 0.08,
      }),
    );
    const pane = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 1.15, 0.44)), glassMat);
    wg.add(pane);

    const barGeo = trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 1.15, 6));
    for (let b = -0.36; b <= 0.37; b += 0.36) {
      const bar = new THREE.Mesh(barGeo, darkWoodMat);
      bar.position.set(b, 0, 0.22);
      wg.add(bar);
    }

    const shutterGeo = trackGeo(new THREE.BoxGeometry(0.62, 1.24, 0.06));
    const lShut = new THREE.Mesh(shutterGeo, shutterMat);
    lShut.position.set(-1.02, 0, 0.24);
    lShut.rotation.y = 0.28;
    const rShut = new THREE.Mesh(shutterGeo, shutterMat);
    rShut.position.set(1.02, 0, 0.24);
    rShut.rotation.y = -0.28;
    wg.add(lShut, rShut);

    group.add(wg);
  };

  addWindowFrame(-8.3, plinthH + 1.85, -1.0, 0);
  addWindowFrame(-10.5, plinthH + 1.85, -5.0, -Math.PI / 2);
  addWindowFrame(1.5, plinthH + 1.85, -2.7, Math.PI / 2);

  // Pitched Mangalore terracotta roof for Village School
  const schoolRoofW = 14.8;
  const roofNorth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(schoolRoofW, 0.2, 6.8)), roofMat);
  roofNorth.position.set(-4.5, wallTopY + 1.1, -6.5);
  roofNorth.rotation.x = -0.35;
  roofNorth.castShadow = true;
  group.add(roofNorth);

  const roofSouth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(schoolRoofW, 0.2, 8.8)), roofMat);
  roofSouth.position.set(-4.5, wallTopY + 0.72, -0.35);
  roofSouth.rotation.x = 0.35;
  roofSouth.castShadow = true;
  group.add(roofSouth);

  const ridgeBeam = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.18, 0.18, schoolRoofW + 0.3, 10)),
    roofMat,
  );
  ridgeBeam.rotation.z = Math.PI / 2;
  ridgeBeam.position.set(-4.5, wallTopY + 2.25, -3.5);
  group.add(ridgeBeam);

  // Gable end triangles closing West & East roof peaks
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-5.8, 0);
  gableShape.lineTo(5.8, 0);
  gableShape.lineTo(0, 2.35);
  gableShape.closePath();
  const gableGeo = trackGeo(new THREE.ExtrudeGeometry(gableShape, { depth: 0.3, bevelEnabled: false }));
  const westGable = new THREE.Mesh(gableGeo, interiorWallMat);
  westGable.rotation.y = Math.PI / 2;
  westGable.position.set(-10.65, wallTopY - 0.05, -3.5);
  const eastGable = new THREE.Mesh(gableGeo, interiorWallMat);
  eastGable.rotation.y = Math.PI / 2;
  eastGable.position.set(1.35, wallTopY - 0.05, -3.5);
  group.add(westGable, eastGable);

  // Teak veranda pillars along Z = 1.82
  const pillarXs = [-10.4, -7.2, -3.6, -0.4, 1.65];
  const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.14, 3.45, 10));
  const pillarBaseGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.22, 0.38));
  for (let i = 0; i < pillarXs.length; i++) {
    const px = pillarXs[i];
    const base = new THREE.Mesh(pillarBaseGeo, stoneFloorMat);
    base.position.set(px, plinthH + 0.11, 1.82);
    group.add(base);

    const post = new THREE.Mesh(pillarGeo, woodMat);
    post.position.set(px, plinthH + 1.85, 1.82);
    post.castShadow = true;
    group.add(post);

    collisionWorld.addCenterCollider(`school-pillar-${i}`, px, plinthH + 1.8, 1.82, 0.36, 3.5, 0.36, false);
  }

  // Veranda top beam & clean rural signboard: "VILLAGE SCHOOL"
  const verandaBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(13.1, 0.24, 0.26)), darkWoodMat);
  verandaBeam.position.set(-4.5, plinthH + 3.45, 1.82);
  group.add(verandaBeam);

  const schoolSignTex = trackTex(createVillageSchoolSignTexture());
  const schoolSignMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: schoolSignTex,
      roughness: 0.68,
    }),
  );
  const schoolSignFrame = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(4.8, 1.12, 0.14)),
    darkWoodMat,
  );
  schoolSignFrame.position.set(-4.5, plinthH + 3.84, 1.98);
  schoolSignFrame.castShadow = true;
  group.add(schoolSignFrame);

  const schoolSignFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.62, 0.98)),
    schoolSignMat,
  );
  schoolSignFace.position.set(-4.5, plinthH + 3.84, 2.06);
  group.add(schoolSignFace);

  const bracketGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.56, 0.28));
  for (const bx of [-6.3, -2.7]) {
    const bracket = new THREE.Mesh(bracketGeo, darkWoodMat);
    bracket.position.set(bx, plinthH + 3.46, 1.9);
    group.add(bracket);
  }

  // Physical Noticeboard mounted neatly on the front school veranda wall (optional discovery)
  const noticeboardTex = trackTex(createNoticeboardTexture());
  const noticeboardMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: noticeboardTex,
      roughness: 0.78,
    }),
  );
  const noticeboardFrame = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.58, 1.52, 0.1)),
    darkWoodMat,
  );
  noticeboardFrame.position.set(-1.35, plinthH + 1.88, -0.8);
  noticeboardFrame.castShadow = true;
  group.add(noticeboardFrame);

  const noticeboardFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(2.44, 1.4)),
    noticeboardMat,
  );
  noticeboardFace.position.set(-1.35, plinthH + 1.88, -0.74);
  group.add(noticeboardFace);

  interactions.register({
    id: 'school-noticeboard',
    kind: 'noticeboard',
    position: new THREE.Vector3(-1.35, plinthH + 0.12, 0.05),
    radius: 2.35,
    discoverable: true,
    getPrompt: () => ({
      id: 'school-noticeboard',
      kind: 'noticeboard',
      label: 'School Noticeboard',
      actionVerb: 'Read',
      subtitle: 'Garad Foundation notices & records',
    }),
    onInteract: (): SchoolDiscoveryToast => ({
      id: 'school-noticeboard',
      title: 'Garad Foundation — School Noticeboard',
      subtitle: 'Documented Activity Records & Announcements',
      body: 'Pinned on the school veranda wall, these notices track initial Garad Foundation records using only verified or explicitly documented details.',
      entries: NOTICEBOARD_RECORDS.map((rec) => ({
        heading: rec.title,
        meta: rec.category,
        details: rec.entries,
        verificationNote: rec.verificationNote,
      })),
      note: 'All unverified dates, locations, or photographs remain honestly marked awaiting source verification.',
      timestamp: Date.now(),
    }),
  });

  // Hanging brass school bell on the front veranda
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D49E38',
      roughness: 0.34,
      metalness: 0.68,
    }),
  );
  const bellMesh = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.16, 0.28, 14)), brassMat);
  bellMesh.position.set(-3.6, plinthH + 2.6, 1.82);
  group.add(bellMesh);

  // ============================================================================
  // 3. REAL SWINGING 3D WOODEN DOORS (VILLAGE SCHOOL & SEPARATE GARAD GRANTHALAY)
  // ============================================================================
  const buildSwingingDoor = (
    id: string,
    colliderId: string,
    hingeX: number,
    hingeZ: number,
    label: string,
    openAngle: number,
    startOpen: boolean,
    orientation: 'south' | 'west' = 'south',
  ) => {
    const pivot = new THREE.Group();
    pivot.position.set(hingeX, plinthH, hingeZ);
    group.add(pivot);

    const doorPanel = new THREE.Mesh(
      trackGeo(
        orientation === 'south'
          ? new THREE.BoxGeometry(1.72, 2.66, 0.1)
          : new THREE.BoxGeometry(0.1, 2.66, 1.72),
      ),
      woodMat,
    );
    if (orientation === 'south') {
      doorPanel.position.set(0.86, 1.33, 0);
    } else {
      doorPanel.position.set(0, 1.33, 0.86);
    }
    doorPanel.castShadow = true;
    pivot.add(doorPanel);

    const trim = new THREE.Mesh(
      trackGeo(
        orientation === 'south'
          ? new THREE.BoxGeometry(1.36, 1.0, 0.13)
          : new THREE.BoxGeometry(0.13, 1.0, 1.36),
      ),
      darkWoodMat,
    );
    const trimLow = new THREE.Mesh(
      trackGeo(
        orientation === 'south'
          ? new THREE.BoxGeometry(1.36, 0.9, 0.13)
          : new THREE.BoxGeometry(0.13, 0.9, 1.36),
      ),
      darkWoodMat,
    );
    const handle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 8, 8)), brassMat);
    const handleBack = handle.clone();

    if (orientation === 'south') {
      trim.position.set(0.86, 1.85, 0);
      trimLow.position.set(0.86, 0.72, 0);
      handle.position.set(1.52, 1.15, 0.09);
      handleBack.position.set(1.52, 1.15, -0.09);
    } else {
      trim.position.set(0, 1.85, 0.86);
      trimLow.position.set(0, 0.72, 0.86);
      handle.position.set(-0.09, 1.15, 1.52);
      handleBack.position.set(0.09, 1.15, 1.52);
    }
    pivot.add(trim, trimLow, handle, handleBack);

    const frameTop = new THREE.Mesh(
      trackGeo(
        orientation === 'south'
          ? new THREE.BoxGeometry(1.9, 0.12, 0.42)
          : new THREE.BoxGeometry(0.42, 0.12, 1.9),
      ),
      darkWoodMat,
    );
    if (orientation === 'south') {
      frameTop.position.set(hingeX + 0.86, plinthH + 2.68, hingeZ);
    } else {
      frameTop.position.set(hingeX, plinthH + 2.68, hingeZ + 0.86);
    }
    group.add(frameTop);

    collisionWorld.addCenterCollider(
      colliderId,
      orientation === 'south' ? hingeX + 0.86 : hingeX,
      plinthH + 1.35,
      orientation === 'south' ? hingeZ : hingeZ + 0.86,
      orientation === 'south' ? 1.74 : 0.34,
      2.65,
      orientation === 'south' ? 0.34 : 1.74,
      true,
    );
    collisionWorld.setColliderEnabled(colliderId, !startOpen);

    const doorObj: SwingingDoor = {
      id,
      colliderId,
      pivot,
      isOpen: startOpen,
      currentAngle: startOpen ? openAngle : 0,
      openAngle,
    };
    pivot.rotation.y = doorObj.currentAngle;
    doors.push(doorObj);

    const promptPos =
      orientation === 'south'
        ? new THREE.Vector3(hingeX + 0.86, plinthH + 0.08, hingeZ + 0.45)
        : new THREE.Vector3(hingeX - 0.45, plinthH + 0.08, hingeZ + 0.86);

    interactions.register({
      id,
      kind: 'door',
      position: promptPos,
      radius: 2.35,
      discoverable: false,
      getPrompt: () => ({
        id,
        kind: 'door',
        label,
        actionVerb: doorObj.isOpen ? 'Close' : 'Open',
      }),
      onInteract: () => {
        doorObj.isOpen = !doorObj.isOpen;
        collisionWorld.setColliderEnabled(colliderId, !doorObj.isOpen);
        return null;
      },
    });
  };

  // Classroom door (swings inward) & Separate Garad Granthalay door (starts open invitingly)
  buildSwingingDoor('door-classroom', 'col-door-classroom', -6.08, -1.0, 'Classroom Door', 1.65, false, 'south');
  buildSwingingDoor('door-library', 'col-door-library', 13.0, 16.6, 'Library Door', 1.65, true, 'west');

  // Warm interior ceiling lamps for Classroom & Garad Granthalay
  const addCeilingLamp = (x: number, z: number) => {
    const cord = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6)), darkWoodMat);
    cord.position.set(x, wallTopY - 0.32, z);
    group.add(cord);

    const bulbMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FFF4D2',
        emissive: '#FFBE55',
        emissiveIntensity: 0.4,
        roughness: 0.35,
      }),
    );
    lampMats.push(bulbMat);
    const shade = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.16, 12)), shutterMat);
    shade.position.set(x, wallTopY - 0.66, z);
    const bulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 10, 10)), bulbMat);
    bulb.position.set(x, wallTopY - 0.74, z);
    group.add(shade, bulb);

    const light = new THREE.PointLight('#FFE2A8', 1.05, 13.5, 1.5);
    light.position.set(x, wallTopY - 0.9, z);
    group.add(light);
    warmLights.push(light);
  };
  addCeilingLamp(-4.5, -5.0);
  addCeilingLamp(17.75, 17.5);

  // Register warm interior lamp glows with shared TimeOfDaySystem
  for (const lm of lampMats) {
    timeOfDay.registerWarmGlow({
      material: lm,
      dayEmissive: 0.35,
      sunsetEmissive: 1.1,
      nightEmissive: 1.75,
    });
  }

  // ============================================================================
  // 4. REAL LEARNING CLASSROOM (WEST WING: X ∈ [-10.5, 0], Z ∈ [-9.0, -1.0])
  // ============================================================================
  // Large authentic green classroom blackboard (Classes 5–10 lesson — NO NGO stats!)
  const eduBoardTex = trackTex(createEducationalBlackboardTexture());
  const boardMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: eduBoardTex,
      roughness: 0.88,
    }),
  );
  const blackboard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 1.85, 0.08)), boardMat);
  blackboard.position.set(-5.6, plinthH + 1.88, -8.76);
  group.add(blackboard);

  const boardFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.36, 2.0, 0.06)), darkWoodMat);
  boardFrame.position.set(-5.6, plinthH + 1.88, -8.8);
  group.add(boardFrame);

  const chalkTray = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.0, 0.08, 0.16)), woodMat);
  chalkTray.position.set(-5.6, plinthH + 0.91, -8.68);
  group.add(chalkTray);

  // Wooden duster & chalk sticks resting on chalk tray
  const duster = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.05, 0.07)), darkWoodMat);
  duster.position.set(-4.35, plinthH + 0.975, -8.66);
  const chalkMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FAF8F0', roughness: 0.92 }));
  const chalk1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.11, 6)), chalkMat);
  chalk1.rotation.z = Math.PI / 2;
  chalk1.position.set(-5.9, plinthH + 0.96, -8.66);
  const chalk2 = chalk1.clone();
  chalk2.position.set(-5.74, plinthH + 0.96, -8.64);
  chalk2.rotation.y = 0.25;
  group.add(duster, chalk1, chalk2);

  // Working Classroom Wall Clock mounted above the blackboard
  const wallClock = createClassroomWallClock();
  wallClock.group.position.set(-5.6, plinthH + 3.24, -8.78);
  group.add(wallClock.group);

  // Interactive Educational Blackboard inspection
  interactions.register({
    id: 'classroom-blackboard',
    kind: 'blackboard',
    position: new THREE.Vector3(-5.6, plinthH + 0.12, -7.85),
    radius: 2.4,
    discoverable: true,
    getPrompt: () => ({
      id: 'classroom-blackboard',
      kind: 'blackboard',
      label: 'Classroom Blackboard',
      actionVerb: 'Read Lesson',
      subtitle: 'Classes 5–10 · Fractions, Environment & Marathi Thought',
    }),
    onInteract: (): SchoolDiscoveryToast => ({
      id: 'classroom-blackboard',
      title: 'Today’s Classroom Lesson (Classes 5–10)',
      subtitle: 'Mathematics • Environment • Suvichar',
      body: 'A real learning classroom blackboard featuring daily mathematics, environmental care, and a Marathi thought for students.',
      entries: [
        {
          heading: 'Mathematics — Fractions',
          meta: '1/2 + 1/4 = 3/4',
          details: [
            'Step 1: Convert 1/2 to equivalent quarters -> 2/4.',
            'Step 2: Add like denominators -> 2/4 + 1/4 = 3/4.',
            'Visual bar shows 3 of 4 equal parts shaded.',
          ],
        },
        {
          heading: 'Environmental Lesson',
          details: [
            'Save Water. Plant Trees. Keep Our Village Clean.',
            'Every drop counts and every tree gives shade to our community.',
          ],
        },
        {
          heading: 'आजचा सुविचार (Marathi Thought)',
          details: ['"शिका, पुढे चला आणि इतरांनाही पुढे घेऊन चला."'],
        },
      ],
      timestamp: Date.now(),
    }),
  });

  // ---------------------------------------------------------------------------
  // FOUR DISTINCT CLASSROOM WALL DISPLAY AREAS
  // ---------------------------------------------------------------------------

  // A. Student Creativity Wall (West Wall, South half: X = -10.26, Z = -2.85)
  const creativityTex = trackTex(createStudentCreativityWallTexture());
  const creativityMat = trackMat(
    new THREE.MeshStandardMaterial({ map: creativityTex, roughness: 0.78 }),
  );
  const creativityBoard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.08, 1.5, 2.38)),
    creativityMat,
  );
  creativityBoard.position.set(-10.26, plinthH + 1.88, -2.85);
  group.add(creativityBoard);

  interactions.register({
    id: 'classroom-creativity-wall',
    kind: 'exhibition',
    position: new THREE.Vector3(-9.55, plinthH + 0.12, -2.85),
    radius: 2.35,
    discoverable: true,
    getPrompt: () => ({
      id: 'classroom-creativity-wall',
      kind: 'exhibition',
      label: 'Student Creativity Wall',
      actionVerb: 'Inspect',
      subtitle: 'Drawings, paintings, poems & essays',
    }),
    onInteract: (): SchoolDiscoveryToast => ({
      id: 'classroom-creativity-wall',
      title: 'Student Creativity Wall',
      subtitle: 'Drawings • Paintings • Poems • Essays',
      body: 'A dedicated classroom wall celebrating student imagination across visual art, Marathi and English poetry, and short village essays.',
      entries: [
        {
          heading: 'Visual Art Frames (Drawings & Paintings)',
          details: [
            'Sample classroom art frames showcasing village hills and monsoon trees.',
            'Structured slots ready for authentic uploaded student drawings.',
          ],
        },
        {
          heading: 'Poetry & Essay Sheets',
          details: [
            'Notebook display slots reserved for approved student poems and essays.',
            'Zero invented student names or fabricated competition claims.',
          ],
        },
      ],
      note: 'Ready for approved real student artworks & entries.',
      timestamp: Date.now(),
    }),
  });

  // B. Learning Wall (West Wall, North half: X = -10.26, Z = -7.05)
  const learningWallTex = trackTex(createLearningWallTexture());
  const learningWallMat = trackMat(
    new THREE.MeshStandardMaterial({ map: learningWallTex, roughness: 0.76 }),
  );
  const learningWallBoard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.08, 1.5, 2.38)),
    learningWallMat,
  );
  learningWallBoard.position.set(-10.26, plinthH + 1.88, -7.05);
  group.add(learningWallBoard);

  interactions.register({
    id: 'classroom-learning-wall',
    kind: 'learning-wall',
    position: new THREE.Vector3(-9.55, plinthH + 0.12, -7.05),
    radius: 2.35,
    discoverable: true,
    getPrompt: () => ({
      id: 'classroom-learning-wall',
      kind: 'learning-wall',
      label: 'Classroom Learning Wall',
      actionVerb: 'Study Charts',
      subtitle: 'Mathematics, Water Cycle science & nature charts',
    }),
    onInteract: (): SchoolDiscoveryToast => ({
      id: 'classroom-learning-wall',
      title: 'Classroom Learning Wall',
      subtitle: 'Classes 5–10 Reference Charts',
      body: 'Visual study posters hanging beside the student desks to reinforce daily classroom learning in mathematics, science, and environmental care.',
      entries: [
        {
          heading: 'Mathematics Reference Chart',
          details: [
            'Fractions to Decimals & Percentages: 1/2 = 0.50 (50%), 1/4 = 0.25 (25%), 3/4 = 0.75 (75%).',
            'Geometry: Area of Square = side × side · Area of Triangle = ½ × base × height.',
          ],
        },
        {
          heading: 'Science Diagram — The Water Cycle',
          details: [
            'Evaporation from rivers and ponds forms clouds, condensation brings monsoon rain, and collection refills village streams.',
          ],
        },
        {
          heading: 'Environmental Awareness & Motivation',
          details: [
            'Save every drop · Plant native trees · Keep campus clean.',
            '“Curiosity turns every question into a new window of learning.”',
          ],
        },
      ],
      timestamp: Date.now(),
    }),
  });

  // C. Garad Foundation Activity Wall (East Interior Wall inside Classroom: X = 1.26, Z = -6.3)
  const activityWallTex = trackTex(createActivityWallTexture());
  const activityWallMat = trackMat(
    new THREE.MeshStandardMaterial({ map: activityWallTex, roughness: 0.76 }),
  );
  const activityWallBoard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.08, 1.68, 2.95)),
    activityWallMat,
  );
  activityWallBoard.position.set(1.26, plinthH + 1.92, -6.3);
  group.add(activityWallBoard);

  interactions.register({
    id: 'classroom-activity-wall',
    kind: 'activity-wall',
    position: new THREE.Vector3(0.45, plinthH + 0.12, -6.3),
    radius: 2.45,
    discoverable: true,
    getPrompt: () => ({
      id: 'classroom-activity-wall',
      kind: 'activity-wall',
      label: 'Garad Foundation Activity Wall',
      actionVerb: 'Inspect Exhibition',
      subtitle: 'Selected Garad Foundation activities & photo archive frames',
    }),
    onInteract: (): SchoolDiscoveryToast => ({
      id: 'classroom-activity-wall',
      title: 'Garad Foundation Activity Wall',
      subtitle: 'School Exhibition Display',
      body: 'A curated school exhibition board summarizing Garad Foundation’s documented initiatives. Visit the adjacent Library to pick up the full Project Books.',
      entries: PROJECT_CONTENT_DATA.map((p) => ({
        heading: p.title,
        meta: `${p.activityDate} · ${p.location}`,
        details: [p.shortIntroduction, p.verifiedBeneficiaryFigure],
        photoPlaceholder: 'Photograph awaiting upload',
      })),
      note: 'Actual event photographs will replace awaiting-upload frames once added to ProjectContentData.',
      timestamp: Date.now(),
    }),
  });

  // D. Maharashtra Map Wall (North Wall right of blackboard: X = -1.75, Z = -8.78)
  const mapWallTex = trackTex(createMaharashtraMapTexture());
  const mapWallMat = trackMat(
    new THREE.MeshStandardMaterial({ map: mapWallTex, roughness: 0.75 }),
  );
  const mapWallBoard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.98, 1.58, 0.07)),
    mapWallMat,
  );
  mapWallBoard.position.set(-1.75, plinthH + 1.94, -8.78);
  group.add(mapWallBoard);

  interactions.register({
    id: 'classroom-map-wall',
    kind: 'map-wall',
    position: new THREE.Vector3(-1.75, plinthH + 0.12, -7.85),
    radius: 2.3,
    discoverable: true,
    getPrompt: () => ({
      id: 'classroom-map-wall',
      kind: 'map-wall',
      label: 'Maharashtra Map Wall',
      actionVerb: 'Explore Map',
      subtitle: 'Verified Garad Foundation activity locations',
    }),
    onInteract: (): SchoolDiscoveryToast => ({
      id: 'classroom-map-wall',
      title: 'Maharashtra Activity Map',
      subtitle: 'Verified Documented Locations Only',
      body: 'This classroom wall map marks only locations explicitly recorded in supplied Garad Foundation project notes — no unverified districts or pins are added.',
      entries: VERIFIED_MAP_LOCATIONS.map((loc) => ({
        heading: `${loc.name} — ${loc.projectTitle}`,
        meta: `${loc.date} · ${loc.districtLabel}`,
        details: [loc.summary],
        verificationNote: loc.verificationNote,
      })),
      note: 'Additional district pins will be added only after official source verification.',
      timestamp: Date.now(),
    }),
  });

  // Small supplementary chart left of blackboard balancing the North wall
  const chart1Mat = trackMat(
    new THREE.MeshStandardMaterial({ map: textures.educationalChart1, roughness: 0.72 }),
  );
  const chart1 = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.15, 1.45)), chart1Mat);
  chart1.position.set(-8.85, plinthH + 2.02, -8.78);
  group.add(chart1);

  // Teacher's desk & wooden chair in front-right of classroom
  const buildTeacherDesk = (x: number, z: number) => {
    const top = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.45, 0.08, 0.76)), woodMat);
    top.position.set(x, plinthH + 0.78, z);
    top.castShadow = true;
    group.add(top);

    const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.32, 0.74, 0.66)), darkWoodMat);
    body.position.set(x, plinthH + 0.37, z);
    group.add(body);

    // Teacher's wooden chair tucked neatly behind desk
    const chairSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.06, 0.46)), woodMat);
    chairSeat.position.set(x + 0.05, plinthH + 0.45, z - 0.62);
    const chairBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.46, 0.06)), darkWoodMat);
    chairBack.position.set(x + 0.05, plinthH + 0.7, z - 0.82);
    const cLegGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.45, 0.05));
    for (const lx of [-0.19, 0.19]) {
      for (const lz of [-0.18, 0.18]) {
        const leg = new THREE.Mesh(cLegGeo, darkWoodMat);
        leg.position.set(x + 0.05 + lx, plinthH + 0.225, z - 0.62 + lz);
        group.add(leg);
      }
    }
    group.add(chairSeat, chairBack);

    // Open attendance register, textbooks & pen on teacher's desk
    const reg = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.42, 0.03, 0.28)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#FAF3E1', roughness: 0.85 })),
    );
    reg.position.set(x - 0.2, plinthH + 0.835, z);
    reg.rotation.y = 0.14;
    const tBook = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.26, 0.045, 0.2)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#1B5B82', roughness: 0.72 })),
    );
    tBook.position.set(x + 0.38, plinthH + 0.84, z - 0.06);
    group.add(reg, tBook);

    collisionWorld.addCenterCollider('desk-teacher', x, plinthH + 0.45, z - 0.12, 1.5, 0.9, 1.15, false);
  };
  buildTeacherDesk(-3.2, -7.25);

  // Student wooden benches & desks with notebooks, pencils & school bags (generous walkable aisles!)
  const notebookColors = ['#E76A3C', '#2B7D72', '#2E6399', '#D99B32'];
  const bagColors = ['#2C6288', '#C6532D', '#2D755E', '#7A4C72'];
  const pencilMat = trackMat(new THREE.MeshStandardMaterial({ color: '#E8B238', roughness: 0.65 }));

  const buildStudentBenchDesk = (id: string, x: number, z: number, colorIdx: number) => {
    const g = new THREE.Group();
    g.position.set(x, plinthH, z);
    group.add(g);

    const deskTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.65, 0.07, 0.56)), woodMat);
    deskTop.position.set(0, 0.66, -0.22);
    deskTop.castShadow = true;
    g.add(deskTop);

    const legGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.65, 0.48));
    const lLeg = new THREE.Mesh(legGeo, darkWoodMat);
    lLeg.position.set(-0.74, 0.325, -0.22);
    const rLeg = new THREE.Mesh(legGeo, darkWoodMat);
    rLeg.position.set(0.74, 0.325, -0.22);
    g.add(lLeg, rLeg);

    const benchSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.65, 0.06, 0.34)), woodMat);
    benchSeat.position.set(0, 0.42, 0.32);
    benchSeat.castShadow = true;
    g.add(benchSeat);

    const bLegGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.42, 0.28));
    const blLeg = new THREE.Mesh(bLegGeo, darkWoodMat);
    blLeg.position.set(-0.74, 0.21, 0.32);
    const brLeg = new THREE.Mesh(bLegGeo, darkWoodMat);
    brLeg.position.set(0.74, 0.21, 0.32);
    g.add(blLeg, brLeg);

    // Notebooks & wooden pencils on desk
    const nbMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: notebookColors[colorIdx % notebookColors.length],
        roughness: 0.78,
      }),
    );
    const nb1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.028, 0.22)), nbMat);
    nb1.position.set(-0.38, 0.71, -0.22);
    nb1.rotation.y = 0.08;
    const nb2 = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.26, 0.024, 0.2)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#FFF8EB', roughness: 0.85 })),
    );
    nb2.position.set(0.36, 0.71, -0.2);
    nb2.rotation.y = -0.12;
    const pencil = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.007, 0.007, 0.18, 6)), pencilMat);
    pencil.rotation.z = Math.PI / 2;
    pencil.rotation.y = 0.35;
    pencil.position.set(-0.1, 0.705, -0.18);
    g.add(nb1, nb2, pencil);

    // Small rural cloth school bag resting neatly beside desk leg
    const bagMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: bagColors[colorIdx % bagColors.length],
        roughness: 0.86,
      }),
    );
    const bagSide = colorIdx % 2 === 0 ? -0.92 : 0.92;
    const bag = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.32, 0.26)), bagMat);
    bag.position.set(bagSide, 0.16, -0.18);
    bag.rotation.z = colorIdx % 2 === 0 ? 0.14 : -0.14;
    bag.castShadow = true;
    g.add(bag);

    collisionWorld.addCenterCollider(id, x, plinthH + 0.4, z + 0.02, 1.78, 0.85, 1.05, false);
  };

  buildStudentBenchDesk('desk-1', -7.6, -5.6, 0);
  buildStudentBenchDesk('desk-2', -3.0, -5.6, 1);
  buildStudentBenchDesk('desk-3', -7.6, -3.5, 2);
  buildStudentBenchDesk('desk-4', -3.0, -3.5, 3);

  // ============================================================================
  // 5. SEPARATE PHYSICAL GARAD GRANTHALAY BUILDING (EAST OF MAIN STREET)
  //    Interior: X ∈ [13.0, 22.5], Z ∈ [12.5, 22.5] · West Veranda: X ∈ [10.4, 13.0]
  // ============================================================================
  const libPlinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(12.4, plinthH, 10.6)),
    stoneFloorMat,
  );
  libPlinth.position.set(16.6, plinthH * 0.5, 17.5);
  libPlinth.receiveShadow = true;
  group.add(libPlinth);

  // Warm wooden reading-room floor inside Garad Granthalay (matched to 'wood' footstep surface!)
  const libWoodFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#8C5D36',
      map: textures.teakWood,
      roughness: 0.76,
    }),
  );
  const libWoodFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(9.4, 0.03, 9.9)),
    libWoodFloorMat,
  );
  libWoodFloor.position.set(17.75, plinthH + 0.015, 17.5);
  libWoodFloor.receiveShadow = true;
  group.add(libWoodFloor);

  // West stone veranda steps leading smoothly up from Main Street stone crossing (X ∈ [9.3, 10.4])
  const libStep1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.24, 9.8)), stoneFloorMat);
  libStep1.position.set(10.12, 0.12, 17.5);
  libStep1.receiveShadow = true;
  group.add(libStep1);

  const libStep2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.12, 9.8)), stoneFloorMat);
  libStep2.position.set(9.64, 0.06, 17.5);
  libStep2.receiveShadow = true;
  group.add(libStep2);

  // Garad Granthalay structural walls with deep rural forest-teal lower dado
  addWall('wall-lib-north', 17.75, 12.5, 9.84, wallThick, wallH, plinthH, true);
  addWall('wall-lib-south', 17.75, 22.5, 9.84, wallThick, wallH, plinthH, true);
  addWall('wall-lib-east', 22.5, 17.5, wallThick, 10.34, wallH, plinthH, true);
  // West entrance wall (X = 13.0) with 1.8m Library Doorway: Z ∈ [16.6, 18.4]
  addWall('wall-lib-west-n', 13.0, 14.55, wallThick, 4.1, wallH, plinthH, true);
  addWall('wall-lib-west-s', 13.0, 20.45, wallThick, 4.1, wallH, plinthH, true);
  addWall('wall-door-lib-lintel', 13.0, 17.5, wallThick, 1.8, 1.15, plinthH + 2.7, true);

  // Sunlit louvered windows for Garad Granthalay
  addWindowFrame(13.0, plinthH + 1.85, 14.6, -Math.PI / 2);
  addWindowFrame(13.0, plinthH + 1.85, 20.4, -Math.PI / 2);
  addWindowFrame(17.75, plinthH + 1.85, 22.5, 0);

  // Pitched Mangalore terracotta roof oriented with North-South ridge over Garad Granthalay
  const libRoofLen = 12.2;
  const libRoofEast = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.6, 0.2, libRoofLen)), roofMat);
  libRoofEast.position.set(20.1, wallTopY + 1.08, 17.5);
  libRoofEast.rotation.z = -0.34;
  libRoofEast.castShadow = true;
  group.add(libRoofEast);

  const libRoofWest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.6, 0.2, libRoofLen)), roofMat);
  libRoofWest.position.set(13.6, wallTopY + 0.72, 17.5);
  libRoofWest.rotation.z = 0.34;
  libRoofWest.castShadow = true;
  group.add(libRoofWest);

  const libRidge = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.17, 0.17, libRoofLen + 0.3, 10)),
    roofMat,
  );
  libRidge.rotation.x = Math.PI / 2;
  libRidge.position.set(17.2, wallTopY + 2.22, 17.5);
  group.add(libRidge);

  const libGableShape = new THREE.Shape();
  libGableShape.moveTo(-6.2, 0);
  libGableShape.lineTo(5.6, 0);
  libGableShape.lineTo(-0.3, 2.26);
  libGableShape.closePath();
  const libGableGeo = trackGeo(
    new THREE.ExtrudeGeometry(libGableShape, { depth: 0.3, bevelEnabled: false }),
  );
  const libGableNorth = new THREE.Mesh(libGableGeo, interiorWallMat);
  libGableNorth.position.set(17.5, wallTopY - 0.05, 12.35);
  const libGableSouth = new THREE.Mesh(libGableGeo, interiorWallMat);
  libGableSouth.position.set(17.5, wallTopY - 0.05, 22.35);
  group.add(libGableNorth, libGableSouth);

  // West Veranda teak pillars facing Main Street (X = 10.62)
  const libPillarZs = [12.8, 15.6, 19.4, 22.2];
  for (let i = 0; i < libPillarZs.length; i++) {
    const pz = libPillarZs[i];
    const base = new THREE.Mesh(pillarBaseGeo, stoneFloorMat);
    base.position.set(10.62, plinthH + 0.11, pz);
    group.add(base);

    const post = new THREE.Mesh(pillarGeo, woodMat);
    post.position.set(10.62, plinthH + 1.85, pz);
    post.castShadow = true;
    group.add(post);

    collisionWorld.addCenterCollider(`lib-pillar-${i}`, 10.62, plinthH + 1.8, pz, 0.36, 3.5, 0.36, false);
  }

  const libVerandaBeam = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.26, 0.24, 10.4)),
    darkWoodMat,
  );
  libVerandaBeam.position.set(10.62, plinthH + 3.45, 17.5);
  group.add(libVerandaBeam);

  // Clean physical signboard facing Main Street: "GARAD GRANTHALAY"
  const granthalaySignTex = trackTex(createGranthalaySignTexture());
  const granthalaySignMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: granthalaySignTex,
      roughness: 0.66,
    }),
  );
  const granthalaySignFrame = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.14, 1.12, 4.95)),
    darkWoodMat,
  );
  granthalaySignFrame.position.set(10.46, plinthH + 3.84, 17.5);
  granthalaySignFrame.castShadow = true;
  group.add(granthalaySignFrame);

  const granthalaySignFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(4.76, 0.98)),
    granthalaySignMat,
  );
  granthalaySignFace.rotation.y = -Math.PI / 2;
  granthalaySignFace.position.set(10.38, plinthH + 3.84, 17.5);
  group.add(granthalaySignFace);

  // Interior Library Wall Banner mounted above the East bookshelves
  const libBannerTex = trackTex(createLibraryBannerTexture());
  const libBannerMat = trackMat(
    new THREE.MeshStandardMaterial({ map: libBannerTex, roughness: 0.68 }),
  );
  const libBanner = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.4, 0.78)), libBannerMat);
  libBanner.rotation.y = -Math.PI / 2;
  libBanner.position.set(22.26, plinthH + 2.98, 17.5);
  group.add(libBanner);

  // Colourful book palette for library shelves
  const spineColors = [
    '#C84E28',
    '#1F5D82',
    '#287C69',
    '#E0A033',
    '#7B4B8A',
    '#B5434F',
    '#3B7A4A',
    '#5B4736',
  ];
  const spineMats = spineColors.map((hex) =>
    trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.72 })),
  );
  const shelfBookGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.25, 0.19));

  const buildBookshelf = (
    id: string,
    x: number,
    z: number,
    rotY: number,
    featuredBookId: LivingBookId,
    width = 2.2,
    height = 2.05,
  ) => {
    const sg = new THREE.Group();
    sg.position.set(x, plinthH, z);
    sg.rotation.y = rotY;
    group.add(sg);

    // Back & side wooden frame
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width, height, 0.06)), darkWoodMat);
    back.position.set(0, height * 0.5, -0.18);
    sg.add(back);

    const sideGeo = trackGeo(new THREE.BoxGeometry(0.07, height, 0.42));
    const lSide = new THREE.Mesh(sideGeo, woodMat);
    lSide.position.set(-width * 0.5 + 0.035, height * 0.5, 0);
    const rSide = new THREE.Mesh(sideGeo, woodMat);
    rSide.position.set(width * 0.5 - 0.035, height * 0.5, 0);
    sg.add(lSide, rSide);

    const shelfGeo = trackGeo(new THREE.BoxGeometry(width, 0.055, 0.42));
    const shelfLevels = [0.08, 0.54, 1.0, 1.54, 2.02];
    for (let s = 0; s < shelfLevels.length; s++) {
      const plank = new THREE.Mesh(shelfGeo, woodMat);
      plank.position.set(0, shelfLevels[s], 0);
      plank.castShadow = true;
      sg.add(plank);

      // Populate colourful individual 3D books on inner 4 shelves,
      // leaving a dedicated center showcase bay on eye-level shelf (s === 2) for the physical Project Book!
      if (s < shelfLevels.length - 1) {
        const startX = -width * 0.5 + 0.14;
        const endX = width * 0.5 - 0.14;
        let bx = startX;
        let idx = s * 7 + Math.round(Math.abs(x * 3));
        while (bx < endX) {
          const inFeaturedBay = s === 2 && Math.abs(bx) < 0.34;
          if (!inFeaturedBay && idx % 9 !== 0) {
            const hScale = 0.84 + ((idx * 13) % 5) * 0.07;
            const b = new THREE.Mesh(shelfBookGeo, spineMats[idx % spineMats.length]);
            b.scale.set(1, hScale, 1);
            b.position.set(bx, shelfLevels[s] + 0.03 + 0.125 * hScale, 0.02);
            b.rotation.z = idx % 11 === 0 ? 0.12 : 0;
            sg.add(b);
          }
          bx += 0.068;
          idx++;
        }
      }
    }

    // Place the featured physical Project Book upright & front-facing right on the eye-level shelf bay!
    const project = PROJECT_CONTENT_BY_ID[featuredBookId];
    const coverTex = trackTex(createProjectBookCoverTexture(project));
    const coverFrontMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: coverTex,
        roughness: 0.52,
      }),
    );
    const coverBodyMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: project.coverColor,
        roughness: 0.62,
      }),
    );
    const pageEdgeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#F7EBD3',
        roughness: 0.85,
      }),
    );
    const brassEaselMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: project.accentColor,
        roughness: 0.42,
        metalness: 0.28,
      }),
    );

    // Small angled display cradle on the shelf plank
    const cradle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.03, 0.24)), brassEaselMat);
    cradle.position.set(0, shelfLevels[2] + 0.045, 0.05);
    sg.add(cradle);

    const bookPivot = new THREE.Group();
    const basePos = new THREE.Vector3(0, shelfLevels[2] + 0.27, 0.06);
    bookPivot.position.copy(basePos);
    bookPivot.rotation.x = -0.18; // Slightly tilted upward for crisp cover legibility on shelf
    sg.add(bookPivot);

    // Physical 3D hardcover book body + readable front cover plate + cream page edges
    const bookBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.32, 0.43, 0.055)),
      [pageEdgeMat, coverBodyMat, pageEdgeMat, pageEdgeMat, coverFrontMat, coverBodyMat],
    );
    bookBody.castShadow = true;
    bookPivot.add(bookBody);

    shelfBookProps.set(featuredBookId, {
      bookId: featuredBookId,
      pivot: bookPivot,
      basePos,
      baseScale: 1,
      pickedAmount: 0,
    });

    // Compute world-space interaction position slightly in front of this bookshelf bay
    const forward = new THREE.Vector3(0, 0, 1.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const interactPos = new THREE.Vector3(x + forward.x, plinthH + 0.12, z + forward.z);

    interactions.register({
      id: `book-${featuredBookId}`,
      kind: 'book',
      bookId: featuredBookId,
      position: interactPos,
      radius: 2.3,
      discoverable: true,
      getPrompt: () => ({
        id: `book-${featuredBookId}`,
        kind: 'book',
        bookId: featuredBookId,
        label: `${project.bookNumber}: “${project.title}”`,
        actionVerb: 'Pick Up Book',
        subtitle: project.subtitle,
      }),
      onInteract: () => {
        callbacks.onOpenLivingBook(featuredBookId);
        return null;
      },
    });

    const rotated = Math.abs(Math.sin(rotY)) > 0.5;
    collisionWorld.addCenterCollider(
      id,
      x,
      plinthH + height * 0.5,
      z,
      rotated ? 0.54 : width + 0.1,
      height,
      rotated ? width + 0.1 : 0.54,
      true,
    );
  };

  // All 5 Physical Project Books placed distinctly on the 5 Bookshelves inside Garad Granthalay!
  buildBookshelf('shelf-east-1', 21.96, 14.6, -Math.PI / 2, 'mission-bharari', 2.35, 2.05);
  buildBookshelf('shelf-east-2', 21.96, 17.5, -Math.PI / 2, 'abhivyakta', 2.35, 2.05);
  buildBookshelf('shelf-east-3', 21.96, 20.4, -Math.PI / 2, 'garad-granthalay', 2.35, 2.05);
  buildBookshelf('shelf-north-1', 15.7, 13.02, 0, 'rainy-day-of-dreams', 2.25, 2.05);
  buildBookshelf('shelf-north-2', 19.0, 13.02, 0, 'young-voices', 2.25, 2.05);

  // Two Library Reading Tables with chairs & quiet study books
  const buildReadingTable = (id: string, x: number, z: number) => {
    const tg = new THREE.Group();
    tg.position.set(x, plinthH, z);
    group.add(tg);

    const top = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.08, 1.05)), woodMat);
    top.position.set(0, 0.72, 0);
    top.castShadow = true;
    top.receiveShadow = true;
    tg.add(top);

    const legGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.72, 0.08));
    for (const lx of [-0.94, 0.94]) {
      for (const lz of [-0.42, 0.42]) {
        const leg = new THREE.Mesh(legGeo, darkWoodMat);
        leg.position.set(lx, 0.36, lz);
        tg.add(leg);
      }
    }

    // Two stools beside reading table
    const stoolTopGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.05, 0.42));
    const stoolLegGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.42, 0.32));
    for (const sz of [-0.74, 0.74]) {
      const sTop = new THREE.Mesh(stoolTopGeo, woodMat);
      sTop.position.set(-0.45, 0.44, sz);
      const sBase = new THREE.Mesh(stoolLegGeo, darkWoodMat);
      sBase.position.set(-0.45, 0.21, sz);
      tg.add(sTop, sBase);
    }

    // Open study book & stacked notebooks on reading table
    const openPad = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.38, 0.025, 0.26)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#FAF2DF', roughness: 0.85 })),
    );
    openPad.position.set(-0.42, 0.775, 0.1);
    openPad.rotation.y = 0.1;
    const stackBook = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.28, 0.045, 0.22)),
      spineMats[1],
    );
    stackBook.position.set(0.46, 0.78, -0.14);
    stackBook.rotation.y = -0.22;
    tg.add(openPad, stackBook);

    collisionWorld.addCenterCollider(id, x, plinthH + 0.45, z, 2.22, 0.9, 1.25, false);
  };

  buildReadingTable('lib-table-north', 17.2, 15.8);
  buildReadingTable('lib-table-south', 17.2, 19.3);

  // ============================================================================
  // 6. SCHOOL COURTYARD: NEEM TREE, FLAGPOLE & VILLAGE ENTRANCE TRAIL POST
  // ============================================================================
  // Subtle wooden trail signpost south of the village entrance leading back to Central Hub
  const trailPostGroup = new THREE.Group();
  trailPostGroup.position.set(-3.1, 0, 55.6);
  trailPostGroup.rotation.y = 0.25;
  group.add(trailPostGroup);

  const trailPost = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 2.15, 8)), darkWoodMat);
  trailPost.position.y = 1.075;
  trailPost.castShadow = true;
  trailPostGroup.add(trailPost);

  const trailSignTex = trackTex(createTrailSignpostTexture());
  const trailSignMat = trackMat(new THREE.MeshStandardMaterial({ map: trailSignTex, roughness: 0.72 }));
  const trailBoard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.55, 0.38, 0.08)), trailSignMat);
  trailBoard.position.set(0.18, 1.82, 0);
  trailBoard.castShadow = true;
  trailPostGroup.add(trailBoard);

  interactions.register({
    id: 'exit-village-gate',
    kind: 'exit',
    position: new THREE.Vector3(-3.1, 0.15, 55.6),
    radius: 2.6,
    discoverable: false,
    getPrompt: () => ({
      id: 'exit-village-gate',
      kind: 'exit',
      label: 'Central Hub',
      actionVerb: 'Return',
    }),
    onInteract: () => {
      callbacks.onExitToVillage();
      return null;
    },
  });

  // Reusable stylized Indian shade tree (Neem / Banyan / Mango) with wind-swaying leaf clusters
  const addCampusTree = (
    id: string,
    x: number,
    z: number,
    scale: number,
    addCollider: boolean,
    withStoneBench = false,
  ) => {
    const tg = new THREE.Group();
    tg.position.set(x, 0, z);
    group.add(tg);

    const trunk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24 * scale, 0.38 * scale, 3.2 * scale, 10)),
      barkMat,
    );
    trunk.position.y = 1.6 * scale;
    trunk.castShadow = true;
    tg.add(trunk);

    const branchGeo = trackGeo(new THREE.CylinderGeometry(0.09 * scale, 0.16 * scale, 1.8 * scale, 8));
    for (let b = 0; b < 3; b++) {
      const ang = (b / 3) * Math.PI * 2 + 0.4;
      const br = new THREE.Mesh(branchGeo, barkMat);
      br.position.set(Math.cos(ang) * 0.55 * scale, 2.85 * scale, Math.sin(ang) * 0.55 * scale);
      br.rotation.z = -Math.cos(ang) * 0.62;
      br.rotation.x = Math.sin(ang) * 0.62;
      tg.add(br);
    }

    const clusterOffsets: Array<[number, number, number, number, boolean]> = [
      [0, 4.15, 0, 1.55, false],
      [-1.15, 3.65, 0.65, 1.18, true],
      [1.18, 3.7, 0.5, 1.2, false],
      [0.2, 3.6, -1.15, 1.22, true],
      [-0.85, 3.75, -0.85, 1.05, false],
      [0.85, 4.55, -0.2, 1.02, true],
    ];
    const leafGeo = trackGeo(new THREE.IcosahedronGeometry(1, 1));
    for (const [lx, ly, lz, lr, alt] of clusterOffsets) {
      const puff = new THREE.Mesh(leafGeo, alt ? foliageMat2 : foliageMat1);
      puff.position.set(lx * scale, ly * scale, lz * scale);
      puff.scale.set(lr * scale, lr * 0.78 * scale, lr * scale);
      puff.castShadow = true;
      tg.add(puff);
    }

    if (withStoneBench) {
      const benchRing = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.45, 1.52, 0.48, 16)),
        stoneFloorMat,
      );
      benchRing.position.y = 0.24;
      benchRing.receiveShadow = true;
      tg.add(benchRing);
      if (addCollider) {
        collisionWorld.addCenterCollider(id, x, 0.8, z, 3.0, 2.6, 3.0, false);
      }
    } else if (addCollider) {
      collisionWorld.addCenterCollider(id, x, 1.4, z, 0.9 * scale, 3.0, 0.9 * scale, false);
    }
  };

  // Iconic Courtyard Neem Tree with circular stone bench (East School Courtyard)
  addCampusTree('tree-courtyard-neem', 5.2, 7.6, 1.15, true, true);
  // Shade trees framing School, West Playground & Garad Granthalay
  addCampusTree('tree-school-nw', -12.6, -7.8, 1.25, true, false);
  addCampusTree('tree-school-ne', 5.6, -7.5, 1.2, true, false);
  addCampusTree('tree-play-sw', -28.8, 10.6, 1.22, true, false);
  addCampusTree('tree-play-nw', -28.6, -6.4, 1.25, true, false);
  addCampusTree('tree-lib-se', 24.4, 24.8, 1.28, false, false);
  addCampusTree('tree-lib-ne', 24.2, 10.4, 1.32, false, false);
  // Background scenic trees behind the school
  addCampusTree('tree-bg-1', -20, -16, 1.45, false);
  addCampusTree('tree-bg-2', -4, -18, 1.35, false);
  addCampusTree('tree-bg-3', 14, -15, 1.5, false);
  addCampusTree('tree-bg-4', 28, 2, 1.38, false);

  // Courtyard School Flagpole with wind-fluttering pennant
  const flagPedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.62, 0.78, 0.42, 12)),
    stoneFloorMat,
  );
  flagPedestal.position.set(-9.4, 0.21, 7.2);
  group.add(flagPedestal);

  const flagPole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.045, 0.06, 5.2, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#EAE6DC', roughness: 0.45, metalness: 0.35 })),
  );
  flagPole.position.set(-9.4, 2.8, 7.2);
  flagPole.castShadow = true;
  group.add(flagPole);

  const pennantMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D86C2B',
      roughness: 0.74,
      side: THREE.DoubleSide,
    }),
  );
  wind.applyWindShader(pennantMat, {
    swayAmp: 0.15,
    flutterAmp: 0.06,
    heightMin: -0.35,
    heightRange: 0.7,
    cacheKey: 'school-pennant',
  });
  const pennant = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.15, 0.62, 8, 2)), pennantMat);
  pennant.position.set(-8.82, 4.98, 7.2);
  group.add(pennant);
  collisionWorld.addCenterCollider('flagpole', -9.4, 1.2, 7.2, 1.45, 2.4, 1.45, false);

  // ============================================================================
  // 7. WEST OUTDOOR PLAYGROUND (X ∈ [-28.4, -12.8], Z ∈ [-5.3, 10.3])
  // ============================================================================
  const goalPostMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#F5F2EB', roughness: 0.52 }),
  );
  const goalGroup = new THREE.Group();
  goalGroup.position.set(-26.4, 0, 2.5);
  goalGroup.rotation.y = Math.PI;
  group.add(goalGroup);

  const postGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 2.1, 8));
  const p1 = new THREE.Mesh(postGeo, goalPostMat);
  p1.position.set(0, 1.05, -1.65);
  const p2 = new THREE.Mesh(postGeo, goalPostMat);
  p2.position.set(0, 1.05, 1.65);
  const crossbar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 3.4, 8)),
    goalPostMat,
  );
  crossbar.rotation.x = Math.PI / 2;
  crossbar.position.set(0, 2.1, 0);
  const netMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#F3EFE6',
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      wireframe: true,
    }),
  );
  const backNet = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.3, 2.1, 10, 6)), netMat);
  backNet.rotation.y = Math.PI / 2;
  backNet.position.set(0.95, 1.05, 0);
  goalGroup.add(p1, p2, crossbar, backNet);
  collisionWorld.addCenterCollider('goalpost', -26.8, 1.1, 2.5, 1.2, 2.2, 3.5, false);

  // Football on the play field (animated gently by playing children!)
  const football = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.18, 12, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#F9F7F2', roughness: 0.55 })),
  );
  football.position.set(-20.2, 0.18, 2.5);
  football.castShadow = true;
  group.add(football);

  // Rural wooden cricket stumps & bat on North-East Playground
  const stumpGeo = trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 6));
  for (let s = -1; s <= 1; s++) {
    const stump = new THREE.Mesh(stumpGeo, woodMat);
    stump.position.set(-16.4, 0.36, -2.4 + s * 0.11);
    group.add(stump);
  }
  const bat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.72, 0.04)), woodMat);
  bat.position.set(-15.9, 0.35, -2.75);
  bat.rotation.z = 0.25;
  group.add(bat);

  // Chalk Hopscotch Grid on South Playground
  const hopColors = ['#F7E9B8', '#E9F4D8', '#F8DFCC', '#DCEEF8'];
  for (let i = 0; i < 6; i++) {
    const sq = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.72, 0.72)),
      trackMat(new THREE.MeshBasicMaterial({ color: hopColors[i % hopColors.length], transparent: true, opacity: 0.65 })),
    );
    sq.rotation.x = -Math.PI / 2;
    sq.position.set(-22.4 + i * 0.78, 0.02, 7.2 + (i % 2 === 0 ? 0 : 0.38));
    group.add(sq);
  }

  // Playground wooden benches under shade
  const addPlaygroundBench = (id: string, x: number, z: number, rotY = 0) => {
    const bg = new THREE.Group();
    bg.position.set(x, 0, z);
    bg.rotation.y = rotY;
    group.add(bg);
    const seat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.08, 0.5)), woodMat);
    seat.position.y = 0.48;
    seat.castShadow = true;
    const back = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.42, 0.07)), woodMat);
    back.position.set(0, 0.78, -0.22);
    const leg1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.48, 0.44)), darkWoodMat);
    leg1.position.set(-0.78, 0.24, 0);
    const leg2 = leg1.clone();
    leg2.position.x = 0.78;
    bg.add(seat, back, leg1, leg2);
    collisionWorld.addCenterCollider(id, x, 0.45, z, 1.95, 0.9, 0.65, false);
  };
  addPlaygroundBench('bench-play-1', -14.6, 8.9, Math.PI - 0.24);
  addPlaygroundBench('bench-play-2', -24.6, 8.9, Math.PI + 0.24);

  // Interactive Playground Sports Corner discovery
  interactions.register({
    id: 'playground-sports',
    kind: 'sports',
    position: new THREE.Vector3(-20.2, 0.14, 2.5),
    radius: 2.6,
    discoverable: true,
    getPrompt: () => ({
      id: 'playground-sports',
      kind: 'sports',
      label: 'School Playground',
      actionVerb: 'Explore',
      subtitle: 'Outdoor games & youth sports',
    }),
    onInteract: (): SchoolDiscoveryToast => ({
      id: 'playground-sports',
      title: 'School Playground — Youth & Sports',
      subtitle: 'Teamwork, Health & Joyful Play',
      body: 'Open village grounds nurture friendship, agility, and leadership through football, cricket, hopscotch, and community sports mornings.',
      timestamp: Date.now(),
    }),
  });

  // ============================================================================
  // 8. ANIMATED SCHOOL CHARACTERS (TEACHER, CLASSROOM STUDENTS, READERS, PLAYGROUND KIDS)
  // ============================================================================
  const npcSkinMat = trackMat(new THREE.MeshStandardMaterial({ color: '#C6875B', roughness: 0.72 }));
  const npcHairMat = trackMat(new THREE.MeshStandardMaterial({ color: '#211814', roughness: 0.88 }));
  const uniformShirtMat = trackMat(new THREE.MeshStandardMaterial({ color: '#D6EBFA', roughness: 0.84 }));
  const uniformNavyMat = trackMat(new THREE.MeshStandardMaterial({ color: '#243C5E', roughness: 0.86 }));
  const teacherSareeMat = trackMat(new THREE.MeshStandardMaterial({ color: '#B9492C', roughness: 0.78 }));
  const teacherAccentMat = trackMat(new THREE.MeshStandardMaterial({ color: '#E8A53A', roughness: 0.76 }));

  const addCampusNpc = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    kind: CampusNpc['kind'],
    seated: boolean,
    scale = 1.0,
    shirtHex?: string,
  ) => {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotY;
    root.scale.setScalar(scale);
    group.add(root);

    const isTeacher = kind === 'teacher';
    const topMat = isTeacher
      ? teacherSareeMat
      : shirtHex
        ? trackMat(new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.84 }))
        : uniformShirtMat;
    const bottomMat = isTeacher ? teacherAccentMat : uniformNavyMat;

    // Lower body (standing or seated)
    if (seated) {
      const seatBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.22, 0.28)), bottomMat);
      seatBlock.position.set(0, 0.45, 0.04);
      root.add(seatBlock);
      const shinGeo = trackGeo(new THREE.CapsuleGeometry(0.042, 0.22, 4, 8));
      const lShin = new THREE.Mesh(shinGeo, npcSkinMat);
      lShin.position.set(-0.08, 0.22, 0.16);
      const rShin = new THREE.Mesh(shinGeo, npcSkinMat);
      rShin.position.set(0.08, 0.22, 0.16);
      root.add(lShin, rShin);
    } else if (isTeacher) {
      const sareeDrape = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.14, 0.22, 0.86, 12)),
        teacherSareeMat,
      );
      sareeDrape.position.y = 0.44;
      sareeDrape.castShadow = true;
      root.add(sareeDrape);
    } else {
      const legGeo = trackGeo(new THREE.CapsuleGeometry(0.048, 0.34, 4, 8));
      const lLeg = new THREE.Mesh(legGeo, bottomMat);
      lLeg.position.set(-0.075, 0.28, 0);
      const rLeg = new THREE.Mesh(legGeo, bottomMat);
      rLeg.position.set(0.075, 0.28, 0);
      root.add(lLeg, rLeg);
    }

    const torsoY = seated ? 0.74 : isTeacher ? 1.06 : 0.76;
    const torso = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(isTeacher ? 0.15 : 0.125, isTeacher ? 0.32 : 0.22, 6, 10)),
      topMat,
    );
    torso.position.y = torsoY;
    torso.castShadow = true;
    root.add(torso);

    const head = new THREE.Group();
    head.position.set(0, torsoY + (isTeacher ? 0.32 : 0.24), 0);
    root.add(head);

    const headSphere = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(isTeacher ? 0.145 : 0.135, 12, 10)),
      npcSkinMat,
    );
    headSphere.position.y = 0.11;
    headSphere.castShadow = true;
    head.add(headSphere);

    const hairCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(isTeacher ? 0.152 : 0.142, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62)),
      npcHairMat,
    );
    hairCap.position.set(0, 0.12, -0.02);
    head.add(hairCap);

    const armGeo = trackGeo(new THREE.CapsuleGeometry(0.036, isTeacher ? 0.28 : 0.22, 4, 8));
    const leftArm = new THREE.Group();
    leftArm.position.set(isTeacher ? -0.18 : -0.155, torsoY + 0.12, 0);
    const lArmMesh = new THREE.Mesh(armGeo, npcSkinMat);
    lArmMesh.position.y = -0.12;
    leftArm.add(lArmMesh);
    root.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(isTeacher ? 0.18 : 0.155, torsoY + 0.12, 0);
    const rArmMesh = new THREE.Mesh(armGeo, npcSkinMat);
    rArmMesh.position.y = -0.12;
    rightArm.add(rArmMesh);
    root.add(rightArm);

    npcs.push({
      root,
      head,
      leftArm,
      rightArm,
      kind,
      phase: npcs.length * 1.37,
      baseY: y,
    });
  };

  // Classroom: 1 Teacher explaining at blackboard + 5 Students with distinct activities
  addCampusNpc(-5.4, plinthH, -7.7, 0.18, 'teacher', false, 1.05);
  addCampusNpc(-8.0, plinthH, -5.28, Math.PI, 'student-write', true, 0.94);
  addCampusNpc(-7.15, plinthH, -5.28, Math.PI, 'student-hand', true, 0.92);
  addCampusNpc(-3.4, plinthH, -5.28, Math.PI, 'student-read', true, 0.95);
  addCampusNpc(-7.6, plinthH, -3.18, Math.PI, 'student-talk', true, 0.92);
  addCampusNpc(-2.7, plinthH, -3.18, Math.PI, 'student-write', true, 0.93);

  // Separate Garad Granthalay Building: 3 Children reading & browsing bookshelves
  addCampusNpc(16.75, plinthH, 15.05, 0, 'student-read', true, 0.95, '#F2D28B');
  addCampusNpc(17.65, plinthH, 20.05, Math.PI, 'student-read', true, 0.94, '#F5B590');
  addCampusNpc(20.95, plinthH, 17.5, Math.PI * 0.5, 'reader-browse', false, 0.96, '#C8E4C0');

  // West Outdoor Playground: 4 Children playing football, hopscotch & chatting
  addCampusNpc(-18.6, 0, 2.3, -Math.PI * 0.5, 'play-kick', false, 0.98, '#F4A259');
  addCampusNpc(-21.9, 0, 2.7, Math.PI * 0.5, 'play-kick', false, 0.96, '#76B89A');
  addCampusNpc(-20.4, 0, 7.3, Math.PI * 0.5, 'play-hop', false, 0.92, '#E97D64');
  addCampusNpc(-15.5, 0, 7.8, -0.7, 'play-chat', false, 0.95, '#EED17C');

  // ============================================================================
  // 9. BHARARI COMPANION PERCHES ACROSS MAIN STREET, SCHOOL, LIBRARY & PLAYGROUND
  // ============================================================================
  perches.push(
    ...mainStreet.perches,
    { id: 'perch-courtyard-1', zone: 'courtyard', position: new THREE.Vector3(-3.6, plinthH + 2.55, 1.82) },
    { id: 'perch-courtyard-neem', zone: 'courtyard', position: new THREE.Vector3(4.0, 0.52, 7.6) },
    { id: 'perch-veranda-w', zone: 'veranda', position: new THREE.Vector3(-7.2, plinthH + 2.5, 1.82) },
    { id: 'perch-veranda-e', zone: 'veranda', position: new THREE.Vector3(-0.4, plinthH + 2.5, 1.82) },
    { id: 'perch-classroom-1', zone: 'classroom', position: new THREE.Vector3(-2.1, plinthH + 0.85, -7.3) },
    { id: 'perch-classroom-2', zone: 'classroom', position: new THREE.Vector3(-8.3, plinthH + 1.25, -1.25) },
    { id: 'perch-library-veranda', zone: 'library', position: new THREE.Vector3(10.62, plinthH + 2.5, 15.6) },
    { id: 'perch-library-1', zone: 'library', position: new THREE.Vector3(21.7, plinthH + 2.08, 17.5) },
    { id: 'perch-library-2', zone: 'library', position: new THREE.Vector3(15.7, plinthH + 2.08, 13.2) },
    { id: 'perch-playground-1', zone: 'playground', position: new THREE.Vector3(-14.6, 0.98, 8.9) },
    { id: 'perch-playground-2', zone: 'playground', position: new THREE.Vector3(-26.4, 2.15, 2.5) },
  );

  const setBookPickedUp = (bookId: LivingBookId | null) => {
    pickedUpBookId = bookId;
  };

  // ============================================================================
  // UPDATE LOOP (ZERO ALLOCATIONS)
  // ============================================================================
  const update = (delta: number, elapsed: number, nightWeight: number) => {
    const dt = Math.min(delta, 0.05);

    // Animate rural village street wildlife, trees & swaying branches
    mainStreet.update(dt, elapsed, nightWeight);

    // Live classroom wall clock hands
    wallClock.update(elapsed);

    // Smoothly lift/return physical project books on the library shelves when picked up or closed
    shelfBookProps.forEach((prop) => {
      const target = pickedUpBookId === prop.bookId ? 1 : 0;
      prop.pickedAmount = THREE.MathUtils.damp(prop.pickedAmount, target, 10, dt);
      prop.pivot.position.y = prop.basePos.y + prop.pickedAmount * 0.24;
      prop.pivot.position.z = prop.basePos.z + prop.pickedAmount * 0.22;
      const s = 1 - prop.pickedAmount * 0.92;
      prop.pivot.scale.setScalar(s);
      prop.pivot.visible = prop.pickedAmount < 0.96;
    });

    // Smoothly swing doors toward open/closed angle
    for (let i = 0; i < doors.length; i++) {
      const d = doors[i];
      const target = d.isOpen ? d.openAngle : 0;
      d.currentAngle = THREE.MathUtils.damp(d.currentAngle, target, 7.5, dt);
      d.pivot.rotation.y = d.currentAngle;
    }

    // Warm interior school & library lamps adapt to Day / Sunset / Night
    const lampIntensity = 0.78 + nightWeight * 1.85;
    for (let i = 0; i < warmLights.length; i++) {
      warmLights[i].intensity = lampIntensity;
    }

    // Gentle playground football roll between the two playing children on the West Playground
    const ballWave = Math.sin(elapsed * 1.45);
    football.position.x = -20.2 + ballWave * 1.1;
    football.rotation.z = -ballWave * 4.5;

    // Animate Teacher, Students, Readers & Playground Children with varied natural poses
    for (let i = 0; i < npcs.length; i++) {
      const n = npcs[i];
      const t = elapsed + n.phase;

      switch (n.kind) {
        case 'teacher':
          n.head.rotation.y = Math.sin(t * 0.9) * 0.34;
          n.rightArm.rotation.x = -0.85 + Math.sin(t * 2.2) * 0.25;
          n.leftArm.rotation.x = -0.35 + Math.cos(t * 1.6) * 0.14;
          break;
        case 'student-write':
          n.head.rotation.x = 0.24 + Math.sin(t * 1.8) * 0.05;
          n.rightArm.rotation.x = -0.78 + Math.sin(t * 5.2) * 0.1;
          n.leftArm.rotation.x = -0.58;
          break;
        case 'student-hand': {
          const raise = Math.sin(t * 0.85) > -0.15 ? 1 : 0;
          const targetRaise = raise ? -2.45 + Math.sin(t * 4.2) * 0.08 : -0.55;
          n.rightArm.rotation.x = THREE.MathUtils.damp(n.rightArm.rotation.x, targetRaise, 6, dt);
          n.head.rotation.y = Math.sin(t * 1.1) * 0.18;
          break;
        }
        case 'student-read':
          n.head.rotation.x = 0.22;
          n.head.rotation.y = Math.sin(t * 1.3) * 0.14;
          n.leftArm.rotation.x = -0.68;
          n.rightArm.rotation.x = -0.68;
          break;
        case 'student-talk':
          n.head.rotation.y = Math.sin(t * 1.7) * 0.32;
          n.rightArm.rotation.x = -0.45 + Math.sin(t * 2.4) * 0.16;
          break;
        case 'reader-browse':
          n.head.rotation.y = Math.sin(t * 0.8) * 0.35;
          n.head.rotation.x = Math.sin(t * 0.6) * 0.16;
          n.rightArm.rotation.x = -0.95 + Math.sin(t * 1.1) * 0.2;
          break;
        case 'play-kick':
          n.root.position.y = n.baseY + Math.abs(Math.sin(t * 3.1)) * 0.08;
          n.leftArm.rotation.x = Math.sin(t * 3.1) * 0.45;
          n.rightArm.rotation.x = -Math.sin(t * 3.1) * 0.45;
          n.head.rotation.y = Math.sin(t * 1.5) * 0.25;
          break;
        case 'play-hop':
          n.root.position.y = n.baseY + Math.abs(Math.sin(t * 4.2)) * 0.26;
          n.leftArm.rotation.z = 0.42 + Math.sin(t * 4.2) * 0.18;
          n.rightArm.rotation.z = -0.42 - Math.sin(t * 4.2) * 0.18;
          break;
        case 'play-chat':
          n.head.rotation.y = Math.sin(t * 1.4) * 0.28;
          n.leftArm.rotation.x = -0.25 + Math.sin(t * 2.1) * 0.14;
          break;
      }
    }
  };

  const dispose = () => {
    mainStreet.dispose();
    learningKitPavilion.dispose();
    villageNightLighting.dispose();
    wallClock.dispose();
    for (const d of disposables) {
      d.dispose();
    }
  };

  return {
    group,
    perches,
    setBookPickedUp,
    update,
    dispose,
  };
}

import * as THREE from 'three';
import { VILLAGE_DESTINATIONS } from '../../data/destinations';
import type { DestinationId } from '../../types/universe';
import type { TimeOfDaySystem } from '../environment/timeOfDaySystem';
import type { WindSystem } from '../environment/windSystem';
import { groundHeightAt } from '../terrain';
import type { ProceduralTextureSet } from '../textures';

export interface DestinationSceneNode {
  id: DestinationId;
  group: THREE.Group;
  hitProxy: THREE.Mesh;
  auraRing: THREE.Mesh;
  auraMat: THREE.MeshBasicMaterial;
  worldCenter: THREE.Vector3;
  pinAnchor: THREE.Vector3;
  perchPosition: THREE.Vector3;
  accentColor: THREE.Color;
  baseScale: number;
}

export interface DestinationsBuildResult {
  group: THREE.Group;
  nodes: Record<DestinationId, DestinationSceneNode>;
  hitProxies: THREE.Mesh[];
  update: (
    delta: number,
    elapsed: number,
    hoveredId: DestinationId | null,
    selectedId: DestinationId | null,
  ) => void;
  dispose: () => void;
}

export function buildVillageDestinations(
  textures: ProceduralTextureSet,
  wind: WindSystem,
  timeOfDay: TimeOfDaySystem,
): DestinationsBuildResult {
  const root = new THREE.Group();
  root.name = 'VillageDestinations';

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

  // --- Upgraded Architectural PBR Material Library ---
  const terracottaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.terracottaTiles,
      bumpMap: textures.terracottaBump,
      bumpScale: 0.08,
      roughness: 0.72,
      metalness: 0.04,
    }),
  );

  const plasterMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.warmPlaster,
      bumpMap: textures.plasterBump,
      bumpScale: 0.035,
      roughness: 0.86,
      metalness: 0.01,
    }),
  );

  const interiorWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff0d6,
      emissive: 0xffbf6b,
      emissiveIntensity: 0.08,
      roughness: 0.9,
    }),
  );
  timeOfDay.registerWarmGlow({
    material: interiorWallMat,
    dayEmissive: 0.06,
    sunsetEmissive: 0.45,
    nightEmissive: 0.92,
  });

  const terracottaDadoMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb9532f,
      roughness: 0.88,
      metalness: 0.01,
    }),
  );

  const chalkTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbf5e6,
      roughness: 0.84,
    }),
  );

  const carvedStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.carvedStone,
      roughness: 0.88,
      metalness: 0.02,
    }),
  );

  const darkStoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8a7766,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );

  const teakMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.teakWood,
      roughness: 0.62,
      metalness: 0.05,
    }),
  );

  const paleWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc8955c,
      roughness: 0.68,
      metalness: 0.02,
    }),
  );

  const saffronAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd85a2a,
      roughness: 0.54,
      metalness: 0.04,
    }),
  );

  const tealAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a7b9b,
      roughness: 0.5,
      metalness: 0.06,
    }),
  );

  const nectarAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf2b238,
      roughness: 0.52,
      metalness: 0.04,
    }),
  );

  const sugarcaneGreenMat = trackMat(
    wind.applyWindShader(
      new THREE.MeshStandardMaterial({
        color: 0x2e6643,
        roughness: 0.8,
        metalness: 0.01,
      }),
      {
        swayAmp: 0.1,
        flutterAmp: 0.03,
        heightMin: 0.1,
        heightRange: 2.0,
        instanced: false,
        cacheKey: 'dest-leaf-deep',
      },
    ),
  );

  const sunlitFoliageMat = trackMat(
    wind.applyWindShader(
      new THREE.MeshStandardMaterial({
        color: 0x4b8749,
        roughness: 0.78,
        metalness: 0.01,
      }),
      {
        swayAmp: 0.12,
        flutterAmp: 0.036,
        heightMin: 0.1,
        heightRange: 2.0,
        instanced: false,
        cacheKey: 'dest-leaf-sun',
      },
    ),
  );

  const goldenBrassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6af3e,
      roughness: 0.24,
      metalness: 0.86,
    }),
  );

  const warmLanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffebbd,
      emissive: 0xffb93e,
      emissiveIntensity: 0.14,
      roughness: 0.2,
      metalness: 0.02,
    }),
  );
  timeOfDay.registerWarmGlow({
    material: warmLanternGlowMat,
    dayEmissive: 0.14,
    sunsetEmissive: 1.25,
    nightEmissive: 2.35,
  });

  const warmWindowGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7da4bd,
      emissive: 0xffba49,
      emissiveIntensity: 0.06,
      roughness: 0.26,
      metalness: 0.08,
    }),
  );
  timeOfDay.registerWarmGlow({
    material: warmWindowGlassMat,
    dayEmissive: 0.05,
    sunsetEmissive: 1.15,
    nightEmissive: 2.25,
    dayColor: new THREE.Color('#8AB0C6'),
    nightColor: new THREE.Color('#FFE4A4'),
  });

  const chalkboardMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.chalkboard,
      roughness: 0.85,
      metalness: 0.02,
    }),
  );

  const chart1Mat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.educationalChart1,
      roughness: 0.82,
    }),
  );

  const chart2Mat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.educationalChart2,
      roughness: 0.82,
    }),
  );

  const schoolNameplateMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.schoolNameplate,
      roughness: 0.78,
    }),
  );

  const redEarthMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.ochrePath,
      color: 0xd88e5b,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );

  const creamCanvasMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfff7e8,
      roughness: 0.85,
    }),
  );

  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );

  // Reusable small book palette for school & library
  const bookPaletteMats = [
    saffronAccentMat,
    tealAccentMat,
    nectarAccentMat,
    sugarcaneGreenMat,
    trackMat(new THREE.MeshStandardMaterial({ color: 0x9b3e48, roughness: 0.68 })),
  ];

  const dynamicPennants: THREE.Mesh[] = [];
  const dynamicCanopies: THREE.Group[] = [];
  const dynamicRibbons: THREE.Mesh[] = [];

  // Shared helper: terracotta marigold planter pot
  const potGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.2, 0.36, 10));
  const flowerBushGeo = trackGeo(new THREE.DodecahedronGeometry(0.26, 0));
  const marigoldGeo = trackGeo(new THREE.SphereGeometry(0.085, 8, 6));

  function addMarigoldPlanter(parent: THREE.Group, x: number, y: number, z: number): void {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    const pot = new THREE.Mesh(potGeo, saffronAccentMat);
    pot.position.y = 0.18;
    pot.castShadow = true;
    p.add(pot);

    const leaves = new THREE.Mesh(flowerBushGeo, sugarcaneGreenMat);
    leaves.position.y = 0.46;
    p.add(leaves);

    for (const [bx, by, bz] of [
      [0.12, 0.58, 0.08],
      [-0.1, 0.62, -0.05],
      [0.02, 0.66, -0.1],
    ]) {
      const bloom = new THREE.Mesh(marigoldGeo, nectarAccentMat);
      bloom.position.set(bx, by, bz);
      p.add(bloom);
    }
    parent.add(p);
  }

  // Shared helper: warm hanging brass lantern
  const lanternBodyGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.08, 0.24, 8));
  const lanternCapGeo = trackGeo(new THREE.ConeGeometry(0.16, 0.12, 8));
  function addHangingLantern(parent: THREE.Group, x: number, y: number, z: number): void {
    const l = new THREE.Group();
    l.position.set(x, y, z);
    const body = new THREE.Mesh(lanternBodyGeo, warmLanternGlowMat);
    l.add(body);
    const cap = new THREE.Mesh(lanternCapGeo, goldenBrassMat);
    cap.position.y = 0.16;
    l.add(cap);
    const base = new THREE.Mesh(lanternCapGeo, goldenBrassMat);
    base.rotation.x = Math.PI;
    base.scale.setScalar(0.72);
    base.position.y = -0.15;
    l.add(base);
    parent.add(l);
  }

  // =========================================================================
  // 1. VILLAGE SCHOOL — Mission Bharari
  // Welcoming courtyard, open doorway revealing classroom interior, chalkboard,
  // student desks, stacked notebooks, shuttered windows, brass bell & flagpole
  // =========================================================================
  function buildVillageSchool(): THREE.Group {
    const g = new THREE.Group();

    // Courtyard stone border apron + extended rural Maharashtra school playground
    const courtyardApron = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.4, 0.16, 10.2)),
      redEarthMat,
    );
    courtyardApron.position.set(-0.4, 0.08, 2.35);
    courtyardApron.receiveShadow = true;
    g.add(courtyardApron);

    const plinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(8.2, 0.48, 5.6)),
      carvedStoneMat,
    );
    plinth.position.set(0, 0.24, -0.1);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    g.add(plinth);

    const entrySteps = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.0, 0.24, 1.05)),
      darkStoneMat,
    );
    entrySteps.position.set(0, 0.12, 3.05);
    entrySteps.receiveShadow = true;
    g.add(entrySteps);

    // Classroom shell with authentic rural Zilla Parishad terracotta dado band & wide open entrance
    const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.2, 2.75, 0.34)), plasterMat);
    backWall.position.set(0, 1.85, -2.35);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    g.add(backWall);

    // Painted lower terracotta dado band (signature Maharashtra Zilla Parishad primary school look)
    const backDado = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.24, 0.86, 0.38)), terracottaDadoMat);
    backDado.position.set(0, 0.91, -2.35);
    g.add(backDado);

    const sideWallGeo = trackGeo(new THREE.BoxGeometry(0.34, 2.75, 3.6));
    const sideDadoGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.86, 3.64));
    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(sideWallGeo, plasterMat);
      sw.position.set(side * 3.45, 1.85, -0.7);
      sw.castShadow = true;
      sw.receiveShadow = true;
      g.add(sw);

      const sd = new THREE.Mesh(sideDadoGeo, terracottaDadoMat);
      sd.position.set(side * 3.45, 0.91, -0.7);
      g.add(sd);
    }

    // Front wall sections flanking the wide welcoming doorway & open shuttered window bays
    const frontCornerGeo = trackGeo(new THREE.BoxGeometry(1.15, 2.75, 0.32));
    for (const side of [-1, 1]) {
      const corner = new THREE.Mesh(frontCornerGeo, plasterMat);
      corner.position.set(side * 2.95, 1.85, 0.95);
      corner.castShadow = true;
      g.add(corner);

      const cornerDado = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.18, 0.86, 0.36)),
        terracottaDadoMat,
      );
      cornerDado.position.set(side * 2.95, 0.91, 0.95);
      g.add(cornerDado);

      // Low sill wall beneath wide classroom windows
      const sill = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 1.05, 0.32)), plasterMat);
      sill.position.set(side * 1.72, 1.0, 0.95);
      g.add(sill);

      const sillDado = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.32, 0.86, 0.36)),
        terracottaDadoMat,
      );
      sillDado.position.set(side * 1.72, 0.91, 0.95);
      g.add(sillDado);

      const sillChalkTrim = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.36, 0.08, 0.38)),
        chalkTrimMat,
      );
      sillChalkTrim.position.set(side * 1.72, 1.5, 0.95);
      g.add(sillChalkTrim);

      // Window lintel & blue/teal painted wooden shutters
      const lintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.45, 0.34)), plasterMat);
      lintel.position.set(side * 1.72, 3.0, 0.95);
      g.add(lintel);

      for (const shSide of [-1, 1]) {
        const shutter = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.34, 1.25, 0.08)),
          tealAccentMat,
        );
        shutter.position.set(side * 1.72 + shSide * 0.72, 2.15, 1.18);
        shutter.rotation.y = shSide * 0.45;
        g.add(shutter);
      }
    }

    // Front lintel over wide welcoming classroom entrance
    const doorLintel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.15, 0.52, 0.36)), plasterMat);
    doorLintel.position.set(0, 2.96, 0.95);
    g.add(doorLintel);

    // Open double wooden classroom doors swung inward warmly
    const doorLeafGeo = trackGeo(new THREE.BoxGeometry(0.68, 2.15, 0.09));
    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(doorLeafGeo, teakMat);
      leaf.position.set(side * 0.92, 1.56, 0.72);
      leaf.rotation.y = -side * 0.95;
      g.add(leaf);
    }

    // --- Visible Warm Classroom Interior (Chalkboard, Wall Charts, Wooden Benches, Desks & Schoolbags) ---
    const interiorFloor = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.7, 0.06, 3.3)),
      interiorWallMat,
    );
    interiorFloor.position.set(0, 0.51, -0.7);
    g.add(interiorFloor);

    // Framed Green Chalkboard with chalk ledge & duster on back classroom wall
    const boardFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 1.38, 0.1)), teakMat);
    boardFrame.position.set(0, 1.92, -2.14);
    g.add(boardFrame);

    const boardFace = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.96, 1.18)), chalkboardMat);
    boardFace.position.set(0, 1.92, -2.08);
    g.add(boardFace);

    const chalkTray = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.05, 0.08, 0.14)), teakMat);
    chalkTray.position.set(0, 1.24, -2.06);
    g.add(chalkTray);

    const duster = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.06, 0.08)), paleWoodMat);
    duster.position.set(0.85, 1.31, -2.04);
    g.add(duster);

    // Two colourful laminated Educational Wall Charts flanking the blackboard
    const chartGeo = trackGeo(new THREE.PlaneGeometry(0.95, 1.18));
    const chartLeft = new THREE.Mesh(chartGeo, chart1Mat);
    chartLeft.position.set(-2.35, 1.96, -2.14);
    g.add(chartLeft);

    const chartRight = new THREE.Mesh(chartGeo, chart2Mat);
    chartRight.position.set(2.35, 1.96, -2.14);
    g.add(chartRight);

    // Classroom ceiling lamp bulb (glows warmly at sunset & night)
    const classroomLamp = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.16, 10, 8)),
      warmLanternGlowMat,
    );
    classroomLamp.position.set(0, 2.95, -0.7);
    g.add(classroomLamp);

    // Student wooden desks, benches, notebooks & resting schoolbags
    const deskTopGeo = trackGeo(new THREE.BoxGeometry(1.38, 0.08, 0.48));
    const deskLegGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.62, 0.4));
    const benchSeatGeo = trackGeo(new THREE.BoxGeometry(1.38, 0.07, 0.3));
    const benchLegGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.38, 0.26));
    const tinyBookGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.05, 0.18));
    const schoolbagGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.26, 0.12));

    for (const dx of [-1.85, 0, 1.85]) {
      const desk = new THREE.Group();
      desk.position.set(dx, 0.54, -0.62);
      const top = new THREE.Mesh(deskTopGeo, paleWoodMat);
      top.position.y = 0.64;
      desk.add(top);

      for (const lx of [-0.56, 0.56]) {
        const leg = new THREE.Mesh(deskLegGeo, teakMat);
        leg.position.set(lx, 0.31, 0);
        desk.add(leg);
      }

      // Open notebook & colourful textbook on each desk
      const b1 = new THREE.Mesh(tinyBookGeo, creamCanvasMat);
      b1.position.set(-0.28, 0.705, 0.02);
      b1.rotation.y = 0.12;
      desk.add(b1);

      const b2 = new THREE.Mesh(
        tinyBookGeo,
        bookPaletteMats[(Math.abs(Math.round(dx)) + 2) % bookPaletteMats.length],
      );
      b2.position.set(0.26, 0.705, -0.04);
      b2.rotation.y = -0.18;
      desk.add(b2);

      // Matching wooden school bench directly behind the desk (local z = 0.02)
      const benchSeat = new THREE.Mesh(benchSeatGeo, paleWoodMat);
      benchSeat.position.set(0, 0.38, 0.62);
      desk.add(benchSeat);

      for (const lx of [-0.56, 0.56]) {
        const bLeg = new THREE.Mesh(benchLegGeo, teakMat);
        bLeg.position.set(lx, 0.19, 0.62);
        desk.add(bLeg);
      }

      // Resting colourful student schoolbag leaning beside each bench
      const bag = new THREE.Mesh(
        schoolbagGeo,
        bookPaletteMats[Math.abs(Math.round(dx * 2)) % bookPaletteMats.length],
      );
      bag.position.set(0.76, 0.13, 0.58);
      bag.rotation.z = -0.18;
      desk.add(bag);

      g.add(desk);
    }

    // Sweeping Mangalore-Tile Roof with overhang shading the front veranda
    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(6.05, 2.25, 4)), terracottaMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.08, 1.0, 0.8);
    roof.position.set(0, 4.3, -0.05);
    roof.castShadow = true;
    roof.receiveShadow = true;
    g.add(roof);

    const ridge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 0.2, 0.24)), saffronAccentMat);
    ridge.position.set(0, 5.38, -0.05);
    g.add(ridge);

    // Carved teak verandah pillars with upper wooden corbel brackets
    const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.145, 2.65, 10));
    const bracketGeo = trackGeo(new THREE.BoxGeometry(0.55, 0.16, 0.18));
    for (const px of [-3.3, -1.15, 1.15, 3.3]) {
      const pillar = new THREE.Mesh(pillarGeo, teakMat);
      pillar.position.set(px, 1.82, 2.35);
      pillar.castShadow = true;
      g.add(pillar);

      const bracket = new THREE.Mesh(bracketGeo, teakMat);
      bracket.position.set(px, 3.04, 2.35);
      g.add(bracket);
    }
    const verandahBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.2, 0.22, 0.24)), teakMat);
    verandahBeam.position.set(0, 3.2, 2.35);
    g.add(verandahBeam);

    // Authentic Z.P. Primary School — Mission Bharari painted nameplate above veranda entrance
    const nameBoard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.1, 0.68, 0.1)),
      schoolNameplateMat,
    );
    nameBoard.position.set(0, 3.44, 2.48);
    g.add(nameBoard);

    // Welcoming wooden veranda bench on the right side
    const vBenchTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.55, 0.08, 0.42)), paleWoodMat);
    vBenchTop.position.set(2.25, 0.92, 1.85);
    g.add(vBenchTop);
    for (const lx of [1.62, 2.88]) {
      const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.42, 0.36)), teakMat);
      leg.position.set(lx, 0.7, 1.85);
      g.add(leg);
    }

    // Warm hanging lanterns beneath verandah beam
    addHangingLantern(g, -2.2, 2.9, 2.35);
    addHangingLantern(g, 2.2, 2.9, 2.35);

    // School bell archway & gleaming brass bell
    const bellFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.15, 1.65, 0.15)), teakMat);
    bellFrame.position.set(-3.7, 1.32, 2.4);
    g.add(bellFrame);

    const bellArm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.75, 0.11, 0.13)), teakMat);
    bellArm.position.set(-3.38, 2.08, 2.4);
    g.add(bellArm);

    const bell = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.18, 0.28, 14)), goldenBrassMat);
    bell.position.set(-3.12, 1.85, 2.4);
    g.add(bell);

    // Marigold planters flanking the welcoming stone steps
    addMarigoldPlanter(g, -1.85, 0.16, 3.3);
    addMarigoldPlanter(g, 1.85, 0.16, 3.3);

    // Courtyard Neem Shade Tree with circular stone bench (west courtyard playground)
    const shadeTree = new THREE.Group();
    shadeTree.position.set(-4.75, 0.16, 2.05);
    const treeRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.05, 1.18, 0.38, 12)),
      carvedStoneMat,
    );
    treeRing.position.y = 0.19;
    shadeTree.add(treeRing);
    const shadeTrunk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 2.65, 8)),
      teakMat,
    );
    shadeTrunk.position.y = 1.45;
    shadeTrunk.castShadow = true;
    shadeTree.add(shadeTrunk);
    const shadeCanopy = new THREE.Group();
    shadeCanopy.position.set(0, 3.05, 0);
    for (const [cx, cy, cz, r, mat] of [
      [0, 0.15, 0, 1.45, sugarcaneGreenMat],
      [0.85, -0.1, 0.45, 1.05, sunlitFoliageMat],
      [-0.82, -0.05, -0.35, 1.08, sugarcaneGreenMat],
      [0.15, 0.72, -0.25, 0.96, sunlitFoliageMat],
    ] as Array<[number, number, number, number, THREE.Material]>) {
      const p = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(r, 1)), mat);
      p.position.set(cx, cy, cz);
      p.scale.set(1.15, 0.76, 1.1);
      p.castShadow = true;
      shadeCanopy.add(p);
    }
    shadeTree.add(shadeCanopy);
    dynamicCanopies.push(shadeCanopy);
    g.add(shadeTree);

    // Painted white-chalk hopscotch grid on the sunny school courtyard
    const hopChalkMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfff7e6,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    const hopGrid = new THREE.Group();
    hopGrid.position.set(1.9, 0.175, 4.35);
    const hopCellGeo = trackGeo(new THREE.RingGeometry(0.24, 0.3, 4));
    for (const [hx, hz] of [
      [0, -0.9],
      [-0.3, -0.45],
      [0.3, -0.45],
      [0, 0.0],
      [-0.3, 0.45],
      [0.3, 0.45],
      [0, 0.9],
    ]) {
      const sq = new THREE.Mesh(hopCellGeo, hopChalkMat);
      sq.rotation.x = -Math.PI / 2;
      sq.rotation.z = Math.PI / 4;
      sq.position.set(hx, 0, hz);
      hopGrid.add(sq);
    }
    g.add(hopGrid);

    // Courtyard flagpole with fluttering saffron pennant
    const poleBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.35, 0.48, 0.35, 8)), carvedStoneMat);
    poleBase.position.set(4.15, 0.18, 2.8);
    g.add(poleBase);

    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.08, 4.6, 8)), carvedStoneMat);
    pole.position.set(4.15, 2.48, 2.8);
    pole.castShadow = true;
    g.add(pole);

    const pennant = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.22, 0.64, 5, 1)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xd85a2a, side: THREE.DoubleSide, roughness: 0.6 })),
    );
    pennant.position.set(4.8, 4.38, 2.8);
    g.add(pennant);
    dynamicPennants.push(pennant);

    // Warm non-shadow interior PointLight (off during day, glowing warmly at sunset & night)
    const schoolLight = new THREE.PointLight('#FFBA58', 0, 14, 1.7);
    schoolLight.position.set(0, 2.6, 0.3);
    g.add(schoolLight);
    timeOfDay.registerWarmLight({
      light: schoolLight,
      dayIntensity: 0,
      sunsetIntensity: 2.2,
      nightIntensity: 6.2,
    });

    // Carved stone perch post for Bharari (exact coordinate matching bharariPerchOffset [2.8, 1.35, 3.8])
    const perchPost = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.25, 1.35, 12)), carvedStoneMat);
    perchPost.position.set(2.8, 0.675, 3.8);
    perchPost.castShadow = true;
    g.add(perchPost);

    return g;
  }

  // =========================================================================
  // 2. VILLAGE LIBRARY — Garad Granthalay
  // Two-tier octagonal pavilion, richly stocked multi-colour bookshelves,
  // outdoor reading tables with open storybooks, benches & glowing lanterns
  // =========================================================================
  function buildVillageLibrary(): THREE.Group {
    const g = new THREE.Group();

    // Broad warm courtyard paving circle
    const courtyard = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(5.6, 5.8, 0.18, 16)), carvedStoneMat);
    courtyard.position.y = 0.09;
    courtyard.receiveShadow = true;
    g.add(courtyard);

    // Octagonal reading pavilion plinth
    const plinth = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(4.25, 4.55, 0.52, 8)), carvedStoneMat);
    plinth.position.y = 0.26;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    g.add(plinth);

    // Warm octagonal library core with rich plaster walls
    const body = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.8, 2.92, 2.75, 8)), plasterMat);
    body.position.y = 1.9;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Graceful two-tier terracotta pavilion roof with warm clerestory glow
    const lowerRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(4.95, 1.52, 8)), terracottaMat);
    lowerRoof.position.y = 3.82;
    lowerRoof.castShadow = true;
    g.add(lowerRoof);

    const clerestory = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.38, 1.48, 0.72, 8)), warmLanternGlowMat);
    clerestory.position.y = 4.52;
    g.add(clerestory);

    const upperCap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.85, 1.05, 8)), tealAccentMat);
    upperCap.position.y = 5.34;
    upperCap.castShadow = true;
    g.add(upperCap);

    const brassFinial = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.21, 14, 12)), goldenBrassMat);
    brassFinial.position.y = 5.95;
    g.add(brassFinial);

    // Surrounding carved teak colonnade, richly filled bookshelves & glowing reading windows
    const colGeo = trackGeo(new THREE.CylinderGeometry(0.115, 0.135, 2.75, 10));
    const shelfFrameGeo = trackGeo(new THREE.BoxGeometry(1.35, 1.75, 0.3));
    const shelfBoardGeo = trackGeo(new THREE.BoxGeometry(1.26, 0.06, 0.28));
    const bookGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.28, 0.22));

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const col = new THREE.Mesh(colGeo, teakMat);
      col.position.set(cos * 3.78, 1.88, sin * 3.78);
      col.castShadow = true;
      g.add(col);

      // Hanging brass lanterns on alternating colonnade eaves
      if (i % 2 === 0) {
        addHangingLantern(g, cos * 3.92, 2.95, sin * 3.92);
      }

      // Alternating detailed teak bookshelves packed with varied colourful books & warm windows
      if (i % 2 === 0) {
        const shelfGroup = new THREE.Group();
        shelfGroup.position.set(cos * 2.86, 1.45, sin * 2.86);
        shelfGroup.rotation.y = -angle + Math.PI / 2;

        const frame = new THREE.Mesh(shelfFrameGeo, teakMat);
        shelfGroup.add(frame);

        for (let row = 0; row < 4; row++) {
          const ry = -0.62 + row * 0.42;
          const board = new THREE.Mesh(shelfBoardGeo, paleWoodMat);
          board.position.set(0, ry - 0.14, 0.03);
          shelfGroup.add(board);

          // 7 individually tinted & slightly varied-height books per shelf
          for (let b = 0; b < 7; b++) {
            const book = new THREE.Mesh(bookGeo, bookPaletteMats[(i + row * 2 + b) % bookPaletteMats.length]);
            const hScale = 0.78 + ((b * 3 + row) % 4) * 0.12;
            book.scale.set(1, hScale, 1);
            book.position.set(-0.46 + b * 0.155, ry + (hScale - 1) * 0.12, 0.08);
            if (b === 6 && row % 2 === 0) {
              book.rotation.z = 0.18;
            }
            shelfGroup.add(book);
          }
        }
        g.add(shelfGroup);
      } else {
        const winGroup = new THREE.Group();
        winGroup.position.set(cos * 2.84, 1.72, sin * 2.84);
        winGroup.rotation.y = -angle + Math.PI / 2;

        const winFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.18, 1.56, 0.16)), teakMat);
        winGroup.add(winFrame);

        const pane = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.98, 1.36, 0.19)), warmWindowGlassMat);
        winGroup.add(pane);

        // Mounted educational reading poster beside south-facing windows
        if (i === 1) {
          const poster = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.74, 0.92)), chart2Mat);
          poster.position.set(0, 0.05, 0.12);
          winGroup.add(poster);
        }

        g.add(winGroup);
      }
    }

    // Warm Outdoor Reading Courtyard: Circular teak tables with OPEN storybooks & reading benches
    const tableTopGeo = trackGeo(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 16));
    const tablePedGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.22, 0.68, 10));
    const stoolGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.22, 0.42, 10));
    const pageGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.03, 0.28));

    const tableSpots: Array<[number, number]> = [
      [-2.6, 4.15],
      [0.45, 4.65],
    ];
    for (const [tx, tz] of tableSpots) {
      const tbl = new THREE.Group();
      tbl.position.set(tx, 0.18, tz);

      const top = new THREE.Mesh(tableTopGeo, paleWoodMat);
      top.position.y = 0.68;
      top.castShadow = true;
      tbl.add(top);

      const ped = new THREE.Mesh(tablePedGeo, teakMat);
      ped.position.y = 0.34;
      ped.castShadow = true;
      tbl.add(ped);

      // Open storybook pages angled like a V on the reading table
      for (const side of [-1, 1]) {
        const page = new THREE.Mesh(pageGeo, creamCanvasMat);
        page.position.set(side * 0.11, 0.75, 0.04);
        page.rotation.z = -side * 0.24;
        tbl.add(page);
      }

      // Small stack of closed books beside open book
      const closedBook = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.26, 0.07, 0.2)),
        saffronAccentMat,
      );
      closedBook.position.set(-0.32, 0.76, -0.2);
      closedBook.rotation.y = 0.4;
      tbl.add(closedBook);

      // Two curved reading stools around each table
      for (const sAngle of [-0.7, 2.2]) {
        const stool = new THREE.Mesh(stoolGeo, teakMat);
        stool.position.set(Math.cos(sAngle) * 1.02, 0.21, Math.sin(sAngle) * 1.02);
        stool.castShadow = true;
        tbl.add(stool);
      }

      g.add(tbl);
    }

    // Cozy reading corner cushions on the veranda plinth
    const cushionGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.38, 0.12, 12));
    for (const [cx, cz, mat] of [
      [1.85, 2.65, saffronAccentMat],
      [2.55, 2.15, nectarAccentMat],
    ] as Array<[number, number, THREE.Material]>) {
      const cush = new THREE.Mesh(cushionGeo, mat);
      cush.position.set(cx, 0.58, cz);
      g.add(cush);
    }

    addMarigoldPlanter(g, -4.1, 0.18, 2.5);
    addMarigoldPlanter(g, 4.1, 0.18, 1.9);

    // Warm Library Pavilion PointLight (glows at sunset & night)
    const libraryLight = new THREE.PointLight('#FFC064', 0, 14, 1.7);
    libraryLight.position.set(0, 3.1, 2.8);
    g.add(libraryLight);
    timeOfDay.registerWarmLight({
      light: libraryLight,
      dayIntensity: 0,
      sunsetIntensity: 2.0,
      nightIntensity: 5.8,
    });

    // Bharari carved reading-lantern stone perch (matches [3.1, 1.25, 3.2])
    const perchPillar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.24, 1.25, 12)), carvedStoneMat);
    perchPillar.position.set(3.1, 0.625, 3.2);
    perchPillar.castShadow = true;
    g.add(perchPillar);

    return g;
  }

  // =========================================================================
  // 3. ACTIVITY GROUND — Youth Development
  // Play arena, netted goalposts, cricket/sports rack, creative painting easels
  // under shaded pergola, tiered seating & fluttering festive bunting strings
  // =========================================================================
  function buildActivityGround(): THREE.Group {
    const g = new THREE.Group();

    // Compacted red-earth play & amphitheatre circle
    const court = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(5.85, 6.1, 0.24, 32)), redEarthMat);
    court.position.y = 0.12;
    court.receiveShadow = true;
    g.add(court);

    // Crisp lime-chalk court rings & centre line
    const chalkMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfff5e4,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    const outerRing = new THREE.Mesh(trackGeo(new THREE.RingGeometry(4.0, 4.18, 36)), chalkMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.26;
    g.add(outerRing);

    const innerRing = new THREE.Mesh(trackGeo(new THREE.RingGeometry(1.0, 1.15, 28)), chalkMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.26;
    g.add(innerRing);

    const centerLine = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(8.0, 0.14)), chalkMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.26;
    g.add(centerLine);

    // Tiered stone amphitheatre seating arc with colourful woven cushions
    for (let tier = 0; tier < 2; tier++) {
      const arc = new THREE.Mesh(
        trackGeo(
          new THREE.CylinderGeometry(
            6.05 + tier * 0.72,
            6.25 + tier * 0.72,
            0.44 + tier * 0.38,
            22,
            1,
            false,
            Math.PI * 0.82,
            Math.PI * 0.88,
          ),
        ),
        tier === 0 ? carvedStoneMat : darkStoneMat,
      );
      arc.position.y = 0.22 + tier * 0.19;
      arc.castShadow = true;
      arc.receiveShadow = true;
      g.add(arc);
    }

    // Wooden Youth Goalposts with crisscrossed twine net & football on the field
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.095, 2.55, 8));
    for (const side of [-1, 1]) {
      const gp = new THREE.Mesh(postGeo, teakMat);
      gp.position.set(side * 1.55, 1.48, -3.55);
      gp.castShadow = true;
      g.add(gp);

      const backSupport = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.06, 2.75, 6)), teakMat);
      backSupport.position.set(side * 1.55, 1.38, -4.15);
      backSupport.rotation.x = 0.42;
      g.add(backSupport);
    }
    const crossbar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 3.25, 8)), teakMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.7, -3.55);
    crossbar.castShadow = true;
    g.add(crossbar);

    // Delicate net mesh backing the goalposts
    const netPlane = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(3.05, 2.35, 8, 6)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xfff5e4, wireframe: true, transparent: true, opacity: 0.62 })),
    );
    netPlane.position.set(0, 1.48, -4.12);
    netPlane.rotation.x = 0.24;
    g.add(netPlane);

    // Bright football & wooden cricket wicket set on the red-earth court
    const ball = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(0.24, 1)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xfff7ec, roughness: 0.48 })),
    );
    ball.position.set(0.8, 0.48, 0.65);
    ball.castShadow = true;
    g.add(ball);

    const stumpGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.92, 8));
    for (const sx of [-0.14, 0, 0.14]) {
      const stump = new THREE.Mesh(stumpGeo, paleWoodMat);
      stump.position.set(2.9 + sx, 0.7, 1.85);
      stump.castShadow = true;
      g.add(stump);
    }
    const bat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.85, 0.06)), paleWoodMat);
    bat.position.set(3.38, 0.62, 1.72);
    bat.rotation.z = 0.26;
    bat.rotation.y = -0.4;
    bat.castShadow = true;
    g.add(bat);

    // Creative Youth Arts & Craft Corner under Shaded Timber Pergola (Easels + Painted Canvases)
    const pergola = new THREE.Group();
    pergola.position.set(-4.55, 0.12, 1.35);
    pergola.rotation.y = 0.42;

    const pergolaRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.9, 0.18, 2.1)), terracottaMat);
    pergolaRoof.position.y = 2.48;
    pergolaRoof.castShadow = true;
    pergola.add(pergolaRoof);

    const pLegGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.09, 2.4, 8));
    for (const dx of [-1.15, 1.15]) {
      for (const dz of [-0.75, 0.75]) {
        const leg = new THREE.Mesh(pLegGeo, teakMat);
        leg.position.set(dx, 1.2, dz);
        leg.castShadow = true;
        pergola.add(leg);
      }
    }

    // Two wooden painting easels with colourful canvases
    const easelLegGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 1.35, 6));
    const easelColors = [0x1a7b9b, 0xd85a2a];
    for (let e = 0; e < 2; e++) {
      const easel = new THREE.Group();
      easel.position.set(-0.55 + e * 1.1, 0, 0.1);
      easel.rotation.y = (e === 0 ? 1 : -1) * 0.25;

      const backLeg = new THREE.Mesh(easelLegGeo, teakMat);
      backLeg.position.set(0, 0.62, -0.22);
      backLeg.rotation.x = -0.26;
      easel.add(backLeg);

      for (const s of [-0.2, 0.2]) {
        const fl = new THREE.Mesh(easelLegGeo, teakMat);
        fl.position.set(s, 0.62, 0.12);
        fl.rotation.x = 0.16;
        fl.rotation.z = s * 0.28;
        easel.add(fl);
      }

      const canvasBoard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.58, 0.46, 0.04)), creamCanvasMat);
      canvasBoard.position.set(0, 0.92, 0.12);
      canvasBoard.rotation.x = -0.15;
      easel.add(canvasBoard);

      const paintSwatch = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(0.14, 12)),
        trackMat(new THREE.MeshStandardMaterial({ color: easelColors[e], roughness: 0.7 })),
      );
      paintSwatch.position.set(0, 0.94, 0.145);
      paintSwatch.rotation.x = -0.15;
      easel.add(paintSwatch);

      pergola.add(easel);
    }
    g.add(pergola);

    // Festive Bamboo Poles + Catenary Bunting Strings framing the Activity Ground
    const bambooGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8));
    const pennantGeo = trackGeo(new THREE.ConeGeometry(0.32, 0.85, 3));
    const poleCoords: Array<[number, number, boolean]> = [
      [-4.7, -1.7, true],
      [4.8, -1.3, false],
      [4.2, 3.3, true],
      [-3.7, 4.1, false],
    ];
    for (const [px, pz, isSaffron] of poleCoords) {
      const bp = new THREE.Mesh(bambooGeo, teakMat);
      bp.position.set(px, 2.1, pz);
      bp.castShadow = true;
      g.add(bp);

      const flag = new THREE.Mesh(pennantGeo, isSaffron ? saffronAccentMat : tealAccentMat);
      flag.rotation.z = -Math.PI / 2;
      flag.position.set(px + 0.42, 3.9, pz);
      g.add(flag);
      dynamicPennants.push(flag);
    }

    // Overhead festive catenary string with alternating saffron, teal & nectar bunting triangles
    const buntingCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-4.7, 3.95, -1.7),
      new THREE.Vector3(0.05, 3.05, -1.5),
      new THREE.Vector3(4.8, 3.95, -1.3),
    );
    const stringMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(buntingCurve, 18, 0.022, 6, false)),
      teakMat,
    );
    g.add(stringMesh);

    const tinyTriGeo = trackGeo(new THREE.ConeGeometry(0.18, 0.34, 3));
    const buntingMats = [saffronAccentMat, tealAccentMat, nectarAccentMat];
    for (let i = 1; i <= 9; i++) {
      const pt = buntingCurve.getPoint(i / 10);
      const tri = new THREE.Mesh(tinyTriGeo, buntingMats[i % buntingMats.length]);
      tri.rotation.x = Math.PI;
      tri.position.set(pt.x, pt.y - 0.17, pt.z);
      g.add(tri);
      dynamicRibbons.push(tri);
    }

    // Sports training cones on the red-earth court + warm twilight corner lantern
    const coneGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.28, 10));
    for (const [cx, cz] of [
      [-1.8, -0.8],
      [-0.6, -1.6],
      [1.4, -1.2],
    ]) {
      const cone = new THREE.Mesh(coneGeo, saffronAccentMat);
      cone.position.set(cx, 0.38, cz);
      g.add(cone);
    }
    addHangingLantern(g, -4.55, 2.35, 1.35);

    const activityLight = new THREE.PointLight('#FFC068', 0, 14, 1.7);
    activityLight.position.set(-3.2, 2.6, 1.4);
    g.add(activityLight);
    timeOfDay.registerWarmLight({
      light: activityLight,
      dayIntensity: 0,
      sunsetIntensity: 1.8,
      nightIntensity: 4.8,
    });

    // Carved wooden stump perch for Bharari (matches [-3.4, 1.2, 3.4])
    const perch = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.28, 1.2, 10)), teakMat);
    perch.position.set(-3.4, 0.6, 3.4);
    perch.castShadow = true;
    g.add(perch);

    return g;
  }

  // =========================================================================
  // 4. COMMUNITY CENTRE — Community Development (Welcoming Village Chaupal)
  // Elevated carved stone chaupal, carved wooden corbel pillars, woven floor rugs,
  // gathering dais with brass tea service, village noticeboard, matkas & festoons
  // =========================================================================
  function buildCommunityCentre(): THREE.Group {
    const g = new THREE.Group();

    // Raised stepped village chaupal platform (ota)
    const basePlinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.6, 0.58, 6.6)), carvedStoneMat);
    basePlinth.position.y = 0.29;
    basePlinth.receiveShadow = true;
    basePlinth.castShadow = true;
    g.add(basePlinth);

    const frontSteps = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.3, 1.05)), darkStoneMat);
    frontSteps.position.set(0, 0.15, 3.68);
    frontSteps.receiveShadow = true;
    g.add(frontSteps);

    // Back hearth plaster wall with warm arched niche & hanging brass lamps
    const backWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.6, 2.68, 0.44)), plasterMat);
    backWall.position.set(0, 1.9, -2.5);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    g.add(backWall);

    const nicheArch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.7, 1.58, 0.2)), warmLanternGlowMat);
    nicheArch.position.set(0, 1.9, -2.22);
    g.add(nicheArch);

    // Carved teak verandah pillars with upper decorative corbel brackets
    const pillarGeo = trackGeo(new THREE.CylinderGeometry(0.145, 0.17, 2.68, 10));
    const corbelGeo = trackGeo(new THREE.BoxGeometry(0.62, 0.18, 0.22));
    const pillarCoords: Array<[number, number]> = [
      [-3.05, 2.6],
      [-1.02, 2.6],
      [1.02, 2.6],
      [3.05, 2.6],
      [-3.05, 0.05],
      [3.05, 0.05],
    ];
    for (const [px, pz] of pillarCoords) {
      const p = new THREE.Mesh(pillarGeo, teakMat);
      p.position.set(px, 1.92, pz);
      p.castShadow = true;
      g.add(p);

      const corbel = new THREE.Mesh(corbelGeo, teakMat);
      corbel.position.set(px, 3.18, pz);
      g.add(corbel);
    }

    // Sweeping Mangalore-tile pavilion canopy with ridge crest
    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(6.25, 2.35, 4)), terracottaMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.06, 1.0, 0.94);
    roof.position.set(0, 4.38, 0.08);
    roof.castShadow = true;
    g.add(roof);

    const ridge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.8, 0.18, 0.24)), saffronAccentMat);
    ridge.position.set(0, 5.52, 0.08);
    g.add(ridge);

    // Warm brass eaves lanterns & marigold garlands along front pavilion beam
    addHangingLantern(g, -2.02, 2.98, 2.6);
    addHangingLantern(g, 2.02, 2.98, 2.6);

    const garlandBeadGeo = trackGeo(new THREE.SphereGeometry(0.095, 8, 6));
    for (let gx = -2.8; gx <= 2.8; gx += 0.35) {
      const sag = Math.cos((gx / 2.8) * Math.PI * 1.5) * 0.18;
      const bead = new THREE.Mesh(
        garlandBeadGeo,
        Math.round(gx * 4) % 2 === 0 ? nectarAccentMat : saffronAccentMat,
      );
      bead.position.set(gx, 3.06 - Math.abs(sag), 2.74);
      g.add(bead);
    }

    // Woven circular village gathering rug, seating bolsters & low community table with brass teapot
    const rug = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.15, 2.15, 0.04, 24)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xc95a32, roughness: 0.92 })),
    );
    rug.position.set(0, 0.61, 0.2);
    g.add(rug);

    const lowTable = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.95, 1.02, 0.36, 16)), paleWoodMat);
    lowTable.position.set(0, 0.78, 0.2);
    lowTable.castShadow = true;
    g.add(lowTable);

    // Gleaming brass teapot & cups suggesting welcoming hospitality
    const teapot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.18, 12, 10)), goldenBrassMat);
    teapot.position.set(0, 1.1, 0.2);
    g.add(teapot);
    const cupGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.045, 0.1, 8));
    for (let c = 0; c < 4; c++) {
      const ca = (c / 4) * Math.PI * 2 + 0.4;
      const cup = new THREE.Mesh(cupGeo, goldenBrassMat);
      cup.position.set(Math.cos(ca) * 0.46, 1.02, 0.2 + Math.sin(ca) * 0.46);
      g.add(cup);
    }

    // Floor seating cushions arranged warmly around the gathering rug
    const cushionGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.34, 0.16, 12));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const cushion = new THREE.Mesh(
        cushionGeo,
        i % 2 === 0 ? tealAccentMat : nectarAccentMat,
      );
      cushion.position.set(Math.cos(a) * 1.62, 0.68, 0.2 + Math.sin(a) * 1.62);
      g.add(cushion);
    }

    // Traditional terracotta water pots (matkas) on a wooden corner stand
    const stand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.36, 0.62)), teakMat);
    stand.position.set(2.45, 0.76, 1.65);
    g.add(stand);

    const potMeshGeo = trackGeo(new THREE.SphereGeometry(0.28, 14, 12));
    for (const [mx, mz, sc] of [
      [2.25, 1.65, 1.0],
      [2.72, 1.62, 0.84],
    ]) {
      const pot = new THREE.Mesh(potMeshGeo, saffronAccentMat);
      pot.scale.set(sc, sc * 1.15, sc);
      pot.position.set(mx, 0.94 + 0.25 * sc, mz);
      pot.castShadow = true;
      g.add(pot);
    }

    // Standing wooden Village Noticeboard beside the steps
    const nbGroup = new THREE.Group();
    nbGroup.position.set(3.55, 0.12, 3.15);
    nbGroup.rotation.y = -0.35;
    for (const lx of [-0.52, 0.52]) {
      const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 1.85, 8)), teakMat);
      leg.position.set(lx, 0.92, 0);
      nbGroup.add(leg);
    }
    const nbBoard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.22, 0.85, 0.1)), teakMat);
    nbBoard.position.set(0, 1.45, 0);
    nbGroup.add(nbBoard);
    const nbFace = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.06, 0.7)), creamCanvasMat);
    nbFace.position.set(0, 1.45, 0.058);
    nbGroup.add(nbFace);
    g.add(nbGroup);

    // Welcoming carved wooden benches on courtyard sides & Tulsi Vrindavan planter
    const cBenchGeo = trackGeo(new THREE.BoxGeometry(1.5, 0.08, 0.42));
    for (const bx of [-2.35, 2.35]) {
      const seat = new THREE.Mesh(cBenchGeo, paleWoodMat);
      seat.position.set(bx, 0.96, -1.35);
      g.add(seat);
      for (const lx of [-0.55, 0.55]) {
        const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.36, 0.34)), teakMat);
        leg.position.set(bx + lx, 0.76, -1.35);
        g.add(leg);
      }
    }

    // Traditional courtyard Tulsi planter pedestal
    const tulsiBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.74, 0.68, 0.74)), plasterMat);
    tulsiBase.position.set(-3.45, 0.44, 1.35);
    tulsiBase.castShadow = true;
    g.add(tulsiBase);
    const tulsiBush = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.32, 0)), sugarcaneGreenMat);
    tulsiBush.position.set(-3.45, 0.96, 1.35);
    g.add(tulsiBush);

    addMarigoldPlanter(g, -2.1, 0.12, 3.7);
    addMarigoldPlanter(g, 2.1, 0.12, 3.7);

    // Warm Chaupal PointLight (off in day, glowing warmly at sunset & night)
    const chaupalLight = new THREE.PointLight('#FFBC5C', 0, 14, 1.7);
    chaupalLight.position.set(0, 2.8, 0.5);
    g.add(chaupalLight);
    timeOfDay.registerWarmLight({
      light: chaupalLight,
      dayIntensity: 0,
      sunsetIntensity: 2.2,
      nightIntensity: 6.2,
    });

    // Carved stone perch column for Bharari (matches [-3.1, 1.4, 3.5])
    const perchCol = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.25, 1.4, 12)), carvedStoneMat);
    perchCol.position.set(-3.1, 0.7, 3.5);
    perchCol.castShadow = true;
    g.add(perchCol);

    return g;
  }

  // =========================================================================
  // 5. DREAM HILL — About Garad Foundation
  // Terraced Sahyadri viewpoint, stone steps, carved parapet wall, grand blooming
  // Gulmohar/Banyan Dream Tree, golden sunrise arch, benches & hope ribbons
  // =========================================================================
  function buildDreamHill(): THREE.Group {
    const g = new THREE.Group();

    // Multi-tiered circular stone hilltop overlook terrace
    const lowerTerrace = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(5.6, 6.4, 0.65, 28)), darkStoneMat);
    lowerTerrace.position.y = 0.22;
    lowerTerrace.receiveShadow = true;
    g.add(lowerTerrace);

    const upperTerrace = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(4.85, 5.2, 0.36, 28)), carvedStoneMat);
    upperTerrace.position.y = 0.68;
    upperTerrace.receiveShadow = true;
    upperTerrace.castShadow = true;
    g.add(upperTerrace);

    // Winding stone viewpoint entrance stairs on southern edge facing the village
    for (let s = 0; s < 4; s++) {
      const step = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.5 - s * 0.08, 0.24, 0.68)), carvedStoneMat);
      step.position.set(0, 0.68 - s * 0.22, 4.9 + s * 0.56);
      step.receiveShadow = true;
      g.add(step);
    }

    // Low scenic stone parapet wall curving around the northern & eastern overlook rim
    const parapet = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(4.82, 4.92, 0.58, 24, 1, true, Math.PI * 0.45, Math.PI * 1.1)),
      carvedStoneMat,
    );
    parapet.material.side = THREE.DoubleSide;
    parapet.position.y = 1.15;
    g.add(parapet);

    // Sunburst mosaic inlay on the viewpoint terrace floor
    const compassOuter = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(2.25, 2.52, 32)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xd85a2a, side: THREE.DoubleSide })),
    );
    compassOuter.rotation.x = -Math.PI / 2;
    compassOuter.position.y = 0.88;
    g.add(compassOuter);

    const compassInner = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(1.15, 1.28, 24)),
      trackMat(new THREE.MeshBasicMaterial({ color: 0xf5b738, side: THREE.DoubleSide })),
    );
    compassInner.rotation.x = -Math.PI / 2;
    compassInner.position.y = 0.88;
    g.add(compassInner);

    // Grand Sacred Dream Tree (gnarled roots, curving main limbs, lush canopy & gulmohar blossoms)
    const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.46, 0.85, 3.85, 12)), teakMat);
    trunk.position.set(-1.35, 2.55, -1.25);
    trunk.rotation.z = -0.08;
    trunk.castShadow = true;
    g.add(trunk);

    // Exposed gnarled roots gripping the hilltop stone
    for (let r = 0; r < 4; r++) {
      const ra = (r / 4) * Math.PI * 2 + 0.4;
      const rootLimb = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.28, 1.35, 8)), teakMat);
      rootLimb.position.set(-1.35 + Math.cos(ra) * 0.62, 1.12, -1.25 + Math.sin(ra) * 0.62);
      rootLimb.rotation.z = -Math.cos(ra) * 0.82;
      rootLimb.rotation.x = Math.sin(ra) * 0.82;
      g.add(rootLimb);
    }

    const branch1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.36, 2.7, 8)), teakMat);
    branch1.position.set(-0.2, 4.05, -0.75);
    branch1.rotation.z = -0.74;
    g.add(branch1);

    const branch2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.34, 2.5, 8)), teakMat);
    branch2.position.set(-2.35, 3.9, -1.55);
    branch2.rotation.z = 0.7;
    g.add(branch2);

    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(-1.2, 4.95, -1.15);
    const crownSpecs: Array<[number, number, number, number, THREE.Material]> = [
      [0, 0.38, 0, 2.38, sugarcaneGreenMat],
      [1.55, -0.1, 0.65, 1.75, sunlitFoliageMat],
      [-1.52, -0.15, -0.5, 1.82, sugarcaneGreenMat],
      [0.45, 0.92, -0.95, 1.55, sunlitFoliageMat],
      [1.25, 0.55, 1.0, 0.95, saffronAccentMat],
      [-0.95, 0.98, 0.85, 0.88, saffronAccentMat],
      [0.12, 1.48, -0.1, 0.82, nectarAccentMat],
      [1.8, 0.25, -0.3, 0.72, nectarAccentMat],
    ];
    for (const [cx, cy, cz, radius, mat] of crownSpecs) {
      const puff = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(radius, 1)), mat);
      puff.position.set(cx, cy, cz);
      puff.scale.set(1.18, 0.76, 1.12);
      puff.castShadow = true;
      canopyGroup.add(puff);
    }
    g.add(canopyGroup);
    dynamicCanopies.push(canopyGroup);

    // Fluttering saffron & teal hope ribbons suspended beneath the Dream Tree branch
    const ribbonGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.75, 0.02));
    for (let i = 0; i < 4; i++) {
      const rib = new THREE.Mesh(ribbonGeo, i % 2 === 0 ? saffronAccentMat : tealAccentMat);
      rib.position.set(0.15 + i * 0.28, 3.55 - i * 0.08, -0.55 + i * 0.1);
      g.add(rib);
      dynamicRibbons.push(rib);
    }

    // Sculpted Bronze & Sandstone Sunrise Arch Monument
    const monumentBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.82, 1.05, 1.05, 10)), carvedStoneMat);
    monumentBase.position.set(1.65, 1.32, -0.45);
    monumentBase.castShadow = true;
    g.add(monumentBase);

    const monumentArch = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.88, 0.13, 12, 28, Math.PI)),
      goldenBrassMat,
    );
    monumentArch.position.set(1.65, 1.85, -0.45);
    monumentArch.castShadow = true;
    g.add(monumentArch);

    const sunOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.32, 18, 16)), warmLanternGlowMat);
    sunOrb.position.set(1.65, 2.28, -0.45);
    g.add(sunOrb);

    // Carved stone panoramic benches + warm hilltop lantern posts facing south over the village
    const bench = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.3, 0.52, 0.68)), carvedStoneMat);
    bench.position.set(-0.4, 1.12, 2.75);
    bench.castShadow = true;
    g.add(bench);

    for (const lx of [-2.45, 2.85]) {
      const lp = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.11, 1.55, 8)), teakMat);
      lp.position.set(lx, 1.6, 2.1);
      lp.castShadow = true;
      g.add(lp);
      addHangingLantern(g, lx, 2.48, 2.1);
    }

    // Warm Dream Hill hilltop lantern & sun orb glow at sunset/night
    const dreamLight = new THREE.PointLight('#FFBE5C', 0, 15, 1.6);
    dreamLight.position.set(0.8, 3.2, 1.2);
    g.add(dreamLight);
    timeOfDay.registerWarmLight({
      light: dreamLight,
      dayIntensity: 0,
      sunsetIntensity: 2.2,
      nightIntensity: 6.0,
    });

    // Sunlit carved stone perch for Bharari overlooking the whole village (matches [2.2, 1.45, 2.8])
    const perchStone = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.32, 1.18, 12)), carvedStoneMat);
    perchStone.position.set(2.2, 0.88, 2.8);
    perchStone.castShadow = true;
    g.add(perchStone);

    return g;
  }

  const builders: Record<DestinationId, () => THREE.Group> = {
    'village-school': buildVillageSchool,
    'village-library': buildVillageLibrary,
    'activity-ground': buildActivityGround,
    'community-centre': buildCommunityCentre,
    'dream-hill': buildDreamHill,
  };

  const nodes = {} as Record<DestinationId, DestinationSceneNode>;
  const hitProxies: THREE.Mesh[] = [];

  for (const cfg of VILLAGE_DESTINATIONS) {
    const [wx, wz] = cfg.worldPosition;
    const wy = groundHeightAt(wx, wz);

    const destWrapper = new THREE.Group();
    destWrapper.name = `Destination_${cfg.id}`;
    destWrapper.position.set(wx, wy, wz);

    // Soft grounded architectural contact shadow
    const footShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(12.2, 12.2)), shadowMat);
    footShadow.rotation.x = -Math.PI / 2;
    footShadow.position.y = 0.03;
    destWrapper.add(footShadow);

    const architecture = builders[cfg.id]();
    destWrapper.add(architecture);

    // Subtle golden-accent selection & hover aura ring
    const auraMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(cfg.accentHex),
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    const auraRing = new THREE.Mesh(trackGeo(new THREE.RingGeometry(5.2, 5.72, 44)), auraMat);
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.065;
    destWrapper.add(auraRing);

    // Invisible simplified raycasting hitbox proxy on dedicated layer 1
    const hitProxy = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(5.5, 5.5, 6.4, 12)),
      trackMat(new THREE.MeshBasicMaterial({ visible: false })),
    );
    hitProxy.position.y = 2.9;
    hitProxy.layers.set(1);
    hitProxy.userData.destinationId = cfg.id;
    destWrapper.add(hitProxy);
    hitProxies.push(hitProxy);

    root.add(destWrapper);

    const [px, py, pz] = cfg.bharariPerchOffset;
    nodes[cfg.id] = {
      id: cfg.id,
      group: destWrapper,
      hitProxy,
      auraRing,
      auraMat,
      worldCenter: new THREE.Vector3(wx, wy, wz),
      pinAnchor: new THREE.Vector3(wx, wy + cfg.pinHeightOffset, wz),
      perchPosition: new THREE.Vector3(wx + px, wy + py, wz + pz),
      accentColor: new THREE.Color(cfg.accentHex),
      baseScale: 1,
    };
  }

  return {
    group: root,
    nodes,
    hitProxies,
    update: (delta, elapsed, hoveredId, selectedId) => {
      const dt = Math.min(delta, 0.05);
      const w = wind.sampleWind(0, 0, elapsed);

      for (let i = 0; i < dynamicPennants.length; i++) {
        dynamicPennants[i].rotation.y = Math.sin(elapsed * 3.4 + i * 1.2) * (0.18 + w.gust * 0.14);
      }

      for (let i = 0; i < dynamicRibbons.length; i++) {
        dynamicRibbons[i].rotation.z = Math.sin(elapsed * 2.8 + i * 0.9) * (0.12 + w.gust * 0.12);
      }

      for (const canopy of dynamicCanopies) {
        canopy.rotation.z = w.x * 0.028;
      }

      for (const cfg of VILLAGE_DESTINATIONS) {
        const node = nodes[cfg.id];
        const isHovered = hoveredId === cfg.id;
        const isSelected = selectedId === cfg.id;

        const targetScale = isHovered ? 1.028 : isSelected ? 1.012 : 1.0;
        const nextScale = THREE.MathUtils.damp(node.group.scale.x, targetScale, 8, dt);
        node.group.scale.setScalar(nextScale);

        const targetOpacity = isHovered ? 0.66 : isSelected ? 0.48 : 0.15;
        node.auraMat.opacity = THREE.MathUtils.damp(node.auraMat.opacity, targetOpacity, 8, dt);

        const ringTargetScale = isHovered
          ? 1.05 + Math.sin(elapsed * 4.0) * 0.02
          : isSelected
            ? 1.025
            : 1.0;
        const ringScale = THREE.MathUtils.damp(node.auraRing.scale.x, ringTargetScale, 8, dt);
        node.auraRing.scale.setScalar(ringScale);
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

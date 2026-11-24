import * as THREE from 'three';
import type { TimeOfDaySystem } from '../environment/timeOfDaySystem';

export interface VillageNightLightingResult {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Isolated additive rural Maharashtra architectural lighting layer for Mission Bharari Village.
 *
 * - Preserves all existing buildings, roofs, verandas, roads, terrain, Welcome Point, and
 *   Learning Kit Pavilion completely untouched (zero geometry or collider modifications).
 * - Places restrained, heritage-style brass-and-frosted-glass hanging veranda lanterns tucked
 *   directly beneath existing roof beams and eaves (zero floating elements, zero neon).
 * - Registers all lantern glass glows and lightweight non-shadow warm PointLights with the
 *   shared TimeOfDaySystem so illumination stays completely quiet in bright Day, warms softly
 *   during golden Sunset, and provides comfortable, inviting exploration visibility at Night.
 */
export function buildVillageNightLighting(
  timeOfDay: TimeOfDaySystem,
): VillageNightLightingResult {
  const group = new THREE.Group();
  group.name = 'VillageNightLighting';

  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  // Shared wrought-iron & aged-brass lantern hardware (restrained matte contrast)
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#2F2823',
      roughness: 0.62,
      metalness: 0.55,
    }),
  );
  const brassCapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#9F7842',
      roughness: 0.42,
      metalness: 0.68,
    }),
  );

  // Frosted warm oil-lamp/tungsten glass material — calm milky glass in Day, warm amber glow at Sunset/Night
  const lanternGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#E8DEC8',
      emissive: '#FFBE64',
      emissiveIntensity: 0.0,
      roughness: 0.32,
      metalness: 0.04,
    }),
  );
  timeOfDay.registerWarmGlow({
    material: lanternGlassMat,
    dayEmissive: 0.0,
    sunsetEmissive: 0.72,
    nightEmissive: 1.85,
    dayColor: new THREE.Color('#E8DEC8'),
    nightColor: new THREE.Color('#FFF2D4'),
  });

  // Shared composite hanging lantern geometries (5-part authentic rural heritage silhouette)
  const mountPlateGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 0.03, 8));
  const chainGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6));
  const hoodGeo = trackGeo(new THREE.ConeGeometry(0.145, 0.11, 8));
  const glassGeo = trackGeo(new THREE.CylinderGeometry(0.072, 0.058, 0.19, 8));
  const baseFinialGeo = trackGeo(new THREE.CylinderGeometry(0.064, 0.036, 0.045, 8));

  /**
   * Attaches a compact 5-part hanging veranda lantern directly underneath an existing beam/eave
   * at `beamBottomY` (so the mount plate sits flush against the timber beam with zero gap).
   */
  const addHangingLantern = (x: number, beamBottomY: number, z: number, chainLen = 0.24) => {
    const lg = new THREE.Group();
    lg.position.set(x, beamBottomY, z);

    const plate = new THREE.Mesh(mountPlateGeo, ironMat);
    plate.position.y = -0.015;

    const chainScale = chainLen / 0.24;
    const chain = new THREE.Mesh(chainGeo, ironMat);
    chain.scale.y = chainScale;
    chain.position.y = -0.03 - chainLen * 0.5;

    const hoodY = -0.03 - chainLen - 0.045;
    const hood = new THREE.Mesh(hoodGeo, brassCapMat);
    hood.position.y = hoodY;

    const glass = new THREE.Mesh(glassGeo, lanternGlassMat);
    glass.position.y = hoodY - 0.14;

    const finial = new THREE.Mesh(baseFinialGeo, ironMat);
    finial.position.y = hoodY - 0.25;

    lg.add(plate, chain, hood, glass, finial);
    group.add(lg);
  };

  /**
   * Registers a soft, non-shadow warm rural PointLight managed smoothly by TimeOfDaySystem.
   * Uses gentle warm tungsten-amber hue (#FFD08A) and physically comfortable range without glare.
   */
  const addWarmPoolLight = (
    x: number,
    y: number,
    z: number,
    distance: number,
    sunsetIntensity: number,
    nightIntensity: number,
    colorHex = '#FFD08A',
  ) => {
    const light = new THREE.PointLight(colorHex, 0, distance, 1.45);
    light.position.set(x, y, z);
    light.visible = false;
    group.add(light);
    timeOfDay.registerWarmLight({
      light,
      dayIntensity: 0,
      sunsetIntensity,
      nightIntensity,
    });
  };

  // ---------------------------------------------------------------------------
  // 1. VILLAGE SCHOOL FRONT VERANDA & COURTYARD STEPS
  //    Existing veranda beam sits at Z = 1.82, center Y = 0.36 + 3.45 = 3.81 (bottom ~ 3.69)
  // ---------------------------------------------------------------------------
  addHangingLantern(-7.2, 3.69, 1.82, 0.22);
  addHangingLantern(-1.8, 3.69, 1.82, 0.22);
  // Warm courtyard & veranda pool illuminating the school steps, noticeboard & front lawn
  addWarmPoolLight(-4.5, 3.2, 2.5, 22, 1.1, 3.6, '#FFD28E');

  // ---------------------------------------------------------------------------
  // 2. GARAD GRANTHALAY (LIBRARY) WEST VERANDA & STEPS
  //    Existing west veranda beam sits at X = 10.62, bottom Y = 3.69, Z ∈ [12.3, 22.7]
  // ---------------------------------------------------------------------------
  addHangingLantern(10.62, 3.69, 14.3, 0.22);
  addHangingLantern(10.62, 3.69, 20.6, 0.22);
  // Warm library entrance glow illuminating the reading porch, signage & stone crossing
  addWarmPoolLight(10.1, 3.15, 17.5, 21, 1.0, 3.4, '#FFD28E');

  // ---------------------------------------------------------------------------
  // 3. LEARNING KIT PAVILION
  //    Existing pavilion centered at (-9.0, 0, 10.6) with open timber roof eaves (~2.95m)
  // ---------------------------------------------------------------------------
  addHangingLantern(-9.0, 3.04, 10.6, 0.26);
  // Gentle warm down-light so learning kit items & info board stay comfortably readable at dusk/night
  addWarmPoolLight(-9.0, 2.55, 10.6, 14, 0.85, 2.6, '#FFD99B');

  // ---------------------------------------------------------------------------
  // 4. VILLAGE ENTRANCE ARCH & WELCOME POINT
  //    Entrance Arch main beam sits at Z = 45.5, Y = 4.18 (bottom 4.04), board X ∈ [-2.8, 2.8]
  //    Welcome Point sits at (-4.88, 0, 47.88), rotY = 0.68, eaves beam bottom Y = 2.48
  // ---------------------------------------------------------------------------
  addHangingLantern(-3.25, 4.04, 45.5, 0.28);
  addHangingLantern(3.25, 4.04, 45.5, 0.28);
  // Soft warm arrival light illuminating both the Entrance Arch and Welcome Sign face cleanly
  addWarmPoolLight(-1.6, 3.35, 47.2, 22, 1.0, 3.3, '#FFD18A');

  // ---------------------------------------------------------------------------
  // 5. VILLAGE MAIN STREET HOUSES, VILLAGE WELL & COURTYARD NEEM BENCH
  //    Discreet hanging porch lanterns tucked neatly under existing veranda roof overhangs
  //    plus 3 gentle street-spill lights for safe, warm rural walking visibility at night.
  // ---------------------------------------------------------------------------
  // House W1 (-11.4, 40.5, facing +X): veranda edge near X = -7.35, eave bottom ~2.76
  addHangingLantern(-7.6, 2.84, 40.5, 0.18);
  // House E1 (11.4, 41.2, facing -X): veranda edge near X = 7.45
  addHangingLantern(7.6, 2.8, 41.2, 0.18);
  // House W2 (-12.6, 28.4, facing +X): veranda edge near X = -8.45
  addHangingLantern(-8.55, 2.9, 28.4, 0.18);
  // House E2 (14.4, 31.2, facing -X): veranda edge near X = 10.35
  addHangingLantern(10.45, 2.82, 31.2, 0.18);
  // House W3 (-14.2, 17.6, facing +X): veranda edge near X = -10.3
  addHangingLantern(-10.35, 2.78, 17.6, 0.18);

  // Soft warm Main Street ambient pools (south street, mid-street near well, east neem bench)
  addWarmPoolLight(0.0, 3.4, 39.2, 22, 0.85, 2.8, '#FFC97B');
  addWarmPoolLight(-1.0, 3.4, 27.6, 23, 0.85, 2.85, '#FFC97B');
  addWarmPoolLight(4.2, 3.2, 8.8, 19, 0.75, 2.45, '#FFD08A');

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return { group, dispose };
}

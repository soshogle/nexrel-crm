/**
 * Netter Atlas-quality procedural tooth geometry.
 *
 * Each tooth is built by "lofting" a series of cross-sectional profiles
 * (rings of vertices) at different heights, so the shape tapers, bulges
 * at the equator, constricts at the CEJ, and terminates with anatomically
 * correct cusps / incisal edges.  Roots taper to an apex with natural
 * curvature.  Proportions follow Wheeler's Dental Anatomy.
 *
 * Tooth numbering uses the Universal system (1-32).
 */

import * as THREE from 'three';

// ─── Public types ────────────────────────────────────────────────────────────

export type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

// ─── Helpers: position, rotation, classification ─────────────────────────────

export function getToothType(n: number): ToothType {
  const x = ((n - 1) % 16) + 1;
  if (x <= 3 || x >= 14) return 'molar';
  if (x <= 5 || x >= 12) return 'premolar';
  if (x === 6 || x === 11) return 'canine';
  return 'incisor';
}

export function getArchPosition(n: number): [number, number, number] {
  const archWidth = 7, archDepth = 3.5;
  const isUpper = n <= 16;
  const t = isUpper ? (n - 1) / 15 : (32 - n) / 15;
  const angle = (t - 0.5) * Math.PI;
  return [
    Math.sin(angle) * archWidth * 0.5,
    isUpper ? 0.7 : -0.7,
    -Math.cos(angle) * archDepth + archDepth * 0.5,
  ];
}

export function getToothRotation(n: number): number {
  const isUpper = n <= 16;
  const t = isUpper ? (n - 1) / 15 : (32 - n) / 15;
  return (t - 0.5) * Math.PI;
}

// ─── Dimension tables (Wheeler's, scaled to scene units) ─────────────────────

export function getCrownHeight(type: ToothType): number {
  switch (type) {
    case 'molar':    return 0.30;
    case 'premolar': return 0.32;
    case 'canine':   return 0.40;
    case 'incisor':  return 0.36;
  }
}

export function getRootHeight(type: ToothType): number {
  switch (type) {
    case 'molar':    return 0.48;
    case 'premolar': return 0.46;
    case 'canine':   return 0.58;
    case 'incisor':  return 0.44;
  }
}

export function getGumRadius(type: ToothType): number {
  switch (type) {
    case 'molar':    return 0.22;
    case 'premolar': return 0.17;
    case 'canine':   return 0.13;
    case 'incisor':  return 0.15;
  }
}

// ─── Lofting engine ──────────────────────────────────────────────────────────

interface LoftSlice {
  /** Normalised height 0 (bottom) → 1 (top) */
  t: number;
  /** Returns [x, z] radius at a given angle θ ∈ [0, 2π) */
  profile: (theta: number) => [number, number];
}

const TWO_PI = Math.PI * 2;

/**
 * Build a closed BufferGeometry by sweeping cross-section profiles
 * along the Y-axis.  Segments = angular resolution, slices define
 * the vertical stations.
 */
function loft(
  slices: LoftSlice[],
  totalHeight: number,
  segments: number = 24,
  capTop: boolean = true,
  capBottom: boolean = true,
): THREE.BufferGeometry {
  const verts: number[] = [];
  const idx: number[] = [];

  // Generate ring vertices
  for (const slice of slices) {
    const y = slice.t * totalHeight;
    for (let s = 0; s < segments; s++) {
      const theta = (s / segments) * TWO_PI;
      const [x, z] = slice.profile(theta);
      verts.push(x, y, z);
    }
  }

  const rings = slices.length;

  // Stitch adjacent rings
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * segments + s;
      const b = r * segments + (s + 1) % segments;
      const c = (r + 1) * segments + s;
      const d = (r + 1) * segments + (s + 1) % segments;
      idx.push(a, c, b);
      idx.push(b, c, d);
    }
  }

  // Bottom cap (fan from center)
  if (capBottom) {
    const ci = verts.length / 3;
    const [cx, cz] = slices[0].profile(0); // approximate center
    verts.push(0, slices[0].t * totalHeight, 0);
    for (let s = 0; s < segments; s++) {
      const a = s;
      const b = (s + 1) % segments;
      idx.push(ci, b, a);
    }
  }

  // Top cap (fan from center)
  if (capTop) {
    const topRingStart = (rings - 1) * segments;
    const ci = verts.length / 3;
    verts.push(0, slices[rings - 1].t * totalHeight, 0);
    for (let s = 0; s < segments; s++) {
      const a = topRingStart + s;
      const b = topRingStart + (s + 1) % segments;
      idx.push(ci, a, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ─── Profile helpers ─────────────────────────────────────────────────────────

/**
 * Super-ellipse with controllable "squareness" (n=2 is normal ellipse,
 * n>2 produces rounded-rectangle shapes typical of molar cross-sections).
 */
function superEllipse(
  rx: number, rz: number, n: number, theta: number,
): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const signC = c >= 0 ? 1 : -1;
  const signS = s >= 0 ? 1 : -1;
  return [
    signC * rx * Math.pow(Math.abs(c), 2 / n),
    signS * rz * Math.pow(Math.abs(s), 2 / n),
  ];
}

/**
 * Gaussian peak centered at `center` with spread `sigma`.
 */
function gauss(theta: number, center: number, sigma: number, amp: number): number {
  let d = theta - center;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return amp * Math.exp(-0.5 * (d / sigma) * (d / sigma));
}

// ─── Crown geometry builders ─────────────────────────────────────────────────

function molarCrownSlices(): LoftSlice[] {
  // Wheeler's molar: wider BL (z) than MD (x), rectangular with rounded corners.
  // MD ~10mm → rx ≈ 0.20, BL ~11mm → rz ≈ 0.22 at equator
  const cej:     (t: number) => [number, number] = (t) => superEllipse(0.17, 0.18, 3.5, t);
  const lower:   (t: number) => [number, number] = (t) => superEllipse(0.20, 0.22, 3.2, t);
  const equator: (t: number) => [number, number] = (t) => superEllipse(0.22, 0.24, 3.0, t);
  const upper:   (t: number) => [number, number] = (t) => superEllipse(0.20, 0.22, 3.0, t);
  const occlusal: (t: number) => [number, number] = (theta) => {
    const [bx, bz] = superEllipse(0.19, 0.21, 3.2, theta);
    // 4 cusps at roughly 45°, 135°, 225°, 315° (corners of the rectangle)
    const cuspBulge =
      gauss(theta, Math.PI * 0.25,  0.35, 0.03) +
      gauss(theta, Math.PI * 0.75,  0.35, 0.03) +
      gauss(theta, Math.PI * 1.25,  0.35, 0.03) +
      gauss(theta, Math.PI * 1.75,  0.35, 0.03);
    const r = Math.sqrt(bx * bx + bz * bz) + cuspBulge;
    return [Math.cos(theta) * r * (Math.abs(bx) / (Math.abs(bx) + 1e-6)),
            Math.sin(theta) * r * (Math.abs(bz) / (Math.abs(bz) + 1e-6))];
  };

  // Simpler cusp ring: project radial bumps outward from the base profile
  const occRing: (theta: number) => [number, number] = (theta) => {
    const [bx, bz] = superEllipse(0.18, 0.20, 3.2, theta);
    const bump =
      gauss(theta, Math.PI * 0.25,  0.3, 0.035) +
      gauss(theta, Math.PI * 0.75,  0.3, 0.035) +
      gauss(theta, Math.PI * 1.25,  0.3, 0.035) +
      gauss(theta, Math.PI * 1.75,  0.3, 0.035);
    const scale = 1 + bump / Math.max(Math.sqrt(bx * bx + bz * bz), 0.01);
    return [bx * scale, bz * scale];
  };

  return [
    { t: 0.00, profile: cej },
    { t: 0.15, profile: lower },
    { t: 0.40, profile: equator },
    { t: 0.65, profile: upper },
    { t: 0.85, profile: occRing },
    { t: 1.00, profile: occRing },
  ];
}

function premolarCrownSlices(): LoftSlice[] {
  // Oval cross-section, narrower MD, 2 cusps (buccal + lingual)
  const cej:     (t: number) => [number, number] = (t) => superEllipse(0.13, 0.15, 2.5, t);
  const equator: (t: number) => [number, number] = (t) => superEllipse(0.16, 0.18, 2.3, t);
  const upper:   (t: number) => [number, number] = (t) => superEllipse(0.14, 0.16, 2.4, t);
  const occRing: (theta: number) => [number, number] = (theta) => {
    const [bx, bz] = superEllipse(0.13, 0.15, 2.5, theta);
    // 2 cusps along z-axis (buccal / lingual)
    const bump =
      gauss(theta, Math.PI * 0.5,  0.35, 0.03) +
      gauss(theta, Math.PI * 1.5,  0.35, 0.03);
    const scale = 1 + bump / Math.max(Math.sqrt(bx * bx + bz * bz), 0.01);
    return [bx * scale, bz * scale];
  };

  return [
    { t: 0.00, profile: cej },
    { t: 0.20, profile: (t) => superEllipse(0.15, 0.17, 2.4, t) },
    { t: 0.45, profile: equator },
    { t: 0.70, profile: upper },
    { t: 0.90, profile: occRing },
    { t: 1.00, profile: occRing },
  ];
}

function canineCrownSlices(): LoftSlice[] {
  // Triangular / pointed, narrow MD, prominent labial ridge
  const cej:     (t: number) => [number, number] = (t) => superEllipse(0.10, 0.11, 2.2, t);
  const equator: (t: number) => [number, number] = (t) => {
    const [x, z] = superEllipse(0.13, 0.13, 2.0, t);
    // Labial ridge at θ ≈ π/2 (front face)
    const ridge = gauss(t, Math.PI * 0.5, 0.5, 0.02);
    const s = 1 + ridge / Math.max(Math.sqrt(x * x + z * z), 0.01);
    return [x * s, z * s];
  };
  const upper: (t: number) => [number, number] = (t) => superEllipse(0.10, 0.10, 2.0, t);

  // Cusp tip — single pointed peak, compressed toward a small circle
  const cuspRing: (theta: number) => [number, number] = (theta) => {
    return superEllipse(0.04, 0.04, 2.0, theta);
  };

  return [
    { t: 0.00, profile: cej },
    { t: 0.18, profile: (t) => superEllipse(0.12, 0.12, 2.1, t) },
    { t: 0.45, profile: equator },
    { t: 0.70, profile: upper },
    { t: 0.88, profile: (t) => superEllipse(0.07, 0.07, 2.0, t) },
    { t: 1.00, profile: cuspRing },
  ];
}

function incisorCrownSlices(): LoftSlice[] {
  // Wide MD, thin BL (shovel-shaped). Incisal edge is wide & thin.
  const cej:     (t: number) => [number, number] = (t) => superEllipse(0.12, 0.07, 2.3, t);
  const equator: (t: number) => [number, number] = (t) => superEllipse(0.15, 0.08, 2.0, t);
  const upper:   (t: number) => [number, number] = (t) => superEllipse(0.14, 0.06, 2.0, t);
  // Incisal edge — wide and very thin
  const incisal: (theta: number) => [number, number] = (theta) => superEllipse(0.14, 0.03, 2.0, theta);

  return [
    { t: 0.00, profile: cej },
    { t: 0.20, profile: (t) => superEllipse(0.14, 0.08, 2.1, t) },
    { t: 0.50, profile: equator },
    { t: 0.75, profile: upper },
    { t: 0.92, profile: (t) => superEllipse(0.14, 0.04, 2.0, t) },
    { t: 1.00, profile: incisal },
  ];
}

// ─── Root geometry builders ──────────────────────────────────────────────────

function rootSlices(type: ToothType): LoftSlice[] {
  // Root starts wide at CEJ (bottom of root = t=0) and tapers to apex (t=1).
  // Cross-section is an ellipse that narrows toward the tip.
  const dims = {
    molar:    { rx: 0.10, rz: 0.10 },
    premolar: { rx: 0.08, rz: 0.07 },
    canine:   { rx: 0.07, rz: 0.06 },
    incisor:  { rx: 0.06, rz: 0.04 },
  }[type];

  const { rx, rz } = dims;

  return [
    { t: 0.00, profile: (t) => superEllipse(rx, rz, 2.2, t) },
    { t: 0.20, profile: (t) => superEllipse(rx * 0.85, rz * 0.85, 2.1, t) },
    { t: 0.50, profile: (t) => superEllipse(rx * 0.60, rz * 0.55, 2.0, t) },
    { t: 0.75, profile: (t) => superEllipse(rx * 0.35, rz * 0.30, 2.0, t) },
    { t: 0.92, profile: (t) => superEllipse(rx * 0.15, rz * 0.12, 2.0, t) },
    { t: 1.00, profile: (t) => superEllipse(0.01, 0.01, 2.0, t) },
  ];
}

// ─── Occlusal cap with cusp heights ─────────────────────────────────────────

/**
 * Build a disc cap where vertex Y values are modulated to create cusp peaks
 * and fissure valleys.  Attached as a separate mesh on top of the crown.
 */
function buildOcclusalCap(
  type: ToothType,
  segments: number = 24,
  radialRings: number = 6,
): THREE.BufferGeometry {
  const crownH = getCrownHeight(type);
  const verts: number[] = [];
  const idx: number[] = [];

  // Height modulation at the occlusal surface based on tooth type
  const cuspHeight = (theta: number, r: number): number => {
    switch (type) {
      case 'molar': {
        // 4 cusps: MB, ML, DB, DL at ~45/135/225/315°
        const cusps =
          gauss(theta, Math.PI * 0.25,  0.30, 0.06) +
          gauss(theta, Math.PI * 0.75,  0.30, 0.05) +
          gauss(theta, Math.PI * 1.25,  0.30, 0.05) +
          gauss(theta, Math.PI * 1.75,  0.30, 0.04);
        // Central fossa depression
        const fossa = (1 - r) * 0.03;
        return cusps * r - fossa;
      }
      case 'premolar': {
        // 2 cusps: buccal + lingual
        const cusps =
          gauss(theta, Math.PI * 0.5,  0.40, 0.055) +
          gauss(theta, Math.PI * 1.5,  0.40, 0.045);
        const fossa = (1 - r) * 0.025;
        return cusps * r - fossa;
      }
      case 'canine': {
        // Single pointed cusp tip — peak at center
        return r < 0.3 ? 0.06 * (1 - r / 0.3) : 0;
      }
      case 'incisor': {
        // Thin incisal edge — slight ridge along the MD axis
        const edge = gauss(theta, 0, 0.8, 0.02) + gauss(theta, Math.PI, 0.8, 0.02);
        return edge * r * 0.5;
      }
    }
  };

  // Get the profile ring from the crown's top slice to match edge
  const getTopProfile = (theta: number): [number, number] => {
    switch (type) {
      case 'molar':    return superEllipse(0.18, 0.20, 3.2, theta);
      case 'premolar': return superEllipse(0.13, 0.15, 2.5, theta);
      case 'canine':   return superEllipse(0.04, 0.04, 2.0, theta);
      case 'incisor':  return superEllipse(0.14, 0.03, 2.0, theta);
    }
  };

  // Center vertex
  const centerY = crownH + cuspHeight(0, 0);
  verts.push(0, centerY, 0);

  for (let ring = 1; ring <= radialRings; ring++) {
    const rFrac = ring / radialRings;
    for (let s = 0; s < segments; s++) {
      const theta = (s / segments) * TWO_PI;
      const [ex, ez] = getTopProfile(theta);
      const x = ex * rFrac;
      const z = ez * rFrac;
      const y = crownH + cuspHeight(theta, rFrac);
      verts.push(x, y, z);
    }
  }

  // Triangles: center fan
  for (let s = 0; s < segments; s++) {
    const a = 1 + s;
    const b = 1 + (s + 1) % segments;
    idx.push(0, a, b);
  }

  // Ring-to-ring triangles
  for (let ring = 1; ring < radialRings; ring++) {
    const offset0 = 1 + (ring - 1) * segments;
    const offset1 = 1 + ring * segments;
    for (let s = 0; s < segments; s++) {
      const a = offset0 + s;
      const b = offset0 + (s + 1) % segments;
      const c = offset1 + s;
      const d = offset1 + (s + 1) % segments;
      idx.push(a, c, b);
      idx.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Anatomical crown geometry — lofted body with cusps.
 * Origin at CEJ, extends upward to occlusal surface.
 */
export function createCrownGeometry(type: ToothType): THREE.BufferGeometry {
  const slices = {
    molar:    molarCrownSlices,
    premolar: premolarCrownSlices,
    canine:   canineCrownSlices,
    incisor:  incisorCrownSlices,
  }[type]();

  const h = getCrownHeight(type);
  return loft(slices, h, 28, false, true);
}

/**
 * Occlusal cap that sits on top of the crown body to provide
 * cusp peaks, fissures, and ridges.
 */
export function createOcclusalGeometry(type: ToothType): THREE.BufferGeometry {
  return buildOcclusalCap(type, 28, 6);
}

/**
 * Anatomical root geometry — tapers from CEJ to apex.
 * Origin at CEJ, extends upward (caller flips for upper/lower teeth).
 */
export function createRootGeometry(type: ToothType): THREE.BufferGeometry {
  const slices = rootSlices(type);
  const h = getRootHeight(type);
  return loft(slices, h, 20, true, false);
}

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FrameBudgetMonitor, getInitialQuality } from '../quality';

export interface HeroSceneMetrics {
  active: boolean;
  paused: boolean;
  dpr: number;
  isSoftwareGl: boolean;
  fps: number;
  lastFrameMs: number;
  geometries: number;
  textures: number;
  triangles: number;
  fallbackReason?: string;
}

export interface HeroSceneController {
  pause: () => void;
  resume: () => void;
  dispose: () => void;
  getMetrics: () => HeroSceneMetrics;
  triggerLostContextSim?: () => void;
}

// Reusable scratch state to keep RAF loop 0-GC
const pointerTarget = { x: 0, y: 0 };
const pointerCurrent = { x: 0, y: 0 };
const _dummy = new THREE.Object3D();

function createHammeredBrassTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    // Deterministic hammered dimples
    let seed = 4219;
    const next = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 240; i++) {
      const x = next() * size;
      const y = next() * size;
      const r = 6 + next() * 10;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(55, 55, 55, 0.72)');
      grad.addColorStop(0.65, 'rgba(165, 165, 165, 0.45)');
      grad.addColorStop(1, 'rgba(128, 128, 128, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.48);
    grad.addColorStop(0, 'rgba(43, 26, 18, 0.58)');
    grad.addColorStop(0.55, 'rgba(43, 26, 18, 0.22)');
    grad.addColorStop(1, 'rgba(43, 26, 18, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCashewGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, -0.02);
  shape.bezierCurveTo(-0.09, 0.08, 0.02, 0.12, 0.09, 0.04);
  shape.bezierCurveTo(0.11, 0.01, 0.08, -0.03, 0.04, -0.01);
  shape.bezierCurveTo(0.0, 0.01, -0.03, -0.01, -0.03, -0.05);
  shape.bezierCurveTo(-0.04, -0.08, -0.08, -0.06, -0.08, -0.02);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.018,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.center();
  return geo;
}

function createCurryLeafGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.11);
  shape.quadraticCurveTo(0.055, -0.02, 0, 0.11);
  shape.quadraticCurveTo(-0.055, -0.02, 0, -0.11);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

export function mountHeroScene(
  container: HTMLElement,
  opts: {
    onMetrics?: (m: HeroSceneMetrics) => void;
    onFallback?: (reason: string) => void;
    afterDraw?: (metrics: HeroSceneMetrics) => void;
  } = {}
): HeroSceneController {
  const canvas = document.createElement('canvas');
  canvas.className = 'w-full h-full block';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!gl) {
    canvas.remove();
    throw new Error('WebGL2 context unavailable');
  }

  const quality = getInitialQuality(gl);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: gl,
    antialias: !quality.isSoftwareGl,
    alpha: true,
  });
  renderer.setPixelRatio(quality.dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();

  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);

  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 30);
  camera.position.set(0, 2.25, 4.15);
  camera.lookAt(0, 0.24, 0);

  // Studio Environment Map (RoomEnvironment)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.78;
  roomEnv.dispose();
  pmrem.dispose();

  // Warm fill + directional key lighting (max 2 lights per Section M; RoomEnvironment IBL handles brass rim)
  const hemi = new THREE.HemisphereLight(0xfff6e5, 0x5c3a21, 0.72);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xffeed4, 2.35);
  keyLight.position.set(3.2, 4.5, 2.8);
  scene.add(keyLight);

  const trackedGeometries: THREE.BufferGeometry[] = [];
  const trackedMaterials: THREE.Material[] = [];
  const trackedTextures: THREE.Texture[] = [];

  // Contact shadow grounding plane
  const shadowTex = createContactShadowTexture();
  shadowTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.45,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.06;
  scene.add(shadowPlane);
  trackedTextures.push(shadowTex);
  trackedGeometries.push(shadowGeo);
  trackedMaterials.push(shadowMat);

  // Composite brass bowl & spiced snack hero assembly
  const heroGroup = new THREE.Group();
  scene.add(heroGroup);

  // 0. Travertine Coaster Base Ring (grounded at y = -0.04)
  const plinthProfile = [
    new THREE.Vector2(0.0, -0.05),
    new THREE.Vector2(0.95, -0.05),
    new THREE.Vector2(0.98, -0.02),
    new THREE.Vector2(0.94, 0.0),
    new THREE.Vector2(0.0, 0.0),
  ];
  const plinthGeo = new THREE.LatheGeometry(plinthProfile, 48);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0xe9decb,
    roughness: 0.85,
    metalness: 0.02,
  });
  heroGroup.add(new THREE.Mesh(plinthGeo, plinthMat));
  trackedGeometries.push(plinthGeo);
  trackedMaterials.push(plinthMat);

  // 1. Hammered Brass Katori with procedural bump/roughness
  const brassTex = createHammeredBrassTexture();
  brassTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const bowlProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.68, 0.0),
    new THREE.Vector2(0.74, 0.08),
    new THREE.Vector2(1.06, 0.34),
    new THREE.Vector2(1.24, 0.74),
    new THREE.Vector2(1.31, 0.86),
    new THREE.Vector2(1.25, 0.90),
    new THREE.Vector2(1.18, 0.80),
    new THREE.Vector2(0.95, 0.38),
    new THREE.Vector2(0.55, 0.16),
    new THREE.Vector2(0.0, 0.14),
  ];
  const bowlGeo = new THREE.LatheGeometry(bowlProfile, 48);
  const brassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd49b35,
    metalness: 0.88,
    roughness: 0.24,
    bumpMap: brassTex,
    bumpScale: 0.015,
    roughnessMap: brassTex,
    clearcoat: 0.24,
    clearcoatRoughness: 0.28,
  });
  heroGroup.add(new THREE.Mesh(bowlGeo, brassMat));
  trackedTextures.push(brassTex);
  trackedGeometries.push(bowlGeo);
  trackedMaterials.push(brassMat);

  // 2. Spiced Sev Mound + Crispy Sev Ribbons
  const moundGeo = new THREE.SphereGeometry(0.92, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);
  moundGeo.scale(1.0, 0.42, 1.0);
  const sevMat = new THREE.MeshStandardMaterial({
    color: 0xdba028,
    roughness: 0.72,
    metalness: 0.04,
  });
  const mound = new THREE.Mesh(moundGeo, sevMat);
  mound.position.y = 0.56;
  heroGroup.add(mound);
  trackedGeometries.push(moundGeo);
  trackedMaterials.push(sevMat);

  const strandGeo = new THREE.TorusKnotGeometry(0.42, 0.045, 72, 8, 3, 5);
  strandGeo.scale(1.35, 0.48, 1.35);
  const strandMat = new THREE.MeshStandardMaterial({
    color: 0xe6ad32,
    roughness: 0.54,
    metalness: 0.06,
  });
  const strands = new THREE.Mesh(strandGeo, strandMat);
  strands.position.y = 0.72;
  heroGroup.add(strands);
  trackedGeometries.push(strandGeo);
  trackedMaterials.push(strandMat);

  // 3. Sculpted Crescent Cashews, Crisp Curry Leaves, and Boondi
  const cashewGeo = createCashewGeometry();
  const leafGeo = createCurryLeafGeometry();
  const boondiGeo = new THREE.SphereGeometry(0.068, 14, 12);

  const cashewMat = new THREE.MeshStandardMaterial({ color: 0xf4dcab, roughness: 0.44 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x386636, roughness: 0.48 });
  const boondiMat = new THREE.MeshStandardMaterial({ color: 0xb93815, roughness: 0.42 });

  trackedGeometries.push(cashewGeo, leafGeo, boondiGeo);
  trackedMaterials.push(cashewMat, leafMat, boondiMat);

  const cashews: Array<[number, number, number, number]> = [
    [-0.36, 0.94, 0.22, 0.4],
    [0.34, 0.96, -0.18, -0.8],
    [0.04, 1.0, 0.28, 1.2],
  ];
  for (const [x, y, z, ry] of cashews) {
    const c = new THREE.Mesh(cashewGeo, cashewMat);
    c.position.set(x, y, z);
    c.rotation.set(Math.PI * 0.42, ry, 0.2);
    heroGroup.add(c);
  }

  const leaves: Array<[number, number, number, number]> = [
    [0.14, 0.96, -0.04, 0.6],
    [-0.14, 0.97, 0.08, -0.9],
  ];
  for (const [x, y, z, ry] of leaves) {
    const l = new THREE.Mesh(leafGeo, leafMat);
    l.position.set(x, y, z);
    l.rotation.set(Math.PI * 0.46, ry, 0.15);
    heroGroup.add(l);
  }

  const boondiSpots: Array<[number, number, number]> = [
    [-0.18, 0.91, -0.35],
    [0.48, 0.86, 0.24],
    [-0.52, 0.84, -0.05],
    [0.24, 0.93, 0.32],
  ];
  for (const [x, y, z] of boondiSpots) {
    const b = new THREE.Mesh(boondiGeo, boondiMat);
    b.position.set(x, y, z);
    heroGroup.add(b);
  }

  // 4. InstancedMesh: 48 roasted sesame & masala grains (1 draw call)
  const seedGeo = new THREE.OctahedronGeometry(0.022, 0);
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 });
  const seedCount = 48;
  const seedInst = new THREE.InstancedMesh(seedGeo, seedMat, seedCount);
  let seedVal = 9173;
  const rnd = () => {
    seedVal = (seedVal * 16807) % 2147483647;
    return (seedVal - 1) / 2147483646;
  };
  for (let i = 0; i < seedCount; i++) {
    const angle = rnd() * Math.PI * 2;
    const rad = Math.sqrt(rnd()) * 0.72;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = 0.88 + Math.max(0, 1 - rad * 1.1) * 0.14;
    const scl = 0.85 + rnd() * 0.35;
    _dummy.position.set(x, y, z);
    _dummy.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    _dummy.scale.set(scl * 1.3, scl * 0.7, scl);
    _dummy.updateMatrix();
    seedInst.setMatrixAt(i, _dummy.matrix);
  }
  seedInst.instanceMatrix.needsUpdate = true;
  seedInst.computeBoundingSphere();
  heroGroup.add(seedInst);
  trackedGeometries.push(seedGeo);
  trackedMaterials.push(seedMat);

  // Orbit subtle tilt on pointer move
  const onPointerMove = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerTarget.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerTarget.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  const monitor = new FrameBudgetMonitor();
  let rafId = 0;
  let paused = false;
  let visibleInViewport = true;
  let disposed = false;
  let lastNow = performance.now();
  let fps = 60;
  let lastFrameMs = 16;
  let drewInitialSoftwareFrame = false;
  let currentDpr = quality.dpr;

  const buildMetrics = (fallbackReason?: string): HeroSceneMetrics => ({
    active: !disposed && !fallbackReason,
    paused,
    dpr: currentDpr,
    isSoftwareGl: quality.isSoftwareGl,
    fps: Math.round(fps),
    lastFrameMs: Number(lastFrameMs.toFixed(1)),
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    triangles: renderer.info.render.triangles,
    fallbackReason,
  });

  const renderOnce = (dtSec: number) => {
    pointerCurrent.x = THREE.MathUtils.damp(pointerCurrent.x, pointerTarget.x, 5.5, dtSec);
    pointerCurrent.y = THREE.MathUtils.damp(pointerCurrent.y, pointerTarget.y, 5.5, dtSec);

    heroGroup.rotation.y += dtSec * 0.26;
    heroGroup.rotation.x = 0.08 + pointerCurrent.y * 0.09;
    heroGroup.rotation.z = -pointerCurrent.x * 0.06;

    renderer.render(scene, camera);
  };

  const loop = (now: number) => {
    if (disposed || paused || !visibleInViewport) return;

    const frameStart = performance.now();
    const dtSec = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
    lastNow = now;

    renderOnce(dtSec);

    const frameCost = performance.now() - frameStart;
    lastFrameMs = frameCost;
    fps = Math.min(120, 1000 / Math.max(8, now - (now - dtSec * 1000)));

    if (quality.isSoftwareGl && !drewInitialSoftwareFrame) {
      drewInitialSoftwareFrame = true;
      opts.afterDraw?.(buildMetrics());
      paused = true;
      opts.onMetrics?.(buildMetrics());
      return;
    }

    const decision = monitor.recordFrame(frameCost);
    if (decision === 'downgrade') {
      currentDpr = 1;
      renderer.setPixelRatio(1);
    } else if (decision === 'abort') {
      const m = buildMetrics('Frame budget exceeded 24ms after DPR downgrade');
      opts.onMetrics?.(m);
      opts.onFallback?.(m.fallbackReason!);
      dispose();
      return;
    }

    opts.onMetrics?.(buildMetrics());
    rafId = requestAnimationFrame(loop);
  };

  const resizeObserver = new ResizeObserver(() => {
    if (disposed) return;
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (paused) {
      renderer.render(scene, camera);
    }
  });
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      visibleInViewport = Boolean(entry?.isIntersecting);
      if (visibleInViewport && !paused && !disposed && !rafId) {
        lastNow = performance.now();
        rafId = requestAnimationFrame(loop);
      } else if (!visibleInViewport && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
    { threshold: 0.05 }
  );
  intersectionObserver.observe(container);

  const onVisibility = () => {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!document.hidden && !paused && visibleInViewport && !disposed && !rafId) {
      lastNow = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onContextLost = (e: Event) => {
    e.preventDefault();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    const m = buildMetrics('WebGL context lost');
    opts.onMetrics?.(m);
    opts.onFallback?.(m.fallbackReason!);
  };
  const onContextRestored = () => {
    if (!disposed && !paused) {
      lastNow = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  };
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  const pause = () => {
    paused = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    opts.onMetrics?.(buildMetrics());
  };

  const resume = () => {
    if (disposed) return;
    paused = false;
    lastNow = performance.now();
    if (!rafId) rafId = requestAnimationFrame(loop);
    opts.onMetrics?.(buildMetrics());
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();

    for (const g of trackedGeometries) g.dispose();
    for (const m of trackedMaterials) m.dispose();
    for (const t of trackedTextures) t.dispose();
    envTarget.dispose();
    renderer.dispose();
    canvas.remove();
    opts.onMetrics?.(buildMetrics());
  };

  renderOnce(0.016);
  opts.onMetrics?.(buildMetrics());
  rafId = requestAnimationFrame(loop);

  return {
    pause,
    resume,
    dispose,
    getMetrics: () => buildMetrics(),
    triggerLostContextSim: () => {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    },
  };
}

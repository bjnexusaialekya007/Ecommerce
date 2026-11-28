import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { build, transform } from 'esbuild';

const DIST_ASSETS = path.resolve(process.cwd(), 'dist/assets');
if (!fs.existsSync(DIST_ASSETS)) {
  console.error('❌ dist/assets not found. Run npm run build first.');
  process.exit(1);
}

const MAIN_ENTRY_LIMIT_KB = 170;
const HERO_3D_LIMIT_KB = 180;
const STORY_GSAP_LIMIT_KB = 55;
const TIER0_JS_LIMIT_KB = 4;
const TIER0_CSS_LIMIT_KB = 3;

const files = fs.readdirSync(DIST_ASSETS);
let mainEntryGzKb = 0;
let mainEntryContent = '';
let hero3dGzKb = 0;
let storyGsapGzKb = 0;
let totalJsGzKb = 0;
let totalCssGzKb = 0;

for (const name of files) {
  const fullPath = path.join(DIST_ASSETS, name);
  if (!fs.statSync(fullPath).isFile()) continue;
  const buf = fs.readFileSync(fullPath);
  const gzBytes = zlib.gzipSync(buf).byteLength;
  const gzKb = gzBytes / 1024;

  if (name.endsWith('.js')) {
    totalJsGzKb += gzKb;
    if (name.startsWith('index-')) {
      mainEntryGzKb = gzKb;
      mainEntryContent = buf.toString('utf-8');
    }
    if (name.startsWith('HeroScene-')) hero3dGzKb = gzKb;
    if (
      name.startsWith('Story-') ||
      name.startsWith('gsap-') ||
      name.startsWith('HeroText-') ||
      name.startsWith('reveals-')
    ) {
      storyGsapGzKb += gzKb;
    }
    console.log(`  JS  ${name.padEnd(36)} ${gzKb.toFixed(1)} KB gzip`);
  } else if (name.endsWith('.css')) {
    totalCssGzKb += gzKb;
    console.log(`  CSS ${name.padEnd(36)} ${gzKb.toFixed(1)} KB gzip`);
  }
}

// Measure Tier 0 JS (src/experience/tier.ts + tier0/*) and Tier 0 CSS separately per Section M9.6.2
const tier0Entry = `
export * from './src/experience/tier';
export * from './src/experience/tier0/transitions';
export * from './src/experience/tier0/FlyToCart';
export * from './src/experience/tier0/PrefetchLink';
export * from './src/experience/tier0/haptics';
`;

const tier0JsBuild = await build({
  stdin: {
    contents: tier0Entry,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  minify: true,
  write: false,
  format: 'esm',
  external: [
    'react',
    'react-dom',
    'react-router-dom',
    './src/routes/*',
    './src/api',
    '../routes/*',
    '../../routes/*',
    '../../api',
  ],
});

const tier0JsGzKb = zlib.gzipSync(Buffer.from(tier0JsBuild.outputFiles[0].contents)).byteLength / 1024;
const tier0CssRaw = fs.readFileSync(path.resolve(process.cwd(), 'src/experience/tier0/effects.css'), 'utf-8');
const tier0CssMin = await transform(tier0CssRaw, { loader: 'css', minify: true });
const tier0CssGzKb = zlib.gzipSync(Buffer.from(tier0CssMin.code, 'utf-8')).byteLength / 1024;

// Honest metric: every JS file the home page loads up front (entry script + modulepreload links in dist/index.html).
// Measuring only index-*.js is misleading once code is split into shared chunks that still load on first paint.
const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'dist/index.html'), 'utf-8');
const initialFiles = [...new Set([...indexHtml.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]!))];
const initialJsGzKb = initialFiles.reduce((sum, f) => sum + zlib.gzipSync(fs.readFileSync(path.join(DIST_ASSETS, f))).byteLength / 1024, 0);

console.log(`\nInitial JS gzip    : ${initialJsGzKb.toFixed(1)} KB across ${initialFiles.length} files (limit <= ${MAIN_ENTRY_LIMIT_KB} KB)`);
console.log(`Main entry JS gzip : ${mainEntryGzKb.toFixed(1)} KB (index-*.js only, informational)`);
console.log(`Tier 0 JS gzip     : ${tier0JsGzKb.toFixed(2)} KB (limit <= ${TIER0_JS_LIMIT_KB} KB)`);
console.log(`Tier 0 CSS gzip    : ${tier0CssGzKb.toFixed(2)} KB (limit <= ${TIER0_CSS_LIMIT_KB} KB)`);
if (hero3dGzKb > 0) console.log(`3D Hero JS gzip    : ${hero3dGzKb.toFixed(1)} KB (limit <= ${HERO_3D_LIMIT_KB} KB)`);
if (storyGsapGzKb > 0) console.log(`GSAP Story JS gzip : ${storyGsapGzKb.toFixed(1)} KB (limit <= ${STORY_GSAP_LIMIT_KB} KB)`);
console.log(`Total JS gzip      : ${totalJsGzKb.toFixed(1)} KB`);
console.log(`Total CSS gzip     : ${totalCssGzKb.toFixed(1)} KB`);

if (mainEntryGzKb <= 0) {
  console.error('❌ Main entry JS chunk (index-*.js) not found in dist/assets.');
  process.exit(1);
}
if (initialJsGzKb > MAIN_ENTRY_LIMIT_KB) {
  console.error(`❌ Initial JS (${initialJsGzKb.toFixed(1)} KB) exceeds ${MAIN_ENTRY_LIMIT_KB} KB gzip budget.`);
  process.exit(1);
}
if (tier0JsGzKb > TIER0_JS_LIMIT_KB) {
  console.error(`❌ Tier 0 JS (${tier0JsGzKb.toFixed(2)} KB) exceeds ${TIER0_JS_LIMIT_KB} KB gzip budget.`);
  process.exit(1);
}
if (tier0CssGzKb > TIER0_CSS_LIMIT_KB) {
  console.error(`❌ Tier 0 CSS (${tier0CssGzKb.toFixed(2)} KB) exceeds ${TIER0_CSS_LIMIT_KB} KB gzip budget.`);
  process.exit(1);
}
if (hero3dGzKb > HERO_3D_LIMIT_KB) {
  console.error(`❌ 3D Hero chunk (${hero3dGzKb.toFixed(1)} KB) exceeds ${HERO_3D_LIMIT_KB} KB gzip budget.`);
  process.exit(1);
}
if (storyGsapGzKb > STORY_GSAP_LIMIT_KB) {
  console.error(`❌ GSAP Story chunk (${storyGsapGzKb.toFixed(1)} KB) exceeds ${STORY_GSAP_LIMIT_KB} KB gzip budget.`);
  process.exit(1);
}

// Verify Tier 1 & Tier 2 libraries do not leak into main entry closure
if (/THREE\.|WebGLRenderer|ScrollTrigger/.test(mainEntryContent)) {
  console.error('❌ Tier 1/2 code detected inside main entry chunk.');
  process.exit(1);
}

console.log('✅ Bundle budget check passed.');

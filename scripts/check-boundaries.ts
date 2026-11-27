import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve(process.cwd(), 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(SRC_DIR);
const violations: string[] = [];

for (const file of files) {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');

  // 1. Experience isolation: only src/experience/** may import three or gsap
  if (!rel.startsWith('src/experience/') && /from\s+['"](three|gsap|@gsap\/react)['"]/.test(content)) {
    violations.push(`${rel}: imports three/gsap outside src/experience/`);
  }

  // 1b. Tier 0 isolation: src/experience/tier0/* must never import tier1/, tier2/, three, or gsap
  if (
    rel.startsWith('src/experience/tier0/') &&
    /from\s+['"](three|gsap|@gsap\/react|\.\.?\/tier[12]\/.*)['"]/.test(content)
  ) {
    violations.push(`${rel}: tier0 module imports from tier1/, tier2/, three, or gsap`);
  }

  // 2. Mock handler isolation: only src/api/index.ts may import api/mock/handler
  if (rel !== 'src/api/index.ts' && /from\s+['"].*mock\/handler['"]/.test(content)) {
    violations.push(`${rel}: imports mock/handler directly (use api from src/api)`);
  }

  // 3. SEO isolation: src/seo/ must never touch wholesale pricing
  if (rel.startsWith('src/seo/') && !rel.endsWith('.test.ts') && /wholesalePricePaise|wholesaleMoq/.test(content)) {
    violations.push(`${rel}: references wholesale pricing inside public SEO generator`);
  }

  // 4. Forbid window.alert / window.open in app src
  if (!rel.endsWith('.test.ts') && /\bwindow\.(alert|open)\s*\(/.test(content)) {
    violations.push(`${rel}: uses forbidden window.alert/window.open`);
  }
}

if (violations.length > 0) {
  console.error('❌ Architectural boundary violations detected:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`✅ Boundary check passed across ${files.length} TypeScript files.`);

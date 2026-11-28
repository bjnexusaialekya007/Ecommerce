import fs from 'node:fs';
import { buildSeedStatements } from '../worker/db/seed';

fs.mkdirSync('.wrangler', { recursive: true });
fs.writeFileSync('.wrangler/seed.sql', buildSeedStatements().join('\n') + '\n');
console.log(`Wrote .wrangler/seed.sql (${buildSeedStatements().length} statements)`);

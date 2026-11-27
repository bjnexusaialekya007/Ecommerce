import { clientConfig } from '../src/config/client.config';
import { ClientConfigSchema } from '../src/config/schema';
import { evaluateClientConfig } from '../src/shared/clientCheck';

const strict = process.env.CLIENT_STRICT === '1';

const parsed = ClientConfigSchema.safeParse(clientConfig);
if (!parsed.success) {
  console.error('❌ client.config.ts failed schema validation:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const rows = evaluateClientConfig(parsed.data, strict);
let hasError = false;

console.log(`Checking client.config (${parsed.data.brand.name}) [strict=${strict}]`);
for (const r of rows) {
  const tag = r.ok ? 'PASS' : r.severity === 'error' ? 'FAIL' : 'WARN';
  console.log(`  [${tag}] ${r.field}: ${r.detail} (${r.value})`);
  if (!r.ok && r.severity === 'error') {
    hasError = true;
  }
}

if (hasError) {
  console.error('❌ Client check failed.');
  process.exit(1);
}

console.log('✅ All client config checks passed.');

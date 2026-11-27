import type { ClientConfig } from '../config/schema';

const DISALLOW_PATHS = [
  '/admin',
  '/api',
  '/cart',
  '/checkout',
  '/order/',
  '/invoice/',
  '/account',
  '/dev',
];

// Verify bot user-agent strings against each operator's official documentation before go-live (Section F4).
const SEARCH_BOTS = ['Googlebot', 'Bingbot', 'Applebot'];
const AI_SEARCH_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User'];
const AI_TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'];

function buildRuleBlock(userAgent: string, allowRoot: boolean): string {
  const lines = [`User-agent: ${userAgent}`];
  if (allowRoot) {
    lines.push('Allow: /');
    for (const d of DISALLOW_PATHS) {
      lines.push(`Disallow: ${d}`);
    }
  } else {
    lines.push('Disallow: /');
  }
  return lines.join('\n');
}

export function generateRobotsTxt(config: ClientConfig): string {
  const mode = config.seo.aiBots;
  const blocks: string[] = [buildRuleBlock('*', true)];

  for (const bot of SEARCH_BOTS) {
    blocks.push(buildRuleBlock(bot, true));
  }
  for (const bot of AI_SEARCH_BOTS) {
    blocks.push(buildRuleBlock(bot, mode !== 'block-ai'));
  }
  for (const bot of AI_TRAINING_BOTS) {
    blocks.push(buildRuleBlock(bot, mode === 'allow-all'));
  }

  blocks.push(`Sitemap: ${config.seo.siteUrl.replace(/\/+$/, '')}/sitemap.xml`);
  return blocks.join('\n\n') + '\n';
}

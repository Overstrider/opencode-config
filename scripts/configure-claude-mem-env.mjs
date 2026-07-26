import {
  chmodSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey || /[\r\n]/.test(apiKey)) {
  console.error('OPENROUTER_API_KEY is required to configure claude-mem.');
  process.exit(1);
}

const dataDir = path.resolve(
  process.argv[2] || path.join(os.homedir(), '.claude-mem'),
);
const envPath = path.join(dataDir, '.env');
let lines = [];
try {
  lines = readFileSync(envPath, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/);
} catch {}

lines = lines.filter((line) =>
  !/^\s*(?:ANTHROPIC_BASE_URL|ANTHROPIC_AUTH_TOKEN|OPENROUTER_API_KEY|CLAUDE_MEM_MODEL|CLAUDE_MEM_OPENROUTER_MODEL|CLAUDE_MEM_MODEL_PROFILE|CLAUDE_MEM_TIER_(?:SIMPLE|SUMMARY|FAST|SMART)_MODEL)\s*=/.test(
    line,
  ) &&
  !/^\s*#\s*(?:Local 9router gateway|OpenRouter credential) for claude-mem\./.test(
    line,
  )
);
while (lines.at(-1) === '') lines.pop();
if (lines.length) lines.push('');
lines.push(
  '# OpenRouter credential for claude-mem.',
  `OPENROUTER_API_KEY=${apiKey}`,
  '',
);

mkdirSync(dataDir, { recursive: true });
writeFileSync(envPath, lines.join('\n'), { mode: 0o600 });
try {
  chmodSync(envPath, 0o600);
} catch {}
console.log('claude-mem OpenRouter credential synced.');

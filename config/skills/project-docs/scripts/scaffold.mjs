import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const text = (...lines) => `${lines.join('\n')}\n`;

export const DOC_TEMPLATES = Object.freeze({
  'project.md': text(
    '# Project',
    '',
    'Documentation status: `bootstrap`',
    '',
    '## Purpose',
    '',
    '- Describe what this project does and its scope.',
    '',
    '## Architecture',
    '',
    '- Map major components, boundaries, and data flow.',
    '',
    '## Technology',
    '',
    '- Record languages, frameworks, runtimes, and key dependencies.',
    '',
    '## Entrypoints and commands',
    '',
    '- Record primary entrypoints and verified build, test, lint, and run commands.',
    '',
    '## Repository map',
    '',
    '- Map important directories and ownership boundaries.',
  ),
  'product.md': text(
    '# Product',
    '',
    'Documentation status: `bootstrap`',
    '',
    '## Audience',
    '',
    '- Identify users, operators, and other stakeholders.',
    '',
    '## Problems and outcomes',
    '',
    '- Record problems solved and intended outcomes.',
    '',
    '## Core workflows',
    '',
    '- Describe verified end-to-end user or system workflows.',
    '',
    '## Non-goals',
    '',
    '- Record explicit exclusions and boundaries.',
    '',
    '## Success signals',
    '',
    '- Record measurable or observable success criteria.',
  ),
  'specs.md': text(
    '# Specifications',
    '',
    'Documentation status: `bootstrap`',
    '',
    '## Functional requirements',
    '',
    '- Record cross-cutting functional requirements.',
    '',
    '## Non-functional requirements',
    '',
    '- Record performance, reliability, accessibility, security, and scale requirements.',
    '',
    '## Contracts',
    '',
    '- Record shared APIs, schemas, protocols, and compatibility guarantees.',
    '',
    '## Constraints',
    '',
    '- Record verified technical and product constraints.',
    '',
    '## Acceptance criteria',
    '',
    '- Record project-wide acceptance criteria.',
  ),
  'infra.md': text(
    '# Infrastructure',
    '',
    'Documentation status: `bootstrap`',
    '',
    '## Environments',
    '',
    '- Describe local, test, staging, and production environments that exist.',
    '',
    '## Services and persistence',
    '',
    '- Map services, data stores, queues, caches, and ownership.',
    '',
    '## External integrations',
    '',
    '- Document integrations without recording credentials or secret values.',
    '',
    '## Deployment and operations',
    '',
    '- Record verified deployment, migration, rollback, and recovery procedures.',
    '',
    '## Observability',
    '',
    '- Record logs, metrics, traces, alerts, and health checks.',
  ),
  'rules.md': text(
    '# Project Rules',
    '',
    'Documentation status: `bootstrap`',
    '',
    '## Decisions and invariants',
    '',
    '- Record durable project decisions and invariants.',
    '',
    '## Development conventions',
    '',
    '- Record project-specific implementation and review conventions.',
    '',
    '## Safety and security',
    '',
    '- Record trust boundaries, protected data, and destructive-operation safeguards.',
    '',
    '## Verification',
    '',
    '- Record required checks and evidence for completed work.',
  ),
  'features.md': text(
    '# Feature Map',
    '',
    'Inventory status: `bootstrap`',
    '',
    '## Current capabilities',
    '',
    '| Feature | Status | Summary | Document |',
    '| --- | --- | --- | --- |',
    '',
    '## Retired',
    '',
    '| Feature | Status | Summary | Document |',
    '| --- | --- | --- | --- |',
  ),
});

export const LOCAL_AGENTS_BEGIN = '<!-- project-docs-local-begin -->';
export const LOCAL_AGENTS_END = '<!-- project-docs-local-end -->';

export const LOCAL_AGENTS_BLOCK = [
  LOCAL_AGENTS_BEGIN,
  '## Project Documentation Map',
  '',
  'Project Docs is mandatory for this workspace. Load the global `project-docs`',
  'skill before documentation work and treat current source as stronger evidence',
  'than stale documentation.',
  '',
  '- `.docs/project.md` — purpose, architecture, stack, entrypoints, commands.',
  '- `.docs/product.md` — audience, problems, outcomes, workflows, non-goals.',
  '- `.docs/specs.md` — requirements, contracts, constraints, acceptance criteria.',
  '- `.docs/infra.md` — environments, services, data, deploy, operations.',
  '- `.docs/rules.md` — decisions, invariants, conventions, verification rules.',
  '- `.docs/features.md` — canonical capability index.',
  '- `.docs/features/<slug>.md` — one page per system capability.',
  '',
  'At task start, read `project.md`, `rules.md`, the feature index, and only the',
  'feature pages relevant to the task. Read product, specs, and infra documents',
  'when their domains are affected. Keep implemented facts verified, label',
  'approved proposals as planned, preserve unrelated manual content, and never',
  'store secrets. The user-level async hook audits documentation after each',
  'completed root response; current code wins while an audit is still running.',
  LOCAL_AGENTS_END,
].join('\n');

function portablePath(root, path) {
  return relative(root, path).replaceAll('\\', '/');
}

function ensureDirectory(root, path, created) {
  if (existsSync(path)) {
    if (!statSync(path).isDirectory()) {
      throw new Error(`${portablePath(root, path)} exists but is not a directory`);
    }
    return;
  }
  mkdirSync(path);
  created.push(portablePath(root, path));
}

function createFile(root, path, content, created) {
  if (existsSync(path)) {
    if (!statSync(path).isFile()) {
      throw new Error(`${portablePath(root, path)} exists but is not a file`);
    }
    return;
  }
  writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' });
  created.push(portablePath(root, path));
}

function managedAgentsContent(original, warnings) {
  const hasBegin = original.includes(LOCAL_AGENTS_BEGIN);
  const hasEnd = original.includes(LOCAL_AGENTS_END);
  if (hasBegin !== hasEnd) {
    warnings.push('AGENTS.md has an incomplete project-docs managed block');
    return original;
  }

  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const block = LOCAL_AGENTS_BLOCK.replaceAll('\n', eol);
  if (hasBegin) {
    const start = original.indexOf(LOCAL_AGENTS_BEGIN);
    const end = original.indexOf(LOCAL_AGENTS_END, start) + LOCAL_AGENTS_END.length;
    return `${original.slice(0, start)}${block}${original.slice(end)}`;
  }

  if (!original) {
    return `# Project Agent Instructions${eol}${eol}${block}${eol}`;
  }
  const separator = original.endsWith(`${eol}${eol}`)
    ? ''
    : original.endsWith(eol)
      ? eol
      : `${eol}${eol}`;
  return `${original}${separator}${block}${eol}`;
}

export function ensureProjectDocs(inputRoot = process.cwd()) {
  const root = resolve(inputRoot);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`Project root is not a directory: ${root}`);
  }

  const result = {
    root,
    created: [],
    updated: [],
    warnings: [],
  };
  const docs = resolve(root, '.docs');
  const features = resolve(docs, 'features');

  ensureDirectory(root, docs, result.created);
  ensureDirectory(root, features, result.created);
  for (const [name, content] of Object.entries(DOC_TEMPLATES)) {
    createFile(root, resolve(docs, name), content, result.created);
  }

  const agentsPath = resolve(root, 'AGENTS.md');
  const existed = existsSync(agentsPath);
  if (existed && !statSync(agentsPath).isFile()) {
    throw new Error('AGENTS.md exists but is not a file');
  }
  const original = existed ? readFileSync(agentsPath, 'utf8') : '';
  const updated = managedAgentsContent(original, result.warnings);
  if (updated !== original) {
    writeFileSync(agentsPath, updated, 'utf8');
    (existed ? result.updated : result.created).push('AGENTS.md');
  }

  return result;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    const result = ensureProjectDocs(process.argv[2] || process.cwd());
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`[project-docs] ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

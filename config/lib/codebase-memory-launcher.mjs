import { existsSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, parse, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const PROJECT_MARKERS = [
  '.git',
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'composer.json',
  'Gemfile',
  'mix.exs',
  'pubspec.yaml',
  'CMakeLists.txt',
];

function canonical(path) {
  const absolute = resolve(path);
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
}

function isWithin(path, parent) {
  const candidate = canonical(path);
  const boundary = canonical(parent);
  return candidate === boundary || candidate.startsWith(`${boundary}${sep}`);
}

export function findProjectRoot(directory) {
  let current = resolve(directory);
  const filesystemRoot = parse(current).root;

  while (true) {
    if (PROJECT_MARKERS.some((marker) => existsSync(join(current, marker)))) {
      return current;
    }
    if (current === filesystemRoot) return null;
    current = dirname(current);
  }
}

export function validateWorkspace(directory, options = {}) {
  const workspace = findProjectRoot(directory);
  if (!workspace) return { ok: false, reason: 'no project marker found' };

  const userHome = resolve(options.home ?? homedir());
  const temporary = resolve(options.temp ?? tmpdir());
  const unsafeExactRoots = [parse(workspace).root, userHome];
  const unsafeTrees = [
    join(userHome, 'AppData'),
    join(userHome, '.cache'),
    temporary,
  ];

  if (
    unsafeExactRoots.some((root) => canonical(workspace) === canonical(root)) ||
    unsafeTrees.some((root) => isWithin(workspace, root))
  ) {
    return { ok: false, reason: `unsafe workspace root: ${workspace}` };
  }

  return { ok: true, workspace };
}

export function validateMcpRequest(message, workspace) {
  if (
    message?.method !== 'tools/call' ||
    message?.params?.name !== 'index_repository'
  ) {
    return { ok: true };
  }

  const requested = message.params.arguments?.repo_path;
  const target = requested ? resolve(workspace, requested) : workspace;
  if (canonical(target) !== canonical(workspace)) {
    return {
      ok: false,
      reason: `index_repository is confined to ${workspace}`,
    };
  }

  return { ok: true };
}

function resolveBinary() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    const binary = join(
      process.env.APPDATA,
      'npm',
      'node_modules',
      'codebase-memory-mcp',
      'bin',
      'codebase-memory-mcp.exe',
    );
    if (existsSync(binary)) return binary;
  }
  return 'codebase-memory-mcp';
}

export function launchCodebaseMemory(directory = process.cwd()) {
  const validation = validateWorkspace(directory);
  if (!validation.ok) {
    process.stderr.write(`[codebase-memory-mcp] blocked: ${validation.reason}\n`);
    process.exitCode = 78;
    return null;
  }

  const child = spawn(resolveBinary(), [], {
    cwd: validation.workspace,
    env: { ...process.env, CBM_ALLOWED_ROOT: validation.workspace },
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
  });

  child.stdout.pipe(process.stdout);
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on('line', (line) => {
    const normalizedLine = line.replace(/^\uFEFF/, '');
    let message;
    try {
      message = JSON.parse(normalizedLine);
    } catch {
      child.stdin.write(`${normalizedLine}\n`);
      return;
    }

    const request = validateMcpRequest(message, validation.workspace);
    if (request.ok) {
      child.stdin.write(`${normalizedLine}\n`);
      return;
    }

    process.stdout.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        content: [{ type: 'text', text: `[codebase-memory-mcp] blocked: ${request.reason}` }],
        isError: true,
      },
    })}\n`);
  });
  process.stdin.on('end', () => child.stdin.end());

  child.on('error', (error) => {
    process.stderr.write(`[codebase-memory-mcp] launch failed: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    input.close();
    process.stdin.pause();
    process.exitCode = code ?? (signal ? 1 : 0);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }

  return child;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (
  invokedPath &&
  realpathSync(invokedPath) === realpathSync(fileURLToPath(import.meta.url))
) {
  launchCodebaseMemory();
}

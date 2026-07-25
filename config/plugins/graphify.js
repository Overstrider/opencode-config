// User-global Graphify policy for OpenCode.
//
// Graphify's installed skill owns graph creation and querying. This plugin
// makes graph-first codebase navigation visible in every session and repeats
// the official reminder before the first shell search when a graph exists.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

function graphPaths(directory) {
  const root = join(directory, 'graphify-out');
  return {
    graph: join(root, 'graph.json'),
    report: join(root, 'GRAPH_REPORT.md'),
    wiki: join(root, 'wiki', 'index.md'),
  };
}

function systemPolicy(directory) {
  const paths = graphPaths(directory);
  if (existsSync(paths.graph)) {
    return 'GRAPHIFY IS THE OFFICIAL CODEBASE NAVIGATION METHOD. ' +
      'A graph exists at graphify-out/graph.json. Before raw grep, broad file reads, or architecture analysis, run graphify query "<question>"; ' +
      'use graphify path "<A>" "<B>" for relationships and graphify explain "<concept>" for focused concepts. ' +
      (existsSync(paths.wiki)
        ? 'Use graphify-out/wiki/index.md for broad navigation. '
        : '') +
      'Read GRAPH_REPORT.md only for broad architecture context or when scoped queries are insufficient. ' +
      'After code changes run graphify update . unless the user explicitly forbids Graphify or the task concerns stale/incorrect graph output.';
  }

  return 'GRAPHIFY IS THE OFFICIAL CODEBASE NAVIGATION METHOD. ' +
    'For non-trivial codebase exploration, architecture work, or relationship tracing, invoke the installed graphify skill to build graphify-out/ before broad raw-file searching. ' +
    'Trivial direct edits may inspect the exact target first. Never expose secrets during indexing. After code changes keep an existing graph current with graphify update .';
}

export const GraphifyPlugin = async ({ directory = process.cwd() } = {}) => {
  let reminded = false;

  return {
    'experimental.chat.system.transform': async (_input, output) => {
      if (output && Array.isArray(output.system)) {
        output.system.push(systemPolicy(directory));
      }
    },

    'tool.execute.before': async (input, output) => {
      if (reminded || !existsSync(graphPaths(directory).graph)) return;
      if (input?.tool !== 'bash' || !output?.args?.command) return;

      output.args.command =
        'echo "[graphify] Use graphify query/path/explain before broad raw-file search; update graph after code changes." ; ' +
        output.args.command;
      reminded = true;
    },
  };
};

export default GraphifyPlugin;

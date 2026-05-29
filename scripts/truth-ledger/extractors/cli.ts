/**
 * CLI extractor.
 *
 * Extracts the `actp` CLI command tree from both SDKs:
 *   - TS: sdk-js/src/cli/index.ts — Commander-based `program.addCommand()`
 *     calls + individual commands/*.ts files for arg/option shapes
 *   - Python: python-sdk-v2/src/agirails/cli/main.py — Typer-based
 *     `app.command(name=...)` + `app.add_typer(..., name=...)` for sub-apps
 *
 * v1 strategy: parse the registration source files directly (no subprocess
 * spawn of `actp --help`, which would require the binary to be built).
 * Per A2 architecture, recursive runtime `--help` walk is a v1.5 upgrade.
 *
 * Audit context: the `actp time` false-negative in the manual audit
 * (`main.py:146` confirmed it exists) is THE motivating example for this
 * extractor — test verifies `actp time` is present in the output.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Extractor, ExtractorConfig, RawSurface } from '../types.ts';

// ============================================================
// Output shape
// ============================================================

interface CliCommand {
  name: string;
  /** Full path including parent sub-app, e.g. "tx status". */
  qualified_name: string;
  /** Sub-commands if this is a sub-app group. */
  subcommands?: CliCommand[];
  /** Source file (relative to monorepo root). */
  source_file: string;
  /** Whether registration could be statically verified. */
  registered: boolean;
}

export interface CliSurfaceData {
  ts: {
    binary: string;
    entry_file: string;
    commands: CliCommand[];
  };
  python: {
    binary: string;
    entry_file: string;
    commands: CliCommand[];
  };
  /** Commands present in one CLI but not the other. */
  cross_sdk: {
    ts_only: string[];
    python_only: string[];
  };
  counts: { ts: number; python: number };
}

// ============================================================
// Python (Typer) extraction
// ============================================================

const PY_CLI_MAIN = 'src/agirails/cli/main.py';

function extractPythonCli(config: ExtractorConfig, warnings: string[]): CliSurfaceData['python'] {
  const mainPath = path.join(config.pythonSdkRoot, PY_CLI_MAIN);
  if (!fs.existsSync(mainPath)) {
    warnings.push(`Python CLI main not found: ${PY_CLI_MAIN}`);
    return { binary: 'actp', entry_file: PY_CLI_MAIN, commands: [] };
  }
  const src = fs.readFileSync(mainPath, 'utf-8');
  const commands: CliCommand[] = [];

  // Flat commands: app.command(name="xyz")(xyz_cmd.xyz)
  const flatRegex = /app\.command\s*\(\s*name\s*=\s*["'](\w[\w-]*)["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = flatRegex.exec(src)) !== null) {
    const name = m[1];
    commands.push({
      name,
      qualified_name: name,
      source_file: PY_CLI_MAIN,
      registered: true,
    });
  }

  // Sub-apps: app.add_typer(<x>_cmd.<x>_app, name="xyz")
  const subAppRegex =
    /app\.add_typer\s*\(\s*(\w+)_cmd\.(\w+)_app\s*,\s*name\s*=\s*["'](\w[\w-]*)["']\s*\)/g;
  while ((m = subAppRegex.exec(src)) !== null) {
    const [, , , name] = m;
    // Try to read the sub-app file to extract its subcommands.
    const subFile = `src/agirails/cli/commands/${name}.py`;
    const subPath = path.join(config.pythonSdkRoot, subFile);
    const subcommands: CliCommand[] = [];
    if (fs.existsSync(subPath)) {
      const subSrc = fs.readFileSync(subPath, 'utf-8');
      // @<x>_app.command("subname") or @<x>_app.command(name="subname")
      const subCmdRegex = /@\w+_app\.command\s*\(\s*(?:name\s*=\s*)?["'](\w[\w-]*)["']/g;
      let sm: RegExpExecArray | null;
      while ((sm = subCmdRegex.exec(subSrc)) !== null) {
        const sub = sm[1];
        subcommands.push({
          name: sub,
          qualified_name: `${name} ${sub}`,
          source_file: subFile,
          registered: true,
        });
      }
    } else {
      warnings.push(`Sub-app source not found: ${subFile}`);
    }
    commands.push({
      name,
      qualified_name: name,
      subcommands,
      source_file: PY_CLI_MAIN,
      registered: true,
    });
  }

  // Inline-Typer block (e.g. `deploy_app = typer.Typer()` followed by
  // `deploy_app.command(...)`). Capture register pattern in main.py:
  //   `<x>_app.command("name")(<x>_cmd.<x>)` — these stay flat from a
  //   user's perspective as `actp deploy env`, `actp deploy check`.
  const inlineSubRegex =
    /(\w+)_app\.command\s*\(\s*["'](\w[\w-]*)["']\s*\)\s*\(\w+_cmd\.\w+\)/g;
  const inlineGroups = new Map<string, string[]>();
  while ((m = inlineSubRegex.exec(src)) !== null) {
    const [, group, sub] = m;
    if (!inlineGroups.has(group)) inlineGroups.set(group, []);
    inlineGroups.get(group)!.push(sub);
  }
  for (const [group, subs] of inlineGroups) {
    // Skip groups already represented by add_typer.
    if (commands.some((c) => c.name === group && c.subcommands)) continue;
    commands.push({
      name: group,
      qualified_name: group,
      subcommands: subs.map((sub) => ({
        name: sub,
        qualified_name: `${group} ${sub}`,
        source_file: PY_CLI_MAIN,
        registered: true,
      })),
      source_file: PY_CLI_MAIN,
      registered: true,
    });
  }

  // Dedupe: a name may appear via both flatRegex and inlineSubRegex if
  // the source has unusual patterns.
  const dedup = new Map<string, CliCommand>();
  for (const c of commands) dedup.set(c.qualified_name, c);
  return {
    binary: 'actp',
    entry_file: PY_CLI_MAIN,
    commands: [...dedup.values()].sort((a, b) =>
      a.qualified_name.localeCompare(b.qualified_name),
    ),
  };
}

// ============================================================
// TS (Commander) extraction
// ============================================================

const TS_CLI_INDEX = 'src/cli/index.ts';

function extractTsCli(config: ExtractorConfig, warnings: string[]): CliSurfaceData['ts'] {
  const indexPath = path.join(config.sdkJsRoot, TS_CLI_INDEX);
  if (!fs.existsSync(indexPath)) {
    warnings.push(`TS CLI entry not found: ${TS_CLI_INDEX}`);
    return { binary: 'actp', entry_file: TS_CLI_INDEX, commands: [] };
  }
  const src = fs.readFileSync(indexPath, 'utf-8');
  const commands: CliCommand[] = [];

  // Pattern 1: program.addCommand(createXxxCommand())
  // Pattern 2: program.command('name').description(...)...
  // Pattern 3: addXxxCommand(program)
  //
  // The TS CLI uses pattern 1 dominantly per Explorer 1 recon.
  // Each createXxxCommand returns `new Command('name')...`.

  // Find all createXxxCommand factory imports. File names may contain
  // hyphens (e.g. 'commands/claim-code'), so use [\w-]+ not \w+.
  const importRegex =
    /import\s*\{\s*(create\w+Command)\s*\}\s*from\s*['"]\.\/commands\/([\w-]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRegex.exec(src)) !== null) {
    const [, , file] = m;
    const cmdFile = `src/cli/commands/${file}.ts`;
    const cmdPath = path.join(config.sdkJsRoot, cmdFile);
    if (!fs.existsSync(cmdPath)) {
      warnings.push(`TS command source not found: ${cmdFile}`);
      continue;
    }
    const cmdSrc = fs.readFileSync(cmdPath, 'utf-8');
    // new Command('name') OR program.command('name')
    const nameMatch =
      cmdSrc.match(/new\s+Command\s*\(\s*['"]([^'"]+)['"]/) ??
      cmdSrc.match(/\.command\s*\(\s*['"]([^'"]+)['"]/);
    if (nameMatch) {
      const name = nameMatch[1];
      // Sub-commands inside this file. TS CLI uses two registration patterns:
      //   (a) `.command('sub')` chained (Commander pattern 2)
      //   (b) `cmd.addCommand(createXxxCommand())` where createXxxCommand
      //       returns `new Command('sub')` (Commander pattern 1 nested)
      // Walk every `new Command('x')` and `.command('x')` occurrence and
      // treat anything after the first as a subcommand. Suppress duplicates
      // and the parent name itself.
      const subRegex = /(?:new\s+Command|\.command)\s*\(\s*['"]([^'"]+)['"]/g;
      const subs: string[] = [];
      const seen = new Set<string>();
      let sm: RegExpExecArray | null;
      let firstSkipped = false;
      while ((sm = subRegex.exec(cmdSrc)) !== null) {
        if (!firstSkipped) {
          firstSkipped = true; // the first match is the parent command itself
          continue;
        }
        const sub = sm[1];
        if (sub === name || seen.has(sub)) continue;
        seen.add(sub);
        subs.push(sub);
      }
      commands.push({
        name,
        qualified_name: name,
        ...(subs.length > 0 && {
          subcommands: subs.map((sub) => ({
            name: sub,
            qualified_name: `${name} ${sub}`,
            source_file: cmdFile,
            registered: true,
          })),
        }),
        source_file: cmdFile,
        registered: true,
      });
    } else {
      warnings.push(`Could not parse command name from ${cmdFile}`);
    }
  }

  // Also pick up program.command('xyz') registered inline in index.ts.
  const inlineRegex = /program\.command\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = inlineRegex.exec(src)) !== null) {
    const name = m[1];
    if (!commands.some((c) => c.name === name)) {
      commands.push({
        name,
        qualified_name: name,
        source_file: TS_CLI_INDEX,
        registered: true,
      });
    }
  }

  return {
    binary: 'actp',
    entry_file: TS_CLI_INDEX,
    commands: commands.sort((a, b) => a.qualified_name.localeCompare(b.qualified_name)),
  };
}

// ============================================================
// Cross-SDK diff
// ============================================================

function flattenCommandNames(commands: CliCommand[]): string[] {
  const names: string[] = [];
  for (const c of commands) {
    names.push(c.qualified_name);
    if (c.subcommands) {
      for (const sc of c.subcommands) names.push(sc.qualified_name);
    }
  }
  return names;
}

function computeCrossSdkDiff(
  ts: CliSurfaceData['ts'],
  py: CliSurfaceData['python'],
): CliSurfaceData['cross_sdk'] {
  const tsNames = new Set(flattenCommandNames(ts.commands));
  const pyNames = new Set(flattenCommandNames(py.commands));
  return {
    ts_only: [...tsNames].filter((n) => !pyNames.has(n)).sort(),
    python_only: [...pyNames].filter((n) => !tsNames.has(n)).sort(),
  };
}

// ============================================================
// Public extractor
// ============================================================

export const cliExtractor: Extractor = {
  surface: 'cli',

  async extract(config: ExtractorConfig): Promise<RawSurface> {
    const warnings: string[] = [];
    const ts = extractTsCli(config, warnings);
    const py = extractPythonCli(config, warnings);

    if (ts.commands.length === 0) warnings.push('TS CLI: 0 commands extracted');
    if (py.commands.length === 0) warnings.push('Python CLI: 0 commands extracted');

    const data: CliSurfaceData = {
      ts,
      python: py,
      cross_sdk: computeCrossSdkDiff(ts, py),
      counts: {
        ts: flattenCommandNames(ts.commands).length,
        python: flattenCommandNames(py.commands).length,
      },
    };

    return {
      surface: 'cli',
      extractedAt: new Date().toISOString(),
      sourceVersion: `ts:${data.counts.ts} py:${data.counts.python}`,
      data,
      warnings,
    };
  },
};

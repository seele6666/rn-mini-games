import { lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, parse, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const template = fileURLToPath(new URL('../assets/template/', import.meta.url));
const usage = 'Usage: node init-project.mjs --target <existing-project-directory> [--write]';

function stat(path) {
  try { return lstatSync(path); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function filesUnder(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Template contains a symbolic link: ${path}`);
    if (entry.isDirectory()) return filesUnder(join(directory, entry.name), path);
    if (!entry.isFile()) throw new Error(`Template entry is not a regular file: ${path}`);
    return [path];
  });
}

function checkOutput(target, path) {
  let current = target;
  const pieces = path.split('/');
  for (const [index, piece] of pieces.entries()) {
    current = join(current, piece);
    const info = stat(current);
    if (!info) continue;
    if (info.isSymbolicLink()) throw new Error(`Refusing symbolic link or junction: ${current}`);
    if (index < pieces.length - 1 && !info.isDirectory()) throw new Error(`Output parent is not a directory: ${current}`);
    if (index === pieces.length - 1 && !info.isFile()) throw new Error(`Output is not a regular file: ${current}`);
  }
}

function initialize(targetArgument, write) {
  const target = resolve(targetArgument);
  if (target === parse(target).root || target === resolve(homedir())) throw new Error('Choose a project directory, not a filesystem root or home directory.');
  const targetInfo = stat(target);
  if (!targetInfo?.isDirectory() || targetInfo.isSymbolicLink()) throw new Error('Target must be an existing, unlinked project directory.');
  const paths = filesUnder(template);
  // Check all outputs before the first write, including paths later deferred for review.
  for (const path of paths) checkOutput(target, path);
  checkOutput(target, 'openspec/config.yml');
  const config = join(target, 'openspec/config.yaml');
  const ownConfig = stat(config) && readFileSync(config).equals(readFileSync(join(template, 'openspec/config.yaml')));
  const openspecDeferred = Boolean(stat(join(target, 'openspec/config.yml')) || (stat(config) && !ownConfig));
  const report = {
    target, mode: write ? 'write' : 'preview', create: [], created: [], unchanged: [], review: [], deferred: [],
    openspecDeferred, dependenciesVerified: false,
    next: ['Read references/adoption.md in this skill; merge reviewed files with project rules.', 'Verify OpenSpec CLI, generated skills, Superpowers availability, and memory authorization in the agent session.'],
  };
  for (const path of paths) {
    if (openspecDeferred && path.startsWith('openspec/')) {
      report.deferred.push(path);
      continue;
    }
    const output = join(target, path);
    if (stat(output)) {
      const same = readFileSync(output).equals(readFileSync(join(template, path)));
      report[same ? 'unchanged' : 'review'].push(path);
    } else {
      report.create.push(path);
    }
  }
  if (write) {
    for (const path of report.create) {
      // Recheck just before creation; wx also prevents replacement if another process wrote first.
      checkOutput(target, path);
      const output = resolve(target, path);
      const within = relative(target, output);
      if (within.startsWith('..') || resolve(target, within) !== output) throw new Error(`Output escapes target: ${path}`);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, readFileSync(join(template, path)), { flag: 'wx' });
      report.created.push(path);
    }
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.review.length || openspecDeferred ? 3 : 0;
}

const args = process.argv.slice(2);
let target;
let write = false;
let valid = true;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--target' && !target && args[index + 1] && !args[index + 1].startsWith('--')) target = args[++index];
  else if (args[index] === '--write' && !write) write = true;
  else if (args[index] === '--help' && args.length === 1) { process.stdout.write(`${usage}\n`); process.exit(0); }
  else valid = false;
}
if (!valid || !target) {
  process.stderr.write(`${usage}\n`);
  process.exitCode = 2;
} else {
  try { initialize(target, write); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

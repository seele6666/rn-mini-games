// Optional integration check: node tests/openspec-smoke.mjs <path-to-openspec.js>
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = process.argv[2] && resolve(process.argv[2]);
if (!cli) throw new Error('Pass the installed OpenSpec JavaScript CLI entrypoint.');
// OpenSpec init may clean legacy user prompts; this check must never remove them.
try {
  const legacy = readdirSync(join(homedir(), '.codex', 'prompts')).filter((name) => /^opsx-.*\.md$/.test(name));
  if (legacy.length) throw new Error('Legacy user opsx prompts exist; skip this smoke check rather than clean them.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }

const skill = fileURLToPath(new URL('../', import.meta.url));
const target = mkdtempSync(join(tmpdir(), 'collab-openspec-'));
const env = { ...process.env, XDG_CONFIG_HOME: join(target, 'isolated-config'), OPENSPEC_TELEMETRY: '0' };
function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: target, env, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
}
try {
  const version = run(cli, ['--version']).trim();
  run(join(skill, 'scripts/init-project.mjs'), ['--target', target, '--write']);
  const initialConfig = readFileSync(join(target, 'openspec/config.yaml'), 'utf8');
  const initialization = run(cli, ['init', '--tools', 'codex', '--profile', 'core', '--no-animation']);
  assert.equal(readFileSync(join(target, 'openspec/config.yaml'), 'utf8'), initialConfig);
  for (const skillName of ['openspec-explore', 'openspec-propose', 'openspec-apply-change', 'openspec-archive-change']) {
    assert.ok(readFileSync(join(target, '.agents/skills', skillName, 'SKILL.md'), 'utf8').includes('name:'));
  }
  const schemaResult = run(cli, ['schema', 'validate', 'project-workflow']);
  const context = JSON.parse(run(cli, ['context', '--json']));
  assert.equal(resolve(context.root.path), target);
  run(cli, ['new', 'change', 'template-smoke-check']);
  const status = JSON.parse(run(cli, ['status', '--change', 'template-smoke-check', '--json']));
  assert.equal(status.schemaName, 'project-workflow');
  assert.deepEqual(status.applyRequires, ['implementation']);
  assert.deepEqual(status.artifacts.map((artifact) => artifact.id), ['brainstorm', 'proposal', 'specs', 'design', 'tasks', 'implementation']);
  process.stdout.write(`${JSON.stringify({ version, generatedSkills: readdirSync(join(target, '.agents/skills')).filter((name) => name.startsWith('openspec-')), schemaResult: schemaResult.trim(), initialization: initialization.trim(), artifacts: status.artifacts.map((artifact) => artifact.id) }, null, 2)}\n`);
} finally {
  rmSync(target, { recursive: true, force: true });
}

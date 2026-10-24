import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const script = join(skillRoot, 'scripts', 'init-project.mjs');
const run = (target, ...args) => spawnSync(process.execPath, [script, '--target', target, ...args], { encoding: 'utf8' });
const sandbox = (t) => {
  const root = mkdtempSync(join(tmpdir(), 'collab-init-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

test('preview leaves an empty project untouched', (t) => {
  const target = sandbox(t);
  const result = run(target);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(target), []);
  const report = JSON.parse(result.stdout);
  assert.equal(report.mode, 'preview');
  assert.ok(report.create.includes('AGENTS.md'));
  assert.equal(report.dependenciesVerified, false);
});

test('write creates a portable template and a second write changes nothing', (t) => {
  const target = sandbox(t);
  const first = run(target, '--write');
  assert.equal(first.status, 0, first.stderr);
  const report = JSON.parse(first.stdout);
  assert.ok(report.created.includes('.agents/skills/project-memory/SKILL.md'));
  assert.ok(report.created.includes('openspec/schemas/project-workflow/schema.yaml'));
  assert.match(readFileSync(join(target, 'openspec/config.yaml'), 'utf8'), /schema: project-workflow/);
  assert.doesNotMatch(readFileSync(join(target, 'AGENTS.md'), 'utf8'), /[A-Za-z]:[\\/]|2048|Expo|rn-2048/);
  assert.doesNotMatch(readFileSync(join(target, 'memory/preferences.md'), 'utf8'), /M-\d{3}|\d{4}-\d{2}-\d{2}/);
  assert.equal(existsSync(join(target, '.agents/skills/openspec-propose')), false);
  const before = new Map(report.created.map((path) => [path, readFileSync(join(target, path))]));
  const second = run(target, '--write');
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(JSON.parse(second.stdout).created, []);
  for (const [path, content] of before) assert.deepEqual(readFileSync(join(target, path)), content);
});

test('existing rules and memory are preserved and reported for review', (t) => {
  const target = sandbox(t);
  mkdirSync(join(target, 'memory'));
  const prior = { 'AGENTS.md': '# Python project\r\nUse uv.\r\n', 'memory/preferences.md': '# Existing\nM-077: use pytest\n' };
  for (const [path, contents] of Object.entries(prior)) writeFileSync(join(target, path), contents);
  const result = run(target, '--write');
  assert.equal(result.status, 3, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.review.includes('AGENTS.md'));
  for (const [path, contents] of Object.entries(prior)) assert.equal(readFileSync(join(target, path), 'utf8'), contents);
  assert.ok(existsSync(join(target, '.agents/skills/project-delegation/SKILL.md')));
});

test('an existing YAML or YML OpenSpec config defers all OpenSpec additions', (t) => {
  for (const filename of ['config.yaml', 'config.yml']) {
    const target = join(sandbox(t), filename);
    mkdirSync(join(target, 'openspec'), { recursive: true });
    const contents = 'store: team-context\ncontext: keep this\n';
    writeFileSync(join(target, 'openspec', filename), contents);
    const result = run(target, '--write');
    assert.equal(result.status, 3, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.openspecDeferred, true);
    assert.ok(report.deferred.includes('openspec/schemas/project-workflow/schema.yaml'));
    assert.deepEqual(readdirSync(join(target, 'openspec')), [filename]);
    assert.equal(readFileSync(join(target, 'openspec', filename), 'utf8'), contents);
  }
});

test('a path collision is preflighted before any target file is written', (t) => {
  const target = sandbox(t);
  writeFileSync(join(target, '.agents'), 'this is a file');
  const result = run(target, '--write');
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /not a directory/i);
  assert.deepEqual(readdirSync(target), ['.agents']);
});

test('a linked output directory cannot redirect writes outside the target', (t) => {
  const root = sandbox(t);
  const target = join(root, 'project');
  const outside = join(root, 'outside');
  mkdirSync(target);
  mkdirSync(outside);
  symlinkSync(outside, join(target, 'memory'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = run(target, '--write');
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /symbolic link|junction/i);
  assert.deepEqual(readdirSync(outside), []);
  assert.equal(existsSync(join(target, 'AGENTS.md')), false);
});

test('rejects unknown flags and a nonexistent target', (t) => {
  assert.equal(run(sandbox(t), '--force').status, 2);
  const target = resolve(sandbox(t), 'missing');
  assert.equal(run(target, '--write').status, 1);
  assert.equal(existsSync(target), false);
});

test('copied task checker accepts matching notes and rejects duplicate, missing, and extra notes', (t) => {
  const target = sandbox(t);
  const result = run(target, '--write');
  assert.equal(result.status, 0, result.stderr);
  const change = join(target, 'openspec/changes/demo-change');
  mkdirSync(join(change, 'implementation'), { recursive: true });
  writeFileSync(join(change, 'tasks.md'), '- [ ] 1.1 Build thing; verification: inspect result\n');
  writeFileSync(join(change, 'implementation/1.1-build.md'), '**Task:** 1.1 in ../tasks.md\n');
  const check = () => spawnSync(process.execPath, ['openspec/scripts/check-implementation-notes.mjs', 'demo-change'], { cwd: target, encoding: 'utf8' });
  assert.equal(check().status, 0);
  writeFileSync(join(change, 'implementation/1.1-extra.md'), '**Task:** 1.1 in ../tasks.md\n');
  assert.equal(check().status, 1);
  rmSync(join(change, 'implementation/1.1-extra.md'));
  rmSync(join(change, 'implementation/1.1-build.md'));
  assert.equal(check().status, 1);
  writeFileSync(join(change, 'implementation/1.1-build.md'), '**Task:** 1.1 in ../tasks.md\n');
  writeFileSync(join(change, 'implementation/2.1-orphan.md'), '**Task:** 2.1 in ../tasks.md\n');
  assert.equal(check().status, 1);
});

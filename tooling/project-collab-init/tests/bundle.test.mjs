import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
}

test('every local Markdown reference in the distributed bundle resolves', () => {
  for (const path of files(root).filter((file) => file.endsWith('.md'))) {
    const contents = readFileSync(path, 'utf8');
    for (const [, link] of contents.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(?:https?:|#)/.test(link)) continue;
      const target = resolve(dirname(path), link.split('#')[0]);
      assert.ok(existsSync(target), `${path} links to missing ${link}`);
    }
  }
});

test('every shipped JavaScript module has valid syntax', () => {
  for (const path of files(root).filter((file) => file.endsWith('.mjs'))) {
    const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});

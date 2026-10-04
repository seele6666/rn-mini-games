import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const changeName = process.argv[2];
if (!changeName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(changeName)) {
  console.error('Usage: node openspec/scripts/check-implementation-notes.mjs <change-name>');
  process.exit(2);
}

const changeDir = resolve('openspec', 'changes', changeName);
const tasksPath = join(changeDir, 'tasks.md');
const notesDir = join(changeDir, 'implementation');
if (!existsSync(tasksPath) || !existsSync(notesDir)) {
  console.error(`Missing tasks.md or implementation/ for ${changeName}`);
  process.exit(1);
}

const taskIds = [...readFileSync(tasksPath, 'utf8').matchAll(/^\s*-\s*\[[ xX]\]\s+(\d+\.\d+)\s+\S/gm)]
  .map((match) => match[1]);
const errors = [];
if (taskIds.length === 0) errors.push('tasks.md has no numbered checkbox tasks');
const uniqueTaskIds = new Set(taskIds);
if (uniqueTaskIds.size !== taskIds.length) errors.push('tasks.md contains duplicate task IDs');

const notes = readdirSync(notesDir).filter((name) => name.endsWith('.md'));
const noteIds = new Map();
for (const name of notes) {
  const match = /^(\d+\.\d+)-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.exec(name);
  if (!match) {
    errors.push(`Invalid note filename: ${name}`);
    continue;
  }
  const id = match[1];
  noteIds.set(id, (noteIds.get(id) ?? 0) + 1);
  if (!uniqueTaskIds.has(id)) errors.push(`Extra note without task ${id}: ${name}`);
  const contents = readFileSync(join(notesDir, name), 'utf8');
  if (!new RegExp(`^\\*\\*Task:\\*\\*\\s+${id.replace('.', '\\.')}\\b`, 'm').test(contents)) {
    errors.push(`Note does not identify task ${id}: ${name}`);
  }
}

for (const id of uniqueTaskIds) {
  const count = noteIds.get(id) ?? 0;
  if (count !== 1) errors.push(`Task ${id} has ${count} implementation notes; expected 1`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`OK: ${taskIds.length} tasks have exactly one implementation note each.`);

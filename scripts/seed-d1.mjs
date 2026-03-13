import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const dbName = args[0];
const remote = args.includes('--remote');

if (!dbName) {
  console.error('Usage: node scripts/seed-d1.mjs <db-name> [--remote]');
  process.exit(1);
}

const sourcePath = resolve(process.cwd(), 'benchmarks_data.json');
const tempPath = resolve(process.cwd(), '.tmp-seed.sql');
const raw = readFileSync(sourcePath, 'utf8');
const chunkSize = 50000;
const chunks = [];

for (let index = 0; index < raw.length; index += chunkSize) {
  chunks.push(raw.slice(index, index + chunkSize));
}

const escapeSql = (value) => value.replace(/'/g, "''");

writeFileSync(
  tempPath,
  [
    'CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);',
    'CREATE TABLE IF NOT EXISTS app_state_chunks (state_key TEXT NOT NULL, part_index INTEGER NOT NULL, chunk TEXT NOT NULL, PRIMARY KEY (state_key, part_index));',
    "DELETE FROM app_state WHERE key = 'primary';",
    "DELETE FROM app_state_chunks WHERE state_key = 'primary';",
    ...chunks.map((chunk, index) => `INSERT INTO app_state_chunks (state_key, part_index, chunk) VALUES ('primary', ${index}, '${escapeSql(chunk)}');`),
  ].join('\n')
);

try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', dbName, ...(remote ? ['--remote'] : []), `--file=${tempPath}`], {
    stdio: 'inherit',
  });
} finally {
  unlinkSync(tempPath);
}
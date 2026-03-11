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
const escaped = raw.replace(/'/g, "''");

writeFileSync(
  tempPath,
  [
    'CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);',
    `INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES ('primary', '${escaped}', CURRENT_TIMESTAMP);`,
  ].join('\n')
);

try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', dbName, ...(remote ? ['--remote'] : []), `--file=${tempPath}`], {
    stdio: 'inherit',
  });
} finally {
  unlinkSync(tempPath);
}
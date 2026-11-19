import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertPrototypeEnvironment } from '../config/prototype';

describe('prototype deployment boundary', () => {
  let directory: string | undefined;
  afterEach(() => {
    if (directory) rmSync(directory, { recursive: true, force: true });
    directory = undefined;
  });

  it.each(['development', 'test'])('keeps %s available for local fixtures', (mode) => {
    expect(() => assertPrototypeEnvironment(mode)).not.toThrow();
  });

  it('rejects production explicitly', () => {
    expect(() => assertPrototypeEnvironment('production')).toThrow('disabled in production');
  });

  it('stops the real entry point before database and upload initialization', () => {
    directory = mkdtempSync(path.join(tmpdir(), 'aegis-prototype-gate-'));
    const database = path.join(directory, 'must-not-exist.db');
    const uploads = path.join(directory, 'must-not-exist-uploads');
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: database, UPLOAD_DIR: uploads },
      encoding: 'utf-8', timeout: 10000,
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('disabled in production');
    expect(existsSync(database)).toBe(false);
    expect(existsSync(uploads)).toBe(false);
  });
});

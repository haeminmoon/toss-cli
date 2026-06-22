import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
  DEFAULT_BASE_URL,
  ENV_ACCOUNT_SEQ,
  ENV_BASE_URL,
  ENV_CLIENT_ID,
  ENV_CLIENT_SECRET,
} from './constants';

export interface CliConfig {
  clientId?: string;
  clientSecret?: string;
  /** Default account (accountSeq) for account/asset/order commands. */
  accountSeq?: number;
  /** Optional API base URL override (defaults to the production server). */
  baseUrl?: string;
}

export interface EffectiveConfig {
  clientId?: string;
  clientSecret?: string;
  accountSeq?: number;
  baseUrl: string;
}

export function getConfigDir(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILE_NAME);
}

export function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { mode: 0o700, recursive: true });
  } else {
    // mkdir mode only applies on creation; tighten a pre-existing loose dir.
    try {
      fs.chmodSync(dir, 0o700);
    } catch {
      /* best effort */
    }
  }
}

export function loadConfig(): CliConfig {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw) as CliConfig;
  } catch {
    return {};
  }
}

export function saveConfig(partial: Partial<CliConfig>): void {
  ensureConfigDir();
  const current = loadConfig();
  const merged = { ...current, ...partial };
  const p = getConfigPath();
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), { mode: 0o600 });
  // writeFileSync mode only applies on creation; enforce 0600 on every rewrite
  // so a pre-existing world-readable config is tightened, not preserved.
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    /* best effort */
  }
}

/**
 * Remove stored credentials (clientId, clientSecret, accountSeq) from the
 * config file. If no other keys remain, the file is deleted entirely; otherwise
 * the remaining keys (e.g. baseUrl) are kept. Does not touch environment
 * variables. Returns the keys that were actually removed.
 */
export function clearStoredCredentials(): { removedKeys: string[] } {
  const config = loadConfig();
  const removedKeys: string[] = [];
  for (const key of ['clientId', 'clientSecret', 'accountSeq'] as const) {
    if (config[key] !== undefined) {
      removedKeys.push(key);
      delete config[key];
    }
  }
  const p = getConfigPath();
  if (Object.keys(config).length === 0) {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      /* best effort */
    }
  } else {
    fs.writeFileSync(p, JSON.stringify(config, null, 2), { mode: 0o600 });
    try {
      fs.chmodSync(p, 0o600);
    } catch {
      /* best effort */
    }
  }
  return { removedKeys };
}

/**
 * Resolve the effective configuration: values from the config file take
 * precedence, falling back to environment variables.
 */
export function getEffectiveConfig(): EffectiveConfig {
  const disk = loadConfig();

  let accountSeq = disk.accountSeq;
  if (accountSeq === undefined && process.env[ENV_ACCOUNT_SEQ]) {
    const parsed = parseInt(process.env[ENV_ACCOUNT_SEQ] as string, 10);
    if (Number.isInteger(parsed)) accountSeq = parsed;
  }

  return {
    clientId: disk.clientId ?? process.env[ENV_CLIENT_ID],
    clientSecret: disk.clientSecret ?? process.env[ENV_CLIENT_SECRET],
    accountSeq,
    baseUrl: disk.baseUrl ?? process.env[ENV_BASE_URL] ?? DEFAULT_BASE_URL,
  };
}

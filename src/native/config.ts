import fs from "fs";
import path from "path";
import { DEFAULT_CONFIG } from "./constants";
import type { Config, LoadConfigOptions } from "./types";

interface CachedConfigEntry {
  config: Config;
  mtimeMs: number | null;
}

const configCache = new Map<string, CachedConfigEntry>();

export function createConfig(
  overrides: Partial<Omit<Config, "indentStr">> = {}
): Config {
  const configState: Omit<Config, "indentStr"> = {
    ...DEFAULT_CONFIG,
    ...overrides
  };

  return {
    ...configState,
    get indentStr() {
      return configState.useTabs ? "\t" : " ".repeat(configState.indent);
    }
  };
}

function resolveConfigFile(startFolder: string): string | null {
  let current = path.resolve(startFolder);

  while (true) {
    const candidate = path.join(current, ".tctidier.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function normalizeUserConfig(
  userConfig: Record<string, unknown>
): Partial<Omit<Config, "indentStr">> {
  const normalized: Partial<Omit<Config, "indentStr">> = {};

  for (const [key, value] of Object.entries(userConfig)) {
    if (key in DEFAULT_CONFIG) {
      normalized[key as keyof Omit<Config, "indentStr">] = value as never;
    }
  }

  return normalized;
}

export function loadConfig(options: LoadConfigOptions = {}): Config {
  const basePath = options.stdinFilepath
    ? path.dirname(path.resolve(options.stdinFilepath))
    : options.workspaceRoot
      ? path.resolve(options.workspaceRoot)
      : options.cwd || process.cwd();

  const configFile = resolveConfigFile(basePath);
  if (!configFile) {
    return createConfig();
  }

  const stat = fs.statSync(configFile);
  const cachedEntry = configCache.get(configFile);
  if (cachedEntry && cachedEntry.mtimeMs === stat.mtimeMs) {
    return cachedEntry.config;
  }

  const raw = fs.readFileSync(configFile, "utf8");
  const userConfig = normalizeUserConfig(
    JSON.parse(raw) as Record<string, unknown>
  );
  const config = createConfig(userConfig);
  configCache.set(configFile, { config, mtimeMs: stat.mtimeMs });
  return config;
}

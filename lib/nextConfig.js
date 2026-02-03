const { existsSync, readFileSync } = require('fs');
const { join, extname, isAbsolute } = require('path');

function resolveConfigPath(cwd, configPath) {
  const raw = configPath || '';

  if (!raw) {
    return null;
  }

  return isAbsolute(raw) ? raw : join(cwd, raw);
}

function tryLoadJson(absPath) {
  try {
    const raw = readFileSync(absPath, 'utf8');
    const data = JSON.parse(raw);

    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function normalizeConfigExport(value) {
  if (!value) {
    return null;
  }

  const config = value && value.__esModule && value.default ? value.default : value;

  if (typeof config === 'function') {
    try {
      const resolved = config(null, { defaultConfig: {} });

      return resolved && typeof resolved === 'object' ? resolved : null;
    } catch {
      return null;
    }
  }

  return typeof config === 'object' ? config : null;
}

function loadNextConfigSync({ cwd, configPath }) {
  const candidates = [];

  if (configPath) {
    const resolved = resolveConfigPath(cwd, configPath);

    if (resolved) {
      candidates.push(resolved);
    }
  } else {
    candidates.push(
      join(cwd, 'next.config.js'),
      join(cwd, 'next.config.cjs'),
      join(cwd, 'next.config.mjs'),
      join(cwd, 'next.config.json')
    );
  }

  for (const absPath of candidates) {
    if (!existsSync(absPath)) {
      continue;
    }

    const ext = extname(absPath);

    if (ext === '.json') {
      const jsonConfig = tryLoadJson(absPath);

      if (jsonConfig) {
        return jsonConfig;
      }

      continue;
    }

    if (ext === '.mjs') {
      continue;
    }

    try {
      const mod = require(absPath);
      const config = normalizeConfigExport(mod);

      if (config) {
        return config;
      }
    } catch {
      continue;
    }
  }

  return null;
}

module.exports = {
  loadNextConfigSync,
};

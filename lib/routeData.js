const { existsSync } = require('fs');
const { isAbsolute, join } = require('path');
const pagesManifest = require('./pagesManifest');
const {
  normalizeTrailingSlash,
  containsDynamicToken,
  patternToRegex,
} = require('./routes');

const { buildPagesRouteSetSync } = pagesManifest;

const routeCache = new Map();

function getPagesDirAbs(pagesDir, cwd) {
  return isAbsolute(pagesDir) ? pagesDir : join(cwd, pagesDir);
}

function getRouteMatchers({ pagesDir, cwd, includeDynamicMatchers = true }) {
  const pagesAbs = getPagesDirAbs(pagesDir, cwd);
  let cached = routeCache.get(pagesAbs);

  if (!cached) {
    const pagesDirExists = existsSync(pagesAbs);

    if (!pagesDirExists) {
    cached = {
      routeSet: new Set(),
      staticRoutes: new Set(),
      dynamicPatterns: [],
      dynamicMatchers: null,
      staticRoutesList: null,
      allRoutesList: null,
      pagesDirExists: false,
    };

      routeCache.set(pagesAbs, cached);
    }
  }

  if (!cached) {
    const rawRouteSet = buildPagesRouteSetSync({ pagesDir, cwd });
    const routeSet = new Set();
    const staticRoutes = new Set();
    const dynamicPatterns = [];

    for (const route of rawRouteSet) {
      const normalized = normalizeTrailingSlash(route);

      routeSet.add(normalized);

      if (containsDynamicToken(normalized)) {
        dynamicPatterns.push(normalized);
      } else {
        staticRoutes.add(normalized);
      }
    }

    cached = {
      routeSet,
      staticRoutes,
      dynamicPatterns,
      dynamicMatchers: null,
      staticRoutesList: null,
      allRoutesList: null,
      pagesDirExists: true,
    };

    routeCache.set(pagesAbs, cached);
  }

  let dynamicMatchers = null;

  if (includeDynamicMatchers) {
    if (!cached.dynamicMatchers) {
      cached.dynamicMatchers = cached.dynamicPatterns.map((pattern) => ({
        pattern,
        regex: patternToRegex(pattern),
      }));
    }
    dynamicMatchers = cached.dynamicMatchers;
  }

  return {
    routeSet: cached.routeSet,
    staticRoutes: cached.staticRoutes,
    dynamicMatchers,
    cacheEntry: cached,
    pagesDirExists: cached.pagesDirExists,
  };
}

function ensureRouteLists(cacheEntry) {
  if (!cacheEntry.staticRoutesList) {
    cacheEntry.staticRoutesList = Array.from(cacheEntry.staticRoutes);
  }
  if (!cacheEntry.allRoutesList) {
    cacheEntry.allRoutesList = Array.from(cacheEntry.routeSet);
  }
}

module.exports = {
  getPagesDirAbs,
  getRouteMatchers,
  ensureRouteLists,
};

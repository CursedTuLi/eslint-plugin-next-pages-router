const { containsDynamicToken, normalizeTrailingSlash } = require('./routes');
const { evaluateRoutePattern, evaluateConcretePath } = require('./routeEvaluation');
const { reportRouteEvaluation } = require('./reporting');
const { buildUrlObjectDesc } = require('./suggestions');

function isValidIdentifier(value) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function escapeSingle(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function extractUrlObject(pattern, asValue, normalizeAsPathValue) {
  if (!pattern || !asValue) {
    return null;
  }
  if (pattern.includes('?') || pattern.includes('#')) {
    return null;
  }
  if (asValue.includes('?') || asValue.includes('#')) {
    return null;
  }

  const normalizedPattern = normalizeTrailingSlash(pattern);
  const normalizedAs = normalizeTrailingSlash(normalizeAsPathValue(asValue));

  const patternSegments = normalizedPattern.split('/').filter(Boolean);
  const asSegments = normalizedAs.split('/').filter(Boolean);

  if (patternSegments.length !== asSegments.length) {
    return null;
  }

  const params = {};
  let hasParams = false;

  for (let i = 0; i < patternSegments.length; i += 1) {
    const segment = patternSegments[i];
    const asSegment = asSegments[i];

    if (/^\[\[\.\.\..+\]\]$/.test(segment) || /^\[\.\.\..+\]$/.test(segment)) {
      return null;
    }

    const match = /^\[([^\]]+)\]$/.exec(segment);

    if (match) {
      const name = match[1];
      if (name.startsWith('...')) {
        return null;
      }
      params[name] = asSegment;
      hasParams = true;
      continue;
    }

    if (segment !== asSegment) {
      return null;
    }
  }

  if (!hasParams) {
    return null;
  }

  return { pathname: normalizedPattern, params };
}

function buildUrlObjectSuggestion(pattern, params) {
  const entries = Object.entries(params || {});

  if (entries.length === 0) {
    return null;
  }

  const queryText = entries
    .map(([key, value]) => {
      const safeKey = isValidIdentifier(key) ? key : `'${escapeSingle(key)}'`;
      return `${safeKey}: '${escapeSingle(value)}'`;
    })
    .join(', ');

  return `{ pathname: '${escapeSingle(pattern)}', query: { ${queryText} } }`;
}

const SPECIAL_NAVIGATION_PATHS = new Set(['/404', '/500']);

function isSpecialNavigationPath(value, normalizeAsPathValue) {
  if (!value) {
    return false;
  }
  const normalized = normalizeTrailingSlash(normalizeAsPathValue(value));
  return SPECIAL_NAVIGATION_PATHS.has(normalized);
}

function createRouterNavigationReporter(context, ruleContext, options = {}) {
  const {
    routeSet,
    dynamicMatchers,
    allRoutesList,
    staticRoutes,
    staticRoutesList,
    normalizeAsPathValue,
    suggestClosestRoute,
    warnOnUnknownPaths,
  } = ruleContext;
  const preferUrlObject = options.preferUrlObject === true;

  function reportStringTarget({ node, rawValue, method, hasAs }) {
    if (!rawValue || !rawValue.startsWith('/')) {
      return;
    }

    if (containsDynamicToken(rawValue)) {
      const result = evaluateRoutePattern(rawValue, {
        routeSet,
        dynamicMatchers,
        allRoutesList,
        suggestClosestRoute,
        allowDynamicSuggestion: false,
        disallowQueryHash: false,
      });

      const reported = reportRouteEvaluation(
        context,
        node,
        result,
        { unknown: 'navigationPatternUnknown' },
        { method, value: rawValue }
      );

      if (!reported && result.status === 'ok' && !hasAs) {
        context.report({
          node,
          messageId: 'navigationPatternWithoutAs',
          data: { method, value: rawValue },
        });
      }

      return;
    }

    if (isSpecialNavigationPath(rawValue, normalizeAsPathValue)) {
      return;
    }

    const concreteResult = evaluateConcretePath(rawValue, {
      normalizeAsPathValue,
      warnOnUnknownPaths,
      staticRoutes,
      dynamicMatchers,
      staticRoutesList,
      suggestClosestRoute,
    });

    reportRouteEvaluation(
      context,
      node,
      concreteResult,
      { unknown: 'navigationUnknown' },
      { method, value: rawValue }
    );
  }

  function reportPathname({ node, rawValue, method }) {
    if (!rawValue || !rawValue.startsWith('/')) {
      return;
    }

    if (rawValue.includes('?') || rawValue.includes('#')) {
      reportRouteEvaluation(
        context,
        node,
        { status: 'queryhash' },
        { queryhash: 'pathnameWithQueryOrHash' },
        { method, value: rawValue }
      );
      return;
    }

    if (containsDynamicToken(rawValue)) {
      const result = evaluateRoutePattern(rawValue, {
        routeSet,
        dynamicMatchers,
        allRoutesList,
        suggestClosestRoute,
        allowDynamicSuggestion: true,
        disallowQueryHash: false,
      });

      reportRouteEvaluation(
        context,
        node,
        result,
        {
          unknown: 'pathnameUnknown',
        },
        { method, value: rawValue }
      );

      return;
    }

    if (isSpecialNavigationPath(rawValue, normalizeAsPathValue)) {
      return;
    }

    const concreteResult = evaluateConcretePath(rawValue, {
      normalizeAsPathValue,
      warnOnUnknownPaths,
      staticRoutes,
      dynamicMatchers,
      staticRoutesList,
      suggestClosestRoute,
    });

    reportRouteEvaluation(
      context,
      node,
      concreteResult,
      { unknown: 'pathnameUnknown' },
      { method, value: rawValue }
    );
  }

  function reportAsTarget({ node, rawValue, method }) {
    if (!rawValue || !rawValue.startsWith('/')) {
      return;
    }

    const result = evaluateConcretePath(rawValue, {
      normalizeAsPathValue,
      warnOnUnknownPaths,
      staticRoutes,
      dynamicMatchers,
      staticRoutesList,
      suggestClosestRoute,
    });

    reportRouteEvaluation(
      context,
      node,
      result,
      {
        pattern: 'asWithPattern',
        unknown: 'asUnknown',
      },
      { method, value: rawValue }
    );
  }

  function reportPreferUrlObject({ urlNode, urlValue, asNode, asValue, method }) {
    if (!preferUrlObject) {
      return;
    }
    if (!urlValue || !asValue) {
      return;
    }
    if (!urlValue.startsWith('/') || !asValue.startsWith('/')) {
      return;
    }
    if (!containsDynamicToken(urlValue)) {
      return;
    }
    if (containsDynamicToken(asValue)) {
      return;
    }

    const patternResult = evaluateRoutePattern(urlValue, {
      routeSet,
      dynamicMatchers,
      allRoutesList,
      suggestClosestRoute,
      allowDynamicSuggestion: false,
      disallowQueryHash: false,
    });

    if (patternResult.status !== 'ok') {
      return;
    }

    const asResult = evaluateConcretePath(asValue, {
      normalizeAsPathValue,
      warnOnUnknownPaths,
      staticRoutes,
      dynamicMatchers,
      staticRoutesList,
      suggestClosestRoute,
    });

    if (warnOnUnknownPaths && asResult.status !== 'ok') {
      return;
    }

    const urlObject = extractUrlObject(
      urlValue,
      asValue,
      normalizeAsPathValue
    );
    const suggestionText = urlObject
      ? buildUrlObjectSuggestion(urlObject.pathname, urlObject.params)
      : null;

    context.report({
      node: urlNode,
      messageId: 'preferUrlObject',
      data: { method },
      suggest: suggestionText
        ? [
            {
              desc: buildUrlObjectDesc(),
              fix(fixer) {
                if (!urlNode.range || !asNode.range) {
                  return null;
                }
                return fixer.replaceTextRange(
                  [urlNode.range[0], asNode.range[1]],
                  suggestionText
                );
              },
            },
          ]
        : undefined,
    });
  }

  return {
    reportStringTarget,
    reportPathname,
    reportAsTarget,
    reportPreferUrlObject,
  };
}

module.exports = {
  createRouterNavigationReporter,
};

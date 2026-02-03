const { getMemberExpressionPath } = require('./ast');
const { findClosestRoute } = require('./routes');
const { evaluateRoutePattern, evaluateConcretePath } = require('./routeEvaluation');
const { reportRouteEvaluation } = require('./reporting');

function createRouteCompareReporter(context, ruleContext) {
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

  function reportRoutePatternComparison({ memberNode, literalNode, rawValue }) {
    const result = evaluateRoutePattern(rawValue, {
      routeSet,
      dynamicMatchers,
      allRoutesList,
      suggestClosestRoute,
      allowDynamicSuggestion: true,
      disallowQueryHash: true,
    });

    reportRouteEvaluation(
      context,
      literalNode,
      result,
      {
        queryhash: 'routeWithQueryOrHash',
        unknown: 'invalidRouteCompare',
      },
      {
        obj: getMemberExpressionPath(memberNode.object) || 'router',
        prop: memberNode.property.name,
        value: rawValue,
      }
    );
  }

  function reportAsPathComparison({ literalNode, rawValue }) {
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
      literalNode,
      result,
      {
        pattern: 'asPathWithPattern',
        unknown: 'asPathUnknown',
      },
      { value: rawValue }
    );
  }

  function reportIncludesAsPathValue({ elementNode, rawValue }) {
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
      elementNode,
      result,
      {
        pattern: 'includesWithPattern',
        unknown: 'includesUnknown',
      },
      { value: rawValue }
    );
  }

  function reportIncludesRoutePatternValue({
    elementNode,
    rawValue,
    argNode,
    arrayValues,
  }) {
    const result = evaluateRoutePattern(rawValue, {
      routeSet,
      dynamicMatchers,
      allRoutesList,
      suggestClosestRoute,
      allowDynamicSuggestion: true,
      disallowQueryHash: true,
    });

    let overrideSuggestion;

    if (result.status === 'unknown') {
      overrideSuggestion = result.suggestion;

      if (overrideSuggestion && arrayValues && arrayValues.has(overrideSuggestion)) {
        overrideSuggestion = suggestClosestRoute
          ? findClosestRoute(result.normalized, allRoutesList, arrayValues)
          : null;
      }
    }

    const objPath = getMemberExpressionPath(argNode.object) || 'router';
    const propName = argNode.property.name;

    reportRouteEvaluation(
      context,
      elementNode,
      result,
      {
        queryhash: 'routeWithQueryOrHash',
        unknown: 'includesRouteUnknown',
      },
      {
        value: rawValue,
        obj: objPath,
        prop: propName,
      },
      overrideSuggestion
    );
  }

  function reportSwitchRouteCase({ discriminantNode, testNode, rawValue }) {
    const result = evaluateRoutePattern(rawValue, {
      routeSet,
      dynamicMatchers,
      allRoutesList,
      suggestClosestRoute,
      allowDynamicSuggestion: true,
      disallowQueryHash: true,
    });

    reportRouteEvaluation(
      context,
      testNode,
      result,
      {
        queryhash: 'routeWithQueryOrHash',
        unknown: 'invalidRouteCompare',
      },
      {
        obj: getMemberExpressionPath(discriminantNode.object) || 'router',
        prop: discriminantNode.property.name,
        value: rawValue,
      }
    );
  }

  function reportSwitchAsPathCase({ testNode, rawValue }) {
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
      testNode,
      result,
      {
        pattern: 'asPathWithPattern',
        unknown: 'asPathUnknown',
      },
      { value: rawValue }
    );
  }

  return {
    reportRoutePatternComparison,
    reportAsPathComparison,
    reportIncludesAsPathValue,
    reportIncludesRoutePatternValue,
    reportSwitchRouteCase,
    reportSwitchAsPathCase,
  };
}

module.exports = {
  createRouteCompareReporter,
};

const {
  unwrapChain,
  isStringLiteral,
  getStringLiteralValue,
} = require('../lib/ast');
const { normalizeTrailingSlash } = require('../lib/routes');
const { createRuleContext, normalizeRouteProperties } = require('../lib/ruleContext');
const { createRouteCompareReporter } = require('../lib/routeCompareReporter');
const {
  isMemberExpressionOnAllowedObject,
} = require('../lib/routerObjects');

function isRouterMemberExpression(
  node,
  allowedObjects,
  allowedObjectPaths,
  allowedProps
) {
  return isMemberExpressionOnAllowedObject(
    node,
    allowedObjects,
    allowedObjectPaths,
    allowedProps
  );
}

function isAsPathMemberExpression(node, allowedObjects, allowedObjectPaths) {
  return isMemberExpressionOnAllowedObject(
    node,
    allowedObjects,
    allowedObjectPaths,
    ['asPath']
  );
}

const EQUALITY_OPERATORS = new Set(['===', '==', '!==', '!=']);

function getRouteStringLiteral(node) {
  if (!isStringLiteral(node)) {
    return null;
  }
  const rawValue = getStringLiteralValue(node);

  if (!rawValue || !rawValue.startsWith('/')) {
    return null;
  }

  return rawValue;
}

function getLiteralComparisons(node, isAllowedMember) {
  if (!EQUALITY_OPERATORS.has(node.operator)) {
    return [];
  }

  const pairs = [];

  if (isAllowedMember(node.left)) {
    const rawValue = getRouteStringLiteral(node.right);

    if (rawValue) {
      pairs.push({
        memberNode: unwrapChain(node.left),
        literalNode: node.right,
        rawValue,
      });
    }
  }

  if (isAllowedMember(node.right)) {
    const rawValue = getRouteStringLiteral(node.left);

    if (rawValue) {
      pairs.push({
        memberNode: unwrapChain(node.right),
        literalNode: node.left,
        rawValue,
      });
    }
  }

  return pairs;
}

function getIncludesCallInfo(node) {
  const n = unwrapChain(node);
  const callee = n ? unwrapChain(n.callee) : null;

  if (
    !n ||
    n.type !== 'CallExpression' ||
    !callee ||
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'includes'
  ) {
    return null;
  }

  if (!n.arguments || n.arguments.length !== 1) {
    return null;
  }

  const receiver = callee.object;

  if (!receiver || receiver.type !== 'ArrayExpression') {
    return null;
  }

  return {
    arrayNode: receiver,
    argNode: n.arguments[0],
  };
}

const validRouterRouteCompare = {
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description:
        'Validate Next.js router.route/pathname/asPath comparisons using pages manifest',
      examples: {
        valid: [
          "router.route === '/settings/manage-profile/[type]'",
          "router.pathname === '/posts/[id]'",
          "router.asPath === '/settings/manage-profile/create'",
          "['/settings/manage-profile/create', '/settings/manage-profile/edit'].includes(router.asPath)",
          "['/settings/manage-profile/[type]'].includes(router.route)",
          "switch (router.route) { case '/posts/[id]': break; }",
        ],
        invalid: [
          "router.route === '/settings/manage-profile/create'",
          "router.pathname === '/foo/bar'",
          "router.asPath === '/settings/manage-profile/[type]'",
          "['/foo/[id]'].includes(router.asPath)",
          "['/unknown/path'].includes(router.asPath)",
          "switch (router.asPath) { case '/posts/[id]': break; }",
        ],
      },
    },
    schema: [
      {
        type: 'object',
        properties: {
          pagesDir: { type: 'string' },
          basePath: { type: 'string' },
          locales: { type: 'array', items: { type: 'string' } },
          readNextConfig: { type: 'boolean' },
          nextConfigPath: { type: 'string' },
          routerObjects: { type: 'array', items: { type: 'string' } },
          routeProperties: { type: 'array', items: { type: 'string' } },
          checkEquality: { type: 'boolean' },
          checkIncludes: { type: 'boolean' },
          checkSwitch: { type: 'boolean' },
          warnOnUnknownPaths: { type: 'boolean' },
          suggestClosestRoute: { type: 'boolean' },
          skipIfPagesDirMissing: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      invalidRouteCompare:
        "{{obj}}.{{prop}} is compared to '{{value}}', which is not a known route pattern. Use a dynamic pattern (e.g. '/posts/[id]') or switch to asPath for concrete URLs.{{suggestion}}",
      routeWithQueryOrHash:
        "{{obj}}.{{prop}} must not contain query (?...) or hash (#...). Use asPath for those instead.",
      includesRouteUnknown:
        "includes({{obj}}.{{prop}}) contains '{{value}}', which is not a known route pattern. Use a dynamic pattern (e.g. '/posts/[id]') or compare asPath.{{suggestion}}",
      asPathWithPattern:
        "asPath must be compared to a concrete URL (e.g. '/posts/123'), not a dynamic pattern like '{{value}}'.",
      asPathUnknown:
        "asPath '{{value}}' does not match any route pattern in your pages directory.{{suggestion}}",
      includesWithPattern:
        "includes(asPath) must only contain concrete URLs, not route patterns like '{{value}}'.",
      includesUnknown:
        "includes(asPath) contains '{{value}}' which does not match any page in your project.{{suggestion}}",
    },
  },

  create(context) {
    const options = context.options?.[0] || {};

    const routeProperties = normalizeRouteProperties(options.routeProperties);
    const checkEquality = options.checkEquality !== false;
    const checkIncludes = options.checkIncludes !== false;
    const checkSwitch = options.checkSwitch !== false;

    if (!checkEquality && !checkIncludes && !checkSwitch) {
      return {};
    }

    const ruleContext = createRuleContext(context, options);

    if (!ruleContext) {
      return {};
    }

    const { routerObjectNames, routerObjectPaths } = ruleContext;
    const reporter = createRouteCompareReporter(context, ruleContext);

    function validateRoutePatternEquality(node) {
      const comparisons = getLiteralComparisons(node, (member) =>
        isRouterMemberExpression(
          member,
          routerObjectNames,
          routerObjectPaths,
          routeProperties
        )
      );

      for (const comparison of comparisons) {
        reporter.reportRoutePatternComparison(comparison);
      }
    }

    function validateAsPathEquality(node) {
      const comparisons = getLiteralComparisons(node, (member) =>
        isAsPathMemberExpression(member, routerObjectNames, routerObjectPaths)
      );

      for (const comparison of comparisons) {
        reporter.reportAsPathComparison({
          literalNode: comparison.literalNode,
          rawValue: comparison.rawValue,
        });
      }
    }

    function validateArrayIncludesAsPath(node) {
      const info = getIncludesCallInfo(node);

      if (!info) {
        return;
      }

      if (
        !isAsPathMemberExpression(
          info.argNode,
          routerObjectNames,
          routerObjectPaths
        )
      ) {
        return;
      }

      for (const el of info.arrayNode.elements) {
        if (!el || !isStringLiteral(el)) {
          continue;
        }

        const rawValue = getRouteStringLiteral(el);

        if (!rawValue) {
          continue;
        }

        reporter.reportIncludesAsPathValue({
          elementNode: el,
          rawValue,
        });
      }
    }

    function validateArrayIncludesRoutePattern(node) {
      const info = getIncludesCallInfo(node);

      if (!info) {
        return;
      }

      if (
        !isRouterMemberExpression(
          info.argNode,
          routerObjectNames,
          routerObjectPaths,
          routeProperties
        )
      ) {
        return;
      }

      const argNode = unwrapChain(info.argNode);
      const arrayValues = new Set();

      for (const el of info.arrayNode.elements) {
        if (!el || !isStringLiteral(el)) {
          continue;
        }

        const rawValue = getRouteStringLiteral(el);

        if (!rawValue) {
          continue;
        }

        arrayValues.add(normalizeTrailingSlash(rawValue));
      }

      for (const el of info.arrayNode.elements) {
        if (!el || !isStringLiteral(el)) {
          continue;
        }

        const rawValue = getRouteStringLiteral(el);

        if (!rawValue) {
          continue;
        }

        reporter.reportIncludesRoutePatternValue({
          elementNode: el,
          rawValue,
          argNode,
          arrayValues,
        });

      }
    }

    function validateSwitchStatement(node) {
      const discriminant = node.discriminant;
      const discriminantNode = unwrapChain(discriminant);
      const isRouteLike =
        isRouterMemberExpression(
          discriminant,
          routerObjectNames,
          routerObjectPaths,
          routeProperties
        );
      const isAsPath =
        isAsPathMemberExpression(
          discriminant,
          routerObjectNames,
          routerObjectPaths
        );

      if (!isRouteLike && !isAsPath) {
        return;
      }

      for (const caseNode of node.cases) {
        if (!caseNode.test || !isStringLiteral(caseNode.test)) {
          continue;
        }

        const rawValue = getStringLiteralValue(caseNode.test);

        if (!rawValue || !rawValue.startsWith('/')) {
          continue;
        }

        if (isRouteLike) {
          reporter.reportSwitchRouteCase({
            discriminantNode,
            testNode: caseNode.test,
            rawValue,
          });
          continue;
        }

        reporter.reportSwitchAsPathCase({
          testNode: caseNode.test,
          rawValue,
        });
      }
    }

    return {
      BinaryExpression(node) {
        if (!checkEquality) {
          return;
        }
        validateRoutePatternEquality(node);
        validateAsPathEquality(node);
      },
      CallExpression(node) {
        if (!checkIncludes) {
          return;
        }
        validateArrayIncludesAsPath(node);
        validateArrayIncludesRoutePattern(node);
      },
      SwitchStatement(node) {
        if (!checkSwitch) {
          return;
        }
        validateSwitchStatement(node);
      },
    };
  },
};

module.exports = validRouterRouteCompare;

const { isStringLiteral, getStringLiteralValue } = require('../lib/ast');
const { createRuleContext } = require('../lib/ruleContext');
const { getAllowedRouterMethodCall } = require('../lib/routerCalls');
const { getObjectPropertyValue } = require('../lib/ast');
const { createRouterNavigationReporter } = require('../lib/routerNavigationReporter');

function getRouterMethodCallInfo(node, allowedObjects, allowedObjectPaths) {
  return getAllowedRouterMethodCall(
    node,
    allowedObjects,
    allowedObjectPaths,
    ['push', 'replace']
  );
}

const noInvalidRouterNavigation = {
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description:
        'Validate Next.js router.push/replace navigation targets against the pages manifest',
      examples: {
        valid: [
          "router.push('/about')",
          "router.replace('/posts/123')",
          "router.push({ pathname: '/posts/[id]', query: { id } })",
          "router.push('/posts/[id]', '/posts/123')",
          "router.replace({ pathname: '/posts/[id]' }, '/posts/123')",
        ],
        invalid: [
          "router.push('/posts/[id]')",
          "router.replace('/post/[id]')",
          "router.push({ pathname: '/post/[id]' })",
          "router.push('/posts/[id]', '/post/[id]')",
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
          warnOnUnknownPaths: { type: 'boolean' },
          suggestClosestRoute: { type: 'boolean' },
          skipIfPagesDirMissing: { type: 'boolean' },
          preferUrlObject: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      navigationPatternWithoutAs:
        "router.{{method}} is called with route pattern '{{value}}' but no `as` value. Use a URL object with `pathname`/`query` or pass a concrete `as` URL.",
      navigationPatternUnknown:
        "router.{{method}} is called with route pattern '{{value}}', which is not a known route pattern. Use a dynamic pattern (e.g. '/posts/[id]').{{suggestion}}",
      navigationUnknown:
        "router.{{method}} is called with '{{value}}', which does not match any route pattern in your pages directory.{{suggestion}}",
      asWithPattern:
        "router.{{method}} `as` value '{{value}}' must be a concrete URL, not a route pattern.",
      asUnknown:
        "router.{{method}} `as` value '{{value}}' does not match any route pattern in your pages directory.{{suggestion}}",
      pathnameUnknown:
        "router.{{method}} is called with pathname '{{value}}', which does not match any known pages route. Use a dynamic pattern (e.g. '/posts/[id]') when passing `query`.{{suggestion}}",
      pathnameWithQueryOrHash:
        "router.{{method}} pathname must not contain query (?...) or hash (#...). Use query or `as` instead.",
      preferUrlObject:
        "router.{{method}} uses a pattern string with a string `as`. Consider using a UrlObject with `pathname` and `query` to make params explicit.",
    },
  },

  create(context) {
    const options = context.options?.[0] || {};

    const ruleContext = createRuleContext(context, options);
    const preferUrlObject = options.preferUrlObject !== false;

    if (!ruleContext) {
      return {};
    }

    const { routerObjectNames, routerObjectPaths } = ruleContext;
    const reporter = createRouterNavigationReporter(context, ruleContext, {
      preferUrlObject,
    });

    return {
      CallExpression(node) {
        const info = getRouterMethodCallInfo(
          node,
          routerObjectNames,
          routerObjectPaths
        );

        if (!info) {
          return;
        }

        const { callNode, method } = info;
        const args = callNode.arguments || [];

        if (args.length === 0) {
          return;
        }

        const urlArg = args[0];
        const asArg = args[1];
        let urlValue = null;
        let asValue = null;

        if (isStringLiteral(urlArg)) {
          const rawValue = getStringLiteralValue(urlArg);
          urlValue = rawValue;
          reporter.reportStringTarget({
            node: urlArg,
            rawValue,
            method,
            hasAs: Boolean(asArg),
          });
        } else if (urlArg && urlArg.type === 'ObjectExpression') {
          const pathnameNode = getObjectPropertyValue(urlArg, 'pathname');

          if (pathnameNode && isStringLiteral(pathnameNode)) {
            const rawValue = getStringLiteralValue(pathnameNode);
            reporter.reportPathname({
              node: pathnameNode,
              rawValue,
              method,
            });
          }
        }

        if (asArg && isStringLiteral(asArg)) {
          const rawValue = getStringLiteralValue(asArg);
          asValue = rawValue;
          reporter.reportAsTarget({
            node: asArg,
            rawValue,
            method,
          });
        } else if (asArg && asArg.type === 'ObjectExpression') {
          const pathnameNode = getObjectPropertyValue(asArg, 'pathname');

          if (pathnameNode && isStringLiteral(pathnameNode)) {
            const rawValue = getStringLiteralValue(pathnameNode);
            reporter.reportAsTarget({
              node: pathnameNode,
              rawValue,
              method,
            });
          }
        }

        if (urlValue && asValue) {
          reporter.reportPreferUrlObject({
            urlNode: urlArg,
            urlValue,
            asNode: asArg,
            asValue,
            method,
          });
        }
      },
    };
  },
};

module.exports = noInvalidRouterNavigation;

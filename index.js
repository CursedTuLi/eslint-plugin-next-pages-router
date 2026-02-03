const validRouterRouteCompare = require('./rules/no-invalid-route-compare');
const noInvalidRouterNavigation = require('./rules/no-invalid-router-navigation');
const PLUGIN_NAME = '@mertcreates/next-pages-router';

const rules = {
  'no-invalid-route-compare': validRouterRouteCompare,
  'no-invalid-router-navigation': noInvalidRouterNavigation,
};

module.exports = {
  rules,
  configs: {
    recommended: {
      plugins: [PLUGIN_NAME],
      rules: {
        [`${PLUGIN_NAME}/no-invalid-route-compare`]: 'warn',
        [`${PLUGIN_NAME}/no-invalid-router-navigation`]: 'warn',
      },
    },
    'flat/recommended': {
      plugins: {
        [PLUGIN_NAME]: {
          rules,
        },
      },
      rules: {
        [`${PLUGIN_NAME}/no-invalid-route-compare`]: 'warn',
        [`${PLUGIN_NAME}/no-invalid-router-navigation`]: 'warn',
      },
    },
  },
};

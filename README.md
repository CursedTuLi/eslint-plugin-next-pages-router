# eslint-plugin-next-pages-router

ESLint rules to validate Next.js `router.route`, `router.pathname`, and
`router.asPath` comparisons against the `pages/` manifest.

## Install

```bash
npm i -D @mertcreates/eslint-plugin-next-pages-router
# or
yarn add -D @mertcreates/eslint-plugin-next-pages-router
# or
pnpm add -D @mertcreates/eslint-plugin-next-pages-router
```

## Usage (eslintrc)

```json
{
  "plugins": ["@mertcreates/next-pages-router"],
  "extends": ["plugin:@mertcreates/next-pages-router/recommended"]
}
```

## Usage (flat config)

```js
const nextRouting = require('@mertcreates/eslint-plugin-next-pages-router');

module.exports = [
  nextRouting.configs['flat/recommended'],
];
```

## Rules

### `next-pages-router/no-invalid-route-compare`

Validates that:
- `router.route` and `router.pathname` are compared against **route patterns**
  that exist in `pages/` (e.g. `'/posts/[id]'`).
- `router.asPath` is compared against **concrete URLs** (e.g. `'/posts/123'`)
  and matches an existing pages route.

### Options

All options are optional and can be provided as the first rule option.

```json
{
  "rules": {
    "@mertcreates/next-pages-router/no-invalid-route-compare": [
      "warn",
      {
        "pagesDir": "pages",
        "routerObjectNames": ["router"],
        "routerObjectPaths": ["props.router"],
        "routeProperties": ["route", "pathname"],
        "checkEquality": true,
        "checkIncludes": true,
        "checkSwitch": true,
        "warnOnUnknownPaths": true,
        "suggestClosestRoute": true
      }
    ]
  }
}
```

Option reference:
- `pagesDir` (string, default: `"pages"`). Directory for Next.js pages.
- `routerObjectNames` (string[], default: `[]`). Allow-list of identifier names
  that represent the router object.
- `routerObjectPaths` (string[], default: `[]`). Allow-list of member paths that
  represent the router object (e.g. `"props.router"`).
- `routeProperties` (string[], default: `["route","pathname"]`). Router fields
  treated as route patterns.
- `checkEquality` (boolean, default: `true`). Enable `===`/`==` comparisons.
- `checkIncludes` (boolean, default: `true`). Enable `includes(...)` checks.
- `checkSwitch` (boolean, default: `true`). Enable `switch (...)` checks.
- `warnOnUnknownPaths` (boolean, default: `true`). Warn when `asPath`,
  `includes(asPath)`, or `switch (asPath)` contains paths that don't match any
  known pages route.
- `suggestClosestRoute` (boolean, default: `true` in VS Code, `false` in CLI).
  Adds "Did you mean" suggestions. When set, it overrides the default behavior.
- `skipIfPagesDirMissing` (boolean, default: `true`). Skip checks when the
  `pagesDir` doesn't exist (useful in monorepos or non-Next builds).

## License

MIT.

# eslint-plugin-next-pages-router

[![npm version](https://img.shields.io/npm/v/@mertcreates/eslint-plugin-next-pages-router.svg)](https://www.npmjs.com/package/@mertcreates/eslint-plugin-next-pages-router)
[![npm downloads](https://img.shields.io/npm/dm/@mertcreates/eslint-plugin-next-pages-router.svg)](https://www.npmjs.com/package/@mertcreates/eslint-plugin-next-pages-router)
[![license](https://img.shields.io/npm/l/@mertcreates/eslint-plugin-next-pages-router.svg)](LICENSE)
[![CI](https://github.com/mertcreates/eslint-plugin-next-pages-router/actions/workflows/ci.yml/badge.svg)](https://github.com/mertcreates/eslint-plugin-next-pages-router/actions/workflows/ci.yml)

ESLint rules to catch invalid Pages Router route comparisons and navigation
calls. It validates hardcoded route strings against your `pages/` manifest and
helps prevent typos or mismatched patterns.

Pages Router only. App Router (`app/`) is out of scope.

If you use the App Router, consider Next.js built-in typed routes instead.

## Contents

- [Features](#features)
- [Install](#install)
- [Usage (eslintrc)](#usage-eslintrc)
- [Usage (flat config)](#usage-flat-config)
- [Rules](#rules)
- [Options](#options)
- [Compatibility](#compatibility)
- [Benchmarks](#benchmarks)
- [License](#license)

## Features

- Validates route comparisons (`===`, `.includes()`, `switch`)
- Checks `router.push` / `router.replace` targets
- Distinguishes patterns (`/posts/[id]`) from concrete paths (`/posts/123`)
- Handles query strings, hashes, trailing slashes, `basePath`, and `i18n.locales`
- Provides ESLint suggestions (quick fixes in supporting editors)

## Install

```bash
npm i -D @mertcreates/eslint-plugin-next-pages-router
# or
yarn add -D @mertcreates/eslint-plugin-next-pages-router
# or
pnpm add -D @mertcreates/eslint-plugin-next-pages-router
# or
bun add -D @mertcreates/eslint-plugin-next-pages-router
```

## Usage (eslintrc)

```json
{
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

The recommended config enables both rules.

### `@mertcreates/next-pages-router/no-invalid-route-compare`

Validates that:
- `router.route` and `router.pathname` are compared against **route patterns**
  that exist in `pages/` (e.g. `'/posts/[id]'`).
- `router.asPath` is compared against **concrete URLs** (e.g. `'/posts/123'`)
  and matches an existing pages route.
- Query strings or hashes (`?` / `#`) are only used with `asPath`.

Suggestions are provided as **ESLint suggestions** when
`suggestClosestRoute` is enabled (default: on in VS Code, off in CLI).

Incorrect:

```js
router.route === '/posts/123'
router.asPath === '/posts/[id]'
```

Correct:

```js
router.route === '/posts/[id]'
router.asPath === '/posts/123?sort=asc'
```

### `@mertcreates/next-pages-router/no-invalid-router-navigation`

Validates `router.push` and `router.replace` targets:
- String URLs must be **concrete** and match a pages route.
- URL objects may use a **route pattern** in `pathname` with `query`, or a
  **concrete** `pathname` that matches a pages route.
- Passing a pattern string is only valid when an `as` URL is provided.
- `as` must be a concrete URL (no route patterns).

When `preferUrlObject` is enabled (default), string `url` + string `as`
usage is reported as legacy. Use a UrlObject instead.

Incorrect:

```js
router.push('/unknown')
router.push('/posts/[id]')
```

Correct:

```js
router.push('/posts/123')
router.push({ pathname: '/posts/[id]', query: { id: '123' } })
```

## Options

Options below are optional and provided as the first rule option. Options
are set per rule, and some only apply to the compare rule.

```json
{
  "rules": {
    "@mertcreates/next-pages-router/no-invalid-route-compare": [
      "warn",
      {
        "pagesDir": "pages",
        "readNextConfig": true,
        "nextConfigPath": "./apps/web/next.config.js",
        "basePath": "/docs",
        "locales": ["en", "tr"],
        "routerObjects": ["router", "Router", "props.router"],
        "routeProperties": ["route", "pathname"],
        "checkEquality": true,
        "checkIncludes": true,
        "checkSwitch": true,
        "warnOnUnknownPaths": true,
        "suggestClosestRoute": true,
        "skipIfPagesDirMissing": true
      }
    ],
    "@mertcreates/next-pages-router/no-invalid-router-navigation": [
      "warn",
      {
        "pagesDir": "pages",
        "readNextConfig": true,
        "nextConfigPath": "./apps/web/next.config.js",
        "basePath": "/docs",
        "locales": ["en", "tr"],
        "routerObjects": ["router", "Router", "props.router"],
        "warnOnUnknownPaths": true,
        "suggestClosestRoute": true,
        "preferUrlObject": true,
        "skipIfPagesDirMissing": true
      }
    ]
  }
}
```

Option reference:

| Option | Type | Default | Applies to | Description |
| --- | --- | --- | --- | --- |
| `pagesDir` | `string` | `"pages"` | both | Directory for Next.js pages. |
| `readNextConfig` | `boolean` | `false` | both | If true, reads `basePath` and `i18n.locales` from `next.config.*`. |
| `nextConfigPath` | `string` | `""` | both | Optional path to Next config when `readNextConfig` is enabled. |
| `basePath` | `string` | `""` | both | Overrides Next config. |
| `locales` | `string[]` | `[]` | both | Overrides Next config. |
| `routerObjects` | `string[]` | `["router", "Router"]` | both | Allow-list of router object identifiers or member paths (e.g. `"router"`, `"props.router"`). |
| `routeProperties` | `string[]` | `["route","pathname"]` | compare | Router fields treated as route patterns. |
| `checkEquality` | `boolean` | `true` | compare | Enable `===`/`==` comparisons. |
| `checkIncludes` | `boolean` | `true` | compare | Enable `includes(...)` checks. |
| `checkSwitch` | `boolean` | `true` | compare | Enable `switch (...)` checks. |
| `warnOnUnknownPaths` | `boolean` | `true` | both | Warn when `asPath` or navigation targets do not match any known pages route. |
| `suggestClosestRoute` | `boolean` | `true` in VS Code, `false` in CLI | both | Adds "Did you mean" suggestions. When set, it overrides the default behavior. |
| `preferUrlObject` | `boolean` | `true` | navigation | Report legacy `router.push(pattern, as)` usage and prefer UrlObject with `pathname` + `query`. |
| `skipIfPagesDirMissing` | `boolean` | `true` | both | Skip checks when the `pagesDir` doesn't exist (useful in monorepos or non-Next builds). |

## Compatibility

- Node: `>=16`
- ESLint: `8` or `9`
- Next.js: `>=10` (Pages Router)

## Benchmarks

Benchmarks here measure **rule overhead** (not total ESLint time).

Latest run (mixed mode, 12k statements across 80 files, 5-run average):
- Real project pages (46 routes): ~2–3 ms per run
- Synthetic stress (6000 routes): ~2–3 ms per run

See benchmark details in [BENCHMARKS.md](BENCHMARKS.md).

## License

MIT.

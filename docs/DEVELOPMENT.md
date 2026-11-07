# MarkView Local Development Guide

How to build, run and test MarkView Local, and where things live.

## Requirements

- Node.js 22.22.2+, 24.15.0+, or 26+ (the supported ranges required by jsdom and Vitest)
- pnpm 12 or later: `npm install -g pnpm`. Use pnpm to preserve the lockfile.
  `pnpm-workspace.yaml` approves only esbuild's dependency build script.

## Build and load

Run these commands from this modified checkout:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

`pnpm run build` cleans, copies the version from `package.json` into the manifest, bundles with webpack in production
mode into `extension/`, and zips that folder into `dist/markview-local-<version>.zip`.

Load `extension/` in the browser:

1. Open `chrome://extensions/` (or `edge://extensions/`) and turn on **Developer mode**
2. Click **Load unpacked** and select the `extension/` folder
3. For local files, open the extension's **Details** and turn on **Allow access to file URLs**

## Day-to-day work

```bash
pnpm run dev          # development build into extension/, rebuilt on every change (inline source maps)
```

After a rebuild, click the reload icon on the extension's card in `chrome://extensions/`, then reload the markdown
tab. The content script is only injected on page load.

| Script                   | Does                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `pnpm run dev`           | Development build in watch mode                               |
| `pnpm run dev:clean`     | `clean`, then `dev`                                           |
| `pnpm run build`         | Clean production build into `extension/` and a zip in `dist/` |
| `pnpm run clean`         | Remove `extension/` and `dist/`                               |
| `pnpm run test`          | Vitest in watch mode                                          |
| `pnpm run test:run`      | Vitest, single run (what CI runs)                             |
| `pnpm run test:coverage` | Coverage report (v8) for `src/core` and `src/utils`           |
| `pnpm run test:ui`       | Vitest UI                                                     |
| `pnpm run lint`          | Oxlint (type-aware) on `src/`                                |
| `pnpm run lint:fix`      | Oxlint with auto-fix                                          |
| `pnpm run format`        | Prettier on `src/`                                            |
| `pnpm run format:check`  | Prettier check on `src/`                                      |
| `pnpm run type-check`    | `tsc --noEmit` over `src/` and `tests/`                       |

CI (`.github/workflows/ci.yml`) runs lint, format check, type check, tests and the build on every push and pull
request.

## Theme changes and checks

Document colors live in `src/styles/document-theme.css`; `src/utils/document-theme.ts` owns the allowlisted
`documentTheme` marker. The setting is separate from interface `theme` and code `syntaxTheme`. Keep new document
rules scoped to the reading area and avoid overriding an explicitly selected external syntax theme.

Focused checks:

```bash
pnpm exec vitest run tests/utils/document-theme.test.ts tests/core/document-theme-settings.test.ts tests/popup/settings-tab.test.ts tests/utils/syntax-theme-loader.test.ts tests/utils/html-export.test.ts
```

The document tests use real rendered and sanitized Markdown, screen styles in both interface modes, persisted
settings, live changes, and exported HTML. For a browser check after building, open
[`examples/document-theme.md`](../examples/document-theme.md) via its local file URL. Try both Document Theme choices
with Light and Dark interface modes, select an external Syntax Theme, and toggle back to Default. Confirm that
headings, prose, links, quotes and inline code change while the interface and chosen syntax theme retain their own
appearance. Reload, export HTML and open the result, then check print preview against the existing print stylesheet.
Browser verification is manual; unit tests do not reproduce browser print layout or extension isolated worlds.

## Browser security regression check

After building and loading the unpacked extension, enable **Allow access to file URLs**. Open the Markdown fixture via
its `file:///...` URL; serve only its referenced resources from loopback origin A and sentinel responses (non-image
and valid image) from a different loopback port at origin B. Include direct and A-to-B redirected image URLs, and
ensure images enter the viewport. Verify that a Markdown fixture served from HTTP(S) does not activate MarkView Local.
Inspect the rendered page and image attributes: no response-derived data/blob URL or sentinel bytes should appear;
obsolete `fetchImage` messages should receive the unknown-action response without a network request. Cross-origin
images may display under browser policy, but must remain origin-tainted for canvas readback. Also include an iframe
fixture and verify embedded pages and videos are removed. Repeat with restrictive image CSP, using browser tooling where
opener access is unavailable.
Record browser version, effective response headers, extension build, and results. This manual regression has not been
run automatically by the unit suite.

## Project layout

```text
src/
├── main.ts                 # Content script entry: validates the page, then starts the lifecycle
├── background.ts           # Service worker: fetches for auto-refresh, opens tabs
├── manifest.json           # Extension manifest (version is filled in from package.json at build)
├── core/
│   ├── lifecycle.ts        # Builds the ExtensionState and runs startup
│   ├── document-renderer.ts# Markdown source → rendered page
│   ├── markdown.ts         # markdown-it setup and post-processing
│   ├── sanitize-document-html.ts # DOMPurify sanitizer for the rendered document
│   ├── component-manager.ts# Mounts and unmounts UI components
│   ├── event-handlers.ts   # Wires UI events
│   ├── settings-manager.ts # Applies and reacts to settings
│   ├── storage.ts          # chrome.storage access
│   └── plugins/            # Plugin registry, manager and one definition file per plugin
├── components/             # UI components (TOC sidebar, theme toggle, code copy, image viewer, …)
├── popup/                  # Toolbar popup: recent documents and settings tabs
├── plugins/                # Custom markdown-it plugin for Mermaid
├── utils/                  # DOM helpers, i18n, logger, auto-refresh, fonts, source extraction, …
├── styles/                 # CSS, one file per area; tokens.css holds the design tokens
├── _locales/               # Interface strings, one messages.json per language
├── assets/icons/           # Extension icons
└── types/                  # Type declarations for untyped markdown-it plugins
build/                      # webpack.common.cjs, webpack.dev.cjs, webpack.prod.cjs
scripts/                    # clean, manifest version sync, zip
tests/                      # Vitest suites, mirroring src/ (tests/core, tests/utils)
examples/                   # Sample documents for trying the renderer
```

## Conventions

- **No UI framework.** Components are TypeScript classes that build and manage their own DOM.
- **No global state.** The `ExtensionState` created in `core/lifecycle.ts` is passed to the functions that need it.
- **No bundle splitting.** Webpack emits one file per entry (`content.js`, `background.js`, `popup.js`), because a
  content script cannot load extra chunks at run time under extension CSP.
- **Interface strings** come from `src/_locales/<language>/messages.json` through `getMessage()` in
  `src/utils/i18n.ts`, collected in `src/utils/messages.ts`. A new string needs an entry in every locale; use the
  English text where you cannot translate it.
- **Logging** goes through `logger` from `src/utils/logger.ts`, not `console.log` (Oxlint warns on it).
- **Document HTML reaches the page only through the sanitizer.** HTML derived from a document (rendered markdown, raw
  HTML) is inserted with `setDocumentHTML()` from `src/core/sanitize-document-html.ts`, or passed through
  `sanitizeDocumentHTML()`, never with `innerHTML`. HTML that is only read is parsed with `DOMParser`. Never move
  parser-created nodes into the page from the content script: Chrome binds `on*` handlers to the page's main world at
  parse time, and removing the attribute from the isolated world leaves them alive. See "Security notes" in
  [ARCHITECTURE.md](ARCHITECTURE.md).

## Code style

Prettier (`.prettierrc`): 2-space indentation, single quotes, semicolons, trailing commas where valid in ES5, 100
character lines, LF line endings.

Oxlint (`oxlint.json`, loaded explicitly by both lint scripts) highlights:

- `prefer-const` and `no-var` are errors; unused variables are errors (only arguments prefixed with `_` are exempt)
- `any` is a warning: prefer a real type or `unknown`
- `console.log` is a warning; `console.warn` and `console.error` are allowed
- `options.typeAware: true` activates `oxlint-tsgolint`; `require-await` remains a warning
- Substantive ESLint/TypeScript recommended checks are selected explicitly, including invalid regexes,
  unsafe optional chains, empty blocks, duplicate enum values, and unsafe declaration merging
- The previous Chrome API exceptions remain: unsafe-value rules, floating/misused promises, and
  `no-case-declarations` are off; TypeScript suppression comments without descriptions produce warnings

`tsc --noEmit` remains a separate check. Compiler/parser diagnostics cover duplicate arguments, invalid
constructors, undefined names, and legacy octal syntax; Prettier covers extra semicolons and mixed indentation.
The rule mapping is not a byte-for-byte ESLint preset port. Packaging uses fflate with Node filesystem traversal;
production webpack uses its native output cleaning before static assets are copied.

## Tests

Vitest with the happy-dom environment and Chrome API mocks from `tests/setup.ts`. Tests live in `tests/`, mirroring
`src/`: a test for `src/utils/dom.ts` goes in `tests/utils/dom.test.ts`.

```typescript
import { describe, it, expect } from 'vitest';
import { extractFileNameFromUrl } from '@core/document-renderer';

describe('extractFileNameFromUrl', () => {
  it('should decode a URL-encoded filename', () => {
    expect(extractFileNameFromUrl('https://example.com/docs/My%20Document.md')).toBe(
      'My Document.md'
    );
  });
});
```

Tests that check DOMPurify's output run in jsdom instead, with a `// @vitest-environment jsdom` first line: under
happy-dom, DOMPurify keeps handlers and URLs that a browser's parser lets it remove, so a pass there proves nothing.

Path aliases (`@core`, `@utils`, `@components`, …) work in tests as in source. Coverage is reported for `src/core`
and `src/utils`; no minimum is enforced.

## Common tasks

### Add a markdown-it plugin

1. `pnpm add markdown-it-example`
2. Create `src/core/plugins/definitions/example.plugin.ts`:

   ```typescript
   import markdownItExample from 'markdown-it-example';
   import type { MarkdownPlugin } from '../types';

   export const examplePlugin: MarkdownPlugin = {
     id: 'example',
     name: 'Example',
     version: '1.0.0',
     description: 'What the syntax does',
     category: 'formatting',
     priority: 50, // lower installs earlier; ranges are documented in ../types.ts
     enabledByDefault: true,

     install(md) {
       md.use(markdownItExample);
     },
   };
   ```

3. Export it from `src/core/plugins/definitions/index.ts` and add it to `PLUGIN_REGISTRY` in
   `src/core/plugins/registry.ts`
4. If the package has no types, declare it in `src/types/markdown-it-plugins.d.ts`
5. Add a test in `tests/core/plugins/` and a sample to `examples/features-demo.md`

### Add a UI component

Create a class in `src/components/` that builds its element, mounts it and cleans up after itself, add its CSS in
`src/styles/`, and register it where the other components are mounted (`src/core/component-manager.ts`).

## Troubleshooting

- **The extension does not appear after Load unpacked:** make sure you selected `extension/` (not `dist/`) and that
  it contains `manifest.json`. Run `pnpm run build` again if not.
- **Local files are not rendered:** turn on **Allow access to file URLs** in the extension's Details.
- **Changes do not show up:** reload the extension in `chrome://extensions/`, then reload the markdown tab.
- **Dependency installation:** use pnpm 12+ with a supported Node version; CI installs with `--frozen-lockfile`.

## Getting help

For MarkView Local changes, contact the maintainer of your checkout. The following channels belong to the original
MarkView project and are for issues reproducible upstream:

- Upstream questions: [Discussions](https://github.com/markview-app/markview/discussions)
- Upstream bugs: [Issues](https://github.com/markview-app/markview/issues)

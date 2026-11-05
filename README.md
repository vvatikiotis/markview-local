# MarkView Local

MarkView Local is a modified build of the original MarkView open-source Markdown viewer for Chromium browsers.

Kudos and thanks to **MarkView Team**, the original authors, for creating MarkView and sharing its open-source core.

[Original repository](https://github.com/markview-app/markview) · [Original website](https://getmarkview.com/)

The original authors do not maintain or endorse these local modifications.

## Differences from the original open-source edition

These changes are relative to the upstream snapshot cloned for this repository, not the separate store edition.

- **Local files only:** Markdown viewing and host permissions are restricted to `file://` URLs; remote documents are
  not processed.
- **No custom keybindings:** Shortcut handling, shortcut help, and Shift-click actions are removed. Use the on-page
  controls and Actions menu; native browser keyboard behavior remains available.
- **No embedded pages:** `iframe`, `frame`, and `frameset` elements are removed from document HTML and returned Mermaid
  markup. This also disables iframe-based video embeds.
- **No privileged image proxy:** Images load through normal browser requests, without a background-worker fallback
  that bypasses page restrictions. Images blocked by browser policy stay blocked.
- **Updated dependencies and tooling:** TypeScript 7, type-aware Oxlint, a maintained KaTeX plugin, and a replacement ZIP
  writer replace the older compiler, linter, math plugin, and packaging dependencies.
- **Additional regression tests:** Coverage includes the security restrictions and remaining UI controls; lint now
  rejects warnings as well as errors.

## Features

**Rendering**

- GitHub Flavored Markdown: tables, task lists, strikethrough, footnotes, autolinks
- GitHub-style alerts: Note, Tip, Important, Warning, Caution
- Extended syntax: subscript, superscript, inserted and highlighted text, abbreviations, definition lists, custom
  containers, emoji shortcodes
- Syntax highlighting with highlight.js (its common language set), a copy button and 14 color themes
- Mermaid diagrams, with zoom and download
- KaTeX math, inline and display

**Reading**

- Light and dark themes
- Table of contents for H1–H3 headings, in a resizable sidebar
- Raw markdown view, print styles, image viewer, font selection
- Export the rendered document as a static HTML snapshot with MarkView styles and syntax highlighting. Images and other document resources remain referenced by source-resolved URLs, not bundled. KaTeX fonts are embedded from packaged extension assets. Mermaid is static; HTML labels become plain SVG text, so complex label layout may differ.
- Recent documents and settings in the toolbar popup
- Interface in 12 languages

**Supported file extensions**

- `.md`, `.markdown`, `.mkd` and `.mdx`

## Install from source

Requirements: Node.js 22.22.2+, 24.15.0+, or 26+, and pnpm 12 or later.

From this checkout:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Then load the unpacked extension:

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Turn on **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder
4. To view local files, open the extension's **Details** and turn on **Allow access to file URLs**

The build also writes `dist/markview-local-<version>.zip`. After editing a Markdown file, refresh its browser tab;
automatic local-file watching is not supported.

## Privacy

Markdown is parsed and rendered in the browser tab. There is no analytics, telemetry, or crash reporting.

Local-file-only does not mean offline. Documents can request remote images, media, and CSS resources. Selecting a
non-default Font Family loads Google Fonts unless a local prose font is set. These requests expose normal network metadata, such as your IP address.

In Settings or Quick Settings, use **Local fonts** to enter separate installed font family names for
interface, code (including raw Markdown), and prose, such as `Segoe UI`, `JetBrains Mono`, and `Georgia`.
Changes save when you leave the field. Local fonts do not require downloads or font-list permission.
Leave a font field blank to restore its default; prose uses the existing Font Family selection. Set each size in pixels from 8 to 48, or leave it blank to use the default size. If a font
is not installed or is unavailable to the browser, a fallback font is displayed.

**Permissions**

- `storage`: saves your settings and the recent-documents list in the browser
- Host access to `file:///*`: allows processing local documents and fetching them through the background worker

## Documentation

- [Development guide](docs/DEVELOPMENT.md): build, test and project layout
- [Architecture](docs/ARCHITECTURE.md): how a document goes from raw text to rendered page
- [Contributing](docs/CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Support

These links are for the original upstream project, not support for local modifications.

- Upstream bugs: [open an issue](https://github.com/markview-app/markview/issues/new/choose)
- Questions: [Discussions](https://github.com/markview-app/markview/discussions)
- Security vulnerabilities: follow the Security policy listed above; do not open a public issue

## License

[MIT](LICENSE). The original copyright and permission notice are preserved and included in the unpacked extension and
ZIP. Third-party libraries retain their own licenses; see `package.json` for the dependency list.

## Store edition

The versions on the [Chrome Web Store](https://chromewebstore.google.com/detail/cfopbpknalachedpcddhgbgjoigklien) and
[Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/kpobglkjeapfinbaecjidahlnnohcaed) are developed
separately. They add folder navigation, presentation mode, and Word export. The upstream historical baseline did not include HTML export; this local edition now adds a static HTML snapshot export. Folder browser, presentation mode, and Word export remain absent.

Issues with the store version go to [markview-app/support](https://github.com/markview-app/support).

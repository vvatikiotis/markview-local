# Catppuccin Pitch Black themes

The supplied modified Catppuccin Mocha specification is available as two independent selections in the toolbar
popup's **Settings** tab. Neither selection changes the other automatically.

## Selecting document colors

Set **Document Theme → Catppuccin Pitch Black** to apply the Neovim Markdown palette to the reading area.
The document stays black with either a Light or Dark interface; **Theme → Auto** still follows the system for the
interface. Select **Document Theme → Default** to restore the existing document appearance for the current interface
mode. Existing installations start on Default. Changes apply immediately and save locally for future document loads.

The document preset maps rendered Markdown elements directly:

| Markdown role                | Color     | Background | Style                              |
| ---------------------------- | --------- | ---------- | ---------------------------------- |
| Body text                    | `#cdd6f4` | `#000000`  | inherited                          |
| Heading 1                    | `#89b4fa` | `#000000`  | bold, underline                    |
| Heading 2                    | `#89b4fa` | `#000000`  | bold                               |
| Heading 3                    | `#74c7ec` | `#000000`  | bold                               |
| Heading 4                    | `#74c7ec` | `#000000`  | normal weight                      |
| Heading 5                    | `#ffffff` | `#000000`  | bold                               |
| Heading 6                    | `#ffffff` | `#000000`  | normal weight                      |
| Strong                       | `#f38ba8` | inherited  | bold                               |
| Emphasis                     | `#f5e0dc` | inherited  | italic                             |
| Strikethrough (`s` or `del`) | `#cdd6f4` | inherited  | line-through                       |
| Quote                        | `#f5c2e7` | inherited  | inherited                          |
| Links / autolinks            | `#89dceb` | inherited  | italic, underline, including hover |
| Inline and plain code        | `#3ec1ff` | `#313244`  | inherited                          |

For unspecified table and supporting roles, borders use surface1 (`#45475a`), table headers use surface0 (`#313244`),
striped table rows use crust (`#11111b`), and muted text uses subtext0 (`#a6adc8`). These are adaptations within the
supplied palette, not additional explicit Neovim mappings. Font families, sizes, layout, and rendered heading anchors
continue to work as before. Semantic styles combine for nested emphasis, links, and other inline markup.

## Selecting syntax colors

Set **Syntax Theme → Catppuccin Pitch Black** for coordinated code highlighting. It changes code token colors without changing the block background. With Document Theme set to Default,
prose and code-block backgrounds follow the interface Theme. With the Catppuccin document preset, the reading area also receives the Markdown mappings above.

| Syntax role            | Color                 | Style  |
| ---------------------- | --------------------- | ------ |
| Code text              | `#cdd6f4`             |        |
| Comments               | `#9399b2`             | italic |
| Function titles        | `#89b4fa`             | bold   |
| Numbers                | `#cdd6f4`             |        |
| Literals / constants   | `#cdd6f4`             | bold   |
| Parameters             | `#fab387`             | italic |
| Operators              | `#f9e2af`             |        |
| Keywords               | `#cba6f7`             |        |
| Strings                | `#a6e3a1`             |        |

Document Theme controls the background of every code block. Catppuccin Pitch Black uses surface0 (`#313244`);
Default follows the interface mode. Syntax Theme controls token and base code foreground colors independently;
inline code follows Document Theme. Some syntax colors may have low contrast against a different document palette.
To restore adaptive document and code colors entirely, select Default for both themes.

## Export, printing, and limitations

HTML export retains the selected document and syntax palettes. The document rules are screen-only so the existing
white-paper print stylesheet remains active; printing is not an exact reproduction of the on-screen black document.
No additional theme downloads or permissions are required.

Opaque black is the fallback adaptation of the reference's transparent editor background. The interface, TOC,
Mermaid diagrams, and specialized alert/container styling retain their existing theme behavior; this is a document
palette, not a replacement for every component's theme. Syntax colors depend on which token classes a language
grammar emits. Editor-only roles such as cursor lines, diagnostics, undercurls, inlay hints, inactive-window dimming,
and Git UI indicators have no equivalent here. Rendered headings support all six explicit levels; highlight.js's
Markdown syntax tokens inside a code fence cannot distinguish them all.

Try the [sample document](../examples/document-theme.md). The implementation and automated/manual checks are described
in [Architecture](ARCHITECTURE.md#color-themes) and [Development](DEVELOPMENT.md#theme-changes-and-checks).

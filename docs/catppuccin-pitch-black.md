# Catppuccin Pitch Black syntax theme

Select **Catppuccin Pitch Black** in the extension popup's **Syntax Theme** list.
It keeps an opaque black code background in both light and dark app modes;
page prose and interface colors still follow the app theme. HTML exports retain
the selected syntax theme. Selecting **MarkView Local (Default)** restores the
adaptive built-in theme.

The theme adapts the supplied modified Catppuccin Mocha specification to
highlight.js token classes:

| Role                   | Color                 | Style  |
| ---------------------- | --------------------- | ------ |
| Code background / text | `#000000` / `#cdd6f4` |        |
| Comments               | `#9399b2`             | italic |
| Function titles        | `#89b4fa`             | bold   |
| Numbers                | `#cdd6f4`             |        |
| Literals / constants   | `#cdd6f4`             | bold   |
| Parameters             | `#fab387`             | italic |
| Operators              | `#f9e2af`             |        |
| Keywords               | `#cba6f7`             |        |
| Strings                | `#a6e3a1`             |        |

Other tokens use nearby Mocha palette colors according to their role. These are
highlight.js adaptations rather than a complete reproduction of Neovim's syntax
groups. Colors apply only where a language grammar emits the corresponding token;
for example, highlight.js does not identify every constant or operator. Its generic
Markdown section token cannot distinguish all six heading levels.

Opaque black is the fallback adaptation of the reference's transparent editor
background. The reference's Markdown prose rules (including cyan code on surface0)
are not applied to the rendered page: this selection controls syntax highlighting
inside code blocks. Editor-only roles such as cursor lines, diagnostics, inlay hints,
inactive-window dimming, and Git UI indicators have no equivalent in this theme.

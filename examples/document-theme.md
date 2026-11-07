# Heading 1 — blue, bold, underlined

## Heading 2 — blue, bold

### Heading 3 — sapphire, bold

#### Heading 4 — sapphire, normal

##### Heading 5 — white, bold

###### Heading 6 — white, normal

Select **Document Theme → Catppuccin Pitch Black** in the extension popup's Settings.
Try both Light and Dark interface modes, and change Syntax Theme independently.

Normal prose contains **strong text**, _emphasis_, ~~strikethrough~~, a [link](#heading-1--blue-bold-underlined),
and `inline code`. A nested **strong _emphasis_** demonstrates combined semantic styling.

> A quote should be pink. It can contain **strong**, _emphasis_, and [links](https://example.com).

| Area         | Expected behavior                             |
| ------------ | --------------------------------------------- |
| Reading area | Black with Catppuccin document colors         |
| Interface    | Follows Light, Dark, or Auto                  |
| Code blocks  | Follow the independent Syntax Theme selection |

```
Plain code: <escaped> & unchanged
```

```javascript
// Syntax highlighting remains independent of prose.
function greet(name) {
  const count = 42;
  return `Hello ${name}: ${count}`;
}
```

    Indented code: <escaped> & unchanged

Switch Document Theme back to Default: prose should return to the current interface palette.
Reload the document to check persistence. Export HTML and open it to check both selected palettes.

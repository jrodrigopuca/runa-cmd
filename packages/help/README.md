# @runa-cmd/help

Themeable help output for Runa CLIs with composable layout primitives.

Three layers of customization: zero-config defaults, theme colors, or build your own layout with primitives.

## Install

```bash
pnpm add @runa-cmd/help
```

> Peer dependencies: `@runa-cmd/core` and `zod ^4.0.0`.

## Quick Start

```ts
import { defineCLI } from '@runa-cmd/core';
import { helpPlugin } from '@runa-cmd/help';

const cli = defineCLI({
  meta: { name: 'my-tool', version: '1.0.0', description: 'My CLI tool' },
  commands: { deploy, init },
  plugins: [helpPlugin()],
});

cli.run();
```

```
$ my-tool --help
$ my-tool deploy --help
```

The plugin adds a `--help` / `-h` global flag. When triggered, it renders formatted help and exits.

## Three Layers

### Layer 1: Zero Config

Just add the plugin — sensible defaults with auto-detected terminal colors:

```ts
plugins: [helpPlugin()]
```

### Layer 2: Custom Theme

Override any of the 6 color slots:

```ts
plugins: [
  helpPlugin({
    theme: {
      primary: '#00BFFF',   // Headings, command names
      secondary: '#FF6B6B', // Flags, options
      muted: 'dim',         // Descriptions, defaults
      error: '#FF0000',     // Error messages
      warning: '#FFAA00',   // Deprecation notices
      success: '#00FF00',   // Success indicators
    },
  }),
]
```

Colors are automatically downsampled to match terminal capabilities: truecolor, 256-color, 16-color, or no color (`NO_COLOR` respected).

### Layer 3: Custom Renderer

Full control — use the layout primitives to build your own help output:

```ts
import { helpPlugin, box, styled, table, join, bold, fg } from '@runa-cmd/help';

plugins: [
  helpPlugin({
    render({ schema, theme, termWidth }) {
      return join.vertical([
        box({
          content: `${bold(schema.meta.name)} v${schema.meta.version}`,
          border: 'rounded',
          borderColor: theme.primary,
        }),
        styled(schema.meta.description ?? '', { color: theme.muted }),
        table(
          schema.commands.map((cmd) => [
            styled(cmd.name, { bold: true, color: theme.primary }),
            styled(cmd.description, { color: theme.muted }),
          ]),
          { headers: ['Command', 'Description'] },
        ),
      ]);
    },
  }),
]
```

## Layout Primitives

All primitives return a `Block` (a plain string, possibly with ANSI codes). They're composable — the output of one can be the input to another.

### `box(options)`

Renders a bordered container with word wrapping.

```ts
import { box } from '@runa-cmd/help';

box({
  content: 'Hello from a box!',
  border: 'rounded',        // 'single' | 'double' | 'rounded' | 'none'
  borderColor: '#7D56F4',   // Hex or named ANSI color
  padding: [1, 2],          // [vertical, horizontal] or [top, right, bottom, left]
  width: 40,                // Fixed width (auto if omitted)
});
```

### `styled(text, options)`

Applies text formatting. Does not word-wrap.

```ts
import { styled } from '@runa-cmd/help';

styled('Important!', {
  bold: true,
  italic: true,
  color: '#FF6B6B',
  padding: [0, 1],
});
```

### `columns(blocks, options)`

Distributes blocks evenly across terminal width:

```ts
import { columns, styled } from '@runa-cmd/help';

columns([
  styled('Left column'),
  styled('Right column'),
], { gap: 4 });
```

### `table(rows, options)`

Renders a 2D array as aligned columns with automatic width sizing:

```ts
import { table, styled } from '@runa-cmd/help';

table([
  [styled('--verbose', { bold: true }), 'Enable verbose output'],
  [styled('--env', { bold: true }),     'Target environment'],
], {
  padding: [0, 2],
  headers: ['Flag', 'Description'],
});
```

### `list(items, options)`

Renders a bulleted list:

```ts
import { list } from '@runa-cmd/help';

list(['First item', 'Second item', 'Third item'], {
  bullet: '>', // Default: '•'
  indent: 4,   // Default: 2
});
```

### `join.vertical(blocks, options)` / `join.horizontal(blocks, options)`

Composes blocks together:

```ts
import { join, box, styled } from '@runa-cmd/help';

// Stack vertically with gap
join.vertical([
  styled('Header', { bold: true }),
  styled('Body text'),
  styled('Footer', { dim: true }),
], { gap: 1 });

// Place side by side
join.horizontal([
  box({ content: 'Left', border: 'single' }),
  box({ content: 'Right', border: 'single' }),
], { gap: 2, align: 'top' }); // 'top' | 'center' | 'bottom'
```

## ANSI Utilities

Low-level text formatting functions:

```ts
import {
  bold, dim, italic, underline, // Text decorators
  fg, reset, strip,              // Color and cleanup
  visibleWidth,                  // Width without ANSI codes
  downsampleColor,               // Hex → terminal-appropriate ANSI
  detectColorDepth,              // Terminal color capability
  detectTermWidth,               // Terminal width (default 80)
  getRenderContext,              // Lazy-detected { colorDepth, termWidth }
  resetRenderContext,            // Clear cached detection (for tests)
} from '@runa-cmd/help';
```

### Color Downsampling

Colors automatically adapt to terminal capabilities:

```ts
import { downsampleColor } from '@runa-cmd/help';

downsampleColor('#7D56F4', 'truecolor'); // '\x1b[38;2;125;86;244m'
downsampleColor('#7D56F4', '256');        // '\x1b[38;5;99m'
downsampleColor('#7D56F4', '16');         // '\x1b[35m' (magenta)
downsampleColor('#7D56F4', 'none');       // '' (no color)
```

Respects `NO_COLOR`, `FORCE_COLOR`, and `COLORTERM` environment variables.

## Theme

The default theme:

```ts
import { defaultTheme, resolveTheme } from '@runa-cmd/help';

// defaultTheme = {
//   primary: '#7D56F4',    // Lipgloss purple
//   secondary: '#FF6B6B',
//   muted: 'dim',
//   error: '#FF0000',
//   warning: '#FFAA00',
//   success: '#00FF00',
// }

// Resolve a partial override to ANSI-ready strings:
const resolved = resolveTheme({ primary: '#00BFFF' }, getRenderContext());
// resolved.primary = '\x1b[38;2;0;191;255m' (on truecolor terminals)
```

## Default Renderer

The built-in renderer (`defaultRenderer`) produces output with these sections (each skipped if empty):

1. **Header** — Name, version, description
2. **Usage** — `name [command] [options]`
3. **Arguments** — Positional args table
4. **Options** — Named options table, grouped by `group` metadata
5. **Commands** — Subcommands table

The renderer is subcommand-aware: `my-tool deploy --help` shows help for the `deploy` command specifically.

## Types

```ts
import type {
  HelpPluginOptions,
  RenderFnCtx,
  Theme, ResolvedTheme,
  Block,
  RenderContext, ColorDepth,
  BoxOptions, StyledOptions, ColumnsOptions,
  TableOptions, ListOptions,
  VerticalJoinOptions, HorizontalJoinOptions, HorizontalAlign,
  BorderStyle,
} from '@runa-cmd/help';
```

## License

MIT

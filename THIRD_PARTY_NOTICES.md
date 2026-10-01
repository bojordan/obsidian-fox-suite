# Third-party notices

## Nightfox palettes and color calculations

The unmodified files in `palettes/*.lua` come from
[EdenEast/nightfox.nvim](https://github.com/EdenEast/nightfox.nvim), pinned to
commit `4dacd3f0185a2227bdf3b6c0975a8f0bf87cac9a`.

Copyright (c) 2021 James Simpson. Licensed under MIT; see
[`licenses/Nightfox-MIT.txt`](licenses/Nightfox-MIT.txt).

`scripts/palettes.mjs` reads the pinned palette data without executing Lua.
Its shade, blend, and HSV-brightening calculations implement the behavior of
the upstream `lua/nightfox/lib/color.lua` and `shade.lua` at that same commit.
The upstream notice is also embedded in the generated stylesheet.

The palettes are upstream data; the Obsidian component mappings are this
project's implementation. This is not a pixel-for-pixel Neovim UI port.

## Monaspace Neon

Copyright (c) 2023, GitHub.
[Upstream](https://github.com/githubnext/monaspace).
SIL Open Font License 1.1; see
[`licenses/Monaspace-OFL.txt`](licenses/Monaspace-OFL.txt).

Reserved names include "Monaspace", "Argon", "Neon", "Xenon", "Radon", and "Krypton".

## Mona Sans

Copyright 2022 The Mona Sans Project Authors.
[Upstream](https://github.com/github/mona-sans).
SIL Open Font License 1.1; see
[`licenses/Mona-Sans-OFL.txt`](licenses/Mona-Sans-OFL.txt).

Reserved font name: "Mona".

The six Latin webfont files are unmodified OFL-licensed font binaries.
`fonts/manifest.json` records their families, weights, styles, and SHA-256
hashes. Their bytes are embedded unchanged as data URLs, with full license
notices in `theme.css`.

The fonts remain OFL-licensed, not MIT-licensed. Do not assume that modifying,
subsetting, or renaming them is permitted without following the OFL, including
its reserved-font-name conditions. No Segoe UI or other system font binaries
are redistributed; CSS only references installed fallbacks.

Fox Suite is an independent project, not an official GitHub, Obsidian, or
Nightfox-author product. Upstream names are used for identification and credit.

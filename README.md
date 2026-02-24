# Pretty Mermaid 🧜‍♀️

A free, open-source tool to make Mermaid diagrams actually look good.

## Features
- Paste Mermaid syntax → instant preview
- Beautiful preset themes (rounded corners, soft colors, shadows)
- Light/Dark mode
- Export as PNG/SVG
- No account required, no premium BS

## Why?
Mermaid.js is amazing for quick diagrams, but the default styling is... utilitarian. 
MermaidChart wants $$ for themes. This is the free alternative.

## Stack
- Vanilla JS (no framework bloat)
- Mermaid.js for rendering
- CSS custom properties for theming
- Hosted on Railway

## Local Development
```bash
# Just open in browser
open src/index.html

# Or serve locally
python3 -m http.server -d src 8080
```

## Deploy to Railway
```bash
railway up
```

## License
MIT

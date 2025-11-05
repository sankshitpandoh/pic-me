## Image → Base64 (PWA)

Offline-capable PWA to convert images to Base64, built with React + Vite + TypeScript.

All processing happens locally in your browser. No uploads.

### Features
- Drag & drop, file picker, and clipboard paste
- Single and batch conversion (ZIP export)
- Format selection (Original/PNG/JPEG/WEBP/SVG)
- Quality, resize (contain/cover), JPEG background color
- Copy to clipboard, download as .txt or image, open in new tab
- Installable PWA, offline-first, dark mode, accessible

### Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

### Privacy
Images never leave your device. Conversion is 100% client-side.

### Supported formats
- Raster: PNG, JPEG, WEBP, GIF, BMP
- Vector: SVG (pass-through as Base64)
- HEIC/HEIF: best-effort (requires browser support; optional lib included)

### License
MIT

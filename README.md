# PixelForge

A free, private, layer-based image editor that runs entirely in your browser — no uploads, no account.

**Live:** https://piyaster11.github.io/pixelforge/

## Features
- Open images (file picker, drag & drop, paste), new documents, PSD import/export (via [ag-psd](https://github.com/Agamnentzar/ag-psd), MIT)
- Layers: add, delete, duplicate, drag to reorder, rename, show/hide, lock, opacity, 16 blend modes, merge down, flatten
- Layer masks: add, paint black/white, enable/disable, apply, delete
- Non-destructive adjustment layers: Brightness/Contrast, Hue/Saturation, Levels, Exposure, Invert, Black & White (also available as destructive adjustments with live preview)
- Filters: Gaussian Blur, Sharpen, Add Noise, Pixelate (live preview)
- Tools: Move, Rectangular/Elliptical Marquee, Lasso, Magic Wand, Crop, Eyedropper, Brush, Eraser, Paint Bucket, Gradient, Text (editable text layers), Hand, Zoom
- Free transform (move/scale/rotate), flip layer, rotate/flip canvas, image & canvas size
- Undo/redo with History panel, Photoshop-style shortcuts
- Export PNG / JPG / WebP with quality; save/open `.pforge` projects (JSON with embedded PNG layers)

## Development
Plain HTML/CSS/JS, no build step. Serve the `site/` folder: `python3 -m http.server -d site`.

## License
MIT

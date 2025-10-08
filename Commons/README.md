# Wikimedia Commons & Wikipedia Figma Plugin

## Overview
- Search Wikimedia Commons for images and drop them into the current selection or create a new frame automatically.
- Fetch Wikipedia article content, clean the markup, and let you click any paragraph, heading, or list item to insert formatted text.
- Handles superscripts, subscripts, headings, and hyperlinks so pasted content stays readable inside Figma.
- Shows progress feedback in the plugin UI while longer tasks (network requests, Figma node updates) run.

## Prerequisites
- Node.js 18+ (required by the TypeScript compiler and Tailwind CLI).
- Figma desktop app with access to the **Plugins** development menu.

## Local Development
1. Install dependencies once:
   ```bash
   npm install
   ```
2. Build the TypeScript code whenever you change files under `src/`:
   ```bash
   npm run build
   ```
   This compiles to `dist/code.js`, which is referenced in `manifest.json`.
3. (Optional) If you need to regenerate Tailwind utilities, update `src/tailwind.css` and run:
   ```bash
   npm run build:tailwind
   ```
   The generated file lives at `src/output.css`.

## Loading the Plugin in Figma
- Open Figma desktop, go to **Plugins → Development → Import plugin from manifest…** and select `manifest.json` in this directory.
- After importing, launch the plugin from the development plugins list. Any time you rebuild `dist/code.js` or edit `ui.html`, relaunch the plugin to pick up changes.

## How to Use

### Image Search Tab
1. Click on the **Image** tab in the plugin interface
2. Enter a search term (e.g., "sunset", "cat", "architecture")
3. Click **Search** or press Enter
4. Browse through the search results from Wikimedia Commons
5. Click on any image to insert it:
   - If you have a frame/shape selected, the image will fill it
   - If nothing is selected, a new rectangle with the image will be created

### Text Search Tab
1. Click on the **Text** tab in the plugin interface
2. Enter a Wikipedia article title (e.g., "Paris", "Albert Einstein", "Solar System")
3. Click **Search** or press Enter
4. The plugin fetches and displays the Wikipedia article content
5. Click on any paragraph, heading, or list item to insert it into Figma:
   - If you have a text node selected, it will replace the content
   - If nothing is selected, a new text node will be created
6. The inserted text preserves Wikipedia formatting:
   - **Bold** and *italic* text styles
   - Heading sizes (h1-h6)
   - Superscripts and subscripts
   - Links appear in Wikipedia blue color (#0645ad) for visual reference

## Project Structure
- `src/code.ts` — main plugin controller (runs in the Figma sandbox).
- `ui.html` — plugin user interface with inline JavaScript and Tailwind-styled markup.
- `dist/code.js` — compiled output consumed by Figma; do not edit directly.
- `manifest.json` — plugin metadata used by Figma.
- `package.json` / `tsconfig.json` — build tooling configuration.

## Notes
- The UI script makes outbound requests to the Wikimedia APIs. Internet connectivity is required for image and text searches.
- Errors and validation feedback are surfaced via `figma.notify`, so keep the Figma UI visible while testing.
- When sharing with teammates, include the `dist/` folder so they do not need to compile before running the plugin.

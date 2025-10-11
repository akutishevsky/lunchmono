# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron application called "Lunch Mono" built with Vue 3, Vite, and Hono. The application features a desktop UI for transaction management with an embedded Node.js server running inside the Electron main process.

## Architecture

### Dual Process Structure

The application uses Electron's multi-process architecture:

- **Main Process** (`src/main.js`): Manages the Electron BrowserWindow and lifecycle. Also starts/stops an embedded Hono server on port 3000 when the app launches/quits.
- **Renderer Process** (`src/renderer.js`): Vue 3 application that renders the UI
- **Preload Script** (`src/preload.js`): Secure bridge between main and renderer (standard Electron IPC pattern)

### Embedded Server

The application includes an embedded Hono HTTP server (`src/server/app.js`) that runs in the main process:
- Started automatically when Electron initializes (main.js:43-49)
- Runs on `http://localhost:3000`
- Cleaned up on app quit via `before-quit` event (main.js:72-74)
- Currently minimal with just a health check endpoint at `/`

### Vue Architecture

The renderer uses Vue 3 with the following component hierarchy:
- `App.vue` → `Main.vue` → Four main sections:
  - `ControlPanel.vue`: Top-level controls with "Accounts mapping" and "Settings" buttons
  - `SelectDates.vue`: Date range picker (From/To inputs)
  - `SelectAccount.vue`: Account selection dropdown
  - `Sync.vue`: Transaction actions ("Show transactions", "Sync transactions")

All components use Bulma CSS framework for styling.

### Build System

Uses Electron Forge with Vite plugin:
- Three separate Vite configs: `vite.main.config.mjs` (main process), `vite.preload.config.mjs` (preload), `vite.renderer.config.mjs` (renderer with Vue)
- Configured in `forge.config.js` with makers for Windows (Squirrel), macOS (ZIP), and Linux (DEB/RPM)

## Development Commands

```bash
# Start development mode (with hot reload)
npm start

# Package the application (without creating installer)
npm run package

# Create distributable installers for current platform
npm run make

# Publish application (requires publisher config)
npm run publish
```

## Key Implementation Details

### DevTools
DevTools automatically open on launch (main.js:37). Remove this line for production builds.

### Server Lifecycle
The Hono server lifecycle is tightly coupled to Electron:
- `app.whenReady()` triggers server start
- `app.on('before-quit')` triggers server cleanup
- Failure to start server logs error but doesn't prevent app launch

### Component State
Currently all components use `<script setup>` but have no reactive state. The UI appears to be scaffolded but not yet connected to backend functionality.

### Styling
Uses Bulma CSS imported globally in `src/renderer.js`. Minimal custom CSS (only Main.vue has a scoped style for full-height container).
